/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createExpressApp } from '../server.ts';
import http from 'http';
import fs from 'fs';
import path from 'path';

console.log('========================================================================');
console.log('Running Priority A — Production Runtime & Observability Foundation Suite');
console.log('========================================================================');

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, description: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${description}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAIL: ${description}`);
    failedCount++;
  }
}

// Mock Firestore for testing readiness and health endpoints
function createMockDb(failOnCheck = false) {
  return {
    collection: (colName: string) => ({
      doc: (docId: string) => ({
        get: async () => {
          if (failOnCheck) {
            throw new Error('MOCK_FIRESTORE_CONNECTION_ERROR: Unable to connect to Firestore cluster');
          }
          return { exists: true, data: () => ({ status: 'healthy' }) };
        }
      })
    })
  };
}

async function runTests() {
  process.env.ENABLE_TEST_ROUTES = 'true';
  // 1. Test /healthz endpoint
  const mockDb = createMockDb(false);
  const app = createExpressApp({ db: mockDb });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;

  try {
    // 1. Liveness check GET /healthz
    const healthRes = await fetch(`http://127.0.0.1:${port}/healthz`);
    const healthBody: any = await healthRes.json();
    assert(healthRes.status === 200, '1. GET /healthz returns HTTP 200 OK');
    assert(healthBody.status === 'ok' && !!healthBody.timestamp, '2. GET /healthz returns valid status: ok JSON payload');

    // 2. Readiness check GET /readyz (success case)
    const readyRes = await fetch(`http://127.0.0.1:${port}/readyz`);
    const readyBody: any = await readyRes.json();
    assert(readyRes.status === 200, '3. GET /readyz returns HTTP 200 OK when dependencies are healthy');
    assert(readyBody.status === 'ready' && !!readyBody.timestamp, '4. GET /readyz returns status: ready JSON payload');

    // 3. Request Correlation ID behavior
    const testCustomTrace = 'TRACE-CUSTOM-REQUEST-ID-9999';
    const traceRes = await fetch(`http://127.0.0.1:${port}/healthz`, {
      headers: { 'X-Request-Id': testCustomTrace }
    });
    assert(traceRes.headers.get('x-request-id') === testCustomTrace, '5. Server echoes provided X-Request-Id header in HTTP response');
    assert(traceRes.headers.get('x-correlation-id') === testCustomTrace, '6. Server echoes provided x-correlation-id header in HTTP response');

    const generatedTraceRes = await fetch(`http://127.0.0.1:${port}/healthz`);
    const genTrace = generatedTraceRes.headers.get('x-request-id');
    assert(!!genTrace && genTrace.length > 5, '7. Server automatically generates request/correlation ID when none provided');

    // 4. Centralized Error Handler (unexpected error protection & secret sanitization in production)
    const oldEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const errRes = await fetch(`http://127.0.0.1:${port}/api/test-uncaught-error`);
    const errBody: any = await errRes.json();
    process.env.NODE_ENV = oldEnv;

    assert(errRes.status === 500, '8. Centralized error middleware captures uncaught error and returns HTTP 500');
    assert(errBody.error === 'An unexpected internal error occurred', '9. Production mode masks uncaught error details with generic message');
    assert(!JSON.stringify(errBody).includes('sensitive_internal_db_password'), '10. Production error response hides stack traces and sensitive internal credentials');
    assert(!!errBody.correlationId, '11. Error response includes correlationId for log traceability');

  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  // 5. Readiness check GET /readyz (failure case)
  const failingDb = createMockDb(true);
  const failingApp = createExpressApp({ db: failingDb });
  const failingServer = http.createServer(failingApp);
  await new Promise<void>((resolve) => failingServer.listen(0, resolve));
  const failingPort = (failingServer.address() as any).port;

  try {
    const failReadyRes = await fetch(`http://127.0.0.1:${failingPort}/readyz`);
    const failReadyBody: any = await failReadyRes.json();
    assert(failReadyRes.status === 503, '12. GET /readyz returns HTTP 503 Service Unavailable when dependency check fails');
    assert(failReadyBody.status === 'not_ready', '13. GET /readyz returns status: not_ready when dependency check fails');
    assert(!JSON.stringify(failReadyBody).includes('MOCK_FIRESTORE_CONNECTION_ERROR'), '14. Readiness failure response conceals internal stack trace/error details');
  } finally {
    await new Promise<void>((resolve) => failingServer.close(() => resolve()));
  }

  // 6. Build Artifact Verification
  const serverArtifactExists = fs.existsSync(path.resolve(process.cwd(), 'dist-server', 'server.js'));
  const clientArtifactExists = fs.existsSync(path.resolve(process.cwd(), 'dist', 'index.html'));
  assert(serverArtifactExists, '15. Production build artifact dist-server/server.js exists on disk');
  assert(clientArtifactExists, '16. Production client bundle dist/index.html exists on disk');

  console.log('========================================================================');
  console.log(`Priority A Test Results: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('========================================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Unhandled error in Priority A test runner:', err);
  process.exit(1);
});
