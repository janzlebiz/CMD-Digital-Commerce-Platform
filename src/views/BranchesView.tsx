/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PageView } from '../types';
import { MapPin, Phone, Clock, Mail, ShieldCheck } from 'lucide-react';

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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-extrabold text-white">6 Municipal Branches in Camarines Norte</h1>
        <p className="text-sm text-slate-400 max-w-2xl mx-auto">
          Visit any of our physical branch hubs for instant order pickup, direct mineral testing, and in-person wellness consultations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branches.map((b) => (
          <div
            key={b.id}
            className={`p-6 rounded-2xl border space-y-4 ${
              b.isCentral
                ? 'bg-slate-900 border-amber-500/50 shadow-lg'
                : 'bg-slate-900/80 border-slate-800'
            }`}
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-amber-400 uppercase font-mono">{b.municipality}</span>
              {b.isCentral && (
                <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-full">
                  Central Hub
                </span>
              )}
            </div>

            <h3 className="text-base font-bold text-white">{b.name}</h3>

            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{b.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                <span>{b.hours}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                <span>{b.phone}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
