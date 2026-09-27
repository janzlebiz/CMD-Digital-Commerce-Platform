/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PageView } from '../../types';
import { ShieldCheck, MapPin, Phone, Mail, FileText } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: PageView) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-slate-950 border-t border-slate-800 text-slate-400 text-xs py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand Column */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm">
              CMD
            </div>
            <span className="text-white font-bold text-sm">HCI Cell Mineral Drops</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Authorized regional distribution and educational hub for Camarines Norte, Philippines. Serving Daet, Labo, Capalonga, Paracale, Jose Panganiban, and Santa Elena.
          </p>
          <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>KMS-Encrypted Health SPI Protection</span>
          </div>
        </div>

        {/* Quick Links */}
        <div className="space-y-2">
          <h4 className="text-slate-200 font-bold uppercase tracking-wider text-[11px]">Exploration</h4>
          <ul className="space-y-1.5 text-[11px]">
            <li>
              <button onClick={() => onNavigate('products')} className="hover:text-amber-400 transition">
                Product Catalog & Droppers
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate('consultations')} className="hover:text-amber-400 transition">
                🌿 Naturopathic Consultations
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate('education')} className="hover:text-amber-400 transition">
                Mineral Science & Dilution Guide
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate('branches')} className="hover:text-amber-400 transition">
                6 Camarines Norte Branches
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate('faq')} className="hover:text-amber-400 transition">
                Frequently Asked Questions
              </button>
            </li>
          </ul>
        </div>

        {/* Compliance & Regulatory */}
        <div className="space-y-2">
          <h4 className="text-slate-200 font-bold uppercase tracking-wider text-[11px]">Legal & Compliance</h4>
          <ul className="space-y-1.5 text-[11px]">
            <li>
              <button onClick={() => onNavigate('compliance')} className="hover:text-amber-400 transition">
                FDA & DTI Statutory Compliance
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate('privacy')} className="hover:text-amber-400 transition">
                RA 10173 Privacy Policy (DPA)
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate('terms')} className="hover:text-amber-400 transition">
                Terms of Service & Non-Medical Disclaimer
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate('returns')} className="hover:text-amber-400 transition">
                Returns & Refund Policy (RA 7394)
              </button>
            </li>
          </ul>
        </div>

        {/* Contact & Support */}
        <div className="space-y-2">
          <h4 className="text-slate-200 font-bold uppercase tracking-wider text-[11px]">Central Hub Contact</h4>
          <div className="space-y-1 text-[11px] text-slate-400">
            <p className="flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span>Daet Central Hub, Vinzons Avenue, Daet, Camarines Norte</span>
            </p>
            <p className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>(054) 888-HCI-CMD / +63 917 123 4567</span>
            </p>
            <p className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>support@hcicmd-camnorte.ph</span>
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-6 border-t border-slate-900 text-center text-[10px] text-slate-600">
        © 2026 HCI CMD Camarines Norte Distribution Network. All rights reserved. Food Supplement Only. No Approved Therapeutic Claims.
      </div>
    </footer>
  );
};
