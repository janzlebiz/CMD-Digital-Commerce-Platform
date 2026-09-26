/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { PageView, CartItem, Order, CustomerInfo, PaymentMethod, FulfillmentMethod } from '../types';
import { PRODUCTS_CATALOG } from '../data/products';
import { BRANCHES_DATA } from '../data/branches';
import { RegulatoryNotice } from '../components/ui/RegulatoryNotice';
import { STATUTORY_NOTICES } from '../data/compliance';
import { MOCK_PAYMENT_CHANNELS, SHIPPING_RATES } from '../data/ecommerceConfig';
import { Check, ShieldCheck, MapPin, CreditCard, ShoppingBag, ArrowRight } from 'lucide-react';

interface CheckoutViewProps {
  cart: CartItem[];
  onNavigate: (view: PageView) => void;
  getSkuPrice: (skuId: string) => number;
  getStockLevel: (skuId: string) => number;
  calculateTotals: (cartItems: CartItem[], fulfillmentMethod: FulfillmentMethod) => any;
  placeOrder: (
    customer: CustomerInfo,
    fulfillmentMethod: FulfillmentMethod,
    paymentMethod: PaymentMethod,
    pickupBranchId?: string
  ) => Promise<any>;
}

const CAMARINES_NORTE_MUNICIPALITIES = [
  'Daet',
  'Labo',
  'Paracale',
  'Jose Panganiban',
  'Capalonga',
  'Sta. Elena',
  'Basud',
  'Mercedes',
  'San Lorenzo Ruiz',
  'San Vicente',
  'Talisay',
  'Vinzons',
];

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  cart,
  onNavigate,
  getSkuPrice,
  getStockLevel,
  calculateTotals,
  placeOrder,
}) => {
  const isCartEmpty = cart.length === 0;

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [barangay, setBarangay] = useState('');
  const [municipality, setMunicipality] = useState('Daet');
  const [isPlacing, setIsPlacing] = useState(false);
  
  // Logistics states
  const [fulfillmentMethod, setFulfillmentMethod] = useState<FulfillmentMethod>('pickup');
  const [pickupBranchId, setPickupBranchId] = useState<string>('daet');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash_on_pickup');

  // If fulfillment method shifts to delivery, we must change cash_on_pickup payment to gcash / bank
  useEffect(() => {
    if (fulfillmentMethod === 'delivery' && paymentMethod === 'cash_on_pickup') {
      setPaymentMethod('gcash');
    }
  }, [fulfillmentMethod, paymentMethod]);

  if (isCartEmpty) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto" />
        <h2 className="text-2xl font-serif font-bold text-white">Your cart is empty</h2>
        <p className="text-xs text-slate-400">Please add products to your cart before proceeding to checkout.</p>
        <button
          onClick={() => onNavigate('products')}
          className="px-5 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded transition"
        >
          Return to Catalog
        </button>
      </div>
    );
  }

  // Calculate pricing breakdown
  const totals = calculateTotals(cart, fulfillmentMethod);

  // Validate quantities against inventory
  const inventoryCheckPassed = cart.every((item) => {
    const stock = getStockLevel(item.skuId);
    return item.quantity <= stock;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName || !lastName || !email || !phone) {
      alert('Please fill out all primary contact information fields.');
      return;
    }

    if (fulfillmentMethod === 'delivery' && (!addressLine1 || !barangay)) {
      alert('Please complete the delivery address fields.');
      return;
    }

    if (!inventoryCheckPassed) {
      alert('Checkout failed: One or more items in your cart exceed available simulated stock.');
      return;
    }

    const customer: CustomerInfo = {
      firstName,
      lastName,
      email,
      phone,
      addressLine1: fulfillmentMethod === 'delivery' ? addressLine1 : undefined,
      barangay: fulfillmentMethod === 'delivery' ? barangay : undefined,
      municipality,
      province: 'Camarines Norte',
    };

    setIsPlacing(true);
    try {
      const newOrder = await placeOrder(customer, fulfillmentMethod, paymentMethod, pickupBranchId);
      if (newOrder) {
        // Redirect to orders page with URL anchor to view the newly placed order!
        onNavigate('orders');
      }
    } catch (err: any) {
      alert(`Checkout failed: ${err.message || err}`);
    } finally {
      setIsPlacing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
      {/* Header */}
      <div className="space-y-2 border-b border-slate-800 pb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400 uppercase tracking-widest">
            <span>Stage 2 — Secure Checkout</span>
            <span aria-hidden="true">·</span>
            <span>Local System Simulation</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-black text-white mt-1">
            Complete Your Checkout
          </h1>
        </div>
        <button
          onClick={() => onNavigate('cart')}
          className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded text-xs transition"
        >
          ← Back to Cart
        </button>
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

      {/* Main Form Layout */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Forms and Options */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Customer Information Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <h3 className="text-base font-serif font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center text-xs font-mono">1</span>
              Primary Contact Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium" htmlFor="first_name">First Name *</label>
                <input
                  id="first_name"
                  type="text"
                  required
                  placeholder="e.g. Juan"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium" htmlFor="last_name">Last Name *</label>
                <input
                  id="last_name"
                  type="text"
                  required
                  placeholder="e.g. dela Cruz"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium" htmlFor="email">Email Address *</label>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="e.g. juan@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium" htmlFor="phone">Mobile Hotline Number *</label>
                <input
                  id="phone"
                  type="tel"
                  required
                  placeholder="e.g. 0917-XXX-XXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Fulfillment Selection Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <h3 className="text-base font-serif font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center text-xs font-mono">2</span>
              Select Fulfillment Method
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFulfillmentMethod('pickup')}
                className={`p-4 rounded-lg border text-left transition flex flex-col justify-between ${
                  fulfillmentMethod === 'pickup'
                    ? 'bg-amber-500/10 border-amber-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-amber-400">
                  <Check className={`w-3.5 h-3.5 ${fulfillmentMethod === 'pickup' ? 'opacity-100' : 'opacity-0'}`} />
                  Branch Pickup
                </span>
                <p className="text-[11px] text-slate-400 mt-1">
                  Pick up and pay directly at our configured Camarines Norte branch hubs; physical addresses and contact details pending business confirmation. (Free)
                </p>
              </button>

              <button
                type="button"
                onClick={() => setFulfillmentMethod('delivery')}
                className={`p-4 rounded-lg border text-left transition flex flex-col justify-between ${
                  fulfillmentMethod === 'delivery'
                    ? 'bg-amber-500/10 border-amber-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-amber-400">
                  <Check className={`w-3.5 h-3.5 ${fulfillmentMethod === 'delivery' ? 'opacity-100' : 'opacity-0'}`} />
                  Home Delivery
                </span>
                <p className="text-[11px] text-slate-400 mt-1">
                  Prompt courier delivery within Camarines Norte bounds. (Fixed rate: ₱150.00)
                </p>
              </button>
            </div>

            {/* Sub-form: Branch Pickup Details */}
            {fulfillmentMethod === 'pickup' && (
              <div className="p-4 bg-slate-950 border border-slate-800/80 rounded space-y-3">
                <label className="text-xs text-slate-400 font-medium block">Select Designated Pickup Hub:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {BRANCHES_DATA.map((branch) => (
                    <label
                      key={branch.id}
                      className={`p-3 rounded border text-left cursor-pointer flex items-center justify-between transition ${
                        pickupBranchId === branch.id
                          ? 'bg-amber-950/20 border-amber-500/80 text-amber-200'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold block">{branch.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          {branch.municipality} · Operating proposed baseline
                        </span>
                      </div>
                      <input
                        type="radio"
                        name="pickup_branch"
                        value={branch.id}
                        checked={pickupBranchId === branch.id}
                        onChange={() => setPickupBranchId(branch.id)}
                        className="accent-amber-500 h-3.5 w-3.5 ml-2 cursor-pointer"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Sub-form: Delivery Address Details */}
            {fulfillmentMethod === 'delivery' && (
              <div className="p-4 bg-slate-950 border border-slate-800/80 rounded space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium" htmlFor="address_line">Street Address / Building / House No. *</label>
                  <input
                    id="address_line"
                    type="text"
                    required
                    placeholder="e.g. Block 3 Lot 10, Acacia Street"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-medium" htmlFor="barangay">Barangay *</label>
                    <input
                      id="barangay"
                      type="text"
                      required
                      placeholder="e.g. Barangay V"
                      value={barangay}
                      onChange={(e) => setBarangay(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-medium" htmlFor="municipality">Municipality (Camarines Norte) *</label>
                    <select
                      id="municipality"
                      value={municipality}
                      onChange={(e) => setMunicipality(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500 transition cursor-pointer"
                    >
                      {CAMARINES_NORTE_MUNICIPALITIES.map((mun) => (
                        <option key={mun} value={mun}>
                          {mun}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-medium">Province *</label>
                    <input
                      type="text"
                      disabled
                      value="Camarines Norte"
                      className="w-full bg-slate-800/50 border border-slate-800 text-slate-400 rounded px-3 py-2 text-xs font-semibold cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Payment Method Selection */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <h3 className="text-base font-serif font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center text-xs font-mono">3</span>
              Select Sandbox Payment Method
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Only show Cash on Pickup if fulfillment method is Pickup */}
              {fulfillmentMethod === 'pickup' && (
                <label
                  className={`p-4 rounded-lg border text-left cursor-pointer flex flex-col justify-between transition ${
                    paymentMethod === 'cash_on_pickup'
                      ? 'bg-amber-500/10 border-amber-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      Cash on Pickup
                    </span>
                    <input
                      type="radio"
                      name="payment_method"
                      value="cash_on_pickup"
                      checked={paymentMethod === 'cash_on_pickup'}
                      onChange={() => setPaymentMethod('cash_on_pickup')}
                      className="accent-amber-500 h-3.5 w-3.5"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Direct payment in cash upon collection of mineral bottles from our clerk.
                  </p>
                </label>
              )}

              <label
                className={`p-4 rounded-lg border text-left cursor-pointer flex flex-col justify-between transition ${
                  paymentMethod === 'gcash'
                    ? 'bg-amber-500/10 border-amber-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    GCash Mobile Wallet
                  </span>
                  <input
                    type="radio"
                    name="payment_method"
                    value="gcash"
                    checked={paymentMethod === 'gcash'}
                    onChange={() => setPaymentMethod('gcash')}
                    className="accent-amber-500 h-3.5 w-3.5"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Scan and pay via instant mobile transfer. Simulates payment verification automatically.
                </p>
              </label>

              <label
                className={`p-4 rounded-lg border text-left cursor-pointer flex flex-col justify-between transition ${
                  paymentMethod === 'maya'
                    ? 'bg-amber-500/10 border-amber-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Maya Wallet
                  </span>
                  <input
                    type="radio"
                    name="payment_method"
                    value="maya"
                    checked={paymentMethod === 'maya'}
                    onChange={() => setPaymentMethod('maya')}
                    className="accent-amber-500 h-3.5 w-3.5"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Pay with Maya digital bank or bills payment. Instant mock transfer clearance.
                </p>
              </label>

              <label
                className={`p-4 rounded-lg border text-left cursor-pointer flex flex-col justify-between transition ${
                  paymentMethod === 'bank_transfer'
                    ? 'bg-amber-500/10 border-amber-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Bank Transfer
                  </span>
                  <input
                    type="radio"
                    name="payment_method"
                    value="bank_transfer"
                    checked={paymentMethod === 'bank_transfer'}
                    onChange={() => setPaymentMethod('bank_transfer')}
                    className="accent-amber-500 h-3.5 w-3.5"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Institutional bank settlement (BDO / Landbank / Metrobank).
                </p>
              </label>
            </div>

            {/* Chosen Payment instructions preview */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded text-xs space-y-2">
              <span className="text-amber-400 font-mono uppercase tracking-wider text-[10px] font-bold block">
                {MOCK_PAYMENT_CHANNELS[paymentMethod].name} Transfer Instructions:
              </span>
              <div className="text-slate-300 space-y-1 text-[11px] leading-relaxed">
                <p>
                  <strong>Account Name:</strong> {MOCK_PAYMENT_CHANNELS[paymentMethod].accountName}
                </p>
                {MOCK_PAYMENT_CHANNELS[paymentMethod].accountNumber !== 'N/A' && (
                  <p>
                    <strong>Account Reference:</strong>{' '}
                    <span className="font-mono text-white tracking-wider">
                      {MOCK_PAYMENT_CHANNELS[paymentMethod].accountNumber}
                    </span>
                  </p>
                )}
                <p className="text-slate-400 italic pt-1">{MOCK_PAYMENT_CHANNELS[paymentMethod].instructions}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Pricing Breakdown & Submission Block */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
            <h3 className="text-lg font-serif font-bold text-white border-b border-slate-800 pb-3">
              Order Breakdown & Billing
            </h3>

            {/* List of checkout products */}
            <div className="divide-y divide-slate-800 max-h-48 overflow-y-auto pr-1">
              {totals.items.map((item: any) => (
                <div key={item.skuId} className="py-3 flex justify-between text-xs">
                  <div className="space-y-0.5">
                    <span className="font-medium text-slate-200">{item.name}</span>
                    <div className="text-slate-400 text-[10px] font-mono">
                      Qty: {item.quantity} · {item.volume} · Unit: ₱{item.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <span className="font-mono text-slate-300">
                    ₱{item.totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-2 text-xs pt-4 border-t border-slate-800">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal Sales:</span>
                <span className="font-mono text-slate-200">
                  ₱{totals.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {totals.isVatRegistered ? (
                <>
                  <div className="flex justify-between text-slate-500">
                    <span>VATable Sales (12% inclusive):</span>
                    <span className="font-mono">
                      ₱{totals.vatableSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Output VAT (12%):</span>
                    <span className="font-mono">
                      ₱{totals.vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-slate-500">
                    <span>Non-VAT Sales:</span>
                    <span className="font-mono">
                      ₱{totals.nonVatSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-emerald-400/80">
                    <span>Output VAT (0%):</span>
                    <span>Non-VAT Registered — Non-VAT treatment</span>
                  </div>
                </>
              )}

              <div className="flex justify-between text-slate-400 pt-1">
                <span>Fulfillment Dispatch Fee:</span>
                <span className="font-mono text-slate-200">
                  {totals.shippingFee === 0 ? '₱0.00 (Free Pickup)' : `₱${totals.shippingFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                </span>
              </div>
            </div>

            {/* Grand Total */}
            <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
              <span className="text-sm font-serif font-semibold text-white">Grand Invoice Total:</span>
              <div className="text-right">
                <div className="text-2xl font-mono text-amber-400 font-bold">
                  ₱{totals.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[9px] text-slate-500 font-mono tracking-wider block uppercase">
                  Sandbox transaction total
                </span>
              </div>
            </div>

            {/* Real-time Availability Check */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className={`w-4 h-4 ${inventoryCheckPassed ? 'text-emerald-400' : 'text-red-400'}`} />
                <span className="font-medium text-slate-300">Simulated Inventory Clearance</span>
              </div>
              <span className={`font-mono text-[10px] px-2 py-0.5 rounded uppercase font-bold ${
                inventoryCheckPassed ? 'bg-emerald-950/80 text-emerald-300' : 'bg-red-950/80 text-red-300'
              }`}>
                {inventoryCheckPassed ? 'Clear / Available' : 'Stock Exhausted'}
              </span>
            </div>

            {/* Compliance warning */}
            <div className="space-y-1.5 text-center">
              <p className="text-[10px] text-amber-500 font-semibold uppercase">
                VAT vs. Non-VAT classification = BUSINESS CONFIRMATION REQUIRED
              </p>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                By placing this order, you acknowledge that this is a simulated transaction utilizing sandbox parameters for technical verification.
              </p>
            </div>

            <button
               type="submit"
               disabled={!inventoryCheckPassed || isPlacing}
               className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-slate-950 font-bold text-xs rounded transition flex items-center justify-center gap-2"
             >
               {isPlacing ? 'Processing Order...' : 'Confirm and Create Order'} <ArrowRight className="w-3.5 h-3.5" />
             </button>
          </div>
        </div>
      </form>
    </div>
  );
};
