/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { CartItem, Order, VatConfiguration, CustomerInfo, PaymentMethod, FulfillmentMethod } from '../types';
import { PRODUCTS_CATALOG } from '../data/products';
import {
  INITIAL_PRICING_CONFIGS,
  INITIAL_INVENTORY_CONFIGS,
  INITIAL_VAT_CONFIG,
  SHIPPING_RATES,
  SkuPricingConfig,
  InventoryRecord,
} from '../data/ecommerceConfig';

export const useEcommerce = () => {
  // Cart state loaded from localStorage
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('hci_cmd_cart');
    return saved ? JSON.parse(saved) : [];
  });

  // Orders list loaded from localStorage
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('hci_cmd_orders');
    return saved ? JSON.parse(saved) : [];
  });

  // VAT Configuration
  const [vatConfig, setVatConfig] = useState<VatConfiguration>(() => {
    const saved = localStorage.getItem('hci_cmd_vat_config');
    return saved ? JSON.parse(saved) : INITIAL_VAT_CONFIG;
  });

  // Pricing configuration
  const [pricing, setPricing] = useState<SkuPricingConfig[]>(() => {
    const saved = localStorage.getItem('hci_cmd_pricing_config');
    return saved ? JSON.parse(saved) : INITIAL_PRICING_CONFIGS;
  });

  // Simulated Inventory levels
  const [inventory, setInventory] = useState<InventoryRecord[]>(() => {
    const saved = localStorage.getItem('hci_cmd_inventory_config');
    return saved ? JSON.parse(saved) : INITIAL_INVENTORY_CONFIGS;
  });

  // Sync state with localStorage
  useEffect(() => {
    localStorage.setItem('hci_cmd_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('hci_cmd_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('hci_cmd_vat_config', JSON.stringify(vatConfig));
  }, [vatConfig]);

  useEffect(() => {
    localStorage.setItem('hci_cmd_pricing_config', JSON.stringify(pricing));
  }, [pricing]);

  useEffect(() => {
    localStorage.setItem('hci_cmd_inventory_config', JSON.stringify(inventory));
  }, [inventory]);

  // Cart Operations
  const addToCart = (skuId: string, quantity: number = 1) => {
    const stock = getStockLevel(skuId);
    setCart((prev) => {
      const existing = prev.find((item) => item.skuId === skuId);
      const currentQty = existing ? existing.quantity : 0;
      const targetQty = currentQty + quantity;

      // Ensure we do not exceed simulated stock
      if (targetQty > stock) {
        alert(`Cannot add more than available simulated inventory (${stock} bottle(s) in stock).`);
        return prev;
      }

      if (existing) {
        return prev.map((item) =>
          item.skuId === skuId ? { ...item, quantity: targetQty } : item
        );
      }
      return [...prev, { skuId, quantity }];
    });
  };

  const removeFromCart = (skuId: string) => {
    setCart((prev) => prev.filter((item) => item.skuId !== skuId));
  };

  const updateCartQuantity = (skuId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(skuId);
      return;
    }
    const stock = getStockLevel(skuId);
    if (quantity > stock) {
      alert(`Simulated inventory error: only ${stock} bottles are available.`);
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.skuId === skuId ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  // Inventory helpers
  const getStockLevel = (skuId: string): number => {
    const inv = inventory.find((i) => i.skuId === skuId);
    return inv ? inv.stockCount : 0;
  };

  const updateStockLevel = (skuId: string, newCount: number) => {
    setInventory((prev) =>
      prev.map((i) => (i.skuId === skuId ? { ...i, stockCount: Math.max(0, newCount) } : i))
    );
  };

  const restockAll = () => {
    setInventory(INITIAL_INVENTORY_CONFIGS);
  };

  // Pricing helper
  const getSkuPrice = (skuId: string): number => {
    const p = pricing.find((item) => item.skuId === skuId);
    return p ? p.basePrice : 0;
  };

  const updateSkuPrice = (skuId: string, newPrice: number) => {
    setPricing((prev) =>
      prev.map((p) => (p.skuId === skuId ? { ...p, basePrice: Math.max(0, newPrice) } : p))
    );
  };

  // Reset all configuration to factory defaults
  const resetToFactoryDefaults = () => {
    setVatConfig(INITIAL_VAT_CONFIG);
    setPricing(INITIAL_PRICING_CONFIGS);
    setInventory(INITIAL_INVENTORY_CONFIGS);
    setCart([]);
    setOrders([]);
    localStorage.removeItem('hci_cmd_cart');
    localStorage.removeItem('hci_cmd_orders');
    localStorage.removeItem('hci_cmd_vat_config');
    localStorage.removeItem('hci_cmd_pricing_config');
    localStorage.removeItem('hci_cmd_inventory_config');
  };

  // Pricing & Tax-ready calculations
  const calculateTotals = (cartItems: CartItem[], fulfillmentMethod: FulfillmentMethod) => {
    let subtotal = 0;
    const itemsWithPricing = cartItems.map((item) => {
      const sku = PRODUCTS_CATALOG.find((s) => s.id === item.skuId);
      const unitPrice = getSkuPrice(item.skuId);
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;

      return {
        skuId: item.skuId,
        name: sku ? sku.name : 'Unknown Product',
        volume: sku ? sku.nominalVolume : 'N/A',
        quantity: item.quantity,
        unitPrice,
        totalPrice,
      };
    });

    const shippingFee = fulfillmentMethod === 'delivery' ? SHIPPING_RATES.fixedDeliveryFee : 0;
    const grandTotal = subtotal + shippingFee;

    // Tax calculation
    let vatAmount = 0;
    let vatableSales = 0;
    let vatExemptSales = 0;
    let vatZeroRatedSales = 0;
    let nonVatExempt = 0;

    if (vatConfig.isVatRegistered) {
      // VAT is inclusive in base price (standard BIR practice for retail)
      // Price = Vatable Sales * 1.12
      // Vatable Sales = Price / 1.12
      // VAT = Price - Vatable Sales
      vatableSales = subtotal / (1 + vatConfig.vatRatePercent / 100);
      vatAmount = subtotal - vatableSales;
      vatExemptSales = 0;
      vatZeroRatedSales = 0;
      nonVatExempt = 0;
    } else {
      // Non-VAT Registered treatment: total sales are under Non-VAT sales
      vatableSales = 0;
      vatAmount = 0;
      vatExemptSales = 0;
      vatZeroRatedSales = 0;
      nonVatExempt = subtotal; // Total classified as non-VAT
    }

    return {
      items: itemsWithPricing,
      shippingFee,
      subtotal,
      vatAmount,
      vatableSales,
      vatExemptSales,
      vatZeroRatedSales,
      nonVatExempt,
      total: grandTotal,
      isVatRegistered: vatConfig.isVatRegistered,
    };
  };

  // Order Placement
  const placeOrder = (
    customer: CustomerInfo,
    fulfillmentMethod: FulfillmentMethod,
    paymentMethod: PaymentMethod,
    pickupBranchId?: string
  ): Order | null => {
    // 1. Availability check before order creation
    for (const item of cart) {
      const stock = getStockLevel(item.skuId);
      if (item.quantity > stock) {
        alert(
          `Simulated inventory error: item ${item.skuId} exceeds available quantity of ${stock} bottle(s). Please edit your cart.`
        );
        return null;
      }
    }

    // 2. Calculate final numbers
    const totals = calculateTotals(cart, fulfillmentMethod);

    // 3. Subtract inventory
    cart.forEach((item) => {
      const current = getStockLevel(item.skuId);
      updateStockLevel(item.skuId, current - item.quantity);
    });

    // 4. Create Order Record
    const orderId = `HCI-CMD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
    const newOrder: Order = {
      id: orderId,
      createdAt: new Date().toISOString(),
      customer,
      items: totals.items,
      fulfillmentMethod,
      pickupBranchId: fulfillmentMethod === 'pickup' ? pickupBranchId : undefined,
      shippingFee: totals.shippingFee,
      subtotal: totals.subtotal,
      vatAmount: totals.vatAmount,
      nonVatExempt: totals.nonVatExempt,
      total: totals.total,
      isVatRegistered: totals.isVatRegistered,
      paymentMethod,
      paymentStatus: paymentMethod === 'cash_on_pickup' ? 'pending_payment' : 'payment_verification_required',
      fulfillmentStatus: 'pending_processing',
      vatableSales: totals.vatableSales,
      vatExemptSales: totals.vatExemptSales,
      vatZeroRatedSales: totals.vatZeroRatedSales,
    };

    setOrders((prev) => [newOrder, ...prev]);
    setCart([]); // Clear cart upon successful order
    return newOrder;
  };

  // Order state transitions for order tracking demo
  const advanceOrderStatus = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;

        let nextFulfillment = o.fulfillmentStatus;
        let nextPayment = o.paymentStatus;

        if (o.fulfillmentStatus === 'pending_processing') {
          nextFulfillment = o.fulfillmentMethod === 'pickup' ? 'ready_for_pickup' : 'in_transit';
        } else if (o.fulfillmentStatus === 'ready_for_pickup' || o.fulfillmentStatus === 'in_transit') {
          nextFulfillment = 'completed';
          nextPayment = 'paid';
        }

        return {
          ...o,
          fulfillmentStatus: nextFulfillment,
          paymentStatus: nextPayment,
        };
      })
    );
  };

  const cancelOrder = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        
        // Return inventory on cancel
        if (o.fulfillmentStatus !== 'cancelled' && o.fulfillmentStatus !== 'completed') {
          o.items.forEach((item) => {
            const current = getStockLevel(item.skuId);
            updateStockLevel(item.skuId, current + item.quantity);
          });
        }

        return {
          ...o,
          fulfillmentStatus: 'cancelled',
        };
      })
    );
  };

  return {
    cart,
    orders,
    vatConfig,
    pricing,
    inventory,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    getStockLevel,
    updateStockLevel,
    restockAll,
    getSkuPrice,
    updateSkuPrice,
    setVatConfig,
    calculateTotals,
    placeOrder,
    advanceOrderStatus,
    cancelOrder,
    resetToFactoryDefaults,
  };
};
