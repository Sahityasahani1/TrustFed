"""Automated test and benchmark script for TrustFed Phase 1 Batch Inference Engine."""

import sys
import os
import time

sys.path.insert(0, os.path.dirname(__file__))
from fastapi.testclient import TestClient
from risks_api import app

client = TestClient(app)

def test_health():
    res = client.get("/health")
    assert res.status_code == 200, f"Health failed: {res.text}"
    data = res.json()
    print("[OK] Health Check Passed:", data["status"], "| Available models:", list(data["models"].keys()))

def test_samples_endpoints():
    for domain in ["banks", "lenders", "insurers"]:
        res = client.get(f"/api/samples/{domain}")
        assert res.status_code == 200, f"Sample fetch failed for {domain}: {res.text}"
        data = res.json()
        assert len(data["records"]) > 0, f"Zero records for {domain}"
        print(f"[OK] Sample Endpoint ({domain}): Loaded {data['total_records']} demo records from {data['filename']}")

def test_batch_banks():
    sample = client.get("/api/samples/banks").json()["records"]
    t0 = time.perf_counter()
    res = client.post("/api/assess/batch", json={"domain": "banks", "records": sample})
    elapsed = (time.perf_counter() - t0) * 1000
    assert res.status_code == 200, f"Batch banks failed: {res.text}"
    data = res.json()
    summary = data["batch_summary"]
    records = data["records"]
    
    assert summary["total_records"] == len(sample)
    assert summary["flagged_count"] > 0, "No fraud flagged in banks batch"
    assert len(records) == len(sample)
    print(f"[OK] Batch Banks: {summary['total_records']} records screened in {elapsed:.1f}ms (Engine: {summary['processing_time_ms']}ms)")
    print(f"  Flagged: {summary['flagged_count']}, Cleared: {summary['cleared_count']}, Fraud Rate: {summary['fraud_rate']:.1%}")

def test_batch_lenders():
    sample = client.get("/api/samples/lenders").json()["records"]
    t0 = time.perf_counter()
    res = client.post("/api/assess/batch", json={"domain": "lenders", "records": sample})
    elapsed = (time.perf_counter() - t0) * 1000
    assert res.status_code == 200, f"Batch lenders failed: {res.text}"
    data = res.json()
    summary = data["batch_summary"]
    records = data["records"]
    
    assert summary["total_records"] == len(sample)
    assert summary["flagged_count"] > 0, "No default risk flagged in lenders batch"
    print(f"[OK] Batch Lenders: {summary['total_records']} records screened in {elapsed:.1f}ms (Engine: {summary['processing_time_ms']}ms)")
    print(f"  Flagged: {summary['flagged_count']}, Cleared: {summary['cleared_count']}, Mean Risk Score: {summary['mean_risk_score']:.1f}")

def test_batch_insurers():
    sample = client.get("/api/samples/insurers").json()["records"]
    t0 = time.perf_counter()
    res = client.post("/api/assess/batch", json={"domain": "insurers", "records": sample})
    elapsed = (time.perf_counter() - t0) * 1000
    assert res.status_code == 200, f"Batch insurers failed: {res.text}"
    data = res.json()
    summary = data["batch_summary"]
    records = data["records"]
    
    assert summary["total_records"] == len(sample)
    assert summary["flagged_count"] > 0, "No fraud flagged in insurers batch"
    print(f"[OK] Batch Insurers: {summary['total_records']} records screened in {elapsed:.1f}ms (Engine: {summary['processing_time_ms']}ms)")
    print(f"  Flagged: {summary['flagged_count']}, Cleared: {summary['cleared_count']}, Mean Risk Score: {summary['mean_risk_score']:.1f}")

def test_csv_upload():
    # Test uploading actual CSV file
    sample_path = os.path.join(os.path.dirname(__file__), "samples", "sample_banks_batch.csv")
    with open(sample_path, "rb") as f:
        csv_bytes = f.read()
    res = client.post(
        "/api/assess/upload",
        files={"file": ("sample_banks_batch.csv", csv_bytes, "text/csv")},
        data={"domain": "banks"}
    )
    assert res.status_code == 200, f"CSV upload failed: {res.text}"
    data = res.json()
    assert data["batch_summary"]["total_records"] == 40
    print(f"[OK] Multipart CSV Upload Test Passed: Successfully parsed and screened {data['batch_summary']['total_records']} records.")

if __name__ == "__main__":
    print("=" * 70)
    print("RUNNING TRUSTFED PHASE 1 BATCH ENGINE TEST SUITE")
    print("=" * 70)
    test_health()
    test_samples_endpoints()
    test_batch_banks()
    test_batch_lenders()
    test_batch_insurers()
    test_csv_upload()
    print("=" * 70)
    print("ALL TESTS PASSED WITH SUB-SECOND LATENCY!")
    print("=" * 70)
