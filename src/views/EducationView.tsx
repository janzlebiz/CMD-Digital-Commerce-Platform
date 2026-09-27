/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PageView } from '../types';
import { Droplet, Info, AlertTriangle, ShieldCheck } from 'lucide-react';

export const EducationView: React.FC<{ onNavigate: (view: PageView) => void }> = ({ onNavigate }) => {
  const dilutionProtocols = [
    {
      tier: 'General Hydration Maintenance',
      drops: '5 to 10 drops per Liter of drinking water',
      frequency: 'Throughout the day for regular hydration',
      desc: 'Ideal for everyday drinking water remineralization and refreshing hydration.',
    },
    {
      tier: 'Active Lifestyle & Sports Hydration',
      drops: '15 to 20 drops per Liter',
      frequency: 'Before and after physical exertion',
      desc: 'Replenishes lost electrolytes, magnesium, and potassium during farm work or athletics.',
    },
    {
      tier: 'Concentrated Mineral Boost',
      drops: '20 to 30 drops in juice or warm water',
      frequency: 'Once daily as advised by wellness practitioner',
      desc: 'Take with citrus or fruit juice to mask the natural strong mineral taste.',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-extrabold text-white">Mineral Science & Dilution Guide</h1>
        <p className="text-sm text-slate-400 max-w-2xl mx-auto">
          Understand the vital role of ionic trace minerals in human biology and how to dilute HCI CMD properly.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">Recommended Dilution Protocols</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {dilutionProtocols.map((p, idx) => (
            <div key={idx} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wide">Protocol {idx + 1}</div>
              <h3 className="text-base font-bold text-white">{p.tier}</h3>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-amber-300 font-mono font-bold">
                {p.drops}
              </div>
              <p className="text-xs text-slate-400">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Info className="w-5 h-5 text-amber-400" />
          Why Ionic Form Matters
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          Ionic minerals are liquid ions that do not require digestive breakdown. Because they carry a natural electrical charge, they are immediately bioavailable and can be absorbed across cellular membranes for rapid hydration.
        </p>
      </div>
    </div>
  );
};
