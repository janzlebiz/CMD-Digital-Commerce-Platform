/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { PageView } from '../types';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Package, RefreshCw, AlertCircle, FileText, UserCheck } from 'lucide-react';

export const AdminDashboardView: React.FC<{ onNavigate: (view: PageView) => void }> = ({ onNavigate }) => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'audit' | 'crm'>('orders');

  const [orders, setOrders] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [crmCohorts, setCrmCohorts] = useState<any[]>([]);
  const [selectedCohort, setSelectedCohort] = useState<string | null>(null);
  const [cohortMembers, setCohortMembers] = useState<any[]>([]);
  const [cohortDetailLoading, setCohortDetailLoading] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const isStaff =
    profile?.role === 'branch_manager' ||
    profile?.role === 'regional_director' ||
    profile?.role === 'super_admin';

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

  useEffect(() => {
    if (isStaff) {
      if (activeTab === 'orders') fetchAdminOrders();
      if (activeTab === 'audit') fetchAuditLogs();
      if (activeTab === 'crm') {
        fetchCrmCohorts();
        setSelectedCohort(null);
        setCohortMembers([]);
      }
    }
  }, [activeTab, isStaff]);

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-bold mb-2">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Staff Operations Center</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">
            Branch Operations & Security Console
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Signed in as <span className="text-white font-bold">{profile?.email}</span> (
            <span className="text-amber-400 font-mono">{profile?.role}</span>
            {profile?.assignedBranchId && ` • Branch: ${profile.assignedBranchId.toUpperCase()}`})
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'orders' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Orders Fulfillment
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'inventory' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Inventory Stock
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'audit' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Security Audit Logs
          </button>
          <button
            onClick={() => setActiveTab('crm')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'crm' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Customer Segments (CRM)
          </button>
        </div>
      </div>

      {activeTab === 'orders' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-white">Branch Orders</h3>
            <button
              onClick={fetchAdminOrders}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">No active branch orders found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Order ID</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Branch</th>
                    <th className="p-3">Total</th>
                    <th className="p-3">Payment</th>
                    <th className="p-3">Fulfillment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-950/50">
                      <td className="p-3 font-mono font-bold text-amber-400">{o.id}</td>
                      <td className="p-3">{o.customer?.firstName} {o.customer?.lastName}</td>
                      <td className="p-3 uppercase font-semibold">{o.branchId}</td>
                      <td className="p-3 font-bold text-white">₱{o.grandTotal?.toLocaleString()}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                          {o.paymentStatus}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300">
                          {o.fulfillmentStatus}
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
