/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PageView } from '../types';
import { STATUTORY_NOTICES } from '../data/compliance';
import { RegulatoryNotice } from '../components/ui/RegulatoryNotice';

interface TermsViewProps {
  onNavigate: (view: PageView) => void;
}

export const TermsView: React.FC<TermsViewProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
      {/* Header */}
      <div className="space-y-3 border-b border-slate-800 pb-8">
        <div className="flex items-center gap-2 text-xs font-mono text-amber-400 uppercase tracking-widest">
          <span>Legal Agreement & Terms of Use</span>
          <span aria-hidden="true">·</span>
          <span>RA 11967 & RA 7394 Compliant</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-serif font-black tracking-tight text-white">
          Terms of Service
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

      {/* Terms Body */}
      <div className="space-y-8 text-xs sm:text-sm text-slate-300 leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-lg font-serif font-bold text-white">
            1. Acceptance of Terms & Regulatory Framework
          </h2>
          <p>
            By accessing or browsing the HCI CMD Digital Commerce Platform (the &quot;Platform&quot;), you acknowledge and agree to be bound by these Terms of Service, our Privacy Policy, and our Product Claims Policy. These terms are established pursuant to Republic Act No. 11967 (Internet Transactions Act of 2023), Republic Act No. 7394 (Consumer Act of the Philippines), and Republic Act No. 9711 (Food and Drug Administration Act of 2009).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-serif font-bold text-white">
            2. Product Nature & Absolute Medical Disclaimer
          </h2>
          <p>
            All products displayed on this platform—specifically HCI Cell Mineral Drops (CMD), registered under FDA Registration No. FR-4000008713595—are classified as <strong>Food Supplements</strong>.
          </p>
          <div className="p-4 bg-slate-900 border border-slate-800 rounded space-y-2 text-xs">
            <p className="text-amber-200 font-semibold uppercase tracking-wider">
              Non-Medical Representation:
            </p>
            <p>
              Information, articles, dosage tables, and mineral guidelines provided on this platform are for general nutritional and dietary educational purposes only. They do not constitute licensed medical diagnosis, clinical prescription, or therapy. The products sold or described are not intended to diagnose, treat, cure, mitigate, or prevent any human disease.
            </p>
            <p>
              You must never discontinue or alter prescription medications without explicit clearance from your licensed attending medical physician.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-serif font-bold text-white">
            3. Strict Prohibition Against Ophthalmic & Unapproved Marketing Claims
          </h2>
          <p>
            As a condition of using this platform or obtaining products through our Camarines Norte distribution network:
          </p>
          <ul className="space-y-1.5 list-disc list-inside">
            <li>
              You agree never to administer HCI Cell Mineral Drops into eyes, ears, or nasal passages.
            </li>
            <li>
              Resellers, independent affiliates, and community members are strictly prohibited from reselling or promoting the product with disease claims (e.g., curing diabetes, hypertension, or cancer) or as &quot;miracle eye drops&quot; for cataracts.
            </li>
            <li>
              Any violation of these terms constitutes a breach of contract and will result in immediate termination of account access and referral to regulatory authorities.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-serif font-bold text-white">
            4. Commercial Ordering & Catalog Architecture (Phase Boundary)
          </h2>
          <p>
            During Phase 1, the Platform operates as an informational, educational, and directory website. Commercial checkout, shopping cart execution, digital payment processing, and customer accounts are deliberately deferred until Phase 2 upon formal submission and verification of the official FDA packaging annexes and BIR Form 2303 registration credentials.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-serif font-bold text-white">
            5. Intellectual Property & Brand Rights
          </h2>
          <p>
            All trademarks, logos, texts, educational guides, and brand identifiers relating to HCI CMD™ and Health Code International Corporation are protected by intellectual property laws of the Republic of the Philippines. Unauthorized copying or redistribution is strictly prohibited.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-serif font-bold text-white">
            6. Governing Law & Dispute Resolution
          </h2>
          <p>
            These Terms of Service shall be governed by, construed, and enforced in accordance with the laws of the Republic of the Philippines. Any legal action or dispute arising from the use of this platform shall be brought before the competent courts of Camarines Norte, Philippines.
          </p>
        </section>
      </div>

      <div className="pt-6 border-t border-slate-800 flex justify-between">
        <button
          onClick={() => onNavigate('privacy')}
          className="text-xs text-amber-400 hover:underline"
        >
          Read Privacy Policy →
        </button>
        <button
          onClick={() => onNavigate('returns')}
          className="text-xs text-amber-400 hover:underline"
        >
          Read Return & Refund Policy →
        </button>
      </div>
    </div>
  );
};
