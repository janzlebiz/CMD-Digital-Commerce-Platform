/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PageView } from '../types';
import { STATUTORY_NOTICES } from '../data/compliance';
import { PRODUCTS_CATALOG } from '../data/products';
import { BRANCHES_DATA } from '../data/branches';
import { BirSealBadge } from '../components/ui/BirSealBadge';
import { RegulatoryNotice } from '../components/ui/RegulatoryNotice';

interface HomeViewProps {
  onNavigate: (view: PageView) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-16 py-8 sm:py-12">
      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono text-amber-400 uppercase tracking-widest">
                <span>FDA Reg. FR-4000008713595</span>
                <span aria-hidden="true">·</span>
                <span>Great Salt Lake Solar Harvest</span>
              </div>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-black tracking-tight text-white leading-[1.1]">
                Pure Ionic Trace Minerals from Nature's Inland Sea.
              </h1>
            </div>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
              HCI Cell Mineral Drops (CMD) is a concentrated dietary food supplement harvested from Utah's Great Salt Lake. Naturally rich in bioavailable ionic magnesium, chloride, and essential electrolytes to support daily hydration and remineralize drinking water.
            </p>

            {/* Mandatory Regulatory Affirmation */}
            <RegulatoryNotice level="statutory" title="Mandatory Food Supplement Notice" citation="FDA Circular No. 2015-003">
              <p className="font-semibold text-amber-200">
                {STATUTORY_NOTICES.FILIPINO_WARNING}
              </p>
              <p className="text-xs text-amber-300/80 mt-1 uppercase tracking-wider font-bold">
                {STATUTORY_NOTICES.ENGLISH_DISCLAIMER}
              </p>
            </RegulatoryNotice>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={() => onNavigate('education')}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded shadow-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                Explore Mineral Science
              </button>
              <button
                onClick={() => onNavigate('branches')}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm rounded border border-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                Camarines Norte 6-Branch Directory
              </button>
              <button
                onClick={() => onNavigate('products')}
                className="px-4 py-3 text-slate-300 hover:text-amber-300 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:underline"
              >
                View Catalog Architecture →
              </button>
            </div>

            {/* Micro Metadata */}
            <div className="flex items-center gap-3 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
              <span>Food Supplement</span>
              <span aria-hidden="true">·</span>
              <span>Low Sodium (~99.5% removed)</span>
              <span aria-hidden="true">·</span>
              <span>Bioavailable Ionic Liquid</span>
              <span aria-hidden="true">·</span>
              <span>Non-Medicinal</span>
            </div>
          </div>

          {/* Hero Visual Card / Product Showcase */}
          <div className="lg:col-span-5">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="space-y-1">
                <span className="text-xs font-mono text-amber-400 uppercase tracking-widest">
                  Verified Regulatory Profile
                </span>
                <h2 className="text-xl font-serif font-bold text-white">
                  CELL MINERAL DROPS (HCI CMD™)
                </h2>
                <p className="text-xs text-slate-400">
                  White Opaque Plastic Dropper Presentation
                </p>
              </div>

              {/* Status Notice */}
              <div className="p-3 bg-slate-950/80 border border-amber-900/40 rounded text-xs text-amber-200/90 space-y-1">
                <div className="font-semibold text-amber-300">Phase 1 Public Information Stage</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Commercial packaging presentations (65 mL / 30 mL) and SRPs are currently in catalog architecture mode pending business evidence submission.
                </p>
              </div>

              {/* Verified Registry Highlights */}
              <dl className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <dt className="text-slate-400">FDA Reg. Number</dt>
                  <dd className="font-mono text-amber-300 font-semibold">FR-4000008713595</dd>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <dt className="text-slate-400">Registrant</dt>
                  <dd className="text-slate-200 text-right">Health Code International Corp.</dd>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <dt className="text-slate-400">Category</dt>
                  <dd className="text-slate-200">Food Supplement (Medium Risk)</dd>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <dt className="text-slate-400">Validity Period</dt>
                  <dd className="text-slate-200">26 May 2023 – 18 March 2028</dd>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <dt className="text-slate-400">Origin Waters</dt>
                  <dd className="text-slate-200">Great Salt Lake, Utah, USA</dd>
                </div>
              </dl>

