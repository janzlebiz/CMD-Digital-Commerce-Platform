/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Workshop, WorkshopRegistration } from '../types';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  AlertTriangle,
  CheckCircle,
  FileText,
  Lock,
  QrCode,
  ShieldCheck,
  RefreshCw,
  Search,
  ScanLine,
  Sparkles,
} from 'lucide-react';

export const WorkshopsView: React.FC = () => {
  const { user, profile } = useAuth();

  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [registrations, setRegistrations] = useState<WorkshopRegistration[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'catalog' | 'passes' | 'scanner'>('catalog');

  // Registration Form State
  const [registeringWs, setRegisteringWs] = useState<Workshop | null>(null);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [regLoading, setRegLoading] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Staff QR Check-in Simulator State
  const [scanRegId, setScanRegId] = useState<string>('');
  const [scanSignature, setScanSignature] = useState<string>('');
  const [scanLoading, setScanLoading] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; registration?: any } | null>(null);

  const isStaff =
    profile?.role === 'branch_manager' ||
    profile?.role === 'regional_director' ||
    profile?.role === 'super_admin';

  useEffect(() => {
    if (profile) {
      setCustomerName(`${profile.firstName || ''} ${profile.lastName || ''}`.trim());
      setCustomerEmail(profile.email || '');
    }
  }, [profile]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const [wsRes, regRes] = await Promise.all([
        fetch('/api/workshops', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/workshops/my-registrations', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (wsRes.ok) {
        const wsData = await wsRes.json();
        setWorkshops(wsData.workshops || []);
      }
      if (regRes.ok) {
        const regData = await regRes.json();
        setRegistrations(regData.registrations || []);
      }
    } catch (err) {
      console.error('Failed to load workshops data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !registeringWs) return;

    setRegLoading(true);
    setFeedbackMsg(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/workshops/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workshopId: registeringWs.id,
          customerName,
          customerEmail,
          customerPhone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete registration.');
      }

      setFeedbackMsg({
        type: 'success',
        text: `Successfully registered for ${registeringWs.title}! Status is ${data.registration.status.toUpperCase()}.`,
      });
      setRegisteringWs(null);
      loadData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message });
    } finally {
      setRegLoading(false);
    }
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isStaff) return;

    setScanLoading(true);
    setScanResult(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/workshops/check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          registrationId: scanRegId,
          signature: scanSignature,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setScanResult({ success: false, message: data.error || 'Verification Failed.' });
      } else {
        setScanResult({
          success: true,
          message: data.message || 'Check-in successful!',
          registration: data.registration,
        });
        loadData();
      }
    } catch (err: any) {
      setScanResult({ success: false, message: err.message });
    } finally {
      setScanLoading(false);
    }
  };

  // Pre-fill scanner details to let users test instantly
  const prefillScan = (reg: WorkshopRegistration) => {
    setScanRegId(reg.id);
    setScanSignature(reg.signature);
    setActiveTab('scanner');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Header Banner matching White & Blue Branding */}
      <div className="bg-gradient-to-br from-sky-600 via-sky-700 to-blue-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl border border-sky-400/30">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-sky-100 text-xs font-extrabold tracking-wide">
              <QrCode className="w-4 h-4 text-cyan-300" />
              <span>Community Wellness Symposiums & Workshops</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              Mineral Science & Hydration Seminars
            </h1>
            <p className="text-sky-100 text-xs sm:text-base max-w-3xl leading-relaxed">
              Register for upcoming local branch seminars across Daet, Labo, and Capalonga. Secure real-time seats or join waitlists with dynamic HMAC-SHA256 secure attendance passes.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white/10 dark:bg-slate-900/60 backdrop-blur-md border border-white/20 dark:border-slate-700 rounded-2xl p-1.5 text-xs self-stretch sm:self-auto shrink-0 shadow-sm">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-bold transition ${
                activeTab === 'catalog' ? 'bg-white text-sky-900 shadow-md' : 'text-sky-100 hover:text-white'
              }`}
            >
              Seminars
            </button>
            <button
              onClick={() => setActiveTab('passes')}
              className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-bold transition ${
                activeTab === 'passes' ? 'bg-white text-sky-900 shadow-md' : 'text-sky-100 hover:text-white'
              }`}
            >
              My Attendance Passes
            </button>
            {isStaff && (
              <button
                onClick={() => setActiveTab('scanner')}
                className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-bold transition ${
                  activeTab === 'scanner' ? 'bg-white text-sky-900 shadow-md' : 'text-sky-100 hover:text-white'
                }`}
              >
                Staff QR Scanner
              </button>
            )}
          </div>
        </div>
      </div>

      {feedbackMsg && (
        <div
          className={`p-4 rounded-2xl border flex items-start gap-3 text-xs ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
              : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-500/40 text-red-800 dark:text-red-300'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Catalog View */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          {registeringWs ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl mx-auto space-y-5 shadow-md">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Workshop Seminar Registration</h3>
              <div className="p-4 bg-sky-50 dark:bg-slate-950 border border-sky-100 dark:border-slate-800 rounded-2xl text-xs">
                <p className="font-bold text-sky-800 dark:text-sky-300">{registeringWs.title}</p>
                <p className="text-slate-600 dark:text-slate-400 mt-1">{registeringWs.description}</p>
              </div>

              <form onSubmit={handleRegister} className="space-y-4 text-xs">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Mobile Phone Number</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+63 9xx xxx xxxx"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
                    required
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="submit"
                    disabled={regLoading}
                    className="flex-1 py-3 px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl transition shadow-sm cursor-pointer"
                  >
                    {regLoading ? 'Registering...' : 'Confirm Registration'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegisteringWs(null)}
                    className="py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : workshops.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-slate-500 dark:text-slate-400 text-xs flex flex-col items-center gap-2">
              <RefreshCw className="w-8 h-8 text-sky-600 dark:text-sky-400 animate-spin" />
              <span>Fetching available workshop dates across Camarines Norte...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {workshops.map((ws) => {
                const seatsLeft = ws.capacity - ws.seatsAllocated;
                const isFull = seatsLeft <= 0;
                return (
                  <div
                    key={ws.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex flex-col justify-between space-y-4 hover:border-sky-400 transition shadow-sm"
                  >
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono font-bold text-sky-700 dark:text-sky-400 uppercase bg-sky-50 dark:bg-sky-950/80 px-2.5 py-0.5 rounded-lg border border-sky-200 dark:border-sky-800">
                          {ws.branchId} Branch
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          Capacity: {ws.capacity}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-2">{ws.title}</h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">{ws.description}</p>
                    </div>

                    <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <Calendar className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                        <span>{ws.scheduledDate}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                        <span>{ws.scheduledTime}</span>
                      </div>

                      {/* Seats & Waitlist Handles */}
                      <div className="flex justify-between items-center text-xs pt-1">
                        <span className="text-slate-500 font-medium">Availability:</span>
                        {isFull ? (
                          <span className="text-amber-700 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Waitlist Only (+{ws.waitlistCount})
                          </span>
                        ) : (
                          <span className="text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                            {seatsLeft} Seats Left
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => setRegisteringWs(ws)}
                        className={`w-full py-3 rounded-xl font-bold text-xs transition cursor-pointer shadow-xs ${
                          isFull
                            ? 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                            : 'bg-sky-600 hover:bg-sky-700 text-white'
                        }`}
                      >
                        {isFull ? 'Join Waitlist' : 'Reserve Seat'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Passes Tab */}
      {activeTab === 'passes' && (
        <div className="space-y-6">
          {registrations.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-slate-500 dark:text-slate-400 text-xs space-y-2">
              <Calendar className="w-8 h-8 text-sky-600 dark:text-sky-400 mx-auto" />
              <p className="font-semibold text-slate-900 dark:text-white">No Seminar Registrations Found</p>
              <p className="text-slate-500 text-[11px]">Join our upcoming mineral science workshops above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {registrations.map((reg) => {
                const targetWs = workshops.find((w) => w.id === reg.workshopId);
                return (
                  <div
                    key={reg.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 flex flex-col md:flex-row gap-5 items-stretch hover:border-sky-400 transition shadow-sm"
                  >
                    {/* Visual QR Pass Segment */}
                    <div className="bg-sky-50 dark:bg-slate-950 border border-sky-100 dark:border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-between min-w-[150px] shrink-0 text-center">
                      <div className="w-24 h-24 bg-white p-2 rounded-xl relative flex items-center justify-center shadow-xs">
                        <div className="w-full h-full bg-slate-950 grid grid-cols-4 gap-1 p-1 rounded-lg">
                          {Array.from({ length: 16 }).map((_, i) => (
                            <div
                              key={i}
                              className={`rounded-xs ${
                                (reg.signature.charCodeAt(i % reg.signature.length) + i) % 2 === 0
                                  ? 'bg-sky-400'
                                  : 'bg-slate-800'
                              }`}
                            />
                          ))}
                        </div>
                        <div className="absolute inset-0 border-2 border-sky-500/50 rounded-xl pointer-events-none"></div>
                      </div>
                      <div className="mt-3 text-[10px] font-mono text-slate-600 dark:text-slate-400 break-all leading-tight">
                        <span className="font-bold text-sky-700 dark:text-sky-300 block mb-0.5">FINGERPRINT</span>
                        {reg.signature.slice(0, 16)}...
                      </div>
                    </div>

                    {/* Pass Details Segment */}
                    <div className="flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono font-bold text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/80 px-2 py-0.5 rounded border border-sky-200 dark:border-sky-800">
                            ID: {reg.id}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full ${
                              reg.status === 'confirmed'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200'
                                : reg.status === 'waitlisted'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200'
                                : reg.status === 'attended'
                                ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-200'
                                : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {reg.status}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-2 line-clamp-1">
                          {targetWs?.title || 'Educational Workshop'}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{reg.customerName}</p>

                        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400 mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{targetWs?.scheduledDate}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{targetWs?.scheduledTime}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1.5">
                        {isStaff && reg.status === 'confirmed' && (
                          <button
                            onClick={() => prefillScan(reg)}
                            className="flex-1 py-2 px-3 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-xs font-bold text-sky-700 dark:text-sky-300 rounded-xl flex items-center justify-center gap-1.5 border border-sky-200 dark:border-sky-800 transition cursor-pointer"
                          >
                            <ScanLine className="w-3.5 h-3.5" />
                            Test QR Check-in
                          </button>
                        )}
                        <span className="text-[9px] text-slate-500 flex items-center gap-1">
                          <Lock className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                          HMAC-SHA256
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Staff QR Check-in Simulator */}
      {activeTab === 'scanner' && isStaff && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl mx-auto space-y-6 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-400 flex items-center justify-center">
              <ScanLine className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Staff Mobile QR Scanner & Verification</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Authorized staff role detected. Re-evaluates HMAC signatures on the server to prevent attendance forgery.
              </p>
            </div>
          </div>

          <form onSubmit={handleCheckIn} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Pass Registration ID</label>
                <input
                  type="text"
                  value={scanRegId}
                  onChange={(e) => setScanRegId(e.target.value)}
                  placeholder="e.g. REG-1234-5678"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Pass Cryptographic Signature</label>
                <input
                  type="text"
                  value={scanSignature}
                  onChange={(e) => setScanSignature(e.target.value)}
                  placeholder="64-character SHA256 signature"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono text-[10px]"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={scanLoading}
              className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              {scanLoading ? 'Verifying Pass Signature...' : 'Scan & Record Check-In'}
            </button>
          </form>

          {scanResult && (
            <div
              className={`p-4 rounded-2xl border space-y-2 text-xs ${
                scanResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                  : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-500/30 text-red-800 dark:text-red-300'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5">
                {scanResult.success ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                )}
                <span>{scanResult.success ? 'Attendance Verified' : 'Check-In Refused'}</span>
              </div>
              <p className="text-[11px] text-slate-700 dark:text-slate-300">{scanResult.message}</p>
              {scanResult.registration && (
                <div className="p-3.5 bg-white dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-400 space-y-1 mt-2">
                  <div>Participant: <span className="font-bold text-slate-900 dark:text-white">{scanResult.registration.customerName}</span></div>
                  <div>Status: <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase">{scanResult.registration.status}</span></div>
                  <div className="break-all">Signature: {scanResult.registration.signature}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
