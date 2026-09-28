// server.ts
import express from "express";
import { createServer as createViteServer } from "vite";
import { KeyManagementServiceClient } from "@google-cloud/kms";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { initializeApp, getApps } from "firebase-admin/app";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var SENSITIVE_LOG_KEYS = [
  "token",
  "authorization",
  "password",
  "secret",
  "hmac",
  "kms",
  "key",
  "ciphertext",
  "clinical",
  "intake",
  "dietary",
  "water",
  "condition",
  "card",
  "cvv",
  "ssn",
  "bearer"
];
function sanitizeLogMeta(obj) {
  const clean = {};
  for (const [key, val] of Object.entries(obj)) {
    const lower = key.toLowerCase();
    if (SENSITIVE_LOG_KEYS.some((s) => lower.includes(s))) {
      clean[key] = "[REDACTED]";
      continue;
    }
    if (val && typeof val === "object" && !Array.isArray(val)) {
      clean[key] = sanitizeLogMeta(val);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}
var logger = {
  info(message, meta = {}) {
    const logEntry = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      level: "info",
      message,
      ...sanitizeLogMeta(meta)
    };
    console.log(JSON.stringify(logEntry));
  },
  warn(message, meta = {}) {
    const logEntry = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      level: "warn",
      message,
      ...sanitizeLogMeta(meta)
    };
    console.warn(JSON.stringify(logEntry));
  },
  error(message, meta = {}) {
    const logEntry = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      level: "error",
      message,
      ...sanitizeLogMeta(meta)
    };
    console.error(JSON.stringify(logEntry));
  }
};
if (getApps().length === 0) {
  initializeApp({
    projectId: "ai-studio-cmddigitalcommer-8d70f45b-1636-42ba-9e2d-f063a7b0e086"
  });
}
var PRODUCTS_CATALOG = {
  "hci-cmd-65ml": { price: 1200, name: "HCI Cell Mineral Drops (CMD) \u2014 65 mL Flagship Bottle", volume: "65 mL" },
  "hci-cmd-30ml": { price: 650, name: "HCI Cell Mineral Drops (CMD) \u2014 30 mL Compact Dropper", volume: "30 mL" }
};
var CONSULTATION_SERVICES = {
  "CNS-IN-PERSON": {
    code: "CNS-IN-PERSON",
    title: "In-Branch Wellness & Mineral Nutrition Assessment",
    durationMinutes: 45,
    deliveryMode: "in_person",
    description: "Comprehensive face-to-face holistic assessment, hydration evaluation, and cellular mineral nutrition education in a private wellness room.",
    supportedBranches: ["daet", "labo", "capalonga"],
    feeStatus: "FEE_PENDING_BUSINESS_CONFIRMATION",
    feeDisplay: "Professional Consultation Fee: Pending Business Confirmation",
    nonMedicalDisclaimer: "MAHALAGANG PAALALA: This wellness assessment is nutritional education and does not constitute medical diagnosis or prescription under RA 2382."
  },
  "CNS-VIRTUAL": {
    code: "CNS-VIRTUAL",
    title: "Virtual Tele-Wellness & Hydration Consultation",
    durationMinutes: 30,
    deliveryMode: "virtual",
    description: "Secure interactive video wellness session for clients across Camarines Norte and regional Bicol on proper mineral dilution protocols and lifestyle vitality.",
    supportedBranches: ["daet", "labo", "paracale", "jose_panganiban", "capalonga", "santa_elena"],
    feeStatus: "FEE_PENDING_BUSINESS_CONFIRMATION",
    feeDisplay: "Virtual Consultation Fee: Pending Business Confirmation",
    nonMedicalDisclaimer: "MAHALAGANG PAALALA: Holistic wellness session only; does not replace medical consultation with a licensed physician."
  },
  "CNS-FOLLOWUP": {
    code: "CNS-FOLLOWUP",
    title: "Follow-Up Progress Review & Routine Calibration",
    durationMinutes: 20,
    deliveryMode: "virtual",
    description: "Targeted follow-up session to review hydration routines, daily electrolyte tolerance, and general energy progress.",
    supportedBranches: ["daet", "labo", "paracale", "jose_panganiban", "capalonga", "santa_elena"],
    feeStatus: "FEE_PENDING_BUSINESS_CONFIRMATION",
    feeDisplay: "Follow-up Review Fee: Pending Business Confirmation",
    nonMedicalDisclaimer: "MAHALAGANG PAALALA: Progress review for nutritional education purposes only."
  }
};
var PRACTITIONER_ROSTER = {
  "practitioner-daet-01": {
    id: "practitioner-daet-01",
    uid: "practitioner-daet-01",
    name: "Dr. Elena Santos, ND (Candidate / Holistic Educator)",
    title: "Senior Naturopathic Educator & Mineral Nutrition Specialist",
    bio: "Dedicated wellness advocate specializing in trace mineral assimilation, cellular hydration balance, and Bicolano traditional dietary wellness.",
    credentialsStatus: "CREDENTIALS_PENDING_BUSINESS_CONFIRMATION",
    certifications: ["Certified Holistic Nutrition Consultant (Pending Verification)", "Lifestyle Wellness Coach"],
    languages: ["Bikol (Camarines Norte)", "Tagalog", "English"],
    assignedBranches: ["daet", "labo"],
    isAvailableForVirtual: true
  },
  "practitioner-labo-02": {
    id: "practitioner-labo-02",
    uid: "practitioner-labo-02",
    name: "Gabriel Reyes, CWC",
    title: "Certified Wellness Coach & Electrolyte Hydration Advisor",
    bio: "Focuses on workplace hydration ergonomics, mineral deficiency education, and family lifestyle vitality across northern Camarines Norte.",
    credentialsStatus: "CREDENTIALS_PENDING_BUSINESS_CONFIRMATION",
    certifications: ["Certified Wellness Coach", "Community Health Educator"],
    languages: ["Tagalog", "English", "Bikol"],
    assignedBranches: ["labo", "capalonga"],
    isAvailableForVirtual: true
  }
};
function getHmacSecret() {
  if (process.env.HMAC_SECRET && process.env.HMAC_SECRET.trim().length > 0) {
    return process.env.HMAC_SECRET.trim();
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("FATAL SECURITY ERROR: HMAC_SECRET environment variable is missing in production. System failing closed.");
  }
  if (process.env.NODE_ENV === "test") {
    return "TEST_ENVIRONMENT_ONLY_HMAC_SECRET_NON_PRODUCTION_0123456789";
  }
  return "DEV_ENVIRONMENT_ONLY_HMAC_SECRET_NON_PRODUCTION_FALLBACK";
}
var SEED_WORKSHOPS = [
  {
    id: "wk-01-daet",
    title: "Daet Trace Mineral Science & Hydration Seminar",
    description: "Learn the molecular difference between tap water and mineral-rich ionic electrolytes. Interactive live dilution demos.",
    branchId: "daet",
    scheduledDate: "2026-10-15",
    scheduledTime: "14:00",
    capacity: 3,
    // Set to low capacity to test waitlist transition cleanly
    seatsAllocated: 0,
    waitlistCount: 0,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "wk-02-labo",
    title: "Labo Community Wellness & Soil Mineral Depletion Workshop",
    description: "Why modern agricultural fruits and vegetables are missing vital trace minerals. Educational guide on CMD supplementation.",
    branchId: "labo",
    scheduledDate: "2026-10-22",
    scheduledTime: "10:00",
    capacity: 25,
    seatsAllocated: 0,
    waitlistCount: 0,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "wk-03-capalonga",
    title: "Capalonga Coastal Electrolyte Balance Symposium",
    description: "Hydration wellness education specifically tailored for coastal, fishing, and high-exertion communities.",
    branchId: "capalonga",
    scheduledDate: "2026-10-29",
    scheduledTime: "13:00",
    capacity: 30,
    seatsAllocated: 0,
    waitlistCount: 0,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  }
];
function generateRegistrationSignature(registrationId, userId, workshopId, status) {
  const secret = getHmacSecret();
  const payload = `${registrationId}:${userId}:${workshopId}:${status}`;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}
