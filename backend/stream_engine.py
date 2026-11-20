"""
TrustFed: Live Transaction Clearinghouse Stream Engine (Phase 2).
Simulates real-time clearinghouse feeds (Banks, Lenders, Insurers) with live ONNX scoring,
procedural anomaly injection, and high-frequency WebSocket broadcasting (10-50 TPS).
"""

import asyncio
import json
import logging
import random
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple

from fastapi import WebSocket, WebSocketDisconnect

try:
    from onnx_engine import onnx_hub
except ImportError:
    from backend.onnx_engine import onnx_hub

logger = logging.getLogger("trustfed.stream")


class ClearinghouseStreamHub:
    """
    Manages WebSocket client connections and broadcasts live scored financial transactions.
    """

    def __init__(self):
        self._active_connections: Set[WebSocket] = set()
        self._is_running: bool = False
        self._is_paused: bool = False
        self._target_tps: float = 10.0  # transactions per second
        self._anomaly_bias: float = 0.08  # 8% baseline anomaly rate
        self._lock = asyncio.Lock()
        self._worker_task: Optional[asyncio.Task] = None
        self._tick_counter: int = 0

    async def connect(self, websocket: WebSocket):
        """Accepts and registers a new WebSocket subscriber."""
        await websocket.accept()
        self._active_connections.add(websocket)
        logger.info(f"Clearinghouse client connected. Active subscribers: {len(self._active_connections)}")

        # Send initial handshake status
        await websocket.send_text(json.dumps({
            "type": "stream_handshake",
            "status": "connected",
            "active_subscribers": len(self._active_connections),
            "target_tps": self._target_tps,
            "is_paused": self._is_paused,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }))

        # Ensure background streaming loop is active
        self._ensure_stream_task()

    def disconnect(self, websocket: WebSocket):
        """Removes a disconnected WebSocket subscriber."""
        self._active_connections.discard(websocket)
        logger.info(f"Clearinghouse client disconnected. Active subscribers: {len(self._active_connections)}")

    def _ensure_stream_task(self):
        """Starts background transaction generator if not already running."""
        if not self._is_running or self._worker_task is None or self._worker_task.done():
            self._is_running = True
            try:
                loop = asyncio.get_running_loop()
                self._worker_task = loop.create_task(self._stream_loop())
            except RuntimeError:
                pass

    def generate_synthetic_transaction(self, domain: Optional[str] = None, force_anomaly: bool = False) -> Tuple[str, Dict[str, Any], bool]:
        """
        Generates a realistic transaction event across banking, lending, or insurance.
        Injects known fraud attack patterns when anomaly is triggered.
        """
        if domain is None:
            domain = random.choice(["banks", "lenders", "insurers"])

        is_anomaly = force_anomaly or (random.random() < self._anomaly_bias)

        if domain == "banks":
            # PaySim Banking Wire Transfer
            if is_anomaly:
                amount = round(random.uniform(120000.0, 480000.0), 2)
                old_org = amount
                old_dest = 0.0
                tx_type = "TRANSFER"
            else:
                amount = round(random.uniform(50.0, 8500.0), 2)
                old_org = round(random.uniform(10000.0, 50000.0), 2)
                old_dest = round(random.uniform(2000.0, 15000.0), 2)
                tx_type = random.choice(["PAYMENT", "CASH_OUT", "TRANSFER", "DEBIT"])

            payload = {
                "step": random.randint(100, 350),
                "type": tx_type,
                "amount": amount,
                "oldbalanceOrg": old_org,
                "oldbalanceDest": old_dest,
            }

        elif domain == "lenders":
            # Home Credit Loan Application
            if is_anomaly:
                income = round(random.uniform(25000.0, 45000.0), 2)
                credit = round(random.uniform(350000.0, 800000.0), 2)  # High leverage
                ext2 = round(random.uniform(0.05, 0.22), 3)            # Very poor bureau score
                ext3 = round(random.uniform(0.04, 0.20), 3)
            else:
                income = round(random.uniform(60000.0, 140000.0), 2)
                credit = round(random.uniform(100000.0, 300000.0), 2)
                ext2 = round(random.uniform(0.45, 0.75), 3)
                ext3 = round(random.uniform(0.40, 0.70), 3)

            payload = {
                "amt_income_total": income,
                "amt_credit": credit,
                "amt_annuity": round(credit * 0.08, 2),
                "ext_source_2": ext2,
                "ext_source_3": ext3,
                "name_contract_type": "Cash loans",
            }

        else:
            # Insurance Claim
            if is_anomaly:
                amount = round(random.uniform(55000.0, 95000.0), 2)
                tenure = round(random.uniform(0.1, 0.4), 2)  # Early churn claim
                previous = random.randint(2, 5)
            else:
                amount = round(random.uniform(1500.0, 15000.0), 2)
                tenure = round(random.uniform(2.5, 9.0), 2)
                previous = random.randint(0, 1)

            payload = {
                "claim_amount": amount,
                "deductible": 500.0,
                "policyholder_tenure_years": tenure,
                "claim_type": "auto",
                "previous_claims_count": previous,
                "filing_delay_days": 1,
            }

        return domain, payload, is_anomaly

    def score_transaction_fast(self, domain: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Runs fast inference and returns probability + classification in sub-2ms."""
        t0 = time.perf_counter()
        from risks_api import run_ml

        try:
            result = run_ml(domain, payload)
            risk = result.get("risk", {})
            prob = float(risk.get("fraud_probability", 0.0))
            score = float(risk.get("risk_score", prob * 100))
            classification = str(risk.get("classification", "safe"))
            threshold = float(risk.get("decision_threshold", 0.4))
            anomaly_score = risk.get("anomaly_score")
        except Exception:
            prob = 0.5
            score = 50.0
            classification = "safe"
            threshold = 0.5
            anomaly_score = None

        elapsed_ms = (time.perf_counter() - t0) * 1000.0
        return {
            "fraud_probability": round(prob, 4),
            "risk_score": round(score, 2),
            "decision_threshold": round(threshold, 4),
            "classification": classification,
            "anomaly_score": round(anomaly_score, 4) if anomaly_score is not None else None,
            "inference_time_ms": round(elapsed_ms, 2),
        }

    async def _stream_loop(self):
        """Continuous background generator emitting ticks at target TPS rate."""
        logger.info("Clearinghouse stream loop started.")
        while self._is_running:
            try:
                # If no connections or paused, sleep briefly
                if not self._active_connections or self._is_paused:
                    await asyncio.sleep(0.5)
                    continue

                interval = 1.0 / max(self._target_tps, 1.0)
                domain, payload, is_anomaly = self.generate_synthetic_transaction()
                assessment = self.score_transaction_fast(domain, payload)

                self._tick_counter += 1
                tick_msg = {
                    "type": "transaction_tick",
                    "tick_id": self._tick_counter,
                    "record_id": f"TX-STREAM-{self._tick_counter:06d}",
                    "domain": domain,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "payload": payload,
                    "assessment": assessment,
                    "simulated_attack": is_anomaly,
                }
                msg_str = json.dumps(tick_msg)

                # Broadcast to all connected clients
                disconnected = []
                for ws in list(self._active_connections):
                    try:
                        await ws.send_text(msg_str)
                    except Exception:
                        disconnected.append(ws)

                for ws in disconnected:
                    self._active_connections.discard(ws)

                await asyncio.sleep(interval)

            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.error(f"Error in clearinghouse stream loop: {exc}")
                await asyncio.sleep(1.0)

        logger.info("Clearinghouse stream loop stopped.")

    async def handle_client_command(self, websocket: WebSocket, command_data: Dict[str, Any]):
        """Processes control instructions received from client WebSockets."""
        action = command_data.get("action", "").lower()

        if action == "set_tps":
            new_tps = float(command_data.get("tps", 10.0))
            self._target_tps = max(1.0, min(new_tps, 50.0))
            await websocket.send_text(json.dumps({
                "type": "command_ack",
                "action": "set_tps",
                "target_tps": self._target_tps,
            }))

        elif action == "pause":
            self._is_paused = True
            await websocket.send_text(json.dumps({
                "type": "command_ack",
                "action": "pause",
                "is_paused": True,
            }))

        elif action == "resume":
            self._is_paused = False
            await websocket.send_text(json.dumps({
                "type": "command_ack",
                "action": "resume",
                "is_paused": False,
            }))

        elif action == "inject_anomaly":
            target_domain = command_data.get("domain")
            domain, payload, _ = self.generate_synthetic_transaction(domain=target_domain, force_anomaly=True)
            assessment = self.score_transaction_fast(domain, payload)
            self._tick_counter += 1
            anomaly_tick = {
                "type": "transaction_tick",
                "tick_id": self._tick_counter,
                "record_id": f"TX-ANOMALY-{self._tick_counter:06d}",
                "domain": domain,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "payload": payload,
                "assessment": assessment,
                "simulated_attack": True,
                "manual_injection": True,
            }
            await websocket.send_text(json.dumps(anomaly_tick))


# Global Singleton Clearinghouse Stream Hub
clearinghouse_hub = ClearinghouseStreamHub()
