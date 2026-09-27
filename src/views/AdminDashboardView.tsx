/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { PageView, ExpenseCategory, ExpenseStatus, ExpenseRecord, FinanceMetricsSummary, CommodityProfitabilityRecord } from '../types';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Package, RefreshCw, AlertCircle, FileText, UserCheck, DollarSign, TrendingUp, PlusCircle, CheckCircle, Wheat, Calendar, Layers, Clock } from 'lucide-react';
import { openOfflineDatabase, cacheFinanceMetrics, getCachedFinanceMetrics, saveOfflineExpense } from '../utils/indexedDb';

export const AdminDashboardView: React.FC<{ onNavigate: (view: PageView) => void }> = ({ onNavigate }) => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'audit' | 'crm' | 'financials'>('orders');

  const [orders, setOrders] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [crmCohorts, setCrmCohorts] = useState<any[]>([]);
  const [selectedCohort, setSelectedCohort] = useState<string | null>(null);
  const [cohortMembers, setCohortMembers] = useState<any[]>([]);
  const [cohortDetailLoading, setCohortDetailLoading] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Financials State
  const [financeMetrics, setFinanceMetrics] = useState<FinanceMetricsSummary | null>(null);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [riceProfitability, setRiceProfitability] = useState<CommodityProfitabilityRecord | null>(null);
  const [copraProfitability, setCopraProfitability] = useState<CommodityProfitabilityRecord | null>(null);
  const [dateRangePreset, setDateRangePreset] = useState<'all' | 'today' | '7d' | 'mtd' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [expenseFilterCategory, setExpenseFilterCategory] = useState<string>('all');
  const [expenseFilterStatus, setExpenseFilterStatus] = useState<string>('all');

  // New Expense Modal State
  const [showExpenseModal, setShowExpenseModal] = useState<boolean>(false);
  const [newCategory, setNewCategory] = useState<ExpenseCategory>('procurement_raw_materials');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newAmount, setNewAmount] = useState<string>('');
  const [newExpenseStatus, setNewExpenseStatus] = useState<ExpenseStatus>('paid');
  const [newIncurredDate, setNewIncurredDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [newPaymentRef, setNewPaymentRef] = useState<string>('');
  const [newIsCommodity, setNewIsCommodity] = useState<boolean>(false);
  const [newCommodityType, setNewCommodityType] = useState<'rice' | 'copra'>('rice');
  const [newVolumeKg, setNewVolumeKg] = useState<string>('');
  const [newAcqCostPerKg, setNewAcqCostPerKg] = useState<string>('');
  const [newMillingFee, setNewMillingFee] = useState<string>('');
  const [submittingExpense, setSubmittingExpense] = useState<boolean>(false);
  const [expenseError, setExpenseError] = useState<string | null>(null);

  // Status Update State
  const [updatingExpenseId, setUpdatingExpenseId] = useState<string | null>(null);
  const [payRefModalExpenseId, setPayRefModalExpenseId] = useState<string | null>(null);
  const [payModalRefText, setPayModalRefText] = useState<string>('');

  const isStaff =
    profile?.role === 'branch_manager' ||
    profile?.role === 'regional_director' ||
    profile?.role === 'super_admin';

  const formatLocalIsoDate = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDateQueryParams = () => {
    let startDate = '';
    let endDate = '';
    const now = new Date();

    if (dateRangePreset === 'today') {
      const todayStr = formatLocalIsoDate(now);
      startDate = todayStr;
      endDate = todayStr;
    } else if (dateRangePreset === '7d') {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate = formatLocalIsoDate(past);
      endDate = formatLocalIsoDate(now);
    } else if (dateRangePreset === 'mtd') {
      startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      endDate = formatLocalIsoDate(now);
    } else if (dateRangePreset === 'custom') {
      startDate = customStartDate;
      endDate = customEndDate;
    }
    return { startDate, endDate };
  };

  const fetchAdminOrders = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch admin orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/audit-logs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCrmCohorts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/crm/cohorts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCrmCohorts(data.cohorts || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch CRM cohorts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCohortMembers = async (cohortKey: string) => {
    if (!user) return;
    setCohortDetailLoading(true);
    setSelectedCohort(cohortKey);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/crm/cohorts/${cohortKey}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCohortMembers(data.members || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch cohort members:', err);
    } finally {
      setCohortDetailLoading(false);
    }
  };

  const fetchFinancialsData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const { startDate, endDate } = getDateQueryParams();

      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const [metricsRes, expensesRes, riceRes, copraRes] = await Promise.all([
        fetch(`/api/finance/metrics?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/finance/expenses?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/finance/commodity-profitability?commodityType=rice', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/finance/commodity-profitability?commodityType=copra', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setFinanceMetrics(metricsData.metrics);
        // Persist to IndexedDB v3 cache
        await cacheFinanceMetrics(metricsData.metrics).catch((e) => console.warn('IndexedDB cache note:', e));
      }

      if (expensesRes.ok) {
        const expData = await expensesRes.json();
        setExpenses(expData.expenses || []);
      }

      if (riceRes.ok) {
        const riceData = await riceRes.json();
        setRiceProfitability(riceData.profitability);
      }

      if (copraRes.ok) {
        const copraData = await copraRes.json();
        setCopraProfitability(copraData.profitability);
      }
    } catch (err: any) {
      console.error('Failed to fetch financials data:', err);
      // Fallback to IndexedDB cache
      const cached = await getCachedFinanceMetrics().catch(() => null);
      if (cached) setFinanceMetrics(cached);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setExpenseError(null);
    setSubmittingExpense(true);

    try {
      const token = await user.getIdToken();
      const amountNum = parseFloat(newAmount);
      if (isNaN(amountNum) || amountNum <= 0) {
        setExpenseError('Please provide a valid positive amount.');
        setSubmittingExpense(false);
        return;
      }

      const payload: any = {
        category: newCategory,
        description: newDescription.trim(),
        amount: amountNum,
        expenseStatus: newExpenseStatus,
        incurredAt: newIncurredDate ? new Date(newIncurredDate).toISOString() : new Date().toISOString(),
        paymentReference: newPaymentRef.trim() || undefined,
      };

      if (newIsCommodity) {
        payload.commodityMetadata = {
          commodityType: newCommodityType,
          volumeKg: parseFloat(newVolumeKg) || 0,
          acquisitionCostPerKg: parseFloat(newAcqCostPerKg) || 0,
          millingOrDryingFee: parseFloat(newMillingFee) || 0,
        };
      }

      const res = await fetch('/api/finance/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to record expense');
      }

      const created = await res.json();
      if (created?.expense) {
        await saveOfflineExpense(created.expense).catch((e) => console.warn('Offline save note:', e));
      }

      // Reset form
      setShowExpenseModal(false);
      setNewDescription('');
      setNewAmount('');
      setNewPaymentRef('');
      setNewIsCommodity(false);
      setNewVolumeKg('');
      setNewAcqCostPerKg('');
      setNewMillingFee('');
      fetchFinancialsData();
    } catch (err: any) {
      setExpenseError(err.message || 'An error occurred while saving expense.');
    } finally {
      setSubmittingExpense(false);
    }
  };

  const handleMarkAsPaid = async (expenseId: string, paymentRef: string) => {
    if (!user) return;
    setUpdatingExpenseId(expenseId);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/finance/expenses/${expenseId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: 'paid',
          paymentReference: paymentRef.trim() || undefined,
        }),
      });

      if (res.ok) {
        setPayRefModalExpenseId(null);
        setPayModalRefText('');
        fetchFinancialsData();
      }
    } catch (err: any) {
      console.error('Failed to update expense status:', err);
    } finally {
      setUpdatingExpenseId(null);
    }
  };

  useEffect(() => {
    if (isStaff) {
      // Ensure IndexedDB v3 is initialized
      openOfflineDatabase().catch((e) => console.warn('IndexedDB initialization note:', e));

      if (activeTab === 'orders') fetchAdminOrders();
      if (activeTab === 'audit') fetchAuditLogs();
      if (activeTab === 'crm') {
        fetchCrmCohorts();
        setSelectedCohort(null);
        setCohortMembers([]);
      }
      if (activeTab === 'financials') {
        fetchFinancialsData();
      }
    }
  }, [activeTab, isStaff, dateRangePreset, customStartDate, customEndDate]);

  if (!isStaff) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-2xl font-bold text-white">Staff Access Denied</h2>
        <p className="text-xs text-slate-400">
          This dashboard requires Branch Manager, Regional Director, or Super Admin privileges.
        </p>
      </div>
    );
  }

  const filteredExpenses = expenses.filter((e) => {
    if (expenseFilterCategory !== 'all' && e.category !== expenseFilterCategory) return false;
    if (expenseFilterStatus !== 'all' && e.expenseStatus !== expenseFilterStatus) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Console Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-bold mb-2">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Staff Operations Center</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">
            Branch Operations & Financial Console
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Signed in as <span className="text-white font-bold">{profile?.email}</span> (
            <span className="text-amber-400 font-mono">{profile?.role}</span>
            {profile?.assignedBranchId && ` • Branch: ${profile.assignedBranchId.toUpperCase()}`})
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'orders' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Orders Fulfillment
          </button>
          <button
            onClick={() => setActiveTab('financials')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'financials' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            Financials & Accounting
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'inventory' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Inventory Stock
          </button>
          <button
            onClick={() => setActiveTab('crm')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'crm' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Customer Segments (CRM)
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'audit' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Security Audit Logs
          </button>
        </div>
      </div>

      {/* FINANCIALS & ACCOUNTING TAB */}
      {activeTab === 'financials' && (
        <div className="space-y-6">
          {/* Controls Bar: Date Filter & Record Expense Button */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                Date Range:
              </span>
              {(['all', 'today', '7d', 'mtd', 'custom'] as const).map((preset) => (
                <button
                  key={preset}
                  onClick={() => setDateRangePreset(preset)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                    dateRangePreset === preset
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {preset === 'all' ? 'All Time' : preset === '7d' ? 'Last 7 Days' : preset === 'mtd' ? 'Month-to-Date' : preset}
                </button>
              ))}

              {dateRangePreset === 'custom' && (
                <div className="flex items-center gap-2 ml-2">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white"
                  />
                  <span className="text-xs text-slate-500">to</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={fetchFinancialsData}
                className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh Metrics
              </button>
              <button
                onClick={() => setShowExpenseModal(true)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow"
              >
                <PlusCircle className="w-4 h-4" />
                Record Expense
              </button>
            </div>
          </div>

          {/* Primary Financial KPI Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Revenue */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
                <span>Gross Revenue (Sales)</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-white">
                ₱{financeMetrics?.revenue?.toLocaleString() ?? '0'}
              </div>
              <div className="text-[11px] text-slate-500">
                {financeMetrics?.orderCount ?? 0} commercial orders
              </div>
            </div>

            {/* Total Incurred Expenses */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
                <span>Incurred Expenses (Accrual)</span>
                <Layers className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-400">
                ₱{financeMetrics?.totalExpensesIncurred?.toLocaleString() ?? '0'}
              </div>
              <div className="text-[11px] text-slate-500">
                Paid: ₱{financeMetrics?.totalExpensesPaid?.toLocaleString() ?? '0'} • {financeMetrics?.expenseCount ?? 0} entries
              </div>
            </div>

            {/* Net Income (Accrual) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
                <span>Net Income (Accrual)</span>
                <DollarSign className="w-4 h-4 text-amber-400" />
              </div>
              <div className={`text-2xl font-black ${
                (financeMetrics?.netIncomeAccrual ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                ₱{financeMetrics?.netIncomeAccrual?.toLocaleString() ?? '0'}
              </div>
              <div className="text-[11px] text-slate-500">
                Revenue − Total Incurred Expenses
              </div>
            </div>

            {/* Net Cash Flow */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
                <span>Net Cash Flow (Cash Basis)</span>
                <CheckCircle className="w-4 h-4 text-teal-400" />
              </div>
              <div className={`text-2xl font-black ${
                (financeMetrics?.netCashFlow ?? 0) >= 0 ? 'text-teal-400' : 'text-red-400'
              }`}>
                ₱{financeMetrics?.netCashFlow?.toLocaleString() ?? '0'}
              </div>
              <div className="text-[11px] text-slate-500">
                Cash Received − Cash Paid
              </div>
            </div>
          </div>

          {/* Secondary Balance Sheet Tiles: Cash Flow, AR, AP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Cash Collected (Paid Orders)</span>
              <div className="text-xl font-bold text-emerald-300 mt-1">
                ₱{financeMetrics?.cashReceived?.toLocaleString() ?? '0'}
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Cash Disbursed (Paid Expenses)</span>
              <div className="text-xl font-bold text-amber-300 mt-1">
                ₱{financeMetrics?.cashPaid?.toLocaleString() ?? '0'}
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Accounts Receivable (Uncollected)</span>
              <div className="text-xl font-bold text-sky-400 mt-1">
                ₱{financeMetrics?.accountsReceivable?.toLocaleString() ?? '0'}
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Accounts Payable (Pending Incurred)</span>
              <div className="text-xl font-bold text-orange-400 mt-1">
                ₱{financeMetrics?.accountsPayable?.toLocaleString() ?? '0'}
              </div>
            </div>
          </div>

          {/* Agricultural Commodity Profitability (Rice & Copra) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wheat className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Agricultural Value-Chain Profitability (Rice & Copra)</h3>
              </div>
              <span className="text-xs text-amber-400 font-mono bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                Camarines Norte Agro-Processing
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Rice Profitability Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">RICE COMMODITY</span>
                    <span className="text-xs font-semibold text-white">Organic Mountain & Red Rice</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-400">
                    Margin: {riceProfitability?.grossMarginPercent?.toFixed(1) ?? '0.0'}%
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400">Procured</span>
                    <div className="text-sm font-bold text-white">{riceProfitability?.totalVolumeProcuredKg ?? 0} kg</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Cost Basis</span>
                    <div className="text-sm font-bold text-white">₱{riceProfitability?.totalCostBasis?.toLocaleString() ?? '0'}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Unit Cost</span>
                    <div className="text-sm font-bold text-white">₱{riceProfitability?.unitCostPerKg?.toFixed(2) ?? '0.00'}/kg</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Volume Sold</span>
                    <div className="text-sm font-bold text-white">{riceProfitability?.totalVolumeSoldKg ?? 0} kg</div>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800/80 rounded-lg p-3 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-slate-400 block">Weighted Avg Selling Price (WASP)</span>
                    <span className="text-base font-extrabold text-amber-400">
                      ₱{riceProfitability?.weightedAverageSellingPrice?.toFixed(2) ?? '0.00'} / kg
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block">Gross Profit</span>
                    <span className="text-base font-extrabold text-emerald-400">
                      ₱{riceProfitability?.grossProfit?.toLocaleString() ?? '0'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Copra Profitability Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">COPRA COMMODITY</span>
                    <span className="text-xs font-semibold text-white">Coconut Kernels & Cold-Pressed Oil</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-400">
                    Margin: {copraProfitability?.grossMarginPercent?.toFixed(1) ?? '0.0'}%
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400">Procured</span>
                    <div className="text-sm font-bold text-white">{copraProfitability?.totalVolumeProcuredKg ?? 0} kg</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Cost Basis</span>
                    <div className="text-sm font-bold text-white">₱{copraProfitability?.totalCostBasis?.toLocaleString() ?? '0'}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Unit Cost</span>
                    <div className="text-sm font-bold text-white">₱{copraProfitability?.unitCostPerKg?.toFixed(2) ?? '0.00'}/kg</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Volume Sold</span>
                    <div className="text-sm font-bold text-white">{copraProfitability?.totalVolumeSoldKg ?? 0} kg</div>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800/80 rounded-lg p-3 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-slate-400 block">Weighted Avg Selling Price (WASP)</span>
                    <span className="text-base font-extrabold text-amber-400">
                      ₱{copraProfitability?.weightedAverageSellingPrice?.toFixed(2) ?? '0.00'} / kg
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block">Gross Profit</span>
                    <span className="text-base font-extrabold text-emerald-400">
                      ₱{copraProfitability?.grossProfit?.toLocaleString() ?? '0'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Expenses Breakdown & Management Table */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-base font-bold text-white">Operating & Procurement Expenses</h3>
                <p className="text-xs text-slate-400">
                  Showing {filteredExpenses.length} expense entries under current filters.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={expenseFilterCategory}
                  onChange={(e) => setExpenseFilterCategory(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="all">All Categories</option>
                  <option value="procurement_raw_materials">Raw Materials</option>
                  <option value="packaging_bottles_droppers">Packaging Bottles</option>
                  <option value="agricultural_copra_processing">Copra Processing</option>
                  <option value="agricultural_rice_milling">Rice Milling</option>
                  <option value="branch_rent_utilities">Rent & Utilities</option>
                  <option value="logistics_freight">Logistics Freight</option>
                  <option value="practitioner_stipends">Practitioner Stipends</option>
                  <option value="marketing_symposia">Marketing & Symposia</option>
                  <option value="miscellaneous">Miscellaneous</option>
                </select>

                <select
                  value={expenseFilterStatus}
                  onChange={(e) => setExpenseFilterStatus(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="paid">Paid (Disbursed)</option>
                  <option value="incurred_pending_payment">Incurred (Pending Payment)</option>
                </select>
              </div>
            </div>

            {filteredExpenses.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No expense records match your selected filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3">Expense ID</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Description</th>
                      <th className="p-3">Branch</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Incurred Date</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-950/50">
                        <td className="p-3 font-mono font-bold text-amber-400">{exp.id}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">
                            {exp.category.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-3 max-w-xs truncate">
                          <div className="text-white font-medium">{exp.description}</div>
                          {exp.commodityMetadata && (
                            <div className="text-[10px] text-amber-400 font-mono">
                              {exp.commodityMetadata.commodityType.toUpperCase()} • {exp.commodityMetadata.volumeKg} kg @ ₱{exp.commodityMetadata.acquisitionCostPerKg}/kg
                            </div>
                          )}
                        </td>
                        <td className="p-3 font-mono uppercase text-slate-400">{exp.branchId}</td>
                        <td className="p-3 font-bold text-white">₱{exp.amount.toLocaleString()}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            exp.expenseStatus === 'paid'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {exp.expenseStatus === 'paid' ? 'PAID' : 'INCURRED (PENDING)'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400 font-mono">
                          {new Date(exp.incurredAt).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          {exp.expenseStatus === 'incurred_pending_payment' ? (
                            <button
                              onClick={() => {
                                setPayRefModalExpenseId(exp.id);
                                setPayModalRefText('');
                              }}
                              disabled={updatingExpenseId === exp.id}
                              className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded text-[11px] font-bold transition flex items-center gap-1"
                            >
                              <CheckCircle className="w-3 h-3" />
                              Mark Paid
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-mono">
                              {exp.paymentReference || 'Disbursed'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RECORD EXPENSE MODAL */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 my-8">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Record Branch Expense</h3>
              </div>
              <button
                onClick={() => setShowExpenseModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>

            {expenseError && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{expenseError}</span>
              </div>
            )}

            <form onSubmit={handleRecordExpense} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-400 font-semibold">Expense Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as ExpenseCategory)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="procurement_raw_materials">Raw Materials Procurement (Mineral salts, solutions)</option>
                  <option value="packaging_bottles_droppers">Packaging Bottles & Glass Droppers</option>
                  <option value="agricultural_rice_milling">Agricultural Rice Procurement & Milling</option>
                  <option value="agricultural_copra_processing">Agricultural Copra Processing & Sun-Drying</option>
                  <option value="branch_rent_utilities">Branch Lease, Electricity & Utilities</option>
                  <option value="logistics_freight">Logistics, Freight & Shipping</option>
                  <option value="practitioner_stipends">Practitioner Health Educator Stipends</option>
                  <option value="marketing_symposia">Wellness Symposia & Community Outreach</option>
                  <option value="miscellaneous">Miscellaneous Operations</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 font-semibold">Description / Notes</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Amber glass bottle lot 200 units, Daet central branch"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-semibold">Total Amount (₱ PHP)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="2500.00"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-400 font-semibold">Accounting Status</label>
                  <select
                    value={newExpenseStatus}
                    onChange={(e) => setNewExpenseStatus(e.target.value as ExpenseStatus)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-semibold"
                  >
                    <option value="paid">Paid (Disbursed)</option>
                    <option value="incurred_pending_payment">Incurred (Pending Payment)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-semibold">Incurred Date</label>
                  <input
                    type="date"
                    required
                    value={newIncurredDate}
                    onChange={(e) => setNewIncurredDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-400 font-semibold">Payment / OR Reference</label>
                  <input
                    type="text"
                    placeholder="OR-99124 / BDO-CHECK"
                    value={newPaymentRef}
                    onChange={(e) => setNewPaymentRef(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              {/* Commodity Specific Option */}
              <div className="pt-2 border-t border-slate-800 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newIsCommodity}
                    onChange={(e) => setNewIsCommodity(e.target.checked)}
                    className="rounded border-slate-700 text-amber-500 focus:ring-amber-400"
                  />
                  <span className="text-xs font-semibold text-amber-300">
                    Attach Agricultural Commodity Metadata (Rice / Copra)
                  </span>
                </label>

                {newIsCommodity && (
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-slate-400">Commodity Type</label>
                        <select
                          value={newCommodityType}
                          onChange={(e) => setNewCommodityType(e.target.value as 'rice' | 'copra')}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                        >
                          <option value="rice">Rice (Palay / Grains)</option>
                          <option value="copra">Copra (Coconut Kernels)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-400">Volume (Kilograms / kg)</label>
                        <input
                          type="number"
                          placeholder="200"
                          value={newVolumeKg}
                          onChange={(e) => setNewVolumeKg(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-slate-400">Acquisition Price (₱/kg)</label>
                        <input
                          type="number"
                          placeholder="18.50"
                          value={newAcqCostPerKg}
                          onChange={(e) => setNewAcqCostPerKg(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400">Milling / Drying Fee (₱)</label>
                        <input
                          type="number"
                          placeholder="400.00"
                          value={newMillingFee}
                          onChange={(e) => setNewMillingFee(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingExpense}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow transition"
                >
                  {submittingExpense ? 'Recording...' : 'Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MARK AS PAID REFERENCE MODAL */}
      {payRefModalExpenseId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-white">Confirm Expense Disbursement</h3>
            <p className="text-xs text-slate-400">
              Provide a check, bank, or official receipt reference to record payment disbursement.
            </p>
            <input
              type="text"
              placeholder="e.g. CHECK-BDO-8921 / OR-5501"
              value={payModalRefText}
              onChange={(e) => setPayModalRefText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPayRefModalExpenseId(null)}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleMarkAsPaid(payRefModalExpenseId, payModalRefText)}
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-bold"
              >
                Confirm Paid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INVENTORY TAB */}
      {activeTab === 'inventory' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-4">
          <h3 className="text-base font-bold text-white">Branch Inventory Balances</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-slate-400">Flagship Bottle (65 mL)</span>
              <div className="text-2xl font-black text-amber-400">45 Units</div>
              <div className="text-[11px] text-emerald-400">In Stock (Daet Central Hub)</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-slate-400">Travel Dropper (30 mL)</span>
              <div className="text-2xl font-black text-amber-400">80 Units</div>
              <div className="text-[11px] text-emerald-400">In Stock (Daet Central Hub)</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-white">Security & Access Audit Trail</h3>
            <button
              onClick={fetchAuditLogs}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">No audit log entries recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Actor Role</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Target Resource</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-950/50">
                      <td className="p-3 font-mono text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</td>
                      <td className="p-3 font-semibold text-amber-300">{log.actorRole}</td>
                      <td className="p-3">{log.action}</td>
                      <td className="p-3 font-mono">{log.targetResource}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.success ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                        }`}>
                          {log.success ? 'SUCCESS' : 'DENIED'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'crm' && (
        <div className="space-y-6">
          {/* Health Data Privacy Firewall Notice */}
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex items-start gap-3">
            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                Health Data Privacy Firewall (RA 10173 & Naturopathic Scope Boundary)
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                This CRM console aggregates commercial fulfillment records, mineral purchase velocity, and public wellness seminar attendance only.
                Under statutory data protection protocols, confidential clinical consultations, dietary intakes, and health conditions are strictly firewalled from commercial view.
              </p>
            </div>
          </div>

          {/* CRM Cohorts Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {crmCohorts.map((cohort) => {
              const isSelected = selectedCohort === cohort.key;
              return (
                <div
                  key={cohort.key}
                  onClick={() => fetchCohortMembers(cohort.key)}
                  className={`p-5 rounded-xl border transition cursor-pointer space-y-3 ${
                    isSelected
                      ? 'bg-amber-950/40 border-amber-500 shadow-lg'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{cohort.label}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {cohort.memberCount} Accounts
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{cohort.description}</p>
                  <div className="text-[11px] text-amber-400/90 font-semibold flex items-center gap-1 pt-1">
                    {isSelected ? 'Viewing cohort members ↓' : 'Click to inspect cohort →'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Cohort Member Breakdown */}
          {selectedCohort && (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h3 className="text-base font-bold text-white capitalize">
                    {selectedCohort.replace(/_/g, ' ')} — Member Directory
                  </h3>
                  <p className="text-xs text-slate-400">
                    Showing {cohortMembers.length} accounts matching this commercial cohort.
                  </p>
                </div>
                <button
                  onClick={() => fetchCohortMembers(selectedCohort)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${cohortDetailLoading ? 'animate-spin' : ''}`} />
                  Refresh Cohort
                </button>
              </div>

              {cohortDetailLoading ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading cohort members...</div>
              ) : cohortMembers.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No accounts currently qualify for this cohort in your branch jurisdiction.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Branch</th>
                        <th className="p-3">Orders</th>
                        <th className="p-3">Cumulative Spend</th>
                        <th className="p-3">Last Order</th>
                        <th className="p-3">Seminars Attended</th>
                        <th className="p-3">Active Cohorts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {cohortMembers.map((m) => (
                        <tr key={m.userId} className="hover:bg-slate-950/50">
                          <td className="p-3">
                            <div className="font-semibold text-white">{m.customerName}</div>
                            <div className="text-[11px] text-slate-400">{m.customerEmail}</div>
                            {m.customerPhone && (
                              <div className="text-[10px] text-slate-500 font-mono">{m.customerPhone}</div>
                            )}
                          </td>
                          <td className="p-3 font-mono text-amber-300 uppercase">{m.branchId}</td>
                          <td className="p-3 font-semibold">{m.totalOrders}</td>
                          <td className="p-3 font-mono text-emerald-400">₱{m.totalSpent.toLocaleString()}</td>
                          <td className="p-3">
                            {m.lastOrderDate ? (
                              <div>
                                <div>{new Date(m.lastOrderDate).toLocaleDateString()}</div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {m.daysSinceLastOrder} days ago
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                          <td className="p-3 font-semibold">{m.workshopAttendanceCount}</td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1">
                              {m.cohorts.map((c: string) => (
                                <span
                                  key={c}
                                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-amber-300 border border-slate-700"
                                >
                                  {c}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
