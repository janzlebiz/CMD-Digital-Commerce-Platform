/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PageView, OrderRecord } from '../types';
import { Package, Clock, CheckCircle, XCircle, MapPin, ArrowRight } from 'lucide-react';

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
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-5">
        <div className="w-16 h-16 bg-sky-50 dark:bg-slate-900 text-sky-600 dark:text-sky-400 rounded-2xl flex items-center justify-center mx-auto border border-sky-100 dark:border-slate-800 shadow-xs">
          <Package className="w-8 h-8" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">No Orders Placed Yet</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
          Your placed orders will appear here for status tracking and branch delivery verification.
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
          Order History & Tracking ({orders.length})
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">View your active order fulfillments, dispatch branch status, and receipt summaries.</p>
      </div>

      <div className="space-y-4">
        {orders.map((ord) => (
          <div
            key={ord.id}
            className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs hover:border-sky-300 dark:hover:border-slate-700 transition"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <span className="text-xs font-mono font-bold text-sky-800 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/80 px-2.5 py-1 rounded-md border border-sky-200 dark:border-sky-800">
                  {ord.id}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-3">
                  Placed on {new Date(ord.placedAt).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${
                    ord.fulfillmentStatus === 'completed'
                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      : ord.fulfillmentStatus === 'cancelled'
                      ? 'bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800'
                      : 'bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800'
                  }`}
                >
                  {ord.fulfillmentStatus.replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
              <div>
                <span className="text-slate-500 block mb-0.5">Recipient:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {ord.customer.firstName} {ord.customer.lastName}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Dispatch Branch:</span>
                <span className="font-semibold text-slate-900 dark:text-white uppercase">{ord.branchId}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Total Amount:</span>
                <span className="font-bold text-sky-700 dark:text-sky-400 tabular-nums">₱{ord.grandTotal.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Ordered Items:</span>
              {ord.items.map((item, i) => (
                <div key={i} className="flex justify-between text-xs text-slate-700 dark:text-slate-300">
                  <span>
                    {item.productName} × {item.quantity}
                  </span>
                  <span className="font-semibold tabular-nums">₱{item.totalPrice.toLocaleString()}</span>
                </div>
              ))}
            </div>

            {ord.fulfillmentStatus === 'pending_processing' && (
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => cancelOrder(ord.id)}
                  className="px-3.5 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition font-semibold cursor-pointer"
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
