/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { PageView } from './types';
import { StatutoryBanner } from './components/layout/StatutoryBanner';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';

import { HomeView } from './views/HomeView';
import { AboutView } from './views/AboutView';
import { EducationView } from './views/EducationView';
import { ProductsView } from './views/ProductsView';
import { BranchesView } from './views/BranchesView';
import { FaqView } from './views/FaqView';
import { ContactView } from './views/ContactView';
import { ComplianceView } from './views/ComplianceView';
import { TermsView } from './views/TermsView';
import { PrivacyView } from './views/PrivacyView';
import { ReturnsView } from './views/ReturnsView';

// Phase 2 E-Commerce Views & Hooks
import { CartView } from './views/CartView';
import { CheckoutView } from './views/CheckoutView';
import { OrdersView } from './views/OrdersView';
import { AdminDashboardView } from './views/AdminDashboardView';
import { useEcommerce } from './hooks/useEcommerce';
import { AuthProvider } from './context/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}

function MainLayout() {
  const [currentView, setCurrentView] = useState<PageView>('home');
  const ecommerce = useEcommerce();

  // Sync route with URL hash for bookmarking and browser back/forward buttons
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as PageView;
      const validViews: PageView[] = [
        'home',
        'about',
        'education',
        'products',
        'branches',
        'faq',
        'contact',
        'compliance',
        'terms',
        'privacy',
        'returns',
        'cart',
        'checkout',
        'orders',
        'admin',
      ];
      if (validViews.includes(hash)) {
        setCurrentView(hash);
      } else if (!hash) {
        setCurrentView('home');
      }
    };

    // Initial check
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigate = (view: PageView) => {
    setCurrentView(view);
    window.location.hash = view === 'home' ? '' : view;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'home':
        return <HomeView onNavigate={handleNavigate} />;
      case 'about':
        return <AboutView onNavigate={handleNavigate} />;
      case 'education':
        return <EducationView onNavigate={handleNavigate} />;
      case 'products':
        return (
          <ProductsView
            onNavigate={handleNavigate}
            addToCart={ecommerce.addToCart}
            getStockLevel={ecommerce.getStockLevel}
            getSkuPrice={ecommerce.getSkuPrice}
          />
        );
      case 'branches':
        return <BranchesView onNavigate={handleNavigate} />;
      case 'faq':
        return <FaqView onNavigate={handleNavigate} />;
      case 'contact':
        return <ContactView onNavigate={handleNavigate} />;
      case 'compliance':
        return <ComplianceView onNavigate={handleNavigate} />;
      case 'terms':
        return <TermsView onNavigate={handleNavigate} />;
      case 'privacy':
        return <PrivacyView onNavigate={handleNavigate} />;
      case 'returns':
        return <ReturnsView onNavigate={handleNavigate} />;
      
      // Phase 2 cases
      case 'cart':
        return (
          <CartView
            cart={ecommerce.cart}
            onNavigate={handleNavigate}
            updateCartQuantity={ecommerce.updateCartQuantity}
            removeFromCart={ecommerce.removeFromCart}
            getSkuPrice={ecommerce.getSkuPrice}
            getStockLevel={ecommerce.getStockLevel}
            vatConfig={ecommerce.vatConfig}
            setVatConfig={ecommerce.setVatConfig}
          />
        );
      case 'checkout':
        return (
          <CheckoutView
            cart={ecommerce.cart}
            onNavigate={handleNavigate}
            getSkuPrice={ecommerce.getSkuPrice}
            getStockLevel={ecommerce.getStockLevel}
            calculateTotals={ecommerce.calculateTotals}
            placeOrder={ecommerce.placeOrder}
          />
        );
      case 'orders':
        return (
          <OrdersView
            orders={ecommerce.orders}
            onNavigate={handleNavigate}
            advanceOrderStatus={(orderId) => {
              const ord = ecommerce.orders.find((o) => o.id === orderId);
              ecommerce.advanceOrderStatus(orderId, ord?.fulfillmentStatus || 'pending_processing');
            }}
            cancelOrder={ecommerce.cancelOrder}
            restockAll={ecommerce.restockAll}
          />
        );
      case 'admin':
        return <AdminDashboardView onNavigate={handleNavigate} />;
      default:
        return <HomeView onNavigate={handleNavigate} />;
    }
  };

  const totalCartCount = ecommerce.cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Statutory Regulatory Advisory */}
      <StatutoryBanner />

      {/* Responsive Main Navigation Header */}
      <Navbar currentView={currentView} onNavigate={handleNavigate} cartCount={totalCartCount} />

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 focus:outline-none">
        {renderCurrentView()}
      </main>

      {/* Comprehensive Legal, Branch Directory & Compliance Footer */}
      <Footer onNavigate={handleNavigate} />
    </div>
  );
}
