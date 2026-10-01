/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PageView } from '../types';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

export const FaqView: React.FC<{ onNavigate: (view: PageView) => void }> = ({ onNavigate }) => {
  const [openId, setOpenId] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Is HCI CMD a medicine or prescription drug?',
      a: 'No. HCI Cell Mineral Drops (CMD) is classified by the FDA Philippines as a dietary food supplement. It does not cure, diagnose, treat, or prevent medical diseases. No approved therapeutic claims.',
    },
    {
      q: 'How do I take HCI Cell Mineral Drops daily?',
      a: 'We recommend adding 5 to 10 drops per liter of drinking water for regular remineralization and electrolyte balance. For higher mineral replenishment needs, 15 to 20 drops per liter can be taken before or after physical activity, or as advised in a certified naturopathic consultation.',
    },
    {
      q: 'Can I pick up my orders at local Camarines Norte branches?',
      a: 'Yes! When placing an order online, select "Branch Direct Pickup" and choose from Daet, Labo, Capalonga, Paracale, Jose Panganiban, or Santa Elena branch hubs.',
    },
    {
      q: 'How is my private health consultation data protected?',
      a: 'In accordance with Republic Act No. 10173 (Data Privacy Act of 2012), all health intake forms and consultation notes are encrypted using Google Cloud Key Management Service (KMS) AES-256-GCM envelope encryption. Retail staff cannot view your clinical health responses.',
    },
    {
      q: 'What are the return and refund policies under Philippine Law?',
      a: 'In accordance with RA 7394 (Consumer Act of the Philippines) and RA 11967 (Internet Transactions Act), damaged or defective bottles with intact lot identifiers are eligible for replacement or 100% refund within statutory resolution timeframes.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 text-xs font-bold tracking-wide">
          <HelpCircle className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          <span>Knowledge & Inquiries</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Frequently Asked Questions
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
          Everything you need to know about authentic HCI CMD minerals, branch logistics, and consultation privacy.
        </p>
      </div>

      <div className="space-y-3.5">
        {faqs.map((faq, idx) => (
          <div
            key={idx}
            className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs transition-all"
          >
            <button
              onClick={() => setOpenId(openId === idx ? null : idx)}
              className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
            >
              <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">{faq.q}</span>
              {openId === idx ? (
                <ChevronUp className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              )}
            </button>
            {openId === idx && (
              <div className="p-5 pt-0 text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800">
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
