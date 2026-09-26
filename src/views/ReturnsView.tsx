/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PageView } from '../types';
import { STATUTORY_NOTICES } from '../data/compliance';
import { RegulatoryNotice } from '../components/ui/RegulatoryNotice';

interface ReturnsViewProps {
  onNavigate: (view: PageView) => void;
}

export const ReturnsView: React.FC<ReturnsViewProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
      {/* Header */}
      <div className="space-y-3 border-b border-slate-800 pb-8">
        <div className="flex items-center gap-2 text-xs font-mono text-amber-400 uppercase tracking-widest">
          <span>Consumer Rights & Product Returns</span>
          <span aria-hidden="true">·</span>
          <span>RA 7394 & RA 11967 Compliant</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-serif font-black tracking-tight text-white">
          Return & Refund Policy
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Last Updated & Certified: September 2026 (Phase 1 Baseline)
        </p>
      </div>

      {/* Mandatory Statutory Notice */}
      <RegulatoryNotice level="statutory" title="Mandatory Food Supplement Disclaimer" citation="FDA Circular No. 2015-003">
        <p className="font-semibold text-amber-200">
          {STATUTORY_NOTICES.FILIPINO_WARNING}
        </p>
        <p className="text-xs text-amber-300/80 mt-1 uppercase tracking-wider font-bold">
          {STATUTORY_NOTICES.ENGLISH_DISCLAIMER}
        </p>
      </RegulatoryNotice>

      {/* Policy Content */}
      <div className="space-y-8 text-xs sm:text-sm text-slate-300 leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-lg font-serif font-bold text-white">
            1. Governing Consumer Law & Statutory Protections
          </h2>
          <p>
            This Return and Refund Policy is formulated under <strong>Republic Act No. 7394</strong> (Consumer Act of the Philippines) and <strong>Republic Act No. 11967</strong> (Internet Transactions Act of 2023). We are dedicated to ensuring fair trade, merchant accountability, and consumer protection across all distribution channels in Camarines Norte.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-serif font-bold text-white">
            2. Dietary Supplement Hygiene & Unopened Seal Requirement
          </h2>
          <p>
            Because HCI Cell Mineral Drops is an ingestible dietary food supplement, strict public health and sanitary standards apply:
          </p>
          <div className="p-4 bg-slate-900 border border-slate-800 rounded space-y-2 text-xs">
            <span className="text-amber-300 font-bold uppercase tracking-wider block">
              Tamper-Evident Safety Seal Rule:
            </span>
            <p>
              To be eligible for voluntary return, exchange, or refund, products must be in their original, unopened condition: in the white opaque plastic bottle with the manufacturer tamper-evident shrink-wrap 100% intact.
            </p>
            <p className="text-slate-400">
              Once the protective shrink-wrap is broken, cut, or removed, the product cannot be returned or resold due to health safety considerations, unless a verifiable manufacturing defect is proven.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-serif font-bold text-white">
            3. Damaged Upon Receipt or Defective Packaging
          </h2>
          <p>
            If you receive a bottle that exhibits:
          </p>
          <ul className="space-y-1.5 list-disc list-inside">
            <li>Active liquid leakage during transit or counter handover.</li>
            <li>Damaged or cracked bottle nozzle / broken dropper cap.</li>
            <li>Compromised or missing tamper-evident safety seal.</li>
          </ul>
          <p>
            You must report the issue within <strong>seven (7) calendar days</strong> of receiving the item. Please retain the outer shipping package and bottle in its as-received condition for inspection.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-serif font-bold text-white">
            4. Camarines Norte Six-Branch Return Procedure
          </h2>
          <p>
            For verified orders fulfilled through our Camarines Norte network:
          </p>
          <ol className="space-y-2 list-decimal list-inside text-xs">
            <li>
              <strong>Initiate Request:</strong> Submit an inquiry through our Contact surface or visit the branch where pickup or dispatch was arranged.
            </li>
            <li>
              <strong>Physical Inspection:</strong> Present the bottle with receipt or order verification code to authorized branch personnel at any of our six branches (Daet, Labo, Paracale, Jose Panganiban, Capalonga, or Sta. Elena).
            </li>
            <li>
              <strong>Immediate Replacement:</strong> If defect or transit leakage is confirmed, an identical replacement bottle from active branch stock will be issued immediately at zero additional cost.
            </li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-serif font-bold text-white">
            5. Refund Processing Timeline
          </h2>
          <p>
            Where a replacement is unavailable or a monetary refund is warranted under RA 7394, refunds will be issued within seven (7) business days via the original payment method or cash handover at the Daet Central Hub.
          </p>
        </section>
      </div>

      <div className="pt-6 border-t border-slate-800 flex justify-between">
        <button
          onClick={() => onNavigate('terms')}
          className="text-xs text-amber-400 hover:underline"
        >
          ← Read Terms of Service
        </button>
        <button
          onClick={() => onNavigate('privacy')}
          className="text-xs text-amber-400 hover:underline"
        >
          Read Privacy Policy →
        </button>
      </div>
    </div>
  );
};
