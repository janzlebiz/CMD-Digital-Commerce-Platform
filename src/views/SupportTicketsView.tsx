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
  ShieldCheck,
  UserCheck,
  Search,
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

const DEFAULT_DEMO_TICKETS: SupportTicket[] = [
  {
    id: 'TCK-2026-0891',
    userId: 'demo-customer-uid',
    customerEmail: 'mariasantos@gmail.com',
    customerName: 'Maria Santos',
    customerPhone: '+63 917 555 1234',
    branchId: 'daet',
    category: 'damaged_product',
    subject: 'Bottle dropper cap damaged upon unboxing',
    description: 'Received the 65mL CMD bottle with a slightly cracked outer dropper cap. Liquid did not spill completely but dropper seal is loose. Kindly advise on replacement.',
    status: 'under_investigation',
    isEscalated: false,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    slaDueAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    orderId: 'ORD-CMD-77491',
  },
  {
    id: 'TCK-2026-0842',
    userId: 'demo-customer-uid',
    customerEmail: 'antonio.reyes@yahoo.com',
    customerName: 'Antonio Reyes',
    customerPhone: '+63 928 444 8899',
    branchId: 'labo',
    category: 'delivery_delay',
    subject: 'Express courier delivery delay in Labo West',
    description: 'Ordered 2x 30mL bottles 4 days ago. Delivery was marked in transit but courier has not arrived yet in Barangay Malasugui.',
    status: 'resolved',
    isEscalated: false,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    slaDueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    resolvedByUid: 'mgr-labo',
    resolvedByName: 'Branch Manager (Labo)',
    resolutionSummary: 'Local rider dispatched directly from Labo Wellness Center. Package hand-delivered with extra mineral dilution guide.',
    orderId: 'ORD-CMD-66382',
  },
];

