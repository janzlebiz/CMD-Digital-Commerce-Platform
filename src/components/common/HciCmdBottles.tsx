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
  // 65 mL Flagship Bottle based directly on the provided authentic photo
  if (variant === 'bottle-65ml') {
    return (
      <div className={`relative flex items-center justify-center select-none ${className}`}>
        <svg
          viewBox="0 0 240 400"
          className="w-full h-full max-h-[360px] drop-shadow-2xl"
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
            <linearGradient id="cyanBand" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>
            <linearGradient id="dropGradBottle" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0044cc" />
              <stop offset="50%" stopColor="#0066ff" />
              <stop offset="100%" stopColor="#001a4d" />
            </linearGradient>
            <radialGradient id="dropFlareBottle" cx="40%" cy="35%" r="40%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#66b3ff" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#0044cc" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Realistic Ambient Shadow under bottle */}
          <ellipse cx="120" cy="385" rx="75" ry="10" fill="#0f172a" fillOpacity="0.35" filter="blur(3px)" />

          {/* White Snap Flip-Cap with Thumb Tab */}
          <rect x="88" y="16" width="64" height="58" rx="8" fill="url(#capGrad65)" stroke="#94a3b8" strokeWidth="1.5" />
          <line x1="88" y1="44" x2="152" y2="44" stroke="#94a3b8" strokeWidth="1.5" />
          <path d="M108 40 L132 40 L128 46 L112 46 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />

          {/* Neck */}
          <rect x="82" y="74" width="76" height="18" rx="3" fill="url(#capGrad65)" stroke="#94a3b8" strokeWidth="1.5" />
          
          {/* Main Cylindrical Bottle Body */}
          <rect x="50" y="92" width="140" height="282" rx="22" fill="url(#bodyGrad65)" stroke="#94a3b8" strokeWidth="1.5" />

          {/* Glossy light streak */}
          <rect x="60" y="98" width="12" height="268" rx="6" fill="url(#shine)" />

          {/* Label Container */}
          <rect x="54" y="108" width="132" height="254" rx="10" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />

          {/* Top Cyan Banner: HCI CMD */}
          <rect x="54" y="108" width="132" height="24" rx="4" fill="url(#cyanBand)" />
          <text x="120" y="124" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="900" fontFamily="sans-serif" letterSpacing="1.2">
            HCI CMD
          </text>

          {/* Brand Logo: CELL (with green hexagon in C) */}
          <g transform="translate(74, 137)">
            {/* Outer Blue C */}
            <path d="M18 6 A11 11 0 1 0 18 22" stroke="#002b80" strokeWidth="4.5" strokeLinecap="square" fill="none" />
            {/* Inner Green Hexagon */}
            <polygon points="11,9 15,11.5 15,16.5 11,19 7,16.5 7,11.5" fill="none" stroke="#16a34a" strokeWidth="1.8" />
            <circle cx="11" cy="14" r="2.2" fill="#16a34a" />
            {/* ELL */}
            <text x="21" y="22" fill="#002b80" fontSize="17" fontWeight="900" fontFamily="sans-serif">
              ELL
            </text>
            <text x="59" y="12" fill="#002b80" fontSize="7" fontWeight="900">
              ®
            </text>
          </g>

          {/* MINERAL DROPS under CELL */}
          <text x="120" y="167" textAnchor="middle" fill="#002b80" fontSize="8" fontWeight="900" fontFamily="sans-serif" letterSpacing="1.8">
            MINERAL DROPS
          </text>

          {/* CMD Water Droplet Medallion */}
          <g transform="translate(86, 172)">
            {/* Ripples */}
            <ellipse cx="34" cy="46" rx="30" ry="10" stroke="#0033aa" strokeWidth="2" fill="none" />
            <ellipse cx="34" cy="44" rx="23" ry="7.5" stroke="#38bdf8" strokeWidth="1.8" fill="none" />
            <ellipse cx="34" cy="42" rx="17" ry="5.5" stroke="#ffffff" strokeWidth="1.5" fill="none" />
            {/* Droplet */}
            <path d="M34 6 C30 16, 17 26, 17 36 A17 17 0 0 0 51 36 C51 26, 38 16, 34 6 Z" fill="url(#dropGradBottle)" />
            {/* Flare */}
            <ellipse cx="28" cy="24" rx="9" ry="6" fill="url(#dropFlareBottle)" transform="rotate(-20 28 24)" />
            {/* Registered ® on Drop */}
            <circle cx="48" cy="14" r="3.2" fill="#ffffff" stroke="#0033aa" strokeWidth="0.8" />
            <text x="48" y="15.8" textAnchor="middle" fill="#0033aa" fontSize="3.5" fontWeight="900">®</text>
            {/* CMD Text */}
            <text x="34" y="40" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="900" fontFamily="sans-serif">CMD</text>
          </g>

          {/* Product Descriptions */}
          <text x="120" y="240" textAnchor="middle" fill="#0f172a" fontSize="7.8" fontWeight="900" fontFamily="sans-serif" letterSpacing="0.4">
            IONIC MINERAL CONCENTRATE
          </text>
          <text x="120" y="253" textAnchor="middle" fill="#dc2626" fontSize="7.8" fontWeight="900" fontFamily="sans-serif">
            FOOD SUPPLEMENT
          </text>
          <text x="120" y="264" textAnchor="middle" fill="#0f172a" fontSize="6" fontWeight="900" fontFamily="sans-serif">
            NO APPROVED THERAPEUTIC CLAIMS
          </text>

          {/* Origin & Certificates with Red Star */}
          <g transform="translate(68, 273)">
            <text x="5" y="6" fill="#dc2626" fontSize="8" fontWeight="900">★</text>
            <text x="52" y="5" textAnchor="middle" fill="#0033aa" fontSize="5.5" fontWeight="800" fontFamily="sans-serif">
              From Great Salt Lake
            </text>
            <text x="52" y="12" textAnchor="middle" fill="#0033aa" fontSize="5.5" fontWeight="800" fontFamily="sans-serif">
              Product of USA
            </text>
            <text x="96" y="6" fill="#059669" fontSize="6" fontWeight="900">حلال</text>
          </g>

          {/* Bottom Cyan Band: NET 65mL (1080 drops) */}
          <rect x="54" y="330" width="132" height="32" rx="4" fill="url(#cyanBand)" />
          <text x="120" y="350" textAnchor="middle" fill="#ffffff" fontSize="10.5" fontWeight="900" fontFamily="sans-serif">
            NET 65mL (1080 drops)
          </text>
        </svg>
      </div>
    );
  }

  // 30 mL Compact Bottle based directly on the provided authentic photo
  if (variant === 'bottle-30ml') {
    return (
      <div className={`relative flex items-center justify-center select-none ${className}`}>
        <svg
          viewBox="0 0 200 340"
          className="w-full h-full max-h-[300px] drop-shadow-2xl"
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
            <linearGradient id="cyanBand30" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>
            <linearGradient id="dropGrad30" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0044cc" />
              <stop offset="50%" stopColor="#0066ff" />
              <stop offset="100%" stopColor="#001a4d" />
            </linearGradient>
          </defs>

          {/* Ambient Shadow */}
          <ellipse cx="100" cy="328" rx="60" ry="8" fill="#0f172a" fillOpacity="0.35" filter="blur(3px)" />

          {/* Cap */}
          <rect x="74" y="14" width="52" height="48" rx="7" fill="url(#capGrad30)" stroke="#94a3b8" strokeWidth="1.5" />
          <line x1="74" y1="38" x2="126" y2="38" stroke="#94a3b8" strokeWidth="1.5" />
          <path d="M92 34 L108 34 L105 39 L95 39 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />

          {/* Neck */}
          <rect x="68" y="62" width="64" height="15" rx="3" fill="url(#capGrad30)" stroke="#94a3b8" strokeWidth="1.5" />
          
          {/* Main Body */}
          <rect x="42" y="77" width="116" height="240" rx="18" fill="url(#bodyGrad30)" stroke="#94a3b8" strokeWidth="1.5" />

          {/* Label */}
          <rect x="46" y="90" width="108" height="216" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />

          {/* Top Cyan Band */}
          <rect x="46" y="90" width="108" height="20" rx="3" fill="url(#cyanBand30)" />
          <text x="100" y="104" textAnchor="middle" fill="#ffffff" fontSize="9.5" fontWeight="900" fontFamily="sans-serif">
            HCI CMD
          </text>

          {/* Brand Logo: CELL (with green hexagon in C) */}
          <g transform="translate(62, 115)">
            <path d="M15 5 A9 9 0 1 0 15 18" stroke="#002b80" strokeWidth="3.8" strokeLinecap="square" fill="none" />
            <polygon points="9,7.5 12.5,9.5 12.5,13.5 9,15.5 5.5,13.5 5.5,9.5" fill="none" stroke="#16a34a" strokeWidth="1.5" />
            <circle cx="9" cy="11.5" r="1.8" fill="#16a34a" />
            <text x="17" y="18" fill="#002b80" fontSize="14" fontWeight="900" fontFamily="sans-serif">
              ELL
            </text>
            <text x="49" y="10" fill="#002b80" fontSize="6" fontWeight="900">
              ®
            </text>
          </g>

          <text x="100" y="140" textAnchor="middle" fill="#002b80" fontSize="7" fontWeight="900" fontFamily="sans-serif" letterSpacing="1.4">
            MINERAL DROPS
          </text>

          {/* CMD Droplet */}
          <g transform="translate(73, 144)">
            <ellipse cx="27" cy="37" rx="23" ry="8" stroke="#0033aa" strokeWidth="1.6" fill="none" />
            <ellipse cx="27" cy="35" rx="18" ry="6" stroke="#38bdf8" strokeWidth="1.5" fill="none" />
            <path d="M27 5 C24 13, 13 21, 13 29 A14 14 0 0 0 41 29 C41 21, 30 13, 27 5 Z" fill="url(#dropGrad30)" />
            <circle cx="38" cy="11" r="2.5" fill="#ffffff" stroke="#0033aa" strokeWidth="0.7" />
            <text x="38" y="12.5" textAnchor="middle" fill="#0033aa" fontSize="2.8" fontWeight="900">®</text>
            <text x="27" y="32" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="900" fontFamily="sans-serif">CMD</text>
          </g>

          <text x="100" y="200" textAnchor="middle" fill="#0f172a" fontSize="6.8" fontWeight="900" fontFamily="sans-serif">
            IONIC MINERAL CONCENTRATE
          </text>
          <text x="100" y="211" textAnchor="middle" fill="#dc2626" fontSize="6.8" fontWeight="900" fontFamily="sans-serif">
            FOOD SUPPLEMENT
          </text>
          <text x="100" y="221" textAnchor="middle" fill="#0f172a" fontSize="5.2" fontWeight="900" fontFamily="sans-serif">
            NO APPROVED THERAPEUTIC CLAIMS
          </text>

          <text x="100" y="233" textAnchor="middle" fill="#0033aa" fontSize="4.8" fontWeight="800" fontFamily="sans-serif">
            ★ From Great Salt Lake • Product of USA ★
          </text>

          {/* Bottom Band */}
          <rect x="46" y="272" width="108" height="28" rx="3" fill="url(#cyanBand30)" />
          <text x="100" y="290" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="900" fontFamily="sans-serif">
            NET 30mL (500 drops)
          </text>
        </svg>
      </div>
    );
  }

  // Dual/Hero showcase
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
            {/* Twin Original Bottles Container */}
            <div className="relative flex items-end justify-center gap-2 sm:gap-4 py-4 w-full max-w-sm">
              {/* 65mL Flagship Bottle */}
              <div className="w-1/2 max-w-[175px] transform hover:scale-105 transition-transform duration-300">
                <HciCmdBottles variant="bottle-65ml" />
                <div className="text-center mt-2">
                  <span className="inline-block bg-white/95 dark:bg-slate-900/90 text-sky-900 dark:text-sky-300 text-[11px] font-extrabold px-3 py-1 rounded-full shadow-md border border-sky-200 dark:border-sky-700">
                    65 mL (1,080 Drops)
                  </span>
                </div>
              </div>

              {/* 30mL Travel Bottle */}
              <div className="w-2/5 max-w-[145px] transform hover:scale-105 transition-transform duration-300">
                <HciCmdBottles variant="bottle-30ml" />
                <div className="text-center mt-2">
                  <span className="inline-block bg-white/95 dark:bg-slate-900/90 text-sky-900 dark:text-sky-300 text-[11px] font-extrabold px-3 py-1 rounded-full shadow-md border border-sky-200 dark:border-sky-700">
                    30 mL (500 Drops)
                  </span>
                </div>
              </div>
            </div>

            {/* Requirement 2: Sub-badge beneath bottle presentation "From Utah's Great Salt Lake" */}
            <div className="mt-3 flex items-center gap-2 bg-slate-950/70 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-semibold text-sky-200 border border-sky-400/30 shadow-md">
              <svg className="w-4 h-4 text-cyan-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              <span>From Utah&apos;s Great Salt Lake</span>
            </div>
          </div>

          {/* Right: Hero Headline with Transparent Overlapping CMD Logo */}
          <div className="lg:col-span-7 space-y-6 lg:pl-4">
            {/* Requirement 1: Headline "CELL MINERAL DROPS" with bigger CELL, green hexagon in C, MINERAL DROPS below, and transparent CMD logo overlap */}
            <div className="relative py-2">
              {/* Overlapping Transparent Original CMD Logo Watermark */}
              <div className="absolute -top-10 -right-6 sm:right-10 w-48 h-48 sm:w-64 sm:h-64 opacity-25 pointer-events-none transform -rotate-12">
                <HciCmdLogo variant="droplet" className="w-full h-full filter drop-shadow-2xl" />
              </div>

              {/* Top HCI Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-sky-100 text-xs font-black tracking-wider uppercase mb-2 border border-white/30">
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
