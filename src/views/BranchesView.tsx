/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PageView } from '../types';
import { BRANCHES_DATA } from '../data/branches';
import { STATUTORY_NOTICES } from '../data/compliance';
import { RegulatoryNotice } from '../components/ui/RegulatoryNotice';

interface BranchesViewProps {
  onNavigate: (view: PageView) => void;
}

export const BranchesView: React.FC<BranchesViewProps> = ({ onNavigate }) => {
  const [selectedBranchId, setSelectedBranchId] = useState<string>('daet');
  const [filterZone, setFilterZone] = useState<string>('all');

  const selectedBranch =
    BRANCHES_DATA.find((b) => b.id === selectedBranchId) || BRANCHES_DATA[0];

  const filteredBranches =
    filterZone === 'all'
      ? BRANCHES_DATA
      : filterZone === 'hub'
      ? BRANCHES_DATA.filter((b) => b.isCentralHub)
      : BRANCHES_DATA.filter((b) => !b.isCentralHub);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      {/* Header */}
      <div className="space-y-3 border-b border-slate-800 pb-8">
        <div className="flex items-center gap-2 text-xs font-mono text-amber-400 uppercase tracking-widest">
          <span>Regional Physical Network</span>
          <span aria-hidden="true">·</span>
          <span>Province of Camarines Norte</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-serif font-black tracking-tight text-white">
          Six-Branch Directory
        </h1>
        <p className="text-base sm:text-lg text-slate-300 max-w-3xl leading-relaxed">
          Comprehensive directory of our six distribution points across Camarines Norte, spanning Daet Central Hub to coastal and boundary municipalities.
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

      {/* Phase 0 Operational Audit Transparency Callout */}
      <RegulatoryNotice
        level="info"
        title="Branch Operational Audit Status"
        citation="FAR-07, FAR-08 & FAR-09"
      >
        <div className="space-y-1 text-xs text-slate-300 leading-relaxed">
          <p>
            <strong>Verified Scope:</strong> The business operates a physical presence across six mandated municipalities in Camarines Norte: <strong>Daet, Labo, Paracale, Jose Panganiban, Capalonga, and Sta. Elena</strong>.
          </p>
          <p>
            <strong>Pending Operational Evidence:</strong> In accordance with strict Phase 0 evidentiary standards, exact building numbers, street addresses, and local telephone hotlines remain classified as <em>PENDING BUSINESS CONFIRMATION</em> until verified on-site by the operations audit team.
          </p>
        </div>
      </RegulatoryNotice>

      {/* Interactive Filter Controls (Functional Buttons - Compliant with Zero-Pill Discipline) */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
        <span className="text-xs font-mono uppercase tracking-wider text-slate-400 mr-2">
          View Filter:
        </span>
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded border border-slate-800">
          <button
            onClick={() => setFilterZone('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400 ${
              filterZone === 'all'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            All 6 Branches
          </button>
          <button
            onClick={() => setFilterZone('hub')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400 ${
              filterZone === 'hub'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Daet Central Hub
          </button>
          <button
            onClick={() => setFilterZone('satellite')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400 ${
              filterZone === 'satellite'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Regional Satellite Branches (5)
          </button>
        </div>
      </div>

      {/* Main Two-Column Interactive Directory */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Branch List */}
        <div className="lg:col-span-5 space-y-3">
          {filteredBranches.map((branch) => {
            const isSelected = branch.id === selectedBranch.id;
            return (
              <button
                key={branch.id}
                onClick={() => setSelectedBranchId(branch.id)}
                className={`w-full text-left p-4 rounded-lg border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                  isSelected
                    ? 'bg-slate-900 border-amber-500 shadow-md ring-1 ring-amber-500/50'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-serif font-bold text-base text-white">
                      {branch.name}
                    </h3>
                    <div className="text-xs text-amber-400/90 font-mono mt-0.5">
                      {branch.municipality} · {branch.geographicZone}
                    </div>
                  </div>
                  {branch.isCentralHub && (
                    <span className="text-[10px] font-mono uppercase bg-amber-950/80 text-amber-300 border border-amber-800/80 px-2 py-0.5 rounded-sm">
                      Central Hub
                    </span>
                  )}
                </div>

                <div className="mt-2 text-xs text-slate-400 truncate">
                  {branch.role}
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: Detailed Selected Branch Dossier */}
        <div className="lg:col-span-7">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-800 pb-4 space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono text-amber-400 uppercase tracking-widest">
                <span>Branch Profile</span>
                <span aria-hidden="true">·</span>
                <span>{selectedBranch.municipality}, Camarines Norte</span>
              </div>
              <h2 className="text-2xl font-serif font-bold text-white">
                {selectedBranch.name}
              </h2>
              <p className="text-xs text-slate-300">
                {selectedBranch.role}
              </p>
            </div>

            {/* Audit Status Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Street Address:</span>
                  <span className="text-[10px] font-mono text-amber-400 uppercase">
                    Pending Confirmation
                  </span>
                </div>
                <div className="text-xs font-medium text-slate-200">
                  {selectedBranch.addressDisplay}
                </div>
                <p className="text-[11px] text-slate-400 italic">
                  {selectedBranch.addressNote}
                </p>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Contact Number:</span>
                  <span className="text-[10px] font-mono text-amber-400 uppercase">
                    Pending Confirmation
                  </span>
                </div>
                <div className="text-xs font-medium text-slate-200">
                  {selectedBranch.phoneDisplay}
                </div>
                <p className="text-[11px] text-slate-400 italic">
                  {selectedBranch.phoneNote}
                </p>
              </div>
            </div>

            {/* Hours & Schedule */}
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-xs">
              <span className="text-slate-400">Operating Schedule (Proposed Baseline):</span>
              <span className="font-mono text-slate-200">{selectedBranch.hoursDisplay}</span>
            </div>

            {/* Planned Service Features */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-mono uppercase tracking-wider text-amber-300 font-semibold">
                Branch Capabilities & Service Scope
              </h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                {selectedBranch.serviceFeatures.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-400" aria-hidden="true">•</span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Planned Fulfillment Protocols */}
            <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
              <span className="text-slate-400 font-medium block">
                Planned Commercial Fulfillment (Phase 2):
              </span>
              <div className="flex flex-wrap gap-2">
                {selectedBranch.plannedFulfillment.map((ful, idx) => (
                  <span
                    key={idx}
                    className="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded text-slate-300 text-[11px]"
                  >
                    {ful}
                  </span>
                ))}
              </div>
            </div>

            {/* Central Hub Note */}
            {selectedBranch.isCentralHub && (
              <div className="p-4 bg-amber-950/30 border border-amber-800/40 rounded text-xs text-amber-200 space-y-1">
                <span className="font-bold text-amber-300 uppercase tracking-wider text-[11px] block">
                  Provincial Distribution Hub Function
                </span>
                <p className="text-[11px] leading-relaxed">
                  The Daet branch houses the provincial administrative office, the central inventory replenishment stock for all Camarines Norte satellite branches, and coordinates logistics dispatch across the province.
                </p>
              </div>
            )}

            {/* Inquiry Trigger */}
            <div className="pt-2">
              <button
                onClick={() => onNavigate('contact')}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-medium text-xs rounded border border-slate-700 transition"
              >
                Inquire About {selectedBranch.municipality} Branch Availability →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
