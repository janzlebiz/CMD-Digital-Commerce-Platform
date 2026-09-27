/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';

export const StatutoryBanner: React.FC = () => {
  const [expanded, setExpanded] = useState<boolean>(false);

  return (
    <aside
      aria-label="Statutory Regulatory Advisory"
      className="bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 border-b border-amber-500/30 text-amber-100 text-xs px-4 py-2.5 shadow-sm transition-all"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-medium tracking-wide">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
          <span className="font-bold text-amber-300 uppercase tracking-wider text-[11px] bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/40">
            FDA Philippines Compliance Advisory
          </span>
          <span className="hidden sm:inline text-slate-300">|</span>
          <span className="font-semibold text-slate-100">
            MAHALAGANG PAALALA: ANG HCI CELL MINERAL DROPS (CMD) AY HINDI GAMOT AT HINDI DAPAT GAMITING PANGGAMOT SA ANUMANG URI NG SAKIT.
          </span>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 hover:text-amber-100 underline decoration-amber-500/50 underline-offset-2 shrink-0 transition"
          aria-expanded={expanded}
        >
          <span>{expanded ? 'Hide Legal Disclaimers' : 'View Statutory Disclaimers'}</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {expanded && (
        <div className="max-w-7xl mx-auto mt-2 pt-2 border-t border-amber-500/20 text-[11px] text-amber-200/90 leading-relaxed grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-start gap-2 bg-slate-950/40 p-2 rounded border border-amber-500/20">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-300">Food Supplement Classification:</strong> Registered under FDA Philippines regulations as a dietary mineral supplement. No therapeutic claims are approved or intended for diagnosing, treating, curing, or preventing any disease.
            </div>
          </div>
          <div className="flex items-start gap-2 bg-slate-950/40 p-2 rounded border border-amber-500/20">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-300">Naturopathic Wellness Education:</strong> Wellness consultations do not constitute the practice of medicine under RA 2382. Sensitive health data is encrypted under RA 10173 Section 13(a) with Google Cloud KMS.
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
