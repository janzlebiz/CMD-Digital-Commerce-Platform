/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PageView } from '../types';
import { MapPin, Phone, Mail, Clock, MessageSquare, Building2, Scale } from 'lucide-react';

export const ContactView: React.FC<{ onNavigate: (view: PageView) => void }> = ({ onNavigate }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 text-xs font-bold tracking-wide">
          <MessageSquare className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          <span>Customer Care & Inquiries</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Contact & Customer Support
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
          Reach our central distribution team in Daet or visit any of our municipal branches across Camarines Norte.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Central Hub Office</h3>
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
              <span>Vinzons Avenue, Brgy. Gahonon, Daet, Camarines Norte</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
              <span>Hotline: (054) 888-DAET / +63 917 123 4567</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
              <span>Email: support@hcicmd-camnorte.ph</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
              <span>Mon – Sat: 8:00 AM – 6:00 PM</span>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Customer Redress & Inquiries</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Need assistance with an existing order, branch pickup verification, dispute resolution, or booking a consultation?
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2.5">
            <button
              onClick={() => onNavigate('consultations')}
              className="py-3 px-4 bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            >
              Book Naturopathic Consultation
            </button>
            <button
              onClick={() => onNavigate('branches')}
              className="py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5"
            >
              <Building2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>View Branch Locations</span>
            </button>
            <button
              onClick={() => onNavigate('support')}
              className="py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5"
            >
              <Scale className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>Submit Formal Support Ticket</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
