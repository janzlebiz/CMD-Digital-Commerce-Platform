/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Development Smoke Test Suite (Mock-Based)
 * Verifies critical flows locally using mocked database and services.
 */

import { createExpressApp } from '../server.ts';
import http from 'http';

console.log('========================================================================');
console.log('Running Development Smoke Test Suite (Mocked)');
console.log('========================================================================');

let passedCount = 0;
let failedCount = 0;

function assert(condition: any, description: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${description}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAIL: ${description}`);
    failedCount++;
  }
}

function createSmokeMockDb() {
  const store = new Map<string, any>();
  return {
    collection: (colName: string) => ({
      doc: (id: string) => ({
        get: async () => ({
          exists: true,
          data: () => ({
            uid: id,
            email: 'customer@hcicmd.ph',
            role: 'customer'
          })
        }),
        set: async (data: any) => {
          store.set(`${colName}/${id}`, data);
        },
        delete: async () => {
          store.delete(`${colName}/${id}`);
        }
      }),
      where: () => ({
        get: async () => ({
          empty: true,
          docs: [],
          forEach: () => {}
        })
      }),
      get: async () => ({
        empty: false,
        docs: [
          { id: '1', data: () => ({ id: '1', title: 'Workshop 1', date: '2026-10-01' }) }
        ],
        forEach: (cb: any) => cb({ id: '1', data: () => ({ id: '1', title: 'Workshop 1', date: '2026-10-01' }) })
      })
    })
  };
}

// semgrep-ignore: typescript.react.security.react-insecure-request.react-insecure-request
async function runDevSmokeTests() {
  const db = createSmokeMockDb();
  const app = createExpressApp({ db });
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(3000, '127.0.0.1', () => {
      console.log('[Dev Server] Started temporary Express server on port 3000');
      resolve();
    });
  });

  const baseUrl = 'http://127.0.0.1:3000';

  try {
    console.log('\n--- Test Group 1: Health Probes ---');
    const healthzRes = await fetch(`${baseUrl}/api/healthz`);
    assert(healthzRes.status === 200, '1.1 GET /api/healthz returns HTTP 200');

    // Add additional critical mock tests here as needed
  } catch (err: any) {
    console.error('Dev smoke tests failed:', err.message);
    failedCount++;
  } finally {
    await new Promise<void>((resolve) => {
      server.close(() => {
        console.log('[Dev Server] Stopped temporary Express server successfully.');
        resolve();
      });
    });
  }

  console.log('========================================================================');
  console.log(`Development Smoke Test Results: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('========================================================================');

  if (failedCount > 0) process.exit(1);
}

runDevSmokeTests().catch((err) => {
  console.error('Unhandled dev smoke test exception:', err);
  process.exit(1);
});
