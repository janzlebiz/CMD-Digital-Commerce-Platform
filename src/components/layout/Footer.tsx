/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PageView } from '../../types';
import {
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Heart,
  Scale,
  FileText,
  HelpCircle,
} from 'lucide-react';

interface FooterProps {
  onNavigate: (view: PageView) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const [disclaimersExpanded, setDisclaimersExpanded] = useState<boolean>(false);

  return (
    <footer className="bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 text-xs transition-colors">
      {/* 1. Regulatory & Statutory Compliance Advisory Area (Moved to Footer) */}
      <section
        aria-label="Statutory Regulatory Compliance Advisory"
        className="bg-sky-50 dark:bg-slate-900 border-b border-sky-200 dark:border-slate-800 px-4 sm:px-6 lg:px-8 py-4"
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-sky-700 dark:text-sky-400 shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
            <div>
              <span className="font-bold text-sky-900 dark:text-sky-300 text-xs uppercase tracking-wide mr-2">
                FDA Philippines Compliance Advisory:
              </span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                MAHALAGANG PAALALA: ANG HCI CELL MINERAL DROPS (CMD) AY HINDI GAMOT AT HINDI DAPAT GAMITING PANGGAMOT SA ANUMANG URI NG SAKIT.
              </span>
            </div>
          </div>

          <button
            onClick={() => setDisclaimersExpanded(!disclaimersExpanded)}
            className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 dark:text-sky-400 hover:text-sky-900 dark:hover:text-sky-200 underline underline-offset-2 shrink-0 transition"
            aria-expanded={disclaimersExpanded}
          >
            <span>{disclaimersExpanded ? 'Hide Statutory Disclaimers' : 'View Statutory Disclaimers'}</span>
            {disclaimersExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {disclaimersExpanded && (
          <div className="max-w-7xl mx-auto mt-4 pt-3 border-t border-sky-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-2.5 bg-white dark:bg-slate-950 p-3.5 rounded-xl border border-sky-100 dark:border-slate-800 shadow-xs">
              <ShieldCheck className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 dark:text-white block mb-1">
                  Food Supplement Classification (FDA Philippines):
                </strong>
                Registered dietary mineral food supplement. No therapeutic claims are approved or intended for diagnosing, treating, curing, or preventing any medical disease.
              </div>
            </div>
            <div className="flex items-start gap-2.5 bg-white dark:bg-slate-950 p-3.5 rounded-xl border border-sky-100 dark:border-slate-800 shadow-xs">
              <ShieldCheck className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 dark:text-white block mb-1">
                  Naturopathic Wellness Education & DPA Protection:
                </strong>
                Wellness consultations do not constitute the practice of medicine under RA 2382. Sensitive health data is encrypted under RA 10173 Section 13(a) with Google Cloud KMS.
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 2. Main Footer Navigation Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Column 1: Brand & Territory Mission */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 text-white font-black shadow-md flex items-center justify-center border border-sky-400/30">
              <svg viewBox="0 0 40 40" className="w-7 h-7" fill="none">
                <path d="M20 6 C16 16, 9 22, 9 29 A11 11 0 0 0 31 29 C31 22, 24 16, 20 6 Z" fill="#ffffff" />
                <ellipse cx="20" cy="30" rx="14" ry="4.5" stroke="#38bdf8" strokeWidth="2.5" fill="none" />
                <text x="20" y="30" textAnchor="middle" fill="#0284c7" fontSize="7.5" fontWeight="900" fontFamily="sans-serif">CMD</text>
              </svg>
            </div>
            <div>
              <span className="text-slate-900 dark:text-white font-black text-sm block leading-none">
                HCI CMD
              </span>
              <span className="text-[10px] text-sky-700 dark:text-sky-400 font-extrabold tracking-wider block mt-1">
                CELL MINERAL DROPS
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Sourced naturally from the Great Salt Lake, Utah, USA. Authorized regional distribution and educational hub for Camarines Norte, Philippines. Serving Daet, Labo, Capalonga, Paracale, Jose Panganiban, and Santa Elena.
          </p>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>KMS-Encrypted Health SPI Protection</span>
          </div>
        </div>

        {/* Column 2: HCI CMD Wellness & Catalog */}
        <div className="space-y-3">
          <h4 className="text-slate-900 dark:text-slate-100 font-bold uppercase tracking-wider text-xs">
            Wellness & Catalog
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <button
                onClick={() => onNavigate('products')}
                className="hover:text-sky-700 dark:hover:text-sky-300 transition text-left"
              >
                Product Catalog & Droppers
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate('education')}
                className="hover:text-sky-700 dark:hover:text-sky-300 transition text-left"
              >
                Mineral Science & Dilution Guide
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate('consultations')}
                className="hover:text-sky-700 dark:hover:text-sky-300 transition text-left"
              >
                Naturopathic Consultations
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate('workshops')}
                className="hover:text-sky-700 dark:hover:text-sky-300 transition text-left"
              >
                Community Wellness Workshops
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate('branches')}
                className="hover:text-sky-700 dark:hover:text-sky-300 transition text-left font-semibold text-sky-700 dark:text-sky-400"
              >
                Branches & Pick-Up Hubs
              </button>
            </li>
          </ul>
        </div>

        {/* Column 3: Customer Care & Support (Moved to Footer) */}
        <div className="space-y-3">
          <h4 className="text-slate-900 dark:text-slate-100 font-bold uppercase tracking-wider text-xs">
            Customer Care & Support
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <button
                onClick={() => onNavigate('support')}
                className="hover:text-sky-700 dark:hover:text-sky-300 transition text-left flex items-center gap-1.5"
              >
                <Scale className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>Redress & Formal Complaints</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate('faq')}
                className="hover:text-sky-700 dark:hover:text-sky-300 transition text-left flex items-center gap-1.5"
              >
                <HelpCircle className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>Frequently Asked Questions (FAQ)</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate('contact')}
                className="hover:text-sky-700 dark:hover:text-sky-300 transition text-left flex items-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>Contact Central Distribution Hub</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate('returns')}
                className="hover:text-sky-700 dark:hover:text-sky-300 transition text-left flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>Returns & Refund Policy (RA 7394)</span>
              </button>
            </li>
          </ul>
        </div>

        {/* Column 4: Regulatory Compliance & Legal (Moved to Footer) */}
        <div className="space-y-3">
          <h4 className="text-slate-900 dark:text-slate-100 font-bold uppercase tracking-wider text-xs">
            Compliance & Legal
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <button
                onClick={() => onNavigate('compliance')}
                className="hover:text-sky-700 dark:hover:text-sky-300 transition text-left"
              >
                FDA & DTI Statutory Compliance
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate('privacy')}
                className="hover:text-sky-700 dark:hover:text-sky-300 transition text-left"
              >
                RA 10173 Privacy Policy (DPA)
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate('terms')}
                className="hover:text-sky-700 dark:hover:text-sky-300 transition text-left"
              >
                Terms of Service & Non-Medical Disclaimers
              </button>
            </li>
          </ul>

          <div className="pt-2 text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <p className="flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
              <span>Vinzons Avenue, Daet, Camarines Norte</span>
            </p>
            <p className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
              <span>(054) 888-HCI-CMD / +63 917 123 4567</span>
            </p>
          </div>
        </div>
      </div>

      {/* 3. Bottom Copyright Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-500">
        © 2026 HCI CMD Camarines Norte Distribution Network. All rights reserved. Food Supplement Only. No Approved Therapeutic Claims.
      </div>
    </footer>
  );
};
