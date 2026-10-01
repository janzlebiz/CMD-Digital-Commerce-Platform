/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PageView } from '../types';
import { HciCmdBottles } from '../components/common/HciCmdBottles';
import { ShoppingCart, Check, ShieldCheck, Sparkles, Droplets, MapPin, Award } from 'lucide-react';

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
      servings: '1,080 drops (45–60 day family supply)',
      price: 1200,
      variant: 'bottle-65ml' as const,
      image: '/CMD_65ml_product_transparent.webp',
      fallbackImage: '/CMD_65ml_product.webp',
      tagline: 'Standard complete cellular ionic mineral & electrolyte supply',
      description: 'Our authentic flagship bottle. High-concentration ionic trace minerals extracted naturally via 2-year solar concentration from the Great Salt Lake, Utah, USA. Ideal for households, families, and daily wellness hydration routines.',
      highlights: [
        '72+ Bioavailable Ionic Trace Minerals',
        'Full 1,080 concentrated drops per bottle',
        'Tamper-evident holographic safety band & seal',
        'FDA Philippines Registered Food Supplement',
        'From Great Salt Lake, Utah • Product of USA',
      ],
      badge: 'Flagship Edition • 1,080 Drops',
      badgeColor: 'sky',
    },
    {
      skuId: 'hci-cmd-30ml',
      name: 'HCI Cell Mineral Drops (CMD) — 30 mL Compact Dropper',
      volume: '30 mL',
      servings: '500 drops (20–30 day supply)',
      price: 650,
      variant: 'bottle-30ml' as const,
      image: '/CMD_30ml_product_transparent.webp',
      fallbackImage: '/CMD_30ml_product.webp',
      tagline: 'Pocket-sized travel dropper for on-the-go electrolyte balance',
      description: 'Compact and convenient travel size. Perfect for keeping in your bag, car, or office desk for instant drinking water remineralization wherever you travel in Camarines Norte.',
      highlights: [
        'Convenient portable pocket-sized travel dropper',
        'Full 500 concentrated drops per bottle',
        'Tamper-evident safety seal with batch verification',
        'Instant mineral electrolyte hydration anywhere',
        'From Great Salt Lake, Utah • Product of USA',
      ],
      badge: 'Travel Edition • 500 Drops',
      badgeColor: 'emerald',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 text-xs font-bold tracking-wide">
          <Sparkles className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          <span>Authentic Camarines Norte Authorized Distribution</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          HCI Cell Mineral Drops Catalog
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Select from our authentic flagship and travel bottles. Sourced directly from Utah’s Great Salt Lake, backed by tamper-evident seals and same-day municipal branch pickup.
        </p>
      </div>

      {/* Product Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {products.map((prod) => (
          <div
            key={prod.skuId}
            className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-sm hover:border-sky-500/50 hover:shadow-xl transition-all"
          >
            <div className="space-y-6">
              {/* Product Visual Area */}
              <div
                className="relative w-full h-[280px] rounded-[16px] p-6 border border-sky-100/80 dark:border-slate-800 flex flex-col items-center justify-center overflow-hidden group shadow-inner transition-all bg-[linear-gradient(135deg,#f8fcff_0%,#eef8ff_50%,#ffffff_100%)] dark:bg-[linear-gradient(135deg,#0f172a_0%,#020617_50%,#082f49_100%)]"
                style={{
                  borderRadius: '16px',
                  padding: '24px',
                }}
              >
                {prod.image ? (
                  <div className="relative w-full h-full flex flex-col items-center justify-center">
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="w-full h-[230px] object-contain bg-transparent drop-shadow-[0_14px_22px_rgba(0,0,0,0.14)] dark:drop-shadow-[0_16px_32px_rgba(0,0,0,0.55)] select-none transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        if (prod.fallbackImage) {
                          (e.target as HTMLImageElement).src = prod.fallbackImage;
                        }
                      }}
                      referrerPolicy="no-referrer"
                    />
                    {/* Floor Contact Grounding Shadow */}
                    <div className="w-28 sm:w-36 h-2.5 rounded-full bg-slate-900/20 dark:bg-slate-950/70 blur-sm -mt-1 pointer-events-none transition-all duration-300 group-hover:w-32 sm:group-hover:w-40 group-hover:bg-slate-900/30" />
                  </div>
                ) : (
                  <HciCmdBottles variant={prod.variant} className="h-full" />
                )}

                <div className="absolute top-3 left-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 text-xs font-bold px-3 py-1 rounded-lg shadow-sm">
                  {prod.badge}
                </div>

                <div className="absolute bottom-3 right-3 text-[11px] bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 font-mono font-bold px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 shadow-xs">
                  {prod.servings}
                </div>
              </div>

              {/* Title & Pricing */}
              <div className="space-y-2">
                <div className="flex justify-between items-baseline gap-2">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">
                    {prod.name}
                  </h3>
                  <span className="text-2xl font-black text-sky-700 dark:text-sky-400 tabular-nums shrink-0">
                    ₱{prod.price.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs font-semibold text-sky-700 dark:text-sky-400">{prod.tagline}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{prod.description}</p>
              </div>

              {/* Highlights */}
              <div className="pt-4 space-y-2.5 border-t border-slate-100 dark:border-slate-800">
                {prod.highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              <button
                onClick={() => {
                  addToCart(prod.skuId, 1);
                  onNavigate('cart');
                }}
                className="flex-1 py-3.5 bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer transform hover:-translate-y-0.5"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Add to Cart & Checkout</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Safety & Authenticity Notice */}
      <div className="rounded-2xl bg-sky-50 dark:bg-slate-900/60 border border-sky-200 dark:border-slate-800 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-700 dark:text-slate-300">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-6 h-6 text-sky-700 dark:text-sky-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="text-slate-900 dark:text-white block font-bold text-sm">
              100% Genuine Great Salt Lake Solar-Extracted Ionic Formula
            </strong>
            <span>
              Every bottle distributed through this platform features a registered QR verification code, tamper-evident safety seal, and lot expiration tracking verified under FDA Philippines food supplement standards.
            </span>
          </div>
        </div>

        <button
          onClick={() => onNavigate('branches')}
          className="px-4 py-2 bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 font-bold text-xs rounded-xl border border-sky-300 dark:border-slate-700 shrink-0 hover:bg-sky-50 dark:hover:bg-slate-700 transition"
        >
          Locate Branch Pick-Up
        </button>
      </div>
    </div>
  );
};
