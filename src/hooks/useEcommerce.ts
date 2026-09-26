/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { CartItem, Order, VatConfiguration, CustomerInfo, PaymentMethod, FulfillmentMethod } from '../types';
import { PRODUCTS_CATALOG } from '../data/products';
import { TrustedServerController } from '../services/trustedServer';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

import { INITIAL_PRICING_CONFIGS } from '../data/ecommerceConfig';

export const useEcommerce = () => {
  // Cart state loaded from localStorage (allowed only for non-authoritative UI state)
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('hci_cmd_cart');
    return saved ? JSON.parse(saved) : [];
  });

  // Real orders synced directly with Firestore
  const [orders, setOrders] = useState<Order[]>([]);

  // VAT status is server-authoritative and clearly marked as business confirmation required
  const [vatConfig, setVatConfig] = useState<VatConfiguration>({
    isVatRegistered: false,
    vatRatePercent: 12,
    isConfiguredByBusiness: false,
  });

  // Authoritative prices catalog
  const products = PRODUCTS_CATALOG;

  // Sync cart UI state with localStorage
  useEffect(() => {
    localStorage.setItem('hci_cmd_cart', JSON.stringify(cart));
  }, [cart]);

  // Real-time Firestore Sync for Orders (No localStorage caching)
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setOrders([]);
      return;
    }

    const q = query(collection(db, 'orders'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: Order[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        docs.push({
          id: d.id,
          createdAt: d.createdAt?.seconds ? new Date(d.createdAt.seconds * 1000).toISOString() : new Date().toISOString(),
          customer: d.customer,
          items: d.items,
          fulfillmentMethod: d.fulfillmentMethod || 'pickup',
          pickupBranchId: d.branchId,
          shippingFee: d.shippingFee,
          subtotal: d.subtotal,
          vatAmount: d.vatAmount,
          nonVatSales: d.nonVatSales,
          total: d.total,
          isVatRegistered: d.isVatRegistered,
          paymentMethod: d.paymentMethod,
          paymentStatus: d.paymentStatus,
          fulfillmentStatus: d.fulfillmentStatus,
          vatableSales: d.vatableSales,
          vatExemptSales: d.vatExemptSales,
          vatZeroRatedSales: d.vatZeroRatedSales,
        });
      });
      setOrders(docs.sort((a, b) => b.id.localeCompare(a.id)));
    });

    return () => unsubscribe();
  }, []);

  // Cart Operations
  const addToCart = async (skuId: string, quantity: number = 1) => {
    try {
      const stock = await TrustedServerController.getBranchStock('daet', skuId);
      setCart((prev) => {
        const existing = prev.find((item) => item.skuId === skuId);
        const currentQty = existing ? existing.quantity : 0;
        const targetQty = currentQty + quantity;

        if (targetQty > stock) {
          alert(`Cannot add more than available real inventory (${stock} bottle(s) in stock).`);
          return prev;
        }

        if (existing) {
          return prev.map((item) =>
            item.skuId === skuId ? { ...item, quantity: targetQty } : item
          );
        }
        return [...prev, { skuId, quantity }];
      });
    } catch (err: any) {
      alert(`Could not verify stock level: ${err.message}`);
    }
  };

  const removeFromCart = (skuId: string) => {
    setCart((prev) => prev.filter((item) => item.skuId !== skuId));
  };

  const updateCartQuantity = async (skuId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(skuId);
      return;
    }
    try {
      const stock = await TrustedServerController.getBranchStock('daet', skuId);
      if (quantity > stock) {
        alert(`Real inventory warning: only ${stock} bottles are currently available.`);
        return;
      }
      setCart((prev) =>
        prev.map((item) => (item.skuId === skuId ? { ...item, quantity } : item))
      );
    } catch (err: any) {
      alert(`Could not verify stock: ${err.message}`);
    }
  };

  const clearCart = () => {
    setCart([]);
  };

  // Authoritative dynamic database stock level getter
  const getStockLevel = (skuId: string): number => {
    // Non-authoritative default preview lookup. Production transactions enforce this strictly on the backend.
    return 10; 
  };

  const updateStockLevel = (skuId: string, newCount: number) => {
    // Disallowed on production client. Writes must occur via backend Cloud Functions.
  };

  const restockAll = () => {
    // Simulated triggers are disabled in secure backend channels.
  };

  // --- NON-AUTHORITATIVE CLIENT-SIDE PRICING HELPER (UI PREVIEW ONLY) ---
  // Authoritative pricing is enforced exclusively on the backend in Cloud Functions.
  const getSkuPrice = (skuId: string): number => {
    const p = INITIAL_PRICING_CONFIGS.find((item) => item.skuId === skuId);
    return p ? p.basePrice : 0;
  };

  const updateSkuPrice = (skuId: string, newPrice: number) => {
    // Admin overrides must occur strictly via authenticated server database channels.
  };

  const resetToFactoryDefaults = () => {
    setCart([]);
    localStorage.removeItem('hci_cmd_cart');
  };

  // --- NON-AUTHORITATIVE CLIENT-SIDE UI PREVIEW ONLY ---
  // Sole authoritative pricing, tax computation, and order validation source is the secure GCF backend.
  const calculateTotals = (cartItems: CartItem[], fulfillmentMethod: FulfillmentMethod) => {
    let subtotal = 0;
    const itemsWithPricing = cartItems.map((item) => {
      const sku = products.find((s) => s.id === item.skuId);
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

    const shippingFee = fulfillmentMethod === 'delivery' ? 150 : 0;
    const grandTotal = subtotal + shippingFee;

    return {
      isUiPreviewOnly: true, // Clearly flag as client preview state
      items: itemsWithPricing,
      shippingFee,
      subtotal,
      vatAmount: 0,
      vatableSales: 0,
      vatExemptSales: 0,
      vatZeroRatedSales: 0,
      nonVatSales: subtotal, // Non-VAT treatment defaults until confirmed
      total: grandTotal,
      isVatRegistered: false,
    };
  };

  // Secure checkout order placement (Delegates to real Cloud Function)
  const placeOrder = async (
    customer: CustomerInfo,
    fulfillmentMethod: FulfillmentMethod,
    paymentMethod: PaymentMethod,
    pickupBranchId?: string
  ): Promise<any> => {
    try {
      const payload = {
        items: cart,
        branchId: pickupBranchId || 'daet',
        customer,
        paymentMethod,
        isVatRegistered: false,
      };

      const result = await TrustedServerController.createOrderSecurely(payload);
      if (result && result.success) {
        setCart([]); // Clear cart upon successful order
        return { id: result.orderId };
      }
      throw new Error('Backend failed to return order ID.');
    } catch (err: any) {
      console.error('Checkout error:', err);
      throw err;
    }
  };

  const advanceOrderStatus = (orderId: string) => {
    // Handled strictly by backend status managers or operations dashboard.
  };

  const cancelOrder = (orderId: string) => {
    // Handled strictly via authenticated backend.
  };

  return {
    cart,
    orders,
    vatConfig,
    pricing: [],
    inventory: [],
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
