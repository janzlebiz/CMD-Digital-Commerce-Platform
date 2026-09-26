/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PageView } from '../../types';
import { STATUTORY_NOTICES } from '../../data/compliance';
import { BirSealBadge } from '../ui/BirSealBadge';

interface FooterProps {
  onNavigate: (view: PageView) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const handleNav = (view: PageView) => {
    onNavigate(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-800 transition-colors">
      {/* Statutory Disclaimers Block */}
      <div className="bg-amber-950/40 border-b border-amber-900/60 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-3">
          <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-2 border-b border-amber-900/40 pb-3">
            <span className="text-xs font-mono uppercase tracking-wider text-amber-300 font-bold">
              Mandatory FDA Advisory (Republic Act No. 9711 · FDA Circular No. 2015-003)
            </span>
            <span className="text-xs font-bold text-amber-300 uppercase tracking-widest">
              {STATUTORY_NOTICES.ENGLISH_DISCLAIMER}
            </span>
          </div>

          <p className="text-sm font-medium text-amber-100/90 leading-relaxed">
            {STATUTORY_NOTICES.FILIPINO_WARNING}
          </p>

          <p className="text-xs text-amber-200/70 leading-relaxed">
            {STATUTORY_NOTICES.VULNERABLE_DEMOGRAPHICS}
          </p>
        </div>
      </div>

      {/* Main Footer Links & Directory */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Col 1: Brand & Registration Identity */}
          <div className="space-y-4">
            <div>
              <span className="text-lg font-serif font-black text-white">
                HCI CMD<span className="text-amber-400 text-xs">™</span> Camarines Norte
              </span>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Regional digital information and education platform for HCI CMD across Camarines Norte.
              </p>
            </div>

            <div className="text-xs space-y-1.5 pt-2 border-t border-slate-800/80 text-slate-300">
              <div>
                <span className="text-slate-400">FDA Reg. No.:</span>{' '}
                <a
                  href={STATUTORY_NOTICES.FDA_REGISTRATION.portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-amber-400 hover:underline"
                >
                  FR-4000008713595
                </a>
              </div>
              <div>
                <span className="text-slate-400">Registrant:</span>{' '}
                <span className="text-slate-200 font-medium">Health Code International Corp.</span>
              </div>
              <div>
                <span className="text-slate-400">Classification:</span>{' '}
                <span className="text-slate-200">Food Supplement / Medium Risk</span>
              </div>
              <div>
                <span className="text-slate-400">Registration Validity:</span>{' '}
                <span className="text-slate-200">Active until March 18, 2028</span>
              </div>
            </div>
          </div>

          {/* Col 2: Six Camarines Norte Branches */}
          <div>
            <h3 className="text-xs font-mono uppercase tracking-wider text-amber-300 font-semibold mb-3">
              Camarines Norte Network
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => handleNav('branches')}
                  className="text-left hover:text-white transition group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400 rounded"
                >
                  <span className="font-medium text-slate-200 group-hover:text-amber-300">Daet Central Hub</span>
                  <span className="block text-[11px] text-slate-400">Regional Depot & Admin Center</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('branches')}
                  className="text-left hover:text-white transition group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400 rounded"
                >
                  <span className="font-medium text-slate-200 group-hover:text-amber-300">Labo Branch</span>
                  <span className="block text-[11px] text-slate-400">Western Interior Gateway</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('branches')}
                  className="text-left hover:text-white transition group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400 rounded"
                >
                  <span className="font-medium text-slate-200 group-hover:text-amber-300">Paracale Branch</span>
                  <span className="block text-[11px] text-slate-400">Eastern Mining & Coastal Hub</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('branches')}
                  className="text-left hover:text-white transition group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400 rounded"
                >
                  <span className="font-medium text-slate-200 group-hover:text-amber-300">Jose Panganiban Branch</span>
                  <span className="block text-[11px] text-slate-400">Northwestern Seaboard</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('branches')}
                  className="text-left hover:text-white transition group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400 rounded"
                >
                  <span className="font-medium text-slate-200 group-hover:text-amber-300">Capalonga Branch</span>
                  <span className="block text-[11px] text-slate-400">Northern Pilgrimage Center</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('branches')}
                  className="text-left hover:text-white transition group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400 rounded"
                >
                  <span className="font-medium text-slate-200 group-hover:text-amber-300">Sta. Elena Branch</span>
                  <span className="block text-[11px] text-slate-400">Southern Provincial Boundary</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Legal, Policy & Consumer Surfaces */}
          <div>
            <h3 className="text-xs font-mono uppercase tracking-wider text-amber-300 font-semibold mb-3">
              Consumer Trust & Policies
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => handleNav('terms')}
                  className="text-slate-300 hover:text-white transition"
                >
                  Terms of Service
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('privacy')}
                  className="text-slate-300 hover:text-white transition"
                >
                  Privacy Policy (RA 10173)
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('returns')}
                  className="text-slate-300 hover:text-white transition"
                >
                  Return & Refund Policy (RA 7394)
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('compliance')}
                  className="text-slate-300 hover:text-white transition"
                >
                  Regulatory & Claims Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('faq')}
                  className="text-slate-300 hover:text-white transition"
                >
                  Frequently Asked Questions
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('contact')}
                  className="text-slate-300 hover:text-white transition"
                >
                  Contact & Inquiries
                </button>
              </li>
              <li>
                <a
                  href={STATUTORY_NOTICES.FDA_REGISTRATION.portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:underline flex items-center gap-1"
                >
                  <span>Official FDA Portal PDF</span>
                  <span aria-hidden="true">↗</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: BIR Seal Badge Placeholder & Tax Disclosure */}
          <div>
            <h3 className="text-xs font-mono uppercase tracking-wider text-amber-300 font-semibold mb-3">
              Tax & Merchant Identification
            </h3>
            <BirSealBadge compact />
          </div>
        </div>

        {/* Bottom Legal & Statutory Framework */}
        <div className="mt-12 pt-6 border-t border-slate-800 text-[11px] text-slate-400 space-y-2">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
            <p>
              © {new Date().getFullYear()} HCI CMD Camarines Norte Distribution Platform. All rights reserved.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <span>RA 9711 (FDA)</span>
              <span aria-hidden="true">·</span>
              <span>RA 11967 (ITA)</span>
              <span aria-hidden="true">·</span>
              <span>RA 7394 (Consumer Act)</span>
              <span aria-hidden="true">·</span>
              <span>RA 11976 (EOPT)</span>
              <span aria-hidden="true">·</span>
              <span>RA 10173 (Data Privacy)</span>
            </div>
          </div>
          <p className="text-slate-400 leading-normal">
            <strong>Statutory Record-Keeping Notice:</strong> In compliance with NIRC Section 235, as amended by Republic Act No. 11976 (Ease of Paying Taxes Act), all statutory books of accounts, subsidiary books, and accounting records are preserved for a period of five (5) years, reckoned in accordance with the statutory rules prescribed by law.
          </p>
          <p className="text-slate-400 leading-normal">
            <strong>Merchant Disclosure Notice:</strong> Formal business name registration, BIR Form 2303, and distributor dealership contracts are logged in the platform compliance registry and are subject to ongoing Phase 0/Phase 1 verification.
          </p>
        </div>
      </div>
    </footer>
  );
};
