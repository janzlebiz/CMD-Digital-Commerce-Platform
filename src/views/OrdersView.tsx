/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PageView, OrderRecord } from '../types';
import { Package, Clock, CheckCircle, XCircle, MapPin } from 'lucide-react';

interface OrdersViewProps {
  orders: OrderRecord[];
  onNavigate: (view: PageView) => void;
  advanceOrderStatus: (orderId: string) => void;
  cancelOrder: (orderId: string) => void;
  restockAll: () => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({ orders, onNavigate, cancelOrder }) => {
  if (orders.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 bg-slate-900 text-slate-500 rounded-full flex items-center justify-center mx-auto border border-slate-800">
          <Package className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white">No Orders Placed Yet</h2>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Your placed orders will appear here for status tracking and delivery verification.
        </p>
        <button
          onClick={() => onNavigate('products')}
          className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition"
        >
          Start Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <h1 className="text-2xl font-extrabold text-white">Order History & Tracking ({orders.length})</h1>

      <div className="space-y-4">
        {orders.map((ord) => (
          <div
            key={ord.id}
            className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 hover:border-slate-700 transition"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                  {ord.id}
                </span>
                <span className="text-xs text-slate-500 ml-3">
                  Placed on {new Date(ord.placedAt).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${
                    ord.fulfillmentStatus === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : ord.fulfillmentStatus === 'cancelled'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}
                >
                  {ord.fulfillmentStatus.replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-400 border-t border-slate-800 pt-3">
              <div>
                <span className="text-slate-500 block">Recipient:</span>
                <span className="font-semibold text-white">
                  {ord.customer.firstName} {ord.customer.lastName}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Dispatch Branch:</span>
                <span className="font-semibold text-white uppercase">{ord.branchId}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Total Amount:</span>
                <span className="font-bold text-amber-400">₱{ord.grandTotal.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-slate-400">Ordered Items:</span>
              {ord.items.map((item, i) => (
                <div key={i} className="flex justify-between text-xs text-slate-300">
                  <span>
                    {item.productName} × {item.quantity}
                  </span>
                  <span>₱{item.totalPrice.toLocaleString()}</span>
                </div>
              ))}
            </div>

            {ord.fulfillmentStatus === 'pending_processing' && (
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => cancelOrder(ord.id)}
                  className="text-xs text-red-400 hover:text-red-300 font-semibold transition"
                >
                  Cancel Order
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
