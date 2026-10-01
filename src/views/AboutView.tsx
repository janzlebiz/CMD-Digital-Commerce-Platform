/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PageView } from '../types';
import { Shield, Droplets, Globe, Award, Sparkles, Building2, Heart } from 'lucide-react';

export const AboutView: React.FC<{ onNavigate: (view: PageView) => void }> = ({ onNavigate }) => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 text-xs font-bold tracking-wide">
          <Sparkles className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          <span>Regional Mission & Heritage</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          About HCI CMD & Camarines Norte Network
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Pioneering trace mineral wellness and cellular hydration across the Bicol region with authentic product distribution and evidence-informed nutritional guidance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3.5 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
            <Droplets className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Natural Solar Evaporation</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            HCI Cell Mineral Drops are extracted through an all-natural solar evaporation process from mineral-rich inland waters, removing 99.5% of sodium while concentrating over 72 ionic trace minerals for maximum cellular bioavailability.
          </p>
        </div>

        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3.5 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Camarines Norte Distribution Network</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Headquartered in Daet, our distribution network serves all 12 municipalities in Camarines Norte with a physical branch network to ensure rapid stock availability, genuine seals, and local community care.
          </p>
        </div>
      </div>
    </div>
  );
};
