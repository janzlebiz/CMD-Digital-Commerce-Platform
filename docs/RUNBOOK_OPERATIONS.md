# Operational Monitoring, Alerting & Incident Response Runbook

**Document Version**: 1.0.0  
**Date**: September 29, 2026  
**Scope**: Priority E / Phase 9B-4 (Gate 5: Monitoring, Alerting & Operational Runbooks)  

---

## 1. Overview
This runbook defines standard operating procedures (SOPs) for operational monitoring, incident severity categorization, alert webhook handling, emergency maintenance mode, and recovery verification for the HCI CMD Digital Commerce & Naturopathic Wellness Platform.

---

## 2. Health & Readiness Monitoring Probes

The platform exposes two standardized lightweight health monitoring endpoints:

### 2.1 Liveness Probe (`GET /healthz`)
- **Purpose**: Verifies that the Node.js application process is active and responsive.
- **Expected Response**: `200 OK`
```json
{
  "status": "ok",
  "timestamp": "2026-09-29T10:20:00.000Z",
  "uptimeSeconds": 142.5,
  "memoryUsageMb": {
    "rss": 52.4,
    "heapTotal": 38.1,
    "heapUsed": 21.6
  }
}
```
- **Frequency**: Every 15 seconds via Google Cloud Load Balancer / Kubernetes liveness probe.
- **Failure Action**: If 3 consecutive liveness probes fail or time out (>5s), automatically restart the container instance.

### 2.2 Readiness Probe (`GET /readyz`)
- **Purpose**: Verifies database connectivity (Firestore ping) and system maintenance status before routing user traffic.
- **Expected Response**: `200 OK` (when ready)
```json
{
  "status": "ready",
  "timestamp": "2026-09-29T10:20:00.000Z",
  "checks": {
    "database": "connected",
    "maintenanceMode": false,
    "hmacSecurity": "configured"
  }
}
```
- **Maintenance Mode Response**: `503 Service Unavailable`
```json
{
  "status": "maintenance_mode",
  "timestamp": "2026-09-29T10:20:00.000Z",
  "message": "System is currently undergoing scheduled maintenance."
}
```
- **Frequency**: Every 10 seconds via ingress load balancer.
- **Failure Action**: If `503` is returned, remove instance from active load balancer pool until readiness check passes.

---

## 3. Incident Severity Levels & SLA Response Targets

| Severity | Definition | Examples | Response SLA | Resolution SLA |
| :--- | :--- | :--- | :--- | :--- |
| **SEV-1 (Critical)** | Core service outage, total checkout/payment failure, database unreachable, backup process failure | Payment gateway timeouts, double refund risk, unhandled 500 errors, failed backup exports | **15 minutes** | **2 hours** |
| **SEV-2 (High)** | Major feature degraded, notification dead-letter queue threshold breached, B2B consignment locked | Notification dead-letter threshold >0, FEFO batch reservation contention failures | **30 minutes** | **4 hours** |
| **SEV-3 (Moderate)** | Non-critical feature issue, statutory SLA breach for dispute resolution, minor latency spike | RA 11967 dispute resolution ticket >7 days unresolved, marketing consent sync delay | **2 hours** | **24 hours** |
| **SEV-4 (Low)** | Cosmetic UI defects, minor reporting discrepancy, general inquiry | Non-blocking dashboard formatting issue | **24 hours** | **3 business days** |

---

## 4. Alert Delivery & Webhook Infrastructure

Alerts are dispatched server-side via `src/services/alertService.ts` to the configured operational alert webhook (`ALERT_WEBHOOK_URL`).

### 4.1 Security & Secret Redaction
- **Webhook Authorization**: Dispatched with `X-Alert-Secret: <ALERT_WEBHOOK_SECRET>`.
- **Secret Redaction**: All alert payloads and logs automatically redact sensitive fields (`token`, `authorization`, `secret`, `key`, `password`, `bearer`, `cvv`, `card`).
- **Timeout Handling**: Webhook HTTP POST calls enforce a **5-second timeout** (`AbortController`). Delivery failures do not throw or crash core application workflows.

