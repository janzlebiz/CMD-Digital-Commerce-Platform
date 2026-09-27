/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PageView } from '../types';
import { MapPin, Phone, Mail, Clock, MessageSquare } from 'lucide-react';

export const ContactView: React.FC<{ onNavigate: (view: PageView) => void }> = ({ onNavigate }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-extrabold text-white">Contact & Customer Support</h1>
        <p className="text-sm text-slate-400">
          Reach our central distribution team in Daet or visit any of our 6 municipal branches in Camarines Norte.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-white">Central Hub Office</h3>
          <div className="space-y-3 text-xs text-slate-300">
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>Vinzons Avenue, Brgy. Gahonon, Daet, Camarines Norte</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Hotline: (054) 888-DAET / Mobile: +63 917 123 4567</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Email: support@hcicmd-camnorte.ph</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Mon – Sat: 8:00 AM – 6:00 PM</span>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-white">Customer Redress & Inquiries</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Need assistance with an existing order, branch pickup verification, or booking a naturopathic consultation?
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => onNavigate('consultations')}
              className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow transition"
            >
              Book Naturopathic Consultation
            </button>
            <button
              onClick={() => onNavigate('branches')}
              className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
            >
              View All 6 Branch Locations
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
