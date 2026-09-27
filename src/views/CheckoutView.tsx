/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PageView, DeliveryMethod, PaymentMethod } from '../types';
import { CartItem } from '../hooks/useEcommerce';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, MapPin, CreditCard, CheckCircle, ArrowRight } from 'lucide-react';

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
      alert(`Order error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (orderComplete) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
          <CheckCircle className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-white">Order Placed Successfully!</h2>
        <p className="text-xs text-slate-400">
          Your order has been recorded in our dispatch system. We will contact your mobile number for fulfillment.
        </p>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-left text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-500">Order ID:</span>
            <span className="font-mono font-bold text-amber-400">{orderComplete.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Branch Dispatch:</span>
            <span className="font-semibold text-white uppercase">{orderComplete.branchId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Grand Total:</span>
            <span className="font-bold text-emerald-400">₱{orderComplete.grandTotal.toLocaleString()}</span>
          </div>
        </div>

        <button
          onClick={() => onNavigate('orders')}
          className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition"
        >
          View in My Orders
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <h1 className="text-2xl font-extrabold text-white">Secure Order Checkout</h1>

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white">1. Customer Contact Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Mobile Number</label>
                <input
                  type="text"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                  required
                />
              </div>
            </div>
          </div>

          {/* Delivery Method */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white">2. Delivery Method & Branch Hub</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className={`p-4 rounded-xl border cursor-pointer flex items-start gap-3 transition ${
                deliveryMethod === 'branch_pickup' ? 'border-amber-500 bg-amber-500/10 text-white' : 'border-slate-800 text-slate-400'
              }`}>
                <input
                  type="radio"
                  name="delivery"
                  checked={deliveryMethod === 'branch_pickup'}
                  onChange={() => setDeliveryMethod('branch_pickup')}
                  className="mt-1"
                />
                <div className="text-xs">
                  <div className="font-bold text-slate-200">Branch Direct Pickup (FREE)</div>
                  <div className="text-[11px] text-slate-400">Pick up directly at any of our 6 Camarines Norte hubs</div>
                </div>
              </label>

              <label className={`p-4 rounded-xl border cursor-pointer flex items-start gap-3 transition ${
                deliveryMethod === 'door_to_door' ? 'border-amber-500 bg-amber-500/10 text-white' : 'border-slate-800 text-slate-400'
              }`}>
                <input
                  type="radio"
                  name="delivery"
                  checked={deliveryMethod === 'door_to_door'}
                  onChange={() => setDeliveryMethod('door_to_door')}
                  className="mt-1"
                />
                <div className="text-xs">
                  <div className="font-bold text-slate-200">Door-to-Door Delivery (₱150)</div>
                  <div className="text-[11px] text-slate-400">Standard delivery across Camarines Norte municipalities</div>
                </div>
              </label>
            </div>

            <div className="pt-2">
              <label className="text-xs font-semibold text-slate-400 block mb-1">Select Branch Hub</label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
              >
                <option value="daet">Daet Central Hub (Vinzons Ave)</option>
                <option value="labo">Labo Branch (Maharlika Highway)</option>
                <option value="capalonga">Capalonga Branch (Poblacion)</option>
                <option value="paracale">Paracale Branch (Poblacion)</option>
                <option value="jose_panganiban">Jose Panganiban Branch (Magsaysay St)</option>
                <option value="santa_elena">Santa Elena Branch (Highway Junction)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Order Summary & Submit */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 h-fit">
          <h3 className="text-base font-bold text-white">Payment & Final Total</h3>

          <div className="space-y-2 text-xs text-slate-300 border-b border-slate-800 pb-4">
            <div className="flex justify-between">
              <span className="text-slate-400">Items Subtotal</span>
              <span className="font-semibold text-white">₱{totals.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Shipping Fee</span>
              <span className="font-semibold text-white">₱{totals.shippingFee.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex justify-between text-sm font-bold text-white">
            <span>Grand Total</span>
            <span className="text-amber-400 font-extrabold text-base">₱{totals.grandTotal.toLocaleString()}</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg transition"
          >
            {loading ? 'Processing Order...' : 'Confirm & Place Order'}
          </button>
        </div>
      </form>
    </div>
  );
};
