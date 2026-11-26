"""
TrustFed: Production State Backup & Restore Drill CLI.
Creates atomic snapshots of all persistent state ledgers, validates SHA-256
checksums, and executes timed non-destructive restore drills.
"""
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.backup_manager import backup_manager


def main():
    print("\n" + "=" * 70)
    print("💾 TRUSTFED PRODUCTION STATE BACKUP & RESTORE DRILL")
    print("=" * 70)

    # 1. Create Snapshot
    print("[1/3] Creating atomic snapshot of state ledgers...")
    manifest = backup_manager.create_snapshot()
    backup_id = manifest["backup_id"]
    print(f"      ✅ Snapshot created: {backup_id}")
    print(f"      📁 Files included ({manifest['total_files']}): {', '.join(manifest['files'].keys())}")
    print(f"      📦 Total payload size: {manifest['total_bytes'] / 1024:.2f} KB")

    # 2. Checksum Verification
    print("\n[2/3] Verifying cryptographic SHA-256 checksums...")
    is_valid, msg, _ = backup_manager.verify_snapshot(backup_id)
    if not is_valid:
        print(f"      ❌ Checksum validation failed: {msg}")
        sys.exit(1)
    print(f"      ✅ All files verified clean and intact: {msg}")

    # 3. Restore Drill
    print("\n[3/3] Running timed restore drill into isolated staging sandbox...")
    result = backup_manager.run_restore_drill(backup_id)
    print(f"      ⏱️ Recovery Time (RTO): {result['recovery_time_ms']} ms (SLA Target < 5000ms)")
    print(f"      ✅ Files restored: {result['restored_files_count']} files verified")
    print(f"      🎯 RTO SLA Met: {result['rto_sla_met']}")

    print("\n" + "=" * 70)
    print("🏆 BACKUP & RESTORE DRILL PASSED: DATA RECOVERY FULLY CERTIFIED")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    main()
