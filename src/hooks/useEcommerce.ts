/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { OrderRecord, OrderPaymentStatus, OrderFulfillmentStatus } from '../types';

export interface CartItem {
  skuId: string;
  quantity: number;
}

const PRODUCTS_METADATA: Record<string, { price: number; name: string; volume: string }> = {
  'hci-cmd-65ml': { price: 1200, name: 'HCI Cell Mineral Drops (CMD) — 65 mL Flagship Bottle', volume: '65 mL' },
  'hci-cmd-30ml': { price: 650, name: 'HCI Cell Mineral Drops (CMD) — 30 mL Compact Dropper', volume: '30 mL' },
};

export function useEcommerce() {
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('hci_cmd_cart');
    return saved ? JSON.parse(saved) : [];
  });

  const [orders, setOrders] = useState<OrderRecord[]>(() => {
    const saved = localStorage.getItem('hci_cmd_orders');
    return saved ? JSON.parse(saved) : [];
  });

  const [stockLevels, setStockLevels] = useState<Record<string, number>>({
    'hci-cmd-65ml': 50,
    'hci-cmd-30ml': 100,
  });

  useEffect(() => {
    localStorage.setItem('hci_cmd_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('hci_cmd_orders', JSON.stringify(orders));
  }, [orders]);

  const addToCart = (skuId: string, quantity: number = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.skuId === skuId);
      if (existing) {
        return prev.map((item) =>
          item.skuId === skuId ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prev, { skuId, quantity }];
    });
  };

  const removeFromCart = (skuId: string) => {
    setCart((prev) => prev.filter((item) => item.skuId !== skuId));
  };

  const updateQuantity = (skuId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(skuId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.skuId === skuId ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => setCart([]);

  const getSkuPrice = (skuId: string) => PRODUCTS_METADATA[skuId]?.price || 0;
  const getStockLevel = (skuId: string) => stockLevels[skuId] || 0;

  const calculateTotals = (items: CartItem[], shippingFee: number = 150) => {
    const subtotal = items.reduce(
      (sum, item) => sum + (PRODUCTS_METADATA[item.skuId]?.price || 0) * item.quantity,
      0
    );
    const taxAmount = 0; // VAT exempt or non-vat status
    const grandTotal = subtotal + (items.length > 0 ? shippingFee : 0);
    return { subtotal, shippingFee: items.length > 0 ? shippingFee : 0, taxAmount, grandTotal };
  };

  const placeOrder = async (orderPayload: any): Promise<OrderRecord> => {
    const orderId = `HCI-ORD-${Date.now().toString().slice(-6)}`;
    const items = orderPayload.items.map((i: any) => ({
      skuId: i.skuId,
      quantity: i.quantity,
      unitPrice: getSkuPrice(i.skuId),
      totalPrice: getSkuPrice(i.skuId) * i.quantity,
      productName: PRODUCTS_METADATA[i.skuId]?.name || i.skuId,
    }));

    const totals = calculateTotals(orderPayload.items, orderPayload.deliveryMethod === 'door_to_door' ? 150 : 0);

    const newOrder: OrderRecord = {
      id: orderId,
      userId: orderPayload.userId,
      customer: orderPayload.customer,
      items,
      branchId: orderPayload.branchId || 'daet',
      deliveryMethod: orderPayload.deliveryMethod || 'branch_pickup',
      paymentMethod: orderPayload.paymentMethod || 'cash_on_delivery',
      paymentStatus: 'pending_payment',
      fulfillmentStatus: 'pending_processing',
      subtotal: totals.subtotal,
      shippingFee: totals.shippingFee,
      taxAmount: totals.taxAmount,
      grandTotal: totals.grandTotal,
      placedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setOrders((prev) => [newOrder, ...prev]);
    clearCart();
    return newOrder;
  };

  const advanceOrderStatus = (orderId: string, currentStatus: OrderFulfillmentStatus) => {
    const nextStatusMap: Record<OrderFulfillmentStatus, OrderFulfillmentStatus> = {
      pending_processing: 'ready_for_pickup',
      ready_for_pickup: 'completed',
      in_transit: 'completed',
      completed: 'completed',
      cancelled: 'cancelled',
    };

    setOrders((prev) =>
      prev.map((ord) =>
        ord.id === orderId
          ? {
              ...ord,
              fulfillmentStatus: nextStatusMap[currentStatus] || ord.fulfillmentStatus,
              updatedAt: new Date().toISOString(),
            }
          : ord
      )
    );
  };

  const cancelOrder = (orderId: string, reason: string = 'User requested cancellation') => {
    setOrders((prev) =>
      prev.map((ord) =>
        ord.id === orderId
          ? {
              ...ord,
              fulfillmentStatus: 'cancelled',
              cancellationReason: reason,
              updatedAt: new Date().toISOString(),
            }
          : ord
      )
    );
  };

  const restockAll = () => {
    setStockLevels({
      'hci-cmd-65ml': 50,
      'hci-cmd-30ml': 100,
    });
  };

  return {
    cart,
    orders,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getSkuPrice,
    getStockLevel,
    calculateTotals,
    placeOrder,
    advanceOrderStatus,
    cancelOrder,
    restockAll,
  };
}
