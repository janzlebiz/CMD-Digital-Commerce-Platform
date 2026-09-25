# Naturopathic & Wellness Consultation Requirements

**Document ID:** REQ-CNS-005 (Remediated)  
**Project:** HCI CMD Digital Commerce Platform  
**Target Region:** Camarines Norte, Philippines  
**Audit Phase:** Phase 0 Remediation — Consultation Specifications Baseline  
**Status:** Certified Audit Baseline (Qualified with Business Open Questions)  
**Date of Audit:** 2026-09-25  

---

## 1. Consultation Service Philosophy & Legal Boundary

The platform supports holistic naturopathic and wellness consultations designed to educate customers on mineral nutrition, proper hydration, diet, and lifestyle vitality.

### 1.1 Non-Medical Boundary & Statutory Consent
- Consultations **do not** constitute the practice of medicine or pharmaceutical prescribing under Republic Act No. 2382 (Medical Act of 1959).
- Consultations are classified as **Lifestyle and Wellness Education**.
- **Privacy Legal Basis (Proposed Compliance Baseline):** Under Section 13(a) of RA 10173 (Data Privacy Act of 2012), capturing client health intake and wellness goals is designed to require **Explicit Informed Consent**. Based on the currently documented proposed wellness-consultation model, processing is designed to rely on Section 13(a) explicit consent. Reassess Section 13(e) if the service later involves medical treatment, a medical practitioner, or a medical treatment institution. Standalone, granular informed consent is secured prior to capturing health intake questionnaires.
- Prior to confirming an appointment, the customer must acknowledge an explicit standalone digital informed consent:
  > *"I understand that this consultation is a holistic wellness and nutritional education session provided by a certified wellness practitioner. It does not replace medical consultation, diagnosis, or treatment with a licensed physician. I will not discontinue any prescribed medical treatment without consulting my doctor."*

---

## 2. Consultation Service Definitions

| Service Code | Service Title | Duration | Delivery Mode | Description |
| :--- | :--- | :--- | :--- | :--- |
| `CNS-IN-PERSON` | In-Branch Wellness Assessment | 45 minutes | In-Person (Daet, Labo, Capalonga) | Face-to-face hydration and lifestyle consultation in a private branch room. |
| `CNS-VIRTUAL` | Virtual Wellness Consultation | 30 minutes | Secure Video Call | Tele-wellness session for remote clients across Camarines Norte or regional Bicol. |
| `CNS-FOLLOWUP` | Follow-up Progress Review | 20 minutes | Video or Phone Call | Progress review on hydration routines and general vitality. |

---

## 3. Practitioner Scheduling & Availability Management

### 3.1 Practitioner Profiles
- Verified Bio, Certifications (e.g., Naturopathy, Nutrition, Lifestyle Coaching), photo, and languages spoken (Bikol, Tagalog, English).
- Associated physical branch locations where practitioner conducts in-person sessions.
- **Status:** **OPEN QUESTION / BLOCKER** (Practitioner roster and credentials must be submitted by business owner before Phase 4).

### 3.2 Time Slot Scheduling Engine
- Dynamic calendar defining working hours (e.g. Tuesday–Saturday, 9:00 AM – 5:00 PM).
- Automatic buffer time: 15-minute inter-appointment cleaning/preparation buffer.
- Real-time slot locking: When a customer clicks a time slot, it is soft-locked for 10 minutes to prevent double-booking.

---

## 4. Health Intake Form & Clinical Records Workflow

```
[Appointment Booked] ──► [Digital Health Intake Form Sent via SMS/Email]
                                   │
                                   ▼
        [Customer Completes Intake Form in Encrypted Dashboard]
        - Dietary habits & water consumption patterns
        - Current lifestyle stresses & energy levels
        - Declared health conditions (for safety contraindication checks)
        - Explicit informed consent acknowledgement (RA 10173 Section 13(a))
                                   │
                                   ▼
                [Practitioner Secure Review Workspace]
        - Accessible only 24 hours prior to appointment
        - Decrypted client health summary
                                   │
                                   ▼
                       [Consultation Occurs]
                                   │
                                   ▼
               [Encrypted Practitioner Notes Saved]
        - Hydration & mineral dilution recommendations
        - Dietary lifestyle suggestions
        - Recommended follow-up date
```

---

## 5. Security & Sensitive Personal Information Controls

As detailed in `docs/compliance/health-data-boundary.md`:
1. **Access Isolation:** Health intake forms and practitioner notes are completely invisible to branch retail clerks, warehouse personnel, and marketing staff.
2. **Column Encryption:** Clinical assessment text is protected by application-level envelope encryption (`AES-256-GCM` recommended control).
3. **Audit Trails:** Every view, edit, or export of a consultation record generates an immutable access log.
4. **Retention Policy:** Records are archived for **5 years** following the last interaction (*Recommended Platform Policy*), after which client data is securely purged or anonymized.
