/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PageView, DeliveryMethod, PaymentMethod } from '../types';
import { CartItem } from '../hooks/useEcommerce';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, MapPin, CreditCard, CheckCircle, ArrowRight, Truck, Store } from 'lucide-react';

interface CheckoutViewProps {
  cart: CartItem[];
  onNavigate: (view: PageView) => void;
  getSkuPrice: (skuId: string) => number;
  getStockLevel: (skuId: string) => number;
  calculateTotals: (items: CartItem[], shippingFee?: number) => { subtotal: number; shippingFee: number; taxAmount: number; grandTotal: number };
  placeOrder: (orderPayload: any) => Promise<any>;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  cart,
  onNavigate,
  getSkuPrice,
  calculateTotals,
  placeOrder,
}) => {
  const { user, profile } = useAuth();

  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('branch_pickup');
  const [selectedBranch, setSelectedBranch] = useState<string>('daet');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash_on_delivery');

  const [firstName, setFirstName] = useState<string>(profile?.firstName || 'Juan');
  const [lastName, setLastName] = useState<string>(profile?.lastName || 'Dela Cruz');
  const [email, setEmail] = useState<string>(profile?.email || 'customer@example.com');
  const [mobileNumber, setMobileNumber] = useState<string>('+639171234567');
  const [barangay, setBarangay] = useState<string>('Brgy. Gahonon');
  const [municipality, setMunicipality] = useState<string>('Daet');
  const [landmark, setLandmark] = useState<string>('Near Central Bus Terminal');

  const [loading, setLoading] = useState<boolean>(false);
  const [orderComplete, setOrderComplete] = useState<any | null>(null);

  const shippingFee = deliveryMethod === 'door_to_door' ? 150 : 0;
  const totals = calculateTotals(cart, shippingFee);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const orderPayload = {
        userId: user?.uid,
        customer: {
          firstName,
          lastName,
          email,
          mobileNumber,
          shippingAddress: {
            barangay,
            municipality,
            province: 'Camarines Norte',
            landmark,
          },
        },
        items: cart,
        branchId: selectedBranch,
        deliveryMethod,
        paymentMethod,
      };

      const completed = await placeOrder(orderPayload);
      setOrderComplete(completed);
    } catch (err: any) {
      console.error('Order error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (orderComplete) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800 shadow-xs">
          <CheckCircle className="w-10 h-10" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Order Placed Successfully!</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
          Your order has been recorded in our dispatch system. We will contact your mobile number for fulfillment and verification.
        </p>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left text-xs space-y-3 shadow-xs">
          <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="text-slate-500">Order ID:</span>
            <span className="font-mono font-bold text-sky-700 dark:text-sky-400">{orderComplete.id}</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="text-slate-500">Branch Dispatch:</span>
            <span className="font-semibold text-slate-900 dark:text-white uppercase">{orderComplete.branchId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Grand Total:</span>
            <span className="font-bold text-lg text-sky-700 dark:text-sky-400 tabular-nums">
              ₱{orderComplete.grandTotal.toLocaleString()}
            </span>
          </div>
        </div>

        <button
          onClick={() => onNavigate('orders')}
          className="px-6 py-3 bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 font-bold text-sm rounded-xl shadow-xs transition cursor-pointer"
        >
          View in My Orders
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">Secure Order Checkout</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">Complete your shipping and payment preferences to finalize your order.</p>
      </div>

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
              1. Customer Contact Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Mobile Number</label>
                <input
                  type="text"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Delivery Method */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
              2. Delivery Method & Branch Hub
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`p-4 rounded-xl border cursor-pointer flex items-start gap-3 transition ${
                  deliveryMethod === 'branch_pickup'
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-slate-900 dark:text-white ring-1 ring-sky-500'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900'
                }`}
              >
                <input
                  type="radio"
                  name="delivery"
                  checked={deliveryMethod === 'branch_pickup'}
                  onChange={() => setDeliveryMethod('branch_pickup')}
                  className="mt-1 text-sky-600"
                />
                <div className="text-xs">
                  <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                    <span>Branch Direct Pickup (FREE)</span>
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 mt-1">
                    Pick up directly at any of our Camarines Norte branch hubs
                  </div>
                </div>
              </label>

              <label
                className={`p-4 rounded-xl border cursor-pointer flex items-start gap-3 transition ${
                  deliveryMethod === 'door_to_door'
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-slate-900 dark:text-white ring-1 ring-sky-500'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900'
                }`}
              >
                <input
                  type="radio"
                  name="delivery"
                  checked={deliveryMethod === 'door_to_door'}
                  onChange={() => setDeliveryMethod('door_to_door')}
                  className="mt-1 text-sky-600"
                />
                <div className="text-xs">
                  <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                    <span>Doorstep Courier Delivery (+₱150)</span>
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 mt-1">
                    Delivered directly to your home/work address
                  </div>
                </div>
              </label>
            </div>

            {/* Branch Selector */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Select Dispatching Branch Hub
              </label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="daet">Daet Central Hub (Vinzons Ave)</option>
                <option value="labo">Labo Municipal Branch (Maharlika Hwy)</option>
                <option value="capalonga">Capalonga Coastal Branch (Poblacion)</option>
                <option value="paracale">Paracale Gold District Branch (Poblacion)</option>
                <option value="jose_panganiban">Jose Panganiban Northern Port Branch</option>
                <option value="santa_elena">Santa Elena Gateway Branch (Highway Junction)</option>
              </select>
            </div>

            {/* Address fields for delivery */}
            {deliveryMethod === 'door_to_door' && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Barangay</label>
                  <input
                    type="text"
                    value={barangay}
                    onChange={(e) => setBarangay(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Municipality</label>
                  <input
                    type="text"
                    value={municipality}
                    onChange={(e) => setMunicipality(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Landmark / Delivery Instructions</label>
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
              3. Payment Method
            </h3>
            <div className="space-y-2.5">
              <label
                className={`p-4 rounded-xl border cursor-pointer flex items-center justify-between transition ${
                  paymentMethod === 'cash_on_delivery'
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-slate-900 dark:text-white ring-1 ring-sky-500'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'cash_on_delivery'}
                    onChange={() => setPaymentMethod('cash_on_delivery')}
                    className="text-sky-600"
                  />
                  <div>
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block">
                      Cash on Delivery (COD) / Cash on Pickup
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Pay cash upon inspecting genuine sealed package
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-sky-700 dark:text-sky-400">Recommended</span>
              </label>

              <label
                className={`p-4 rounded-xl border cursor-pointer flex items-center justify-between transition ${
                  paymentMethod === 'gcash'
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-slate-900 dark:text-white ring-1 ring-sky-500'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'gcash'}
                    onChange={() => setPaymentMethod('gcash')}
                    className="text-sky-600"
                  />
                  <div>
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block">GCash QR / E-Wallet</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Instant direct branch e-wallet confirmation</span>
                  </div>
                </div>
              </label>

              <label
                className={`p-4 rounded-xl border cursor-pointer flex items-center justify-between transition ${
                  paymentMethod === 'maya'
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-slate-900 dark:text-white ring-1 ring-sky-500'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'maya'}
                    onChange={() => setPaymentMethod('maya')}
                    className="text-sky-600"
                  />
                  <div>
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block">Maya Wallet / Card</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Maya digital QR payment</span>
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Order Summary & Confirm */}
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
                <span>Delivery Fee</span>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                  {totals.shippingFee === 0 ? 'FREE' : `₱${totals.shippingFee.toLocaleString()}`}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Statutory 12% VAT</span>
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
              type="submit"
              disabled={loading || cart.length === 0}
              className="w-full py-3.5 bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 font-bold text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <span>{loading ? 'Processing Order...' : 'Place Secure Order'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 rounded-xl bg-sky-50 dark:bg-slate-900/60 border border-sky-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-sky-700 dark:text-sky-400 shrink-0 mt-0.5" />
            <span>Authorized Camarines Norte branch distribution with tamper-evident lot verification.</span>
          </div>
        </div>
      </form>
    </div>
  );
};
