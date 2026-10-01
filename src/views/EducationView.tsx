/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PageView } from '../types';
import { Droplets, Info, AlertTriangle, ShieldCheck, Sparkles } from 'lucide-react';

export const EducationView: React.FC<{ onNavigate: (view: PageView) => void }> = ({ onNavigate }) => {
  const dilutionProtocols = [
    {
      tier: 'General Hydration Maintenance',
      drops: '5 to 10 drops per Liter of drinking water',
      frequency: 'Throughout the day for regular hydration',
      desc: 'Ideal for everyday drinking water remineralization and refreshing hydration for the whole family.',
    },
    {
      tier: 'Active Lifestyle & Sports Hydration',
      drops: '15 to 20 drops per Liter',
      frequency: 'Before and after physical exertion',
      desc: 'Replenishes lost electrolytes, magnesium, and potassium during farm work, manual labor, or athletics.',
    },
    {
      tier: 'Concentrated Mineral Boost',
      drops: '20 to 30 drops in juice or warm water',
      frequency: 'Once daily as advised by wellness practitioner',
      desc: 'Take with fresh citrus or fruit juice to balance the natural, concentrated mineral taste.',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 text-xs font-bold tracking-wide">
          <Sparkles className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          <span>Hydration & Bioavailability Science</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Mineral Science & Dilution Guide
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Understand the vital role of ionic trace minerals in human physiology and how to dilute authentic HCI CMD properly for optimal cellular hydration.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Recommended Dilution Protocols</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {dilutionProtocols.map((p, idx) => (
            <div
              key={idx}
              className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3.5 shadow-xs transition-all flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <div className="text-xs font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider">
                  Protocol {idx + 1}
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">{p.tier}</h3>
                <div className="p-3 rounded-xl bg-sky-50 dark:bg-slate-950 border border-sky-200 dark:border-slate-800 text-xs text-sky-900 dark:text-sky-300 font-mono font-bold">
                  {p.drops}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
          <Info className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          <span>Why Ionic Form Matters for Hydration</span>
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Ionic minerals are liquid ions that do not require digestive breakdown. Because they carry a natural electrical charge, they are immediately bioavailable and can be absorbed across cellular membranes for rapid hydration, enzymatic catalyst support, and pH electrolyte balance.
        </p>
      </div>
    </div>
  );
};
