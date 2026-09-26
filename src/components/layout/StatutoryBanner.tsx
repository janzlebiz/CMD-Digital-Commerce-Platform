/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { STATUTORY_NOTICES } from '../../data/compliance';

export const StatutoryBanner: React.FC = () => {
  return (
    <aside
      aria-label="Statutory Regulatory Notice"
      className="bg-amber-950 text-amber-100 border-b border-amber-900/60 px-4 py-2.5 text-xs sm:text-sm font-medium tracking-wide shadow-sm"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2 text-center md:text-left">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-amber-300 uppercase tracking-wider text-[11px] bg-amber-900/80 px-2 py-0.5 rounded-sm">
            FDA Notice
          </span>
          <p className="leading-snug">
            {STATUTORY_NOTICES.FILIPINO_WARNING}
          </p>
        </div>
        <div className="shrink-0 text-[11px] font-bold tracking-wider text-amber-300 border-t md:border-t-0 md:border-l border-amber-800/80 pt-1 md:pt-0 md:pl-3 uppercase">
          {STATUTORY_NOTICES.ENGLISH_DISCLAIMER}
        </div>
      </div>
    </aside>
  );
};
