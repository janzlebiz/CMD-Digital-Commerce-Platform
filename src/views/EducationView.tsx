/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PageView } from '../types';
import { STATUTORY_NOTICES } from '../data/compliance';
import { RegulatoryNotice } from '../components/ui/RegulatoryNotice';

interface EducationViewProps {
  onNavigate: (view: PageView) => void;
}

export const EducationView: React.FC<EducationViewProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      {/* Header */}
      <div className="space-y-3 border-b border-slate-800 pb-8">
        <div className="flex items-center gap-2 text-xs font-mono text-amber-400 uppercase tracking-widest">
          <span>Dietary Mineral Science & Safe Handling</span>
          <span aria-hidden="true">·</span>
          <span>FNRI & Codex Alimentarius Grounded</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-serif font-black tracking-tight text-white">
          Mineral Science & Dilution Guide
        </h1>
        <p className="text-base sm:text-lg text-slate-300 max-w-3xl leading-relaxed">
          Learn the physiological role of dietary electrolytes, proper daily beverage dilution, water remineralization, and critical safety boundaries.
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

      {/* Safety Alert: Strict Warning Against Ophthalmic / Eye Usage */}
      <RegulatoryNotice
        level="warning"
        title="CRITICAL SAFETY ADVISORY: NEVER USE AS EYE DROPS"
        citation="Platform Compliance Policy COMP-POL-002"
      >
        <p className="font-semibold text-rose-200 text-sm">
          DO NOT PUT HCI CELL MINERAL DROPS DIRECTLY INTO THE EYES, EARS, OR NASAL PASSAGES.
        </p>
        <p className="mt-1 text-rose-200/90 text-xs leading-relaxed">
          HCI CMD is a highly concentrated, hypertonic natural mineral brine designed exclusively for oral dilution in beverages. Instilling concentrated mineral brine into human eyes causes severe chemical irritation, burning pain, and serious corneal injury. Under no circumstances should this product be used or promoted as an eye wash or treatment for cataracts, glaucoma, pterygium, or conjunctivitis.
        </p>
      </RegulatoryNotice>

      {/* Section 1: The Biology of Dietary Electrolytes */}
      <section className="space-y-4">
        <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">
          01. Physiological Roles
        </span>
        <h2 className="text-2xl font-serif font-bold text-white">
          Electrolytes: The Spark of Cellular Metabolism
        </h2>
        <div className="text-slate-300 text-sm leading-relaxed space-y-3">
          <p>
            Electrolytes are minerals in the body that carry an electric charge. They regulate nerve transmission, maintain fluid equilibrium inside and outside cells, and support muscular contraction and relaxation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-2">
            <h3 className="font-serif font-bold text-white text-base flex items-center justify-between">
              <span>Magnesium (Mg²⁺)</span>
              <span className="text-xs font-mono text-amber-400">Essential Macromineral</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Involved as a cofactor in over 300 enzymatic reactions in human physiology. Supports normal neuromuscular function, contributes to normal energy-yielding metabolism, and assists in normal protein synthesis.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-2">
            <h3 className="font-serif font-bold text-white text-base flex items-center justify-between">
              <span>Chloride (Cl⁻) & Potassium (K⁺)</span>
              <span className="text-xs font-mono text-amber-400">Osmotic Electrolytes</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Chloride is the major extracellular anion required for normal osmotic pressure and healthy digestive gastric secretions. Potassium works synergistically with magnesium to maintain intracellular fluid volume.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-2">
            <h3 className="font-serif font-bold text-white text-base flex items-center justify-between">
              <span>Sulfate (SO₄²⁻) & Boron</span>
              <span className="text-xs font-mono text-amber-400">Trace Catalysts</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Dietary sulfur and trace elements act in cellular connective tissues and natural metabolic pathways.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-2">
            <h3 className="font-serif font-bold text-white text-base flex items-center justify-between">
              <span>Low-Sodium Profile</span>
              <span className="text-xs font-mono text-amber-400">Reduced Sodium</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Unlike ordinary table salt or unrefined sea water, excess sodium precipitates out during concentration, making this trace mineral supplement suitable for low-sodium lifestyles. (Provenance: MANUFACTURER-PROVIDED).
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: Water Dilution Protocol */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
        <div>
          <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">
            02. Beverage Enrichment
          </span>
          <h2 className="text-2xl font-serif font-bold text-white mt-1">
            Water Dilution: Supplementing Purified Water
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
            Modern commercial water treatment processes (Reverse Osmosis, Deionization, and Distillation) strip away co-occurring minerals to ensure purity. Adding mineral drops is suggested for replenishing trace elements in purified drinking water. (Provenance: DISTRIBUTOR-PROVIDED).
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="text-xs text-amber-300 font-bold uppercase tracking-wider">
            Manufacturer/Distributor Usage Guidance — not an FDA-approved dosage recommendation.
          </div>
          <h3 className="font-serif font-bold text-white text-sm">
            Suggested Dilution Ratios (Provenance: DISTRIBUTOR-PROVIDED)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-300">
            <div className="p-3 bg-slate-900/80 rounded border border-slate-800 space-y-1">
              <span className="font-bold text-white block">Per Glass (250 mL)</span>
              <p className="text-amber-400 font-mono text-sm">Suggested Dilution</p>
              <p className="text-slate-400 text-[11px]">
                Stir drops into a glass of water or beverage. (Provenance: DISTRIBUTOR-PROVIDED).
              </p>
            </div>
            <div className="p-3 bg-slate-900/80 rounded border border-slate-800 space-y-1">
              <span className="font-bold text-white block">Per Pitcher (1 Liter)</span>
              <p className="text-amber-400 font-mono text-sm">Diluted for Day</p>
              <p className="text-slate-400 text-[11px]">
                Maintains a subtle mineral profile for daytime drinking. (Provenance: DISTRIBUTOR-PROVIDED).
              </p>
            </div>
            <div className="p-3 bg-slate-900/80 rounded border border-slate-800 space-y-1">
              <span className="font-bold text-white block">Per Gallon (3.8 Liters)</span>
              <p className="text-amber-400 font-mono text-sm">Gallon Dilution</p>
              <p className="text-slate-400 text-[11px]">
                Restores trace elements in larger household water containers. (Provenance: DISTRIBUTOR-PROVIDED).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Proper Usage & Dilution Guidelines */}
      <section className="space-y-4">
        <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">
          03. Directions for Use
        </span>
        <h2 className="text-2xl font-serif font-bold text-white">
          Recommended Daily Consumption & Taste Tips
        </h2>
        <div className="text-slate-300 text-sm leading-relaxed space-y-3">
          <p>
            Because of the high concentration of natural mineral salts, consuming HCI CMD undiluted will result in an intense saline taste. <strong>Always dilute the drops in liquid.</strong>
          </p>
          <ul className="space-y-2 list-disc list-inside text-xs sm:text-sm">
            <li>
              <strong>Acclimation Phase:</strong> For first-time users, start with a few drops per glass to allow your digestive tract to adjust. (Provenance: DISTRIBUTOR-PROVIDED).
            </li>
            <li>
              <strong>Beverage Pairings:</strong> Pure calamansi juice, fresh lemon water, herbal teas, or fresh fruit smoothies naturally complement the mild mineral flavor.
            </li>
            <li>
              <strong>Culinary Use:</strong> Can be added to soups, broths, and cooking grains (rice, quinoa) to naturally enrich daily meals with trace minerals without altering saltiness.
            </li>
          </ul>
        </div>
      </section>

      {/* Section 4: Storage, Crystallization & Stability */}
      <section className="bg-slate-900/40 border border-slate-800 rounded-lg p-6 space-y-4">
        <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">
          04. Storage & Stability
        </span>
        <h2 className="text-xl font-serif font-bold text-white">
          Storage Guidelines & Natural Mineral Crystallization
        </h2>
        <div className="text-slate-300 text-xs sm:text-sm leading-relaxed space-y-3">
          <p>
            HCI CMD is a naturally concentrated mineral solution that remains chemically stable over extended periods without added preservatives. (Provenance: MANUFACTURER-PROVIDED).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded space-y-1">
              <span className="font-semibold text-white text-xs uppercase tracking-wider text-amber-300 block">
                Storage Conditions
              </span>
              <p className="text-xs text-slate-400">
                Store at room temperature not exceeding 30°C in a dry place. Keep the bottle tightly closed and away from direct sunlight. Refrigeration is not required.
              </p>
            </div>
            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded space-y-1">
              <span className="font-semibold text-white text-xs uppercase tracking-wider text-amber-300 block">
                Crystallization Around Dropper
              </span>
              <p className="text-xs text-slate-400">
                Notice white salt crystals around the cap? That is pure dried magnesium and mineral salt. It is natural proof of high mineral concentration. Simply rinse the nozzle with clean water.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Precautions & Vulnerable Demographics */}
      <section className="border border-slate-800 bg-slate-900/80 rounded-xl p-6 sm:p-8 space-y-4">
        <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">
          05. Medical Precautions
        </span>
        <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">
          Who Should Consult a Physician First?
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          While dietary minerals are essential nutrients, concentrated supplementation must be monitored for individuals with specific medical conditions:
        </p>
        <ul className="space-y-2 list-disc list-inside text-xs sm:text-sm text-slate-300">
          <li>
            <strong>Renal Impairment & Chronic Kidney Disease (CKD):</strong> The kidneys regulate mineral filtration. Individuals with kidney dysfunction must strictly consult their nephrologist before taking supplemental magnesium or potassium.
          </li>
          <li>
            <strong>Prescription Drug Interactions:</strong> High magnesium intake may interact with specific antibiotics, bisphosphonates, or calcium channel blockers. Always space mineral intake by at least 2 hours from prescription medications.
          </li>
          <li>
            <strong>Pregnancy & Lactation:</strong> Expectant and nursing mothers should consult their obstetrician before starting any new dietary supplement.
          </li>
          <li>
            <strong>Children:</strong> Formulated for adult dietary supplementation. Keep out of reach of young children.
          </li>
        </ul>

        <div className="pt-4 flex flex-wrap gap-4">
          <button
            onClick={() => onNavigate('products')}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded transition"
          >
            Review Product Catalog Architecture
          </button>
          <button
            onClick={() => onNavigate('faq')}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded transition"
          >
            Browse Usage FAQs
          </button>
        </div>
      </section>
    </div>
  );
};
