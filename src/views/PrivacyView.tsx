/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PageView } from '../types';

export const PrivacyView: React.FC<{ onNavigate: (view: PageView) => void }> = ({ onNavigate }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
          Privacy Policy (Data Privacy Act of 2012 — RA 10173)
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">Last updated: September 2026</p>
      </div>

      <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6 shadow-xs">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">1. Data Controller & Security Governance</h2>
          <p className="text-slate-600 dark:text-slate-300">
            HCI CMD Camarines Norte Distribution Network acts as the Personal Information Controller (PIC) for customer account and order transactions, and applies strict technical security controls for Sensitive Personal Information (SPI).
          </p>
        </section>

        <section className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">2. Health Data Protection (Section 13(a))</h2>
          <p className="text-slate-600 dark:text-slate-300">
            Health questionnaires and consultation notes are encrypted at rest using Google Cloud Key Management Service (KMS) AES-256-GCM envelope encryption. Plaintext clinical data is never accessible to warehouse clerks or retail personnel.
          </p>
        </section>
      </div>
    </div>
  );
};
