/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PageView } from '../types';
import { STATUTORY_NOTICES, FIVE_TIER_CLAIMS } from '../data/compliance';
import { BirSealBadge } from '../components/ui/BirSealBadge';
import { RegulatoryNotice } from '../components/ui/RegulatoryNotice';

interface ComplianceViewProps {
  onNavigate: (view: PageView) => void;
}

export const ComplianceView: React.FC<ComplianceViewProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      {/* Header */}
      <div className="space-y-3 border-b border-slate-800 pb-8">
        <div className="flex items-center gap-2 text-xs font-mono text-amber-400 uppercase tracking-widest">
          <span>Regulatory Transparency Center</span>
          <span aria-hidden="true">·</span>
          <span>COMP-POL-002 & Source Register Baseline</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-serif font-black tracking-tight text-white">
          Compliance, Disclaimers & Governance
        </h1>
        <p className="text-base sm:text-lg text-slate-300 max-w-3xl leading-relaxed">
          Official statutory disclosures, primary regulatory registrations, five-tier product claims demarcation, and Philippine e-commerce legal baselines.
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

      {/* Primary FDA Product Registration Record */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-baseline gap-2 border-b border-slate-800 pb-4">
          <div>
            <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">
              Primary Regulatory Record
            </span>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-white mt-0.5">
              FDA Product Registration FR-4000008713595
            </h2>
          </div>
          <a
            href={STATUTORY_NOTICES.FDA_REGISTRATION.portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 hover:underline"
          >
            <span>FDA Verification Portal PDF</span>
            <span aria-hidden="true">↗</span>
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1">
            <span className="text-slate-400 block font-mono text-[10px] uppercase">
              Registered Product Name
            </span>
            <p className="font-semibold text-slate-100">
              {STATUTORY_NOTICES.FDA_REGISTRATION.registeredProductName}
            </p>
          </div>

          <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1">
            <span className="text-slate-400 block font-mono text-[10px] uppercase">
              Brand Name & Classification
            </span>
            <p className="font-semibold text-slate-100">
              {STATUTORY_NOTICES.FDA_REGISTRATION.brandName} · {STATUTORY_NOTICES.FDA_REGISTRATION.classification}
            </p>
          </div>

          <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1">
            <span className="text-slate-400 block font-mono text-[10px] uppercase">
              Registrant Company
            </span>
            <p className="font-semibold text-slate-100">
              {STATUTORY_NOTICES.FDA_REGISTRATION.registrant}
            </p>
          </div>

          <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1">
            <span className="text-slate-400 block font-mono text-[10px] uppercase">
              Recorded Packaging Format
            </span>
            <p className="font-semibold text-slate-100">
              {STATUTORY_NOTICES.FDA_REGISTRATION.recordedPackaging}
            </p>
          </div>

          <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1">
            <span className="text-slate-400 block font-mono text-[10px] uppercase">
              Date of Issuance & Expiration
            </span>
            <p className="font-semibold text-slate-100">
              Issued {STATUTORY_NOTICES.FDA_REGISTRATION.dateIssued} · Valid through {STATUTORY_NOTICES.FDA_REGISTRATION.dateExpiration}
            </p>
          </div>

          <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1">
            <span className="text-slate-400 block font-mono text-[10px] uppercase">
              Statutory Condition of Registration
            </span>
            <p className="font-semibold text-amber-300">
              Registered as Food Supplement with NO APPROVED THERAPEUTIC CLAIMS
            </p>
          </div>
        </div>
      </section>

      {/* Five-Tier Claim Demarcation Architecture */}
      <section className="space-y-6">
        <div>
          <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">
            Content Demarcation Architecture (COMP-POL-002)
          </span>
          <h2 className="text-2xl font-serif font-bold text-white mt-1">
            The Five-Tier Product Claims Standard
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
            To prevent commercial marketing assertions from being conflated with verified regulatory facts, every statement published across the platform is classified under this five-tier demarcation model:
          </p>
        </div>

        <div className="space-y-4">
          {FIVE_TIER_CLAIMS.map((tier) => (
            <div
              key={tier.tier}
              className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-serif font-bold text-white text-base">
                  {tier.tierName}
                </h3>
                <span className="text-xs font-mono text-amber-400">
                  Level {tier.tier}
                </span>
              </div>
              <p className="text-xs text-slate-300 italic">
                {tier.ruleSummary}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs">
                {tier.permitted.length > 0 && (
                  <div className="p-3 bg-slate-950/80 rounded border border-emerald-900/30">
                    <span className="text-emerald-400 font-bold uppercase tracking-wider text-[10px] block mb-1">
                      Permitted Statements
                    </span>
                    <ul className="space-y-1 list-disc list-inside text-slate-300">
                      {tier.permitted.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div
                  className={`p-3 bg-slate-950/80 rounded border border-rose-900/40 ${
                    tier.permitted.length === 0 ? 'md:col-span-2' : ''
                  }`}
                >
                  <span className="text-rose-400 font-bold uppercase tracking-wider text-[10px] block mb-1">
                    Strictly Prohibited Claims
                  </span>
                  <ul className="space-y-1 list-disc list-inside text-slate-300">
                    {tier.prohibited.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* BIR Registration & Statutory Records Retention */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
        <div className="space-y-2">
          <span className="text-xs font-mono text-amber-400 uppercase tracking-widest">
            Tax Authority Governance & Records Preservation
          </span>
          <h2 className="text-2xl font-serif font-bold text-white">
            BIR Seal Badge & Statutory Records Retention
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <p>
              <strong>BIR RMC No. 38-2026:</strong> Bureau of Internal Revenue guidelines require all Philippine digital commerce platforms to exhibit an authorized Registration Seal Badge containing an interactive QR verification code.
            </p>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded space-y-2">
              <span className="font-bold text-amber-300 uppercase tracking-wider text-xs block">
                Statutory 5-Year Accounting Records Retention Mandate
              </span>
              <p className="text-xs text-slate-200">
                {STATUTORY_NOTICES.BIR_DISCLOSURES.recordsRetentionStatute}
              </p>
            </div>
            <p className="text-xs text-slate-400">
              <strong>Operational vs. Tax Records Separation:</strong> In strict compliance with Philippine law, statutory tax books and accounting records are segregated from operational server telemetry and application logs.
            </p>
          </div>

          <div className="lg:col-span-5">
            <BirSealBadge />
          </div>
        </div>
      </section>

      {/* Governing Philippine Statutes */}
      <section className="space-y-4">
        <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">
          Legal Framework Matrix
        </span>
        <h2 className="text-2xl font-serif font-bold text-white">
          Governing Philippine Statutes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {STATUTORY_NOTICES.LEGAL_FRAMEWORK.map((item, idx) => (
            <div
              key={idx}
              className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-1"
            >
              <div className="font-mono text-amber-400 font-bold">{item.act}</div>
              <div className="font-semibold text-white">{item.title}</div>
              <p className="text-slate-400 text-[11px] leading-relaxed mt-1">
                {item.scope}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Links */}
      <div className="pt-4 flex flex-wrap gap-4 border-t border-slate-800">
        <button
          onClick={() => onNavigate('terms')}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded transition"
        >
          View Terms of Service
        </button>
        <button
          onClick={() => onNavigate('privacy')}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded transition"
        >
          View Privacy Policy
        </button>
        <button
          onClick={() => onNavigate('returns')}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded transition"
        >
          View Return & Refund Policy
        </button>
      </div>
    </div>
  );
};
