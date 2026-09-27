/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PageView } from '../types';

export const PrivacyView: React.FC<{ onNavigate: (view: PageView) => void }> = ({ onNavigate }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8 text-slate-300 text-xs leading-relaxed">
      <h1 className="text-2xl font-bold text-white">Privacy Policy (Data Privacy Act of 2012 — RA 10173)</h1>
      <p>Last updated: September 27, 2026</p>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-white">1. Data Controller & Security Governance</h2>
        <p>
          HCI CMD Camarines Norte Distribution Network acts as the Personal Information Controller (PIC) for customer account and order transactions, and applies strict technical security controls for Sensitive Personal Information (SPI).
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-white">2. Health Data Protection (Section 13(a))</h2>
        <p>
          Health questionnaires and consultation notes are encrypted at rest using Google Cloud Key Management Service (KMS) AES-256-GCM envelope encryption. Plaintext clinical data is never accessible to warehouse clerks or retail personnel.
        </p>
      </section>
    </div>
  );
};
