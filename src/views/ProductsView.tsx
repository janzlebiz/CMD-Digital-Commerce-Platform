/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PageView } from '../types';
import { PRODUCTS_CATALOG } from '../data/products';
import { STATUTORY_NOTICES } from '../data/compliance';
import { RegulatoryNotice } from '../components/ui/RegulatoryNotice';

interface ProductsViewProps {
  onNavigate: (view: PageView) => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      {/* Header */}
      <div className="space-y-3 border-b border-slate-800 pb-8">
        <div className="flex items-center gap-2 text-xs font-mono text-amber-400 uppercase tracking-widest">
          <span>Catalog Architecture & Presentation Boundaries</span>
          <span aria-hidden="true">·</span>
          <span>FR-4000008713595</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-serif font-black tracking-tight text-white">
          HCI Cell Mineral Drops Catalog
        </h1>
        <p className="text-base sm:text-lg text-slate-300 max-w-3xl leading-relaxed">
          Explore the formulation specifications, mineral profile, and upcoming commercial presentations of authentic HCI CMD ionic mineral concentrate.
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

      {/* Phase 0 Evidence Blocker Transparency Banner */}
      <RegulatoryNotice
        level="info"
        title="Phase 1 Catalog Architecture Disclosure"
        citation="COMP-FDA-002 & FAR-04"
      >
        <div className="space-y-1.5 text-xs text-slate-300 leading-relaxed">
          <p>
            <strong>Registration Verification Status:</strong> The parent product formulation <em>CELL MINERAL DROPS (IONIC MINERAL CONCENTRATE) FOOD SUPPLEMENT DROPS</em> is verified under FDA Registration <strong>FR-4000008713595</strong> to Health Code International Corp., recorded with packaging description <em>WHITE OPAQUE PLASTIC BOTTLE</em>.
          </p>
          <p>
            <strong>Packaging Annex Boundary:</strong> Under FDA CFRR procedures, commercial packaging allocations (such as 65 mL and 30 mL) are specified in the official registration certificate annex. Commercial checkout and cart ordering will unlock in Phase 2 upon formal submission and verification of the registration annex and official SRP price list.
          </p>
        </div>
      </RegulatoryNotice>

      {/* Product Presentations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {PRODUCTS_CATALOG.map((sku) => (
          <div
            key={sku.id}
            className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 space-y-6 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div>
                <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">
                  {sku.nominalVolume} Dropper Bottle Presentation
                </span>
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-white mt-1">
                  {sku.name}
                </h2>
              </div>

              {/* Status Marker */}
              <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded text-xs text-amber-200 space-y-1">
                <div className="font-mono uppercase font-bold text-[10px] text-amber-300 tracking-wider">
                  Packaging Verification Status
                </div>
                <p className="font-semibold text-amber-100">
                  {sku.statusDisplay}
                </p>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {sku.description}
              </p>

              {/* Specifications Table */}
              <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Nominal Content:</span>
                  <span className="font-mono text-slate-200 font-semibold">{sku.nominalVolume}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Packaging Format:</span>
                  <span className="text-slate-200 text-right">{sku.packagingType}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Estimated Servings:</span>
                  <span className="text-slate-200 text-right">{sku.servingsPerBottle}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Retail SRP:</span>
                  <span className="font-mono text-amber-300 font-semibold">{sku.pricingDisplay}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Parent FDA Reg.:</span>
                  <span className="font-mono text-amber-300">{sku.parentRegistrationNumber}</span>
                </div>
              </div>

              {/* Recommended Use */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded p-4 text-xs space-y-1">
                <span className="font-semibold text-amber-300 uppercase tracking-wider text-[11px] block">
                  Suggested Dietary Serving
                </span>
                <p className="text-slate-300 leading-relaxed">
                  {sku.recommendedUse}
                </p>
              </div>

              {/* Key Highlights */}
              <div className="space-y-1 text-xs text-slate-300">
                <span className="font-semibold text-slate-200 block mb-1">
                  Composition Highlights:
                </span>
                <ul className="space-y-1 list-disc list-inside text-slate-400">
                  {sku.mineralHighlights.map((highlight, idx) => (
                    <li key={idx}>{highlight}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Commercial Action Disabled in Phase 1 */}
            <div className="pt-4 border-t border-slate-800">
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded text-center text-xs text-slate-400">
                <span>Phase 1 Platform: Commercial ordering opens in Phase 2 upon business evidence verification.</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Verified Formulation Composition Table */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 sm:p-8 space-y-4">
        <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">
          Composition & Biochemical Classification
        </span>
        <h2 className="text-2xl font-serif font-bold text-white">
          Mineral Profile & Dietary Nature
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          HCI CMD is a trace mineral drops supplement. The following overview details the nutritional nature of primary constituent ions: (Provenance: GENERAL EDUCATIONAL INFORMATION)
        </p>

        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-mono text-[11px]">
              <tr>
                <th className="py-3 px-4">Component Ion</th>
                <th className="py-3 px-4">Biochemical Classification</th>
                <th className="py-3 px-4">Physiological Nutritional Function</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              <tr>
                <td className="py-3 px-4 font-semibold text-white">Ionic Magnesium</td>
                <td className="py-3 px-4 text-amber-300 font-mono">Essential Macromineral</td>
                <td className="py-3 px-4">Normal muscle function, electrolyte balance, cellular energy production.</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-white">Chloride</td>
                <td className="py-3 px-4 text-amber-300 font-mono">Major Extracellular Anion</td>
                <td className="py-3 px-4">Maintains osmotic balance and normal gastric stomach acid production.</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-white">Potassium</td>
                <td className="py-3 px-4 text-amber-300 font-mono">Essential Intracellular Cation</td>
                <td className="py-3 px-4">Supports nerve signaling, cellular water balance, and muscle contraction.</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-white">Sulfate</td>
                <td className="py-3 px-4 text-amber-300 font-mono">Dietary Mineral Anion</td>
                <td className="py-3 px-4">Assists in cellular protein structure and metabolic pathways.</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-white">Sodium (Low)</td>
                <td className="py-3 px-4 text-emerald-400 font-mono">Precipitated Out</td>
                <td className="py-3 px-4">Reduced sodium profile ensures mineral intake without excessive sodium loading. (Provenance: MANUFACTURER-PROVIDED).</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-white">Trace Elements</td>
                <td className="py-3 px-4 text-amber-300 font-mono">Full Naturally Occurring Spectrum</td>
                <td className="py-3 px-4">Boron, lithium, zinc, and co-occurring natural marine trace elements.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Directory & Inquiry CTA */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 bg-slate-900 border border-slate-800 rounded-lg">
        <div>
          <h3 className="font-serif font-bold text-white text-base">
            Looking for local product availability in Camarines Norte?
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Visit our 6-branch directory to view pickup hubs in Daet, Labo, Paracale, Jose Panganiban, Capalonga, and Sta. Elena.
          </p>
        </div>
        <button
          onClick={() => onNavigate('branches')}
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded transition"
        >
          Explore Branch Directory
        </button>
      </div>
    </div>
  );
};