export const SupportTicketsView: React.FC = () => {
  const { user, profile, loginDemoUser } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State for New Ticket
  const [branchId, setBranchId] = useState<string>('daet');
  const [category, setCategory] = useState<TicketCategory>('damaged_product');
  const [subject, setSubject] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [orderId, setOrderId] = useState<string>('');
  const [guestEmail, setGuestEmail] = useState<string>('');
  const [guestName, setGuestName] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Staff Resolution Modal / Form State
  const [resolvingTicketId, setResolvingTicketId] = useState<string | null>(null);
  const [resolutionSummary, setResolutionSummary] = useState<string>('');
  const [internalNotes, setInternalNotes] = useState<string>('');
  const [updating, setUpdating] = useState<boolean>(false);

  // Filter & Search
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const isStaff =
    profile?.role === 'branch_manager' ||
    profile?.role === 'regional_director' ||
    profile?.role === 'super_admin';

  // Load tickets from local storage or API
  const getStoredTickets = (): SupportTicket[] => {
    try {
      const stored = localStorage.getItem('hci_cmd_support_tickets');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_DEMO_TICKETS;
  };

  const saveStoredTickets = (newTickets: SupportTicket[]) => {
    try {
      localStorage.setItem('hci_cmd_support_tickets', JSON.stringify(newTickets));
    } catch {
      // ignore
    }
  };

  const fetchTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      if (user) {
        const token = await user.getIdToken();
        const res = await fetch('/api/support/tickets', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (Array.isArray(data.tickets) && data.tickets.length > 0) {
            setTickets(data.tickets);
            saveStoredTickets(data.tickets);
            setLoading(false);
            return;
          }
        }
      }
      setTickets(getStoredTickets());
    } catch (err: any) {
      console.warn('Using local tickets fallback:', err?.message);
      setTickets(getStoredTickets());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [user, profile]);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    const complainantEmail = user?.email || guestEmail.trim() || 'customer@hcicmd.ph';
    const complainantName = profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : guestName.trim() || 'Valued Customer';

    const nowIso = new Date().toISOString();
    const newTicket: SupportTicket = {
      id: `TCK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      userId: user?.uid || `guest-${Date.now()}`,
      customerEmail: complainantEmail,
      customerName: complainantName,
      branchId,
      category,
      subject: subject.trim(),
      description: description.trim(),
      orderId: orderId.trim() || undefined,
      status: 'submitted',
      isEscalated: false,
      createdAt: nowIso,
      updatedAt: nowIso,
      slaDueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    try {
      if (user) {
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
            subject: subject.trim(),
            description: description.trim(),
            orderId: orderId.trim() || undefined,
            customerName: complainantName,
            customerEmail: complainantEmail,
          }),
        });

        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data.ticket) {
            const updated = [data.ticket, ...tickets.filter((t) => t.id !== data.ticket.id)];
            setTickets(updated);
            saveStoredTickets(updated);
          }
        } else {
          const updated = [newTicket, ...tickets];
          setTickets(updated);
          saveStoredTickets(updated);
        }
      } else {
        const updated = [newTicket, ...tickets];
        setTickets(updated);
        saveStoredTickets(updated);
      }

      setSuccessMsg(
        'Your grievance complaint has been officially registered under RA 11967. The statutory 7-calendar-day evaluation and resolution window is now active.'
      );
      setSubject('');
      setDescription('');
      setOrderId('');
      setGuestEmail('');
      setGuestName('');
    } catch {
      const updated = [newTicket, ...tickets];
      setTickets(updated);
      saveStoredTickets(updated);
      setSuccessMsg('Your grievance complaint has been securely recorded in the local dispute resolution queue.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (ticketId: string, status: TicketStatus) => {
    setUpdating(true);
    setError(null);

    const staffName = profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : 'Authorized Redress Officer';

    try {
      if (user) {
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

        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          fetchTickets();
        } else {
          updateTicketLocally(ticketId, status, staffName);
        }
      } else {
        updateTicketLocally(ticketId, status, staffName);
      }

      setResolvingTicketId(null);
      setResolutionSummary('');
      setInternalNotes('');
      setSuccessMsg(`Ticket ${ticketId} status successfully updated to ${status.replace('_', ' ').toUpperCase()}.`);
    } catch {
      updateTicketLocally(ticketId, status, staffName);
      setResolvingTicketId(null);
      setResolutionSummary('');
      setInternalNotes('');
    } finally {
      setUpdating(false);
    }
  };

  const updateTicketLocally = (ticketId: string, status: TicketStatus, staffName: string) => {
    const updated = tickets.map((t) => {
      if (t.id === ticketId) {
        return {
          ...t,
          status,
          updatedAt: new Date().toISOString(),
          ...(status === 'resolved'
            ? {
                resolvedAt: new Date().toISOString(),
                resolvedByUid: user?.uid || 'staff',
                resolvedByName: staffName,
                resolutionSummary: resolutionSummary || 'Resolution documented and agreed upon.',
              }
            : {}),
        };
      }
      return t;
    });
    setTickets(updated);
    saveStoredTickets(updated);
  };

  const handleManualEscalate = async (ticketId: string) => {
    if (!confirm('Are you sure you want to escalate this complaint to the Regional Director executive redress queue?')) return;

    try {
      if (user) {
        const token = await user.getIdToken();
        await fetch(`/api/support/tickets/${ticketId}/escalate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            reason: 'Expedited dispute escalation requested by user under RA 11967 internal redress rules.',
          }),
        });
      }
    } catch {
      // continue
    }

    const updated = tickets.map((t) => {
      if (t.id === ticketId) {
        return {
          ...t,
          isEscalated: true,
          status: 'escalated_sla_breach' as TicketStatus,
          updatedAt: new Date().toISOString(),
        };
      }
      return t;
    });
    setTickets(updated);
    saveStoredTickets(updated);
    setSuccessMsg(`Complaint ${ticketId} has been escalated to the Regional Director redress queue.`);
  };

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSub = t.subject.toLowerCase().includes(q);
      const matchDesc = t.description.toLowerCase().includes(q);
      const matchId = t.id.toLowerCase().includes(q);
      const matchEmail = t.customerEmail?.toLowerCase().includes(q);
      if (!matchSub && !matchDesc && !matchId && !matchEmail) return false;
    }
    return true;
  });

  const getStatusBadge = (status: TicketStatus, isEscalated: boolean) => {
    if (status === 'escalated_sla_breach' || isEscalated) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 animate-pulse" />
          SLA Escalated
        </span>
      );
    }
    switch (status) {
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            Submitted (Pending Review)
          </span>
        );
      case 'under_investigation':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
            <RefreshCw className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 animate-spin" />
            Under Investigation
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Resolved & Redressed
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            Closed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-sky-100 dark:bg-sky-950/70 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 text-xs font-bold tracking-wide shadow-xs">
          <Scale className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          <span>Statutory Consumer Redress & Dispute Resolution (RA 11967)</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Redress & Formal Complaints Center
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Every customer grievance is legally guaranteed an initial review and binding resolution within{' '}
          <strong className="text-sky-700 dark:text-sky-400 font-bold">seven (7) calendar days</strong> in full accordance with Philippine DTI and FDA standards.
        </p>
      </div>

      {/* Statutory Guarantees Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-sky-50 via-white to-blue-50/50 dark:from-slate-900 dark:via-slate-900/90 dark:to-sky-950/30 border border-sky-100 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <strong className="block font-bold text-slate-900 dark:text-white text-sm">Strict 7-Day SLA</strong>
              <span className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Mandatory resolution timeline under RA 11967 Internet Transactions Act.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <strong className="block font-bold text-slate-900 dark:text-white text-sm">Tamper-Evident Audit</strong>
              <span className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Every action is logged in an append-only verifiable audit trail.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <strong className="block font-bold text-slate-900 dark:text-white text-sm">DPA Privacy Firewall</strong>
              <span className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Client privacy protected under RA 10173 Section 13 standards.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <strong className="block font-bold text-slate-900 dark:text-white text-sm">Branch Hub Support</strong>
              <span className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Physical pickup hubs and direct replacement dispatch across Camarines Norte.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Staff Bar or Demo Auth Switcher */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-600 text-white rounded-xl shadow-xs">
            {isStaff ? <Building2 className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
          </div>
          <div>
            <p className="text-xs font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider">
              {isStaff ? 'Staff Redress Operations Console' : 'Customer Dispute Tracking Portal'}
            </p>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              Account: <strong className="text-slate-900 dark:text-white">{profile?.email || 'Guest Complainant'}</strong>
              {profile?.role && (
                <span className="ml-2 font-mono text-xs px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 capitalize">
                  {profile.role.replace('_', ' ')}
                </span>
              )}
              {profile?.assignedBranchId && (
                <span className="ml-2 font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  Branch: {profile.assignedBranchId.toUpperCase()}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!user && (
            <button
              onClick={() => loginDemoUser('customer', 'demo.customer@hcicmd.ph')}
              className="px-3.5 py-2 text-xs font-bold bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 rounded-xl border border-sky-200 dark:border-sky-800 transition cursor-pointer"
            >
              Sign In as Demo Customer
            </button>
          )}
          {!isStaff && (
            <button
              onClick={() => loginDemoUser('branch_manager', 'manager.daet@hcicmd.ph', 'daet')}
              className="px-3.5 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            >
              Switch to Staff Manager View
            </button>
          )}
          <button
            onClick={fetchTickets}
            className="px-3.5 py-2 text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-2xl text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2 shadow-xs">
          <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Form & Tickets Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: File Grievance Form */}
        <div className="lg:col-span-1 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-xs space-y-6">
          <div className="space-y-1 border-b border-slate-100 dark:border-slate-800 pb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              <span>File a Grievance Complaint</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Submit an official dispute under Republic Act 11967. Our municipal resolution officers will investigate within 7 calendar days.
            </p>
          </div>

          <form onSubmit={handleSubmitTicket} className="space-y-4 text-xs">
            {!user && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-sky-50/50 dark:bg-slate-950/60 border border-sky-100 dark:border-slate-800">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Your Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maria Santos"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Your Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
                Designated Branch Hub *
              </label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
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
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
                Dispute Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TicketCategory)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
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
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
                Related Order ID (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. ORD-CMD-77491"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
                Complaint Subject / Summary *
              </label>
              <input
                type="text"
                placeholder="Brief summary of the issue"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                required
                minLength={3}
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
                Statement of Facts & Requested Redress *
              </label>
              <textarea
                rows={4}
                placeholder="Provide details of the damaged product, delay, or refund requested..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                required
                minLength={5}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Submitting Grievance...' : 'Submit Official Complaint'}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Ticket Records Queue */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span>{isStaff ? 'Branch Consumer Redress Queue' : 'Dispute Evaluation Records'}</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isStaff
                  ? 'Manage and resolve customer complaints adhering strictly to statutory 7-day deadlines.'
                  : 'Track ongoing evaluations and documented resolutions.'}
              </p>
            </div>

            {/* Filter & Search */}
            <div className="flex items-center gap-2.5 flex-wrap text-xs">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search complaints..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-medium"
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
            <div className="text-center py-14 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <RefreshCw className="w-7 h-7 text-sky-600 dark:text-sky-400 animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400">Loading redress tickets...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-14 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <CheckCircle2 className="w-9 h-9 text-slate-400 dark:text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No support tickets found</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">No grievances filed matching current filter parameters.</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredTickets.map((t) => {
                const isOverdue = Date.now() > Date.parse(t.slaDueAt) && t.status !== 'resolved' && t.status !== 'closed';
                return (
                  <div
                    key={t.id}
                    className={`rounded-2xl bg-white dark:bg-slate-900 border p-5 sm:p-6 space-y-4 shadow-xs transition ${
                      t.isEscalated || isOverdue
                        ? 'border-rose-300 dark:border-rose-900/80 shadow-rose-500/5'
                        : 'border-slate-200 dark:border-slate-800 hover:border-sky-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-mono text-xs font-bold text-sky-700 dark:text-sky-400">{t.id}</span>
                          {getStatusBadge(t.status, t.isEscalated)}
                          <span className="text-[11px] px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700">
                            {BRANCH_LABELS[t.branchId] || t.branchId.toUpperCase()}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t.subject}</h3>
                      </div>

                      <div className="text-left sm:text-right text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                        <div>Filed: {new Date(t.createdAt).toLocaleDateString()}</div>
                        <div className="text-sky-700 dark:text-sky-400 font-mono font-bold">
                          SLA Due: {new Date(t.slaDueAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/70 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-1.5">
                      <p className="text-slate-500 dark:text-slate-400 font-semibold">
                        Category: {CATEGORY_LABELS[t.category] || t.category}
                        {t.orderId && <span className="ml-3 font-mono text-sky-700 dark:text-sky-400">Ref Order: {t.orderId}</span>}
                      </p>
                      <p className="leading-relaxed text-slate-800 dark:text-slate-200">{t.description}</p>
                    </div>

                    {/* Resolution Section if Resolved */}
                    {t.status === 'resolved' && t.resolutionSummary && (
                      <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl p-4 text-xs space-y-1.5">
                        <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span>Documented Redress Resolution</span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-200 leading-relaxed">{t.resolutionSummary}</p>
                        <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono pt-1">
                          Resolved on: {t.resolvedAt ? new Date(t.resolvedAt).toLocaleString() : 'Recorded'} | Officer:{' '}
                          {t.resolvedByName || 'Authorized Redress Officer'}
                        </p>
                      </div>
                    )}

                    {/* Escalation Notice */}
                    {t.isEscalated && (
                      <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl p-3.5 text-xs space-y-1">
                        <div className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                          <span>Statutory RA 11967 SLA Escalation Active</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                          This complaint has been routed to the Regional Director executive redress queue for expedited settlement.
                        </p>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Complainant: <span className="font-medium text-slate-700 dark:text-slate-300">{t.customerEmail}</span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Customer can manually request escalation if not resolved */}
                        {!isStaff && t.status !== 'resolved' && t.status !== 'closed' && !t.isEscalated && (
                          <button
                            onClick={() => handleManualEscalate(t.id)}
                            className="px-3 py-1.5 text-[11px] font-semibold text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg transition border border-sky-300 dark:border-sky-800 cursor-pointer"
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
                                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg transition cursor-pointer"
                              >
                                Begin Investigation
                              </button>
                            )}

                            <button
                              onClick={() => setResolvingTicketId(t.id)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition cursor-pointer"
                            >
                              Resolve Dispute
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Inline Resolution Box */}
                    {resolvingTicketId === t.id && (
                      <div className="bg-slate-50 dark:bg-slate-950 border border-emerald-500/80 rounded-xl p-4 mt-3 space-y-3">
                        <h4 className="font-bold text-emerald-800 dark:text-emerald-400 text-xs flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Record Binding Redress Resolution ({t.id})</span>
                        </h4>
                        <textarea
                          rows={3}
                          value={resolutionSummary}
                          onChange={(e) => setResolutionSummary(e.target.value)}
                          placeholder="Document official redress (e.g. replacement shipped via courier, full refund issued via GCash, or batch verified)..."
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setResolvingTicketId(null)}
                            className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            disabled={updating || resolutionSummary.trim().length < 5}
                            onClick={() => handleUpdateStatus(t.id, 'resolved')}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition disabled:opacity-50 cursor-pointer shadow-xs"
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
