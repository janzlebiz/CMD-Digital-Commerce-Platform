/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PageView } from '../../types';

interface NavbarProps {
  currentView: PageView;
  onNavigate: (view: PageView) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks: { view: PageView; label: string }[] = [
    { view: 'home', label: 'Home' },
    { view: 'about', label: 'About HCI CMD' },
    { view: 'education', label: 'Mineral Science' },
    { view: 'products', label: 'Product Catalog' },
    { view: 'branches', label: '6 Branches' },
    { view: 'faq', label: 'FAQ' },
    { view: 'contact', label: 'Contact' },
    { view: 'compliance', label: 'Compliance & Legal' },
  ];

  const handleNav = (view: PageView) => {
    onNavigate(view);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 text-slate-100 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo & Editorial Title */}
          <button
            onClick={() => handleNav('home')}
            className="flex flex-col text-left group focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none rounded p-1 -ml-1 transition"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-serif font-black tracking-tight text-white group-hover:text-amber-400 transition-colors">
                HCI CMD<span className="text-amber-400 text-sm align-super">™</span>
              </span>
              <span className="text-xs font-mono font-medium text-amber-400/90 uppercase tracking-widest hidden sm:inline">
                Camarines Norte
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-sans tracking-wide">
              Cell Mineral Drops · Official Regional Information & Distribution
            </span>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1" aria-label="Main Navigation">
            {navLinks.map((link) => {
              const isActive = currentView === link.view;
              return (
                <button
                  key={link.view}
                  onClick={() => handleNav(link.view)}
                  className={`px-3 py-2 text-xs font-medium tracking-wide transition-colors relative focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none rounded ${
                    isActive
                      ? 'text-amber-300 font-semibold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-amber-400" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Mobile Menu Button */}
          <div className="flex items-center lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-300 hover:text-white focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none rounded"
              aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
              aria-expanded={mobileMenuOpen}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-950 px-4 pt-3 pb-6 space-y-1 shadow-xl">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider px-3 py-1">
            Navigation Menu
          </div>
          {navLinks.map((link) => {
            const isActive = currentView === link.view;
            return (
              <button
                key={link.view}
                onClick={() => handleNav(link.view)}
                className={`block w-full text-left px-3 py-2.5 text-sm font-medium rounded transition-colors ${
                  isActive
                    ? 'bg-amber-950/40 text-amber-300 font-semibold border-l-2 border-amber-400'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {link.label}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
