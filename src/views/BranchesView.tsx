/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PageView } from '../types';
import { MapPin, Phone, Clock, Mail, ShieldCheck, Building2, ChevronRight } from 'lucide-react';

export const BranchesView: React.FC<{ onNavigate: (view: PageView) => void }> = ({ onNavigate }) => {
  const branches = [
    {
      id: 'daet',
      name: 'Daet Central Hub & Provincial Distribution Center',
      municipality: 'Daet',
      address: 'Vinzons Avenue, Brgy. Gahonon, Daet, Camarines Norte',
      phone: '(054) 888-DAET / +63 917 111 2233',
      hours: 'Mon–Sat: 8:00 AM – 6:00 PM | Sun: 9:00 AM – 3:00 PM',
      isCentral: true,
    },
    {
      id: 'labo',
      name: 'Labo Municipal Branch',
      municipality: 'Labo',
      address: 'Maharlika Highway, Poblacion 1, Labo, Camarines Norte',
      phone: '(054) 888-LABO / +63 917 222 3344',
      hours: 'Mon–Sat: 8:30 AM – 5:30 PM',
    },
    {
      id: 'capalonga',
      name: 'Capalonga Coastal & Pilgrimage Branch',
      municipality: 'Capalonga',
      address: 'Poblacion, Capalonga, Camarines Norte',
      phone: '+63 917 333 4455',
      hours: 'Mon–Sat: 8:30 AM – 5:00 PM',
    },
    {
      id: 'paracale',
      name: 'Paracale Gold District Branch',
      municipality: 'Paracale',
      address: 'Poblacion, Paracale, Camarines Norte',
      phone: '+63 917 444 5566',
      hours: 'Mon–Sat: 8:30 AM – 5:00 PM',
    },
    {
      id: 'jose_panganiban',
      name: 'Jose Panganiban Northern Port Branch',
      municipality: 'Jose Panganiban',
      address: 'Magsaysay St., Poblacion, Jose Panganiban, Camarines Norte',
      phone: '+63 917 555 6677',
      hours: 'Mon–Sat: 8:30 AM – 5:00 PM',
    },
    {
      id: 'santa_elena',
      name: 'Santa Elena Gateway Branch',
      municipality: 'Santa Elena',
      address: 'Highway Junction, Poblacion, Santa Elena, Camarines Norte',
      phone: '+63 917 666 7788',
      hours: 'Mon–Sat: 8:30 AM – 5:00 PM',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 text-xs font-bold tracking-wide">
          <Building2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          <span>Regional Physical Presence</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Municipal Branches in Camarines Norte
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Visit any of our physical branch hubs for instant order pickup, direct mineral water testing, and in-person naturopathic consultations.
        </p>
      </div>

      {/* Branch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branches.map((b) => (
          <div
            key={b.id}
            className={`p-6 rounded-2xl border transition-all flex flex-col justify-between space-y-4 shadow-xs ${
              b.isCentral
                ? 'bg-white dark:bg-slate-900 border-sky-400 dark:border-sky-500/50 shadow-md ring-1 ring-sky-400/20'
                : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:border-sky-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider">
                  {b.municipality}
                </span>
                {b.isCentral && (
                  <span className="text-[10px] bg-sky-600 text-white font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                    Central Hub
                  </span>
                )}
              </div>

              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                {b.name}
              </h3>

              <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400 pt-1">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                  <span>{b.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{b.hours}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{b.phone}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => onNavigate('contact')}
                className="w-full py-2.5 bg-slate-50 dark:bg-slate-800/80 hover:bg-sky-50 dark:hover:bg-slate-800 text-sky-700 dark:text-sky-300 border border-slate-200 dark:border-slate-700 hover:border-sky-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Inquire with Branch</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
