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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-slate-900 rounded-2xl p-6 sm:p-8 text-white border border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold mb-3">
              <QrCode className="w-4 h-4 text-amber-400" />
              Community Wellness Symposiums & Workshops
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Mineral Science & Hydration Seminars
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-2 max-w-3xl">
              Register for upcoming local branch seminars across Daet, Labo, and Capalonga. Secure real-time seats or join waitlists with dynamic HMAC-SHA256 secure attendance passes.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 rounded-xl p-1 text-xs self-stretch sm:self-auto">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-semibold transition ${
                activeTab === 'catalog' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              Seminars
            </button>
            <button
              onClick={() => setActiveTab('passes')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-semibold transition ${
                activeTab === 'passes' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              My Attendance Passes
            </button>
            {isStaff && (
              <button
                onClick={() => setActiveTab('scanner')}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-semibold transition ${
                  activeTab === 'scanner' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-300 hover:text-white'
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
          className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-red-950/40 border-red-500/40 text-red-300'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Catalog View */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          {registeringWs ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-xl mx-auto space-y-4">
              <h3 className="text-base font-bold text-white">Workshop Seminar Registration</h3>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs">
                <p className="font-bold text-amber-400">{registeringWs.title}</p>
                <p className="text-slate-400 mt-1">{registeringWs.description}</p>
              </div>

              <form onSubmit={handleRegister} className="space-y-4 text-xs">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Mobile Phone Number</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+63 9xx xxx xxxx"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
                    required
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="submit"
                    disabled={regLoading}
                    className="flex-1 py-2 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition"
                  >
                    {regLoading ? 'Registering...' : 'Confirm Registration'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegisteringWs(null)}
                    className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : workshops.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl text-slate-400 text-xs flex flex-col items-center gap-2">
              <RefreshCw className="w-8 h-8 text-slate-500 animate-spin" />
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
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-amber-500/50 transition"
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono font-bold text-amber-400 uppercase bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                          {ws.branchId}
                        </span>
                        <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          Capacity: {ws.capacity}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-white line-clamp-2">{ws.title}</h3>
                      <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{ws.description}</p>
                    </div>

                    <div className="space-y-2.5 pt-2 border-t border-slate-800">
                      <div className="flex items-center gap-1.5 text-xs text-slate-300">
                        <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
                        <span>{ws.scheduledDate}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-300">
                        <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                        <span>{ws.scheduledTime}</span>
                      </div>

                      {/* Seats & Waitlist Handles */}
                      <div className="flex justify-between items-center text-xs pt-1">
                        <span className="text-slate-400 font-medium">Availability:</span>
                        {isFull ? (
                          <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Waitlist Only (+{ws.waitlistCount})
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            {seatsLeft} Seats Left
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => setRegisteringWs(ws)}
                        className={`w-full py-2.5 rounded-xl font-bold text-xs transition ${
                          isFull
                            ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30'
                            : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
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
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-xs space-y-2">
              <Calendar className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="font-semibold">No Seminar Registrations Found</p>
              <p className="text-slate-500 text-[11px]">Join our upcoming mineral science workshops above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {registrations.map((reg) => {
                const targetWs = workshops.find((w) => w.id === reg.workshopId);
                return (
                  <div
                    key={reg.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row gap-5 items-stretch hover:border-slate-700 transition"
                  >
                    {/* Visual QR Pass Segment */}
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-between min-w-[150px] shrink-0 text-center">
                      <div className="w-24 h-24 bg-white p-2 rounded-lg relative flex items-center justify-center">
                        {/* Dynamic SVG Mock QR representing HMAC-SHA256 fingerprint */}
                        <div className="w-full h-full bg-slate-950 grid grid-cols-4 gap-1 p-1">
                          {Array.from({ length: 16 }).map((_, i) => (
                            <div
                              key={i}
                              className={`rounded-sm ${
                                (reg.signature.charCodeAt(i % reg.signature.length) + i) % 2 === 0
                                  ? 'bg-amber-400'
                                  : 'bg-slate-800'
                              }`}
                            />
                          ))}
                        </div>
                        <div className="absolute inset-0 border-2 border-amber-500/50 rounded-lg pointer-events-none"></div>
                      </div>
                      <div className="mt-3 text-[10px] font-mono text-slate-400 break-all leading-tight">
                        <span className="font-bold text-white block mb-0.5">FINGERPRINT</span>
                        {reg.signature.slice(0, 16)}...
                      </div>
                    </div>

                    {/* Pass Details Segment */}
                    <div className="flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            ID: {reg.id}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                              reg.status === 'confirmed'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : reg.status === 'waitlisted'
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                : reg.status === 'attended'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {reg.status}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-white mt-2 line-clamp-1">
                          {targetWs?.title || 'Educational Workshop'}
                        </h4>
                        <p className="text-xs text-slate-400">{reg.customerName}</p>

                        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 mt-2.5 pt-2.5 border-t border-slate-800">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>{targetWs?.scheduledDate}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>{targetWs?.scheduledTime}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1.5">
                        {isStaff && reg.status === 'confirmed' && (
                          <button
                            onClick={() => prefillScan(reg)}
                            className="flex-1 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-400 rounded-lg flex items-center justify-center gap-1.5 transition"
                          >
                            <ScanLine className="w-3.5 h-3.5" />
                            Test QR Check-in
                          </button>
                        )}
                        <span className="text-[9px] text-slate-500 flex items-center gap-1">
                          <Lock className="w-3 h-3 text-emerald-400" />
                          HMAC-SHA256 Secured
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
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-2">
            <ScanLine className="w-6 h-6 text-amber-400" />
            <div>
              <h3 className="text-base font-bold text-white">Staff Mobile QR Scanner & Check-in Simulator</h3>
              <p className="text-xs text-slate-400">
                Authorized staff role detected. Re-evaluates HMAC signatures on the server to prevent attendance forgery.
              </p>
            </div>
          </div>

          <form onSubmit={handleCheckIn} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Pass Registration ID</label>
                <input
                  type="text"
                  value={scanRegId}
                  onChange={(e) => setScanRegId(e.target.value)}
                  placeholder="e.g. REG-1234-5678"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Pass Cryptographic Signature</label>
                <input
                  type="text"
                  value={scanSignature}
                  onChange={(e) => setScanSignature(e.target.value)}
                  placeholder="64-character SHA256 signature"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-[10px]"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={scanLoading}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              {scanLoading ? 'Verifying Pass Signature...' : 'Scan & Record Check-In'}
            </button>
          </form>

          {scanResult && (
            <div
              className={`p-4 rounded-xl border space-y-2 text-xs ${
                scanResult.success
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                  : 'bg-red-950/30 border-red-500/30 text-red-300'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5">
                {scanResult.success ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                )}
                <span>{scanResult.success ? 'Attendance Verified' : 'Check-In Refused'}</span>
              </div>
              <p className="text-[11px] text-slate-300">{scanResult.message}</p>
              {scanResult.registration && (
                <div className="p-3 bg-slate-950/60 rounded border border-slate-800 text-[10px] font-mono text-slate-400 space-y-1 mt-2">
                  <div>Participant: {scanResult.registration.customerName}</div>
                  <div>Status: <span className="text-emerald-400 font-bold uppercase">{scanResult.registration.status}</span></div>
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
