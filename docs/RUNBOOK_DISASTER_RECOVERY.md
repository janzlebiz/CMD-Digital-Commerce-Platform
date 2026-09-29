# Disaster Recovery & Backup Operations Runbook

**Document Version**: 1.0.0  
**Date**: September 29, 2026  
**Scope**: Priority E / Phase 9B-3 (Backup, Restore & Disaster Recovery)  

---

## 1. Overview
This runbook defines standard operating procedures (SOPs) for data backup, emergency restoration, recovery verification, and disaster recovery escalation for the HCI CMD Digital Commerce & Naturopathic Wellness Platform.

## 2. RPO and RTO Objectives
* **Recovery Point Objective (RPO)**: Maximum data loss window of **1 hour** (hourly automated snapshots / transaction log syncs).
* **Recovery Time Objective (RTO)**: Maximum platform downtime of **30 minutes** from incident detection to full traffic restoration.

## 3. Automated Backup Procedure
Automated backups are executed via `scripts/backupDatabase.ts` on a scheduled cron cadence (hourly/daily):
```bash
npm run backup:db
# or directly:
npx tsx scripts/backupDatabase.ts
```
* **Security & Compliance**:
  * Backups are timestamped and stored in encrypted off-site cloud buckets (AWS S3 / Google Cloud Storage with SSE-S3 or customer-managed KMS keys).
  * **Zero Credentials**: Backup payloads contain business and transaction records only. Environment variables, database connection strings, JWT signing secrets, and API keys are strictly excluded.

## 4. Disaster Recovery & Restore Procedure
In the event of data corruption, storage failure, or critical disaster:
1. **Incident Declaration & Isolation**:
   * Alert the on-call Site Reliability Engineer (SRE).
   * Put the application API into maintenance mode (`MAINTENANCE_MODE=true`) or route traffic to a read-only static maintenance page.
2. **Select Recovery Point**:
   * Locate the latest verified clean backup file in the secure repository (`backups/backup-<TIMESTAMP>.json`).
   * Verify backup checksum against recorded SHA-256 metadata:
     ```bash
     sha256sum backups/backup-<TIMESTAMP>.json
     ```
3. **Execute Restoration**:
   * Run the isolation restore test harness or automated restore utility into a staging/recovery environment:
     ```bash
     npx tsx scripts/testPhase9BackupRecovery.ts --restore=<TIMESTAMP>
     ```
4. **Data Integrity & Invariant Verification**:
   * Confirm that all inventory, order totals, and consent records validate successfully against platform conservation rules.
5. **Traffic Cutover**:
   * Disable maintenance mode and resume normal production traffic.

## 5. Recovery Verification & Testing
* Automated recovery test suite (`scripts/testPhase9BackupRecovery.ts`) executes weekly in CI/CD pipelines to validate backup creation, SHA-256 integrity, round-trip serialization, and isolated environment restoration.

## 6. Failure Escalation & Incident Response
* **Level 1 (Warning)**: Backup script execution delay (>15 mins past schedule). SRE investigates cron daemon or storage bucket permissions.
* **Level 2 (Critical)**: Backup checksum verification failure or corruption detected during staging restore. Immediate escalation to Engineering Lead and DB Admin. Automated alert dispatched via PagerDuty / webhook.

## 7. Rollback & Contingency Steps
* If a restored snapshot introduces unrecoverable application errors or schema mismatches:
  1. Re-engage maintenance mode.
  2. Fall back to the immediate preceding timestamped backup snapshot.
  3. Execute automated schema and invariant migration checks (`npm run db:migrate` or equivalent validation script).