              <div className="pt-2">
                <a
                  href={STATUTORY_NOTICES.FDA_REGISTRATION.portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex justify-center items-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded transition"
                >
                  <span>Verify on FDA Philippines Portal</span>
                  <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Educational Pillars */}
      <section className="bg-slate-900/50 border-y border-slate-800/80 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-mono text-amber-400 uppercase tracking-widest">
              Nutritional Biochemistry & Origin
            </span>
            <h2 className="text-2xl sm:text-4xl font-serif font-bold text-white">
              Why Ionic Minerals Matter to Daily Wellness
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Trace minerals act as catalysts for thousands of metabolic and enzymatic processes. Our bodies require minerals in bioavailable, water-soluble forms.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-6 space-y-4">
              <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">
                01. Natural Solar Harvest
              </span>
              <h3 className="text-lg font-serif font-bold text-white">
                Evaporated by Sun and Wind
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Concentrated over an extensive multi-month solar evaporation cycle in Utah's pristine northern arm of the Great Salt Lake, precipitating excess sodium and yielding dense, bio-accessible ionic mineral brine.
              </p>
              <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                Natural mineral brine naturally self-preserves without chemical stabilizers.
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-6 space-y-4">
              <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">
                02. Bioavailable Ionic Form
              </span>
              <h3 className="text-lg font-serif font-bold text-white">
                Liquid Dissolved Ions
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Unlike synthetic mineral salts or compressed tablets that require aggressive stomach breakdown, ionic minerals are already dissolved in their electric charge states, ready for cellular osmosis and cellular transport.
              </p>
              <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                Formulated as drops for custom dilution in water or pure fruit juice.
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-6 space-y-4">
              <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">
                03. Water Remineralization
              </span>
              <h3 className="text-lg font-serif font-bold text-white">
                Restoring "Dead" Water
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Reverse-osmosis and distilled drinking water are stripped of beneficial electrolytes. Adding 20–30 drops of HCI CMD per gallon restores wholesome ionic equilibrium, improving hydration efficiency and taste.
              </p>
              <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                Groundwater and municipal drinking water enhancement.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Six Branches Overview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <span className="text-xs font-mono text-amber-400 uppercase tracking-widest">
              Local Physical Distribution
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white">
              Camarines Norte Six-Branch Network
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Serving the municipalities of Camarines Norte with localized product availability, future cash on pickup, and community wellness education.
            </p>
          </div>

          <button
            onClick={() => onNavigate('branches')}
            className="shrink-0 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-medium text-xs rounded border border-slate-700 transition"
          >
            Explore All 6 Branches →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {BRANCHES_DATA.map((branch) => (
            <div
              key={branch.id}
              className={`p-5 rounded-lg border transition-colors ${
                branch.isCentralHub
                  ? 'bg-slate-900/90 border-amber-500/50 shadow-md'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
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
                    Regional Hub
                  </span>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 space-y-2 text-xs">
                <div>
                  <span className="text-slate-400">Address Status:</span>
                  <p className="text-slate-300 text-[11px] italic mt-0.5">
                    {branch.addressNote}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Phone Status:</span>
                  <p className="text-slate-300 text-[11px] italic mt-0.5">
                    {branch.phoneNote}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-[11px]">
                <span className="text-slate-400">Planned Fulfillment:</span>
                <span className="text-slate-300 font-medium">Pickup & Local Delivery</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Product Catalog Preview */}
      <section className="bg-slate-900/40 border-y border-slate-800 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="space-y-2 text-center max-w-3xl mx-auto">
            <span className="text-xs font-mono text-amber-400 uppercase tracking-widest">
              Catalog Architecture (Phase 1 Baseline)
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white">
              Planned Commercial Presentations
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              In accordance with Phase 0 audit findings (COMP-FDA-002), specific package presentations (65 mL and 30 mL) are maintained in catalog architecture mode pending inspection of registration packaging annexes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {PRODUCTS_CATALOG.map((sku) => (
              <div
                key={sku.id}
                className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4"
              >
                <div>
                  <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">
                    {sku.nominalVolume} Dropper Presentation
                  </span>
                  <h3 className="text-lg font-serif font-bold text-white mt-1">
                    {sku.name}
                  </h3>
                </div>

                {/* Explicit Required Badge */}
                <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded text-[11px] text-amber-200">
                  <div className="font-semibold text-amber-300 uppercase tracking-wider text-[10px]">
                    Regulatory Presentation Status
                  </div>
                  <p className="mt-0.5">
                    {sku.statusDisplay}
                  </p>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {sku.description}
                </p>

                <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Packaging Type:</span>
                    <span className="text-right text-slate-200">{sku.packagingType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Retail SRP:</span>
                    <span className="font-mono text-amber-300">{sku.pricingDisplay}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => onNavigate('products')}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded transition"
                  >
                    View Formulation & Mineral Details →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance & Consumer Protection Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 sm:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <span className="text-xs font-mono text-amber-400 uppercase tracking-widest">
                Governance & E-Commerce Compliance
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">
                Committed to Full Philippine Regulatory Transparency
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                The HCI CMD Digital Commerce Platform adheres to Republic Act No. 11967 (Internet Transactions Act of 2023), Republic Act No. 9711 (FDA Act), Republic Act No. 7394 (Consumer Act), Republic Act No. 11976 (Ease of Paying Taxes Act), and Republic Act No. 10173 (Data Privacy Act).
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => onNavigate('compliance')}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded transition"
                >
                  View Compliance Transparency Center
                </button>
                <button
                  onClick={() => onNavigate('terms')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded transition"
                >
                  Terms of Service
                </button>
                <button
                  onClick={() => onNavigate('privacy')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded transition"
                >
                  Privacy Policy
                </button>
              </div>
            </div>

            <div className="lg:col-span-5">
              <BirSealBadge />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
