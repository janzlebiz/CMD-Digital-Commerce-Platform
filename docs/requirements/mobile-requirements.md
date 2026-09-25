# Mobile & Progressive Web Application (PWA) Requirements

**Document ID:** REQ-MOB-008  
**Project:** HCI CMD Digital Commerce Platform  
**Target Territory:** Camarines Norte, Philippines  
**Audit Phase:** Phase 0 — Baseline Architecture  
**Status:** Certified Audit Baseline  
**Date:** 2026-09-25  

---

## 1. Mobile-First Context & Strategic Rationale

Over 85% of e-commerce interactions, customer service inquiries, and staff operations in Camarines Norte occur on mobile Android and iOS smartphones over cellular networks (Smart/TNT and Globe/TM).

Mobile experience is not an afterthought; it is the **primary execution surface** of the platform.

---

## 2. Progressive Web App (PWA) Architecture

### 2.1 PWA Manifest & App Shell
- **Installability:** Meets full W3C Web App Manifest standards:
  - `name`: "HCI CMD Camarines Norte"
  - `short_name`: "HCI CMD"
  - `display`: `standalone` (removes browser URL bar when installed)
  - `theme_color`: Professional wellness palette (emerald green / deep slate)
  - `icons`: Maskable and standard PNG icons (192x192, 512x512).
- **Service Worker Lifecycle:**
  - Network-first for dynamic product inventory, prices, and checkout.
  - Stale-while-revalidate for static educational articles, brand imagery, and UI assets.
  - Cache-first for system fonts and static icons.

### 2.2 Safe Offline Behavior
- **Permitted Offline Access:**
  - Cached view of confirmed order history and pickup codes.
  - Cached event tickets with offline QR code display.
  - Static branch directory (Daet, Labo, Paracale, Panganiban, Capalonga, Sta. Elena) with offline telephone dialer links.
  - Pre-cached basic hydration guidelines and directions for use.
- **Strictly Server-Authoritative (Offline Disabled):**
  - Checkout and payment processing (must fail gracefully if offline).
  - Health intake submissions (cannot queue health records in unencrypted client storage).
  - Inventory count adjustments.

---

## 3. Cellular Network Optimization (3G / 4G Bicol Infrastructure)

Given sporadic cellular connectivity in rural barangays (e.g., coastal Capalonga or mountain corridors of Labo):
1. **Lightweight Bundle:** Target initial JavaScript payload < 150 KB compressed.
2. **Next-Gen Media Formats:** WebP/AVIF image delivery with responsive `srcset` tailored to device resolution.
3. **Resilient Network Requests:** Exponential backoff retry logic for critical network queries.
4. **Offline Detection Banner:** Visual top banner notifying user: *"You are currently offline. Showing saved orders and branch contact numbers."*

---

## 4. Mobile Ergonomics & Payment Deep-Linking

1. **Touch Ergonomics:** Minimum 48x48 dp touch target size for buttons, dropdowns, and navigation elements. Single-thumb reachability for cart and checkout action triggers.
2. **E-Wallet Deep Linking:** Seamless app-switch flow to GCash and Maya mobile apps, returning automatically to order confirmation upon payment completion.
3. **Staff Mobile Scanner:** Camera-based barcode and QR code scanner integrated directly into web browser via HTML5 Camera API (`getUserMedia`) for instant ticket check-in and pickup code validation without requiring separate hardware.
