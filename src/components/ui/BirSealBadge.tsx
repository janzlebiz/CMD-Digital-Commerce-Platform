/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { STATUTORY_NOTICES } from '../../data/compliance';

export const BirSealBadge: React.FC<{ compact?: boolean; theme?: 'dark' | 'light' }> = ({
  compact = false,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  return (
    <div
      className={`border rounded-lg p-3 ${
        isLight
          ? 'border-amber-800/30 bg-amber-50/50 text-slate-800'
          : 'border-amber-500/40 bg-slate-900/90 text-slate-300'
      } ${compact ? 'max-w-md' : 'max-w-xl'}`}
    >
      <div className="flex items-start gap-3">
        {/* Visual Badge Frame Placeholder */}
        <div className={`shrink-0 w-16 h-20 border-2 border-dashed rounded flex flex-col items-center justify-center p-1 text-center ${
          isLight
            ? 'border-amber-800/40 bg-amber-100/40'
            : 'border-amber-400/50 bg-amber-950/20'
        }`}>
          <div className={`w-7 h-7 rounded-full border flex items-center justify-center mb-0.5 ${
            isLight ? 'border-amber-800/60' : 'border-amber-400/60'
          }`}>
            <span className={`text-[9px] font-bold ${isLight ? 'text-amber-900' : 'text-amber-300'}`}>BIR</span>
          </div>
          <span className={`text-[7px] font-mono uppercase tracking-tighter leading-tight ${
            isLight ? 'text-amber-900/95' : 'text-amber-200/90'
          }`}>
            Seal Badge
          </span>
          <span className={`text-[6px] mt-0.5 ${isLight ? 'text-amber-900/70' : 'text-amber-400/70'}`}>RMC 38-2026</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-amber-900' : 'text-amber-300'}`}>
              BIR Online Registration Seal
            </span>
            <span className="text-slate-400 text-[10px]" aria-hidden="true">·</span>
            <span className={`text-[10px] font-mono ${isLight ? 'text-amber-800' : 'text-amber-400/90'}`}>
              RMC No. 38-2026 Placeholder
            </span>
          </div>

          <p className={`text-[10px] mt-0.5 leading-snug ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
            Under Bureau of Internal Revenue (BIR) RMC No. 38-2026, Philippine digital merchants must display the official BIR Registration Seal with an interactive QR code linking to taxpayer registration verification.
          </p>

          <div className={`mt-1.5 pt-1.5 border-t text-[10px] space-y-0.5 ${
            isLight ? 'border-amber-200/60 text-slate-600' : 'border-slate-800 text-slate-400'
          }`}>
            <div className="flex items-center gap-1.5">
              <span className="font-medium">Official Status:</span>
              <span className={`font-mono text-[9px] font-bold ${isLight ? 'text-amber-900' : 'text-amber-300'}`}>PENDING OFFICIAL BUSINESS ASSET ISSUANCE</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-medium">TIN & Tax Type:</span>
              <span className="italic text-[9px]">
                Awaiting submission of BIR Form 2303 Certificate of Registration
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
