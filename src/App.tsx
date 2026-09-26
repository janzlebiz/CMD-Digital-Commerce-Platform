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

export default function App() {
  const [currentView, setCurrentView] = useState<PageView>('home');

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
        return <ProductsView onNavigate={handleNavigate} />;
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
      default:
        return <HomeView onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Statutory Regulatory Advisory */}
      <StatutoryBanner />

      {/* Responsive Main Navigation Header */}
      <Navbar currentView={currentView} onNavigate={handleNavigate} />

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 focus:outline-none">
        {renderCurrentView()}
      </main>

      {/* Comprehensive Legal, Branch Directory & Compliance Footer */}
      <Footer onNavigate={handleNavigate} />
    </div>
  );
}
