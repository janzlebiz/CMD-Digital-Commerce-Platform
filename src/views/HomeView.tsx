/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PageView } from '../types';
import { HciCmdBottles } from '../components/common/HciCmdBottles';
import {
  ShieldCheck,
  Droplets,
  Sparkles,
  MapPin,
  ArrowRight,
  Heart,
  Activity,
  CheckCircle2,
  Compass,
  FlaskConical,
  Sun,
  Users,
  Award,
} from 'lucide-react';

interface HomeViewProps {
  onNavigate: (view: PageView) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-16 pb-16">
      {/* Hero Showcase based directly on the authentic HCI CMD branding image */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10">
        <HciCmdBottles variant="hero" />

        {/* Quick Action Navigation CTAs */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => onNavigate('products')}
            className="px-6 py-4 bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 font-bold text-sm sm:text-base rounded-2xl shadow-lg hover:shadow-sky-500/25 transition-all flex items-center gap-2 cursor-pointer transform hover:-translate-y-0.5"
          >
            <span>Order Authentic HCI CMD Bottles</span>
            <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => onNavigate('consultations')}
            className="px-6 py-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 font-bold text-sm sm:text-base rounded-2xl transition flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Heart className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <span>Book Naturopathic Consultation</span>
          </button>
          <button
            onClick={() => onNavigate('branches')}
            className="px-6 py-4 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-bold text-sm sm:text-base rounded-2xl transition flex items-center gap-2 cursor-pointer"
          >
            <MapPin className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <span>Branches in Camarines Norte</span>
          </button>
        </div>
      </section>

      {/* Origin Story: Pure Great Salt Lake Extraction */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-br from-sky-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-sky-950/40 border border-sky-100 dark:border-slate-800 p-8 sm:p-12 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-100 dark:bg-sky-950/80 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 text-xs font-extrabold tracking-wide">
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Natural All-Solar Evaporation Process</span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                Sourced from the Pristine Waters of Utah’s <span className="text-sky-600 dark:text-sky-400">Great Salt Lake</span>
              </h2>

              <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
                HCI Cell Mineral Drops (CMD) is naturally harvested from the mineral-rich waters of the Great Salt Lake in Utah, USA. Through a gentle two-year all-natural solar concentration process, over 99% of sodium is naturally removed while concentrating 72+ bioavailable ionic trace minerals in nature’s perfect balance.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">100% Bioavailable</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Ionic form for immediate cellular absorption.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">99% Sodium Removed</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Low sodium, highly concentrated trace mineral profile.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Pure Food Supplement</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">No artificial colors, flavorings, or chemical additives.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Product of USA</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Produced under stringent cGMP laboratory standards.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Highlights Box */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-950 rounded-2xl p-6 border border-sky-200 dark:border-slate-800 shadow-md space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <span className="text-xs font-extrabold uppercase text-sky-700 dark:text-sky-400 tracking-wider">
                  Spectrum Composition
                </span>
                <span className="text-xs bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 px-2.5 py-0.5 rounded-full font-bold">
                  72+ Trace Elements
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200">Magnesium (Ionic)</span>
                  <span className="text-sky-700 dark:text-sky-400 font-mono font-bold">250 mg / serving</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-sky-600 h-full rounded-full w-[92%]" />
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200">Chloride</span>
                  <span className="text-sky-700 dark:text-sky-400 font-mono font-bold">690 mg / serving</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-cyan-500 h-full rounded-full w-[85%]" />
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200">Sulfate & Trace Potassium</span>
                  <span className="text-sky-700 dark:text-sky-400 font-mono font-bold">Bioactive Ionic</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full w-[78%]" />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-[11px] text-sky-900 dark:text-sky-200 leading-relaxed">
                💡 <strong>Recommended Daily Routine:</strong> Add 20–40 drops per gallon of drinking water for household mineral remineralization, or 5–10 drops in a 250 mL glass of water 2–3 times daily.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Core Pillars Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Why Camarines Norte Chooses HCI CMD
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Backed by physical municipal branch pick-up hubs, certified naturopathic education, and FDA registered food supplement status.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs hover:border-sky-400 transition-colors">
            <div className="w-14 h-14 rounded-2xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
              <Droplets className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white">72+ Ionic Trace Minerals</h4>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Provides the full natural spectrum of bioavailable minerals in liquid form, supporting cellular hydration, pH balance, and energy metabolism without artificial binders.
            </p>
            <button
              onClick={() => onNavigate('education')}
              className="text-xs font-bold text-sky-700 dark:text-sky-400 hover:text-sky-900 dark:hover:text-sky-200 flex items-center gap-1 pt-2"
            >
              <span>Explore Mineral Science</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs hover:border-emerald-400 transition-colors">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Activity className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white">Naturopathic Consultations</h4>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Personalized wellness assessments and hydration protocols with certified practitioners. Patient health SPI is strictly encrypted with Google Cloud KMS under RA 10173.
            </p>
            <button
              onClick={() => onNavigate('consultations')}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-200 flex items-center gap-1 pt-2"
            >
              <span>Book Assessment</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs hover:border-blue-400 transition-colors">
            <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <MapPin className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white">Municipal Branch Network</h4>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Central hub in Daet with branches across Labo, Capalonga, Paracale, Jose Panganiban, and Santa Elena for same-day pick-up and authentic batch verification.
            </p>
            <button
              onClick={() => onNavigate('branches')}
              className="text-xs font-bold text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-200 flex items-center gap-1 pt-2"
            >
              <span>View Branch Locations</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Regulatory & Food Supplement Trust Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-6 sm:p-8 rounded-3xl bg-sky-50 dark:bg-slate-900 border border-sky-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-600 dark:bg-sky-500 text-white dark:text-slate-950 flex items-center justify-center shrink-0 shadow-sm">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Statutory FDA Registration & Consumer Protection (RA 7394)
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Registered dietary food supplement. Sourced from the Great Salt Lake, Utah, USA. No approved therapeutic claims.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('compliance')}
            className="px-5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-slate-700 font-bold text-xs rounded-xl shadow-xs transition shrink-0 cursor-pointer"
          >
            View Regulatory Certificates
          </button>
        </div>
      </section>
    </div>
  );
};
