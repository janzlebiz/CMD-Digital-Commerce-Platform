/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PageView } from '../types';
import { FileText, ShieldCheck } from 'lucide-react';

export const ReturnsView: React.FC<{ onNavigate: (view: PageView) => void }> = ({ onNavigate }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
          Returns & Refund Policy (Consumer Act — RA 7394)
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">Last updated: September 2026</p>
      </div>

      <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6 shadow-xs">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">1. Damaged or Broken Tamper Seals</h2>
          <p className="text-slate-600 dark:text-slate-300">
            If you receive an HCI CMD bottle with a broken or tampered holographic seal upon delivery or branch pickup, you are entitled to an immediate free replacement or full refund within 7 calendar days of receipt.
          </p>
        </section>

        <section className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">2. Return Procedure at Branches</h2>
          <p className="text-slate-600 dark:text-slate-300">
            Present your order receipt and the unopened/damaged bottle at any of our Camarines Norte branch hubs (Daet, Labo, Capalonga, Paracale, Jose Panganiban, Santa Elena) for instant resolution.
          </p>
        </section>
      </div>
    </div>
  );
};
