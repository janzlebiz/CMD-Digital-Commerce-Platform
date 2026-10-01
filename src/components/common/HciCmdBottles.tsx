/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HciCmdLogo } from './HciCmdLogo';

interface HciCmdBottlesProps {
  variant?: 'hero' | 'bottle-65ml' | 'bottle-30ml' | 'dual';
  className?: string;
}

export const HciCmdBottles: React.FC<HciCmdBottlesProps> = ({
  variant = 'hero',
  className = '',
}) => {
  // Shared SVG Definitions for authentic lighting, gradients, drops, and boxes
  const renderDefs = (idPrefix: string) => (
    <defs>
      <linearGradient id={`${idPrefix}capGrad`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#d1d5db" />
        <stop offset="18%" stopColor="#f8fafc" />
        <stop offset="55%" stopColor="#ffffff" />
        <stop offset="85%" stopColor="#f1f5f9" />
        <stop offset="100%" stopColor="#cbd5e1" />
      </linearGradient>

      <linearGradient id={`${idPrefix}bodyGrad`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#e2e8f0" />
        <stop offset="14%" stopColor="#f8fafc" />
        <stop offset="42%" stopColor="#ffffff" />
        <stop offset="80%" stopColor="#f8fafc" />
        <stop offset="100%" stopColor="#cbd5e1" />
      </linearGradient>

      {/* Front Box Gradient (Vibrant Cyan-Blue) */}
      <linearGradient id={`${idPrefix}boxFrontGrad`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#00b4d8" />
        <stop offset="35%" stopColor="#0077b6" />
        <stop offset="100%" stopColor="#023e8a" />
      </linearGradient>

      {/* Left 3D Box Spine Gradient (Deep Navy Blue Shadow) */}
      <linearGradient id={`${idPrefix}boxSideGrad`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#002855" />
        <stop offset="60%" stopColor="#003566" />
        <stop offset="100%" stopColor="#00509d" />
      </linearGradient>

      <linearGradient id={`${idPrefix}cyanBand`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#0284c7" />
        <stop offset="50%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#0369a1" />
      </linearGradient>

      <linearGradient id={`${idPrefix}dropGrad`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#0033aa" />
        <stop offset="35%" stopColor="#0055dd" />
        <stop offset="75%" stopColor="#002288" />
        <stop offset="100%" stopColor="#001144" />
      </linearGradient>

      <radialGradient id={`${idPrefix}dropFlare`} cx="35%" cy="30%" r="35%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
        <stop offset="50%" stopColor="#7dd3fc" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
      </radialGradient>

      <linearGradient id={`${idPrefix}glossStreak`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
      </linearGradient>
    </defs>
  );

  // Helper for rendering the GMP Quality Assured Seal
  const renderGmpBadge = (scale = 1) => (
    <g transform={`scale(${scale})`}>
      <rect x="0" y="0" width="22" height="13" rx="3.5" fill="#ffffff" stroke="#0f172a" strokeWidth="0.8" />
      <rect x="1.5" y="1.5" width="19" height="10" rx="2" fill="#0f172a" />
      <text x="11" y="6.5" textAnchor="middle" fill="#ffffff" fontSize="4.5" fontWeight="900" fontFamily="sans-serif">
        GMP
      </text>
      <text x="11" y="9.8" textAnchor="middle" fill="#ffffff" fontSize="2.2" fontWeight="700" fontFamily="sans-serif">
        Quality Assured
      </text>
    </g>
  );

  // 65 mL Flagship Bottle + 3D Packaging Box (Using authentic CMD_65ml_product_transparent.webp)
  if (variant === 'bottle-65ml') {
    return (
      <div className={`relative flex flex-col items-center justify-center select-none ${className}`}>
        <div className="relative group w-full flex flex-col items-center">
          <img
            src="/CMD_65ml_product_transparent.webp"
            alt="HCI Cell Mineral Drops (CMD) 65 mL Flagship Bottle"
            className="w-full h-full max-h-[360px] object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.18)] dark:drop-shadow-[0_20px_35px_rgba(0,0,0,0.6)] transition-transform duration-300 group-hover:scale-105"
            loading="eager"
            decoding="async"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/CMD_65ml_product.webp';
            }}
            referrerPolicy="no-referrer"
          />
          {/* Grounding contact floor shadow */}
          <div className="w-28 sm:w-36 h-3 rounded-full bg-slate-900/25 dark:bg-slate-950/70 blur-md -mt-2 pointer-events-none transition-all duration-300 group-hover:w-32 sm:group-hover:w-40 group-hover:bg-slate-900/35" />
        </div>
      </div>
    );
  }

  // 30 mL Compact Bottle + Packaging Box (Using authentic CMD_30ml_product_transparent.webp)
  if (variant === 'bottle-30ml') {
    return (
      <div className={`relative flex flex-col items-center justify-center select-none ${className}`}>
        <div className="relative group w-full flex flex-col items-center">
          <img
            src="/CMD_30ml_product_transparent.webp"
            alt="HCI Cell Mineral Drops (CMD) 30 mL Compact Bottle"
            className="w-full h-full max-h-[320px] object-contain drop-shadow-[0_16px_25px_rgba(0,0,0,0.16)] dark:drop-shadow-[0_16px_30px_rgba(0,0,0,0.6)] transition-transform duration-300 group-hover:scale-105"
            loading="eager"
            decoding="async"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/CMD_30ml_product.webp';
            }}
            referrerPolicy="no-referrer"
          />
          {/* Grounding contact floor shadow */}
          <div className="w-24 sm:w-28 h-2.5 rounded-full bg-slate-900/25 dark:bg-slate-950/70 blur-md -mt-2 pointer-events-none transition-all duration-300 group-hover:w-28 sm:group-hover:w-32 group-hover:bg-slate-900/35" />
        </div>
      </div>
    );
  }

  // Dual / Hero presentation side-by-side matching the user provided images
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
          {/* Left: Authentic HCI CMD Complete Product Photo Setup on Studio Frosted Pedestal */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
            {/* Unified Studio Frosted Pedestal Pad */}
            <div className="relative w-full max-w-lg rounded-3xl bg-white/10 dark:bg-slate-950/40 backdrop-blur-md border border-white/20 dark:border-sky-500/20 p-4 sm:p-6 shadow-2xl overflow-hidden">
              {/* Internal Studio Lighting Radial Glow */}
              <div className="absolute inset-0 bg-radial from-white/20 via-sky-400/10 to-transparent pointer-events-none" />

              <div className="relative w-full flex items-end justify-center gap-3 sm:gap-6 py-2">
                {/* 30mL Pack */}
                <div className="relative group w-[45%] flex flex-col items-center transition-transform duration-300 hover:scale-105 cursor-pointer">
                  <img
                    src="/CMD_30ml_product_transparent.webp"
                    alt="HCI CMD 30mL Compact Travel Edition"
                    className="w-full h-auto max-h-[250px] sm:max-h-[290px] object-contain drop-shadow-[0_15px_22px_rgba(0,0,0,0.35)] select-none"
                    loading="eager"
                    decoding="async"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/CMD_30ml_product.webp';
                    }}
                    referrerPolicy="no-referrer"
                  />
                  {/* Floor Contact Shadow */}
                  <div className="w-20 sm:w-24 h-2.5 rounded-full bg-slate-950/60 blur-sm -mt-1.5 pointer-events-none" />
                  
                  <span className="mt-3 text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full bg-slate-950/85 text-emerald-300 border border-emerald-400/30 backdrop-blur-md shadow-md">
                    30mL • 500 Drops
                  </span>
                </div>

                {/* 65mL Pack */}
                <div className="relative group w-[53%] flex flex-col items-center transition-transform duration-300 hover:scale-105 cursor-pointer">
                  <img
                    src="/CMD_65ml_product_transparent.webp"
                    alt="HCI CMD 65mL Flagship Family Edition"
                    className="w-full h-auto max-h-[295px] sm:max-h-[345px] object-contain drop-shadow-[0_22px_30px_rgba(0,0,0,0.45)] select-none"
                    loading="eager"
                    decoding="async"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/CMD_65ml_product.webp';
                    }}
                    referrerPolicy="no-referrer"
                  />
                  {/* Floor Contact Shadow */}
                  <div className="w-24 sm:w-30 h-3 rounded-full bg-slate-950/65 blur-sm -mt-1.5 pointer-events-none" />
                  
                  <span className="mt-3 text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full bg-slate-950/85 text-cyan-300 border border-cyan-400/40 backdrop-blur-md shadow-md">
                    65mL • 1,080 Drops
                  </span>
                </div>
              </div>
            </div>

            {/* Sub-badge beneath bottle presentation */}
            <div className="mt-4 flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-semibold text-sky-200 border border-sky-400/30 shadow-lg">
              <svg className="w-4 h-4 text-cyan-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              <span>From Utah&apos;s Great Salt Lake • Product of USA</span>
            </div>
          </div>

          {/* Right: Hero Headline with Glowing White Water Droplet & Ripple Halo Watermark */}
          <div className="lg:col-span-7 space-y-6 lg:pl-4 relative">
            {/* Glowing White HCI CMD Water Droplet & Ripple Halo Watermark */}
            <div className="absolute -top-10 -right-4 sm:right-6 w-64 h-64 sm:w-80 sm:h-80 lg:w-96 lg:h-96 opacity-40 sm:opacity-50 pointer-events-none transform -rotate-6 z-0 flex items-center justify-center">
              <HciCmdLogo
                variant="watermark-white"
                className="w-full h-full filter drop-shadow-[0_0_20px_rgba(255,255,255,0.85)]"
              />
            </div>

            {/* Top HCI Badge */}
            <div className="relative z-10 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-sky-100 text-xs font-black tracking-wider uppercase mb-2 border border-white/30">
              <span>HCI Cell Mineral Drops</span>
            </div>

            {/* Main Headline */}
            <div className="space-y-1 relative z-10">
              {/* Big CELL with green hexagon */}
              <div className="flex items-center gap-2 sm:gap-3 leading-none drop-shadow-lg">
                <div className="relative w-14 h-14 sm:w-20 sm:h-20 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
                    <path
                      d="M80 18 A44 44 0 1 0 80 82"
                      stroke="#ffffff"
                      strokeWidth="16"
                      strokeLinecap="square"
                      fill="none"
                    />
                    <polygon
                      points="50,22 72,34 72,66 50,78 28,66 28,34"
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="9"
                    />
                    <circle cx="50" cy="50" r="13" fill="#22c55e" />
                  </svg>
                </div>

                <span className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight text-white font-sans uppercase">
                  ELL
                </span>
                <span className="text-xl sm:text-3xl font-black text-cyan-300 self-start -mt-2">
                  ®
                </span>
              </div>

              {/* MINERAL DROPS Placed Below */}
              <div className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-[0.18em] sm:tracking-[0.24em] text-cyan-200 uppercase pt-1 drop-shadow-md">
                MINERAL DROPS
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

            {/* 4-Point Trust Ribbon */}
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
