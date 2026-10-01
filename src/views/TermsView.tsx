/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PageView } from '../types';

export const TermsView: React.FC<{ onNavigate: (view: PageView) => void }> = ({ onNavigate }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
          Terms of Service & Conditions of Use
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">Last updated: September 2026</p>
      </div>

      <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6 shadow-xs">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">1. Scope & Acceptance</h2>
          <p className="text-slate-600 dark:text-slate-300">
            By accessing the HCI CMD Digital Commerce and Naturopathic Wellness platform for Camarines Norte, you agree to comply with these terms, Philippine statutory laws, and administrative orders.
          </p>
        </section>

        <section className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">2. Food Supplement & Non-Medical Status</h2>
          <p className="text-slate-600 dark:text-slate-300">
            Products listed on this platform are dietary food supplements. Statements regarding dietary mineral supplementation have not been evaluated as medical cures. Consult your physician before changing any prescribed medical regimen.
          </p>
        </section>

        <section className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">3. Consultation Services</h2>
          <p className="text-slate-600 dark:text-slate-300">
            Consultations provided by affiliated practitioners are holistic lifestyle and nutritional education sessions under Republic Act No. 2382.
          </p>
        </section>
      </div>
    </div>
  );
};
