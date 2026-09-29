/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  createExpressApp,
  calculateOperationalKpis,
  generateOperationalKpisCsv,
  OperationalKpis,
} from '../server.ts';
import http from 'http';

console.log('========================================================================');
console.log('Running Priority C Milestone C4: Operational Analytics & Export Suite');
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

const now = new Date();
const dIso = (daysAgo: number, hoursAgo = 0) => {
  const d = new Date(now.getTime() - (daysAgo * 24 + hoursAgo) * 60 * 60 * 1000);
  return d.toISOString();
};

function createC4MockDb() {
  const store: Record<string, Map<string, any>> = {
    users: new Map(),
    orders: new Map(),
    consultation_appointments: new Map(),
    workshops: new Map(),
    workshop_registrations: new Map(),
    support_tickets: new Map(),
    inventory: new Map(),
    inventory_transfers: new Map(),
    product_batches: new Map(),
    audit_logs: new Map(),
  };

  // 1. Users
  store.users.set('demo-admin-uid', {
    uid: 'demo-admin-uid',
    role: 'super_admin',
    email: 'admin@hcicmd.ph',
  });
  store.users.set('demo-director-uid', {
    uid: 'demo-director-uid',
    role: 'regional_director',
    email: 'director@hcicmd.ph',
  });
  store.users.set('demo-manager-daet-uid', {
    uid: 'demo-manager-daet-uid',
    role: 'branch_manager',
    assignedBranchId: 'daet',
    email: 'manager.daet@hcicmd.ph',
  });
  store.users.set('demo-manager-naga-uid', {
    uid: 'demo-manager-naga-uid',
    role: 'branch_manager',
    assignedBranchId: 'naga',
    email: 'manager.naga@hcicmd.ph',
  });
  store.users.set('demo-customer-uid', {
    uid: 'demo-customer-uid',
    role: 'customer',
    email: 'customer@example.com',
  });

  // 2. Orders (E-Commerce)
  // Daet orders:
  store.orders.set('ORD-D1', {
    id: 'ORD-D1',
    branchId: 'daet',
    grandTotal: 1500,
    fulfillmentStatus: 'completed',
    paymentStatus: 'paid',
    placedAt: dIso(5),
    createdAt: dIso(5),
  });
  store.orders.set('ORD-D2', {
    id: 'ORD-D2',
    branchId: 'daet',
    grandTotal: 2500,
    fulfillmentStatus: 'delivered',
    paymentStatus: 'paid',
    placedAt: dIso(3),
    createdAt: dIso(3),
  });
  store.orders.set('ORD-D3', {
    id: 'ORD-D3',
    branchId: 'daet',
    grandTotal: 1000,
    fulfillmentStatus: 'cancelled',
    paymentStatus: 'refunded',
    refundedAmount: 1000,
    placedAt: dIso(2),
    createdAt: dIso(2),
  });
  store.orders.set('ORD-D4', {
    id: 'ORD-D4',
    branchId: 'daet',
    grandTotal: 3000,
    fulfillmentStatus: 'processing',
    paymentStatus: 'paid',
    placedAt: dIso(1),
    createdAt: dIso(1),
  });

  // Naga orders:
  store.orders.set('ORD-N1', {
    id: 'ORD-N1',
    branchId: 'naga',
    grandTotal: 5000,
    fulfillmentStatus: 'completed',
    paymentStatus: 'paid',
    placedAt: dIso(4),
    createdAt: dIso(4),
  });
  store.orders.set('ORD-N2', {
    id: 'ORD-N2',
    branchId: 'naga',
    grandTotal: 2000,
    fulfillmentStatus: 'delivered',
    paymentStatus: 'paid',
    placedAt: dIso(10), // Older date
    createdAt: dIso(10),
  });

  // 3. Consultations
  // Daet appointments:
  store.consultation_appointments.set('APP-D1', {
    id: 'APP-D1',
    branchId: 'daet',
    status: 'completed',
    scheduledDate: dIso(4),
    createdAt: dIso(5),
  });
  store.consultation_appointments.set('APP-D2', {
    id: 'APP-D2',
    branchId: 'daet',
    status: 'completed',
    scheduledDate: dIso(2),
    createdAt: dIso(3),
  });
  store.consultation_appointments.set('APP-D3', {
    id: 'APP-D3',
    branchId: 'daet',
    status: 'cancelled',
    scheduledDate: dIso(1),
    createdAt: dIso(2),
  });
  store.consultation_appointments.set('APP-D4', {
    id: 'APP-D4',
    branchId: 'daet',
    status: 'confirmed', // upcoming/pending
    scheduledDate: dIso(0),
    createdAt: dIso(1),
  });

  // Naga appointments:
  store.consultation_appointments.set('APP-N1', {
    id: 'APP-N1',
    branchId: 'naga',
    status: 'completed',
    scheduledDate: dIso(3),
    createdAt: dIso(4),
  });

  // 4. Workshops & Registrations
  // Daet Workshop (Capacity 20, 15 confirmed, 5 waitlisted)
  store.workshops.set('WS-D1', {
    id: 'WS-D1',
    branchId: 'daet',
    title: 'Daet Herbal Medicine Workshop',
    capacity: 20,
    date: dIso(2),
    createdAt: dIso(7),
  });
  for (let i = 1; i <= 15; i++) {
    store.workshop_registrations.set(`REG-D1-${i}`, {
      id: `REG-D1-${i}`,
      workshopId: 'WS-D1',
      userId: `user-d-${i}`,
      status: 'confirmed',
      createdAt: dIso(5),
    });
  }
  for (let i = 1; i <= 5; i++) {
    store.workshop_registrations.set(`REG-D1-W${i}`, {
      id: `REG-D1-W${i}`,
      workshopId: 'WS-D1',
      userId: `user-w-${i}`,
      status: 'waitlisted',
      createdAt: dIso(4),
    });
  }

  // Naga Workshop (Capacity 10, 8 confirmed, 0 waitlisted)
  store.workshops.set('WS-N1', {
    id: 'WS-N1',
    branchId: 'naga',
    title: 'Naga Organic Farming',
    capacity: 10,
    date: dIso(3),
    createdAt: dIso(8),
  });
  for (let i = 1; i <= 8; i++) {
    store.workshop_registrations.set(`REG-N1-${i}`, {
      id: `REG-N1-${i}`,
      workshopId: 'WS-N1',
      userId: `user-n-${i}`,
      status: 'confirmed',
      createdAt: dIso(4),
    });
  }

  // 5. Support Tickets (RA 11967)
  // Daet: 2 resolved in 24h (within SLA), 1 resolved in 60h (breached SLA), 1 open created 10h ago (within SLA)
  store.support_tickets.set('TICK-D1', {
    id: 'TICK-D1',
    branchId: 'daet',
    status: 'resolved',
    createdAt: dIso(4, 0),
    resolvedAt: dIso(3, 0), // 24 hours
  });
  store.support_tickets.set('TICK-D2', {
    id: 'TICK-D2',
    branchId: 'daet',
    status: 'resolved',
    createdAt: dIso(3, 0),
    resolvedAt: dIso(2, 12), // 12 hours
  });
  store.support_tickets.set('TICK-D3', {
    id: 'TICK-D3',
    branchId: 'daet',
    status: 'resolved',
    createdAt: dIso(6, 0),
    resolvedAt: dIso(3, 12), // 60 hours -> SLA breach
  });
  store.support_tickets.set('TICK-D4', {
    id: 'TICK-D4',
    branchId: 'daet',
    status: 'open',
    createdAt: dIso(0, 10), // 10 hours ago -> Not breached
  });

  // Naga: 1 resolved in 20h
  store.support_tickets.set('TICK-N1', {
    id: 'TICK-N1',
    branchId: 'naga',
    status: 'resolved',
    createdAt: dIso(2, 0),
    resolvedAt: dIso(1, 4), // 20 hours
  });

  // 6. Inventory, Transfers & Batches
  // Daet Inventory: 3 SKUs (1 stockout risk <= ROP, 2 healthy)
  store.inventory.set('daet_SKU-001', {
    id: 'daet_SKU-001',
    branchId: 'daet',
    skuId: 'SKU-001',
    stockCount: 10,
    rop: 20, // Risk!
  });
  store.inventory.set('daet_SKU-002', {
    id: 'daet_SKU-002',
    branchId: 'daet',
    skuId: 'SKU-002',
    stockCount: 150,
    rop: 30, // Healthy
  });
  store.inventory.set('daet_SKU-003', {
    id: 'daet_SKU-003',
    branchId: 'daet',
    skuId: 'SKU-003',
    stockCount: 80,
    rop: 25, // Healthy
  });

  // Naga Inventory: 2 SKUs
  store.inventory.set('naga_SKU-001', {
    id: 'naga_SKU-001',
    branchId: 'naga',
    skuId: 'SKU-001',
    stockCount: 5,
    rop: 15, // Risk!
  });
  store.inventory.set('naga_SKU-002', {
    id: 'naga_SKU-002',
    branchId: 'naga',
    skuId: 'SKU-002',
    stockCount: 100,
    rop: 20, // Healthy
  });

  // Transfers: 1 in_transit between Daet and Naga (50 units)
  store.inventory_transfers.set('TRF-001', {
    id: 'TRF-001',
    sourceBranchId: 'daet',
    destinationBranchId: 'naga',
    status: 'in_transit',
    quantity: 50,
  });
  store.inventory_transfers.set('TRF-002', {
    id: 'TRF-002',
    sourceBranchId: 'daet',
    destinationBranchId: 'legazpi',
    status: 'completed',
    quantity: 30,
  });

  // Batches: 1 quarantined in Daet (25 units), 1 expired in Naga (10 units)
  store.product_batches.set('BATCH-D1', {
    id: 'BATCH-D1',
    branchId: 'daet',
    status: 'quarantine',
    quantity: 25,
  });
  store.product_batches.set('BATCH-N1', {
    id: 'BATCH-N1',
    branchId: 'naga',
    status: 'expired',
    quantity: 10,
  });
  store.product_batches.set('BATCH-D2', {
    id: 'BATCH-D2',
    branchId: 'daet',
    status: 'available',
    quantity: 200,
  });

  const mockDb: any = {
    collection: (colName: string) => {
      if (!store[colName]) store[colName] = new Map();
      const colMap = store[colName];

      return {
        get: async () => {
          const docs = Array.from(colMap.values()).map((data) => ({
            id: data.id || data.uid,
            data: () => data,
            exists: true,
            ref: { id: data.id || data.uid, set: (d: any, o?: any) => colMap.set(data.id || data.uid, o?.merge ? { ...data, ...d } : d) },
          }));
          return {
            empty: docs.length === 0,
            docs,
            forEach: (cb: any) => docs.forEach(cb),
          };
        },
        doc: (docId: string) => {
          const docRef = {
            id: docId,
            get: async () => {
              const data = colMap.get(docId);
              return {
                id: docId,
                exists: !!data,
                data: () => data,
                ref: docRef,
              };
            },
            set: async (data: any, options?: any) => {
              if (options && options.merge) {
                const existing = colMap.get(docId) || {};
                colMap.set(docId, { ...existing, ...data });
              } else {
                colMap.set(docId, data);
              }
            },
            update: async (data: any) => {
              const existing = colMap.get(docId) || {};
              colMap.set(docId, { ...existing, ...data });
            },
            delete: async () => {
              colMap.delete(docId);
            },
          };
          return docRef;
        },
        where: (field: string, op: string, val: any) => {
          return {
            get: async () => {
              const results: any[] = [];
              for (const item of colMap.values()) {
                if (item[field] === val) {
                  results.push({
                    id: item.id || item.uid,
                    data: () => item,
                    ref: mockDb.collection(colName).doc(item.id || item.uid),
                  });
                }
              }
              return {
                empty: results.length === 0,
                docs: results,
                forEach: (cb: any) => results.forEach(cb),
              };
            },
          };
        },
      };
    },
  };

  return { mockDb, store };
}