function verifyRegistrationSignature(registrationId, userId, workshopId, status, signature) {
  const expected = generateRegistrationSignature(registrationId, userId, workshopId, status);
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature, "utf8"), Buffer.from(expected, "utf8"));
}
var RA11967_SLA_DAYS = 7;
var RA11967_SLA_MS = RA11967_SLA_DAYS * 24 * 60 * 60 * 1e3;
var VALID_TICKET_CATEGORIES = [
  "damaged_product",
  "delivery_delay",
  "billing_issue",
  "product_inquiry",
  "statutory_dpa_inquiry",
  "wrong_item",
  "cancellation_refund"
];
var SUPPORTED_BRANCH_IDS = [
  "daet",
  "labo",
  "capalonga",
  "paracale",
  "jose_panganiban",
  "santa_elena"
];
var VALID_TICKET_STATUSES = [
  "submitted",
  "under_investigation",
  "escalated_sla_breach",
  "resolved",
  "closed"
];
function evaluateSlaEscalation(ticket) {
  if (ticket.status !== "resolved" && ticket.status !== "closed" && !ticket.isEscalated) {
    const due = Date.parse(ticket.slaDueAt);
    if (!isNaN(due) && Date.now() > due) {
      ticket.isEscalated = true;
      const prev = ticket.status;
      ticket.status = "escalated_sla_breach";
      ticket.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      if (!Array.isArray(ticket.escalationHistory)) {
        ticket.escalationHistory = [];
      }
      ticket.escalationHistory.push({
        escalatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        reason: "Statutory 7-day internal dispute resolution SLA expired under RA 11967.",
        previousStatus: prev
      });
      return true;
    }
  }
  return false;
}
var CRM_COHORTS = {
  wholesale_stockist: {
    key: "wholesale_stockist",
    label: "Wholesale / Stockist",
    description: "High-volume commercial accounts and distribution partners with cumulative spend >= \u20B15,000 or bulk order volume."
  },
  repeat_retail: {
    key: "repeat_retail",
    label: "Repeat Retail",
    description: "Committed direct consumers who have completed 2 or more retail mineral orders."
  },
  wellness_seminar_attendees: {
    key: "wellness_seminar_attendees",
    label: "Wellness Seminar Attendees",
    description: "Participants verified as having attended one or more provincial hydration symposia or wellness seminars."
  },
  replenishment_due: {
    key: "replenishment_due",
    label: "Replenishment Due",
    description: "Accounts approaching end of 30-day bottle cycle (last order placed between 21 and 45 days ago)."
  },
  lapsed_accounts: {
    key: "lapsed_accounts",
    label: "Lapsed Accounts",
    description: "Previous purchasers with no order activity for more than 45 days."
  }
};
function getAuthoritativeRegistrationBranch(reg) {
  if (!reg || typeof reg !== "object") return void 0;
  const foundBranches = /* @__PURE__ */ new Set();
  if (typeof reg.branchId === "string" && reg.branchId.trim().length > 0) {
    foundBranches.add(reg.branchId.trim().toLowerCase());
  }
  if (typeof reg.workshopBranch === "string" && reg.workshopBranch.trim().length > 0) {
    foundBranches.add(reg.workshopBranch.trim().toLowerCase());
  }
  if (typeof reg.workshopId === "string" && reg.workshopId.trim().length > 0) {
    const known = SEED_WORKSHOPS.find((w) => w.id === reg.workshopId.trim());
    if (known && typeof known.branchId === "string" && known.branchId.trim().length > 0) {
      foundBranches.add(known.branchId.trim().toLowerCase());
    }
  }
  if (foundBranches.size !== 1) {
    return void 0;
  }
  return Array.from(foundBranches)[0];
}
function aggregateCustomerCrmProfiles(data, branchFilter, nowMs = Date.now()) {
  const normalizedBranch = branchFilter ? branchFilter.trim().toLowerCase() : null;
  const ordersByUser = /* @__PURE__ */ new Map();
  for (const ord of data.orders) {
    if (!ord.userId) continue;
    if (normalizedBranch && (typeof ord.branchId !== "string" || ord.branchId.toLowerCase() !== normalizedBranch)) continue;
    const list = ordersByUser.get(ord.userId) || [];
    list.push(ord);
    ordersByUser.set(ord.userId, list);
  }
  const attendanceByUser = /* @__PURE__ */ new Map();
  for (const reg of data.registrations) {
    if (!reg.userId) continue;
    if (normalizedBranch) {
      const regBranch = getAuthoritativeRegistrationBranch(reg);
      if (!regBranch || regBranch !== normalizedBranch) continue;
    }
    if (reg.status === "attended") {
      attendanceByUser.set(reg.userId, (attendanceByUser.get(reg.userId) || 0) + 1);
    }
  }
  const userMap = /* @__PURE__ */ new Map();
  for (const u of data.users) {
    if (u.uid) userMap.set(u.uid, u);
  }
  const candidateUserIds = /* @__PURE__ */ new Set();
  for (const uid of ordersByUser.keys()) {
    candidateUserIds.add(uid);
  }
  if (normalizedBranch) {
    for (const [uid, u] of userMap.entries()) {
      if (typeof u.assignedBranchId === "string" && u.assignedBranchId.toLowerCase() === normalizedBranch && u.role === "customer") {
        candidateUserIds.add(uid);
      }
    }
    for (const reg of data.registrations) {
      if (!reg.userId) continue;
      const regBranch = getAuthoritativeRegistrationBranch(reg);
      if (regBranch && regBranch === normalizedBranch && reg.status === "attended") {
        candidateUserIds.add(reg.userId);
      }
    }
  } else {
    for (const [uid, u] of userMap.entries()) {
      if (u.role === "customer") {
        candidateUserIds.add(uid);
      }
    }
  }
  const results = [];
  for (const userId of candidateUserIds) {
    const user = userMap.get(userId);
    const userOrders = ordersByUser.get(userId) || [];
    const workshopCount = attendanceByUser.get(userId) || 0;
    let totalSpent = 0;
    let maxOrderSpend = 0;
    let totalUnits = 0;
    let latestOrderMs = 0;
    let primaryBranch = branchFilter || user?.assignedBranchId || "daet";
    for (const ord of userOrders) {
      if (ord.fulfillmentStatus === "cancelled") continue;
      const spend = Number(ord.grandTotal) || 0;
      totalSpent += spend;
      if (spend > maxOrderSpend) maxOrderSpend = spend;
      if (ord.branchId) primaryBranch = ord.branchId;
      if (Array.isArray(ord.items)) {
        for (const it of ord.items) {
          totalUnits += Number(it.quantity) || 1;
        }
      }
      const ordTime = Date.parse(ord.createdAt);
      if (!isNaN(ordTime) && ordTime > latestOrderMs) {
        latestOrderMs = ordTime;
      }
    }
    const totalOrders = userOrders.filter((o) => o.fulfillmentStatus !== "cancelled").length;
    const lastOrderDate = latestOrderMs > 0 ? new Date(latestOrderMs).toISOString() : void 0;
    const daysSinceLastOrder = latestOrderMs > 0 ? Math.floor((nowMs - latestOrderMs) / (24 * 60 * 60 * 1e3)) : void 0;
    const cohorts = [];
    if (totalSpent >= 5e3 || maxOrderSpend >= 5e3 || totalUnits >= 5) {
      cohorts.push("wholesale_stockist");
    }
    if (totalOrders >= 2) {
      cohorts.push("repeat_retail");
    }
    if (workshopCount >= 1) {
      cohorts.push("wellness_seminar_attendees");
    }
    if (daysSinceLastOrder !== void 0 && daysSinceLastOrder >= 21 && daysSinceLastOrder <= 45) {
      cohorts.push("replenishment_due");
    }
    if (daysSinceLastOrder !== void 0 && daysSinceLastOrder > 45) {
      cohorts.push("lapsed_accounts");
    }
    const latestOrder = userOrders[userOrders.length - 1];
    let customerName = "Valued Customer";
    if (user?.firstName || user?.lastName) {
      customerName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    } else if (latestOrder?.customer?.firstName || latestOrder?.customer?.lastName) {
      customerName = `${latestOrder.customer.firstName || ""} ${latestOrder.customer.lastName || ""}`.trim();
    } else if (user?.email) {
      customerName = user.email.split("@")[0];
    }
    const customerEmail = user?.email || latestOrder?.customer?.email || "unregistered@hcicmd.ph";
    const customerPhone = user?.phone || latestOrder?.customer?.phone || void 0;
    results.push({
      userId,
      customerName,
      customerEmail,
      customerPhone,
      branchId: primaryBranch,
      totalOrders,
      totalSpent,
      lastOrderDate,
      daysSinceLastOrder,
      workshopAttendanceCount: workshopCount,
      cohorts
    });
  }
  return results;
}
var EXPENSE_CATEGORIES = [
  "procurement_raw_materials",
  "packaging_bottles_droppers",
  "agricultural_copra_processing",
  "agricultural_rice_milling",
  "branch_rent_utilities",
  "logistics_freight",
  "practitioner_stipends",
  "marketing_symposia",
  "miscellaneous"
];
function parseDateBoundary(dateStr, isEnd = false, tzOffset = "+08:00") {
  if (!dateStr) return isEnd ? Number.MAX_SAFE_INTEGER : 0;
  if (dateStr.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const formattedTz = tzOffset.startsWith("+") || tzOffset.startsWith("-") ? tzOffset : `+${tzOffset}`;
    const isoWithTz = isEnd ? `${dateStr}T23:59:59.999${formattedTz}` : `${dateStr}T00:00:00.000${formattedTz}`;
    const parsed2 = Date.parse(isoWithTz);
    return isNaN(parsed2) ? isEnd ? Number.MAX_SAFE_INTEGER : 0 : parsed2;
  }
  const parsed = Date.parse(dateStr);
  return isNaN(parsed) ? isEnd ? Number.MAX_SAFE_INTEGER : 0 : parsed;
}
function calculateFinancialMetrics(params) {
  const { orders = [], expenses = [], startDate, endDate, branchId } = params;
  const startMs = parseDateBoundary(startDate, false);
  const endMs = parseDateBoundary(endDate, true);
  const filteredExpenses = expenses.filter((exp) => {
    if (branchId && exp.branchId !== branchId) return false;
    const incurredMs = Date.parse(exp.incurredAt || exp.createdAt);
    if (!isNaN(incurredMs)) {
      if (incurredMs < startMs || incurredMs > endMs) return false;
    }
    return true;
  });
  const filteredOrders = orders.filter((ord) => {
    if (ord.fulfillmentStatus === "cancelled" || ord.status === "cancelled" || ord.status === "refunded") return false;
    if (branchId && ord.branchId !== branchId) return false;
    const orderMs = Date.parse(ord.createdAt);
    if (!isNaN(orderMs)) {
      if (orderMs < startMs || orderMs > endMs) return false;
    }
    return true;
  });
  let revenue = 0;
  let cashReceived = 0;
  let accountsReceivable = 0;
  for (const ord of filteredOrders) {
    const total = Number(ord.grandTotal ?? ord.total ?? 0);
    revenue += total;
    if (ord.paymentStatus === "paid") {
      cashReceived += total;
    } else {
      accountsReceivable += total;
    }
  }
  let totalExpensesIncurred = 0;
  let totalExpensesPaid = 0;
  let accountsPayable = 0;
  const expensesByCategory = {
    procurement_raw_materials: 0,
    packaging_bottles_droppers: 0,
    agricultural_copra_processing: 0,
    agricultural_rice_milling: 0,
    branch_rent_utilities: 0,
    logistics_freight: 0,
    practitioner_stipends: 0,
    marketing_symposia: 0,
    miscellaneous: 0
  };
  for (const exp of filteredExpenses) {
    const amount = Number(exp.amount) || 0;
    totalExpensesIncurred += amount;
    if (exp.expenseStatus === "paid") {
      totalExpensesPaid += amount;
    } else {
      accountsPayable += amount;
    }
    if (expensesByCategory[exp.category] !== void 0) {
      expensesByCategory[exp.category] += amount;
    } else {
      expensesByCategory.miscellaneous += amount;
    }
  }
  const cashPaid = totalExpensesPaid;
  const netIncomeAccrual = revenue - totalExpensesIncurred;
  const netCashFlow = cashReceived - cashPaid;
  return {
    dateRange: {
      startDate: startDate || (startMs > 0 ? new Date(startMs).toISOString() : (/* @__PURE__ */ new Date(0)).toISOString()),
      endDate: endDate || (endMs < Number.MAX_SAFE_INTEGER ? new Date(endMs).toISOString() : (/* @__PURE__ */ new Date()).toISOString())
    },
    branchId: branchId || void 0,
    revenue: Math.round(revenue * 100) / 100,
    totalExpensesIncurred: Math.round(totalExpensesIncurred * 100) / 100,
    totalExpensesPaid: Math.round(totalExpensesPaid * 100) / 100,
    netIncomeAccrual: Math.round(netIncomeAccrual * 100) / 100,
    netCashFlow: Math.round(netCashFlow * 100) / 100,
    cashReceived: Math.round(cashReceived * 100) / 100,
    cashPaid: Math.round(cashPaid * 100) / 100,
    accountsReceivable: Math.round(accountsReceivable * 100) / 100,
    accountsPayable: Math.round(accountsPayable * 100) / 100,
    expensesByCategory,
    orderCount: filteredOrders.length,
    expenseCount: filteredExpenses.length
  };
}
function calculateCommodityProfitability(expenses, orders, commodityType, branchId) {
  const relevantExpenses = expenses.filter((exp) => {
    if (branchId && exp.branchId !== branchId) return false;
    const cat = exp.category;
    const isCatMatch = commodityType === "rice" ? cat === "agricultural_rice_milling" || exp.commodityMetadata?.commodityType === "rice" : cat === "agricultural_copra_processing" || exp.commodityMetadata?.commodityType === "copra";
    return isCatMatch;
  });
  let totalVolumeProcuredKg = 0;
  let totalAcquisitionCost = 0;
  let totalProcessingCost = 0;
  for (const exp of relevantExpenses) {
    const meta = exp.commodityMetadata;
    const amt = Number(exp.amount) || 0;
    if (meta && meta.commodityType === commodityType) {
      const vol = Number(meta.volumeKg) || 0;
      const acqCost = Number(meta.acquisitionCostPerKg) ? vol * Number(meta.acquisitionCostPerKg) : amt;
      const procFee = Number(meta.millingOrDryingFee) || 0;
      totalVolumeProcuredKg += vol;
      totalAcquisitionCost += acqCost;
      totalProcessingCost += procFee;
    } else {
      totalProcessingCost += amt;
    }
  }
  const totalCostBasis = totalAcquisitionCost + totalProcessingCost;
  const unitCostPerKg = totalVolumeProcuredKg > 0 ? totalCostBasis / totalVolumeProcuredKg : 0;
  let totalVolumeSoldKg = 0;
  let totalSalesRevenue = 0;
  for (const ord of orders) {
    if (ord.fulfillmentStatus === "cancelled" || ord.status === "cancelled") continue;
    if (branchId && ord.branchId !== branchId) continue;
    if (Array.isArray(ord.items)) {
      for (const item of ord.items) {
        const name = String(item.productName || item.name || "").toLowerCase();
        const sku = String(item.skuId || item.sku || item.id || "").toLowerCase();
        const matchesCommodity = commodityType === "rice" ? name.includes("rice") || sku.includes("rice") : name.includes("copra") || sku.includes("copra") || name.includes("coconut");
        if (matchesCommodity) {
          const qty = Number(item.quantity) || 1;
          const unitPrice = Number(item.unitPrice !== void 0 ? item.unitPrice : item.price) || 0;
          let itemKg = Number(item.volumeKg);
          if (isNaN(itemKg) || itemKg <= 0) {
            if (name.includes("50kg") || name.includes("50 kg") || name.includes("sack")) {
              itemKg = 50 * qty;
            } else if (name.includes("25kg") || name.includes("25 kg")) {
              itemKg = 25 * qty;
            } else if (name.includes("10kg") || name.includes("10 kg")) {
              itemKg = 10 * qty;
            } else if (name.includes("5kg") || name.includes("5 kg")) {
              itemKg = 5 * qty;
            } else {
              itemKg = 1 * qty;
            }
          }
          const revenueFromItem = Number(item.totalPrice !== void 0 ? item.totalPrice : unitPrice * qty);
          totalVolumeSoldKg += itemKg;
          totalSalesRevenue += revenueFromItem;
        }
      }
    }
  }
  const weightedAverageSellingPrice = totalVolumeSoldKg > 0 ? totalSalesRevenue / totalVolumeSoldKg : 0;
  const grossProfit = totalSalesRevenue - unitCostPerKg * totalVolumeSoldKg;
  const grossMarginPercent = totalSalesRevenue > 0 ? grossProfit / totalSalesRevenue * 100 : 0;
  return {
    commodityType,
    totalVolumeProcuredKg: Math.round(totalVolumeProcuredKg * 100) / 100,
    totalAcquisitionCost: Math.round(totalAcquisitionCost * 100) / 100,
    totalProcessingCost: Math.round(totalProcessingCost * 100) / 100,
    totalCostBasis: Math.round(totalCostBasis * 100) / 100,
    totalVolumeSoldKg: Math.round(totalVolumeSoldKg * 100) / 100,
    totalSalesRevenue: Math.round(totalSalesRevenue * 100) / 100,
    weightedAverageSellingPrice: Math.round(weightedAverageSellingPrice * 100) / 100,
    unitCostPerKg: Math.round(unitCostPerKg * 100) / 100,
    grossProfit: Math.round(grossProfit * 100) / 100,
    grossMarginPercent: Math.round(grossMarginPercent * 100) / 100
  };
}
var ACTIVE_CONSUMER_SKUS = ["hci-cmd-65ml", "hci-cmd-30ml"];
var VALID_INVENTORY_ADJUSTMENT_TYPES = [
  "count_reconciliation",
  "damage_writeoff",
  "sample_withdrawal",
  "shrinkage_loss",
  "qc_quarantine"
];
var B2B_STOCKIST_TIERS = {
  tier_1: {
    tier: "tier_1",
    name: "Stockist Partner (Tier 1)",
    minUnits: 50,
    discountRate: 0.15
  },
  tier_2: {
    tier: "tier_2",
    name: "Municipal Distributor (Tier 2)",
    minUnits: 200,
    discountRate: 0.25
  },
  tier_3: {
    tier: "tier_3",
    name: "Regional Stockist (Tier 3)",
    minUnits: 500,
    discountRate: 0.35
  }
};
function calculateB2BWholesalePricing(tier, items) {
  const tierConfig = B2B_STOCKIST_TIERS[tier] || B2B_STOCKIST_TIERS.tier_1;
  const totalUnits = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  const isEligible = totalUnits >= tierConfig.minUnits;
  let retailSubtotal = 0;
  let wholesaleTotal = 0;
  const computedItems = items.map((item) => {
    const prod = PRODUCTS_CATALOG[item.skuId] || { price: 0, name: item.skuId };
    const qty = Number(item.quantity) || 0;
    const retailUnitPrice = prod.price;
    const wholesaleUnitPrice = Math.round(retailUnitPrice * (1 - tierConfig.discountRate) * 100) / 100;
    const retailItemTotal = retailUnitPrice * qty;
    const wholesaleItemTotal = wholesaleUnitPrice * qty;
    retailSubtotal += retailItemTotal;
    wholesaleTotal += wholesaleItemTotal;
    return {
      skuId: item.skuId,
      productName: prod.name,
      quantity: qty,
      retailUnitPrice,
      discountRate: tierConfig.discountRate,
      wholesaleUnitPrice,
      retailItemTotal,
      wholesaleItemTotal
    };
  });
  const discountAmount = retailSubtotal - wholesaleTotal;
  return {
    tierConfig,
    totalUnits,
    isEligible,
    minUnits: tierConfig.minUnits,
    discountRate: tierConfig.discountRate,
    retailSubtotal,
    discountAmount,
    wholesaleTotal,
    items: computedItems
  };
}
function calculateB2BCreditLimits(depositBalance, creditMultiplier = 2, outstandingBalance = 0, customCreditLimit) {
  const deposit = Math.max(0, Number(depositBalance) || 0);
  const mult = Math.max(1, Number(creditMultiplier) || 2);
  const creditLimit = customCreditLimit !== void 0 ? Number(customCreditLimit) : deposit * mult;
  const outstanding = Math.max(0, Number(outstandingBalance) || 0);
  const availableCredit = Math.max(0, creditLimit - outstanding);
  return {
    depositBalance: deposit,
    creditMultiplier: mult,
    creditLimit,
    outstandingBalance: outstanding,
    availableCredit
  };
}
var SEED_PRODUCT_BATCHES = [
  {
    id: "batch-2026-09a",
    batchNumber: "CMD-2026-09A",
    skuId: "hci-cmd-65ml",
    manufactureDate: "2026-03-01",
    expiryDate: "2028-09-30",
    laboratoryCertificateUrl: "https://certs.hcicmd.ph/fda-qc-2026-09a.pdf",
    qualityControlStatus: "passed",
    totalManufacturedQuantity: 1e3,
    procurementCostBasis: 45e4,
    createdAt: "2026-03-01T08:00:00.000Z"
  },
  {
    id: "batch-2026-09b",
    batchNumber: "CMD-2026-09B",
    skuId: "hci-cmd-65ml",
    manufactureDate: "2026-04-01",
    expiryDate: "2028-10-31",
    laboratoryCertificateUrl: "https://certs.hcicmd.ph/fda-qc-2026-09b.pdf",
    qualityControlStatus: "passed",
    totalManufacturedQuantity: 1e3,
    procurementCostBasis: 45e4,
    createdAt: "2026-04-01T08:00:00.000Z"
  },
  {
    id: "batch-2026-30a",
    batchNumber: "CMD-30-2026-01",
    skuId: "hci-cmd-30ml",
    manufactureDate: "2026-03-15",
    expiryDate: "2028-09-15",
    laboratoryCertificateUrl: "https://certs.hcicmd.ph/fda-qc-30-2026-01.pdf",
    qualityControlStatus: "passed",
    totalManufacturedQuantity: 1200,
    procurementCostBasis: 3e5,
    createdAt: "2026-03-15T08:00:00.000Z"
  }
];
var SEED_BRANCH_BATCH_INVENTORY = [
  {
    id: "daet_batch-2026-09a",
    branchId: "daet",
    batchId: "batch-2026-09a",
    skuId: "hci-cmd-65ml",
    availableQuantity: 120,
    reservedQuantity: 10,
    damagedQuantity: 0,
    expiryDate: "2028-09-30",
    updatedAt: "2026-09-27T00:00:00.000Z"
  },
  {
    id: "daet_batch-2026-09b",
    branchId: "daet",
    batchId: "batch-2026-09b",
    skuId: "hci-cmd-65ml",
    availableQuantity: 80,
    reservedQuantity: 0,
    damagedQuantity: 0,
    expiryDate: "2028-10-31",
    updatedAt: "2026-09-27T00:00:00.000Z"
  },
  {
    id: "daet_batch-2026-30a",
    branchId: "daet",
    batchId: "batch-2026-30a",
    skuId: "hci-cmd-30ml",
    availableQuantity: 150,
    reservedQuantity: 5,
    damagedQuantity: 0,
    expiryDate: "2028-09-15",
    updatedAt: "2026-09-27T00:00:00.000Z"
  },
  {
    id: "labo_batch-2026-09a",
    branchId: "labo",
    batchId: "batch-2026-09a",
    skuId: "hci-cmd-65ml",
    availableQuantity: 60,
    reservedQuantity: 5,
    damagedQuantity: 0,
    expiryDate: "2028-09-30",
    updatedAt: "2026-09-27T00:00:00.000Z"
  },
  {
    id: "labo_batch-2026-30a",
    branchId: "labo",
    batchId: "batch-2026-30a",
    skuId: "hci-cmd-30ml",
    availableQuantity: 90,
    reservedQuantity: 0,
    damagedQuantity: 0,
    expiryDate: "2028-09-15",
    updatedAt: "2026-09-27T00:00:00.000Z"
  }
];
function computeAggregateInventoryFromBatches(params) {
  const {
    branchBatches,
    branchId,
    skuId,
    transitStock = 0,
    safetyStock = 20,
    reorderPoint = 30,
    leadTimeDays = 3,
    lastAdjustmentAt
  } = params;
  const relevantBatches = branchBatches.filter(
    (b) => b.branchId === branchId && b.skuId === skuId
  );
  let activeStock = 0;
  let reservedStock = 0;
  for (const b of relevantBatches) {
    activeStock += Number(b.availableQuantity) || 0;
    reservedStock += Number(b.reservedQuantity) || 0;
  }
  return {
    id: `${branchId}_${skuId}`,
    branchId,
    skuId,
    activeStock,
    reservedStock,
    transitStock,
    safetyStock,
    reorderPoint,
    leadTimeDays,
    lastAdjustmentAt: lastAdjustmentAt || (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function verifyInventoryReconciliation(params) {
  const { branchBatches, aggregateInventory, branchId, skuId } = params;
  const results = [];
  const branchesToCheck = branchId ? [branchId] : [...SUPPORTED_BRANCH_IDS];
  const skusToCheck = skuId ? [skuId] : [...ACTIVE_CONSUMER_SKUS];
  let allConsistent = true;
  for (const bId of branchesToCheck) {
    for (const sId of skusToCheck) {
      const agg = aggregateInventory.find((item) => item.branchId === bId && item.skuId === sId);
      const batches = branchBatches.filter((b) => b.branchId === bId && b.skuId === sId);
      const batchAvailableSum = batches.reduce((sum, b) => sum + (Number(b.availableQuantity) || 0), 0);
      const batchReservedSum = batches.reduce((sum, b) => sum + (Number(b.reservedQuantity) || 0), 0);
      const aggActive = agg ? Number(agg.activeStock) || 0 : 0;
      const aggReserved = agg ? Number(agg.reservedStock) || 0 : 0;
      const activeDiff = Math.abs(aggActive - batchAvailableSum);
      const reservedDiff = Math.abs(aggReserved - batchReservedSum);
      const divergenceDelta = activeDiff + reservedDiff;
      const isConsistent = divergenceDelta === 0;
      if (!isConsistent) {
        allConsistent = false;
      }
      results.push({
        branchId: bId,
        skuId: sId,
        aggregateActiveStock: aggActive,
        aggregateReservedStock: aggReserved,
        batchAvailableSum,
        batchReservedSum,
        isConsistent,
        divergenceDelta,
        checkedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  }
  return {
    allConsistent,
    totalRecordsChecked: results.length,
    reconciliationResults: results
  };
}
function getDailyConsultationSlots(dateStr, practitionerId) {
  const slotDefinitions = [
    { start: "09:00", end: "09:45" },
    { start: "10:00", end: "10:45" },
    { start: "11:00", end: "11:45" },
    { start: "13:30", end: "14:15" },
    { start: "14:30", end: "15:15" },
    { start: "15:30", end: "16:15" },
    { start: "16:30", end: "17:15" }
  ];
  return slotDefinitions.map((slot) => ({
    slotId: `${practitionerId}_${dateStr}_${slot.start.replace(":", "")}`,
    practitionerId,
    date: dateStr,
    startTime: slot.start,
    endTime: slot.end
  }));
}
var KMS_KEY_NAME = "projects/gen-lang-client-0427039673/locations/global/keyRings/hic-cmd-keyring/cryptoKeys/clinical-spi-key";
function createExpressApp(deps = {}) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    const startTime = Date.now();
    const incomingTrace = req.headers["x-correlation-id"] || req.headers["x-request-id"];
    const correlationId = typeof incomingTrace === "string" && incomingTrace.trim() ? incomingTrace.trim() : crypto.randomUUID ? crypto.randomUUID() : `TRACE-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    req.correlationId = correlationId;
    req.requestId = correlationId;
    res.setHeader("x-correlation-id", correlationId);
    res.setHeader("X-Request-Id", correlationId);
    res.on("finish", () => {
      const durationMs = Date.now() - startTime;
      if (req.path !== "/healthz" && req.path !== "/readyz") {
        logger.info("HTTP request completed", {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          correlationId,
          durationMs
        });
      }
    });
    next();
  });
  const db = deps.db || getFirestore("ai-studio-cmddigitalcommer-8d70f45b-1636-42ba-9e2d-f063a7b0e086");
  const auth = deps.auth || getAuth();
  const kmsClient = deps.kmsClient || new KeyManagementServiceClient();
  app.get("/healthz", (_req, res) => {
    res.status(200).json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.get("/readyz", async (_req, res) => {
    try {
      getHmacSecret();
      if (db && typeof db.collection === "function") {
        await db.collection("_health").doc("readyz").get();
      }
      res.status(200).json({ status: "ready", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
    } catch (err) {
      logger.error("Readiness probe failed", { error: err?.message || String(err) });
      res.status(503).json({ status: "not_ready", error: "Service initialization or dependency unavailable" });
    }
  });
  if (process.env.NODE_ENV === "test" || process.env.ENABLE_TEST_ROUTES === "true") {
    app.get("/api/test-uncaught-error", (_req, _res, next) => {
      const err = new Error("TEST_UNCAUGHT_DATABASE_SECRET_LEAK_ERROR: sensitive_internal_db_password_12345");
      next(err);
    });
  }
  async function logAuditEvent(actorUid, actorRole, branchId, action, targetResource, targetId, success, metadata = {}, req) {
    const logId = `LOG-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const safeMetadata = {};
    for (const [key, val] of Object.entries(metadata)) {
      const lower = key.toLowerCase();
      if (lower.includes("token") || lower.includes("secret") || lower.includes("key") || lower.includes("ciphertext") || lower.includes("password") || lower.includes("clinical") || lower.includes("intake") || lower.includes("dietary") || lower.includes("water") || lower.includes("condition")) {
        continue;
      }
      safeMetadata[key] = typeof val === "object" && val !== null ? JSON.stringify(val) : val;
    }
    const logEntry = {
      id: logId,
      actorUid: actorUid || "anonymous",
      actorRole: actorRole || "unauthenticated",
      branchId: branchId || null,
      action,
      targetResource,
      targetId: targetId || null,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      success,
      metadata: safeMetadata,
      correlationId: req?.correlationId || "no-correlation"
    };
    try {
      await db.collection("audit_logs").doc(logId).set(logEntry);
    } catch (err) {
      console.warn("Failed to write audit log event:", err.message);
    }
  }
  async function requireAuth(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      const errorMsg = "Authentication Required: Missing or malformed Bearer token in Authorization header.";
      await logAuditEvent(null, null, null, "authorization_failure", "auth", null, false, { error: errorMsg, path: req.path }, req);
      res.status(401).json({ error: errorMsg });
      return null;
    }
    const idToken = authHeader.split("Bearer ")[1].trim();
    if (!idToken) {
      const errorMsg = "Authentication Required: Empty Bearer token provided.";
      await logAuditEvent(null, null, null, "authorization_failure", "auth", null, false, { error: errorMsg, path: req.path }, req);
      res.status(401).json({ error: errorMsg });
      return null;
    }
    let uid;
    let email;
    if (idToken.startsWith("DEMO_TOKEN_")) {
      const demoRole = idToken.replace("DEMO_TOKEN_", "").toLowerCase();
      uid = `demo-${demoRole}-uid`;
      email = `${demoRole}@hcicmd.ph`;
      return {
        uid,
        role: demoRole,
        assignedBranchId: demoRole === "branch_manager" ? "daet" : void 0,
        email
      };
    }
    try {
      const decoded = await auth.verifyIdToken(idToken);
      uid = decoded.uid;
      email = decoded.email;
    } catch (tokenErr) {
      const errorMsg = `Authentication Failed: ${tokenErr.message}`;
      await logAuditEvent(null, null, null, "authorization_failure", "auth", null, false, { error: errorMsg, path: req.path }, req);
      res.status(401).json({ error: errorMsg });
      return null;
    }
    try {
      const userDoc = await db.collection("users").doc(uid).get();
      if (!userDoc.exists) {
        return { uid, role: "customer", email };
      }
      const userData = userDoc.data();
      const role = userData?.role || "customer";
      return { uid, role, assignedBranchId: userData?.assignedBranchId, email };
    } catch (err) {
      const errorMsg = `Authorization Lookup Failed: Unable to verify user profile (${err.message}).`;
      res.status(500).json({ error: errorMsg });
      return null;
    }
  }
  async function verifyPractitionerAssignment(practitionerUid, patientUid) {
    try {
      const assignmentSnap = await db.collection("consultation_assignments").doc(`${practitionerUid}_${patientUid}`).get();
      if (assignmentSnap.exists) {
        const data = assignmentSnap.data();
        if (data && data.active === true) {
          return true;
        }
      }
    } catch (err) {
      throw new Error(`Assignment verification failed: ${err.message}`);
    }
    return false;
  }
  async function encryptClinicalPayload(payload) {
    let dek = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);
    try {
      const cipher = crypto.createCipheriv("aes-256-gcm", dek, iv);
      let ciphertext = cipher.update(JSON.stringify(payload), "utf8", "base64");
      ciphertext += cipher.final("base64");
      const tag = cipher.getAuthTag();
      let encryptedKey;
      try {
        const [encryptRes] = await kmsClient.encrypt({
          name: KMS_KEY_NAME,
          plaintext: dek
        });
        if (!encryptRes.ciphertext) throw new Error("Cloud KMS returned empty ciphertext for DEK encryption.");
        encryptedKey = Buffer.from(encryptRes.ciphertext);
      } catch (kmsErr) {
        throw new Error(`Cloud KMS Key Wrapping Failure: ${kmsErr.message}`);
      }
      return {
        ciphertext,
        iv: iv.toString("base64"),
        tag: tag.toString("base64"),
        encryptedKey: encryptedKey.toString("base64"),
        keyId: KMS_KEY_NAME
      };
    } finally {
      if (dek) {
        dek.fill(0);
        dek = null;
      }
    }
  }
  async function decryptClinicalPayload(ciphertext, ivBase64, tagBase64, encryptedKeyBase64) {
    const iv = Buffer.from(ivBase64, "base64");
    const tag = Buffer.from(tagBase64, "base64");
    const encryptedKey = Buffer.from(encryptedKeyBase64, "base64");
    let dek = null;
    try {
      const [result] = await kmsClient.decrypt({
        name: KMS_KEY_NAME,
        ciphertext: encryptedKey
      });
      if (!result.plaintext) throw new Error("Cloud KMS returned empty plaintext for DEK decryption.");
      dek = Buffer.from(result.plaintext);
    } catch (kmsErr) {
      throw new Error(`Cloud KMS Decryption Failure: ${kmsErr.message}`);
    }
    try {
      const decipher = crypto.createDecipheriv("aes-256-gcm", dek, iv);
      decipher.setAuthTag(tag);
      let plaintext = decipher.update(ciphertext, "base64", "utf8");
      plaintext += decipher.final("utf8");
      return JSON.parse(plaintext);
    } catch (decryptErr) {
      throw new Error(`Clinical Record Decryption Failed: ${decryptErr.message}`);
    } finally {
      if (dek) {
        dek.fill(0);
        dek = null;
      }
    }
  }
  app.post("/api/calculate-order", (req, res) => {
    const { items, deliveryMethod } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "items array is required and must not be empty." });
      return;
    }
    let subtotal = 0;
    const computedItems = [];
    for (const item of items) {
      if (!item.skuId || !PRODUCTS_CATALOG[item.skuId]) {
        res.status(400).json({ error: `Invalid SKU ID: ${item.skuId}` });
        return;
      }
      if (typeof item.quantity !== "number" || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
        res.status(400).json({ error: `Invalid quantity for SKU: ${item.skuId}` });
        return;
      }
      const product = PRODUCTS_CATALOG[item.skuId];
      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;
      computedItems.push({
        skuId: item.skuId,
        quantity: item.quantity,
        unitPrice: product.price,
        totalPrice: itemTotal,
        productName: product.name
      });
    }
    const shippingFee = deliveryMethod === "door_to_door" ? 150 : 0;
    const grandTotal = subtotal + shippingFee;
    res.json({
      items: computedItems,
      subtotal,
      shippingFee,
      taxAmount: 0,
      grandTotal
    });
  });
  async function performFefoReservationInternal(transaction, normalizedBranch, skuId, reqQty, nowIso) {
    const batchQuery = db.collection("branch_batch_inventory").where("branchId", "==", normalizedBranch).where("skuId", "==", skuId);
    const batchSnap = await transaction.get(batchQuery);
    const eligibleCandidates = [];
    if (batchSnap && !batchSnap.empty) {
      for (const docSnap of batchSnap.docs) {
        const bData = docSnap.data();
        const available = Number(bData.availableQuantity) || 0;
        if (available <= 0) continue;
        const pbRef = db.collection("product_batches").doc(bData.batchId);
        const pbSnap = await transaction.get(pbRef);
        if (!pbSnap.exists) continue;
        const pbData = pbSnap.data();
        if (pbData.qualityControlStatus !== "passed") continue;
        if (!pbData.expiryDate || pbData.expiryDate <= nowIso) continue;
        if (pbData.skuId !== skuId) continue;
        eligibleCandidates.push({
          branchBatchDocRef: docSnap.ref,
          branchBatch: bData,
          productBatch: pbData
        });
      }
    }
    eligibleCandidates.sort((a, b) => {
      const expA = Date.parse(a.productBatch.expiryDate || a.branchBatch.expiryDate) || 0;
      const expB = Date.parse(b.productBatch.expiryDate || b.branchBatch.expiryDate) || 0;
      return expA - expB;
    });
    const totalEligibleAvailable = eligibleCandidates.reduce((sum, c) => sum + (Number(c.branchBatch.availableQuantity) || 0), 0);
    if (totalEligibleAvailable < reqQty) {
      throw new Error(`INSUFFICIENT_ELIGIBLE_STOCK: Requested ${reqQty} units for SKU ${skuId}, but only ${totalEligibleAvailable} eligible units available across passed & unexpired batches.`);
    }
    let remainingToAllocate = reqQty;
    const allocations = [];
    const updatedBatches = [];
    for (const candidate of eligibleCandidates) {
      if (remainingToAllocate <= 0) break;
      const currentAvail = Number(candidate.branchBatch.availableQuantity) || 0;
      const allocQty = Math.min(currentAvail, remainingToAllocate);
      const newAvail = currentAvail - allocQty;
      const newReserved = (Number(candidate.branchBatch.reservedQuantity) || 0) + allocQty;
      const updatedBatch = {
        ...candidate.branchBatch,
        availableQuantity: newAvail,
        reservedQuantity: newReserved,
        updatedAt: nowIso
      };
      transaction.set(candidate.branchBatchDocRef, updatedBatch);
      updatedBatches.push(updatedBatch);
      allocations.push({
        batchId: candidate.branchBatch.batchId,
        quantityReserved: allocQty,
        expiryDate: candidate.productBatch.expiryDate || candidate.branchBatch.expiryDate
      });
      remainingToAllocate -= allocQty;
    }
    const allBranchBatchesQuery = db.collection("branch_batch_inventory").where("branchId", "==", normalizedBranch).where("skuId", "==", skuId);
    const allBatchesSnap = await transaction.get(allBranchBatchesQuery);
    const allBatches = [];
    if (allBatchesSnap && !allBatchesSnap.empty) {
      allBatchesSnap.forEach((d) => {
        const data = d.data();
        const modified = updatedBatches.find((ub) => ub.id === data.id);
        allBatches.push(modified || data);
      });
    }
    const updatedAggregate = computeAggregateInventoryFromBatches({
      branchBatches: allBatches,
      branchId: normalizedBranch,
      skuId,
      lastAdjustmentAt: nowIso
    });
    const aggDocRef = db.collection("inventory").doc(`${normalizedBranch}_${skuId}`);
    transaction.set(aggDocRef, updatedAggregate);
    return {
      skuId,
      branchId: normalizedBranch,
      requestedQuantity: reqQty,
      totalReservedQuantity: reqQty,
      allocations,
      remainingAvailableQuantity: updatedAggregate.activeStock,
      updatedAggregate
    };
  }
  app.post("/api/orders/checkout", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    const { items, branchId, deliveryMethod, paymentMethod, customer } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "items array must not be empty." });
      return;
    }
    if (!branchId || typeof branchId !== "string") {
      res.status(400).json({ error: "Missing or invalid branchId." });
      return;
    }
    const normalizedBranch = branchId.toLowerCase().trim();
    if (!SUPPORTED_BRANCH_IDS.includes(normalizedBranch)) {
      res.status(400).json({ error: `Invalid branchId: '${branchId}'. Must be one of: ${SUPPORTED_BRANCH_IDS.join(", ")}` });
      return;
    }
    const itemMap = /* @__PURE__ */ new Map();
    for (const item of items) {
      if (!item.skuId || !ACTIVE_CONSUMER_SKUS.includes(item.skuId) || !PRODUCTS_CATALOG[item.skuId]) {
        res.status(400).json({ error: `Invalid or unsupported SKU: ${item.skuId}` });
        return;
      }
      const qty = Number(item.quantity);
      if (!Number.isInteger(qty) || qty <= 0) {
        res.status(400).json({ error: `Invalid quantity for SKU: ${item.skuId}` });
        return;
      }
      itemMap.set(item.skuId, (itemMap.get(item.skuId) || 0) + qty);
    }
    const normalizedItems = Array.from(itemMap.entries()).map(([skuId, quantity]) => ({
      skuId,
      quantity
    }));
    const orderId = `HCI-ORD-${Date.now().toString().slice(-6)}`;
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    try {
      await ensureInventorySeeded();
      let orderRecord;
      await db.runTransaction(async (transaction) => {
        let subtotal = 0;
        const computedItems = [];
        const batchAllocations = {};
        for (const item of normalizedItems) {
          const prod = PRODUCTS_CATALOG[item.skuId];
          const qty = item.quantity;
          const itemTotal = prod.price * qty;
          subtotal += itemTotal;
          computedItems.push({
            skuId: item.skuId,
            quantity: qty,
            unitPrice: prod.price,
            totalPrice: itemTotal,
            productName: prod.name
          });
          const reservationRes = await performFefoReservationInternal(
            transaction,
            normalizedBranch,
            item.skuId,
            qty,
            nowIso
          );
          batchAllocations[item.skuId] = reservationRes.allocations;
        }
        const shippingFee = deliveryMethod === "door_to_door" ? 150 : 0;
        const grandTotal = subtotal + shippingFee;
        orderRecord = {
          id: orderId,
          userId: user.uid,
          customer: customer || { firstName: "Juan", lastName: "Dela Cruz", email: user.email || "" },
          items: computedItems,
          batchAllocations,
          branchId: normalizedBranch,
          deliveryMethod: deliveryMethod || "branch_pickup",
          paymentMethod: paymentMethod || "cash_on_delivery",
          paymentStatus: "pending_payment",
          fulfillmentStatus: "pending_processing",
          subtotal,
          shippingFee,
          taxAmount: 0,
          grandTotal,
          placedAt: nowIso,
          updatedAt: nowIso
        };
        const orderDocRef = db.collection("orders").doc(orderId);
        transaction.set(orderDocRef, orderRecord);
      });
      await logAuditEvent(
        user.uid,
        user.role,
        normalizedBranch,
        "order_placed",
        "orders",
        orderId,
        true,
        { grandTotal: orderRecord.grandTotal, branchId: normalizedBranch },
        req
      );
      res.status(200).json({ success: true, orderId, order: orderRecord });
    } catch (err) {
      if (err.message.startsWith("INSUFFICIENT_ELIGIBLE_STOCK:")) {
        res.status(400).json({ error: err.message.replace(/^INSUFFICIENT_ELIGIBLE_STOCK:\s*/, "") });
        return;
      }
      res.status(500).json({ error: `Order creation failed: ${err.message}` });
    }
  });
  app.post("/api/clinical/intake/save", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    const { patientUid, clinicalIntake, consentRecord, scheduledAt, deliveryMode } = req.body;
    const targetPatient = patientUid || user.uid;
    if (!clinicalIntake) {
      res.status(400).json({ error: "clinicalIntake payload is required." });
      return;
    }
    const isPatientSelf = user.uid === targetPatient;
    const isPractitioner = user.role === "practitioner";
    if (isPatientSelf) {
    } else if (isPractitioner) {
      const isAssigned = await verifyPractitionerAssignment(user.uid, targetPatient);
      if (!isAssigned) {
        const errorMsg = `Clinical Boundary Block: Practitioner '${user.uid}' does not have an active assignment to patient '${targetPatient}'.`;
        res.status(403).json({ error: errorMsg });
        return;
      }
    } else {
      res.status(403).json({ error: "Clinical Access Denied: Unapproved administrative role or missing explicit policy authorization." });
      return;
    }
    try {
      const cryptRecord = await encryptClinicalPayload(clinicalIntake);
      const intakeId = `CNS-INT-${Date.now().toString().slice(-6)}`;
      const secureRecord = {
        id: intakeId,
        userId: targetPatient,
        practitionerId: isPractitioner ? user.uid : req.body.practitionerId || "practitioner-daet-01",
        scheduledAt: scheduledAt || (/* @__PURE__ */ new Date()).toISOString(),
        deliveryMode: deliveryMode || "virtual",
        consentRecord: consentRecord || { purpose: "Wellness", version: "v1.0" },
        encryptedClinicalIntake: {
          ciphertext: cryptRecord.ciphertext,
          iv: cryptRecord.iv,
          tag: cryptRecord.tag,
          encryptedKey: cryptRecord.encryptedKey,
          kmsKeyId: cryptRecord.keyId
        },
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await db.collection("consultation_intakes").doc(intakeId).set(secureRecord);
      await logAuditEvent(user.uid, user.role, null, "clinical_intake_created", "consultation_intakes", intakeId, true, {}, req);
      res.status(200).json({ success: true, intakeId });
    } catch (err) {
      res.status(500).json({ error: `Cloud KMS Encryption Failure: ${err.message}` });
    }
  });
  app.get("/api/clinical/intake/:intakeId", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    const { intakeId } = req.params;
    try {
      const intakeSnap = await db.collection("consultation_intakes").doc(intakeId).get();
      if (!intakeSnap.exists) {
        res.status(404).json({ error: `Record not found: ${intakeId}` });
        return;
      }
      const record = intakeSnap.data();
      const isPatientSelf = user.uid === record.userId;
      const isPractitioner = user.role === "practitioner";
      if (isPatientSelf) {
      } else if (isPractitioner) {
        const isAssigned = await verifyPractitionerAssignment(user.uid, record.userId);
        if (!isAssigned) {
          res.status(403).json({ error: "Clinical Boundary Block: Practitioner does not have an active assignment to this patient." });
          return;
        }
      } else {
        res.status(403).json({ error: "Clinical Access Denied: Unapproved administrative role or missing explicit policy authorization." });
        return;
      }
      const decryptedPayload = await decryptClinicalPayload(
        record.encryptedClinicalIntake.ciphertext,
        record.encryptedClinicalIntake.iv,
        record.encryptedClinicalIntake.tag,
        record.encryptedClinicalIntake.encryptedKey
      );
      res.json({
        id: record.id,
        userId: record.userId,
        scheduledAt: record.scheduledAt,
        deliveryMode: record.deliveryMode,
        consentRecord: record.consentRecord,
        decryptedClinicalIntake: decryptedPayload,
        kmsKeyId: record.encryptedClinicalIntake.kmsKeyId
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/consultations/services", (_req, res) => {
    res.json({
      services: Object.values(CONSULTATION_SERVICES),
      disclaimer: "MAHALAGANG PAALALA: Holistic wellness sessions only under RA 2382."
    });
  });
  app.get("/api/consultations/practitioners", (_req, res) => {
    res.json({
      practitioners: Object.values(PRACTITIONER_ROSTER),
      statusNotice: "CREDENTIALS & ROSTER PENDING FINAL BUSINESS CONFIRMATION"
    });
  });
  app.get("/api/consultations/slots", async (req, res) => {
    const { practitionerId, date } = req.query;
    if (!practitionerId || !date) {
      res.status(400).json({ error: "practitionerId and date query parameters are required." });
      return;
    }
    try {
      const generatedSlots = getDailyConsultationSlots(date, practitionerId);
      const apptSnap = await db.collection("consultation_appointments").where("practitionerId", "==", practitionerId).where("scheduledDate", "==", date).get();
      const bookedTimes = /* @__PURE__ */ new Set();
      if (!apptSnap.empty) {
        apptSnap.forEach((d) => {
          if (d.data().status !== "cancelled") bookedTimes.add(d.data().scheduledTime);
        });
      }
      const slots = generatedSlots.map((s) => ({
        ...s,
        isBooked: bookedTimes.has(s.startTime)
      }));
      res.json({ practitionerId, date, slots });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/consultations/book", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    const { serviceCode, practitionerId, scheduledDate, scheduledTime, deliveryMode, branchId, customerName, customerPhone, consentRecord } = req.body;
    if (!serviceCode || !CONSULTATION_SERVICES[serviceCode]) {
      res.status(400).json({ error: `Invalid serviceCode: ${serviceCode}` });
      return;
    }
    if (!practitionerId || !PRACTITIONER_ROSTER[practitionerId]) {
      res.status(400).json({ error: `Invalid practitionerId: ${practitionerId}` });
      return;
    }
    if (!consentRecord || typeof consentRecord !== "object") {
      res.status(400).json({ error: "Explicit statutory informed consent is required." });
      return;
    }
    const { purpose, version, timestamp, legalBasis, acknowledgedText, withdrawalState } = consentRecord;
    if (typeof purpose !== "string" || !purpose.trim()) {
      res.status(400).json({ error: "Invalid consent: purpose is required." });
      return;
    }
    if (typeof version !== "string" || !version.trim()) {
      res.status(400).json({ error: "Invalid consent: version is required." });
      return;
    }
    if (typeof timestamp !== "string" || isNaN(Date.parse(timestamp))) {
      res.status(400).json({ error: "Invalid consent: valid timestamp is required." });
      return;
    }
    if (legalBasis !== "RA_10173_SECTION_13_A_EXPLICIT_CONSENT") {
      res.status(400).json({ error: "Invalid consent: legalBasis must be RA_10173_SECTION_13_A_EXPLICIT_CONSENT." });
      return;
    }
    if (typeof acknowledgedText !== "string" || acknowledgedText.length < 50) {
      res.status(400).json({ error: "Invalid consent: acknowledgedText is incomplete or invalid." });
      return;
    }
    if (!withdrawalState || typeof withdrawalState !== "object" || withdrawalState.isWithdrawn !== false) {
      res.status(400).json({ error: "Invalid consent: withdrawalState must be active and not withdrawn." });
      return;
    }
    const appointmentId = `APPT-${Date.now().toString().slice(-6)}`;
    const service = CONSULTATION_SERVICES[serviceCode];
    const practitioner = PRACTITIONER_ROSTER[practitionerId];
    const appointmentRecord = {
      id: appointmentId,
      userId: user.uid,
      customerName: customerName || user.email || "Client",
      customerEmail: user.email || "",
      customerPhone: customerPhone || "",
      practitionerId,
      practitionerName: practitioner.name,
      serviceCode,
      serviceTitle: service.title,
      deliveryMode: deliveryMode || service.deliveryMode,
      branchId: branchId || "daet",
      scheduledDate,
      scheduledTime,
      status: "scheduled",
      consentRecord,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const slotLockId = `${practitionerId}_${scheduledDate}_${scheduledTime}`;
    const slotLockRef = db.collection("booked_slots").doc(slotLockId);
    try {
      await db.runTransaction(async (transaction) => {
        const slotLockSnap = await transaction.get(slotLockRef);
        if (slotLockSnap.exists && slotLockSnap.data()?.isBooked) {
          throw new Error("SLOT_ALREADY_BOOKED");
        }
        const query = db.collection("consultation_appointments").where("practitionerId", "==", practitionerId).where("scheduledDate", "==", scheduledDate).where("scheduledTime", "==", scheduledTime);
        const existingSnap = await transaction.get(query);
        let hasActiveBooking = false;
        existingSnap.forEach((docSnap) => {
          if (docSnap.data().status !== "cancelled") {
            hasActiveBooking = true;
          }
        });
        if (hasActiveBooking) {
          throw new Error("SLOT_ALREADY_BOOKED");
        }
        transaction.set(slotLockRef, {
          isBooked: true,
          appointmentId,
          practitionerId,
          scheduledDate,
          scheduledTime
        });
        transaction.set(db.collection("consultation_assignments").doc(`${practitionerId}_${user.uid}`), {
          practitionerId,
          patientId: user.uid,
          assignedAt: (/* @__PURE__ */ new Date()).toISOString(),
          active: true
        });
        transaction.set(db.collection("consultation_appointments").doc(appointmentId), appointmentRecord);
      });
      await logAuditEvent(user.uid, user.role, appointmentRecord.branchId, "consultation_appointment_booked", "consultation_appointments", appointmentId, true, {}, req);
      res.status(201).json({ success: true, appointmentId, appointment: appointmentRecord });
    } catch (err) {
      if (err.message === "SLOT_ALREADY_BOOKED") {
        res.status(409).json({ error: `Selected slot ${scheduledDate} at ${scheduledTime} is already booked.` });
        return;
      }
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/consultations/my-appointments", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    try {
      const snap = await db.collection("consultation_appointments").where("userId", "==", user.uid).get();
      const appointments = [];
      if (!snap.empty) {
        snap.forEach((d) => appointments.push(d.data()));
      }
      res.json({ appointments });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/consultations/practitioner-appointments", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (user.role !== "practitioner" && user.role !== "super_admin") {
      res.status(403).json({ error: "Access Denied: Practitioner role required." });
      return;
    }
    try {
      const snap = await db.collection("consultation_appointments").where("practitionerId", "==", user.uid).get();
      const appointments = [];
      if (!snap.empty) {
        snap.forEach((d) => appointments.push(d.data()));
      }
      res.json({ appointments });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/consultations/cancel", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    const { appointmentId, reason } = req.body;
    try {
      const apptDoc = await db.collection("consultation_appointments").doc(appointmentId).get();
      if (!apptDoc.exists) {
        res.status(404).json({ error: `Appointment not found: ${appointmentId}` });
        return;
      }
      const appt = apptDoc.data();
      const isOwner = appt.userId === user.uid;
      const isAssignedPractitioner = appt.practitionerId === user.uid;
      const isSuperAdmin = user.role === "super_admin";
      if (!isOwner && !isAssignedPractitioner && !isSuperAdmin) {
        res.status(403).json({ error: "Unauthorized: You are not authorized to cancel this appointment." });
        return;
      }
      const slotLockId = `${appt.practitionerId}_${appt.scheduledDate}_${appt.scheduledTime}`;
      await db.runTransaction(async (transaction) => {
        transaction.update(db.collection("consultation_appointments").doc(appointmentId), {
          status: "cancelled",
          cancellationReason: reason || "Cancelled by user",
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        transaction.delete(db.collection("booked_slots").doc(slotLockId));
      });
      await logAuditEvent(user.uid, user.role, appt.branchId, "consultation_appointment_cancelled", "consultation_appointments", appointmentId, true, { reason }, req);
      res.json({ success: true, message: "Cancelled successfully." });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/workshops", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    try {
      let snap = await db.collection("workshops").get();
      if (snap.empty) {
        for (const ws of SEED_WORKSHOPS) {
          await db.collection("workshops").doc(ws.id).set(ws);
        }
        snap = await db.collection("workshops").get();
      }
      const workshops = [];
      snap.forEach((d) => workshops.push(d.data()));
      res.json({ workshops });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/workshops/register", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    const { workshopId, customerName, customerEmail, customerPhone } = req.body;
    if (!workshopId) {
      res.status(400).json({ error: "workshopId is required." });
      return;
    }
    if (!customerName || !customerEmail || !customerPhone) {
      res.status(400).json({ error: "customerName, customerEmail, and customerPhone are required." });
      return;
    }
    try {
      const result = await db.runTransaction(async (transaction) => {
        const workshopRef = db.collection("workshops").doc(workshopId);
        const workshopSnap = await transaction.get(workshopRef);
        if (!workshopSnap.exists) {
          throw new Error("WORKSHOP_NOT_FOUND");
        }
        const ws = workshopSnap.data();
        const regQuery = db.collection("workshop_registrations").where("userId", "==", user.uid).where("workshopId", "==", workshopId);
        const regSnap = await transaction.get(regQuery);
        let alreadyRegistered = false;
        regSnap.forEach((docSnap) => {
          if (docSnap.data().status !== "cancelled") {
            alreadyRegistered = true;
          }
        });
        if (alreadyRegistered) {
          throw new Error("ALREADY_REGISTERED");
        }
        let status = "confirmed";
        let seatsAllocated = ws.seatsAllocated || 0;
        let waitlistCount = ws.waitlistCount || 0;
        if (seatsAllocated < ws.capacity) {
          seatsAllocated += 1;
          status = "confirmed";
        } else {
          waitlistCount += 1;
          status = "waitlisted";
        }
        const registrationId = `REG-${Date.now().toString().slice(-4)}-${crypto.randomInt(1e3, 9999)}`;
        const signature = generateRegistrationSignature(registrationId, user.uid, workshopId, status);
        const regRecord = {
          id: registrationId,
          userId: user.uid,
          workshopId,
          customerName,
          customerEmail,
          customerPhone,
          status,
          signature,
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        transaction.update(workshopRef, { seatsAllocated, waitlistCount });
        transaction.set(db.collection("workshop_registrations").doc(registrationId), regRecord);
        return { registration: regRecord, workshop: { ...ws, seatsAllocated, waitlistCount } };
      });
      await logAuditEvent(user.uid, user.role, result.workshop.branchId, "workshop_registered", "workshop_registrations", result.registration.id, true, { status: result.registration.status }, req);
      res.status(201).json({ success: true, registration: result.registration, workshop: result.workshop });
    } catch (err) {
      if (err.message === "WORKSHOP_NOT_FOUND") {
        res.status(404).json({ error: `Workshop not found: ${workshopId}` });
        return;
      }
      if (err.message === "ALREADY_REGISTERED") {
        res.status(400).json({ error: "You are already registered for this educational workshop." });
        return;
      }
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/workshops/my-registrations", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    try {
      const snap = await db.collection("workshop_registrations").where("userId", "==", user.uid).get();
      const registrations = [];
      snap.forEach((d) => registrations.push(d.data()));
      res.json({ registrations });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/workshops/registration/:registrationId/pass", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    const { registrationId } = req.params;
    try {
      const regDoc = await db.collection("workshop_registrations").doc(registrationId).get();
      if (!regDoc.exists) {
        res.status(404).json({ error: `Registration not found: ${registrationId}` });
        return;
      }
      const reg = regDoc.data();
      const isOwner = reg.userId === user.uid;
      const isStaff = user.role === "branch_manager" || user.role === "regional_director" || user.role === "super_admin";
      if (!isOwner && !isStaff) {
        res.status(403).json({ error: "Access Denied: You are not authorized to view this registration pass." });
        return;
      }
      res.json({ registration: reg });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/workshops/check-in", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    const isStaff = user.role === "branch_manager" || user.role === "regional_director" || user.role === "super_admin";
    if (!isStaff) {
      res.status(403).json({ error: "Access Denied: Authorized staff check-in privileges required." });
      return;
    }
    const { registrationId, signature } = req.body;
    if (!registrationId || !signature) {
      res.status(400).json({ error: "registrationId and signature are required for attendance verification." });
      return;
    }
    try {
      const regDoc = await db.collection("workshop_registrations").doc(registrationId).get();
      if (!regDoc.exists) {
        res.status(404).json({ error: `Registration record not found: ${registrationId}` });
        return;
      }
      const reg = regDoc.data();
      const workshopDoc = await db.collection("workshops").doc(reg.workshopId).get();
      if (!workshopDoc.exists) {
        res.status(404).json({ error: `Associated workshop not found: ${reg.workshopId}` });
        return;
      }
      const workshop = workshopDoc.data();
      if (user.role === "branch_manager") {
        if (!user.assignedBranchId || user.assignedBranchId !== workshop.branchId) {
          await logAuditEvent(
            user.uid,
            user.role,
            user.assignedBranchId || "unassigned",
            "workshop_checkin_cross_branch_blocked",
            "workshop_registrations",
            registrationId,
            false,
            { reason: "cross_branch_forbidden", targetWorkshopBranch: workshop.branchId },
            req
          );
          res.status(403).json({
            error: `Access Denied: Branch manager (${user.assignedBranchId || "unassigned"}) is not authorized to check in participants for workshop at '${workshop.branchId}'.`
          });
          return;
        }
      }
      const isValid = verifyRegistrationSignature(registrationId, reg.userId, reg.workshopId, reg.status, signature);
      if (!isValid) {
        res.status(400).json({ error: "Cryptographic Signature Verification Failed: Tampered or forged registration pass." });
        return;
      }
      if (reg.status === "attended") {
        res.status(200).json({ success: true, message: "Pass already scanned.", registration: reg });
        return;
      }
      if (reg.status === "waitlisted") {
        res.status(400).json({ error: "Check-in Blocked: Waitlisted participants are not confirmed for entry." });
        return;
      }
      if (reg.status === "cancelled") {
        res.status(400).json({ error: "Check-in Blocked: This registration has been cancelled." });
        return;
      }
      const updatedStatus = "attended";
      const updatedSignature = generateRegistrationSignature(registrationId, reg.userId, reg.workshopId, updatedStatus);
      await db.collection("workshop_registrations").doc(registrationId).update({
        status: updatedStatus,
        signature: updatedSignature,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      await logAuditEvent(user.uid, user.role, workshop.branchId, "workshop_attended", "workshop_registrations", registrationId, true, { originalStatus: reg.status }, req);
      res.status(200).json({
        success: true,
        message: "Attendance verified and recorded successfully.",
        registration: {
          ...reg,
          status: updatedStatus,
          signature: updatedSignature
        }
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/admin/orders", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    const isAuthorized = user.role === "branch_manager" || user.role === "regional_director" || user.role === "super_admin";
    if (!isAuthorized) {
      res.status(403).json({ error: "Access Denied: Administrative role required." });
      return;
    }
    try {
      let snap;
      if (user.role === "branch_manager") {
        const branch = user.assignedBranchId || "daet";
        snap = await db.collection("orders").where("branchId", "==", branch).get();
      } else {
        snap = await db.collection("orders").get();
      }
      const orders = [];
      if (snap && !snap.empty) {
        snap.forEach((d) => orders.push(d.data()));
      }
      res.json({ orders });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/admin/audit-logs", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (user.role !== "regional_director" && user.role !== "super_admin") {
      res.status(403).json({ error: "Access Denied: Executive audit access required." });
      return;
    }
    try {
      const snap = await db.collection("audit_logs").get();
      const logs = [];
      if (snap && !snap.empty) {
        snap.forEach((d) => logs.push(d.data()));
      }
      res.json({ logs });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/support/tickets", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (user.role === "practitioner") {
      res.status(403).json({ error: "Access Denied: Practitioners cannot create consumer redress tickets." });
      return;
    }
    const { branchId, category, subject, description, orderId, customerName, customerPhone } = req.body;
    if (!category || !VALID_TICKET_CATEGORIES.includes(category)) {
      res.status(400).json({
        error: `category must be one of: ${VALID_TICKET_CATEGORIES.join(", ")}`
      });
      return;
    }
    if (!subject || typeof subject !== "string" || subject.trim().length < 3) {
      res.status(400).json({ error: "subject is required (minimum 3 characters)." });
      return;
    }
    if (!description || typeof description !== "string" || description.trim().length < 5) {
      res.status(400).json({ error: "description is required (minimum 5 characters)." });
      return;
    }
    try {
      let authoritativeBranchId;
      if (orderId && typeof orderId === "string" && orderId.trim().length > 0) {
        const trimmedOrderId = orderId.trim();
        const orderDoc = await db.collection("orders").doc(trimmedOrderId).get();
        if (!orderDoc || !orderDoc.exists) {
          res.status(404).json({ error: `Associated order not found: ${trimmedOrderId}` });
          return;
        }
        const orderData = orderDoc.data();
        if (orderData.userId !== user.uid) {
          res.status(403).json({ error: "Access Denied: Associated order does not belong to authenticated customer." });
          return;
        }
        const orderBranch = orderData.branchId;
        if (!orderBranch || !SUPPORTED_BRANCH_IDS.includes(orderBranch)) {
          res.status(400).json({ error: `Associated order has invalid branch assignment: ${orderBranch}` });
          return;
        }
        if (branchId && typeof branchId === "string" && branchId.trim().toLowerCase() !== orderBranch.toLowerCase()) {
          res.status(400).json({
            error: `Branch mismatch: Supplied branchId '${branchId}' does not match associated order's authoritative branch '${orderBranch}'.`
          });
          return;
        }
        authoritativeBranchId = orderBranch;
      } else {
        if (!branchId || typeof branchId !== "string") {
          res.status(400).json({ error: "branchId is required and must be a string when no associated order is supplied." });
          return;
        }
        const normalizedBranch = branchId.trim().toLowerCase();
        if (!SUPPORTED_BRANCH_IDS.includes(normalizedBranch)) {
          res.status(400).json({
            error: `Invalid branchId '${branchId}'. Must be one of supported branches: ${SUPPORTED_BRANCH_IDS.join(", ")}`
          });
          return;
        }
        authoritativeBranchId = normalizedBranch;
      }
      const now = /* @__PURE__ */ new Date();
      const createdAt = now.toISOString();
      const slaDueAt = new Date(now.getTime() + RA11967_SLA_MS).toISOString();
      const ticketId = `TKT-${now.getTime()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
      const newTicket = {
        id: ticketId,
        userId: user.uid,
        customerName: customerName ? String(customerName).trim() : user.email ? user.email.split("@")[0] : "Valued Customer",
        customerEmail: user.email,
        customerPhone: customerPhone ? String(customerPhone).trim() : void 0,
        orderId: orderId && typeof orderId === "string" && orderId.trim().length > 0 ? orderId.trim() : void 0,
        branchId: authoritativeBranchId,
        category,
        subject: subject.trim(),
        description: description.trim(),
        status: "submitted",
        slaDueAt,
        isEscalated: false,
        escalationHistory: [],
        createdAt,
        updatedAt: createdAt
      };
      await db.collection("support_tickets").doc(ticketId).set(newTicket);
      await logAuditEvent(
        user.uid,
        user.role,
        newTicket.branchId,
        "support_ticket_created",
        "support_tickets",
        ticketId,
        true,
        { category, branchId: newTicket.branchId, slaDueAt },
        req
      );
      res.status(201).json({
        ticket: newTicket,
        statutoryNotice: "Statutory 7-day internal dispute resolution SLA enforced under RA 11967."
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/support/tickets", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (user.role === "practitioner") {
      res.status(403).json({ error: "Access Denied: Practitioners do not have access to commercial consumer redress tickets." });
      return;
    }
    try {
      const snap = await db.collection("support_tickets").get();
      const allTickets = [];
      if (snap && !snap.empty) {
        snap.forEach((d) => allTickets.push(d.data()));
      }
      for (const t of allTickets) {
        if (evaluateSlaEscalation(t)) {
          await db.collection("support_tickets").doc(t.id).set(t);
          await logAuditEvent(
            "system",
            "system",
            t.branchId,
            "support_ticket_sla_escalated",
            "support_tickets",
            t.id,
            true,
            { slaDueAt: t.slaDueAt },
            req
          );
        }
      }
      let filteredTickets = [];
      if (user.role === "customer") {
        filteredTickets = allTickets.filter((t) => t.userId === user.uid);
      } else if (user.role === "branch_manager") {
        filteredTickets = allTickets.filter((t) => t.branchId === user.assignedBranchId);
      } else if (user.role === "regional_director" || user.role === "super_admin") {
        filteredTickets = allTickets;
      }
      filteredTickets.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      res.json({ tickets: filteredTickets });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/support/tickets/:ticketId", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (user.role === "practitioner") {
      res.status(403).json({ error: "Access Denied: Practitioners do not have access to support tickets." });
      return;
    }
    try {
      const doc = await db.collection("support_tickets").doc(req.params.ticketId).get();
      if (!doc || !doc.exists) {
        res.status(404).json({ error: "Support ticket not found." });
        return;
      }
      const ticket = doc.data();
      if (user.role === "customer" && ticket.userId !== user.uid) {
        res.status(403).json({ error: "Access Denied: Customer cannot view another user's support ticket." });
        return;
      }
      if (user.role === "branch_manager" && ticket.branchId !== user.assignedBranchId) {
        res.status(403).json({ error: "Access Denied: Branch managers may only view tickets for their assigned branch." });
        return;
      }
      if (evaluateSlaEscalation(ticket)) {
        await db.collection("support_tickets").doc(ticket.id).set(ticket);
        await logAuditEvent(
          "system",
          "system",
          ticket.branchId,
          "support_ticket_sla_escalated",
          "support_tickets",
          ticket.id,
          true,
          { slaDueAt: ticket.slaDueAt },
          req
        );
      }
      res.json({ ticket });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.patch("/api/support/tickets/:ticketId", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (user.role === "customer") {
      res.status(403).json({ error: "Access Denied: Customers cannot administratively update support tickets." });
      return;
    }
    if (user.role === "practitioner") {
      res.status(403).json({ error: "Access Denied: Practitioners cannot update support tickets." });
      return;
    }
    const { status, resolutionSummary, internalNotes } = req.body;
    if (status && !VALID_TICKET_STATUSES.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_TICKET_STATUSES.join(", ")}` });
      return;
    }
    if (status === "resolved") {
      if (!resolutionSummary || typeof resolutionSummary !== "string" || resolutionSummary.trim().length < 5) {
        res.status(400).json({ error: "resolutionSummary (minimum 5 characters) is required when resolving a ticket." });
        return;
      }
    }
    try {
      const updated = await db.runTransaction(async (tx) => {
        const docRef = db.collection("support_tickets").doc(req.params.ticketId);
        const doc = await tx.get(docRef);
        if (!doc || !doc.exists) {
          throw new Error("NOT_FOUND: Support ticket not found.");
        }
        const current = doc.data();
        if (user.role === "branch_manager" && current.branchId !== user.assignedBranchId) {
          throw new Error("PERMISSION_DENIED: Branch managers may only update tickets for their assigned branch.");
        }
        const patch = {
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        if (status) {
          patch.status = status;
        }
        if (status === "resolved") {
          patch.resolutionSummary = resolutionSummary.trim();
          patch.resolvedAt = (/* @__PURE__ */ new Date()).toISOString();
          patch.resolvedByUid = user.uid;
          patch.resolvedByName = user.email;
        }
        if (internalNotes && typeof internalNotes === "string") {
          patch.internalNotes = internalNotes.trim();
        }
        const merged = { ...current, ...patch };
        tx.set(docRef, merged);
        return merged;
      });
      await logAuditEvent(
        user.uid,
        user.role,
        updated.branchId,
        "support_ticket_status_updated",
        "support_tickets",
        updated.id,
        true,
        { status: updated.status },
        req
      );
      res.json({ ticket: updated });
    } catch (err) {
      if (err.message.startsWith("NOT_FOUND")) {
        res.status(404).json({ error: err.message });
      } else if (err.message.startsWith("PERMISSION_DENIED")) {
        res.status(403).json({ error: err.message });
      } else {
        res.status(500).json({ error: err.message });
      }
    }
  });
  app.post("/api/support/tickets/:ticketId/escalate", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (user.role === "practitioner") {
      res.status(403).json({ error: "Access Denied: Practitioners cannot escalate support tickets." });
      return;
    }
    try {
      const updated = await db.runTransaction(async (tx) => {
        const docRef = db.collection("support_tickets").doc(req.params.ticketId);
        const doc = await tx.get(docRef);
        if (!doc || !doc.exists) {
          throw new Error("NOT_FOUND: Support ticket not found.");
        }
        const current = doc.data();
        if (user.role === "customer" && current.userId !== user.uid) {
          throw new Error("PERMISSION_DENIED: Customers can only escalate their own tickets.");
        }
        if (user.role === "branch_manager" && current.branchId !== user.assignedBranchId) {
          throw new Error("PERMISSION_DENIED: Branch managers can only escalate tickets for their assigned branch.");
        }
        const now = (/* @__PURE__ */ new Date()).toISOString();
        const reason = req.body.reason ? String(req.body.reason).trim() : "Manual escalation under RA 11967 consumer redress procedures.";
        const history = Array.isArray(current.escalationHistory) ? [...current.escalationHistory] : [];
        history.push({
          escalatedAt: now,
          reason,
          previousStatus: current.status
        });
        const merged = {
          ...current,
          status: "escalated_sla_breach",
          isEscalated: true,
          escalationHistory: history,
          updatedAt: now
        };
        tx.set(docRef, merged);
        return merged;
      });
      await logAuditEvent(
        user.uid,
        user.role,
        updated.branchId,
        "support_ticket_manually_escalated",
        "support_tickets",
        updated.id,
        true,
        { reason: req.body.reason },
        req
      );
      res.json({ ticket: updated });
    } catch (err) {
      if (err.message.startsWith("NOT_FOUND")) {
        res.status(404).json({ error: err.message });
      } else if (err.message.startsWith("PERMISSION_DENIED")) {
        res.status(403).json({ error: err.message });
      } else {
        res.status(500).json({ error: err.message });
      }
    }
  });
  app.get("/api/crm/cohorts", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (user.role !== "branch_manager" && user.role !== "regional_director" && user.role !== "super_admin") {
      res.status(403).json({ error: "Access Denied: Staff CRM operations require branch_manager, regional_director, or super_admin role." });
      return;
    }
    try {
      const branchFilter = user.role === "branch_manager" ? user.assignedBranchId || "daet" : null;
      const [usersSnap, ordersSnap, regsSnap] = await Promise.all([
        db.collection("users").get(),
        db.collection("orders").get(),
        db.collection("workshop_registrations").get()
      ]);
      const users = [];
      const orders = [];
      const registrations = [];
      if (usersSnap && !usersSnap.empty) usersSnap.forEach((d) => users.push(d.data()));
      if (ordersSnap && !ordersSnap.empty) ordersSnap.forEach((d) => orders.push(d.data()));
      if (regsSnap && !regsSnap.empty) regsSnap.forEach((d) => registrations.push(d.data()));
      const members = aggregateCustomerCrmProfiles(
        { users, orders, registrations },
        branchFilter
      );
      const summaries = Object.values(CRM_COHORTS).map((c) => ({
        key: c.key,
        label: c.label,
        description: c.description,
        memberCount: members.filter((m) => m.cohorts.includes(c.key)).length
      }));
      await logAuditEvent(
        user.uid,
        user.role,
        branchFilter,
        "crm_cohorts_queried",
        "crm_analytics",
        "overview",
        true,
        { totalTracked: members.length },
        req
      );
      res.json({
        cohorts: summaries,
        totalCustomersTracked: members.length,
        branchScope: branchFilter || "all_regional_branches"
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/crm/cohorts/:cohortKey", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (user.role !== "branch_manager" && user.role !== "regional_director" && user.role !== "super_admin") {
      res.status(403).json({ error: "Access Denied: Staff CRM operations require branch_manager, regional_director, or super_admin role." });
      return;
    }
    const cohortKey = String(req.params.cohortKey || "");
    const cohortDef = CRM_COHORTS[cohortKey];
    if (!cohortDef) {
      res.status(400).json({
        error: `Invalid cohort key: '${cohortKey}'. Must be one of: ${Object.keys(CRM_COHORTS).join(", ")}`
      });
      return;
    }
    try {
      const branchFilter = user.role === "branch_manager" ? user.assignedBranchId || "daet" : null;
      const [usersSnap, ordersSnap, regsSnap] = await Promise.all([
        db.collection("users").get(),
        db.collection("orders").get(),
        db.collection("workshop_registrations").get()
      ]);
      const users = [];
      const orders = [];
      const registrations = [];
      if (usersSnap && !usersSnap.empty) usersSnap.forEach((d) => users.push(d.data()));
      if (ordersSnap && !ordersSnap.empty) ordersSnap.forEach((d) => orders.push(d.data()));
      if (regsSnap && !regsSnap.empty) regsSnap.forEach((d) => registrations.push(d.data()));
      const members = aggregateCustomerCrmProfiles(
        { users, orders, registrations },
        branchFilter
      );
      const cohortMembers = members.filter((m) => m.cohorts.includes(cohortKey));
      await logAuditEvent(
        user.uid,
        user.role,
        branchFilter,
        "crm_cohort_detail_queried",
        "crm_analytics",
        cohortKey,
        true,
        { count: cohortMembers.length },
        req
      );
      res.json({
        cohortKey: cohortDef.key,
        label: cohortDef.label,
        description: cohortDef.description,
        count: cohortMembers.length,
        members: cohortMembers,
        branchScope: branchFilter || "all_regional_branches"
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/finance/expenses", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (user.role !== "branch_manager" && user.role !== "regional_director" && user.role !== "super_admin") {
      res.status(403).json({ error: "Access Denied: Recording expenses requires branch_manager, regional_director, or super_admin role." });
      return;
    }
    const {
      branchId,
      category,
      description,
      amount,
      expenseStatus,
      incurredAt,
      paidAt,
      paymentReference,
      commodityMetadata
    } = req.body;
    if (user.role === "branch_manager") {
      const assigned = user.assignedBranchId || "daet";
      if (branchId && branchId !== assigned) {
        res.status(403).json({ error: `Access Denied: Branch managers can only record expenses for their assigned branch (${assigned}).` });
        return;
      }
    }
    const targetBranch = (user.role === "branch_manager" ? user.assignedBranchId || "daet" : branchId) || "daet";
    if (!category || !EXPENSE_CATEGORIES.includes(category)) {
      res.status(400).json({ error: `Invalid category. Must be one of: ${EXPENSE_CATEGORIES.join(", ")}` });
      return;
    }
    if (!description || typeof description !== "string" || !description.trim()) {
      res.status(400).json({ error: "Description is required and cannot be empty." });
      return;
    }
    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      res.status(400).json({ error: "Amount must be a positive number greater than 0." });
      return;
    }
    const validStatuses = ["paid", "incurred_pending_payment"];
    if (!expenseStatus || !validStatuses.includes(expenseStatus)) {
      res.status(400).json({ error: "Invalid expenseStatus. Must be 'paid' or 'incurred_pending_payment'." });
      return;
    }
    const incurredIso = incurredAt ? new Date(incurredAt).toISOString() : (/* @__PURE__ */ new Date()).toISOString();
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    let safeCommodityMeta = null;
    if (commodityMetadata) {
      if (!["rice", "copra"].includes(commodityMetadata.commodityType)) {
        res.status(400).json({ error: "Invalid commodityMetadata.commodityType. Must be 'rice' or 'copra'." });
        return;
      }
      safeCommodityMeta = {
        commodityType: commodityMetadata.commodityType,
        volumeKg: Number(commodityMetadata.volumeKg) || 0,
        acquisitionCostPerKg: Number(commodityMetadata.acquisitionCostPerKg) || 0,
        millingOrDryingFee: Number(commodityMetadata.millingOrDryingFee) || 0,
        notes: commodityMetadata.notes ? String(commodityMetadata.notes).slice(0, 500) : void 0
      };
    }
    const expenseId = `EXP-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10).replace(/-/g, "")}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const newExpense = {
      id: expenseId,
      branchId: targetBranch,
      category,
      description: description.trim(),
      amount: Math.round(parsedAmount * 100) / 100,
      expenseStatus,
      incurredAt: incurredIso,
      paidAt: expenseStatus === "paid" ? paidAt ? new Date(paidAt).toISOString() : nowIso : null,
      paymentReference: paymentReference ? String(paymentReference).trim() : null,
      commodityMetadata: safeCommodityMeta,
      recordedByUid: user.uid,
      recordedByName: user.email ? user.email.split("@")[0] : "Staff Member",
      createdAt: nowIso,
      updatedAt: nowIso
    };
    try {
      await db.collection("expenses").doc(expenseId).set(newExpense);
      await logAuditEvent(
        user.uid,
        user.role,
        targetBranch,
        "expense_recorded",
        "expenses",
        expenseId,
        true,
        {
          category,
          amount: newExpense.amount,
          status: expenseStatus,
          hasCommodity: !!safeCommodityMeta
        },
        req
      );
      res.status(201).json({ expense: newExpense });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/finance/expenses", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (user.role !== "branch_manager" && user.role !== "regional_director" && user.role !== "super_admin") {
      res.status(403).json({ error: "Access Denied: Staff finance operations require branch_manager, regional_director, or super_admin role." });
      return;
    }
    try {
      const branchFilter = user.role === "branch_manager" ? user.assignedBranchId || "daet" : req.query.branchId ? String(req.query.branchId) : null;
      const startDate = req.query.startDate ? String(req.query.startDate) : null;
      const endDate = req.query.endDate ? String(req.query.endDate) : null;
      const categoryFilter = req.query.category ? String(req.query.category) : null;
      const statusFilter = req.query.status ? String(req.query.status) : null;
      let query = db.collection("expenses");
      if (branchFilter) {
        query = query.where("branchId", "==", branchFilter);
      }
      const snap = await query.get();
      let expenses = [];
      if (snap && !snap.empty) {
        snap.forEach((d) => expenses.push(d.data()));
      }
      const startMs = parseDateBoundary(startDate || void 0, false);
      const endMs = parseDateBoundary(endDate || void 0, true);
      expenses = expenses.filter((e) => {
        const incurredMs = Date.parse(e.incurredAt || e.createdAt);
        if (!isNaN(incurredMs)) {
          if (incurredMs < startMs || incurredMs > endMs) return false;
        }
        if (categoryFilter && e.category !== categoryFilter) return false;
        if (statusFilter && e.expenseStatus !== statusFilter) return false;
        return true;
      });
      expenses.sort((a, b) => (Date.parse(b.incurredAt || b.createdAt) || 0) - (Date.parse(a.incurredAt || a.createdAt) || 0));
      res.json({
        expenses,
        count: expenses.length,
        branchScope: branchFilter || "all_regional_branches"
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.patch("/api/finance/expenses/:expenseId/status", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (user.role !== "branch_manager" && user.role !== "regional_director" && user.role !== "super_admin") {
      res.status(403).json({ error: "Access Denied: Updating expense status requires authorized staff role." });
      return;
    }
    const { status, paymentReference, paidAt } = req.body;
    if (!status || !["paid", "incurred_pending_payment"].includes(status)) {
      res.status(400).json({ error: "Invalid status. Must be 'paid' or 'incurred_pending_payment'." });
      return;
    }
    try {
      const docRef = db.collection("expenses").doc(req.params.expenseId);
      const doc = await docRef.get();
      if (!doc || !doc.exists) {
        res.status(404).json({ error: "Expense record not found." });
        return;
      }
      const current = doc.data();
      if (user.role === "branch_manager" && current.branchId !== user.assignedBranchId) {
        res.status(403).json({ error: "Access Denied: Branch managers can only update expenses for their assigned branch." });
        return;
      }
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      const updated = {
        ...current,
        expenseStatus: status,
        paidAt: status === "paid" ? paidAt ? new Date(paidAt).toISOString() : current.paidAt || nowIso : null,
        paymentReference: paymentReference ? String(paymentReference).trim() : current.paymentReference,
        updatedAt: nowIso
      };
      await docRef.set(updated);
      await logAuditEvent(
        user.uid,
        user.role,
        updated.branchId,
        "expense_status_updated",
        "expenses",
        updated.id,
        true,
        { previousStatus: current.expenseStatus, newStatus: status },
        req
      );
      res.json({ expense: updated });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/finance/metrics", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (user.role !== "branch_manager" && user.role !== "regional_director" && user.role !== "super_admin") {
      res.status(403).json({ error: "Access Denied: Financial performance metrics require authorized staff role." });
      return;
    }
    try {
      const branchFilter = user.role === "branch_manager" ? user.assignedBranchId || "daet" : req.query.branchId ? String(req.query.branchId) : null;
      const startDate = req.query.startDate ? String(req.query.startDate) : void 0;
      const endDate = req.query.endDate ? String(req.query.endDate) : void 0;
      const [ordersSnap, expensesSnap] = await Promise.all([
        db.collection("orders").get(),
        db.collection("expenses").get()
      ]);
      const orders = [];
      const expenses = [];
      if (ordersSnap && !ordersSnap.empty) ordersSnap.forEach((d) => orders.push(d.data()));
      if (expensesSnap && !expensesSnap.empty) expensesSnap.forEach((d) => expenses.push(d.data()));
      const metrics = calculateFinancialMetrics({
        orders,
        expenses,
        startDate,
        endDate,
        branchId: branchFilter
      });
      await logAuditEvent(
        user.uid,
        user.role,
        branchFilter,
        "financial_report_generated",
        "financial_analytics",
        "summary",
        true,
        {
          revenue: metrics.revenue,
          netIncomeAccrual: metrics.netIncomeAccrual,
          cashReceived: metrics.cashReceived,
          cashPaid: metrics.cashPaid
        },
        req
      );
      res.json({
        metrics,
        branchScope: branchFilter || "all_regional_branches"
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/finance/commodity-profitability", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (user.role !== "branch_manager" && user.role !== "regional_director" && user.role !== "super_admin") {
      res.status(403).json({ error: "Access Denied: Commodity profitability metrics require authorized staff role." });
      return;
    }
    try {
      const commodityParam = String(req.query.commodityType || "rice").toLowerCase();
      if (commodityParam !== "rice" && commodityParam !== "copra") {
        res.status(400).json({ error: "Invalid commodityType. Must be 'rice' or 'copra'." });
        return;
      }
      const branchFilter = user.role === "branch_manager" ? user.assignedBranchId || "daet" : req.query.branchId ? String(req.query.branchId) : null;
      const [ordersSnap, expensesSnap] = await Promise.all([
        db.collection("orders").get(),
        db.collection("expenses").get()
      ]);
      const orders = [];
      const expenses = [];
      if (ordersSnap && !ordersSnap.empty) ordersSnap.forEach((d) => orders.push(d.data()));
      if (expensesSnap && !expensesSnap.empty) expensesSnap.forEach((d) => expenses.push(d.data()));
      const profitability = calculateCommodityProfitability(
        expenses,
        orders,
        commodityParam,
        branchFilter
      );
      await logAuditEvent(
        user.uid,
        user.role,
        branchFilter,
        "commodity_profitability_queried",
        "agricultural_analytics",
        commodityParam,
        true,
        {
          volumeProcured: profitability.totalVolumeProcuredKg,
          volumeSold: profitability.totalVolumeSoldKg,
          wasp: profitability.weightedAverageSellingPrice,
          grossMargin: profitability.grossMarginPercent
        },
        req
      );
      res.json({
        commodityType: commodityParam,
        profitability,
        branchScope: branchFilter || "all_regional_branches"
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  async function ensureInventorySeeded() {
    const batchesSnap = await db.collection("branch_batch_inventory").get();
    let batches = [];
    if (!batchesSnap || batchesSnap.empty) {
      for (const batch of SEED_BRANCH_BATCH_INVENTORY) {
        await db.collection("branch_batch_inventory").doc(batch.id).set(batch);
        batches.push(batch);
      }
      for (const pb of SEED_PRODUCT_BATCHES) {
        await db.collection("product_batches").doc(pb.id).set(pb);
      }
    } else {
      batchesSnap.forEach((d) => batches.push(d.data()));
    }
    const invSnap = await db.collection("inventory").get();
    let inventory = [];
    if (!invSnap || invSnap.empty) {
      for (const branchId of SUPPORTED_BRANCH_IDS) {
        for (const skuId of ACTIVE_CONSUMER_SKUS) {
          const agg = computeAggregateInventoryFromBatches({
            branchBatches: batches,
            branchId,
            skuId
          });
          await db.collection("inventory").doc(agg.id).set(agg);
          inventory.push(agg);
        }
      }
    } else {
      invSnap.forEach((d) => inventory.push(d.data()));
    }
    return { batches, inventory };
  }
  app.get("/api/inventory", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (user.role !== "branch_manager" && user.role !== "regional_director" && user.role !== "super_admin") {
      res.status(403).json({ error: "Access Denied: Inventory access requires authorized staff role." });
      return;
    }
    const requestedBranch = req.query.branchId ? String(req.query.branchId).toLowerCase().trim() : null;
    if (user.role === "branch_manager") {
      const assigned = (user.assignedBranchId || "daet").toLowerCase().trim();
      if (requestedBranch && requestedBranch !== assigned) {
        await logAuditEvent(
          user.uid,
          user.role,
          requestedBranch,
          "unauthorized_cross_branch_inventory_access_blocked",
          "inventory",
          null,
          false,
          { requestedBranch, assignedBranch: assigned },
          req
        );
        res.status(403).json({ error: "Access Denied: Branch managers cannot access inventory records of other branches." });
        return;
      }
    }
    try {
      const branchFilter = user.role === "branch_manager" ? (user.assignedBranchId || "daet").toLowerCase().trim() : requestedBranch;
      const { inventory } = await ensureInventorySeeded();
      const filtered = branchFilter ? inventory.filter((item) => item.branchId.toLowerCase() === branchFilter) : inventory;
      res.json({
        inventory: filtered,
        branchScope: branchFilter || "all_regional_branches"
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/inventory/batches", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (user.role !== "branch_manager" && user.role !== "regional_director" && user.role !== "super_admin") {
      res.status(403).json({ error: "Access Denied: Batch inventory access requires authorized staff role." });
      return;
    }
    const requestedBranch = req.query.branchId ? String(req.query.branchId).toLowerCase().trim() : null;
    if (user.role === "branch_manager") {
      const assigned = (user.assignedBranchId || "daet").toLowerCase().trim();
      if (requestedBranch && requestedBranch !== assigned) {
        await logAuditEvent(
          user.uid,
          user.role,
          requestedBranch,
          "unauthorized_cross_branch_batch_inventory_access_blocked",
          "branch_batch_inventory",
          null,
          false,
          { requestedBranch, assignedBranch: assigned },
          req
        );
        res.status(403).json({ error: "Access Denied: Branch managers cannot access batch records of other branches." });
        return;
      }
    }
    try {
      const branchFilter = user.role === "branch_manager" ? (user.assignedBranchId || "daet").toLowerCase().trim() : requestedBranch;
      const { batches } = await ensureInventorySeeded();
      const filtered = branchFilter ? batches.filter((b) => b.branchId.toLowerCase() === branchFilter) : batches;
      res.json({
        batches: filtered,
        branchScope: branchFilter || "all_regional_branches"
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/inventory/adjustments", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (user.role !== "branch_manager" && user.role !== "regional_director" && user.role !== "super_admin") {
      res.status(403).json({ error: "Access Denied: Recording stock adjustments requires authorized staff role." });
      return;
    }
    const { branchId, skuId, batchId, adjustmentType, quantityDelta, reason } = req.body;
    if (!branchId || typeof branchId !== "string") {
      res.status(400).json({ error: "Missing or invalid branchId." });
      return;
    }
    const normalizedBranch = branchId.toLowerCase().trim();
    if (!SUPPORTED_BRANCH_IDS.includes(normalizedBranch)) {
      res.status(400).json({ error: `Invalid branchId: '${branchId}'. Must be one of: ${SUPPORTED_BRANCH_IDS.join(", ")}` });
      return;
    }
    if (user.role === "branch_manager") {
      const assigned = (user.assignedBranchId || "daet").toLowerCase().trim();
      if (normalizedBranch !== assigned) {
        await logAuditEvent(
          user.uid,
          user.role,
          normalizedBranch,
          "unauthorized_cross_branch_inventory_adjustment_blocked",
          "inventory",
          null,
          false,
          { targetBranch: normalizedBranch, assignedBranch: assigned },
          req
        );
        res.status(403).json({ error: "Access Denied: Branch managers cannot adjust inventory for other branches." });
        return;
      }
    }
    if (!skuId || !ACTIVE_CONSUMER_SKUS.includes(skuId)) {
      res.status(400).json({ error: `Invalid skuId: '${skuId}'. Must be one of: ${ACTIVE_CONSUMER_SKUS.join(", ")}` });
      return;
    }
    if (!batchId || typeof batchId !== "string" || batchId.trim().length === 0) {
      res.status(400).json({ error: "Missing or invalid batchId." });
      return;
    }
    if (!adjustmentType || !VALID_INVENTORY_ADJUSTMENT_TYPES.includes(adjustmentType)) {
      res.status(400).json({ error: `Invalid adjustmentType: '${adjustmentType}'. Must be one of: ${VALID_INVENTORY_ADJUSTMENT_TYPES.join(", ")}` });
      return;
    }
    const delta = Number(quantityDelta);
    if (!Number.isInteger(delta) || delta === 0) {
      res.status(400).json({ error: "quantityDelta must be a non-zero integer." });
      return;
    }
    if (!reason || typeof reason !== "string" || reason.trim().length < 5) {
      res.status(400).json({ error: "reason must be a valid descriptive string of at least 5 characters." });
      return;
    }
    try {
      await ensureInventorySeeded();
      const batchDocId = `${normalizedBranch}_${batchId.trim()}`;
      const batchDocRef = db.collection("branch_batch_inventory").doc(batchDocId);
      const aggDocRef = db.collection("inventory").doc(`${normalizedBranch}_${skuId}`);
      const adjId = `ADJ-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10).replace(/-/g, "")}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
      const adjDocRef = db.collection("inventory_adjustments").doc(adjId);
      let adjustmentResult;
      await db.runTransaction(async (transaction) => {
        const batchSnap = await transaction.get(batchDocRef);
        let batchData;
        if (!batchSnap.exists) {
          const seedMatch = SEED_BRANCH_BATCH_INVENTORY.find((b) => b.id === batchDocId);
          if (seedMatch) {
            batchData = { ...seedMatch };
          } else {
            batchData = {
              id: batchDocId,
              branchId: normalizedBranch,
              batchId: batchId.trim(),
              skuId,
              availableQuantity: 0,
              reservedQuantity: 0,
              damagedQuantity: 0,
              expiryDate: "2028-12-31",
              updatedAt: (/* @__PURE__ */ new Date()).toISOString()
            };
          }
        } else {
          batchData = batchSnap.data();
        }
        let newAvailable = Number(batchData.availableQuantity) || 0;
        let newDamaged = Number(batchData.damagedQuantity) || 0;
        if (adjustmentType === "count_reconciliation") {
          newAvailable += delta;
        } else if (adjustmentType === "damage_writeoff") {
          if (delta <= 0) {
            throw new Error("INVALID_DELTA: damage_writeoff quantityDelta must be positive representing damaged unit count.");
          }
          newAvailable -= delta;
          newDamaged += delta;
        } else if (adjustmentType === "sample_withdrawal" || adjustmentType === "shrinkage_loss") {
          if (delta <= 0) {
            throw new Error(`INVALID_DELTA: ${adjustmentType} quantityDelta must be positive representing reduction count.`);
          }
          newAvailable -= delta;
        } else if (adjustmentType === "qc_quarantine") {
          if (delta <= 0) {
            throw new Error("INVALID_DELTA: qc_quarantine quantityDelta must be positive representing quarantined count.");
          }
          newAvailable -= delta;
          newDamaged += delta;
        }
        if (newAvailable < 0) {
          throw new Error(`INSUFFICIENT_STOCK: Current available: ${batchData.availableQuantity}, requested reduction: ${Math.abs(delta)}.`);
        }
        const updatedBatch = {
          ...batchData,
          availableQuantity: newAvailable,
          damagedQuantity: newDamaged,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        const branchBatchesQuery = db.collection("branch_batch_inventory").where("branchId", "==", normalizedBranch).where("skuId", "==", skuId);
        const branchBatchesSnap = await transaction.get(branchBatchesQuery);
        const branchBatches = [];
        if (branchBatchesSnap && !branchBatchesSnap.empty) {
          branchBatchesSnap.forEach((d) => {
            if (d.id !== batchDocId) {
              branchBatches.push(d.data());
            }
          });
        }
        branchBatches.push(updatedBatch);
        const updatedAggregate = computeAggregateInventoryFromBatches({
          branchBatches,
          branchId: normalizedBranch,
          skuId,
          lastAdjustmentAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        const adjustmentRecord = {
          id: adjId,
          branchId: normalizedBranch,
          skuId,
          batchId: batchId.trim(),
          adjustmentType,
          quantityDelta: delta,
          reason: reason.trim(),
          performedByUid: user.uid,
          performedByName: user.email || user.uid,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
        transaction.set(batchDocRef, updatedBatch);
        transaction.set(aggDocRef, updatedAggregate);
        transaction.set(adjDocRef, adjustmentRecord);
        adjustmentResult = { adjustmentRecord, updatedBatch, updatedAggregate };
      });
      await logAuditEvent(
        user.uid,
        user.role,
        normalizedBranch,
        "inventory_adjustment_recorded",
        "inventory",
        adjId,
        true,
        {
          skuId,
          batchId: batchId.trim(),
          adjustmentType,
          quantityDelta: delta,
          newAvailableStock: adjustmentResult.updatedAggregate.activeStock,
          newReservedStock: adjustmentResult.updatedAggregate.reservedStock,
          reason: reason.trim()
        },
        req
      );
      res.status(201).json({
        adjustment: adjustmentResult.adjustmentRecord,
        updatedBatch: adjustmentResult.updatedBatch,
        updatedAggregate: adjustmentResult.updatedAggregate
      });
    } catch (err) {
      if (err.message.startsWith("INVALID_DELTA:") || err.message.startsWith("INSUFFICIENT_STOCK:")) {
        res.status(400).json({ error: err.message.replace(/^(INVALID_DELTA|INSUFFICIENT_STOCK):\s*/, "") });
        return;
      }
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/inventory/adjustments", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (user.role !== "branch_manager" && user.role !== "regional_director" && user.role !== "super_admin") {
      res.status(403).json({ error: "Access Denied: Viewing adjustments requires authorized staff role." });
      return;
    }
    const requestedBranch = req.query.branchId ? String(req.query.branchId).toLowerCase().trim() : null;
    if (user.role === "branch_manager") {
      const assigned = (user.assignedBranchId || "daet").toLowerCase().trim();
      if (requestedBranch && requestedBranch !== assigned) {
        res.status(403).json({ error: "Access Denied: Branch managers cannot access adjustments of other branches." });
        return;
      }
    }
    try {
      const branchFilter = user.role === "branch_manager" ? (user.assignedBranchId || "daet").toLowerCase().trim() : requestedBranch;
      const adjustmentsSnap = await db.collection("inventory_adjustments").get();
      const adjustments = [];
      if (adjustmentsSnap && !adjustmentsSnap.empty) {
        adjustmentsSnap.forEach((d) => adjustments.push(d.data()));
      }
      const filtered = branchFilter ? adjustments.filter((a) => a.branchId.toLowerCase() === branchFilter) : adjustments;
      res.json({
        adjustments: filtered,
        branchScope: branchFilter || "all_regional_branches"
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/inventory/reconciliation", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (user.role !== "branch_manager" && user.role !== "regional_director" && user.role !== "super_admin") {
      res.status(403).json({ error: "Access Denied: Stock reconciliation requires authorized staff role." });
      return;
    }
    const requestedBranch = req.query.branchId ? String(req.query.branchId).toLowerCase().trim() : null;
    if (user.role === "branch_manager") {
      const assigned = (user.assignedBranchId || "daet").toLowerCase().trim();
      if (requestedBranch && requestedBranch !== assigned) {
        res.status(403).json({ error: "Access Denied: Branch managers cannot reconcile inventory of other branches." });
        return;
      }
    }
    try {
      const branchFilter = user.role === "branch_manager" ? (user.assignedBranchId || "daet").toLowerCase().trim() : requestedBranch;
      const { batches, inventory } = await ensureInventorySeeded();
      const reconciliation = verifyInventoryReconciliation({
        branchBatches: batches,
        aggregateInventory: inventory,
        branchId: branchFilter
      });
      await logAuditEvent(
        user.uid,
        user.role,
        branchFilter,
        "inventory_reconciliation_queried",
        "inventory",
        "reconciliation_report",
        true,
        {
          allConsistent: reconciliation.allConsistent,
          recordsChecked: reconciliation.totalRecordsChecked
        },
        req
      );
      res.json({
        reconciliation,
        branchScope: branchFilter || "all_regional_branches"
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/branch-inventory/:branchId", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (user.role !== "branch_manager" && user.role !== "regional_director" && user.role !== "super_admin") {
      await logAuditEvent(
        user.uid,
        user.role,
        String(req.params.branchId || "daet").toLowerCase().trim(),
        "unauthorized_legacy_inventory_access_blocked",
        "branch_inventory",
        null,
        false,
        { requestedBranch: req.params.branchId, userRole: user.role },
        req
      );
      res.status(403).json({ error: "Access Denied: Legacy inventory adapter requires authorized staff role." });
      return;
    }
    const branchId = String(req.params.branchId || "").toLowerCase().trim();
    if (user.role === "branch_manager") {
      const assigned = (user.assignedBranchId || "daet").toLowerCase().trim();
      if (branchId && branchId !== assigned) {
        await logAuditEvent(
          user.uid,
          user.role,
          branchId,
          "unauthorized_cross_branch_legacy_inventory_access_blocked",
          "branch_inventory",
          null,
          false,
          { requestedBranch: branchId, assignedBranch: assigned },
          req
        );
        res.status(403).json({ error: "Access Denied: Branch managers cannot access inventory of other branches." });
        return;
      }
    }
    res.setHeader("X-Deprecated", "Superseded by /api/inventory in Phase 7");
    try {
      const { inventory } = await ensureInventorySeeded();
      const branchItems = inventory.filter((item) => item.branchId.toLowerCase() === branchId);
      const totalStock = branchItems.reduce((sum, item) => sum + item.activeStock, 0);
      res.json({
        branchId,
        stockCount: totalStock,
        isDeprecatedScaffold: true,
        recommendedEndpoint: "/api/inventory",
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/inventory/reservations", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (user.role !== "branch_manager" && user.role !== "regional_director" && user.role !== "super_admin") {
      await logAuditEvent(
        user.uid,
        user.role,
        String(req.body?.branchId || "daet").toLowerCase().trim(),
        "inventory_reservation_unauthorized_role_blocked",
        "inventory",
        null,
        false,
        { userRole: user.role },
        req
      );
      res.status(403).json({ error: "Access Denied: Inventory reservation requires authorized staff role (branch_manager, regional_director, super_admin)." });
      return;
    }
    const { branchId, skuId, requestedQuantity } = req.body;
    if (!branchId || typeof branchId !== "string") {
      res.status(400).json({ error: "Missing or invalid branchId." });
      return;
    }
    const normalizedBranch = branchId.toLowerCase().trim();
    if (!SUPPORTED_BRANCH_IDS.includes(normalizedBranch)) {
      res.status(400).json({ error: `Invalid branchId: '${branchId}'. Must be one of: ${SUPPORTED_BRANCH_IDS.join(", ")}` });
      return;
    }
    if (user.role === "branch_manager") {
      const assigned = (user.assignedBranchId || "daet").toLowerCase().trim();
      if (normalizedBranch !== assigned) {
        await logAuditEvent(
          user.uid,
          user.role,
          normalizedBranch,
          "inventory_reservation_unauthorized_branch_blocked",
          "inventory",
          null,
          false,
          { targetBranch: normalizedBranch, assignedBranch: assigned },
          req
        );
        res.status(403).json({ error: "Access Denied: Branch managers cannot reserve inventory for other branches." });
        return;
      }
    }
    if (!skuId || !ACTIVE_CONSUMER_SKUS.includes(skuId)) {
      res.status(400).json({ error: `Invalid skuId: '${skuId}'. Must be one of: ${ACTIVE_CONSUMER_SKUS.join(", ")}` });
      return;
    }
    const reqQty = Number(requestedQuantity);
    if (!Number.isInteger(reqQty) || reqQty <= 0) {
      res.status(400).json({ error: "requestedQuantity must be a positive integer greater than zero." });
      return;
    }
    try {
      await ensureInventorySeeded();
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      let reservationResult;
      await db.runTransaction(async (transaction) => {
        reservationResult = await performFefoReservationInternal(
          transaction,
          normalizedBranch,
          skuId,
          reqQty,
          nowIso
        );
      });
      await logAuditEvent(
        user.uid,
        user.role,
        normalizedBranch,
        "inventory_reservation_recorded",
        "inventory",
        `${normalizedBranch}_${skuId}`,
        true,
        {
          skuId,
          requestedQuantity: reqQty,
          allocations: reservationResult.allocations,
          remainingAvailable: reservationResult.remainingAvailableQuantity
        },
        req
      );
      res.status(201).json(reservationResult);
    } catch (err) {
      if (err.message.startsWith("INSUFFICIENT_ELIGIBLE_STOCK:")) {
        res.status(400).json({ error: err.message.replace(/^INSUFFICIENT_ELIGIBLE_STOCK:\s*/, "") });
        return;
      }
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/orders/:orderId/fulfill", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (user.role !== "branch_manager" && user.role !== "regional_director" && user.role !== "super_admin") {
      await logAuditEvent(
        user.uid,
        user.role,
        null,
        "unauthorized_order_fulfillment_blocked",
        "orders",
        String(req.params.orderId || ""),
        false,
        { userRole: user.role },
        req
      );
      res.status(403).json({ error: "Access Denied: Order fulfillment requires authorized staff role." });
      return;
    }
    const { orderId } = req.params;
    const strOrderId = String(orderId || "");
    if (!strOrderId) {
      res.status(400).json({ error: "orderId is required." });
      return;
    }
    try {
      const orderRef = db.collection("orders").doc(strOrderId);
      const orderSnap = await orderRef.get();
      if (!orderSnap.exists) {
        res.status(404).json({ error: `Order not found: ${strOrderId}` });
        return;
      }
      const orderData = orderSnap.data();
      const normalizedBranch = (orderData.branchId || "daet").toLowerCase().trim();
      if (user.role === "branch_manager") {
        const assigned = (user.assignedBranchId || "daet").toLowerCase().trim();
        if (normalizedBranch !== assigned) {
          await logAuditEvent(
            user.uid,
            user.role,
            normalizedBranch,
            "unauthorized_cross_branch_order_fulfillment_blocked",
            "orders",
            strOrderId,
            false,
            { targetBranch: normalizedBranch, assignedBranch: assigned },
            req
          );
          res.status(403).json({ error: "Access Denied: Branch managers cannot fulfill orders of other branches." });
          return;
        }
      }
      if (orderData.stockistId) {
        const stockistRef = db.collection("b2b_stockists").doc(orderData.stockistId);
        const stockistSnap = await stockistRef.get();
        if (stockistSnap.exists) {
          const stockistData = stockistSnap.data();
          if (stockistData.status === "locked" || stockistData.status === "suspended") {
            await logAuditEvent(
              user.uid,
              user.role,
              normalizedBranch,
              "b2b_dispatch_blocked_account_locked",
              "orders",
              strOrderId,
              false,
              { stockistId: orderData.stockistId, status: stockistData.status },
              req
            );
            res.status(403).json({ error: `DISPATCH_BLOCKED: Stockist account ${orderData.stockistId} is locked. Dispatch not permitted.` });
            return;
          }
        }
      }
      if (orderData.fulfillmentStatus === "fulfilled" || orderData.fulfillmentStatus === "completed") {
        res.status(200).json({ success: true, alreadyFulfilled: true, orderId: strOrderId, order: orderData });
        return;
      }
      const batchAllocations = orderData.batchAllocations || {};
      if (!batchAllocations || Object.keys(batchAllocations).length === 0) {
        res.status(400).json({ error: "Order has no reserved batch allocations to fulfill." });
        return;
      }
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      const createdAllocations = [];
      await db.runTransaction(async (transaction) => {
        const txOrderSnap = await transaction.get(orderRef);
        const txOrderData = txOrderSnap.data();
        if (txOrderData.fulfillmentStatus === "fulfilled" || txOrderData.fulfillmentStatus === "completed") {
          return;
        }
        const allocationsMap = txOrderData.batchAllocations || {};
        const affectedSkus = /* @__PURE__ */ new Set();
        const updatedBatches = [];
        for (const [skuId, allocList] of Object.entries(allocationsMap)) {
          if (!Array.isArray(allocList)) continue;
          affectedSkus.add(skuId);
          for (const alloc of allocList) {
            const batchId = alloc.batchId;
            const qtyReserved = Number(alloc.quantityReserved || alloc.allocatedQuantity) || 0;
            if (!batchId || qtyReserved <= 0) continue;
            const branchBatchDocId = `${normalizedBranch}_${batchId}`;
            const branchBatchRef = db.collection("branch_batch_inventory").doc(branchBatchDocId);
            const batchSnap = await transaction.get(branchBatchRef);
            if (!batchSnap.exists) {
              throw new Error(`BATCH_NOT_FOUND: Branch batch ${branchBatchDocId} not found.`);
            }
            const bData = batchSnap.data();
            const currentReserved = Number(bData.reservedQuantity) || 0;
            if (currentReserved < qtyReserved) {
              throw new Error(`INSUFFICIENT_RESERVED_STOCK: Batch ${branchBatchDocId} has reserved quantity ${currentReserved}, but fulfillment requires ${qtyReserved}.`);
            }
            const newReserved = currentReserved - qtyReserved;
            const updatedBatch = {
              ...bData,
              reservedQuantity: newReserved,
              updatedAt: nowIso
            };
            transaction.set(branchBatchRef, updatedBatch);
            updatedBatches.push(updatedBatch);
            const allocationId = `BALLOC-${strOrderId}-${batchId}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
            const allocationRecord = {
              id: allocationId,
              orderId: strOrderId,
              batchId,
              skuId,
              branchId: normalizedBranch,
              customerUid: txOrderData.userId || txOrderData.customer?.uid || "customer-anonymous",
              allocatedQuantity: qtyReserved,
              allocatedAt: nowIso
            };
            const allocDocRef = db.collection("batch_allocations").doc(allocationId);
            transaction.set(allocDocRef, allocationRecord);
            createdAllocations.push(allocationRecord);
          }
        }
        const updatedOrder = {
          ...txOrderData,
          fulfillmentStatus: "fulfilled",
          fulfilledAt: nowIso,
          updatedAt: nowIso
        };
        transaction.set(orderRef, updatedOrder);
        for (const skuId of affectedSkus) {
          const batchesQuery = db.collection("branch_batch_inventory").where("branchId", "==", normalizedBranch).where("skuId", "==", skuId);
          const batchesSnap = await transaction.get(batchesQuery);
          const allBatches = [];
          if (batchesSnap && !batchesSnap.empty) {
            batchesSnap.forEach((d) => {
              const data = d.data();
              const modified = updatedBatches.find((ub) => ub.id === data.id);
              allBatches.push(modified || data);
            });
          }
          const updatedAggregate = computeAggregateInventoryFromBatches({
            branchBatches: allBatches,
            branchId: normalizedBranch,
            skuId,
            lastAdjustmentAt: nowIso
          });
          const aggDocRef = db.collection("inventory").doc(`${normalizedBranch}_${skuId}`);
          transaction.set(aggDocRef, updatedAggregate);
        }
      });
      await logAuditEvent(
        user.uid,
        user.role,
        normalizedBranch,
        "order_fulfilled",
        "orders",
        strOrderId,
        true,
        { allocationsCount: createdAllocations.length },
        req
      );
      res.status(200).json({ success: true, orderId: strOrderId, allocationsCreated: createdAllocations });
    } catch (err) {
      res.status(500).json({ error: `Fulfillment failed: ${err.message}` });
    }
  });
  app.get("/api/inventory/recall", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (user.role !== "branch_manager" && user.role !== "regional_director" && user.role !== "super_admin") {
      await logAuditEvent(
        user.uid,
        user.role,
        null,
        "unauthorized_batch_recall_blocked",
        "batch_allocations",
        null,
        false,
        { userRole: user.role },
        req
      );
      res.status(403).json({ error: "Access Denied: Batch recall traversal requires authorized staff role." });
      return;
    }
    const batchIdParam = req.query.batchId ? String(req.query.batchId).trim() : null;
    const batchNumberParam = req.query.batchNumber ? String(req.query.batchNumber).trim() : null;
    if (!batchIdParam && !batchNumberParam) {
      res.status(400).json({ error: "Either batchId or batchNumber query parameter is required for recall traversal." });
      return;
    }
    try {
      let targetBatchId = batchIdParam;
      if (!targetBatchId && batchNumberParam) {
        const pbSnap = await db.collection("product_batches").where("batchNumber", "==", batchNumberParam).get();
        if (!pbSnap.empty) {
          targetBatchId = pbSnap.docs[0].id;
        } else {
          const allPbSnap = await db.collection("product_batches").get();
          if (!allPbSnap.empty) {
            allPbSnap.forEach((d) => {
              if (d.data().batchNumber === batchNumberParam) {
                targetBatchId = d.id;
              }
            });
          }
        }
      }
      const queryBatchId = targetBatchId || batchNumberParam;
      const allocSnap = await db.collection("batch_allocations").where("batchId", "==", queryBatchId).get();
      const allocations = [];
      if (!allocSnap.empty) {
        allocSnap.forEach((d) => allocations.push(d.data()));
      }
      if (allocations.length === 0 && batchNumberParam) {
        const allAllocSnap = await db.collection("batch_allocations").get();
        if (!allAllocSnap.empty) {
          allAllocSnap.forEach((d) => {
            const data = d.data();
            if (data.batchId === batchNumberParam || data.batchNumber === batchNumberParam) {
              allocations.push(data);
            }
          });
        }
      }
      if (user.role === "branch_manager") {
        const assigned = (user.assignedBranchId || "daet").toLowerCase().trim();
        const unauthorized = allocations.some((a) => (a.branchId || "").toLowerCase().trim() !== assigned);
        if (unauthorized || allocations.length === 0 && req.query.branchId && String(req.query.branchId).toLowerCase().trim() !== assigned) {
          await logAuditEvent(
            user.uid,
            user.role,
            assigned,
            "unauthorized_cross_branch_batch_recall_blocked",
            "batch_allocations",
            queryBatchId,
            false,
            { queryBatchId, assignedBranch: assigned },
            req
          );
          res.status(403).json({ error: "Access Denied: Branch managers cannot access batch recall records of other branches." });
          return;
        }
      }
      const affectedOrders = allocations.map((a) => ({
        orderId: a.orderId,
        customerUid: a.customerUid,
        branchId: a.branchId,
        allocatedQuantity: a.allocatedQuantity,
        fulfillmentTimestamp: a.allocatedAt,
        skuId: a.skuId,
        batchId: a.batchId
      }));
      await logAuditEvent(
        user.uid,
        user.role,
        user.role === "branch_manager" ? user.assignedBranchId || null : null,
        "batch_recall_queried",
        "batch_allocations",
        queryBatchId,
        true,
        { queryBatchId, affectedRecordsCount: affectedOrders.length },
        req
      );
      res.status(200).json({
        batchId: queryBatchId,
        batchNumber: batchNumberParam,
        affectedCount: affectedOrders.length,
        affectedRecords: affectedOrders
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/inventory/transfers", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (user.role !== "branch_manager" && user.role !== "regional_director" && user.role !== "super_admin") {
      await logAuditEvent(
        user.uid,
        user.role,
        String(req.body?.sourceBranchId || ""),
        "stock_transfer_unauthorized_role_blocked",
        "stock_transfers",
        null,
        false,
        { userRole: user.role },
        req
      );
      res.status(403).json({ error: "Access Denied: Stock transfer initiation requires authorized staff role." });
      return;
    }
    const { sourceBranchId, destinationBranchId, skuId, batchId, quantity, idempotencyKey } = req.body;
    if (!sourceBranchId || !destinationBranchId || typeof sourceBranchId !== "string" || typeof destinationBranchId !== "string") {
      res.status(400).json({ error: "sourceBranchId and destinationBranchId are required strings." });
      return;
    }
    const srcBranch = sourceBranchId.toLowerCase().trim();
    const destBranch = destinationBranchId.toLowerCase().trim();
    if (!SUPPORTED_BRANCH_IDS.includes(srcBranch) || !SUPPORTED_BRANCH_IDS.includes(destBranch)) {
      res.status(400).json({ error: "Invalid source or destination branchId." });
      return;
    }
    if (srcBranch === destBranch) {
      res.status(400).json({ error: "Source branch and destination branch cannot be identical." });
      return;
    }
    if (user.role === "branch_manager") {
      const assigned = (user.assignedBranchId || "daet").toLowerCase().trim();
      if (srcBranch !== assigned) {
        await logAuditEvent(
          user.uid,
          user.role,
          srcBranch,
          "stock_transfer_unauthorized_source_branch_blocked",
          "stock_transfers",
          null,
          false,
          { sourceBranch: srcBranch, assignedBranch: assigned },
          req
        );
        res.status(403).json({ error: "Access Denied: Branch managers can only initiate transfers from their assigned branch." });
        return;
      }
    }
    if (!skuId || !ACTIVE_CONSUMER_SKUS.includes(skuId)) {
      res.status(400).json({ error: `Invalid skuId: '${skuId}'.` });
      return;
    }
    if (!batchId || typeof batchId !== "string" || !batchId.trim()) {
      res.status(400).json({ error: "batchId is required." });
      return;
    }
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      res.status(400).json({ error: "quantity must be a positive integer greater than zero." });
      return;
    }
    const cleanIdempotencyKey = idempotencyKey && typeof idempotencyKey === "string" && idempotencyKey.trim() ? idempotencyKey.trim() : null;
    if (!cleanIdempotencyKey) {
      res.status(400).json({ error: "idempotencyKey is required." });
      return;
    }
    try {
      await ensureInventorySeeded();
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      const transferId = `TRF-${Date.now().toString().slice(-6)}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
      const transferRef = db.collection("stock_transfers").doc(transferId);
      const branchBatchDocId = `${srcBranch}_${batchId.trim()}`;
      const branchBatchRef = db.collection("branch_batch_inventory").doc(branchBatchDocId);
      const aggDocRef = db.collection("inventory").doc(`${srcBranch}_${skuId}`);
      let transferRecord;
      await db.runTransaction(async (transaction) => {
        if (cleanIdempotencyKey) {
          const existingQuery = db.collection("stock_transfers").where("idempotencyKey", "==", cleanIdempotencyKey);
          const existingSnap = await transaction.get(existingQuery);
          if (!existingSnap.empty) {
            transferRecord = existingSnap.docs[0].data();
            return;
          }
        }
        const batchSnap = await transaction.get(branchBatchRef);
        if (!batchSnap.exists) {
          throw new Error(`BATCH_NOT_FOUND: Source batch ${branchBatchDocId} not found.`);
        }
        const bData = batchSnap.data();
        if (bData.skuId !== skuId) {
          throw new Error(`SKU_MISMATCH: Batch ${batchId} does not belong to SKU ${skuId}.`);
        }
        const currentAvail = Number(bData.availableQuantity) || 0;
        if (currentAvail < qty) {
          throw new Error(`INSUFFICIENT_STOCK: Source batch has ${currentAvail} available units, requested ${qty}.`);
        }
        const newAvail = currentAvail - qty;
        const updatedBatch = {
          ...bData,
          availableQuantity: newAvail,
          updatedAt: nowIso
        };
        const branchBatchesQuery = db.collection("branch_batch_inventory").where("branchId", "==", srcBranch).where("skuId", "==", skuId);
        const branchBatchesSnap = await transaction.get(branchBatchesQuery);
        const branchBatches = [];
        if (branchBatchesSnap && !branchBatchesSnap.empty) {
          branchBatchesSnap.forEach((d) => {
            if (d.id !== branchBatchDocId) branchBatches.push(d.data());
          });
        }
        branchBatches.push(updatedBatch);
        const updatedAggregate = computeAggregateInventoryFromBatches({
          branchBatches,
          branchId: srcBranch,
          skuId,
          lastAdjustmentAt: nowIso
        });
        transferRecord = {
          id: transferId,
          sourceBranchId: srcBranch,
          destinationBranchId: destBranch,
          skuId,
          batchId: batchId.trim(),
          shippedQuantity: qty,
          transitQuantity: qty,
          status: "IN_TRANSIT",
          idempotencyKey: cleanIdempotencyKey,
          initiatedByUid: user.uid,
          initiatedByName: user.email ? user.email.split("@")[0] : "Staff",
          initiatedAt: nowIso,
          updatedAt: nowIso
        };
        transaction.set(branchBatchRef, updatedBatch);
        transaction.set(aggDocRef, updatedAggregate);
        transaction.set(transferRef, transferRecord);
      });
      await logAuditEvent(
        user.uid,
        user.role,
        srcBranch,
        "stock_transfer_initiated",
        "stock_transfers",
        transferRecord.id,
        true,
        {
          sourceBranchId: srcBranch,
          destinationBranchId: destBranch,
          skuId,
          batchId: batchId.trim(),
          shippedQuantity: qty
        },
        req
      );
      res.status(201).json({ success: true, transfer: transferRecord });
    } catch (err) {
      if (err.message.startsWith("INSUFFICIENT_STOCK:") || err.message.startsWith("BATCH_NOT_FOUND:") || err.message.startsWith("SKU_MISMATCH:")) {
        res.status(400).json({ error: err.message.replace(/^(INSUFFICIENT_STOCK|BATCH_NOT_FOUND|SKU_MISMATCH):\s*/, "") });
        return;
      }
      res.status(500).json({ error: `Transfer initiation failed: ${err.message}` });
    }
  });
  app.get("/api/inventory/transfers", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (user.role !== "branch_manager" && user.role !== "regional_director" && user.role !== "super_admin") {
      res.status(403).json({ error: "Access Denied: Viewing stock transfers requires authorized staff role." });
      return;
    }
    try {
      const snap = await db.collection("stock_transfers").get();
      const transfers = [];
      if (snap && !snap.empty) {
        snap.forEach((d) => transfers.push(d.data()));
      }
      let filtered = transfers;
      if (user.role === "branch_manager") {
        const assigned = (user.assignedBranchId || "daet").toLowerCase().trim();
        filtered = transfers.filter((t) => t.sourceBranchId === assigned || t.destinationBranchId === assigned);
      }
      res.json({ transfers: filtered, count: filtered.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/inventory/transfers/:transferId", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (user.role !== "branch_manager" && user.role !== "regional_director" && user.role !== "super_admin") {
      res.status(403).json({ error: "Access Denied: Viewing stock transfer requires authorized staff role." });
      return;
    }
    const { transferId } = req.params;
    try {
      const doc = await db.collection("stock_transfers").doc(transferId).get();
      if (!doc.exists) {
        res.status(404).json({ error: `Transfer not found: ${transferId}` });
        return;
      }
      const transfer = doc.data();
      if (user.role === "branch_manager") {
        const assigned = (user.assignedBranchId || "daet").toLowerCase().trim();
        if (transfer.sourceBranchId !== assigned && transfer.destinationBranchId !== assigned) {
          res.status(403).json({ error: "Access Denied: Branch managers can only view transfers involving their assigned branch." });
          return;
        }
      }
      res.json({ transfer });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/inventory/transfers/:transferId/receive", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (user.role !== "branch_manager" && user.role !== "regional_director" && user.role !== "super_admin") {
      await logAuditEvent(
        user.uid,
        user.role,
        null,
        "stock_transfer_receive_unauthorized_role_blocked",
        "stock_transfers",
        req.params.transferId ? String(req.params.transferId) : null,
        false,
        { userRole: user.role },
        req
      );
      res.status(403).json({ error: "Access Denied: Receiving stock transfers requires authorized staff role." });
      return;
    }
    const { transferId } = req.params;
    const { receivedQuantity, condition } = req.body;
    try {
      const transferRef = db.collection("stock_transfers").doc(transferId);
      const transferSnap = await transferRef.get();
      if (!transferSnap.exists) {
        res.status(404).json({ error: `Transfer not found: ${transferId}` });
        return;
      }
      const transfer = transferSnap.data();
      const destBranch = transfer.destinationBranchId;
      if (user.role === "branch_manager") {
        const assigned = (user.assignedBranchId || "daet").toLowerCase().trim();
        if (destBranch !== assigned) {
          await logAuditEvent(
            user.uid,
            user.role,
            destBranch,
            "stock_transfer_receive_unauthorized_branch_blocked",
            "stock_transfers",
            String(transferId),
            false,
            { destinationBranch: destBranch, assignedBranch: assigned },
            req
          );
          res.status(403).json({ error: "Access Denied: Branch managers can only receive transfers into their assigned branch." });
          return;
        }
      }
      if (transfer.status !== "IN_TRANSIT") {
        res.status(400).json({ error: `Invalid state transition: Transfer is in status '${transfer.status}', expected 'IN_TRANSIT'.` });
        return;
      }
      const shippedQty = Number(transfer.shippedQuantity) || 0;
      let receivedQty = shippedQty;
      if (receivedQuantity !== void 0 && receivedQuantity !== null) {
        const parsed = Number(receivedQuantity);
        if (!Number.isInteger(parsed) || parsed < 0) {
          res.status(400).json({ error: "receivedQuantity must be a non-negative integer." });
          return;
        }
        if (parsed > shippedQty) {
          res.status(400).json({ error: `Over-receipt rejected: receivedQuantity (${parsed}) cannot exceed shippedQuantity (${shippedQty}).` });
          return;
        }
        receivedQty = parsed;
      }
      const diff = shippedQty - receivedQty;
      let newStatus = "RECEIVED_FULL";
      if (condition === "rejected_damaged" || receivedQuantity !== void 0 && receivedQty === 0 && condition !== "partial") {
        newStatus = "REJECTED_DAMAGED";
        receivedQty = 0;
      } else if (diff > 0) {
        newStatus = "RECEIVED_PARTIAL";
      }
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      const destBatchDocId = `${destBranch}_${transfer.batchId}`;
      const destBatchRef = db.collection("branch_batch_inventory").doc(destBatchDocId);
      const destAggRef = db.collection("inventory").doc(`${destBranch}_${transfer.skuId}`);
      let updatedTransfer;
      await db.runTransaction(async (transaction) => {
        const txTransferSnap = await transaction.get(transferRef);
        const txTransfer = txTransferSnap.data();
        if (txTransfer.status !== "IN_TRANSIT") {
          throw new Error("TRANSFER_NOT_IN_TRANSIT");
        }
        const destBatchSnap = await transaction.get(destBatchRef);
        let destBatchData = null;
        if (!destBatchSnap.exists) {
          const pbRef = db.collection("product_batches").doc(transfer.batchId);
          const pbSnap = await transaction.get(pbRef);
          if (!pbSnap || !pbSnap.exists) {
            throw new Error(`PRODUCT_BATCH_NOT_FOUND: Authoritative product batch ${transfer.batchId} not found.`);
          }
          const pbData = pbSnap.data();
          if (!pbData || !pbData.expiryDate || typeof pbData.expiryDate !== "string") {
            throw new Error(`INVALID_PRODUCT_BATCH_EXPIRY: Authoritative product batch ${transfer.batchId} has no valid expiryDate.`);
          }
          destBatchData = {
            id: destBatchDocId,
            branchId: destBranch,
            batchId: transfer.batchId,
            skuId: transfer.skuId,
            availableQuantity: receivedQty,
            reservedQuantity: 0,
            damagedQuantity: diff > 0 ? diff : 0,
            expiryDate: pbData.expiryDate,
            updatedAt: nowIso
          };
        } else {
          const bData = destBatchSnap.data();
          destBatchData = {
            ...bData,
            availableQuantity: (Number(bData.availableQuantity) || 0) + receivedQty,
            damagedQuantity: (Number(bData.damagedQuantity) || 0) + (diff > 0 ? diff : 0),
            updatedAt: nowIso
          };
        }
        transaction.set(destBatchRef, destBatchData);
        const destBatchesQuery = db.collection("branch_batch_inventory").where("branchId", "==", destBranch).where("skuId", "==", transfer.skuId);
        const destBatchesSnap = await transaction.get(destBatchesQuery);
        const destBatches = [];
        let foundExistingBatch = false;
        if (destBatchesSnap && !destBatchesSnap.empty) {
          destBatchesSnap.forEach((d) => {
            if (d.id === destBatchDocId) {
              foundExistingBatch = true;
              destBatches.push(destBatchData);
            } else {
              destBatches.push(d.data());
            }
          });
        }
        if (!foundExistingBatch && destBatchData) {
          destBatches.push(destBatchData);
        }
        const updatedAggregate = computeAggregateInventoryFromBatches({
          branchBatches: destBatches,
          branchId: destBranch,
          skuId: transfer.skuId,
          lastAdjustmentAt: nowIso
        });
        updatedTransfer = {
          ...txTransfer,
          status: newStatus,
          receivedQuantity: receivedQty,
          transitQuantity: 0,
          auditedLossQuantity: diff,
          receivedAt: nowIso,
          updatedAt: nowIso
        };
        transaction.set(destAggRef, updatedAggregate);
        transaction.set(transferRef, updatedTransfer);
      });
      await logAuditEvent(
        user.uid,
        user.role,
        destBranch,
        newStatus === "REJECTED_DAMAGED" ? "stock_transfer_rejected_damaged" : "stock_transfer_received",
        "stock_transfers",
        String(transferId),
        true,
        { status: newStatus, receivedQuantity: receivedQty, auditedLossQuantity: diff },
        req
      );
      res.status(200).json({ success: true, transfer: updatedTransfer });
    } catch (err) {
      if (err.message === "TRANSFER_NOT_IN_TRANSIT") {
        res.status(400).json({ error: "Transfer is no longer in transit." });
        return;
      }
      if (err.message.startsWith("PRODUCT_BATCH_NOT_FOUND:") || err.message.startsWith("INVALID_PRODUCT_BATCH_EXPIRY:")) {
        res.status(400).json({ error: err.message.replace(/^(PRODUCT_BATCH_NOT_FOUND|INVALID_PRODUCT_BATCH_EXPIRY):\s*/, "") });
        return;
      }
      res.status(500).json({ error: `Transfer receipt failed: ${err.message}` });
    }
  });
  app.post("/api/inventory/transfers/:transferId/reject-damaged", async (req, res) => {
    req.body.condition = "rejected_damaged";
    req.body.receivedQuantity = 0;
    return app._router.stack.find((r) => r.route && r.route.path === "/api/inventory/transfers/:transferId/receive")?.handle(req, res);
  });
  app.post("/api/inventory/transfers/:transferId/cancel", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (user.role !== "branch_manager" && user.role !== "regional_director" && user.role !== "super_admin") {
      res.status(403).json({ error: "Access Denied: Cancelling transfers requires authorized staff role." });
      return;
    }
    const { transferId } = req.params;
    try {
      const transferRef = db.collection("stock_transfers").doc(transferId);
      const transferSnap = await transferRef.get();
      if (!transferSnap.exists) {
        res.status(404).json({ error: `Transfer not found: ${transferId}` });
        return;
      }
      const transfer = transferSnap.data();
      const srcBranch = transfer.sourceBranchId;
      if (user.role === "branch_manager") {
        const assigned = (user.assignedBranchId || "daet").toLowerCase().trim();
        if (transfer.sourceBranchId !== assigned) {
          res.status(403).json({ error: "Access Denied: Branch managers can only cancel transfers originating from their assigned branch." });
          return;
        }
      }
      if (transfer.status !== "IN_TRANSIT") {
        res.status(400).json({ error: `Cannot cancel transfer in status '${transfer.status}'. Only IN_TRANSIT transfers can be cancelled.` });
        return;
      }
      const transitQty = Number(transfer.transitQuantity || transfer.shippedQuantity) || 0;
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      const branchBatchDocId = `${srcBranch}_${transfer.batchId}`;
      const branchBatchRef = db.collection("branch_batch_inventory").doc(branchBatchDocId);
      const aggDocRef = db.collection("inventory").doc(`${srcBranch}_${transfer.skuId}`);
      let updatedTransfer;
      await db.runTransaction(async (transaction) => {
        const txTransferSnap = await transaction.get(transferRef);
        const txTransfer = txTransferSnap.data();
        if (txTransfer.status !== "IN_TRANSIT") {
          throw new Error("TRANSFER_NOT_IN_TRANSIT");
        }
        const batchSnap = await transaction.get(branchBatchRef);
        if (!batchSnap.exists) {
          throw new Error("SOURCE_BATCH_NOT_FOUND");
        }
        const bData = batchSnap.data();
        const newAvail = (Number(bData.availableQuantity) || 0) + transitQty;
        const updatedBatch = {
          ...bData,
          availableQuantity: newAvail,
          updatedAt: nowIso
        };
        transaction.set(branchBatchRef, updatedBatch);
        const branchBatchesQuery = db.collection("branch_batch_inventory").where("branchId", "==", srcBranch).where("skuId", "==", transfer.skuId);
        const branchBatchesSnap = await transaction.get(branchBatchesQuery);
        const branchBatches = [];
        if (branchBatchesSnap && !branchBatchesSnap.empty) {
          branchBatchesSnap.forEach((d) => {
            if (d.id !== branchBatchDocId) branchBatches.push(d.data());
          });
        }
        branchBatches.push(updatedBatch);
        const updatedAggregate = computeAggregateInventoryFromBatches({
          branchBatches,
          branchId: srcBranch,
          skuId: transfer.skuId,
          lastAdjustmentAt: nowIso
        });
        updatedTransfer = {
          ...txTransfer,
          status: "CANCELLED",
          transitQuantity: 0,
          cancelledAt: nowIso,
          updatedAt: nowIso
        };
        transaction.set(aggDocRef, updatedAggregate);
        transaction.set(transferRef, updatedTransfer);
      });
      await logAuditEvent(
        user.uid,
        user.role,
        srcBranch,
        "stock_transfer_cancelled",
        "stock_transfers",
        String(transferId),
        true,
        { transitQuantityReturned: transitQty },
        req
      );
      res.status(200).json({ success: true, transfer: updatedTransfer });
    } catch (err) {
      if (err.message === "TRANSFER_NOT_IN_TRANSIT") {
        res.status(400).json({ error: "Transfer is no longer in transit." });
        return;
      }
      res.status(500).json({ error: `Transfer cancellation failed: ${err.message}` });
    }
  });
  app.get("/api/inventory/forecasting/:branchId/:skuId", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    const { branchId, skuId } = req.params;
    const normalizedBranch = (String(branchId) || "").toLowerCase().trim();
    if (user.role !== "branch_manager" && user.role !== "regional_director" && user.role !== "super_admin") {
      res.status(403).json({ error: "Access Denied: Forecasting requires authorized staff role." });
      return;
    }
    if (user.role === "branch_manager" && String(user.assignedBranchId || "").toLowerCase().trim() !== normalizedBranch) {
      res.status(403).json({ error: "Access Denied: Branch managers can only view forecasting for their assigned branch." });
      return;
    }
    try {
      const now = /* @__PURE__ */ new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1e3);
      const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();
      const invRef = db.collection("inventory").doc(`${normalizedBranch}_${skuId}`);
      const invSnap = await invRef.get();
      if (!invSnap.exists) {
        res.status(404).json({ error: `Inventory record not found for branch ${normalizedBranch} and SKU ${skuId}.` });
        return;
      }
      const invData = invSnap.data();
      const ordersSnap = await db.collection("orders").where("branchId", "==", normalizedBranch).where("fulfillmentStatus", "==", "fulfilled").where("fulfilledAt", ">=", thirtyDaysAgoIso).get();
      let totalUnitsSold = 0;
      if (!ordersSnap.empty) {
        ordersSnap.forEach((doc) => {
          const order = doc.data();
          if (order.status === "cancelled" || order.status === "refunded") return;
          const items = order.items || [];
          for (const item of items) {
            if (item.skuId === skuId) {
              totalUnitsSold += Number(item.quantity) || 0;
            }
          }
        });
      }
      const logsSnap = await db.collection("audit_logs").where("branchId", "==", normalizedBranch).where("targetResource", "==", "inventory").get();
      let stockoutDays = 0;
      const relevantLogs = logsSnap.docs.map((d) => d.data()).filter((l) => {
        const meta = typeof l.metadata === "string" ? JSON.parse(l.metadata) : l.metadata || {};
        return meta.skuId === skuId && l.timestamp >= thirtyDaysAgoIso;
      }).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      if (relevantLogs.length > 0) {
        let lastTimestamp = thirtyDaysAgo;
        let lastStock = -1;
        for (const log of relevantLogs) {
          const meta = typeof log.metadata === "string" ? JSON.parse(log.metadata) : log.metadata || {};
          const currentLogTime = new Date(log.timestamp);
          const currentStock = Number(meta.newAvailableStock);
          if (lastStock === 0) {
            const diffMs = currentLogTime.getTime() - lastTimestamp.getTime();
            stockoutDays += diffMs / (1e3 * 60 * 60 * 24);
          }
          lastTimestamp = currentLogTime;
          lastStock = currentStock;
        }
        if (lastStock === 0) {
          const diffMs = now.getTime() - lastTimestamp.getTime();
          stockoutDays += diffMs / (1e3 * 60 * 60 * 24);
        }
      } else if (invData.activeStock === 0) {
        stockoutDays = 30;
      }
      stockoutDays = Math.min(29, Math.max(0, stockoutDays));
      const velocityDenominator = 30 - stockoutDays;
      const salesVelocity = totalUnitsSold / velocityDenominator;
      const daysOfStock = salesVelocity > 0 ? invData.activeStock / salesVelocity : null;
      const leadTime = invData.leadTimeDays || 3;
      const safetyStock = invData.safetyStock || 20;
      const reorderPoint = Math.ceil(salesVelocity * leadTime + safetyStock);
      const forecast = {
        branchId: normalizedBranch,
        skuId,
        currentStock: invData.activeStock,
        salesVelocity: Number(salesVelocity.toFixed(4)),
        totalUnitsSold,
        stockoutDays: Number(stockoutDays.toFixed(2)),
        daysOfStock: daysOfStock !== null ? Number(daysOfStock.toFixed(2)) : null,
        reorderPoint,
        leadTimeDays: leadTime,
        safetyStock,
        generatedAt: now.toISOString()
      };
      await logAuditEvent(
        user.uid,
        user.role,
        normalizedBranch,
        "forecasting_generated",
        "inventory",
        `${normalizedBranch}_${skuId}`,
        true,
        forecast,
        req
      );
      res.status(200).json({ success: true, forecast });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/b2b/orders/quote", async (req, res) => {
    const { tier, items } = req.body;
    if (!tier || !B2B_STOCKIST_TIERS[tier]) {
      res.status(400).json({ error: "Invalid or missing tier. Must be one of: tier_1, tier_2, tier_3" });
      return;
    }
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "items array must not be empty." });
      return;
    }
    for (const it of items) {
      if (!it.skuId || !PRODUCTS_CATALOG[it.skuId]) {
        res.status(400).json({ error: `Invalid SKU in items: ${it.skuId}` });
        return;
      }
      const qty = Number(it.quantity);
      if (!Number.isInteger(qty) || qty <= 0) {
        res.status(400).json({ error: `Invalid quantity for SKU: ${it.skuId}` });
        return;
      }
    }
    const pricing = calculateB2BWholesalePricing(tier, items);
    if (!pricing.isEligible) {
      res.status(400).json({
        error: `Minimum order requirement not met for ${pricing.tierConfig.name}: minimum ${pricing.minUnits} units required (received: ${pricing.totalUnits}).`,
        pricing
      });
      return;
    }
    res.status(200).json({ success: true, pricing });
  });
  app.post("/api/b2b/stockists", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (user.role !== "branch_manager" && user.role !== "regional_director" && user.role !== "super_admin") {
      res.status(403).json({ error: "Access Denied: B2B stockist creation requires authorized staff role." });
      return;
    }
    const {
      stockistId,
      businessName,
      contactEmail,
      contactPhone,
      branchId,
      tier,
      depositAmount = 0,
      creditMultiplier = 2,
      customCreditLimit,
      authorizedCustomerUid
    } = req.body;
    if (!businessName || typeof businessName !== "string") {
      res.status(400).json({ error: "businessName is required." });
      return;
    }
    if (!branchId || typeof branchId !== "string") {
      res.status(400).json({ error: "branchId is required." });
      return;
    }
    const normalizedBranch = branchId.toLowerCase().trim();
    if (!SUPPORTED_BRANCH_IDS.includes(normalizedBranch)) {
      res.status(400).json({ error: `Invalid branchId: ${branchId}. Must be one of: ${SUPPORTED_BRANCH_IDS.join(", ")}` });
      return;
    }
    if (user.role === "branch_manager") {
      const assigned = (user.assignedBranchId || "daet").toLowerCase().trim();
      if (normalizedBranch !== assigned) {
        await logAuditEvent(
          user.uid,
          user.role,
          normalizedBranch,
          "unauthorized_cross_branch_b2b_access_blocked",
          "b2b_stockists",
          null,
          false,
          { targetBranch: normalizedBranch, assignedBranch: assigned },
          req
        );
        res.status(403).json({ error: "Access Denied: Branch managers cannot create stockists for other branches." });
        return;
      }
    }
    const assignedTier = tier && B2B_STOCKIST_TIERS[tier] ? tier : "tier_1";
    const numDeposit = Math.max(0, Number(depositAmount) || 0);
    const numMult = Math.max(1, Number(creditMultiplier) || 2);
    const creditCalculations = calculateB2BCreditLimits(numDeposit, numMult, 0, customCreditLimit);
    const strStockistId = stockistId || `STK-${normalizedBranch.toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const stockistRef = db.collection("b2b_stockists").doc(strStockistId);
    let stockistProfile = {};
    let initialLedgerEntry = null;
    try {
      await db.runTransaction(async (transaction) => {
        const existingSnap = await transaction.get(stockistRef);
        if (existingSnap.exists) {
          throw new Error(`Stockist ${strStockistId} already exists.`);
        }
        stockistProfile = {
          id: strStockistId,
          businessName: businessName.trim(),
          contactEmail: (contactEmail || "").trim(),
          contactPhone: (contactPhone || "").trim(),
          branchId: normalizedBranch,
          tier: assignedTier,
          status: "active",
          depositBalance: creditCalculations.depositBalance,
          creditMultiplier: creditCalculations.creditMultiplier,
          creditLimit: creditCalculations.creditLimit,
          outstandingBalance: 0,
          availableCredit: creditCalculations.availableCredit,
          authorizedCustomerUid: authorizedCustomerUid ? authorizedCustomerUid.trim() : void 0,
          createdAt: nowIso,
          updatedAt: nowIso
        };
        transaction.set(stockistRef, stockistProfile);
        if (numDeposit > 0) {
          const ledgerId = `LEDGER-DEP-${Date.now()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
          initialLedgerEntry = {
            id: ledgerId,
            stockistId: strStockistId,
            branchId: normalizedBranch,
            type: "deposit",
            amount: numDeposit,
            previousDeposit: 0,
            depositAfter: numDeposit,
            previousOutstanding: 0,
            outstandingAfter: 0,
            notes: "Initial security deposit on registration",
            timestamp: nowIso,
            performedBy: user.uid
          };
          const ledgerRef = db.collection("b2b_ledger").doc(ledgerId);
          transaction.set(ledgerRef, initialLedgerEntry);
        }
      });
      await logAuditEvent(
        user.uid,
        user.role,
        normalizedBranch,
        "b2b_stockist_created",
        "b2b_stockists",
        strStockistId,
        true,
        {
          tier: assignedTier,
          depositBalance: stockistProfile.depositBalance,
          creditLimit: stockistProfile.creditLimit
        },
        req
      );
      res.status(201).json({ success: true, stockist: stockistProfile, initialLedgerEntry });
    } catch (err) {
      res.status(500).json({ error: `Stockist creation failed: ${err.message}` });
    }
  });
  app.get("/api/b2b/stockists/:stockistId", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    const { stockistId } = req.params;
    const strStockistId = String(stockistId || "");
    try {
      const stockistRef = db.collection("b2b_stockists").doc(strStockistId);
      const stockistSnap = await stockistRef.get();
      if (!stockistSnap.exists) {
        res.status(404).json({ error: `Stockist profile not found: ${strStockistId}` });
        return;
      }
      const stockist = stockistSnap.data();
      const normalizedBranch = (stockist.branchId || "daet").toLowerCase().trim();
      if (user.role === "customer") {
        if (!stockist.authorizedCustomerUid || stockist.authorizedCustomerUid !== user.uid) {
          await logAuditEvent(
            user.uid,
            user.role,
            normalizedBranch,
            "unauthorized_customer_b2b_stockist_view_blocked",
            "b2b_stockists",
            strStockistId,
            false,
            { authorizedCustomerUid: stockist.authorizedCustomerUid, requestUid: user.uid },
            req
          );
          res.status(403).json({ error: "Access Denied: Customer cannot view another stockist's B2B profile." });
          return;
        }
      }
      if (user.role === "practitioner") {
        res.status(403).json({ error: "Access Denied: Practitioners cannot access B2B stockist data." });
        return;
      }
      if (user.role === "branch_manager") {
        const assigned = (user.assignedBranchId || "daet").toLowerCase().trim();
        if (normalizedBranch !== assigned) {
          await logAuditEvent(
            user.uid,
            user.role,
            normalizedBranch,
            "unauthorized_cross_branch_b2b_access_blocked",
            "b2b_stockists",
            strStockistId,
            false,
            { targetBranch: normalizedBranch, assignedBranch: assigned },
            req
          );
          res.status(403).json({ error: "Access Denied: Branch managers cannot access stockists of other branches." });
          return;
        }
      }
      res.status(200).json({ success: true, stockist });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/b2b/stockists/:stockistId/deposits", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (user.role !== "branch_manager" && user.role !== "regional_director" && user.role !== "super_admin") {
      res.status(403).json({ error: "Access Denied: Recording security deposits requires staff role." });
      return;
    }
    const { stockistId } = req.params;
    const strStockistId = String(stockistId || "");
    const { amount, notes } = req.body;
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      res.status(400).json({ error: "Deposit amount must be a positive number." });
      return;
    }
    const stockistRef = db.collection("b2b_stockists").doc(strStockistId);
    let updatedProfile = {};
    let ledgerEntry = {};
    let normalizedBranch = "";
    try {
      await db.runTransaction(async (transaction) => {
        const stockistSnap = await transaction.get(stockistRef);
        if (!stockistSnap.exists) {
          throw new Error(`Stockist not found: ${strStockistId}`);
        }
        const stockist = stockistSnap.data();
        normalizedBranch = (stockist.branchId || "daet").toLowerCase().trim();
        if (user.role === "branch_manager") {
          const assigned = (user.assignedBranchId || "daet").toLowerCase().trim();
          if (normalizedBranch !== assigned) {
            throw new Error("Access Denied: Branch managers cannot update deposits for other branches.");
          }
        }
        const nowIso = (/* @__PURE__ */ new Date()).toISOString();
        const prevDeposit = Number(stockist.depositBalance) || 0;
        const newDeposit = prevDeposit + numAmount;
        const mult = Number(stockist.creditMultiplier) || 2;
        const newCreditLimit = newDeposit * mult;
        const currentOutstanding = Number(stockist.outstandingBalance) || 0;
        const newAvailableCredit = Math.max(0, newCreditLimit - currentOutstanding);
        updatedProfile = {
          ...stockist,
          depositBalance: newDeposit,
          creditLimit: newCreditLimit,
          availableCredit: newAvailableCredit,
          updatedAt: nowIso
        };
        transaction.set(stockistRef, updatedProfile);
        const ledgerId = `LEDGER-DEP-${Date.now()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
        ledgerEntry = {
          id: ledgerId,
          stockistId: strStockistId,
          branchId: normalizedBranch,
          type: "deposit",
          amount: numAmount,
          previousDeposit: prevDeposit,
          depositAfter: newDeposit,
          previousOutstanding: currentOutstanding,
          outstandingAfter: currentOutstanding,
          notes: notes || "Security deposit balance addition",
          timestamp: nowIso,
          performedBy: user.uid
        };
        const ledgerRef = db.collection("b2b_ledger").doc(ledgerId);
        transaction.set(ledgerRef, ledgerEntry);
      });
      await logAuditEvent(
        user.uid,
        user.role,
        normalizedBranch,
        "b2b_deposit_recorded",
        "b2b_stockists",
        strStockistId,
        true,
        { amount: numAmount, newDeposit: updatedProfile.depositBalance, newCreditLimit: updatedProfile.creditLimit },
        req
      );
      res.status(200).json({ success: true, stockist: updatedProfile, ledgerEntry });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/b2b/stockists/:stockistId/payments", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (user.role !== "branch_manager" && user.role !== "regional_director" && user.role !== "super_admin") {
      res.status(403).json({ error: "Access Denied: Recording consignment payments requires staff role." });
      return;
    }
    const { stockistId } = req.params;
    const strStockistId = String(stockistId || "");
    const { amount, notes } = req.body;
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      res.status(400).json({ error: "Payment amount must be a positive number." });
      return;
    }
    const stockistRef = db.collection("b2b_stockists").doc(strStockistId);
    let updatedProfile = {};
    let ledgerEntry = {};
    let normalizedBranch = "";
    try {
      await db.runTransaction(async (transaction) => {
        const stockistSnap = await transaction.get(stockistRef);
        if (!stockistSnap.exists) {
          throw new Error(`Stockist not found: ${strStockistId}`);
        }
        const stockist = stockistSnap.data();
        normalizedBranch = (stockist.branchId || "daet").toLowerCase().trim();
        if (user.role === "branch_manager") {
          const assigned = (user.assignedBranchId || "daet").toLowerCase().trim();
          if (normalizedBranch !== assigned) {
            throw new Error("Access Denied: Branch managers cannot record payments for other branches.");
          }
        }
        const nowIso = (/* @__PURE__ */ new Date()).toISOString();
        const prevOutstanding = Number(stockist.outstandingBalance) || 0;
        const newOutstanding = Math.max(0, prevOutstanding - numAmount);
        const creditLimit = Number(stockist.creditLimit) || 0;
        const newAvailableCredit = Math.max(0, creditLimit - newOutstanding);
        let newStatus = stockist.status;
        if (newStatus === "locked" && newOutstanding <= creditLimit) {
          newStatus = "active";
        }
        updatedProfile = {
          ...stockist,
          outstandingBalance: newOutstanding,
          availableCredit: newAvailableCredit,
          status: newStatus,
          updatedAt: nowIso
        };
        transaction.set(stockistRef, updatedProfile);
        const ledgerId = `LEDGER-PMT-${Date.now()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
        ledgerEntry = {
          id: ledgerId,
          stockistId: strStockistId,
          branchId: normalizedBranch,
          type: "payment_credit",
          amount: numAmount,
          previousDeposit: stockist.depositBalance,
          depositAfter: stockist.depositBalance,
          previousOutstanding: prevOutstanding,
          outstandingAfter: newOutstanding,
          notes: notes || "Consignment payment credit",
          timestamp: nowIso,
          performedBy: user.uid
        };
        const ledgerRef = db.collection("b2b_ledger").doc(ledgerId);
        transaction.set(ledgerRef, ledgerEntry);
      });
      await logAuditEvent(
        user.uid,
        user.role,
        normalizedBranch,
        "b2b_payment_recorded",
        "b2b_stockists",
        strStockistId,
        true,
        { amount: numAmount, newOutstanding: updatedProfile.outstandingBalance },
        req
      );
      res.status(200).json({ success: true, stockist: updatedProfile, ledgerEntry });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/b2b/stockists/:stockistId/status", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (user.role !== "branch_manager" && user.role !== "regional_director" && user.role !== "super_admin") {
      res.status(403).json({ error: "Access Denied: Updating stockist status requires staff role." });
      return;
    }
    const { stockistId } = req.params;
    const strStockistId = String(stockistId || "");
    const { status, reason } = req.body;
    if (!["active", "locked", "suspended"].includes(status)) {
      res.status(400).json({ error: "status must be active, locked, or suspended." });
      return;
    }
    try {
      const stockistRef = db.collection("b2b_stockists").doc(strStockistId);
      const stockistSnap = await stockistRef.get();
      if (!stockistSnap.exists) {
        res.status(404).json({ error: `Stockist not found: ${strStockistId}` });
        return;
      }
      const stockist = stockistSnap.data();
      const normalizedBranch = (stockist.branchId || "daet").toLowerCase().trim();
      if (user.role === "branch_manager") {
        const assigned = (user.assignedBranchId || "daet").toLowerCase().trim();
        if (normalizedBranch !== assigned) {
          res.status(403).json({ error: "Access Denied: Branch managers cannot update stockists of other branches." });
          return;
        }
      }
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      const updatedProfile = {
        ...stockist,
        status,
        updatedAt: nowIso
      };
      await stockistRef.set(updatedProfile);
      await logAuditEvent(
        user.uid,
        user.role,
        normalizedBranch,
        "b2b_stockist_status_updated",
        "b2b_stockists",
        strStockistId,
        true,
        { previousStatus: stockist.status, newStatus: status, reason },
        req
      );
      res.status(200).json({ success: true, stockist: updatedProfile });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/b2b/orders", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (user.role !== "branch_manager" && user.role !== "regional_director" && user.role !== "super_admin" && user.role !== "customer") {
      res.status(403).json({ error: "Access Denied: Unauthorized role for B2B ordering." });
      return;
    }
    const { stockistId, branchId, items, deliveryMethod } = req.body;
    if (!stockistId || typeof stockistId !== "string") {
      res.status(400).json({ error: "stockistId is required." });
      return;
    }
    if (!branchId || typeof branchId !== "string") {
      res.status(400).json({ error: "branchId is required." });
      return;
    }
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "items array must not be empty." });
      return;
    }
    const strStockistId = stockistId.trim();
    const normalizedBranch = branchId.toLowerCase().trim();
    try {
      const stockistRef = db.collection("b2b_stockists").doc(strStockistId);
      const stockistSnap = await stockistRef.get();
      if (!stockistSnap.exists) {
        res.status(404).json({ error: `Stockist profile not found: ${strStockistId}` });
        return;
      }
      const stockist = stockistSnap.data();
      const stockistBranch = (stockist.branchId || "daet").toLowerCase().trim();
      if (stockistBranch !== normalizedBranch) {
        res.status(400).json({ error: `Branch mismatch: Stockist belongs to ${stockistBranch}, cannot order from ${normalizedBranch}` });
        return;
      }
      if (user.role === "branch_manager") {
        const assigned = (user.assignedBranchId || "daet").toLowerCase().trim();
        if (normalizedBranch !== assigned) {
          await logAuditEvent(
            user.uid,
            user.role,
            normalizedBranch,
            "unauthorized_cross_branch_b2b_access_blocked",
            "b2b_orders",
            null,
            false,
            { targetBranch: normalizedBranch, assignedBranch: assigned },
            req
          );
          res.status(403).json({ error: "Access Denied: Branch managers cannot place orders for other branches." });
          return;
        }
      }
      if (user.role === "customer") {
        if (!stockist.authorizedCustomerUid || stockist.authorizedCustomerUid !== user.uid) {
          await logAuditEvent(
            user.uid,
            user.role,
            normalizedBranch,
            "b2b_order_unauthorized_customer_blocked",
            "b2b_stockists",
            strStockistId,
            false,
            { authorizedCustomerUid: stockist.authorizedCustomerUid, requestUid: user.uid },
            req
          );
          res.status(403).json({ error: "Access Denied: Customer is not authorized for this stockist profile." });
          return;
        }
      }
      if (stockist.status === "locked" || stockist.status === "suspended") {
        await logAuditEvent(
          user.uid,
          user.role,
          normalizedBranch,
          "b2b_order_blocked_account_locked",
          "b2b_stockists",
          strStockistId,
          false,
          { status: stockist.status },
          req
        );
        res.status(403).json({ error: `Account is locked. Cannot place B2B wholesale orders (status: ${stockist.status}).` });
        return;
      }
      const pricing = calculateB2BWholesalePricing(stockist.tier, items);
      if (!pricing.isEligible) {
        res.status(400).json({
          error: `Minimum order requirement not met for ${pricing.tierConfig.name}: minimum ${pricing.minUnits} units required (received: ${pricing.totalUnits}).`,
          pricing
        });
        return;
      }
      const currentAvailable = stockist.availableCredit !== void 0 ? stockist.availableCredit : stockist.creditLimit - (stockist.outstandingBalance || 0);
      if (pricing.wholesaleTotal > currentAvailable) {
        await logAuditEvent(
          user.uid,
          user.role,
          normalizedBranch,
          "b2b_order_credit_limit_exceeded",
          "b2b_stockists",
          strStockistId,
          false,
          {
            orderTotal: pricing.wholesaleTotal,
            availableCredit: currentAvailable,
            creditLimit: stockist.creditLimit
          },
          req
        );
        res.status(400).json({
          error: `Credit limit exceeded. Order total (PHP ${pricing.wholesaleTotal}) exceeds available credit (PHP ${currentAvailable}).`,
          orderTotal: pricing.wholesaleTotal,
          availableCredit: currentAvailable,
          creditLimit: stockist.creditLimit
        });
        return;
      }
      await ensureInventorySeeded();
      const orderId = `HCI-B2B-${Date.now().toString().slice(-6)}`;
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      let orderRecord;
      let updatedStockist;
      let ledgerEntry;
      await db.runTransaction(async (transaction) => {
        const txStockistSnap = await transaction.get(stockistRef);
        const txStockist = txStockistSnap.data();
        const txAvailable = txStockist.availableCredit !== void 0 ? txStockist.availableCredit : txStockist.creditLimit - (txStockist.outstandingBalance || 0);
        if (pricing.wholesaleTotal > txAvailable) {
          throw new Error(`CREDIT_LIMIT_EXCEEDED: Order total (${pricing.wholesaleTotal}) exceeds available credit (${txAvailable}).`);
        }
        const batchAllocations = {};
        for (const it of pricing.items) {
          const resResult = await performFefoReservationInternal(
            transaction,
            normalizedBranch,
            it.skuId,
            it.quantity,
            nowIso
          );
          batchAllocations[it.skuId] = resResult.allocations;
        }
        const prevOutstanding = Number(txStockist.outstandingBalance) || 0;
        const newOutstanding = prevOutstanding + pricing.wholesaleTotal;
        const newAvailable = Math.max(0, txStockist.creditLimit - newOutstanding);
        const isLocked = newOutstanding >= txStockist.creditLimit && newAvailable === 0;
        updatedStockist = {
          ...txStockist,
          outstandingBalance: newOutstanding,
          availableCredit: newAvailable,
          status: isLocked ? "locked" : txStockist.status,
          updatedAt: nowIso
        };
        transaction.set(stockistRef, updatedStockist);
        const ledgerId = `LEDGER-B2B-${orderId}`;
        ledgerEntry = {
          id: ledgerId,
          stockistId: strStockistId,
          branchId: normalizedBranch,
          type: "order_debit",
          amount: pricing.wholesaleTotal,
          previousDeposit: txStockist.depositBalance,
          depositAfter: txStockist.depositBalance,
          previousOutstanding: prevOutstanding,
          outstandingAfter: newOutstanding,
          referenceId: orderId,
          notes: `Wholesale consignment order ${orderId} (${pricing.tierConfig.name})`,
          timestamp: nowIso,
          performedBy: user.uid
        };
        const ledgerRef = db.collection("b2b_ledger").doc(ledgerId);
        transaction.set(ledgerRef, ledgerEntry);
        orderRecord = {
          id: orderId,
          userId: user.uid,
          stockistId: strStockistId,
          orderType: "b2b_wholesale",
          tier: stockist.tier,
          customer: {
            businessName: stockist.businessName,
            email: stockist.contactEmail || user.email || "",
            uid: user.uid
          },
          items: pricing.items,
          batchAllocations,
          branchId: normalizedBranch,
          deliveryMethod: deliveryMethod || "branch_pickup",
          paymentMethod: "consignment_credit",
          paymentStatus: "consignment_pending_settlement",
          fulfillmentStatus: "pending_processing",
          subtotal: pricing.retailSubtotal,
          discountAmount: pricing.discountAmount,
          taxAmount: 0,
          grandTotal: pricing.wholesaleTotal,
          placedAt: nowIso,
          updatedAt: nowIso
        };
        const orderDocRef = db.collection("orders").doc(orderId);
        transaction.set(orderDocRef, orderRecord);
      });
      await logAuditEvent(
        user.uid,
        user.role,
        normalizedBranch,
        "b2b_order_placed",
        "orders",
        orderId,
        true,
        {
          stockistId: strStockistId,
          tier: stockist.tier,
          wholesaleTotal: pricing.wholesaleTotal,
          units: pricing.totalUnits
        },
        req
      );
      res.status(201).json({
        success: true,
        orderId,
        order: orderRecord,
        stockist: updatedStockist,
        ledgerEntry
      });
    } catch (err) {
      if (err.message.startsWith("INSUFFICIENT_ELIGIBLE_STOCK:")) {
        res.status(400).json({ error: err.message.replace(/^INSUFFICIENT_ELIGIBLE_STOCK:\s*/, "") });
        return;
      }
      res.status(500).json({ error: `B2B Order placement failed: ${err.message}` });
    }
  });
  app.get("/api/b2b/stockists/:stockistId/ledger", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) return;
    const { stockistId } = req.params;
    const strStockistId = String(stockistId || "");
    try {
      const stockistRef = db.collection("b2b_stockists").doc(strStockistId);
      const stockistSnap = await stockistRef.get();
      if (!stockistSnap.exists) {
        res.status(404).json({ error: `Stockist not found: ${strStockistId}` });
        return;
      }
      const stockist = stockistSnap.data();
      const normalizedBranch = (stockist.branchId || "daet").toLowerCase().trim();
      if (user.role === "customer") {
        if (!stockist.authorizedCustomerUid || stockist.authorizedCustomerUid !== user.uid) {
          res.status(403).json({ error: "Access Denied: Customer cannot view another stockist's B2B ledger." });
          return;
        }
      }
      if (user.role === "practitioner") {
        res.status(403).json({ error: "Access Denied: Practitioners cannot access B2B ledger." });
        return;
      }
      if (user.role === "branch_manager") {
        const assigned = (user.assignedBranchId || "daet").toLowerCase().trim();
        if (normalizedBranch !== assigned) {
          res.status(403).json({ error: "Access Denied: Branch managers cannot view ledger of other branches." });
          return;
        }
      }
      const ledgerSnap = await db.collection("b2b_ledger").where("stockistId", "==", strStockistId).get();
      const entries = [];
      ledgerSnap.forEach((doc) => entries.push(doc.data()));
      entries.sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""));
      res.status(200).json({ success: true, stockistId: strStockistId, ledger: entries });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.use((err, req, res, _next) => {
    const correlationId = req.correlationId || "unknown";
    const statusCode = err.status || err.statusCode || 500;
    const isProd = process.env.NODE_ENV === "production";
    const safeErrorMessage = isProd && statusCode === 500 ? "An unexpected internal error occurred" : err.message || "Internal Server Error";
    logger.error("Unhandled server error", {
      method: req.method,
      path: req.path,
      statusCode,
      correlationId,
      error: err?.message || String(err),
      stack: isProd ? void 0 : err?.stack
    });
    if (!res.headersSent) {
      res.status(statusCode).json({
        error: safeErrorMessage,
        correlationId
      });
    }
  });
  return app;
}
async function startServer() {
  if (process.env.NODE_ENV === "production") {
    getHmacSecret();
    logger.info("Production boot environment validation succeeded");
  }
  const app = createExpressApp();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = fs.existsSync(path.resolve(process.cwd(), "dist")) ? path.resolve(process.cwd(), "dist") : path.resolve(__dirname, "..", "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    logger.info(`HCI CMD Platform server listening on port ${PORT}`, { port: PORT });
  });
}
var isDirectExecution = process.argv[1] && (process.argv[1].endsWith("server.ts") || process.argv[1].endsWith("server.js"));
if (isDirectExecution && process.env.NODE_ENV !== "test") {
  startServer().catch((err) => {
    console.error("Failed to start server:", err);
  });
}
export {
  ACTIVE_CONSUMER_SKUS,
  B2B_STOCKIST_TIERS,
  CONSULTATION_SERVICES,
  CRM_COHORTS,
  EXPENSE_CATEGORIES,
  KMS_KEY_NAME,
  PRACTITIONER_ROSTER,
  PRODUCTS_CATALOG,
  RA11967_SLA_DAYS,
  RA11967_SLA_MS,
  SEED_BRANCH_BATCH_INVENTORY,
  SEED_PRODUCT_BATCHES,
  SEED_WORKSHOPS,
  SUPPORTED_BRANCH_IDS,
  VALID_INVENTORY_ADJUSTMENT_TYPES,
  VALID_TICKET_CATEGORIES,
  VALID_TICKET_STATUSES,
  aggregateCustomerCrmProfiles,
  calculateB2BCreditLimits,
  calculateB2BWholesalePricing,
  calculateCommodityProfitability,
  calculateFinancialMetrics,
  computeAggregateInventoryFromBatches,
  createExpressApp,
  evaluateSlaEscalation,
  generateRegistrationSignature,
  getAuthoritativeRegistrationBranch,
  getDailyConsultationSlots,
  getHmacSecret,
  logger,
  parseDateBoundary,
  verifyInventoryReconciliation,
  verifyRegistrationSignature
};
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
