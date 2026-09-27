/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PageView } from '../types';
import { ShieldCheck, Droplet, Sparkles, MapPin, ArrowRight, Heart, Activity } from 'lucide-react';

interface HomeViewProps {
  onNavigate: (view: PageView) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 py-16 sm:py-24 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold tracking-wide">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Camarines Norte Authorized Hub Network
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Essential Ionic Trace Minerals for <span className="text-amber-400">Cellular Vitality</span>
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Experience authentic HCI Cell Mineral Drops (CMD) — highly concentrated, bioavailable ionic trace minerals harvested from pristine inland sea waters. Supporting daily hydration and electrolyte balance across Camarines Norte.
            </p>

            <div className="flex flex-wrap justify-center gap-4 pt-2">
              <button
                onClick={() => onNavigate('products')}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg transition flex items-center gap-2"
              >
                <span>Shop CMD Flagship Bottles</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onNavigate('consultations')}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 font-bold text-sm rounded-xl transition flex items-center gap-2"
              >
                <Heart className="w-4 h-4 text-emerald-400" />
                <span>Book Wellness Consultation</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
              <Droplet className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">72+ Ionic Trace Minerals</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Naturally balanced ionic spectrum including Magnesium, Potassium, Zinc, and Selenium for optimal cellular absorption and enzymatic function.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Naturopathic Education</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Personalized hydration dilution protocols and lifestyle consultations with certified practitioners. Protected with Cloud KMS encryption.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">6 Municipal Branches</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Physical hubs in Daet, Labo, Capalonga, Paracale, Jose Panganiban, and Santa Elena with real-time stock pickup and doorstep delivery.
            </p>
          </div>
        </div>
      </section>

      {/* Regulatory Badge */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-6 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-amber-400 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-amber-200">Statutory FDA Registration & Compliance</h4>
              <p className="text-xs text-amber-300/80">
                Registered dietary food supplement. Strictly adheres to RA 7394, RA 10173, and RA 11967.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('compliance')}
            className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold rounded-lg border border-amber-500/40 transition"
          >
            Review Compliance Certificates
          </button>
        </div>
      </section>
    </div>
  );
};
