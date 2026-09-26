/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { STATUTORY_NOTICES } from '../../data/compliance';

export const BirSealBadge: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  return (
    <div
      className={`border border-amber-500/40 bg-slate-900/90 rounded-lg p-4 text-slate-300 ${
        compact ? 'max-w-md' : 'max-w-xl'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Visual Badge Frame Placeholder */}
        <div className="shrink-0 w-20 h-24 border-2 border-dashed border-amber-400/50 bg-amber-950/20 rounded flex flex-col items-center justify-center p-1 text-center">
          <div className="w-8 h-8 rounded-full border border-amber-400/60 flex items-center justify-center mb-1">
            <span className="text-[10px] font-bold text-amber-300">BIR</span>
          </div>
          <span className="text-[8px] font-mono uppercase tracking-tighter text-amber-200/90 leading-tight">
            Seal Badge
          </span>
          <span className="text-[7px] text-amber-400/70 mt-0.5">RMC 38-2026</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
              BIR Online Registration Seal
            </span>
            <span className="text-slate-500" aria-hidden="true">·</span>
            <span className="text-[11px] font-mono text-amber-400/90">
              RMC No. 38-2026 Placeholder
            </span>
          </div>

          <p className="text-xs text-slate-300 mt-1 leading-snug">
            Under Bureau of Internal Revenue (BIR) RMC No. 38-2026, Philippine digital merchants must display the official BIR Registration Seal with an interactive QR code linking to taxpayer registration verification.
          </p>

          <div className="mt-2.5 pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Official Status:</span>
              <span className="text-amber-300 font-mono">PENDING OFFICIAL BUSINESS ASSET ISSUANCE</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">TIN & Tax Type:</span>
              <span className="text-slate-300 italic">
                Awaiting submission of BIR Form 2303 Certificate of Registration
              </span>
            </div>
            <div className="text-[10px] text-slate-400 leading-tight pt-1">
              {STATUTORY_NOTICES.BIR_DISCLOSURES.recordsRetentionStatute}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
