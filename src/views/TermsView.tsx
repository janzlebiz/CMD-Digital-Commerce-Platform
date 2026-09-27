/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PageView } from '../types';

export const TermsView: React.FC<{ onNavigate: (view: PageView) => void }> = ({ onNavigate }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8 text-slate-300 text-xs leading-relaxed">
      <h1 className="text-2xl font-bold text-white">Terms of Service & Conditions of Use</h1>
      <p>Last updated: September 27, 2026</p>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-white">1. Scope & Acceptance</h2>
        <p>
          By accessing the HCI CMD Digital Commerce and Naturopathic Wellness platform for Camarines Norte, you agree to comply with these terms, Philippine statutory laws, and administrative orders.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-white">2. Food Supplement & Non-Medical Status</h2>
        <p>
          Products listed on this platform are dietary food supplements. Statements regarding dietary mineral supplementation have not been evaluated as medical cures. Consult your physician before changing any prescribed medical regimen.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-white">3. Consultation Services</h2>
        <p>
          Consultations provided by affiliated practitioners are holistic lifestyle and nutritional education sessions under Republic Act No. 2382.
        </p>
      </section>
    </div>
  );
};
