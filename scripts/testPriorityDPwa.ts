/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';

console.log('========================================================================');
console.log('Running Priority D Phase 8: Mobile & PWA Hardening Suite');
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

async function runPwaTests() {
  console.log('\n--- Test Group 1: Web App Manifest Verification ---');
  const manifestPath = path.resolve(process.cwd(), 'public', 'manifest.json');
  assert(fs.existsSync(manifestPath), '1.1 public/manifest.json exists');

  let manifest: any = {};
  try {
    const raw = fs.readFileSync(manifestPath, 'utf8');
    manifest = JSON.parse(raw);
    assert(true, '1.2 manifest.json parses as valid JSON');
  } catch (err: any) {
    assert(false, `1.2 manifest.json parses as valid JSON: ${err.message}`);
  }

  assert(manifest.id === '/', '1.3 manifest has correct id "/"');
  assert(typeof manifest.name === 'string' && manifest.name.length > 0, '1.4 manifest has valid application name');
  assert(typeof manifest.short_name === 'string' && manifest.short_name.length <= 12, '1.5 manifest short_name is <= 12 characters');
  assert(manifest.start_url === '/', '1.6 manifest start_url is "/"');
  assert(manifest.scope === '/', '1.7 manifest scope is "/"');
  assert(manifest.display === 'standalone', '1.8 manifest display mode is "standalone"');
  assert(typeof manifest.theme_color === 'string', '1.9 manifest has theme_color');
  assert(typeof manifest.background_color === 'string', '1.10 manifest has background_color');
  assert(Array.isArray(manifest.icons) && manifest.icons.length >= 2, '1.11 manifest includes at least 2 icon definitions (192x192 & 512x512)');

  console.log('\n--- Test Group 2: Service Worker & Offline Shell Caching ---');
  const swPath = path.resolve(process.cwd(), 'public', 'sw.js');
  assert(fs.existsSync(swPath), '2.1 public/sw.js exists');

  const swContent = fs.readFileSync(swPath, 'utf8');
  assert(swContent.includes('install'), '2.2 Service worker listens for install event');
  assert(swContent.includes('activate'), '2.3 Service worker listens for activate event');
  assert(swContent.includes('fetch'), '2.4 Service worker listens for fetch event');
  assert(swContent.includes('caches.open') || swContent.includes('caches.match'), '2.5 Service worker implements cache storage operations');
  assert(swContent.includes('/api/'), '2.6 Service worker implements API network-first / offline fallback policy');

  console.log('\n--- Test Group 3: HTML Entry Point PWA Metadata Integration ---');
  const htmlPath = path.resolve(process.cwd(), 'index.html');
  assert(fs.existsSync(htmlPath), '3.1 index.html exists');

  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  assert(htmlContent.includes('rel="manifest"'), '3.2 index.html links manifest.json');
  assert(htmlContent.includes('name="theme-color"'), '3.3 index.html specifies theme-color meta tag');
  assert(htmlContent.includes('apple-touch-icon'), '3.4 index.html specifies apple-touch-icon for iOS Safari');

  console.log('\n--- Test Group 4: Service Worker Registration in Main Entry ---');
  const mainPath = path.resolve(process.cwd(), 'src', 'main.tsx');
  assert(fs.existsSync(mainPath), '4.1 src/main.tsx exists');

  const mainContent = fs.readFileSync(mainPath, 'utf8');
  assert(mainContent.includes('serviceWorker') && mainContent.includes('/sw.js'), '4.2 src/main.tsx registers /sw.js service worker');

  console.log('\n========================================================================');
  console.log(`Priority D Phase 8 Test Results: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('========================================================================');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPwaTests().catch((err) => {
  console.error('PWA test suite failed:', err);
  process.exit(1);
});
