/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface HciCmdLogoProps {
  variant?: 'full' | 'droplet' | 'wordmark' | 'watermark-white';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  className?: string;
  watermark?: boolean;
}

export const HciCmdLogo: React.FC<HciCmdLogoProps> = ({
  variant = 'full',
  size = 'md',
  className = '',
  watermark = false,
}) => {
  // Pure White Transparent Glowing Watermark Logo for Hero Headline
  if (variant === 'watermark-white') {
    return (
      <svg
        viewBox="0 0 160 160"
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="whiteGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer White Ripple Wave 3 */}
        <ellipse cx="80" cy="125" rx="74" ry="24" stroke="#ffffff" strokeWidth="4" fill="none" opacity="0.6" filter="url(#whiteGlow)" />

        {/* Middle White Ripple Wave 2 */}
        <ellipse cx="80" cy="121" rx="58" ry="18" stroke="#ffffff" strokeWidth="4" fill="none" opacity="0.8" filter="url(#whiteGlow)" />

        {/* Inner White Ripple Wave 1 */}
        <ellipse cx="80" cy="116" rx="42" ry="13" stroke="#ffffff" strokeWidth="3.5" fill="none" opacity="0.95" />

        {/* Main White Water Droplet Shape with subtle translucent white fill */}
        <path
          d="M80 16 C72 40, 38 68, 38 92 A42 42 0 0 0 122 92 C122 68, 88 40, 80 16 Z"
          fill="#ffffff"
          fillOpacity="0.25"
          stroke="#ffffff"
          strokeWidth="3.5"
          filter="url(#whiteGlow)"
        />

        {/* Glossy White Inner Highlight Curve */}
        <path
          d="M56 46 Q70 34 80 20"
          stroke="#ffffff"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.9"
        />

        {/* Registered Symbol ® in White */}
        <circle cx="114" cy="36" r="7.5" stroke="#ffffff" strokeWidth="1.8" fill="#ffffff" fillOpacity="0.2" />
        <text x="114" y="40" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="900" fontFamily="sans-serif">®</text>

        {/* Bold White CMD Typography on Droplet */}
        <text
          x="80"
          y="100"
          textAnchor="middle"
          fill="#ffffff"
          fontSize="28"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="1"
          style={{ filter: 'drop-shadow(0px 2px 8px rgba(255,255,255,0.6))' }}
        >
          CMD
        </text>
      </svg>
    );
  }

  // Exact CMD Water Drop Logo with concentric ripple rings and lens flare highlight
  if (variant === 'droplet') {
    return (
      <svg
        viewBox="0 0 160 160"
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="dropGrad" x1="80" y1="20" x2="80" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0044cc" />
            <stop offset="40%" stopColor="#0066ff" />
            <stop offset="80%" stopColor="#002b80" />
            <stop offset="100%" stopColor="#001a4d" />
          </linearGradient>
          <radialGradient id="flare" cx="65" cy="55" r="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#66b3ff" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#0066ff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="rippleGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0033aa" />
            <stop offset="50%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0033aa" />
          </linearGradient>
        </defs>

        {/* Outer Ripple Wave 3 */}
        <ellipse cx="80" cy="125" rx="72" ry="24" stroke="url(#rippleGrad)" strokeWidth="4" fill="none" opacity="0.9" />

        {/* Middle Ripple Wave 2 */}
        <ellipse cx="80" cy="122" rx="56" ry="18" stroke="#38bdf8" strokeWidth="4" fill="none" opacity="0.95" />

        {/* Inner Ripple Wave 1 (White reflection) */}
        <ellipse cx="80" cy="118" rx="42" ry="13" stroke="#ffffff" strokeWidth="3.5" fill="none" />

        {/* Main Water Droplet Shape */}
        <path
          d="M80 18 C72 42, 40 68, 40 92 A40 40 0 0 0 120 92 C120 68, 88 42, 80 18 Z"
          fill="url(#dropGrad)"
          stroke="#002b80"
          strokeWidth="1.5"
        />

        {/* Shiny Lens Flare Highlight */}
        <ellipse cx="68" cy="62" rx="22" ry="16" fill="url(#flare)" transform="rotate(-20 68 62)" />
        <path d="M55 45 Q70 35 80 20" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.8" />

        {/* Registered Symbol ® on Drop */}
        <circle cx="112" cy="38" r="7" stroke="#0033aa" strokeWidth="1.5" fill="#ffffff" />
        <text x="112" y="41.5" textAnchor="middle" fill="#0033aa" fontSize="7" fontWeight="900" fontFamily="sans-serif">®</text>

        {/* CMD Bold Typography on Droplet */}
        <text
          x="80"
          y="100"
          textAnchor="middle"
          fill="#ffffff"
          fontSize="26"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="1"
          style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.5))' }}
        >
          CMD
        </text>
      </svg>
    );
  }

  // Exact Wordmark: CELL with green hexagon in 'C' and MINERAL DROPS below
  if (variant === 'wordmark') {
    return (
      <div className={`inline-flex flex-col items-center select-none ${className}`}>
        {/* CELL with Green Hexagon in C */}
        <div className="flex items-center gap-0 leading-none">
          {/* Custom C with Green Hexagon/Circle inside */}
          <div className="relative flex items-center justify-center w-[1.1em] h-[1.1em]">
            {/* Outer Blue C */}
            <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
              {/* Blue C Arc */}
              <path
                d="M78 20 A42 42 0 1 0 78 80"
                stroke="#002b80"
                strokeWidth="16"
                strokeLinecap="square"
                fill="none"
              />
              {/* Inner Green Hexagon */}
              <polygon
                points="50,26 68,36 68,64 50,74 32,64 32,36"
                fill="none"
                stroke="#16a34a"
                strokeWidth="7"
              />
              <circle cx="50" cy="50" r="10" fill="#16a34a" />
            </svg>
          </div>

          {/* ELL */}
          <span className="font-black text-[1.1em] tracking-tight text-[#002b80] dark:text-white uppercase font-sans">
            ELL
          </span>
          <span className="text-[0.45em] font-black text-[#002b80] dark:text-sky-300 -mt-[0.6em]">
            ®
          </span>
        </div>

        {/* MINERAL DROPS Underneath */}
        <div className="text-[0.38em] font-black tracking-[0.22em] text-[#002b80] dark:text-sky-400 uppercase mt-0.5 whitespace-nowrap">
          MINERAL DROPS
        </div>
      </div>
    );
  }

  // Full Combined Logo: Wordmark + Droplet Medallion
  return (
    <div className={`relative flex items-center gap-3 ${className}`}>
      {watermark && (
        <div className="absolute -inset-4 opacity-25 pointer-events-none flex items-center justify-center">
          <HciCmdLogo variant="watermark-white" className="w-64 h-64" />
        </div>
      )}

      {/* Droplet Medallion */}
      <div className="shrink-0 w-12 h-12 sm:w-14 sm:h-14">
        <HciCmdLogo variant="droplet" className="w-full h-full drop-shadow-md" />
      </div>

      {/* Wordmark */}
      <div className="flex flex-col">
        <div className="text-[10px] sm:text-xs font-black tracking-wider text-sky-600 dark:text-sky-400 uppercase">
          HCI
        </div>
        <HciCmdLogo variant="wordmark" className="text-xl sm:text-2xl" />
      </div>
    </div>
  );
};
