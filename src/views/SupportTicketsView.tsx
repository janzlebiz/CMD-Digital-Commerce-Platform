/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { SupportTicket, TicketCategory, TicketStatus } from '../types';
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Send,
  Building2,
  RefreshCw,
  Scale,
  ExternalLink,
  ChevronRight,
  UserCheck,
} from 'lucide-react';

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  damaged_product: 'Damaged / Leaking Bottle',
  delivery_delay: 'Courier Delivery Delay',
  billing_issue: 'Payment / Billing Discrepancy',
  wrong_item: 'Wrong Item / Quantity Received',
  cancellation_refund: 'Order Cancellation / Refund Request',
  product_inquiry: 'Dosage / Product Inquiry',
  statutory_dpa_inquiry: 'Data Privacy (DPA) Request',
};

const BRANCH_LABELS: Record<string, string> = {
  daet: 'Daet Central Hub (Provincial Capital)',
  labo: 'Labo Community Wellness Center',
  capalonga: 'Capalonga Coastal Wellness Center',
  basud: 'Basud Southern Corridor',
  paracale: 'Paracale Gold District Center',
  mercedes: 'Mercedes Fisheries Port Hub',
};

export const SupportTicketsView: React.FC = () => {
  const { user, profile } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State for New Ticket
  const [branchId, setBranchId] = useState('daet');
  const [category, setCategory] = useState<TicketCategory>('damaged_product');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [orderId, setOrderId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Staff Resolution Modal / Form State
  const [resolvingTicketId, setResolvingTicketId] = useState<string | null>(null);
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  // Status Filter for Staff
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const isStaff =
    profile?.role === 'branch_manager' ||
    profile?.role === 'regional_director' ||
    profile?.role === 'super_admin';

  const fetchTickets = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/support/tickets', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to load support tickets.');
      }
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTickets();
    }
  }, [user]);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          branchId,
          category,
          subject,
          description,
          orderId: orderId.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit grievance ticket.');
      }

      setSuccessMsg('Your support grievance has been officially filed under RA 11967. Statutory 7-day resolution window is active.');
      setSubject('');
      setDescription('');
      setOrderId('');
      fetchTickets();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (ticketId: string, status: TicketStatus) => {
    if (!user) return;
    setUpdating(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const body: any = { status };
      if (status === 'resolved') {
        body.resolutionSummary = resolutionSummary;
      }
      if (internalNotes) {
        body.internalNotes = internalNotes;
      }

      const res = await fetch(`/api/support/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update ticket.');
      }

      setResolvingTicketId(null);
      setResolutionSummary('');
      setInternalNotes('');
      fetchTickets();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleManualEscalate = async (ticketId: string) => {
    if (!user) return;
    if (!confirm('Are you sure you want to escalate this complaint to the Regional Director executive redress queue?')) return;

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/support/tickets/${ticketId}/escalate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reason: 'Expedited dispute escalation requested by user under RA 11967 internal redress rules.',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to escalate ticket.');
      }
      fetchTickets();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter === 'all') return true;
    return t.status === statusFilter;
  });

  const getStatusBadge = (status: TicketStatus, isEscalated: boolean) => {
    if (status === 'escalated_sla_breach' || isEscalated) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-950 text-red-300 border border-red-700 animate-pulse">
          <AlertTriangle className="w-3.5 h-3.5" />
          SLA Breach / Escalated
        </span>
      );
    }
    switch (status) {
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-700/60">
            <Clock className="w-3.5 h-3.5" />
            Submitted (Pending Investigation)
          </span>
        );
      case 'under_investigation':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-950/80 text-blue-300 border border-blue-700/60">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Under Investigation
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Resolved & Redress Provided
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            Closed
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Statutory Banner */}
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Scale className="w-3.5 h-3.5" />
              Republic Act No. 11967 (Internet Transactions Act of 2023)
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Consumer Redress & Dispute Resolution Office
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              In statutory compliance with the Department of Trade and Industry (DTI) and the Internet Transactions Act,
              HCI CMD maintains an authoritative internal dispute redress mechanism. Every filed grievance is legally guaranteed an initial evaluation and binding resolution within{' '}
              <strong className="text-amber-400 font-bold">seven (7) calendar days</strong>. Unresolved disputes automatically escalate to executive management.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 sm:p-5 text-xs text-slate-400 space-y-2 lg:w-80 shrink-0">
            <div className="font-bold text-slate-200 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              Statutory Guarantees
            </div>
            <ul className="space-y-1.5 list-disc list-inside">
              <li>Strict 7-Day Resolution SLA</li>
              <li>Tamper-proof append-only audit trails</li>
              <li>DPA RA 10173 Health Data Privacy Firewall</li>
              <li>Escalation to Regional Director on breach</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Staff Scope Indicator */}
      {isStaff && (
        <div className="bg-amber-950/30 border border-amber-500/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                Staff Redress Operations Console
              </p>
              <p className="text-sm text-slate-200">
                Logged in as: <strong className="text-white capitalize">{profile?.role?.replace('_', ' ')}</strong>
                {profile?.assignedBranchId && (
                  <span className="ml-2 text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                    Branch Scope: {profile.assignedBranchId.toUpperCase()}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={fetchTickets}
            className="px-3.5 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition flex items-center gap-1.5 self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Queue
          </button>
        </div>
      )}

      {/* Error & Success Messages */}
      {error && (
        <div className="p-4 bg-red-950/60 border border-red-700 rounded-xl text-red-200 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-700 rounded-xl text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Grid: Submit Form (Customer) & Tickets List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: File Grievance Form */}
        {!isStaff && (
          <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                File a Redress Grievance
              </h2>
              <p className="text-xs text-slate-400">
                Submit an official consumer complaint. Our branch team is bound by law to review within 7 calendar days.
              </p>
            </div>

            {!user ? (
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-center space-y-3">
                <p className="text-xs text-slate-400">Please sign in to file and track support grievance tickets.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitTicket} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Fulfilling Branch Location *
                  </label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                    required
                  >
                    {Object.entries(BRANCH_LABELS).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Grievance Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TicketCategory)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                    required
                  >
                    {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
                      <option key={cat} value={cat}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Related Order ID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ORD-1729384729"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Complaint Summary / Subject *
                  </label>
                  <input
                    type="text"
                    placeholder="Brief description of the issue"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                    required
                    minLength={3}
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Detailed Statement of Grievance *
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Provide full details regarding the order, delivery condition, or billing problem..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                    required
                    minLength={5}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? 'Submitting to Redress Queue...' : 'File Official Complaint'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Right / Main Column: Tickets List */}
        <div className={`${isStaff ? 'lg:col-span-3' : 'lg:col-span-2'} space-y-4`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                {isStaff ? 'Branch Consumer Redress Queue' : 'My Support & Redress Tickets'}
              </h2>
              <p className="text-xs text-slate-400">
                {isStaff
                  ? 'Manage and resolve customer complaints adhering strictly to statutory 7-day deadlines.'
                  : 'Track ongoing dispute evaluations and documented resolutions.'}
              </p>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">Filter:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="all">All Statuses ({tickets.length})</option>
                <option value="submitted">Submitted</option>
                <option value="under_investigation">Under Investigation</option>
                <option value="escalated_sla_breach">SLA Escalated</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl">
              <RefreshCw className="w-6 h-6 text-amber-400 animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-400">Loading redress tickets...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
              <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">No support tickets found</p>
              <p className="text-xs text-slate-500">No grievances filed matching current filter parameters.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTickets.map((t) => {
                const isOverdue = Date.now() > Date.parse(t.slaDueAt) && t.status !== 'resolved' && t.status !== 'closed';
                return (
                  <div
                    key={t.id}
                    className={`bg-slate-900 border rounded-xl p-5 space-y-4 transition ${
                      t.isEscalated || isOverdue
                        ? 'border-red-600/80 shadow-lg shadow-red-950/30'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-mono text-xs font-bold text-amber-400">{t.id}</span>
                          {getStatusBadge(t.status, t.isEscalated)}
                          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {BRANCH_LABELS[t.branchId] || t.branchId.toUpperCase()}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-white">{t.subject}</h3>
                      </div>

                      <div className="text-right text-[11px] text-slate-400">
                        <div>Filed: {new Date(t.createdAt).toLocaleDateString()}</div>
                        <div className="text-amber-400/90 font-mono">
                          SLA Due: {new Date(t.slaDueAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800/60">
                      <p className="text-slate-400 font-semibold mb-1">
                        Category: {CATEGORY_LABELS[t.category] || t.category}
                        {t.orderId && <span className="ml-3 font-mono text-amber-400">Ref Order: {t.orderId}</span>}
                      </p>
                      <p className="leading-relaxed">{t.description}</p>
                    </div>

                    {/* Resolution Section if Resolved */}
                    {t.status === 'resolved' && t.resolutionSummary && (
                      <div className="bg-emerald-950/40 border border-emerald-700/60 rounded-lg p-3 text-xs space-y-1.5">
                        <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          Documented Redress Resolution
                        </div>
                        <p className="text-slate-200">{t.resolutionSummary}</p>
                        <p className="text-[10px] text-emerald-400/80 font-mono">
                          Resolved on: {t.resolvedAt ? new Date(t.resolvedAt).toLocaleString() : 'Recorded'} | Official:{' '}
                          {t.resolvedByName || 'Authorized Redress Officer'}
                        </p>
                      </div>
                    )}

                    {/* Escalation Notice */}
                    {t.isEscalated && (
                      <div className="bg-red-950/40 border border-red-700/60 rounded-lg p-3 text-xs space-y-1">
                        <div className="font-bold text-red-300 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                          Statutory RA 11967 SLA Escalation Active
                        </div>
                        <p className="text-slate-300">
                          This complaint exceeded the statutory 7-day resolution window or was prioritized. It is now routed to the Regional Director executive redress queue.
                        </p>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                      <div className="text-[11px] text-slate-500">
                        Complainant: {t.customerEmail}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Customer can manually request escalation if not resolved */}
                        {!isStaff && t.status !== 'resolved' && t.status !== 'closed' && !t.isEscalated && (
                          <button
                            onClick={() => handleManualEscalate(t.id)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 hover:bg-slate-800 rounded transition border border-amber-600/40"
                          >
                            Request SLA Escalation
                          </button>
                        )}

                        {/* Staff Resolution Actions */}
                        {isStaff && t.status !== 'resolved' && (
                          <>
                            {t.status === 'submitted' && (
                              <button
                                onClick={() => handleUpdateStatus(t.id, 'under_investigation')}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition"
                              >
                                Begin Investigation
                              </button>
                            )}

                            <button
                              onClick={() => setResolvingTicketId(t.id)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition"
                            >
                              Resolve Dispute
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Inline Resolution Modal / Box */}
                    {resolvingTicketId === t.id && (
                      <div className="bg-slate-950 border border-emerald-600 rounded-xl p-4 mt-3 space-y-3">
                        <h4 className="font-bold text-emerald-400 text-xs flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          Record Binding Redress Resolution ({t.id})
                        </h4>
                        <textarea
                          rows={3}
                          value={resolutionSummary}
                          onChange={(e) => setResolutionSummary(e.target.value)}
                          placeholder="Document official redress (e.g. replacement shipped, full refund authorized via GCash, or batch verified)..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setResolvingTicketId(null)}
                            className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                          >
                            Cancel
                          </button>
                          <button
                            disabled={updating || resolutionSummary.trim().length < 5}
                            onClick={() => handleUpdateStatus(t.id, 'resolved')}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition disabled:opacity-50"
                          >
                            {updating ? 'Recording...' : 'Submit Binding Resolution'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
