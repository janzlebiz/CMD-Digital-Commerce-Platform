/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { PageView, AuditLogEntry } from '../types';
import { useAuth } from '../context/AuthContext';
import { TrustedServerController } from '../services/trustedServer';
import { BRANCHES_DATA } from '../data/branches';
import {
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Package,
  Layers,
  History,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  XCircle,
  Truck,
  DollarSign,
  UserCheck,
  Building2,
  Lock
} from 'lucide-react';

interface AdminDashboardViewProps {
  onNavigate: (view: PageView) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ onNavigate }) => {
  const { user, profile } = useAuth();

  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'audit_logs'>('orders');
  const [orders, setOrders] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Inventory replenishment state
  const [replenishBranch, setReplenishBranch] = useState<string>('daet');
  const [replenishSku, setReplenishSku] = useState<string>('hci-cmd-65ml');
  const [replenishQty, setReplenishQty] = useState<number>(25);

  const role = profile?.role || 'customer';
  const assignedBranch = profile?.assignedBranchId;
  const isStaff =
    role === 'branch_manager' ||
    role === 'regional_director' ||
    role === 'super_admin' ||
    (role as string) === 'staff' ||
    (role as string) === 'admin';
  const isPrivilegedAuditViewer = role === 'super_admin' || role === 'regional_director';

  // Initialize branch filter according to role isolation
  useEffect(() => {
    if (assignedBranch && role !== 'super_admin' && role !== 'regional_director') {
      setSelectedBranchFilter(assignedBranch);
      setReplenishBranch(assignedBranch);
    } else {
      setSelectedBranchFilter('');
      setReplenishBranch('daet');
    }
  }, [assignedBranch, role]);

  // Load orders
  const loadOrders = async () => {
    if (!isStaff) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const branchToQuery =
        assignedBranch && role !== 'super_admin' && role !== 'regional_director'
          ? assignedBranch
          : selectedBranchFilter || undefined;
      const res = await TrustedServerController.fetchAdminOrders(branchToQuery);
      setOrders(res.orders || []);
      if (res.orders && res.orders.length > 0 && !selectedOrderId) {
        setSelectedOrderId(res.orders[0].id);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch administrative orders.');
    } finally {
      setLoading(false);
    }
  };

  // Load audit logs if privileged
  const loadAuditLogs = async () => {
    if (!isPrivilegedAuditViewer) return;
    try {
      const res = await TrustedServerController.fetchAuditLogs(50);
      setAuditLogs(res.logs || []);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
    }
  };

  useEffect(() => {
    if (isStaff) {
      loadOrders();
      if (isPrivilegedAuditViewer) {
        loadAuditLogs();
      }
    } else {
      setLoading(false);
    }
  }, [user, profile, selectedBranchFilter]);

  const handleUpdateStatus = async (
    orderId: string,
    paymentStatus?: string,
    fulfillmentStatus?: string
  ) => {
    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await TrustedServerController.updateOrderStatus(orderId, paymentStatus, fulfillmentStatus);
      setSuccessMsg(`Order ${orderId} updated successfully.`);
      await loadOrders();
      if (isPrivilegedAuditViewer) {
        await loadAuditLogs();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update order status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReplenish = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await TrustedServerController.replenishInventory(
        replenishBranch,
        replenishSku,
        Number(replenishQty)
      );
      setSuccessMsg(
        `Successfully replenished SKU ${replenishSku} at branch ${replenishBranch}. New stock level: ${res.newStockCount}`
      );
      if (isPrivilegedAuditViewer) {
        await loadAuditLogs();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Inventory replenishment failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Access Denied Screen for unauthorized users
  if (!user || !isStaff) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="bg-slate-900 border border-red-900/60 rounded-2xl p-8 shadow-2xl">
          <div className="w-16 h-16 bg-red-950/80 border border-red-800 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Administrative Access Restricted</h1>
          <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
            The Administrative Operations Dashboard is strictly restricted to authenticated
            staff members with authorized role taxonomy (Branch Manager, Regional Director, Super Admin).
          </p>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 max-w-sm mx-auto mb-6 text-left text-xs font-mono space-y-1">
            <p className="text-slate-500">Current User UID: <span className="text-slate-300">{user?.uid || 'Not signed in'}</span></p>
            <p className="text-slate-500">Authenticated Role: <span className="text-amber-400">{role}</span></p>
            <p className="text-slate-500">Assigned Branch: <span className="text-slate-300">{assignedBranch || 'None'}</span></p>
          </div>
          <button
            onClick={() => onNavigate('orders')}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition"
          >
            Return to Customer Orders
          </button>
        </div>
      </div>
    );
  }

  const activeOrder = orders.find((o) => o.id === selectedOrderId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner / Operator Identity Badge */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center text-amber-400 shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">Staff Operations Center</h1>
              <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase rounded-full bg-amber-950 text-amber-300 border border-amber-800">
                Phase 5C Verified
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Authoritative administrative management with strict server-side branch isolation & audit logging.
            </p>
          </div>
        </div>

        {/* Actor Metadata Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg flex items-center gap-2">
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">Role:</span>
            <span className="font-semibold text-slate-200 capitalize">{role.replace('_', ' ')}</span>
          </div>
          <div className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400">Branch Scope:</span>
            <span className="font-semibold text-slate-200 uppercase font-mono">
              {assignedBranch ? assignedBranch : 'Global Regional Hub'}
            </span>
          </div>
          <button
            onClick={() => {
              loadOrders();
              if (isPrivilegedAuditViewer) loadAuditLogs();
            }}
            disabled={loading}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 bg-red-950/60 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-emerald-200 text-xs flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 space-x-4">
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 px-2 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'orders'
              ? 'border-amber-400 text-amber-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Order Fulfillment ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`pb-3 px-2 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'inventory'
              ? 'border-amber-400 text-amber-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Inventory Replenishment</span>
        </button>

        {isPrivilegedAuditViewer && (
          <button
            onClick={() => {
              setActiveTab('audit_logs');
              loadAuditLogs();
            }}
            className={`pb-3 px-2 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'audit_logs'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Audit Trail ({auditLogs.length})</span>
          </button>
        )}
      </div>

      {/* TAB 1: ORDER FULFILLMENT & LIFECYCLE */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* Branch Filter (Only for Regional Director / Super Admin) */}
          {(!assignedBranch || role === 'super_admin' || role === 'regional_director') && (
            <div className="flex items-center gap-3 bg-slate-900 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 font-medium">Filter by Branch:</span>
              <select
                value={selectedBranchFilter}
                onChange={(e) => setSelectedBranchFilter(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500"
              >
                <option value="">All Permitted Regional Branches</option>
                {BRANCHES_DATA.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.municipality})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Orders Grid / Details Split View */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Orders List */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
              <div className="px-4 py-3 bg-slate-950/70 border-b border-slate-800 text-xs font-semibold text-slate-300 flex justify-between items-center">
                <span>Active Orders Queue</span>
                <span className="font-mono text-slate-500">{orders.length} orders</span>
              </div>
              <div className="divide-y divide-slate-800 max-h-[600px] overflow-y-auto">
                {orders.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    No orders found matching the authorized branch scope.
                  </div>
                ) : (
                  orders.map((o) => {
                    const isSelected = o.id === selectedOrderId;
                    return (
                      <button
                        key={o.id}
                        onClick={() => setSelectedOrderId(o.id)}
                        className={`w-full text-left p-4 transition flex flex-col gap-2 ${
                          isSelected ? 'bg-slate-800/80 border-l-4 border-amber-400' : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-xs text-slate-200">{o.id}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full uppercase bg-slate-950 text-slate-400 border border-slate-800">
                            {o.pickupBranchId || o.branchId || 'daet'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>{o.customer?.firstName} {o.customer?.lastName}</span>
                          <span className="font-bold text-amber-400">₱{Number(o.total || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px]">
                          <span
                            className={`px-2 py-0.5 rounded font-mono ${
                              o.fulfillmentStatus === 'completed'
                                ? 'bg-emerald-950 text-emerald-400'
                                : o.fulfillmentStatus === 'cancelled'
                                ? 'bg-red-950 text-red-400'
                                : 'bg-amber-950 text-amber-400'
                            }`}
                          >
                            {o.fulfillmentStatus || 'pending_processing'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded font-mono ${
                              o.paymentStatus === 'paid'
                                ? 'bg-emerald-950 text-emerald-400'
                                : 'bg-slate-950 text-slate-400'
                            }`}
                          >
                            {o.paymentStatus || 'pending_payment'}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Selected Order Detailed Action Panel */}
            <div className="lg:col-span-7">
              {activeOrder ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div>
                      <h2 className="text-lg font-bold text-white font-mono">{activeOrder.id}</h2>
                      <p className="text-xs text-slate-400">
                        Placed on {new Date(activeOrder.createdAt).toLocaleString()} · Method:{' '}
                        <span className="capitalize">{activeOrder.fulfillmentMethod || 'pickup'}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Total Due</span>
                      <span className="text-xl font-bold text-amber-400">
                        ₱{Number(activeOrder.total || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="grid grid-cols-2 gap-4 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-slate-500 block mb-0.5">Recipient</span>
                      <span className="font-semibold text-slate-200">
                        {activeOrder.customer?.firstName} {activeOrder.customer?.lastName}
                      </span>
                      <span className="text-slate-400 block">{activeOrder.customer?.phone}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">Assigned Fulfillment Branch</span>
                      <span className="font-mono text-amber-300 uppercase">
                        {activeOrder.pickupBranchId || activeOrder.branchId || 'daet'}
                      </span>
                    </div>
                  </div>

                  {/* Order Line Items */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-300">Items Ordered</span>
                    <div className="divide-y divide-slate-800 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden text-xs">
                      {activeOrder.items?.map((item: any, idx: number) => (
                        <div key={idx} className="p-3 flex items-center justify-between">
                          <div>
                            <span className="font-medium text-slate-200 block">{item.name || item.skuId}</span>
                            <span className="text-[11px] text-slate-400 font-mono">Qty: {item.quantity}</span>
                          </div>
                          <span className="font-mono text-slate-300">
                            ₱{Number(item.totalPrice || 0).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Authoritative Action Controls */}
                  <div className="pt-4 border-t border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Authorized Lifecycle Transitions
                      </span>
                      {actionLoading && <span className="text-xs text-amber-400 animate-pulse">Processing...</span>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Payment actions */}
                      {activeOrder.paymentStatus !== 'paid' && (
                        <button
                          disabled={actionLoading}
                          onClick={() => handleUpdateStatus(activeOrder.id, 'paid')}
                          className="px-4 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
                        >
                          <DollarSign className="w-4 h-4" />
                          <span>Verify & Mark Paid</span>
                        </button>
                      )}

                      {/* Fulfillment transitions */}
                      {activeOrder.fulfillmentStatus === 'pending_processing' && (
                        <button
                          disabled={actionLoading}
                          onClick={() => handleUpdateStatus(activeOrder.id, undefined, 'ready_for_pickup')}
                          className="px-4 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
                        >
                          <Package className="w-4 h-4" />
                          <span>Mark Ready for Pickup</span>
                        </button>
                      )}

                      {(activeOrder.fulfillmentStatus === 'ready_for_pickup' ||
                        activeOrder.fulfillmentStatus === 'in_transit') && (
                        <button
                          disabled={actionLoading}
                          onClick={() => handleUpdateStatus(activeOrder.id, undefined, 'completed')}
                          className="px-4 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Complete Order</span>
                        </button>
                      )}

                      {activeOrder.fulfillmentStatus !== 'completed' &&
                        activeOrder.fulfillmentStatus !== 'cancelled' && (
                          <button
                            disabled={actionLoading}
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Are you sure you want to cancel Order ${activeOrder.id}? This will transactionally restore reserved inventory on the server.`
                                )
                              ) {
                                handleUpdateStatus(activeOrder.id, undefined, 'cancelled');
                              }
                            }}
                            className="px-4 py-2.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition sm:col-span-2"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Cancel Order & Restore Inventory</span>
                          </button>
                        )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-500 text-xs">
                  Select an order from the list to view details and execute authorized actions.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INVENTORY REPLENISHMENT */}
      {activeTab === 'inventory' && (
        <div className="max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              <span>Branch Inventory Restocking</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Transactionally replenish physical bottle stocks for regional distribution. Audited server-side.
            </p>
          </div>

          <form onSubmit={handleReplenish} className="space-y-4">
            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">
                Target Branch Facility
              </label>
              <select
                disabled={Boolean(assignedBranch && role !== 'super_admin' && role !== 'regional_director')}
                value={replenishBranch}
                onChange={(e) => setReplenishBranch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl p-3 focus:outline-none focus:border-amber-500 disabled:opacity-60"
              >
                {BRANCHES_DATA.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.municipality})
                  </option>
                ))}
              </select>
              {assignedBranch && role !== 'super_admin' && role !== 'regional_director' && (
                <span className="text-[11px] text-slate-500 mt-1 block">
                  🔒 Branch selection locked to your assigned post ({assignedBranch}).
                </span>
              )}
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">
                Product SKU
              </label>
              <select
                value={replenishSku}
                onChange={(e) => setReplenishSku(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl p-3 focus:outline-none focus:border-amber-500"
              >
                <option value="hci-cmd-65ml">HCI CMD 65ml Concentrated Mineral Drops</option>
                <option value="hci-cmd-30ml">HCI CMD 30ml Travel / Pocket Edition</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">
                Units to Add (+Stock)
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={replenishQty}
                onChange={(e) => setReplenishQty(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl p-3 focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10"
            >
              <TrendingUp className="w-4 h-4" />
              <span>{actionLoading ? 'Committing Transaction...' : 'Commit Stock Replenishment'}</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: AUDIT TRAIL (SUPER ADMIN & REGIONAL DIRECTOR ONLY) */}
      {activeTab === 'audit_logs' && isPrivilegedAuditViewer && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                <span>Structured Audit Trail</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Append-only server-generated audit records. Client writes strictly denied. No sensitive secrets stored.
              </p>
            </div>
            <button
              onClick={loadAuditLogs}
              className="px-3 py-1.5 bg-slate-900 border border-slate-700 hover:border-amber-500 text-slate-300 rounded-lg text-xs flex items-center gap-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Log</span>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Resource & ID</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Correlation ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No audit events recorded yet.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/40 font-mono text-[11px]">
                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Recent'}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-200">
                          {log.action}
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          <span className="text-amber-400 block">{log.actorRole}</span>
                          <span className="text-slate-500 text-[10px]">{log.actorUid}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          <span className="block text-slate-200">{log.targetResource}</span>
                          <span className="text-slate-500 text-[10px]">{log.targetId || 'N/A'}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.success
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                                : 'bg-red-950 text-red-400 border border-red-800/40'
                            }`}
                          >
                            {log.success ? 'SUCCESS' : 'FAILED'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[10px]">
                          {log.correlationId || 'N/A'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
