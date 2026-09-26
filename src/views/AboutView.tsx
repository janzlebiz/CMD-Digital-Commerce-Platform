/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PageView } from '../types';
import { STATUTORY_NOTICES } from '../data/compliance';
import { RegulatoryNotice } from '../components/ui/RegulatoryNotice';

interface AboutViewProps {
  onNavigate: (view: PageView) => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      {/* Page Header */}
      <div className="space-y-3 border-b border-slate-800 pb-8">
        <div className="flex items-center gap-2 text-xs font-mono text-amber-400 uppercase tracking-widest">
          <span>Brand Heritage & Entity Disclosure</span>
          <span aria-hidden="true">·</span>
          <span>FR-4000008713595</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-serif font-black tracking-tight text-white">
          About HCI Cell Mineral Drops (CMD)
        </h1>
        <p className="text-base sm:text-lg text-slate-300 max-w-3xl leading-relaxed">
          The story of natural solar concentration from Utah's inland sea to independent community distribution across the province of Camarines Norte, Philippines.
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

      {/* Section 1: The Great Salt Lake Origin */}
      <section className="space-y-4">
        <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">
          01. Geographic Origin & Solar Concentration
        </span>
        <h2 className="text-2xl font-serif font-bold text-white">
          Nature's Ancient Inland Sea: The Great Salt Lake, Utah
        </h2>
        <div className="prose prose-invert text-slate-300 text-sm leading-relaxed space-y-3 max-w-none">
          <p>
            The Great Salt Lake in Utah, United States, is an ancient terminal drainage basin fed by multiple mountain rivers. Because it has no outlet other than evaporation, minerals deposited over millennia have gathered in high concentrations.
          </p>
          <p>
            Through a multi-stage solar evaporation process, water is naturally evaporated using sun and wind. During this controlled evaporation, sodium chloride precipitates out as solid crystals. The remaining liquid is an ultra-dense, low-sodium mineral solution, rich in dissolved magnesium, chloride, potassium, and natural trace elements. (Provenance: MANUFACTURER-PROVIDED).
          </p>
          <p>
            Because of its high ionic density and concentrated saline composition, the drops require no artificial chemical preservatives or synthetic coloring. (Provenance: MANUFACTURER-PROVIDED).
          </p>
        </div>
      </section>

      {/* Section 2: Bioavailable Ionic Minerals */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 sm:p-8 space-y-4">
        <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">
          02. Biochemical Nature
        </span>
        <h2 className="text-2xl font-serif font-bold text-white">
          Why "Ionic" Minerals?
        </h2>
        <div className="text-slate-300 text-sm leading-relaxed space-y-3">
          <p>
            An "ion" is an atom or molecule that has acquired a positive or electrical charge by losing or gaining electrons. In living biology, cells do not ingest solid rocks or synthetic mineral compounds directly—they absorb water-soluble, dissolved mineral ions through microscopic cellular membranes and ion channels.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded">
              <h3 className="font-semibold text-white text-xs uppercase tracking-wider text-amber-300">
                Soluble & Liquid Form
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Because HCI CMD is an aqueous liquid concentrate, its minerals are already dissolved into their bioavailable ionic states, bypassing the arduous digestive breakdown required by chalky pills or tablets.
              </p>
            </div>
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded">
              <h3 className="font-semibold text-white text-xs uppercase tracking-wider text-amber-300">
                Electrolyte Synergy
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Magnesium, potassium, and chloride work together in physiological harmony. A balanced spectrum of trace minerals supports normal cellular hydration, nerve transmission, and muscular relaxation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Registered Registrant & Product Details */}
      <section className="space-y-4">
        <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">
          03. Registrant & Governance
        </span>
        <h2 className="text-2xl font-serif font-bold text-white">
          Health Code International Corporation
        </h2>
        <div className="text-slate-300 text-sm leading-relaxed space-y-3">
          <p>
            The national product registration for HCI CMD is held by <strong>HEALTH CODE INTERNATIONAL CORPORATION</strong>, the verified registrant company recorded in the official Food and Drug Administration (FDA) Philippines database under Registration Number <strong>FR-4000008713595</strong>.
          </p>
          <p>
            The product is registered under the formal name <em>CELL MINERAL DROPS (IONIC MINERAL CONCENTRATE) FOOD SUPPLEMENT DROPS</em>, categorized as a Medium Risk Food Supplement (Processed Food Product).
          </p>
        </div>

        <div className="border border-slate-800 bg-slate-900 rounded-lg p-5">
          <h3 className="text-xs font-mono uppercase tracking-wider text-amber-300 font-semibold mb-3">
            Regulatory Record Summary
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400">Registration Number:</span>{' '}
              <span className="font-mono text-amber-300 font-bold">FR-4000008713595</span>
            </div>
            <div>
              <span className="text-slate-400">Registrant Entity:</span>{' '}
              <span className="text-slate-200">Health Code International Corporation</span>
            </div>
            <div>
              <span className="text-slate-400">Packaging Recorded:</span>{' '}
              <span className="text-slate-200">WHITE OPAQUE PLASTIC BOTTLE</span>
            </div>
            <div>
              <span className="text-slate-400">Validity Period:</span>{' '}
              <span className="text-slate-200">26 May 2023 – 18 March 2028</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Camarines Norte Network & Ethical Marketing Pledge */}
      <section className="space-y-4">
        <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">
          04. Regional Presence & Ethical Pledge
        </span>
        <h2 className="text-2xl font-serif font-bold text-white">
          Camarines Norte Distribution Network & Our Ethical Pledge
        </h2>
        <div className="text-slate-300 text-sm leading-relaxed space-y-3">
          <p>
            Operating across six municipalities—<strong>Daet, Labo, Paracale, Jose Panganiban, Capalonga, and Sta. Elena</strong>—our mission is to provide truthful, accessible education on daily mineral hydration without resort to false medical claims or deceptive advertising.
          </p>
        </div>

        <div className="bg-amber-950/20 border border-amber-900/40 rounded-lg p-6 space-y-3 text-xs sm:text-sm text-slate-300">
          <h3 className="font-serif font-bold text-amber-300 text-base">
            Our Non-Negotiable Compliance Pledge:
          </h3>
          <ul className="space-y-2 list-disc list-inside">
            <li>
              <strong>No Disease Cures:</strong> We will never claim that HCI CMD diagnoses, cures, prevents, or treats any disease, including diabetes, hypertension, cancer, or kidney failure.
            </li>
            <li>
              <strong>No Ophthalmic / Eye Usage:</strong> We strictly prohibit and actively warn against applying mineral drops into eyes or mucous membranes. Hypertonic mineral drops belong strictly in diluted drinking water.
            </li>
            <li>
              <strong>No Medical Substitution:</strong> We will never instruct or advise any customer to abandon prescription medications or forgo licensed physician care.
            </li>
            <li>
              <strong>Consumer Act Compliance:</strong> We adhere fully to RA 7394 (Consumer Act) and RA 11967 (Internet Transactions Act) in all commercial presentations.
            </li>
          </ul>
        </div>

        <div className="pt-4 flex flex-wrap gap-4">
          <button
            onClick={() => onNavigate('compliance')}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded transition"
          >
            Review 5-Tier Claims Policy
          </button>
          <button
            onClick={() => onNavigate('branches')}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded transition"
          >
            View Six Branch Profiles
          </button>
        </div>
      </section>
    </div>
  );
};
