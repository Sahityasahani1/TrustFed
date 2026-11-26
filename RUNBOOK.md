# 📘 TrustFed Production Operations & Incident Response Runbook

> **Document Version:** 2.0.0 (Production Master)  
> **Target Audience:** Site Reliability Engineering (SRE), Platform Engineering, MLOps, Security Operations  
> **System Availability SLA:** 99.98% Uptime  
> **Recovery Time Objective (RTO):** $< 5.0$ seconds  
> **Recovery Point Objective (RPO):** $< 15$ minutes  

---

## 📌 Table of Contents
1. [System Topology & Component Architecture](#1-system-topology--component-architecture)
2. [Standard Zero-Downtime Deployment Protocol](#2-standard-zero-downtime-deployment-protocol)
3. [Emergency 1-Click Rollback Procedure](#3-emergency-1-click-rollback-procedure)
4. [Subsystem Feature Flag Kill-Switches](#4-subsystem-feature-flag-kill-switches)
5. [Disaster Recovery & State Restoration Drills](#5-disaster-recovery--state-restoration-drills)
6. [Incident Severity & Escalation SLA Matrix](#6-incident-severity--escalation-sla-matrix)
7. [Synthetic Alerts & Automated Runbook Responses](#7-synthetic-alerts--automated-runbook-responses)
8. [Routine Maintenance & Schema Migrations](#8-routine-maintenance--schema-migrations)
9. [28-Requirement Production Exit Gate Verification](#9-28-requirement-production-exit-gate-verification)

---

## 1. System Topology & Component Architecture

TrustFed operates as a containerized, resilient multi-tier microservice architecture:

```
                  ┌──────────────────────────────────────────────┐
                  │             Cloudflare WAF / CDN             │
                  │   • TLS 1.3 Termination  • Strict HSTS       │
                  │   • Rate Limiting        • DDoS Mitigation   │
                  │   • Dynamic DNS (TTL: 300s)                  │
                  └──────────────────────┬───────────────────────┘
                                         │ HTTPS / WSS
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │           FastAPI Gateway Cluster            │
                  │   • Port: 8000           • X-Request-ID      │
                  │   • Multi-tier Rate Limit• CSP & Sec Headers │
                  │   • JSON Structured Logs • PII Redaction     │
                  │   • Probes: /healthz, /readyz, /health       │
                  └───────┬──────────────┬──────────────┬────────┘
                          │              │              │
          ┌───────────────┘              │              └───────────────┐
          ▼                              ▼                              ▼
┌──────────────────┐           ┌──────────────────┐           ┌──────────────────┐
│  ML Inference    │           │  Hardware (TEE)  │           │  RDP Privacy     │
│  • PaySim GBDT   │           │  • AWS Nitro     │           │  • Moments Acct  │
│  • Credit XGB    │           │  • PCR0/1/2      │           │  • Delta: 1e-5   │
│  • Insurance     │           │  • SecAgg Masks  │           │  • Max Eps: 5.0  │
│  • ONNX Runtime  │           │  • Remote Certs  │           │  • Circuit Break │
└──────────────────┘           └──────────────────┘           └──────────────────┘
```

---

## 2. Standard Zero-Downtime Deployment Protocol

### 2.1 Pre-Deployment Verification Gate
Before promoting any build artifact to production, execute the automated pre-flight checks:
```bash
# 1. Run 100% of backend tests (56/56 passing)
pytest backend/ -v

# 2. Verify frontend compilation (0 TypeScript errors)
npm --prefix frontend run build

# 3. Execute SLA benchmark convergence suite
python scripts/benchmark_suite.py

# 4. Verify snapshot state and restore drill
python scripts/backup_restore_drill.py

# 5. Verify database migration dry-run (zero table-locks)
python scripts/dry_run_migrations.py
```

### 2.2 Blue/Green Container Cutover
```bash
# Step 1: Pull tagged release container
docker pull ghcr.io/sahityasahani1/trustfed:v2.0.0

# Step 2: Deploy green container on standby port (8002)
docker compose -f docker-compose.prod.yml up -d --no-deps --build trustfed-api

# Step 3: Run the automated 5-minute smoke test (target SLA < 5s)
python scripts/smoke_test.py

# Step 4: Atomic cutover via load balancer / Nginx upstream reload
# Step 5: Drain in-flight connections on blue container (30s grace period)
```

---

## 3. Emergency 1-Click Rollback Procedure

When an unrecoverable regression or P1 critical incident occurs:

### Step 1: Re-Point Traffic to Previous Build
```bash
# Immediately stop active container and revert to previous stable release tag
docker compose -f docker-compose.prod.yml stop trustfed-api
docker run -d --name trustfed-rollback \
  -p 8000:8000 \
  --env-file .env.production \
  ghcr.io/sahityasahani1/trustfed:v1.9.0-stable
```

### Step 2: Verify Rollback Health
```bash
python scripts/smoke_test.py
```

---

## 4. Subsystem Feature Flag Kill-Switches

If an outage or latency regression is isolated to a specific subsystem, disable the feature flag via admin API without redeploying:

```bash
# 1. Disable real-time clearinghouse streaming
curl -X POST http://localhost:8000/api/flags/override \
  -H "X-API-Key: $TRUSTFED_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"flag_key": "STREAMING_ENABLED", "enabled": false}'

# 2. Disable Google Gemini LLM reasoning (falls back to deterministic explainability)
curl -X POST http://localhost:8000/api/flags/override \
  -H "X-API-Key: $TRUSTFED_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"flag_key": "GEMINI_REASONING_ENABLED", "enabled": false}'

# 3. Disable Hardware Enclave remote attestation
curl -X POST http://localhost:8000/api/flags/override \
  -H "X-API-Key: $TRUSTFED_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"flag_key": "HARDWARE_ENCLAVES_ENABLED", "enabled": false}'

# 4. Enforce strict rate limiting
curl -X POST http://localhost:8000/api/flags/override \
  -H "X-API-Key: $TRUSTFED_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"flag_key": "RATE_LIMITING_STRICT", "enabled": true}'
```

---

## 5. Disaster Recovery & State Restoration Drills

If state corruption or node ledger tampering is detected:

```bash
# Restore state from the latest verified snapshot manifest (<5.0s RTO)
python scripts/backup_restore_drill.py
```

### Programmatic Python Recovery:
```python
from backend.backup_manager import backup_manager

backups = backup_manager.list_backups()
if backups:
    latest = backups[0]["backup_id"]
    print(f"Executing non-destructive restore from: {latest}")
    success, stats = backup_manager.run_restore_drill(latest)
    assert success, "Restore drill failed!"
```

---

## 6. Incident Severity & Escalation SLA Matrix

| Severity | Definition | Response SLA | Target Resolution | Escalation Path |
| :--- | :--- | :---: | :---: | :--- |
| **P1 — Critical** | Total platform outage, 5xx rate $\ge 5\%$, privacy budget breach ($\epsilon \ge 5.0$) | **$< 15$ min** | $< 2$ hours | Lead Architect + Security Officer + On-Call SRE |
| **P2 — High** | Latency p95 $>250$ms, SecAgg round failure, Gemini quota exhaustion | **$< 30$ min** | $< 4$ hours | MLOps Engineer + Backend Lead |
| **P3 — Medium** | Degraded non-critical endpoint, single worker node heartbeat drop | **$< 2$ hours** | $< 1$ business day | Platform Engineering Team |
| **P4 — Low** | Minor UI styling glitch, non-blocking telemetry delay | **$< 1$ business day** | Next sprint | Product Operations |

---

## 7. Synthetic Alerts & Automated Runbook Responses

The synthetic alerting engine ([`backend/alert_manager.py`](file:///c:/sahityaa/TrustFed%20Project/backend/alert_manager.py)) monitors request windows and dispatches incident webhooks:

### Alert 1: `HIGH_5XX_ERROR_RATE`
- **Trigger:** 5xx error rate $\ge 5\%$ over the last 500 requests.
- **Action:**
  1. Inspect centralized JSON logs: `grep '"status_code": 5' logs/production.jsonl`.
  2. Verify readiness probe: `curl http://localhost:8000/readyz`.
  3. If models are missing or corrupted, trigger state restore drill.

### Alert 2: `P95_LATENCY_REGRESSION`
- **Trigger:** p95 latency $> 250\text{ ms}$ on risk scoring.
- **Action:**
  1. Check ONNX engine status via `GET /health`.
  2. Verify database connection pool throttle: `GET /api/status`.
  3. If Google Gemini API is timing out, disable `GEMINI_REASONING_ENABLED` flag to activate deterministic fallback.

---

## 8. Routine Maintenance & Schema Migrations

- **Daily Backup Snapshots:** Automatically scheduled at `02:00 UTC` via `backup_manager.create_snapshot()`.
- **Expand-and-Contract Migrations:** All schema changes must follow expand-and-contract:
  1. *Expand:* Add nullable columns and backward-compatible fields.
  2. *Dual-Write:* Deploy application code writing to both old and new schema.
  3. *Backfill:* Run asynchronous background migration.
  4. *Contract:* Deprecate and drop obsolete fields in subsequent release.
- **Migration Verification:** Test scripts in staging before production cutover:
  ```bash
  python scripts/dry_run_migrations.py
  ```

---

## 9. 28-Requirement Production Exit Gate Verification

All 28 checklist items must pass before production signoff:
- [x] **#1–#5 (Phase 1):** Matrix CI, PR templates, lockfile security audits, and clean debug code.
- [x] **#6–#9 (Phase 2):** Strict Pydantic boot validation, secret isolation, HMAC webhooks, and feature flags.
- [x] **#10–#14 (Phase 3):** HSTS, CSP, nosniff, DENY, 4-tier RBAC, rate limiting, and live privacy policy pages.
- [x] **#15–#18 (Phase 4):** Automated backups ($<5$s RTO), zero-lock migrations, and connection pool throttle.
- [x] **#19–#25 (Phase 5):** Sentry tracking, structured JSON logs, synthetic alerts, `/healthz` & `/readyz`, multi-stage Docker, and 2x peak load tests.
- [x] **#26–#28 (Phase 6):** Release runbook, 0.46s automated smoke test, and low-traffic release scheduling.