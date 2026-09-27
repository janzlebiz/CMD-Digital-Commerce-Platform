/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PageView } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { AuthModal } from '../auth/AuthModal';

interface NavbarProps {
  currentView: PageView;
  onNavigate: (view: PageView) => void;
  cartCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, cartCount = 0 }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const { user, profile, logout } = useAuth();

  const isStaff =
    profile?.role === 'branch_manager' ||
    profile?.role === 'regional_director' ||
    profile?.role === 'super_admin' ||
    (profile?.role as string) === 'staff' ||
    (profile?.role as string) === 'admin';

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
    setUserDropdownOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    await logout();
    setUserDropdownOpen(false);
  };

  const displayName = profile?.firstName
    ? `${profile.firstName} ${profile.lastName || ''}`.trim()
    : user?.email || 'Customer';

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 text-slate-100 transition-colors print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Brand Logo & Editorial Title */}
            <button
              onClick={() => handleNav('home')}
              className="flex flex-col text-left group focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none rounded p-1 -ml-1 transition shrink-0"
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
                Cell Mineral Drops · Regional Information & Education Platform
              </span>
            </button>

            {/* Desktop Actions and Links Wrapper */}
            <div className="hidden lg:flex items-center space-x-6">
              {/* Desktop Navigation Links */}
              <nav className="flex items-center space-x-1" aria-label="Main Navigation">
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

              {/* Vertical separator */}
              <div className="h-6 w-[1px] bg-slate-800" aria-hidden="true" />

              {/* E-Commerce & Auth Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNav('orders')}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none ${
                    currentView === 'orders'
                      ? 'bg-slate-900 text-amber-400 border border-slate-700'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent'
                  }`}
                >
                  <span>📄 My Invoices</span>
                </button>

                {isStaff && (
                  <button
                    onClick={() => handleNav('admin')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded transition flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none ${
                      currentView === 'admin'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-slate-900 text-slate-300 hover:text-white hover:border-slate-700 border border-slate-800'
                    }`}
                  >
                    <span>🛡️ Staff Ops</span>
                  </button>
                )}

                <button
                  onClick={() => handleNav('cart')}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded transition flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none ${
                    currentView === 'cart' || cartCount > 0
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-slate-900 text-slate-300 border border-slate-800 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <span>🛒 Cart</span>
                  {cartCount > 0 && (
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-mono font-black rounded-full ${
                        currentView === 'cart' ? 'bg-slate-950 text-amber-400' : 'bg-amber-950 text-amber-300'
                      }`}
                    >
                      {cartCount}
                    </span>
                  )}
                </button>

                {/* User Identity / Auth Dropdown */}
                {user ? (
                  <div className="relative">
                    <button
                      onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                      className="px-3 py-1.5 bg-slate-900 border border-slate-700 hover:border-amber-500 text-xs text-amber-300 font-medium rounded-lg flex items-center gap-2 transition"
                    >
                      <span>👤 {displayName}</span>
                      <span className="text-[10px] text-slate-400">▼</span>
                    </button>

                    {userDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 text-xs">
                        <div className="px-3 py-2 border-b border-slate-800 text-slate-400">
                          <p className="font-bold text-slate-200 truncate">{displayName}</p>
                          <p className="text-[10px] text-amber-400 uppercase font-mono mt-0.5">
                            {profile?.role || 'Customer'}
                          </p>
                        </div>
                        <button
                          onClick={() => handleNav('orders')}
                          className="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition mt-1"
                        >
                          📄 My Orders
                        </button>
                        {isStaff && (
                          <button
                            onClick={() => handleNav('admin')}
                            className="w-full text-left px-3 py-2 text-amber-300 hover:bg-amber-950/40 rounded-lg transition font-semibold"
                          >
                            🛡️ Staff Operations
                          </button>
                        )}
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-3 py-2 text-red-400 hover:bg-red-950/40 rounded-lg transition"
                        >
                          🚪 Logout
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => setAuthModalOpen(true)}
                    className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/40 hover:bg-amber-500/20 text-xs font-semibold text-amber-300 rounded-lg transition flex items-center gap-1.5"
                  >
                    <span>🔑 Sign In</span>
                  </button>
                )}
              </div>
            </div>

            {/* Mobile E-Commerce Cart Shortcut and Mobile Menu Button */}
            <div className="flex items-center gap-3 lg:hidden">
              {/* Quick Mobile Cart Button */}
              <button
                onClick={() => handleNav('cart')}
                className="p-2 relative text-slate-300 hover:text-white focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none rounded transition"
                aria-label="View Shopping Cart"
              >
                <span className="text-lg">🛒</span>
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 font-mono font-black text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center border border-slate-950">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* Mobile Auth Button */}
              {user ? (
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="p-2 text-amber-400 font-bold text-xs bg-slate-900 border border-slate-800 rounded-lg"
                >
                  👤
                </button>
              ) : (
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="px-2.5 py-1 bg-amber-500 text-slate-950 font-bold text-xs rounded-lg"
                >
                  Sign In
                </button>
              )}

              {/* Mobile Menu Open Toggle */}
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
          <div className="lg:hidden border-t border-slate-800 bg-slate-950 px-4 pt-3 pb-6 space-y-4 shadow-xl">
            {user && (
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-200">{displayName}</p>
                  <p className="text-[10px] text-amber-400 font-mono uppercase">{profile?.role || 'Customer'}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-2.5 py-1 bg-red-950/60 border border-red-800 text-red-300 text-[11px] font-medium rounded-lg"
                >
                  Logout
                </button>
              </div>
            )}

            {/* Main Navigation links */}
            <div className="space-y-1">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider px-3 py-1">
                Information Sections
              </div>
              {navLinks.map((link) => {
                const isActive = currentView === link.view;
                return (
                  <button
                    key={link.view}
                    onClick={() => handleNav(link.view)}
                    className={`block w-full text-left px-3 py-2 text-sm font-medium rounded transition-colors ${
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

            {/* Mobile E-Commerce specific sections */}
            <div className="space-y-1 pt-2 border-t border-slate-800/80">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider px-3 py-1">
                E-Commerce Terminal
              </div>

              <button
                onClick={() => handleNav('cart')}
                className={`flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded transition-colors ${
                  currentView === 'cart'
                    ? 'bg-amber-950/40 text-amber-300 font-semibold border-l-2 border-amber-400'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-1.5">🛒 Shopping Cart</span>
                {cartCount > 0 && (
                  <span className="bg-amber-500 text-slate-950 font-mono font-black text-xs px-2 py-0.5 rounded-full">
                    {cartCount} Items
                  </span>
                )}
              </button>

              <button
                onClick={() => handleNav('orders')}
                className={`flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded transition-colors ${
                  currentView === 'orders'
                    ? 'bg-amber-950/40 text-amber-300 font-semibold border-l-2 border-amber-400'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-1.5">📄 My Invoices & Trackers</span>
              </button>

              {isStaff && (
                <button
                  onClick={() => handleNav('admin')}
                  className={`flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded transition-colors ${
                    currentView === 'admin'
                      ? 'bg-amber-950/40 text-amber-300 font-semibold border-l-2 border-amber-400'
                      : 'text-amber-400 hover:bg-slate-900 hover:text-amber-300'
                  }`}
                >
                  <span className="flex items-center gap-1.5 font-semibold">🛡️ Staff Operations</span>
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Auth Modal */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
};

