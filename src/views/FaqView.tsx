/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PageView } from '../types';
import { FAQ_ITEMS } from '../data/faq';
import { STATUTORY_NOTICES } from '../data/compliance';
import { RegulatoryNotice } from '../components/ui/RegulatoryNotice';

interface FaqViewProps {
  onNavigate: (view: PageView) => void;
}

export const FaqView: React.FC<FaqViewProps> = ({ onNavigate }) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(FAQ_ITEMS[0].id);

  const categories = [
    { id: 'all', label: 'All Questions' },
    { id: 'regulatory', label: 'Regulatory & FDA' },
    { id: 'usage', label: 'Usage & Dilution' },
    { id: 'safety', label: 'Safety & Boundaries' },
    { id: 'branches', label: 'Branches & Availability' },
    { id: 'authenticity', label: 'Authenticity & Seals' },
  ];

  const filteredFaqs = FAQ_ITEMS.filter((item) => {
    const matchesCategory =
      activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      {/* Header */}
      <div className="space-y-3 border-b border-slate-800 pb-8">
        <div className="flex items-center gap-2 text-xs font-mono text-amber-400 uppercase tracking-widest">
          <span>Consumer Guidance & Common Questions</span>
          <span aria-hidden="true">·</span>
          <span>Verified Compliance Guidance</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-serif font-black tracking-tight text-white">
          Frequently Asked Questions
        </h1>
        <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
          Clear, evidence-backed answers regarding product classification, safe usage, water remineralization, and Camarines Norte distribution.
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

      {/* Search Input & Category Filters */}
      <div className="space-y-4">
        <div>
          <label htmlFor="faq-search" className="sr-only">
            Search Frequently Asked Questions
          </label>
          <input
            id="faq-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions by keyword (e.g., eye drops, water dilution, FDA, branches)..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:border-amber-400 transition"
          />
        </div>

        {/* Filter Buttons (Compliant with Zero-Pill Discipline) */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-900/80 rounded border border-slate-800">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400 ${
                activeCategory === cat.id
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* FAQ Accordion List */}
      <div className="space-y-3">
        {filteredFaqs.length === 0 ? (
          <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-lg space-y-2">
            <p className="text-slate-300 text-sm">No questions matched your search query.</p>
            <button
              onClick={() => {
                setActiveCategory('all');
                setSearchQuery('');
              }}
              className="text-xs text-amber-400 underline"
            >
              Clear filters and search
            </button>
          </div>
        ) : (
          filteredFaqs.map((faq) => {
            const isExpanded = expandedId === faq.id;
            return (
              <div
                key={faq.id}
                className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden transition"
              >
                <button
                  onClick={() => toggleExpand(faq.id)}
                  className="w-full text-left p-5 flex items-center justify-between gap-4 hover:bg-slate-850 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  aria-expanded={isExpanded}
                >
                  <span className="font-serif font-bold text-white text-base leading-snug">
                    {faq.question}
                  </span>
                  <span className="text-slate-400 font-mono text-lg shrink-0">
                    {isExpanded ? '−' : '+'}
                  </span>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 border-t border-slate-800/80 space-y-3">
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {faq.answer}
                    </p>
                    {faq.regulatoryAnchor && (
                      <div className="text-[11px] font-mono text-amber-400/90 pt-1">
                        Regulatory Anchor: {faq.regulatoryAnchor}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Still Have Questions Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 sm:p-8 space-y-4">
        <h3 className="font-serif font-bold text-white text-lg">
          Have an unaddressed question or need branch assistance?
        </h3>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          Our compliance and regional support team is available to assist with product inquiries, dietary guidelines, and branch logistics.
        </p>
        <button
          onClick={() => onNavigate('contact')}
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded transition"
        >
          Contact Regional Support →
        </button>
      </div>
    </div>
  );
};
