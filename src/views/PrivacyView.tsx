/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PageView } from '../types';
import { STATUTORY_NOTICES } from '../data/compliance';
import { RegulatoryNotice } from '../components/ui/RegulatoryNotice';

interface PrivacyViewProps {
  onNavigate: (view: PageView) => void;
}

export const PrivacyView: React.FC<PrivacyViewProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
      {/* Header */}
      <div className="space-y-3 border-b border-slate-800 pb-8">
        <div className="flex items-center gap-2 text-xs font-mono text-amber-400 uppercase tracking-widest">
          <span>Data Privacy & User Rights</span>
          <span aria-hidden="true">·</span>
          <span>RA 10173 & NPC Compliant</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-serif font-black tracking-tight text-white">
          Privacy Policy
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Last Updated & Certified: September 2026 (Phase 1 Baseline)
        </p>
      </div>

      {/* Mandatory Statutory Notice */}
      <RegulatoryNotice level="statutory" title="Mandatory Food Supplement Notice" citation="FDA Circular No. 2015-003">
        <p className="font-semibold text-amber-200">
          {STATUTORY_NOTICES.FILIPINO_WARNING}
        </p>
        <p className="text-xs text-amber-300/80 mt-1 uppercase tracking-wider font-bold">
          {STATUTORY_NOTICES.ENGLISH_DISCLAIMER}
        </p>
      </RegulatoryNotice>

      {/* Privacy Policy Body */}
      <div className="space-y-8 text-xs sm:text-sm text-slate-300 leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-lg font-serif font-bold text-white">
            1. Commitment to Data Privacy & Governing Law
          </h2>
          <p>
            The HCI CMD Digital Commerce Platform is committed to safeguarding personal data in accordance with <strong>Republic Act No. 10173</strong> (the Data Privacy Act of 2012) and its Implementing Rules and Regulations (IRR), as issued by the National Privacy Commission (NPC) of the Philippines.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-serif font-bold text-white">
            2. Personal Information Collected & Lawful Processing Bases
          </h2>
          <p>
            In Phase 1, the Platform collects only information that visitors voluntarily submit through our Contact and Inquiry surfaces:
          </p>
          <ul className="space-y-1.5 list-disc list-inside">
            <li><strong>Inquiry Details:</strong> Name, email address, mobile number, branch preference, and message content.</li>
            <li><strong>Lawful Basis:</strong> Consent under Section 12(a) of RA 10173, provided freely when submitting inquiry requests.</li>
          </ul>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded space-y-2 mt-3">
            <span className="text-amber-300 font-semibold uppercase tracking-wider text-xs block">
              Consultation & Health Information Legal Basis Baseline:
            </span>
            <p className="text-xs text-slate-300 leading-relaxed">
              Based on the currently documented proposed wellness-consultation model, processing is designed to rely on Section 13(a) explicit consent. Reassess Section 13(e) if the service later involves medical treatment, a medical practitioner, or a medical treatment institution.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-serif font-bold text-white">
            3. Strict Separation of Tax Records vs. Operational Data
          </h2>
          <p>
            To prevent excessive retention of sensitive personal data while complying with Philippine tax laws, the platform enforces strict segregation of records:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded space-y-1.5">
              <span className="font-bold text-amber-300 uppercase tracking-wider text-[11px] block">
                Statutory Accounting Records
              </span>
              <p className="text-slate-300">
                Pursuant to NIRC Section 235, as amended by Republic Act No. 11976 (Ease of Paying Taxes Act), books of accounts, subsidiary books, and accounting records are preserved for <strong>five (5) years</strong>, reckoned according to the statutory rule specified in Section 235.
              </p>
            </div>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded space-y-1.5">
              <span className="font-bold text-amber-300 uppercase tracking-wider text-[11px] block">
                Operational & Technical Logs
              </span>
              <p className="text-slate-300">
                Application logs, web telemetry, inquiry drafts, and diagnostic data are purged in accordance with standard privacy lifecycles and are not held indefinitely.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-serif font-bold text-white">
            4. Rights of Data Subjects Under Philippine Law
          </h2>
          <p>
            Under Section 16 of Republic Act No. 10173, as a data subject, you are entitled to the following statutory rights:
          </p>
          <ul className="space-y-1.5 list-disc list-inside">
            <li><strong>Right to be Informed:</strong> To know whether personal data pertaining to you is being processed.</li>
            <li><strong>Right to Access:</strong> To request reasonable access to your personal data held by the platform.</li>
            <li><strong>Right to Rectification:</strong> To dispute inaccuracy and request correction of outdated data.</li>
            <li><strong>Right to Erasure or Blocking:</strong> To request deletion or restriction of processing under lawful grounds.</li>
            <li><strong>Right to Damages:</strong> To be indemnified for damages sustained due to inaccurate, incomplete, or unlawfully obtained data.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-serif font-bold text-white">
            5. Data Protection Officer (DPO) Contact
          </h2>
          <p>
            For privacy inquiries, rights assertion requests, or data rectification, you may submit a message via our Contact form routed to &quot;Regulatory Compliance & Data Privacy&quot; or address communications to the Regional Compliance Desk, Daet Central Hub, Camarines Norte.
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
          onClick={() => onNavigate('returns')}
          className="text-xs text-amber-400 hover:underline"
        >
          Read Return & Refund Policy →
        </button>
      </div>
    </div>
  );
};