async function runTests() {
  const { mockDb, store } = createC4MockDb();

  const superAdminUser = { uid: 'demo-admin-uid', role: 'super_admin', email: 'admin@hcicmd.ph' };
  const regionalDirectorUser = { uid: 'demo-director-uid', role: 'regional_director', email: 'director@hcicmd.ph' };
  const daetManagerUser = { uid: 'demo-manager-daet-uid', role: 'branch_manager', assignedBranchId: 'daet', email: 'manager.daet@hcicmd.ph' };
  const nagaManagerUser = { uid: 'demo-manager-naga-uid', role: 'branch_manager', assignedBranchId: 'naga', email: 'manager.naga@hcicmd.ph' };

  console.log('\n--- Test Group 1: Core KPI Engine Calculations & Pillar Accuracy ---');

  // 1.1 Daet KPIs Calculation
  const daetKpis = await calculateOperationalKpis(mockDb, daetManagerUser, { branchId: 'daet' });
  assert(daetKpis.branchId === 'daet', '1.1.1 Daet branch scope correctly assigned');
  // E-Commerce: GMV = 1500 (D1) + 2500 (D2) + 3000 (D4) = 7000. Completed orders = 2. Refunded = 1 (1000). Total orders = 4.
  assert(daetKpis.ecommerce.totalOrders === 4, '1.1.2 Daet total orders equals 4');
  assert(daetKpis.ecommerce.completedOrders === 2, '1.1.3 Daet completed orders equals 2');
  assert(daetKpis.ecommerce.gmv === 7000, '1.1.4 Daet GMV equals ₱7,000.00');
  assert(daetKpis.ecommerce.aov === 3500, '1.1.5 Daet AOV equals ₱3,500.00 (GMV / completed orders)');
  assert(daetKpis.ecommerce.refundedOrders === 1, '1.1.6 Daet refunded orders count equals 1');
  assert(daetKpis.ecommerce.refundedAmount === 1000, '1.1.7 Daet refunded amount equals ₱1,000.00');
  assert(daetKpis.ecommerce.refundRate === 0.25, '1.1.8 Daet refund rate equals 25% (1/4)');

  // Consultations: Total = 4, Completed = 2, Cancelled = 1. Attendance = 2 / (4 - 1) = 2/3 = 0.6667. Utilization = 2/4 = 0.5.
  assert(daetKpis.consultations.totalBookings === 4, '1.1.9 Daet consultation bookings equals 4');
  assert(daetKpis.consultations.completed === 2, '1.1.10 Daet consultation completed equals 2');
  assert(daetKpis.consultations.cancelled === 1, '1.1.11 Daet consultation cancelled equals 1');
  assert(daetKpis.consultations.attendanceRate === 0.6667, '1.1.12 Daet consultation attendance rate equals 66.67%');
  assert(daetKpis.consultations.utilizationRate === 0.5, '1.1.13 Daet consultation utilization rate equals 50.00%');

  // Workshops: WS-D1 (capacity 20, 20 registrations total: 15 confirmed + 5 waitlisted). Capacity utilization = min(1.0, 20/20) = 1.0. Waitlist pressure = 5/20 = 0.25.
  assert(daetKpis.workshops.totalWorkshops === 1, '1.1.14 Daet workshop count equals 1');
  assert(daetKpis.workshops.totalCapacity === 20, '1.1.15 Daet workshop seat capacity equals 20');
  assert(daetKpis.workshops.totalRegistrations === 20, '1.1.16 Daet workshop registrations count equals 20');
  assert(daetKpis.workshops.capacityUtilization === 1.0, '1.1.17 Daet workshop capacity utilization equals 100%');
  assert(daetKpis.workshops.waitlistCount === 5, '1.1.18 Daet workshop waitlist count equals 5');
  assert(daetKpis.workshops.waitlistPressure === 0.25, '1.1.19 Daet workshop waitlist pressure equals 25%');

  // Support / SLA (RA 11967): 4 tickets (3 resolved, 1 open). Resolution times: 24h, 12h, 60h -> Avg = (24+12+60)/3 = 32.0 hrs. Breaches = 1 (the 60h ticket). SLA compliance = (4 - 1)/4 = 75%.
  assert(daetKpis.support.totalTickets === 4, '1.1.20 Daet support total tickets equals 4');
  assert(daetKpis.support.resolvedTickets === 3, '1.1.21 Daet support resolved tickets equals 3');
  assert(daetKpis.support.openTickets === 1, '1.1.22 Daet support open tickets equals 1');
  assert(daetKpis.support.slaBreachedTickets === 1, '1.1.23 Daet support SLA breaches equals 1');
  assert(daetKpis.support.slaComplianceRate === 0.75, '1.1.24 Daet support SLA compliance equals 75%');
  assert(daetKpis.support.avgResolutionHours === 32.0, '1.1.25 Daet average resolution time equals 32.0 hrs');

  // Inventory: 3 SKUs total, 1 stockout risk (SKU-001 <= 20), 2 healthy. Transfers in-transit = 50. Quarantine units = 25.
  assert(daetKpis.inventory.totalSkus === 3, '1.1.26 Daet total SKUs equals 3');
  assert(daetKpis.inventory.stockoutRiskSkusCount === 1, '1.1.27 Daet stockout-risk SKUs count equals 1');
  assert(daetKpis.inventory.healthySkusCount === 2, '1.1.28 Daet healthy SKUs count equals 2');
  assert(daetKpis.inventory.transferInTransitVolume === 50, '1.1.29 Daet in-transit transfer volume equals 50 units');
  assert(daetKpis.inventory.quarantineHoldUnits === 25, '1.1.30 Daet quarantine hold units equals 25 units');

  console.log('\n--- Test Group 2: Regional Consolidation (All Branches) ---');
  const regionalKpis = await calculateOperationalKpis(mockDb, superAdminUser, { branchId: 'all' });
  assert(regionalKpis.branchId === 'all', '2.1 Regional scope set to ALL');
  // E-Commerce: Daet (4 orders, 7000 GMV) + Naga (2 orders, 7000 GMV) = 6 orders, 14000 GMV, 4 completed orders.
  assert(regionalKpis.ecommerce.totalOrders === 6, '2.2 Consolidated total orders equals 6');
  assert(regionalKpis.ecommerce.completedOrders === 4, '2.3 Consolidated completed orders equals 4');
  assert(regionalKpis.ecommerce.gmv === 14000, '2.4 Consolidated GMV equals ₱14,000.00');
  assert(regionalKpis.ecommerce.aov === 3500, '2.5 Consolidated AOV equals ₱3,500.00');
  // Consultations: Daet (4 bookings, 2 completed) + Naga (1 booking, 1 completed) = 5 bookings, 3 completed.
  assert(regionalKpis.consultations.totalBookings === 5, '2.6 Consolidated consultation bookings equals 5');
  assert(regionalKpis.consultations.completed === 3, '2.7 Consolidated completed consultations equals 3');
  // Workshops: Daet (1 ws, cap 20) + Naga (1 ws, cap 10) = 2 workshops, 30 capacity, 28 registrations.
  assert(regionalKpis.workshops.totalWorkshops === 2, '2.8 Consolidated workshops count equals 2');
  assert(regionalKpis.workshops.totalCapacity === 30, '2.9 Consolidated workshop capacity equals 30');
  assert(regionalKpis.workshops.totalRegistrations === 28, '2.10 Consolidated workshop registrations equals 28');
  // Inventory: Daet (3 SKUs, 1 risk) + Naga (2 SKUs, 1 risk) = 5 SKUs, 2 risk. Quarantine = 25 (Daet) + 10 (Naga) = 35.
  assert(regionalKpis.inventory.totalSkus === 5, '2.11 Consolidated tracked SKUs equals 5');
  assert(regionalKpis.inventory.stockoutRiskSkusCount === 2, '2.12 Consolidated stockout-risk SKUs equals 2');
  assert(regionalKpis.inventory.quarantineHoldUnits === 35, '2.13 Consolidated quarantine hold units equals 35');

  console.log('\n--- Test Group 3: Date Range Boundaries & Filtering ---');
  const testNow = new Date();
  const fourDaysAgoIso = new Date(testNow.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const todayIso = testNow.toISOString().slice(0, 10);

  const dateFilteredKpis = await calculateOperationalKpis(mockDb, superAdminUser, {
    branchId: 'naga',
    startDate: fourDaysAgoIso,
    endDate: todayIso,
  });
  // Naga total orders was 2, but ORD-N2 was 10 days ago -> only ORD-N1 matches
  assert(dateFilteredKpis.ecommerce.totalOrders === 1, '3.1 Naga date filtered orders equals 1');
  assert(dateFilteredKpis.ecommerce.gmv === 5000, '3.2 Naga date filtered GMV equals ₱5,000.00');

  console.log('\n--- Test Group 4: Empty Data & Zero Safety Handling ---');
  const emptyStoreDb: any = {
    collection: () => ({
      get: async () => ({ docs: [], empty: true, forEach: () => {} }),
      doc: () => ({ get: async () => ({ exists: false, data: () => null }) }),
      where: () => ({ get: async () => ({ docs: [], empty: true, forEach: () => {} }) }),
    }),
  };

  const emptyKpis = await calculateOperationalKpis(emptyStoreDb, superAdminUser, { branchId: 'all' });
  assert(emptyKpis.ecommerce.gmv === 0, '4.1 Empty GMV equals 0');
  assert(emptyKpis.ecommerce.aov === 0, '4.2 Empty AOV safely defaults to 0 (no NaN)');
  assert(emptyKpis.ecommerce.refundRate === 0, '4.3 Empty refund rate equals 0');
  assert(emptyKpis.consultations.attendanceRate === 0, '4.4 Empty consultation attendance rate equals 0');
  assert(emptyKpis.consultations.utilizationRate === 0, '4.5 Empty consultation utilization rate equals 0');
  assert(emptyKpis.workshops.capacityUtilization === 0, '4.6 Empty workshop capacity utilization equals 0');
  assert(emptyKpis.workshops.waitlistPressure === 0, '4.7 Empty workshop waitlist pressure equals 0');
  assert(emptyKpis.support.slaComplianceRate === 1.0, '4.8 Empty support tickets safely defaults to 1.0 SLA compliance');
  assert(emptyKpis.support.avgResolutionHours === 0, '4.9 Empty support resolution time equals 0');
  assert(emptyKpis.inventory.totalSkus === 0, '4.10 Empty inventory total SKUs equals 0');

  console.log('\n--- Test Group 5: HTTP REST Endpoints & RBAC Isolation ---');
  const app = createExpressApp({ db: mockDb });
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const superAdminToken = 'DEMO_TOKEN_super_admin';
  const regionalDirectorToken = 'DEMO_TOKEN_regional_director';
  const daetManagerToken = 'DEMO_TOKEN_branch_manager_daet';
  const nagaManagerToken = 'DEMO_TOKEN_branch_manager_naga';
  const customerToken = 'DEMO_TOKEN_customer';

  // 5.1 Unauthenticated request blocked
  const unauthRes = await fetch(`${baseUrl}/api/analytics/operational-kpis`);
  assert(unauthRes.status === 401, '5.1 Unauthenticated request rejected with HTTP 401');

  // 5.2 Customer request blocked
  const custRes = await fetch(`${baseUrl}/api/analytics/operational-kpis`, {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert(custRes.status === 403, '5.2 Customer request rejected with HTTP 403 Forbidden');

  // 5.3 Super Admin allowed for all branches
  const adminRes = await fetch(`${baseUrl}/api/analytics/operational-kpis?branchId=all`, {
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });
  const adminData: any = await adminRes.json();
  assert(adminRes.status === 200, '5.3.1 Super admin request succeeds with HTTP 200');
  assert(adminData.success === true, '5.3.2 Success flag is true in admin response');
  assert(adminData.kpis.branchId === 'all', '5.3.3 Returned branch scope is "all"');

  // 5.4 Regional Director allowed for specific branch
  const rdRes = await fetch(`${baseUrl}/api/analytics/operational-kpis?branchId=naga`, {
    headers: { Authorization: `Bearer ${regionalDirectorToken}` },
  });
  const rdData: any = await rdRes.json();
  assert(rdRes.status === 200, '5.4.1 Regional Director request succeeds with HTTP 200');
  assert(rdData.kpis.branchId === 'naga', '5.4.2 Returned branch scope is "naga"');

  // 5.5 Branch Manager allowed for assigned branch (Daet)
  const daetRes = await fetch(`${baseUrl}/api/analytics/operational-kpis?branchId=daet`, {
    headers: { Authorization: `Bearer ${daetManagerToken}` },
  });
  const daetData: any = await daetRes.json();
  assert(daetRes.status === 200, '5.5.1 Daet Branch Manager succeeds for Daet branch');
  assert(daetData.kpis.branchId === 'daet', '5.5.2 Returned branch is "daet"');

  // 5.6 Branch Manager blocked when attempting cross-branch access (Daet manager -> Naga)
  const crossBranchRes = await fetch(`${baseUrl}/api/analytics/operational-kpis?branchId=naga`, {
    headers: { Authorization: `Bearer ${daetManagerToken}` },
  });
  assert(crossBranchRes.status === 403, '5.6 Daet Branch Manager blocked from accessing Naga branch (HTTP 403)');

  console.log('\n--- Test Group 6: Export Engine (CSV & JSON) & PII Protection ---');

  // 6.1 JSON Export
  const jsonExportRes = await fetch(`${baseUrl}/api/analytics/export?format=json&branchId=daet`, {
    headers: { Authorization: `Bearer ${daetManagerToken}` },
  });
  const jsonExportData: any = await jsonExportRes.json();
  assert(jsonExportRes.status === 200, '6.1.1 JSON export succeeds with HTTP 200');
  assert(jsonExportData.success === true, '6.1.2 JSON export contains success flag');
  assert(jsonExportData.metadata.scope === 'daet', '6.1.3 JSON export metadata contains correct scope');
  assert(jsonExportData.kpis.ecommerce.gmv === 7000, '6.1.4 JSON export contains verified GMV');

  // 6.2 CSV Export
  const csvExportRes = await fetch(`${baseUrl}/api/analytics/export?format=csv&branchId=daet`, {
    headers: { Authorization: `Bearer ${daetManagerToken}` },
  });
  assert(csvExportRes.status === 200, '6.2.1 CSV export succeeds with HTTP 200');
  assert(csvExportRes.headers.get('content-type')?.includes('text/csv') || false, '6.2.2 Content-Type header is text/csv');
  assert(csvExportRes.headers.get('content-disposition')?.includes('attachment') || false, '6.2.3 Content-Disposition is attachment');

  const csvText = await csvExportRes.text();
  assert(csvText.includes('Metric Group'), '6.2.4 CSV contains header row');
  assert(csvText.includes('Gross Merchandise Value (GMV)'), '6.2.5 CSV contains GMV metric row');
  assert(csvText.includes('7000.00'), '6.2.6 CSV contains correct formatted value (7000.00)');
  assert(csvText.includes('Consultations'), '6.2.7 CSV contains Consultations section');
  assert(csvText.includes('Support'), '6.2.8 CSV contains Support section');
  assert(csvText.includes('Stockout Risk SKUs'), '6.2.9 CSV contains Stockout Risk SKUs');

  // 6.3 PII Sanitization Check in Export
  assert(!csvText.includes('@example.com'), '6.3.1 CSV export does not contain customer emails');
  assert(!csvText.includes('+639'), '6.3.2 CSV export does not contain customer phone numbers');
  assert(!JSON.stringify(jsonExportData.kpis).includes('@example.com'), '6.3.3 JSON export KPIs does not contain customer emails');

  // 6.4 Export RBAC Enforcement
  const exportCrossRes = await fetch(`${baseUrl}/api/analytics/export?format=json&branchId=naga`, {
    headers: { Authorization: `Bearer ${daetManagerToken}` },
  });
  assert(exportCrossRes.status === 403, '6.4.1 Cross-branch export attempt blocked with HTTP 403');

  const custExportRes = await fetch(`${baseUrl}/api/analytics/export?format=csv`, {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert(custExportRes.status === 403, '6.4.2 Customer export attempt blocked with HTTP 403');

  // 6.5 Direct CSV generator test
  const directCsv = generateOperationalKpisCsv(daetKpis);
  assert(typeof directCsv === 'string' && directCsv.length > 100, '6.5.1 generateOperationalKpisCsv produces non-empty string');
  assert(directCsv.includes('"E-Commerce","Gross Merchandise Value (GMV)","7000.00"'), '6.5.2 generateOperationalKpisCsv correctly escapes and formats lines');

  console.log('\n--- Test Group 7: Determinism & Audit Logging ---');

  // Verify Audit Log entries were created
  const auditSnap = await mockDb.collection('audit_logs').get();
  const auditEntries: any[] = [];
  auditSnap.forEach((d: any) => auditEntries.push(d.data()));

  const kpiAudit = auditEntries.find((a) => a.action === 'operational_kpis_viewed');
  const exportAudit = auditEntries.find((a) => a.action === 'operational_kpis_exported');
  assert(!!kpiAudit, '7.1 Audit log recorded operational_kpis_viewed');
  assert(!!exportAudit, '7.2 Audit log recorded operational_kpis_exported');

  server.close();

  console.log('\n========================================================================');
  console.log(`Priority C4 Test Results: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('========================================================================');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
