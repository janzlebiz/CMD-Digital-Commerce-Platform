/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PageView, CartItem } from '../types';
import { PRODUCTS_CATALOG } from '../data/products';
import { RegulatoryNotice } from '../components/ui/RegulatoryNotice';
import { STATUTORY_NOTICES } from '../data/compliance';
import { Trash2, ShoppingBag, ArrowRight, RefreshCw, Settings } from 'lucide-react';

interface CartViewProps {
  cart: CartItem[];
  onNavigate: (view: PageView) => void;
  updateCartQuantity: (skuId: string, quantity: number) => void;
  removeFromCart: (skuId: string) => void;
  getSkuPrice: (skuId: string) => number;
  getStockLevel: (skuId: string) => number;
  vatConfig: { isVatRegistered: boolean; vatRatePercent: number };
  setVatConfig: React.Dispatch<React.SetStateAction<any>>;
}

export const CartView: React.FC<CartViewProps> = ({
  cart,
  onNavigate,
  updateCartQuantity,
  removeFromCart,
  getSkuPrice,
  getStockLevel,
  vatConfig,
  setVatConfig,
}) => {
  const isCartEmpty = cart.length === 0;

  // Compute pricing totals for preview (assuming default fulfillment method is pickup in cart view)
  let subtotal = 0;
  const itemsWithPricing = cart.map((item) => {
    const sku = PRODUCTS_CATALOG.find((s) => s.id === item.skuId);
    const unitPrice = getSkuPrice(item.skuId);
    const total = unitPrice * item.quantity;
    subtotal += total;
    return {
      sku,
      item,
      unitPrice,
      total,
    };
  });

  // Calculate tax preview
  let vatableSales = 0;
  let vatAmount = 0;
  let nonVatSales = 0;

  if (vatConfig.isVatRegistered) {
    vatableSales = subtotal / (1 + vatConfig.vatRatePercent / 100);
    vatAmount = subtotal - vatableSales;
  } else {
    nonVatSales = subtotal;
  }

  const handleQtyChange = (skuId: string, newQty: number) => {
    updateCartQuantity(skuId, newQty);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
      {/* Header */}
      <div className="space-y-2 border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400 uppercase tracking-widest">
            <span>Stage 1 — Shopping Cart</span>
            <span aria-hidden="true">·</span>
            <span>E-Commerce Foundation</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-black text-white mt-1">
            Your Shopping Cart
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onNavigate('products')}
            className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded text-xs transition"
          >
            ← Continue Shopping
          </button>
          {!isCartEmpty && (
            <button
              onClick={() => onNavigate('checkout')}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded shadow transition flex items-center gap-1.5"
            >
              Proceed to Checkout <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Mandatory Statutory Advisory */}
      <RegulatoryNotice level="statutory" title="Mandatory Food Supplement Notice" citation="FDA Circular No. 2015-003">
        <p className="font-semibold text-amber-200">
          {STATUTORY_NOTICES.FILIPINO_WARNING}
        </p>
        <p className="text-xs text-amber-300/80 mt-1 uppercase tracking-wider font-bold">
          {STATUTORY_NOTICES.ENGLISH_DISCLAIMER}
        </p>
      </RegulatoryNotice>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Cart Items Column (Left) */}
        <div className="lg:col-span-8 space-y-4">
          {isCartEmpty ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center space-y-4">
              <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto" />
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-lg text-white">Your cart is empty</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Select authentic HCI Cell Mineral Drops presentations from our certified product catalog.
                </p>
              </div>
              <button
                onClick={() => onNavigate('products')}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded transition"
              >
                Browse Product Catalog
              </button>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800">
              <div className="p-4 bg-slate-950 text-slate-400 font-mono text-[10px] uppercase tracking-wider grid grid-cols-12 gap-2">
                <div className="col-span-6">SKU Description</div>
                <div className="col-span-2 text-center">Unit Price</div>
                <div className="col-span-2 text-center">Quantity</div>
                <div className="col-span-2 text-right">Subtotal</div>
              </div>

              {itemsWithPricing.map(({ sku, item, unitPrice, total }) => {
                if (!sku) return null;
                const stock = getStockLevel(item.skuId);
                return (
                  <div key={item.skuId} className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    {/* Item details */}
                    <div className="col-span-12 md:col-span-6 space-y-1">
                      <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">
                        {sku.nominalVolume} Dropper Bottle presentation
                      </span>
                      <h3 className="font-serif font-bold text-base text-white">{sku.name}</h3>
                      <p className="text-xs text-slate-400 line-clamp-1">{sku.description}</p>
                      
                      {/* Simulated stock level alert */}
                      <div className="pt-1.5 flex items-center gap-1.5 text-[11px]">
                        <span className="text-slate-500">Simulated Stock Availability:</span>
                        {stock === 0 ? (
                          <span className="text-red-400 font-bold">Out of Stock</span>
                        ) : stock <= 5 ? (
                          <span className="text-amber-400 font-semibold">Low Stock ({stock} left)</span>
                        ) : (
                          <span className="text-emerald-400 font-semibold">{stock} available</span>
                        )}
                      </div>
                    </div>

                    {/* Unit price */}
                    <div className="col-span-4 md:col-span-2 text-left md:text-center">
                      <span className="text-slate-400 text-[10px] uppercase font-mono block md:hidden">Unit Price</span>
                      <span className="font-mono text-slate-200">₱{unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>

                    {/* Quantity Selector */}
                    <div className="col-span-4 md:col-span-2 flex justify-start md:justify-center items-center">
                      <div className="flex items-center bg-slate-950 rounded border border-slate-800">
                        <button
                          onClick={() => handleQtyChange(item.skuId, item.quantity - 1)}
                          className="px-2 py-1 text-slate-400 hover:text-white transition"
                          aria-label="Decrease quantity"
                        >
                          -
                        </button>
                        <span className="px-3 py-1 font-mono text-xs text-slate-100">{item.quantity}</span>
                        <button
                          onClick={() => handleQtyChange(item.skuId, item.quantity + 1)}
                          disabled={item.quantity >= stock}
                          className="px-2 py-1 text-slate-400 hover:text-white disabled:opacity-30 transition"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Item subtotal & delete */}
                    <div className="col-span-4 md:col-span-2 text-right flex items-center justify-between md:justify-end gap-3">
                      <div className="text-right">
                        <span className="text-slate-400 text-[10px] uppercase font-mono block md:hidden">Subtotal</span>
                        <span className="font-mono text-amber-300 font-bold">
                          ₱{total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.skuId)}
                        className="p-1.5 bg-slate-950 border border-slate-800 hover:border-red-900/60 hover:text-red-400 text-slate-400 rounded transition"
                        title="Remove product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pricing Summary & Auditing Dashboard (Right) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Order Summary Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
            <h3 className="text-lg font-serif font-bold text-white border-b border-slate-800 pb-3">
              Fulfillment Summary
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Items Subtotal:</span>
                <span className="font-mono text-slate-200">₱{subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              
              {/* VAT calculations */}
              {vatConfig.isVatRegistered ? (
                <>
                  <div className="flex justify-between text-slate-500">
                    <span>VATable Sales (12% inclusive):</span>
                    <span className="font-mono">₱{vatableSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Value-Added Tax (12%):</span>
                    <span className="font-mono">₱{vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-slate-500">
                    <span>Non-VAT Sales:</span>
                    <span className="font-mono">₱{nonVatSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400/80">
                    <span>Value-Added Tax (0%):</span>
                    <span>Non-VAT Registered — Non-VAT treatment</span>
                  </div>
                </>
              )}

              <div className="flex justify-between text-slate-400 pt-2 border-t border-slate-800/80">
                <span>Fulfillment Dispatch:</span>
                <span className="text-slate-300 italic">Calculated at Checkout</span>
              </div>
            </div>

            {/* Total Indicator */}
            <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
              <span className="text-sm font-serif font-semibold text-white">Estimated Subtotal:</span>
              <div className="text-right">
                <div className="text-2xl font-mono text-amber-400 font-bold">
                  ₱{subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[9px] text-slate-500 font-mono tracking-wider block uppercase">
                  Subject to checkout parameters
                </span>
              </div>
            </div>

            {/* Price Testing Notice */}
            <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded text-[11px] text-slate-400 leading-relaxed space-y-1">
              <span className="font-semibold text-amber-300 uppercase tracking-wider text-[9px] block">
                Testing Valuation Disclosure
              </span>
              <p>
                All prices are based on default test SRP values. Final price schedules are <strong>subject to business evidence confirmation (FAR-06)</strong>.
              </p>
            </div>

            <button
              onClick={() => onNavigate('checkout')}
              disabled={isCartEmpty}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 disabled:opacity-40 text-slate-950 font-bold text-xs rounded transition flex items-center justify-center gap-2"
            >
              Proceed to Checkout <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Audit Configurator (Directly accessible to verify compliance controls) */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-800/80">
              <Settings className="w-3.5 h-3.5 text-amber-500" />
              <span>Interactive Compliance Auditor</span>
            </div>
            
            {/* VAT Configurator Toggle */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300 font-medium">VAT Registration Status</span>
                <span className="text-[10px] font-mono text-amber-400 uppercase">
                  {vatConfig.isVatRegistered ? 'VAT Registered' : 'Non-VAT Registered — Non-VAT treatment'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Toggling this simulates the business entity status to verify the correctness of the tax calculation engine and invoice layout.
              </p>
              
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => setVatConfig({ ...vatConfig, isVatRegistered: true })}
                  className={`py-1.5 px-3 text-xs font-medium rounded transition ${
                    vatConfig.isVatRegistered
                      ? 'bg-amber-500/10 border border-amber-500 text-amber-300'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  VAT (12% Inclusive)
                </button>
                <button
                  onClick={() => setVatConfig({ ...vatConfig, isVatRegistered: false })}
                  className={`py-1.5 px-3 text-xs font-medium rounded transition ${
                    !vatConfig.isVatRegistered
                      ? 'bg-amber-500/10 border border-amber-500 text-amber-300'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Non-VAT Registered — Non-VAT treatment
                </button>
              </div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800/80 rounded text-[10px] text-slate-400">
              <span className="text-amber-400 font-mono font-semibold block mb-0.5">VAT CONFIGURATION STATE:</span>
              <span>isVatRegistered: <strong>{vatConfig.isVatRegistered.toString()}</strong></span>
              <br />
              <span>vatRatePercent: <strong>{vatConfig.vatRatePercent}%</strong></span>
              <br />
              <span className="text-amber-300 font-semibold block mt-1">VAT vs. Non-VAT classification = BUSINESS CONFIRMATION REQUIRED</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
