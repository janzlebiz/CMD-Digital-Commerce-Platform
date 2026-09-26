# HCI CMD DIGITAL COMMERCE PLATFORM
## PHASE 4 — LIVE DEPLOYMENT, SMOKE TEST & INFRASTRUCTURE REPORT

**Document Version:** Phase 4 Final Live Deployment & Integration Verification  
**GCP / Firebase Project ID:** `gen-lang-client-0427039673`  
**Firestore Database ID:** `ai-studio-cmddigitalcommer-8d70f45b-1636-42ba-9e2d-f063a7b0e086`  
**KMS Key Hierarchy:** `projects/gen-lang-client-0427039673/locations/global/keyRings/hic-cmd-keyring/cryptoKeys/clinical-spi-key`  
**Date of Audit:** September 26, 2026  
**Phase 4 Status:** **LIVE SECURITY RULES DEPLOYED & TESTED · FUNCTIONS COMPILED · CLOUD DEPLOYMENT BLOCKERS IDENTIFIED**  

---

### I. EXECUTIVE SUMMARY & LIVE DEPLOYMENT STATE

Phase 4 evaluated the live deployment readiness and real infrastructure integration for the HCI CMD Digital Commerce Platform across Firebase Firestore, Authentication, Cloud Functions, and Google Cloud KMS.

1. **Firestore Security Rules (Live Deployed):**  
   Deployed to the live production database (`ai-studio-cmddigitalcommer-8d70f45b-1636-42ba-9e2d-f063a7b0e086`) via `deploy_firebase`. Live network probes confirmed that unauthorized writes to `/orders` and direct client reads to `/consultation_intakes` are actively rejected with `PERMISSION_DENIED`.

2. **Cloud Functions Backend (Source & Build Ready):**  
   All four server-side controllers (`calculateOrder`, `createOrderSecure`, `saveClinicalIntakeSecure`, `fetchClinicalIntakeSecure`) compiled with 0 errors (`tsc` passed). CLI deployment to GCP identified cloud service prerequisites.

---

### II. LIVE ENVIRONMENT TESTS & PROBE RESULTS

#### A. Live Firebase Firestore Security Rules Probes

Direct live network probes were executed against the production database `ai-studio-cmddigitalcommer-8d70f45b-1636-42ba-9e2d-f063a7b0e086`:

| Test / Probe | Target Path | Expected Invariant | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Live Probe 1** | `/orders/live_unauthorized_probe` | Unauthenticated direct client write must be rejected | `7 PERMISSION_DENIED: Missing or insufficient permissions` | **PASS (LIVE VERIFIED)** |
| **Live Probe 2** | `/consultation_intakes/test_intake_record` | Direct client clinical document read must be rejected | `PERMISSION_DENIED: Missing or insufficient permissions` | **PASS (LIVE VERIFIED)** |

#### B. Cloud Functions Live Deployment Diagnosis

We executed `firebase deploy --only functions --project gen-lang-client-0427039673`:

- **Actual CLI Output:**
  ```text
  === Deploying to 'gen-lang-client-0427039673'...
  i  deploying functions
  Error: Request to https://cloudresourcemanager.googleapis.com/v1/projects/gen-lang-client-0427039673 had HTTP Error: 403, 
  Cloud Resource Manager API has not been used in project 212282537635 before or it is disabled.
  ```
- **Deployment Blockers & Cloud Configuration Requirements:**
  1. **Cloud Resource Manager API:** Must be enabled on GCP project `212282537635` / `gen-lang-client-0427039673`.
  2. **Cloud Functions & Cloud Build APIs:** Must be enabled (`cloudfunctions.googleapis.com`, `cloudbuild.googleapis.com`).
  3. **KMS IAM Role:** The default runtime service account (`gen-lang-client-0427039673@appspot.gserviceaccount.com`) must be assigned `roles/cloudkms.cryptoKeyEncrypterDecrypter` on key ring `hic-cmd-keyring/cryptoKeys/clinical-spi-key`.

---

### III. TEST-HARNESS VERIFICATION SUITE (BUSINESS & SECURITY INVARIANTS)

Under the programmatic test harness (`cd functions && npm test`), all 9 core security and transactional invariants passed:

```bash
================================================================
      HCI CMD COMPLIANCE & PRODUCTION SECURITY AUDIT SUITE      
================================================================

[PASS] - calculateOrder rejected negative quantity with invalid-argument.
[PASS] - calculateOrder rejected non-integer quantity with invalid-argument.
[PASS] - createOrderSecure rejected zero quantity with invalid-argument.
[PASS] - Unauthorized branch access blocked with permission-denied error.
[PASS] - Guest clinical access blocked with unauthenticated error.
[PASS] - Unassigned practitioner write blocked successfully with clinical boundary isolation block.
[PASS] - Assigned practitioner write completed successfully.
[PASS] - Transactional Rollback Logic Test Verified (In-Memory Firestore Harness): All inventory lines unchanged (65ml: 10/10, 30ml: 20/20) AND zero order documents created (0/0).
[PASS] - KMS Fail-Closed Logic Test Verified (Test KMS Substitute): Record found, and KMS unwrapping correctly failed closed (Error: KMS Key Unwrapping Error: error:1C80006B:Provider routines::wrong final block length).

================================================================
      TEST RUNNER COMPLETE: 9 PASSED, 0 FAILED      
================================================================
```

---

### IV. TECHNICAL VERIFICATION SUMMARY

- **Root Frontend Build (`npm run build`):** `PASSED` (0 errors)
- **Root Typecheck (`npx tsc --noEmit`):** `PASSED` (0 errors)
- **Functions Test Suite (`cd functions && npm test`):** `PASSED` (9/9 assertions passed)
- **Functions Compilation (`cd functions && npm run build`):** `PASSED` (0 errors)
- **Live Firestore Security Rules Deployment:** `PASSED` (Rules active and verified via live probe)
- **Live Cloud Functions Deployment:** Blocked pending GCP Cloud Resource Manager API activation.
