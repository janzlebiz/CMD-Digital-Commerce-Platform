/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PageView, Order } from '../types';
import { BRANCHES_DATA } from '../data/branches';
import { RegulatoryNotice } from '../components/ui/RegulatoryNotice';
import { STATUTORY_NOTICES } from '../data/compliance';
import { BirSealBadge } from '../components/ui/BirSealBadge';
import { Printer, RefreshCw, FileText, XCircle, ChevronRight, CheckCircle2, ShoppingBag } from 'lucide-react';

interface OrdersViewProps {
  orders: Order[];
  onNavigate: (view: PageView) => void;
  advanceOrderStatus: (orderId: string) => void;
  cancelOrder: (orderId: string) => void;
  restockAll: () => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  onNavigate,
  advanceOrderStatus,
  cancelOrder,
  restockAll,
}) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string>(
    orders.length > 0 ? orders[0].id : ''
  );

  // If no order is selected but orders exist, select the first one
  const activeOrderId = selectedOrderId || (orders.length > 0 ? orders[0].id : '');
  const activeOrder = orders.find((o) => o.id === activeOrderId);

  const getFulfillmentLabel = (status: string) => {
    switch (status) {
      case 'pending_processing':
        return 'Pending Stock Dispatch';
      case 'ready_for_pickup':
        return 'Ready for Store Collection';
      case 'in_transit':
        return 'In Transit (Courier)';
      case 'completed':
        return 'Fulfilled & Completed';
      case 'cancelled':
        return 'Cancelled / Voided';
      default:
        return status;
    }
  };

  const getFulfillmentColor = (status: string) => {
    switch (status) {
      case 'pending_processing':
        return 'bg-amber-950/60 text-amber-400 border border-amber-800/60';
      case 'ready_for_pickup':
      case 'in_transit':
        return 'bg-blue-950/60 text-blue-400 border border-blue-800/60';
      case 'completed':
        return 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60';
      case 'cancelled':
        return 'bg-red-950/60 text-red-400 border border-red-900/60';
      default:
        return 'bg-slate-900 text-slate-300';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10 print:py-0 print:px-0">
      
      {/* Header (Hidden during browser print) */}
      <div className="space-y-2 border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400 uppercase tracking-widest">
            <span>Stage 3 — Order Tracking & Invoicing</span>
            <span aria-hidden="true">·</span>
            <span>Real-time Fulfillment Simulation</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-black text-white mt-1">
            Order Status & Invoices
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onNavigate('products')}
            className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded text-xs transition"
          >
            ← Back to Catalog
          </button>
          <button
            onClick={restockAll}
            className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded text-xs transition flex items-center gap-1.5"
            title="Reset simulated inventory parameters"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset Inventory
          </button>
        </div>
      </div>

      {/* Mandatory Statutory Notice (Hidden during browser print) */}
      <div className="print:hidden">
        <RegulatoryNotice level="statutory" title="Mandatory Food Supplement Notice" citation="FDA Circular No. 2015-003">
          <p className="font-semibold text-amber-200">
            {STATUTORY_NOTICES.FILIPINO_WARNING}
          </p>
          <p className="text-xs text-amber-300/80 mt-1 uppercase tracking-wider font-bold">
            {STATUTORY_NOTICES.ENGLISH_DISCLAIMER}
          </p>
        </RegulatoryNotice>
      </div>

      {/* Empty State */}
      {orders.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center space-y-4 print:hidden">
          <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="font-serif font-bold text-lg text-white">No simulated orders found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Once you complete checkout with designated branch-pickup or delivery parameters, your invoice and tracking will appear here.
            </p>
          </div>
          <button
            onClick={() => onNavigate('products')}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded transition"
          >
            Go to Product Catalog
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: List of Placed Orders (Hidden during browser print) */}
          <div className="lg:col-span-4 space-y-3 print:hidden">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-1">
              Active Orders ({orders.length})
            </span>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {orders.map((order) => {
                const isActive = order.id === activeOrderId;
                const dateString = new Date(order.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`w-full text-left p-4 rounded-lg border transition-all flex flex-col justify-between ${
                      isActive
                        ? 'bg-slate-900 border-amber-500 shadow-md ring-1 ring-amber-500/30'
                        : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono text-xs font-bold text-white block">
                          {order.id}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {dateString}
                        </span>
                      </div>
                      <span className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded font-bold ${getFulfillmentColor(order.fulfillmentStatus)}`}>
                        {order.fulfillmentStatus === 'pending_processing' ? 'Pending' : order.fulfillmentStatus === 'ready_for_pickup' ? 'Ready' : order.fulfillmentStatus === 'in_transit' ? 'Transit' : order.fulfillmentStatus}
                      </span>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800/60 flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">
                        {order.items.reduce((sum, item) => sum + item.quantity, 0)} bottle(s) · {order.fulfillmentMethod === 'pickup' ? 'Pickup' : 'Delivery'}
                      </span>
                      <span className="font-mono text-amber-400 font-bold">
                        ₱{order.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Order Detail & Printable Sales Invoice */}
          <div className="lg:col-span-8 space-y-6 print:col-span-12">
            
            {activeOrder && (
              <>
                {/* Simulated Operations Hub Controls (Hidden during browser print) */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 print:hidden">
                  <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-800">
                    <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Interactive Order Operations Simulator</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Use this mock operational tool to advance the order state-transitions or simulate cancellations. This verifies order data handling and invoice layout updates.
                  </p>
                  
                  <div className="flex flex-wrap gap-2 pt-1">
                    {activeOrder.fulfillmentStatus !== 'completed' && activeOrder.fulfillmentStatus !== 'cancelled' && (
                      <button
                        onClick={() => advanceOrderStatus(activeOrder.id)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] rounded transition flex items-center gap-1"
                      >
                        Advance Status <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                    {activeOrder.fulfillmentStatus !== 'cancelled' && activeOrder.fulfillmentStatus !== 'completed' && (
                      <button
                        onClick={() => cancelOrder(activeOrder.id)}
                        className="px-3 py-1.5 bg-slate-950 border border-slate-800 hover:border-red-950/40 hover:text-red-400 text-slate-400 text-[11px] rounded transition flex items-center gap-1"
                      >
                        Cancel / Void Order <XCircle className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={handlePrint}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 text-[11px] rounded transition flex items-center gap-1"
                    >
                      <Printer className="w-3 h-3 text-slate-400" /> Print Sales Invoice
                    </button>
                  </div>

                  {/* Status Timeline Indicator */}
                  <div className="grid grid-cols-4 gap-1 text-[10px] text-center font-mono pt-2 border-t border-slate-800/60">
                    <div className={`p-1.5 rounded-sm ${activeOrder.fulfillmentStatus === 'pending_processing' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold' : 'bg-slate-950 text-slate-600'}`}>
                      1. RECEIVED
                    </div>
                    <div className={`p-1.5 rounded-sm ${activeOrder.fulfillmentStatus === 'ready_for_pickup' || activeOrder.fulfillmentStatus === 'in_transit' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold' : 'bg-slate-950 text-slate-600'}`}>
                      2. {activeOrder.fulfillmentMethod === 'pickup' ? 'READY' : 'TRANSIT'}
                    </div>
                    <div className={`p-1.5 rounded-sm ${activeOrder.fulfillmentStatus === 'completed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold' : 'bg-slate-950 text-slate-600'}`}>
                      3. COMPLETED
                    </div>
                    <div className={`p-1.5 rounded-sm ${activeOrder.fulfillmentStatus === 'cancelled' ? 'bg-red-500/20 text-red-300 border border-red-500/30 font-bold' : 'bg-slate-950 text-slate-600'}`}>
                      VOIDED
                    </div>
                  </div>
                </div>

                {/* Printable Sandbox Sales Invoice Card */}
                <div className="bg-white text-slate-900 border border-slate-300 rounded-xl p-6 sm:p-8 space-y-6 print:border-none print:shadow-none print:rounded-none">
                  
                  {/* Top-most Regulatory Advisory (Printed clearly as per guidelines) */}
                  <div className="border-y-2 border-slate-900 py-1.5 text-center">
                    <span className="block font-sans font-black tracking-tight text-slate-950 uppercase text-xs sm:text-sm">
                      {STATUTORY_NOTICES.FILIPINO_WARNING}
                    </span>
                    <span className="block text-[10px] sm:text-xs text-slate-700 tracking-wider font-bold mt-0.5 uppercase">
                      {STATUTORY_NOTICES.ENGLISH_DISCLAIMER}
                    </span>
                  </div>

                  {/* Prominent Sandbox Warning Banner */}
                  <div className="bg-red-50 border-2 border-red-500 text-red-700 p-3 rounded text-center font-black text-xs sm:text-sm tracking-wide">
                    DEMO / SANDBOX — NOT A REGISTERED BIR TAX INVOICE
                  </div>

                  {/* Document Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="space-y-1">
                      <h2 className="text-xl sm:text-2xl font-serif font-extrabold tracking-tight text-slate-950">
                        HEALTH CODE INTERNATIONAL CORP.
                      </h2>
                      <p className="text-[10px] text-slate-600 max-w-sm leading-relaxed uppercase">
                        HCI CMD™ CAMARINES NORTE REGIONAL DISTRIBUTION PLATFORM
                        <br />
                        CO-REPRESENTED COURIER LOGISTICS & PHYSICAL PICKUP SERVICES
                      </p>
                      <div className="text-[9px] text-slate-500 leading-normal italic">
                        * PIN/TIN: [Evidence Pending Business Verification (FAR-01/02)]
                        <br />
                        * BIR Registration: [Seal and Certificate Pending Audit Evidence (FAR-03)]
                      </div>
                    </div>

                    <div className="text-left sm:text-right space-y-1 self-stretch sm:self-start border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-4">
                      <span className="text-xs font-mono font-black text-slate-950 uppercase tracking-widest block bg-slate-100 px-2 py-1 rounded text-center">
                        Sandbox Sales Invoice Simulation
                      </span>
                      <div className="text-xs font-mono text-slate-900 pt-1.5 space-y-0.5">
                        <p><strong>INVOICE NO:</strong> <span className="font-bold">{activeOrder.id}</span></p>
                        <p><strong>DATE:</strong> {new Date(activeOrder.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <p><strong>TIME:</strong> {new Date(activeOrder.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  </div>

                  {/* Customer & Fulfillment Meta Block */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-200 pt-4 text-xs">
                    <div className="space-y-1">
                      <span className="font-mono text-[10px] text-slate-500 uppercase block">SOLD TO CUSTOMER:</span>
                      <p className="font-bold text-slate-950 text-sm">
                        {activeOrder.customer.firstName} {activeOrder.customer.lastName}
                      </p>
                      <p className="text-slate-700">Email: {activeOrder.customer.email}</p>
                      <p className="text-slate-700">Phone: {activeOrder.customer.phone}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="font-mono text-[10px] text-slate-500 uppercase block">LOGISTICS PROTOCOL:</span>
                      <p className="font-bold text-slate-900">
                        Method:{' '}
                        <span className="uppercase text-amber-700">
                          {activeOrder.fulfillmentMethod}
                        </span>
                      </p>
                      {activeOrder.fulfillmentMethod === 'pickup' ? (
                        <>
                          <p className="text-slate-700">
                            <strong>Collection Station:</strong>{' '}
                            {BRANCHES_DATA.find((b) => b.id === activeOrder.pickupBranchId)?.name || 'Central Hub'}
                          </p>
                          <p className="text-slate-500 italic text-[11px]">
                            Address: Town Proper [Street Level Pending Business Evidence (FAR-07)]
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-slate-700">
                            <strong>Destination:</strong> {activeOrder.customer.addressLine1},{' '}
                            {activeOrder.customer.barangay}, {activeOrder.customer.municipality},{' '}
                            {activeOrder.customer.province}
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Itemized Table */}
                  <div className="border-t border-slate-200 pt-4">
                    <table className="w-full text-left text-xs text-slate-800">
                      <thead>
                        <tr className="bg-slate-100 text-slate-950 font-mono text-[10px] border-b border-slate-300">
                          <th className="py-2 px-3">SKU / ITEM FORMULATION</th>
                          <th className="py-2 px-3 text-center">VOLUME</th>
                          <th className="py-2 px-3 text-center">QTY</th>
                          <th className="py-2 px-3 text-right">UNIT PRICE</th>
                          <th className="py-2 px-3 text-right">TOTAL AMOUNT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {activeOrder.items.map((item) => (
                          <tr key={item.skuId}>
                            <td className="py-3 px-3 font-semibold text-slate-900">{item.name}</td>
                            <td className="py-3 px-3 text-center font-mono">{item.volume}</td>
                            <td className="py-3 px-3 text-center font-mono">{item.quantity}</td>
                            <td className="py-3 px-3 text-right font-mono">
                              ₱{item.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-slate-950">
                              ₱{item.totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pricing and Tax-ready Calculation Breakdown */}
                  <div className="border-t border-slate-200 pt-4 grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
                    {/* Left side: Statutory Notes and Seal Placeholder */}
                    <div className="md:col-span-6 space-y-3 flex flex-col justify-between">
                      <div className="space-y-1.5 text-[10px] text-slate-600 leading-relaxed">
                        <p>
                          <strong>FDA circular reference:</strong> Product registered under Food Supplement status. Not authorized for ocular, direct mucosal, or ophthalmic application. Dilution strictly mandated.
                        </p>
                        <p>
                          <strong>Payment channel clearance:</strong> Paid via{' '}
                          <span className="font-bold text-slate-800 uppercase">{activeOrder.paymentMethod}</span>.
                          Fulfillment status: <span className="font-semibold text-slate-800">{getFulfillmentLabel(activeOrder.fulfillmentStatus)}</span>.
                        </p>
                      </div>
                      
                      {/* BIR Seal Placeholder Badge */}
                      <div className="bg-slate-50 border border-slate-200 p-2.5 rounded flex items-center gap-2 max-w-sm">
                        <BirSealBadge theme="light" />
                        <div className="text-[8px] text-slate-500 leading-normal">
                          <span className="font-bold text-slate-700 block uppercase">BIR Seal Boundary Notice:</span>
                          Placeholder seal representing Phase 2 audit status. Official stamp and BIR Annex document upload is open pending corporate evidence verification.
                        </div>
                      </div>
                    </div>

                    {/* Right side: Invoice Numbers */}
                    <div className="md:col-span-6 space-y-1.5 font-mono text-slate-800 text-right self-stretch flex flex-col justify-end">
                      <div className="flex justify-between md:justify-end gap-6 border-b border-slate-100 py-1">
                        <span className="text-slate-500 text-left">Subtotal Sales:</span>
                        <span className="font-bold text-slate-900">
                          ₱{activeOrder.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {activeOrder.isVatRegistered ? (
                        <>
                          <div className="flex justify-between md:justify-end gap-6 border-b border-slate-100 py-1 text-[11px] text-slate-600">
                            <span className="text-slate-500 text-left">VATable Sales (12%):</span>
                            <span>₱{activeOrder.vatableSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between md:justify-end gap-6 border-b border-slate-100 py-1 text-[11px] text-slate-600">
                            <span className="text-slate-500 text-left">Output VAT (12%):</span>
                            <span>₱{activeOrder.vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between md:justify-end gap-6 border-b border-slate-100 py-1 text-[11px] text-slate-600">
                            <span className="text-slate-500 text-left">Non-VAT Exempt Sales:</span>
                            <span>₱{activeOrder.nonVatExempt.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between md:justify-end gap-6 border-b border-slate-100 py-1 text-[11px] text-emerald-700 font-bold">
                            <span className="text-left">Output VAT (0%):</span>
                            <span>EXEMPT (Non-VAT)</span>
                          </div>
                        </>
                      )}

                      <div className="flex justify-between md:justify-end gap-6 border-b border-slate-100 py-1 text-[11px] text-slate-600">
                        <span className="text-slate-500 text-left">Shipping Fee:</span>
                        <span>
                          {activeOrder.shippingFee === 0 ? '₱0.00 (Pickup)' : `₱${activeOrder.shippingFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                        </span>
                      </div>

                      <div className="flex justify-between md:justify-end gap-6 pt-2 border-t-2 border-slate-300">
                        <span className="font-serif font-black text-slate-950 text-sm text-left">INVOICE GRAND TOTAL:</span>
                        <span className="text-lg font-black text-slate-950">
                          ₱{activeOrder.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Absolute Bottom Regulatory Notice (Printed clearly as per guidelines) */}
                  <div className="border-t-2 border-slate-900 pt-3 text-center text-[9px] text-slate-600 font-sans leading-relaxed">
                    <p className="font-bold text-slate-900 uppercase">
                      NO APPROVED THERAPEUTIC CLAIMS
                    </p>
                    <p className="italic">
                      This sales document represents a sandbox simulation for the HCI CMD regional platform across Camarines Norte. Standard dietary guidelines require diluting trace mineral concentrate before drinking.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
