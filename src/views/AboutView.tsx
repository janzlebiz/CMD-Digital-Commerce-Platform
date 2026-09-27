/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PageView } from '../types';
import { Shield, Droplets, Globe, Award } from 'lucide-react';

export const AboutView: React.FC<{ onNavigate: (view: PageView) => void }> = ({ onNavigate }) => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-extrabold text-white">About HCI CMD & Camarines Norte Network</h1>
        <p className="text-sm text-slate-400 max-w-2xl mx-auto">
          Pioneering trace mineral wellness and cellular hydration across the Bicol region with authentic product distribution and evidence-informed nutritional guidance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <Droplets className="w-8 h-8 text-amber-400" />
          <h3 className="text-lg font-bold text-white">Natural Solar Evaporation</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            HCI Cell Mineral Drops are extracted through an all-natural solar evaporation process from mineral-rich inland salt lake waters, removing 99.5% of sodium while concentrating over 72 ionic trace minerals.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <Globe className="w-8 h-8 text-emerald-400" />
          <h3 className="text-lg font-bold text-white">Camarines Norte Distribution</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Headquartered in Daet, our distribution network serves all 12 municipalities in Camarines Norte with 6 physical branches to ensure rapid stock availability, genuine seals, and local customer care.
          </p>
        </div>
      </div>
    </div>
  );
};
