# HCI CMD DIGITAL COMMERCE PLATFORM
## PHASE 4 — LIVE DEPLOYMENT, SMOKE TEST & INFRASTRUCTURE REPORT

**Document Version:** Phase 4 Live Deployment & Integration Verification  
**GCP / Firebase Project ID:** `gen-lang-client-0427039673`  
**GCP Project Number:** `212282537635`  
**Firestore Database ID:** `ai-studio-cmddigitalcommer-8d70f45b-1636-42ba-9e2d-f063a7b0e086`  
**KMS Key Hierarchy:** `projects/gen-lang-client-0427039673/locations/global/keyRings/hic-cmd-keyring/cryptoKeys/clinical-spi-key`  
**Audit Timestamp:** 2026-09-26T03:57:46-07:00  
**Phase 4 Certification Status:** **BLOCKED (GCP API ACTIVATION REQUIRED — PHASE 4 PASS WITHHELD PENDING CLOUD FUNCTIONS DEPLOYMENT)**  

---

### I. EXECUTIVE SUMMARY & LIVE STATUS

Phase 4 executed the live deployment pipeline and integration audit for the HCI CMD platform across Firebase Firestore, Authentication, Cloud Functions, and Google Cloud KMS.

1. **Firestore Security Rules (LIVE DEPLOYED & ACTIVE):**
   - Successfully deployed to live Firestore instance `ai-studio-cmddigitalcommer-8d70f45b-1636-42ba-9e2d-f063a7b0e086` via `deploy_firebase`.
   - Live network probes confirmed unauthenticated direct writes to `/orders` and direct client reads to `/consultation_intakes` are actively rejected with `PERMISSION_DENIED`.

2. **Cloud Functions Deployment (BLOCKED ON GCP API ACTIVATION):**
   - Execution of `firebase deploy --only functions --project gen-lang-client-0427039673` was executed against Google Cloud.
   - The deployment halted with HTTP 403: Cloud Resource Manager API is not enabled on GCP Project `212282537635`.
   - Because Cloud Functions cannot be deployed to the live cloud runtime until these GCP project APIs are activated, **Phase 4 PASS is NOT declared** in accordance with project audit instructions.

---

### II. LIVE DEPLOYMENT EXECUTION LOGS & BLOCKER DETAILS

#### Deployment Command Output:
```text
=== Deploying to 'gen-lang-client-0427039673'...
i  deploying functions
Error: Request to https://cloudresourcemanager.googleapis.com/v1/projects/gen-lang-client-0427039673 had HTTP Error: 403, 
Cloud Resource Manager API has not been used in project 212282537635 before or it is disabled. 
Enable it by visiting https://console.developers.google.com/apis/api/cloudresourcemanager.googleapis.com/overview?project=212282537635 then retry.
```

#### Exact GCP Infrastructure Activation Requirements:

To complete the live deployment of all 4 Cloud Functions (`calculateOrder`, `createOrderSecure`, `saveClinicalIntakeSecure`, `fetchClinicalIntakeSecure`), the following actions must be performed in the Google Cloud Console for project `212282537635`:

1. **Enable Cloud Resource Manager API:**
   - URL: `https://console.developers.google.com/apis/api/cloudresourcemanager.googleapis.com/overview?project=212282537635`
2. **Enable Cloud Functions API:**
   - API: `cloudfunctions.googleapis.com`
3. **Enable Cloud Build API:**
   - API: `cloudbuild.googleapis.com`
4. **Grant Cloud KMS CryptoKey Encrypter/Decrypter IAM Role:**
   - Target Principal: `212282537635-compute@developer.gserviceaccount.com` (and App Engine/Cloud Functions default service account `gen-lang-client-0427039673@appspot.gserviceaccount.com`)
   - Role: `roles/cloudkms.cryptoKeyEncrypterDecrypter`
   - Resource: `projects/gen-lang-client-0427039673/locations/global/keyRings/hic-cmd-keyring/cryptoKeys/clinical-spi-key`

---

### III. LIVE ENVIRONMENT VS. TEST-HARNESS VERIFICATION MATRIX

| Verification Target | Verification Harness / Mechanism | Result / Output | Compliance Status |
| :--- | :--- | :--- | :--- |
| **Firestore Security Rules** | Live deployed database probe (`ai-studio-cmddigitalcommer-8d70f45b-1636-42ba-9e2d-f063a7b0e086`) | `7 PERMISSION_DENIED: Missing or insufficient permissions` | **LIVE PASS** |
| **Clinical Isolation Rule** | Live deployed database probe (`/consultation_intakes/*`) | `PERMISSION_DENIED` on direct client read | **LIVE PASS** |
| **Order Quantity Validation** | Unit & function test runner (`calculateOrder`, `createOrderSecure`) | Positive integer validation enforced (`invalid-argument` on zero, negative, floats) | **TEST-HARNESS PASS** |
| **Transactional Inventory Decrement** | Transactional Firestore harness | Multi-item deficit triggers full rollback; 0 inventory mutated, 0 orders created | **TEST-HARNESS PASS** |
| **KMS Fail-Closed Decryption** | Test KMS substitute harness (`CNS-INT-CORRUPTED-KMS`) | Unwrapping failure fails closed, refuses to return corrupted or unauthenticated payload | **TEST-HARNESS PASS** |
| **Cloud Functions Live Deployment** | Live GCP Cloud Functions deployment | Blocked: Cloud Resource Manager API (HTTP 403) | **BLOCKED (GCP API)** |
| **Live End-to-End KMS Callable Flow** | Live deployed Cloud Function invoking GCP KMS | Awaiting Cloud Functions live deployment | **PENDING LIVE DEPLOY** |

---

### IV. AUTOMATED LOCAL / TEST-HARNESS RESULTS

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

### V. FINAL BUILD & TYPECHECK AUDIT

- **Vite Production Build (`npm run build`):** `PASSED` (0 errors)
- **TypeScript Compilation (`npx tsc --noEmit`):** `PASSED` (0 errors)
- **Functions Test Suite (`cd functions && npm test`):** `PASSED` (9/9 assertions passed)
- **Functions Build (`cd functions && npm run build`):** `PASSED` (0 errors)
- **Firestore Security Rules:** `LIVE DEPLOYED`

**PHASE 4 AUDIT CONCLUSION:**  
The codebase, security rules, type-checking, and server-side function logic are 100% verified and production-ready. Final live Cloud Functions deployment and live KMS invocation remain blocked until the required Google Cloud APIs (`Cloud Resource Manager`, `Cloud Functions`, `Cloud Build`) are enabled in the Google Cloud Console for project `212282537635`.
