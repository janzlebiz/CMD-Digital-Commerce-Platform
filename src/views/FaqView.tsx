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
      a: 'No. HCI Cell Mineral Drops (CMD) is classified by the FDA Philippines as a dietary food supplement. It does not cure, diagnose, treat, or prevent diseases. No approved therapeutic claims.',
    },
    {
      q: 'How do I take HCI Cell Mineral Drops daily?',
      a: 'We recommend adding 5 to 10 drops per liter of drinking water for regular remineralization. For higher mineral needs, 15 to 20 drops per liter can be taken before or after physical activity, or as advised in a wellness consultation.',
    },
    {
      q: 'Can I pick up my orders at local Camarines Norte branches?',
      a: 'Yes! When placing an order online, select "Branch Pickup" and choose from Daet, Labo, Capalonga, Paracale, Jose Panganiban, or Santa Elena branches.',
    },
    {
      q: 'How is my private health consultation data protected?',
      a: 'In accordance with Republic Act No. 10173 (Data Privacy Act of 2012), all health intake forms and consultation notes are encrypted using Google Cloud Key Management Service (KMS) AES-256-GCM envelope encryption. Retail staff cannot view your clinical responses.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-extrabold text-white">Frequently Asked Questions</h1>
        <p className="text-sm text-slate-400">
          Everything you need to know about HCI CMD minerals, branch logistics, and consultation privacy.
        </p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, idx) => (
          <div
            key={idx}
            className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden transition"
          >
            <button
              onClick={() => setOpenId(openId === idx ? null : idx)}
              className="w-full p-5 text-left flex items-center justify-between gap-4"
            >
              <span className="text-sm font-bold text-slate-200">{faq.q}</span>
              {openId === idx ? (
                <ChevronUp className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
              )}
            </button>
            {openId === idx && (
              <div className="p-5 pt-0 text-xs text-slate-400 leading-relaxed border-t border-slate-800/50">
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
