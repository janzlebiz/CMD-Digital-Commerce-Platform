/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PageView } from '../types';
import { ShieldCheck, Lock, FileText, CheckCircle2, Sparkles } from 'lucide-react';

export const ComplianceView: React.FC<{ onNavigate: (view: PageView) => void }> = ({ onNavigate }) => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 text-xs font-bold tracking-wide">
          <ShieldCheck className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          <span>Statutory & Regulatory Architecture</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Legal, Regulatory & Privacy Compliance
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Overview of platform compliance with Philippine statutes including RA 7394, RA 10173, RA 11967, and FDA Administrative Orders.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
          <div className="text-xs font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider">RA 7394 & FDA Regulations</div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Food Supplement Classification</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            HCI CMD is strictly marketed and labeled as a dietary mineral food supplement under Food and Drug Administration (FDA) regulations. The statutory disclaimer "No Approved Therapeutic Claims" is prominently displayed across all public channels.
          </p>
        </div>

        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
          <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">RA 10173 (Data Privacy Act of 2012)</div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Section 13(a) Health Data Envelope Encryption</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Customer health questionnaires are classified as Sensitive Personal Information (SPI) and encrypted using Google Cloud KMS AES-256-GCM envelope cryptography. Retail store clerks have zero read visibility into health records.
          </p>
        </div>

        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
          <div className="text-xs font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider">RA 11967 (Internet Transactions Act of 2023)</div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Consumer Redress & E-Commerce Standards</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Transparent pricing, authentic product origin verification, branch inventory visibility, and formal 7-calendar-day internal complaint redress tracking.
          </p>
        </div>

        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
          <div className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">RA 2382 (Medical Act of 1959)</div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Lifestyle & Wellness Educational Boundary</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Consultations do not constitute the practice of medicine or pharmaceutical prescribing. All sessions require standalone explicit informed consent prior to scheduling.
          </p>
        </div>
      </div>
    </div>
  );
};
