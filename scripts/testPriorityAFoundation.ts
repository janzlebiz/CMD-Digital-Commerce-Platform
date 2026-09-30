/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { execSync, spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { createExpressApp } from '../server.ts';

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

// Mock Firestore for testing readiness and health endpoints in unit isolation
function createMockDb(failOnCheck = false) {
  return {
    collection: (_colName: string) => ({
      doc: (_docId: string) => ({
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
  // 1. Clean Build output directories before build verification
  const distDir = path.resolve(process.cwd(), 'dist');
  const distServerDir = path.resolve(process.cwd(), 'dist-server');
  const serverArtifactPath = path.join(distServerDir, 'server.js');
  const clientArtifactPath = path.join(distDir, 'index.html');

  fs.rmSync(distDir, { recursive: true, force: true });
  fs.rmSync(distServerDir, { recursive: true, force: true });

  assert(!fs.existsSync(distDir), '1. Deleted dist/ prior to production build verification');
  assert(!fs.existsSync(distServerDir), '2. Deleted dist-server/ prior to production build verification');

  // 2. Execute real production build command
  console.log('\n--- Executing real npm run build ---');
  try {
    execSync('npm run build', { stdio: 'pipe', env: process.env });
    assert(true, '3. Real npm run build executed successfully with zero exit code');
  } catch (buildErr: any) {
    assert(false, `3. Real npm run build failed: ${buildErr.message}`);
    process.exit(1);
  }

  // 3. Verify build artifacts
  assert(fs.existsSync(clientArtifactPath), '4. Verified dist/index.html exists after build');
  assert(fs.existsSync(serverArtifactPath), '5. Verified dist-server/server.js exists after build');

  const stat = fs.statSync(serverArtifactPath);
  assert(stat.size > 0, `6. Verified generated dist-server/server.js is non-empty (${stat.size} bytes)`);

  const artifactContent = fs.readFileSync(serverArtifactPath, 'utf8');
  assert(
    artifactContent.includes('createExpressApp') || artifactContent.includes('startServer'),
    '7. Verified generated dist-server/server.js contains production server entrypoint/runtime'
  );

  // 4. Verify npm start production runtime execution
  console.log('\n--- Verifying npm start production server runtime ---');
  const testPort = 3098;
  const childEnv = {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(testPort),
    HMAC_SECRET: process.env.TEST_HMAC_SECRET || `DYNAMIC_TEST_HMAC_${Date.now()}_KEY`
  };

  const child = spawn('npm', ['start'], {
    cwd: process.cwd(),
    env: childEnv,
    stdio: 'pipe'
  });

  let serverErrorOutput = '';
  child.stderr?.on('data', (chunk) => {
    serverErrorOutput += chunk.toString();
  });

  async function waitForServer(url: string, timeoutMs = 10000): Promise<Response> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const res = await fetch(url);
        if (res.ok) return res;
      } catch {
        // Retry until ready
      }
      await new Promise((r) => setTimeout(r, 150));
    }
    throw new Error(`Production server failed to become reachable at ${url} within ${timeoutMs}ms. Stderr: ${serverErrorOutput}`);
  }

  try {
    const prodHealthRes = await waitForServer(`http://127.0.0.1:${testPort}/healthz`);
    assert(prodHealthRes.status === 200, '8. Live npm start production server GET /healthz returns HTTP 200 OK');

    const prodHealthBody: any = await prodHealthRes.json();
    assert(prodHealthBody.status === 'ok' && !!prodHealthBody.timestamp, '9. Live npm start production server returns valid status: ok JSON payload');

    const reqIdHeader = prodHealthRes.headers.get('x-request-id') || prodHealthRes.headers.get('x-correlation-id');
    assert(!!reqIdHeader && reqIdHeader.length > 0, '10. Live npm start production server returns X-Request-Id header');
  } catch (err: any) {
    assert(false, `Live npm start verification failed: ${err.message}`);
  } finally {
    child.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 500));
  }

  // 5. In-process unit checks for endpoints, headers, and error middleware
  console.log('\n--- Running in-process unit verification ---');
  process.env.ENABLE_TEST_ROUTES = 'true';
  const mockDb = createMockDb(false);
  const app = createExpressApp({ db: mockDb });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;

  try {
    // Liveness check GET /healthz
    const healthRes = await fetch(`http://127.0.0.1:${port}/healthz`);
    const healthBody: any = await healthRes.json();
    assert(healthRes.status === 200, '11. Unit GET /healthz returns HTTP 200 OK');
    assert(healthBody.status === 'ok' && !!healthBody.timestamp, '12. Unit GET /healthz returns valid status: ok JSON payload');

    // Readiness check GET /readyz (success case with mock db)
    const readyRes = await fetch(`http://127.0.0.1:${port}/readyz`);
    const readyBody: any = await readyRes.json();
    assert(readyRes.status === 200, '13. Unit GET /readyz returns HTTP 200 OK when dependencies are healthy');
    assert(readyBody.status === 'ready' && !!readyBody.timestamp, '14. Unit GET /readyz returns status: ready JSON payload');

    // Request Correlation ID behavior
    const testCustomTrace = 'TRACE-CUSTOM-REQUEST-ID-9999';
    const traceRes = await fetch(`http://127.0.0.1:${port}/healthz`, {
      headers: { 'X-Request-Id': testCustomTrace }
    });
    assert(traceRes.headers.get('x-request-id') === testCustomTrace, '15. Server echoes provided X-Request-Id header in HTTP response');
    assert(traceRes.headers.get('x-correlation-id') === testCustomTrace, '16. Server echoes provided x-correlation-id header in HTTP response');

    const generatedTraceRes = await fetch(`http://127.0.0.1:${port}/healthz`);
    const genTrace = generatedTraceRes.headers.get('x-request-id');
    assert(!!genTrace && genTrace.length > 5, '17. Server automatically generates request/correlation ID when none provided');

    // Centralized Error Handler (unexpected error protection & secret sanitization in production)
    const oldEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const errRes = await fetch(`http://127.0.0.1:${port}/api/test-uncaught-error`);
    const errBody: any = await errRes.json();
    process.env.NODE_ENV = oldEnv;

    assert(errRes.status === 500, '18. Centralized error middleware captures uncaught error and returns HTTP 500');
    assert(errBody.error === 'An unexpected internal error occurred', '19. Production mode masks uncaught error details with generic message');
    assert(!JSON.stringify(errBody).includes('sensitive_internal_db_password'), '20. Production error response hides stack traces and sensitive internal credentials');
    assert(!!errBody.correlationId, '21. Error response includes correlationId for log traceability');

  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  // 6. Readiness check GET /readyz (failure case with failing mock db)
  const failingDb = createMockDb(true);
  const failingApp = createExpressApp({ db: failingDb });
  const failingServer = http.createServer(failingApp);
  await new Promise<void>((resolve) => failingServer.listen(0, resolve));
  const failingPort = (failingServer.address() as any).port;

  try {
    const failReadyRes = await fetch(`http://127.0.0.1:${failingPort}/readyz`);
    const failReadyBody: any = await failReadyRes.json();
    assert(failReadyRes.status === 503, '22. GET /readyz returns HTTP 503 Service Unavailable when dependency check fails');
    assert(failReadyBody.status === 'not_ready', '23. GET /readyz returns status: not_ready when dependency check fails');
    assert(!JSON.stringify(failReadyBody).includes('MOCK_FIRESTORE_CONNECTION_ERROR'), '24. Readiness failure response conceals internal stack trace/error details');
  } finally {
    await new Promise<void>((resolve) => failingServer.close(() => resolve()));
  }

  console.log('========================================================================');
  console.log(`Priority A Test Results: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('========================================================================');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Unhandled error in Priority A test runner:', err);
  process.exit(1);
});
