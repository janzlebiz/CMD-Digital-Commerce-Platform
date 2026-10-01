/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PageView } from '../types';
import { CartItem } from '../hooks/useEcommerce';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, ShieldCheck } from 'lucide-react';

interface CartViewProps {
  cart: CartItem[];
  onNavigate: (view: PageView) => void;
  getSkuPrice: (skuId: string) => number;
  updateQuantity: (skuId: string, qty: number) => void;
  removeFromCart: (skuId: string) => void;
  calculateTotals: (items: CartItem[]) => { subtotal: number; shippingFee: number; taxAmount: number; grandTotal: number };
}

export const CartView: React.FC<CartViewProps> = ({
  cart,
  onNavigate,
  getSkuPrice,
  updateQuantity,
  removeFromCart,
  calculateTotals,
}) => {
  const totals = calculateTotals(cart);

  if (cart.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-5">
        <div className="w-16 h-16 bg-sky-50 dark:bg-slate-900 text-sky-600 dark:text-sky-400 rounded-2xl flex items-center justify-center mx-auto border border-sky-100 dark:border-slate-800 shadow-xs">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Your Shopping Cart is Empty</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
          Explore our authentic HCI Cell Mineral Drops catalog and add items to your cart for direct branch pickup or doorstep delivery.
        </p>
        <button
          onClick={() => onNavigate('products')}
          className="px-6 py-3 bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 font-bold text-sm rounded-xl shadow-xs transition cursor-pointer"
        >
          Browse Product Catalog
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
          Shopping Cart ({cart.reduce((s, i) => s + i.quantity, 0)} items)
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">Review your selected items before proceeding to secure checkout.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {cart.map((item) => {
            const unitPrice = getSkuPrice(item.skuId);
            const is65ml = item.skuId === 'hci-cmd-65ml';
            return (
              <div
                key={item.skuId}
                className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs transition-all"
              >
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wide">
                    {is65ml ? '65 mL Flagship Bottle' : '30 mL Travel Dropper'}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {is65ml ? 'HCI Cell Mineral Drops — 65 mL' : 'HCI Cell Mineral Drops — 30 mL'}
                  </h3>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    ₱{unitPrice.toLocaleString()} each
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                  {/* Stepper */}
                  <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-1">
                    <button
                      onClick={() => updateQuantity(item.skuId, item.quantity - 1)}
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded cursor-pointer transition"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm font-mono font-bold px-3 text-slate-900 dark:text-white tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.skuId, item.quantity + 1)}
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded cursor-pointer transition"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Line Total */}
                  <div className="text-right min-w-[90px]">
                    <div className="text-base font-bold text-slate-900 dark:text-white tabular-nums">
                      ₱{(unitPrice * item.quantity).toLocaleString()}
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeFromCart(item.skuId)}
                    className="p-2 text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition cursor-pointer"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order Summary Column */}
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Order Summary</h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Items Subtotal</span>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                  ₱{totals.subtotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Shipping Fee</span>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                  {totals.shippingFee === 0 ? 'FREE' : `₱${totals.shippingFee.toLocaleString()}`}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Statutory VAT (12% Included)</span>
                <span className="font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                  ₱{totals.taxAmount.toLocaleString()}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between text-base font-extrabold text-slate-900 dark:text-white">
                <span>Grand Total</span>
                <span className="text-xl text-sky-700 dark:text-sky-400 tabular-nums">
                  ₱{totals.grandTotal.toLocaleString()}
                </span>
              </div>
            </div>

            <button
              onClick={() => onNavigate('checkout')}
              className="w-full py-3.5 bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 font-bold text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 rounded-xl bg-sky-50 dark:bg-slate-900/60 border border-sky-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-sky-700 dark:text-sky-400 shrink-0 mt-0.5" />
            <span>Secure Cash on Delivery & Branch Pickup supported with full buyer protection (RA 7394 & RA 11967).</span>
          </div>
        </div>
      </div>
    </div>
  );
};
