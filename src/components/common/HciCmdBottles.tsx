/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface HciCmdBottlesProps {
  variant?: 'hero' | 'bottle-65ml' | 'bottle-30ml' | 'dual';
  className?: string;
}

export const HciCmdBottles: React.FC<HciCmdBottlesProps> = ({
  variant = 'hero',
  className = '',
}) => {
  if (variant === 'bottle-65ml') {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <svg
          viewBox="0 0 240 390"
          className="w-full h-full max-h-[350px] drop-shadow-2xl"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="capGrad65" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="25%" stopColor="#ffffff" />
              <stop offset="70%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>
            <linearGradient id="bodyGrad65" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="20%" stopColor="#ffffff" />
              <stop offset="80%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>
            <linearGradient id="bandGrad65" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>
            <linearGradient id="highlight65" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Shadow */}
          <ellipse cx="120" cy="375" rx="75" ry="12" fill="#0f172a" fillOpacity="0.3" filter="blur(4px)" />

          {/* Flip Cap with Hinge & Ridge */}
          <rect x="88" y="16" width="64" height="56" rx="7" fill="url(#capGrad65)" stroke="#94a3b8" strokeWidth="1.5" />
          <line x1="88" y1="42" x2="152" y2="42" stroke="#94a3b8" strokeWidth="1.5" />
          <rect x="110" y="38" width="20" height="8" rx="2" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
          
          {/* Neck */}
          <rect x="82" y="72" width="76" height="18" rx="3" fill="url(#capGrad65)" stroke="#94a3b8" strokeWidth="1.5" />
          
          {/* Main Bottle Body */}
          <rect x="52" y="90" width="136" height="275" rx="22" fill="url(#bodyGrad65)" stroke="#94a3b8" strokeWidth="1.5" />

          {/* Glossy Specular Highlight Streak */}
          <rect x="62" y="96" width="12" height="260" rx="6" fill="url(#highlight65)" />

          {/* Main Label Background */}
          <rect x="56" y="106" width="128" height="248" rx="10" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />

          {/* Top Cyan Banner with HCI CMD */}
          <rect x="56" y="106" width="128" height="24" rx="4" fill="url(#bandGrad65)" />
          <text x="120" y="122" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="900" fontFamily="sans-serif" letterSpacing="1.2">
            HCI CMD
          </text>

          {/* CELL MINERAL DROPS Brand */}
          <text x="120" y="150" textAnchor="middle" fill="#0f2b5c" fontSize="16" fontWeight="900" fontFamily="sans-serif">
            ⒸELL<tspan fontSize="10" dy="-6">®</tspan>
          </text>
          <text x="120" y="162" textAnchor="middle" fill="#0284c7" fontSize="8" fontWeight="900" fontFamily="sans-serif" letterSpacing="1.5">
            MINERAL DROPS
          </text>

          {/* CMD Droplet Ripple Logo Emblem */}
          <circle cx="120" cy="198" r="24" fill="#eff6ff" stroke="#0284c7" strokeWidth="1.5" />
          <path d="M120 179 C115 189, 108 196, 108 203 A12 12 0 0 0 132 203 C132 196, 125 189, 120 179 Z" fill="#0284c7" />
          <ellipse cx="120" cy="207" rx="18" ry="6.5" stroke="#38bdf8" strokeWidth="2" fill="none" />
          <text x="120" y="204" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="900" fontFamily="sans-serif">CMD</text>

          {/* Text Info Lines */}
          <text x="120" y="238" textAnchor="middle" fill="#0f172a" fontSize="7.5" fontWeight="900" fontFamily="sans-serif" letterSpacing="0.5">
            IONIC MINERAL CONCENTRATE
          </text>
          <text x="120" y="251" textAnchor="middle" fill="#dc2626" fontSize="7.5" fontWeight="900" fontFamily="sans-serif">
            FOOD SUPPLEMENT
          </text>
          <text x="120" y="262" textAnchor="middle" fill="#0f172a" fontSize="5.8" fontWeight="900" fontFamily="sans-serif">
            NO APPROVED THERAPEUTIC CLAIMS
          </text>

          <text x="120" y="276" textAnchor="middle" fill="#0369a1" fontSize="6" fontWeight="800" fontFamily="sans-serif">
            ★ From Great Salt Lake • Product of USA ★
          </text>

          {/* Bottom Cyan Band with 1080 drops */}
          <rect x="56" y="324" width="128" height="30" rx="4" fill="url(#bandGrad65)" />
          <text x="120" y="343" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="900" fontFamily="sans-serif">
            NET 65mL (1080 drops)
          </text>
        </svg>
      </div>
    );
  }

  if (variant === 'bottle-30ml') {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <svg
          viewBox="0 0 200 330"
          className="w-full h-full max-h-[290px] drop-shadow-2xl"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="capGrad30" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="25%" stopColor="#ffffff" />
              <stop offset="70%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>
            <linearGradient id="bodyGrad30" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="20%" stopColor="#ffffff" />
              <stop offset="80%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>
            <linearGradient id="bandGrad30" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>
            <linearGradient id="highlight30" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Shadow */}
          <ellipse cx="100" cy="318" rx="60" ry="10" fill="#0f172a" fillOpacity="0.3" filter="blur(3px)" />

          {/* Cap */}
          <rect x="74" y="14" width="52" height="46" rx="6" fill="url(#capGrad30)" stroke="#94a3b8" strokeWidth="1.5" />
          <line x1="74" y1="36" x2="126" y2="36" stroke="#94a3b8" strokeWidth="1.5" />
          <rect x="92" y="33" width="16" height="6" rx="1.5" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
          
          {/* Neck */}
          <rect x="68" y="60" width="64" height="14" rx="3" fill="url(#capGrad30)" stroke="#94a3b8" strokeWidth="1.5" />
          
          {/* Main Body */}
          <rect x="42" y="74" width="116" height="230" rx="18" fill="url(#bodyGrad30)" stroke="#94a3b8" strokeWidth="1.5" />

          {/* Specular highlight */}
          <rect x="50" y="80" width="10" height="215" rx="5" fill="url(#highlight30)" />

          {/* Label */}
          <rect x="46" y="88" width="108" height="206" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />

          {/* Top Banner */}
          <rect x="46" y="88" width="108" height="20" rx="3" fill="url(#bandGrad30)" />
          <text x="100" y="102" textAnchor="middle" fill="#ffffff" fontSize="9.5" fontWeight="900" fontFamily="sans-serif">
            HCI CMD
          </text>

          {/* CELL MINERAL DROPS */}
          <text x="100" y="126" textAnchor="middle" fill="#0f2b5c" fontSize="13" fontWeight="900" fontFamily="sans-serif">
            ⒸELL<tspan fontSize="8" dy="-5">®</tspan>
          </text>
          <text x="100" y="137" textAnchor="middle" fill="#0284c7" fontSize="7" fontWeight="900" fontFamily="sans-serif">
            MINERAL DROPS
          </text>

          {/* Drop Emblem */}
          <circle cx="100" cy="166" r="19" fill="#eff6ff" stroke="#0284c7" strokeWidth="1.2" />
          <path d="M100 151 C96 159, 90 165, 90 170 A10 10 0 0 0 110 170 C110 165, 104 159, 100 151 Z" fill="#0284c7" />
          <ellipse cx="100" cy="173" rx="14" ry="5" stroke="#38bdf8" strokeWidth="1.5" fill="none" />
          <text x="100" y="171" textAnchor="middle" fill="#ffffff" fontSize="7.5" fontWeight="900" fontFamily="sans-serif">CMD</text>

          <text x="100" y="198" textAnchor="middle" fill="#0f172a" fontSize="6.5" fontWeight="900" fontFamily="sans-serif">
            IONIC MINERAL CONCENTRATE
          </text>
          <text x="100" y="209" textAnchor="middle" fill="#dc2626" fontSize="6.5" fontWeight="900" fontFamily="sans-serif">
            FOOD SUPPLEMENT
          </text>
          <text x="100" y="219" textAnchor="middle" fill="#0f172a" fontSize="5" fontWeight="900" fontFamily="sans-serif">
            NO APPROVED THERAPEUTIC CLAIMS
          </text>

          <text x="100" y="231" textAnchor="middle" fill="#0369a1" fontSize="5" fontWeight="800" fontFamily="sans-serif">
            Product of USA
          </text>

          {/* Bottom Band with 500 drops */}
          <rect x="46" y="266" width="108" height="26" rx="3" fill="url(#bandGrad30)" />
          <text x="100" y="283" textAnchor="middle" fill="#ffffff" fontSize="8.5" fontWeight="900" fontFamily="sans-serif">
            NET 30mL (500 drops)
          </text>
        </svg>
      </div>
    );
  }

  // Dual or Hero composite showcasing both bottles with water splash environment
  return (
    <div className={`relative w-full overflow-hidden select-none ${className}`}>
      {/* Background Atmosphere & Mineral Lake Water Graphic */}
      <div className="relative w-full rounded-3xl bg-gradient-to-br from-sky-400 via-sky-600 to-blue-900 dark:from-slate-900 dark:via-sky-950 dark:to-slate-950 p-6 sm:p-10 text-white shadow-2xl border border-sky-300/40 dark:border-sky-500/20 overflow-hidden">
        {/* Decorative Backdrop Glows */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-sky-300/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-24 w-96 h-96 bg-cyan-300/20 rounded-full blur-3xl pointer-events-none" />

        {/* Mountain Silhouette Line & Water Wave Backdrop */}
        <svg
          className="absolute bottom-0 left-0 right-0 w-full h-36 opacity-35 pointer-events-none"
          preserveAspectRatio="none"
          viewBox="0 0 1200 200"
          fill="none"
        >
          <path
            d="M0,120 C150,150 350,90 500,120 C650,150 900,80 1200,110 L1200,200 L0,200 Z"
            fill="#0284c7"
          />
          <path
            d="M0,140 C200,110 400,160 600,130 C800,100 1000,150 1200,130 L1200,200 L0,200 Z"
            fill="#0369a1"
          />
        </svg>

        {/* Water Splashes & Droplet Floating Particles */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-12 left-10 w-4 h-4 rounded-full bg-white/70 shadow-lg animate-pulse" />
          <div className="absolute top-24 left-1/4 w-2.5 h-2.5 rounded-full bg-cyan-200/80 shadow-md" />
          <div className="absolute top-16 right-1/3 w-3 h-3 rounded-full bg-sky-100/70 shadow-sm" />
          <div className="absolute bottom-20 left-12 w-5 h-5 rounded-full bg-white/60 shadow-lg" />
          <div className="absolute bottom-32 right-16 w-3.5 h-3.5 rounded-full bg-cyan-100/70 shadow-md" />
        </div>

        {/* Content Showcase Grid */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: Authentic HCI CMD Bottles (65mL & 30mL) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
            {/* Twin Bottles Container with Original Specs & Labels */}
            <div className="relative flex items-end justify-center gap-2 sm:gap-4 py-4 w-full max-w-sm">
              {/* 65mL Flagship Bottle */}
              <div className="w-1/2 max-w-[170px] transform hover:scale-105 transition-transform duration-300">
                <HciCmdBottles variant="bottle-65ml" />
                <div className="text-center mt-2">
                  <span className="inline-block bg-white/95 dark:bg-slate-900/90 text-sky-900 dark:text-sky-300 text-[11px] font-extrabold px-3 py-1 rounded-full shadow-md border border-sky-200 dark:border-sky-700">
                    65 mL (1,080 Drops)
                  </span>
                </div>
              </div>

              {/* 30mL Travel Bottle */}
              <div className="w-2/5 max-w-[140px] transform hover:scale-105 transition-transform duration-300">
                <HciCmdBottles variant="bottle-30ml" />
                <div className="text-center mt-2">
                  <span className="inline-block bg-white/95 dark:bg-slate-900/90 text-sky-900 dark:text-sky-300 text-[11px] font-extrabold px-3 py-1 rounded-full shadow-md border border-sky-200 dark:border-sky-700">
                    30 mL (500 Drops)
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Origin Sub-Badge (Requirement 4: Sourced from Utah's Great Salt Lake) */}
            <div className="mt-3 flex items-center gap-2 bg-slate-950/70 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-semibold text-sky-200 border border-sky-400/30 shadow-md">
              <svg className="w-4 h-4 text-cyan-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              <span>Sourced from Utah&apos;s Great Salt Lake</span>
            </div>
          </div>

          {/* Right: Headline "CELL MINERAL DROPS", CMD Logo, 3 Badges, and 4-Point Trust Ribbon */}
          <div className="lg:col-span-7 space-y-6 lg:pl-4">
            {/* Requirement 2: Headline "CELL MINERAL DROPS" & Official CMD Logo */}
            <div className="space-y-4">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1] drop-shadow-md">
                CELL MINERAL <br className="hidden sm:inline" />
                <span className="text-cyan-200">DROPS</span>
              </h1>
              
              {/* Replaced Tagline with Authentic CMD Brand Logo */}
              <div className="inline-flex items-center gap-3 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl px-4 py-2.5 shadow-xl border border-sky-200 dark:border-sky-800">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 text-white font-black shadow-md flex items-center justify-center border border-sky-400/30">
                  <svg viewBox="0 0 40 40" className="w-7 h-7" fill="none">
                    <path d="M20 6 C16 16, 9 22, 9 29 A11 11 0 0 0 31 29 C31 22, 24 16, 20 6 Z" fill="#ffffff" />
                    <ellipse cx="20" cy="30" rx="14" ry="4.5" stroke="#38bdf8" strokeWidth="2.5" fill="none" />
                    <text x="20" y="30" textAnchor="middle" fill="#0284c7" fontSize="7.5" fontWeight="900" fontFamily="sans-serif">CMD</text>
                  </svg>
                </div>
                <div>
                  <div className="font-black text-slate-900 dark:text-white text-base tracking-tight leading-none">
                    HCI CMD
                  </div>
                  <div className="text-[11px] text-sky-700 dark:text-sky-400 font-extrabold tracking-wider mt-0.5">
                    CELL MINERAL DROPS
                  </div>
                </div>
              </div>
            </div>

            {/* 3 Core Circular Badges from Reference Image */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
              {/* Badge 1: Ionic Mineral Concentrate */}
              <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl p-4 flex sm:flex-col items-center gap-3 text-center border border-sky-200 dark:border-sky-800 shadow-md">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-sky-600 to-cyan-500 text-white flex items-center justify-center shadow-md shrink-0">
                  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" fill="currentColor" fillOpacity="0.2"/>
                    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                  </svg>
                </div>
                <div className="text-left sm:text-center">
                  <div className="text-xs font-black text-sky-950 dark:text-sky-300 leading-tight">
                    IONIC MINERAL
                  </div>
                  <div className="text-[11px] font-extrabold text-sky-700 dark:text-sky-400">
                    CONCENTRATE
                  </div>
                </div>
              </div>

              {/* Badge 2: Food Supplement */}
              <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl p-4 flex sm:flex-col items-center gap-3 text-center border border-emerald-200 dark:border-emerald-800 shadow-md">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-600 to-green-500 text-white flex items-center justify-center shadow-md shrink-0">
                  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" fill="currentColor" fillOpacity="0.2"/>
                    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
                  </svg>
                </div>
                <div className="text-left sm:text-center">
                  <div className="text-xs font-black text-emerald-950 dark:text-emerald-300 leading-tight">
                    FOOD
                  </div>
                  <div className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400">
                    SUPPLEMENT
                  </div>
                </div>
              </div>

              {/* Badge 3: No Approved Therapeutic Claims */}
              <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl p-4 flex sm:flex-col items-center gap-3 text-center border border-blue-200 dark:border-blue-800 shadow-md">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-700 to-sky-600 text-white flex items-center justify-center shadow-md shrink-0">
                  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="currentColor" fillOpacity="0.2"/>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                </div>
                <div className="text-left sm:text-center">
                  <div className="text-xs font-black text-blue-950 dark:text-blue-300 leading-tight">
                    NO APPROVED
                  </div>
                  <div className="text-[10px] font-extrabold text-blue-700 dark:text-blue-400">
                    THERAPEUTIC CLAIMS
                  </div>
                </div>
              </div>
            </div>

            {/* Requirement 3: 4-Point Trust Ribbon with "From Utah's Great Salt Lake" */}
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-4 border border-white/60 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-xl">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center sm:text-left divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800">
                {/* 1. From Utah's Great Salt Lake */}
                <div className="flex items-center gap-2.5 pt-2 sm:pt-0 sm:px-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 12h20M2 16h20M2 20h20"/>
                      <path d="m4 8 4-4 4 4 4-4 4 4"/>
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    From Utah&apos;s Great Salt Lake
                  </span>
                </div>

                {/* 2. High Purity Minerals */}
                <div className="flex items-center gap-2.5 pt-2 sm:pt-0 sm:px-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10 2v7.31L4.69 19.3A2 2 0 0 0 6.44 22h11.12a2 2 0 0 0 1.75-2.7L14 9.31V2z"/>
                      <line x1="8.5" y1="2" x2="15.5" y2="2"/>
                      <line x1="7" y1="16" x2="17" y2="16"/>
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    High Purity Minerals
                  </span>
                </div>

                {/* 3. Supports Daily Wellness */}
                <div className="flex items-center gap-2.5 pt-2 sm:pt-0 sm:px-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22v-9"/>
                      <path d="M9 7.5A6.5 6.5 0 0 1 17.5 14"/>
                      <path d="M12 13a4.5 4.5 0 0 0-4.5-4.5"/>
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    Supports Daily Wellness
                  </span>
                </div>

                {/* 4. Healthier You and Your Family */}
                <div className="flex items-center gap-2.5 pt-2 sm:pt-0 sm:px-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    For a Healthier You & Family
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
