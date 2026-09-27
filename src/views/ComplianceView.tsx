/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PageView } from '../types';
import { ShieldCheck, Lock, FileText, CheckCircle2 } from 'lucide-react';

export const ComplianceView: React.FC<{ onNavigate: (view: PageView) => void }> = ({ onNavigate }) => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
          <ShieldCheck className="w-4 h-4" />
          Regulatory & Statutory Architecture
        </div>
        <h1 className="text-3xl font-extrabold text-white">Legal, Regulatory & Privacy Compliance</h1>
        <p className="text-sm text-slate-400 max-w-2xl mx-auto">
          Overview of platform compliance with Philippine statutes including RA 7394, RA 10173, RA 11967, and FDA Administrative Orders.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="text-xs font-mono font-bold text-amber-400">RA 7394 & FDA Regulations</div>
          <h3 className="text-base font-bold text-white">Food Supplement Classification</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            HCI CMD is strictly marketed and labeled as a dietary mineral supplement under Food and Drug Administration (FDA) regulations. The statutory disclaimer "No Approved Therapeutic Claims" is prominently displayed across all public channels.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="text-xs font-mono font-bold text-emerald-400">RA 10173 (Data Privacy Act of 2012)</div>
          <h3 className="text-base font-bold text-white">Section 13(a) Health Data Envelope Encryption</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Customer health questionnaires are classified as Sensitive Personal Information (SPI) and encrypted using Google Cloud KMS AES-256-GCM envelope cryptography. Retail clerks have zero read visibility.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="text-xs font-mono font-bold text-blue-400">RA 11967 (Internet Transactions Act of 2023)</div>
          <h3 className="text-base font-bold text-white">Consumer Redress & E-Commerce Standards</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Transparent pricing, authentic product origin verification, branch inventory visibility, and formal 7-calendar-day internal complaint redress tracking.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="text-xs font-mono font-bold text-purple-400">RA 2382 (Medical Act of 1959)</div>
          <h3 className="text-base font-bold text-white">Lifestyle & Wellness Educational Boundary</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Consultations do not constitute the practice of medicine or pharmaceutical prescribing. All sessions require standalone explicit informed consent prior to scheduling.
          </p>
        </div>
      </div>
    </div>
  );
};
