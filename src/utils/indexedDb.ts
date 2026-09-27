/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExpenseRecord, FinanceMetricsSummary } from '../types';

export const DB_NAME = 'HciCmdOfflineDb';
export const DB_VERSION = 3;

/**
 * Initializes and manages IndexedDB with seamless v2 -> v3 migration.
 * v1: 'orders', 'tickets'
 * v2: 'cached_crm_cohorts'
 * v3: 'expenses' (with indexes on branchId, category, incurredAt) & 'cached_finance_metrics'
 */
export function openOfflineDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = request.result;
      const oldVersion = event.oldVersion;

      // Migration step from scratch (< v1)
      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains('orders')) {
          const orderStore = db.createObjectStore('orders', { keyPath: 'id' });
          orderStore.createIndex('branchId', 'branchId', { unique: false });
          orderStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
        if (!db.objectStoreNames.contains('tickets')) {
          const ticketStore = db.createObjectStore('tickets', { keyPath: 'id' });
          ticketStore.createIndex('branchId', 'branchId', { unique: false });
          ticketStore.createIndex('status', 'status', { unique: false });
        }
      }

      // Migration step (< v2)
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains('cached_crm_cohorts')) {
          db.createObjectStore('cached_crm_cohorts', { keyPath: 'key' });
        }
      }

      // Migration step v2 -> v3 (Milestone 3 requirement: offline expenses & financial metrics)
      if (oldVersion < 3) {
        if (!db.objectStoreNames.contains('expenses')) {
          const expenseStore = db.createObjectStore('expenses', { keyPath: 'id' });
          expenseStore.createIndex('branchId', 'branchId', { unique: false });
          expenseStore.createIndex('category', 'category', { unique: false });
          expenseStore.createIndex('incurredAt', 'incurredAt', { unique: false });
          expenseStore.createIndex('expenseStatus', 'expenseStatus', { unique: false });
        }
        if (!db.objectStoreNames.contains('cached_finance_metrics')) {
          db.createObjectStore('cached_finance_metrics', { keyPath: 'key' });
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Persists an expense record offline in IndexedDB v3 'expenses' store.
 */
export async function saveOfflineExpense(expense: ExpenseRecord): Promise<void> {
  const db = await openOfflineDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('expenses', 'readwrite');
    const store = tx.objectStore('expenses');
    const req = store.put(expense);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieves cached or offline expenses filtered by branch.
 */
export async function getOfflineExpenses(branchId?: string): Promise<ExpenseRecord[]> {
  const db = await openOfflineDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('expenses', 'readonly');
    const store = tx.objectStore('expenses');
    let req: IDBRequest;

    if (branchId && store.indexNames.contains('branchId')) {
      const index = store.index('branchId');
      req = index.getAll(branchId);
    } else {
      req = store.getAll();
    }

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Caches financial performance metrics for offline resiliency.
 */
export async function cacheFinanceMetrics(metrics: FinanceMetricsSummary, key = 'latest'): Promise<void> {
  const db = await openOfflineDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cached_finance_metrics', 'readwrite');
    const store = tx.objectStore('cached_finance_metrics');
    const record = { key, data: metrics, cachedAt: new Date().toISOString() };
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieves cached financial performance metrics.
 */
export async function getCachedFinanceMetrics(key = 'latest'): Promise<FinanceMetricsSummary | null> {
  const db = await openOfflineDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cached_finance_metrics', 'readonly');
    const store = tx.objectStore('cached_finance_metrics');
    const req = store.get(key);
    req.onsuccess = () => {
      resolve(req.result ? req.result.data : null);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Verifies that the IndexedDB v3 upgrade completed and object stores exist.
 */
export async function verifyV3IndexedDbMigration(): Promise<{
  version: number;
  stores: string[];
  v3Ready: boolean;
}> {
  const db = await openOfflineDatabase();
  const stores = Array.from(db.objectStoreNames);
  const v3Ready = stores.includes('expenses') && stores.includes('cached_finance_metrics');
  return {
    version: db.version,
    stores,
    v3Ready,
  };
}