---

## 5. Standard Operating Procedures (SOPs)

### 5.1 Payment & Provider Failure SOP
1. **Trigger**: `payment_provider_failure` alert (SEV-1).
2. **Immediate Action**:
   - Inspect correlation ID in alert log (`logger.error`).
   - Check payment gateway provider status page (GCash / PayMaya / Maya / Credit Card gateway).
   - Check `payment_compensations` collection for pending compensating refunds.
3. **Remediation**:
   - If provider is down, enable fallback offline cash-on-delivery or branch pickup mode.
   - If compensating refund failed, manually execute reconciliation via `/api/orders/checkout` idempotent retry.

### 5.2 Backup Failure SOP
1. **Trigger**: `backup_failure` alert (SEV-1).
2. **Immediate Action**:
   - Verify local disk space and production `BACKUP_ENCRYPTION_KEY` environment variable.
   - Run manual backup test: `npx tsx scripts/backupDatabase.ts`.
3. **Remediation**:
   - Check GCS bucket access permissions (`gs://hci-cmd-backups-offsite-asia/backups/`).
   - Verify GCS lifecycle policy (`verifyGcsBucketLifecyclePolicy`).

### 5.3 Notification Dead-Letter Failure SOP
1. **Trigger**: `notification_dead_letter` alert (SEV-2).
2. **Immediate Action**:
   - Query dead-letter queue items: `GET /api/notifications/queue?status=dead_letter`.
   - Inspect `lastError` and `retryCount` details.
3. **Remediation**:
   - If provider credentials expired (e.g. Twilio / SendGrid), rotate API keys in environment variables.
   - Re-enqueue failed items: `POST /api/notifications/enqueue` with new idempotency keys.

### 5.4 Statutory SLA Breach Response SOP (RA 11967)
1. **Trigger**: `sla_breach` alert (SEV-3).
2. **Immediate Action**:
   - Query escalated support tickets: `GET /api/support/tickets?status=escalated_sla_breach`.
   - Assign designated Senior Customer Relations Officer or Branch Manager immediately.
3. **Remediation**:
   - Contact consumer within 2 hours to provide resolution update.
   - Update ticket status to `resolved` once redress or refund is issued.

### 5.5 Emergency Maintenance Mode SOP
1. **Enable Maintenance Mode**:
   ```bash
   export MAINTENANCE_MODE=true
   ```
2. **Behavior**:
   - `/readyz` returns `503 Service Unavailable`.
   - Ingress load balancer stops sending external customer traffic.
3. **Disable Maintenance Mode**:
   ```bash
   export MAINTENANCE_MODE=false
   ```
   - `/readyz` returns `200 OK` ("status: ready") and resumes normal traffic routing.

---

## 6. Escalation Matrix

| Role | Contact Channel | Primary Responsibility |
| :--- | :--- | :--- |
| **On-Call Site Reliability Engineer (SRE)** | SRE Pager / PagerDuty | Initial triage, infrastructure, backup & database health |
| **Lead Backend Engineer** | Engineering Slack / Phone | API, payment gateway, transaction concurrency & code fixes |
| **Branch Manager (Daet / Labo / Capalonga)** | Regional Staff Channel | Local inventory, branch delivery & customer dispute escalation |
| **Super Admin / Regional Director** | Executive Escalation Line | Policy decisions, regulatory disclosures & SEV-1 communications |

---

## 7. Recovery Verification SOP
After resolving any incident:
1. Run `/healthz` and `/readyz` probes and confirm `200 OK` status.
2. Execute Gate 5 monitoring & alerting test suite:
   ```bash
   npx tsx scripts/testPhase9Monitoring.ts
   ```
3. Run full platform regression suite:
   ```bash
   npx tsx scripts/runFullRegression.ts
   ```
4. Verify production build:
   ```bash
   npm run build
   ```
