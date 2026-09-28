# Production Runtime & Observability Baseline

## 1. Overview & Purpose

This document establishes the authoritative production runtime, build pipeline, health probing, structured logging, and error handling baseline for the **HCI CMD Digital Commerce Platform** following the Priority A foundation remediation.

> **EXPLICIT NOTICE**: This document represents a **FOUNDATION REMEDIATION** for runtime stability and observability. It **does NOT** constitute Phase 9 Production Certification.

---

## 2. Production Build & Start Commands

The platform defines a clean, reproducible, two-stage production build pipeline that compiles both client assets and the server runtime without requiring TypeScript source files or development tools at runtime.

### Clean Installation
```bash
npm install
```

### Production Build
```bash
npm run build
```
This single command executes:
1. `tsc --noEmit`: Type checks the entire codebase (frontend, backend, and test scripts).
2. `vite build`: Bundles the React 19 + Tailwind CSS SPA into static client assets in `dist/`.
3. `esbuild server.ts`: Bundles the Express TypeScript server into a self-contained Node.js ES module artifact in `dist-server/server.js` with externalized `node_modules` dependencies.

### Production Start
```bash
npm start
```
Executes `node dist-server/server.js` to launch the standalone production server.

---

## 3. Generated Build Artifacts

| Artifact Path | Description | Consumption |
| :--- | :--- | :--- |
| `dist/index.html` | Entry point HTML for Vite React 19 SPA | Served statically by Express in production mode |
| `dist/assets/*` | Bundled JavaScript, CSS, and image assets | Served with static cache headers by Express |
| `dist-server/server.js` | Compiled standalone Node.js Express server bundle | Executed directly by `npm start` (`node dist-server/server.js`) |

---

## 4. Runtime Architecture

* **Process Model**: Single Node.js process running Express (`server.js`).
* **Static Asset Delivery**: In production (`NODE_ENV=production`), Express statically serves client assets from `dist/` and falls back to `dist/index.html` for client-side SPA routing.
* **API Endpoints**: All `/api/*` endpoints are processed server-side with Bearer token authentication, HMAC security validation, and Firestore database interaction.
* **Port Resolution**: Default port `3000`, overridable via `process.env.PORT`.

---

## 5. Health & Readiness Probes

The platform exposes two standard HTTP endpoints for load balancer, container orchestrator (Kubernetes/Cloud Run), and infrastructure liveness/readiness probing.

### Liveness Probe (`GET /healthz`)
* **Purpose**: Indicates if the server process is responsive and accepting HTTP connections.
* **HTTP Status**: Always returns `200 OK` when the process is alive.
* **Response Payload**:
  ```json
  {
    "status": "ok",
    "timestamp": "2026-09-28T18:30:00.000Z"
  }
  ```
* **Security & Privacy**: Contains zero secrets, database metadata, tokens, or PII.

### Readiness Probe (`GET /readyz`)
* **Purpose**: Verifies that required configuration (e.g. HMAC secrets) and database dependencies (Firestore) are initialized and accessible before routing traffic.
* **HTTP Status**:
  * `200 OK` when all boot configuration and database connections are healthy.
  * `503 Service Unavailable` if configuration checks or database pings fail.
* **Response Payload (Healthy)**:
  ```json
  {
    "status": "ready",
    "timestamp": "2026-09-28T18:30:00.000Z"
  }
  ```
* **Response Payload (Unhealthy)**:
  ```json
  {
    "status": "not_ready",
    "error": "Service initialization or dependency unavailable"
  }
  ```
* **Security & Privacy**: Conceals internal exception messages, stack traces, and database connection strings.

---

## 6. Structured Server Logging

Server logs are formatted as structured JSON lines sent to standard output (`stdout` for info/warn, `stderr` for error) for compatibility with centralized log management (Cloud Logging / Datadog / ELK).

### Supported Log Levels
* `info`: Startup messages, request completion events, operational actions.
* `warn`: Non-fatal warnings, rate limits, soft authorization rejections.
* `error`: Uncaught exceptions, database connectivity errors, readiness failures.

### Standard Log Entry Schema
```json
{
  "timestamp": "2026-09-28T18:30:00.000Z",
  "level": "info",
  "message": "HTTP request completed",
  "method": "POST",
  "path": "api/orders/checkout",
  "statusCode": 200,
  "correlationId": "TRACE-1727548200000-a1b2c3d4",
  "durationMs": 42
}
```

### Sensitive Data Redaction Rules
The logger automatically redacts sensitive fields matching any of the following key patterns:
`token`, `authorization`, `password`, `secret`, `hmac`, `kms`, `key`, `ciphertext`, `clinical`, `intake`, `dietary`, `water`, `condition`, `card`, `cvv`, `ssn`, `bearer`.

---

## 7. Request Correlation & Traceability

* Every incoming HTTP request is assigned a unique trace ID.
* The server inspects incoming `X-Request-Id` or `x-correlation-id` headers. If provided, the existing value is preserved; otherwise, a unique UUID trace ID is generated.
* The trace ID is attached to Express `req.correlationId` and echoed in all HTTP response headers as both `x-correlation-id` and `X-Request-Id`.
* All structured log entries and error responses include `correlationId` to enable cross-system log correlation.

---

## 8. Safe Centralized Error Handling

An Express 4-arity error handling middleware catches unhandled exceptions across API endpoints:
* **Production Error Masking**: In `NODE_ENV=production`, unhandled 500 errors return a generic response: `{"error": "An unexpected internal error occurred", "correlationId": "..."}`.
* **Log Retention**: The full internal error message and stack trace are logged server-side via `logger.error` with the associated `correlationId`.
* **Zero Leakage**: No internal database details, passwords, stack traces, or KMS keys are exposed to HTTP clients.

---

## 9. Required Production Environment Variables

| Variable Name | Required | Default | Purpose / Description |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Yes | `development` | Set to `production` for production builds and runtime. |
| `PORT` | No | `3000` | HTTP listening port. |
| `HMAC_SECRET` | Yes (in prod) | None | Fail-closed secret key for generating and verifying cryptographic hashes. |
| `FIREBASE_PROJECT_ID` | Yes | `ai-studio-cmddigitalcommer-8d70f45b-1636-42ba-9e2d-f063a7b0e086` | Firebase project identifier. |

---

## 10. Known Limitations & Non-Goals

* **Phase 9 Certification**: This foundation establishes runtime and observability mechanics; formal security penetration testing, disaster recovery drills, and load testing are part of Phase 9.
* **External Integrations**: Third-party payment gateways (Stripe/GCash) and shipping carriers remain open (Priority B/C).
