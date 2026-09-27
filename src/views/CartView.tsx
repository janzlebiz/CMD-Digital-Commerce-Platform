/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PageView } from '../types';
import { CartItem } from '../hooks/useEcommerce';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag } from 'lucide-react';

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
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 bg-slate-900 text-amber-400 rounded-full flex items-center justify-center mx-auto border border-slate-800">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white">Your Shopping Cart is Empty</h2>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Explore our authentic HCI Cell Mineral Drops catalog and add items to your cart.
        </p>
        <button
          onClick={() => onNavigate('products')}
          className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition"
        >
          Browse Products
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <h1 className="text-2xl font-extrabold text-white">Shopping Cart ({cart.reduce((s, i) => s + i.quantity, 0)} items)</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {cart.map((item) => {
            const unitPrice = getSkuPrice(item.skuId);
            const is65ml = item.skuId === 'hci-cmd-65ml';
            return (
              <div
                key={item.skuId}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">
                    {is65ml ? '65 mL Flagship Bottle' : '30 mL Travel Dropper'}
                  </span>
                  <h3 className="text-sm font-bold text-white">
                    {is65ml ? 'HCI Cell Mineral Drops — 65 mL' : 'HCI Cell Mineral Drops — 30 mL'}
                  </h3>
                  <div className="text-xs text-slate-400">₱{unitPrice.toLocaleString()} each</div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg p-1">
                    <button
                      onClick={() => updateQuantity(item.skuId, item.quantity - 1)}
                      className="p-1 hover:bg-slate-800 text-slate-300 rounded"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-mono font-bold px-2 text-white">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.skuId, item.quantity + 1)}
                      className="p-1 hover:bg-slate-800 text-slate-300 rounded"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="text-right min-w-[80px]">
                    <div className="text-sm font-bold text-white">
                      ₱{(unitPrice * item.quantity).toLocaleString()}
                    </div>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.skuId)}
                    className="p-1.5 text-red-400 hover:text-red-300 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Card */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 h-fit">
          <h3 className="text-base font-bold text-white">Order Summary</h3>

          <div className="space-y-2 text-xs text-slate-300 border-b border-slate-800 pb-4">
            <div className="flex justify-between">
              <span className="text-slate-400">Subtotal</span>
              <span className="font-semibold text-white">₱{totals.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Est. Shipping</span>
              <span className="font-semibold text-white">₱{totals.shippingFee.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex justify-between text-sm font-bold text-white pt-1">
            <span>Estimated Total</span>
            <span className="text-amber-400 font-extrabold text-base">₱{totals.grandTotal.toLocaleString()}</span>
          </div>

          <button
            onClick={() => onNavigate('checkout')}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs sm:text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2"
          >
            <span>Proceed to Checkout</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
