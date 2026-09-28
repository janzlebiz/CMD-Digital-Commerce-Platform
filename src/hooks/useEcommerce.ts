/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { OrderRecord, OrderPaymentStatus, OrderFulfillmentStatus } from '../types';
import { useAuth } from '../context/AuthContext';

export interface CartItem {
  skuId: string;
  quantity: number;
}

const PRODUCTS_METADATA: Record<string, { price: number; name: string; volume: string }> = {
  'hci-cmd-65ml': { price: 1200, name: 'HCI Cell Mineral Drops (CMD) — 65 mL Flagship Bottle', volume: '65 mL' },
  'hci-cmd-30ml': { price: 650, name: 'HCI Cell Mineral Drops (CMD) — 30 mL Compact Dropper', volume: '30 mL' },
};

export function useEcommerce() {
  const { user } = useAuth();
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

  const getAuthToken = async () => {
    if (user && typeof user.getIdToken === 'function') {
      try {
        const idToken = await user.getIdToken();
        if (idToken) return idToken;
      } catch (err: any) {
        throw new Error(`Authentication token acquisition failed: ${err.message || 'Token error'}`);
      }
    }

    const isProduction = (import.meta as any).env?.PROD || process.env.NODE_ENV === 'production';
    if (isProduction || !user) {
      throw new Error('Authentication required: Unauthenticated requests are rejected.');
    }

    const demoToken = localStorage.getItem('demo_token');
    if (demoToken) return demoToken;
    return 'DEMO_TOKEN_customer';
  };

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
    const token = await getAuthToken();
    const idempotencyKey = orderPayload?.idempotencyKey || `key_cart_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const payloadWithKey = { ...orderPayload, idempotencyKey };

    const res = await fetch('/api/orders/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-idempotency-key': idempotencyKey,
      },
      body: JSON.stringify(payloadWithKey),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Server checkout failed.');
    }

    const data = await res.json();
    const newOrder: OrderRecord = data.order;
    setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);
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
      return_requested: 'return_requested',
      returned: 'returned',
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

  const cancelOrder = async (orderId: string, reason: string = 'User requested cancellation') => {
    const token = await getAuthToken();
    const res = await fetch(`/api/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason }),
    });

    if (res.ok) {
      const data = await res.json();
      setOrders((prev) => prev.map((ord) => (ord.id === orderId ? data.order : ord)));
      return data.order;
    }

    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Order cancellation failed on server.');
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
