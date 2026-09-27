/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PageView } from '../types';
import { useEcommerce } from '../hooks/useEcommerce';
import { Droplet, ShoppingCart, ShieldCheck, Check, Sparkles } from 'lucide-react';

interface ProductsViewProps {
  onNavigate: (view: PageView) => void;
  addToCart: (skuId: string, quantity?: number) => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({ onNavigate, addToCart }) => {
  const products = [
    {
      skuId: 'hci-cmd-65ml',
      name: 'HCI Cell Mineral Drops (CMD) — 65 mL Flagship Bottle',
      volume: '65 mL',
      price: 1200,
      tagline: 'Standard 45–60 day complete cellular mineral supply',
      description: 'Our most popular flagship bottle. High-concentration ionic trace minerals extracted naturally via solar concentration. Ideal for households and daily wellness routines.',
      highlights: ['72+ Ionic Trace Minerals', 'Approx. 960 drops per bottle', 'Glass dropper with tamper-evident seal'],
    },
    {
      skuId: 'hci-cmd-30ml',
      name: 'HCI Cell Mineral Drops (CMD) — 30 mL Compact Dropper',
      volume: '30 mL',
      price: 650,
      tagline: 'Pocket-sized travel dropper for on-the-go hydration',
      description: 'Compact and convenient. Perfect for keeping in your pocket, bag, or office desk for instant drinking water remineralization anywhere.',
      highlights: ['Convenient travel size', 'Approx. 450 drops per bottle', 'FDA Registered dietary food supplement'],
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="text-center space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Authentic HCI Cell Mineral Drops Catalog
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl mx-auto">
          Choose from our authentic flagship and travel bottles. Backed by tamper-evident holographic seals and real-time branch pickup in Camarines Norte.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {products.map((prod) => (
          <div
            key={prod.skuId}
            className="rounded-2xl bg-slate-900 border border-slate-800 p-6 sm:p-8 flex flex-col justify-between space-y-6 hover:border-amber-500/50 transition"
          >
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                  {prod.volume}
                </span>
                <span className="text-xl font-black text-white">₱{prod.price.toLocaleString()}</span>
              </div>

              <h3 className="text-xl font-bold text-white">{prod.name}</h3>
              <p className="text-xs font-semibold text-amber-300">{prod.tagline}</p>
              <p className="text-xs text-slate-400 leading-relaxed">{prod.description}</p>

              <div className="pt-2 space-y-2 border-t border-slate-800">
                {prod.highlights.map((h, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button
                onClick={() => {
                  addToCart(prod.skuId, 1);
                  onNavigate('cart');
                }}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Add to Cart & Checkout</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
