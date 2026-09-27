/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PageView } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { AuthModal } from '../auth/AuthModal';
import { ShoppingCart, Menu, X, Shield, User, LogOut, ChevronDown } from 'lucide-react';

interface NavbarProps {
  currentView: PageView;
  onNavigate: (view: PageView) => void;
  cartCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, cartCount }) => {
  const { user, profile, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState<boolean>(false);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);

  const isStaff =
    profile?.role === 'branch_manager' ||
    profile?.role === 'regional_director' ||
    profile?.role === 'super_admin';

  const navLinks: { view: PageView; label: string }[] = [
    { view: 'home', label: 'Home' },
    { view: 'about', label: 'About HCI CMD' },
    { view: 'education', label: 'Mineral Science' },
    { view: 'products', label: 'Product Catalog' },
    { view: 'consultations', label: '🌿 Consultations' },
    { view: 'workshops', label: '📅 Workshops' },
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

  const displayName = profile
    ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || profile.email
    : 'Account';

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo & Territory Tag */}
            <div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => handleNav('home')}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 font-black text-lg shadow-md group-hover:scale-105 transition">
                CMD
              </div>
              <div>
                <div className="font-extrabold text-sm sm:text-base text-white tracking-tight flex items-center gap-2">
                  HCI Cell Mineral Drops
                </div>
                <div className="text-[10px] text-amber-400/90 uppercase tracking-widest font-mono">
                  Camarines Norte Network
                </div>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden xl:flex items-center gap-1">
              {navLinks.map((link) => (
                <button
                  key={link.view}
                  onClick={() => handleNav(link.view)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                    currentView === link.view
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {link.label}
                </button>
              ))}
            </nav>

            {/* Action Bar: Staff Ops, Cart, Auth */}
            <div className="hidden sm:flex items-center gap-2.5">
              {isStaff && (
                <button
                  onClick={() => handleNav('admin')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition flex items-center gap-1.5 ${
                    currentView === 'admin'
                      ? 'bg-amber-500 text-slate-950 border-amber-500'
                      : 'bg-slate-800/80 text-amber-300 border-amber-500/40 hover:bg-amber-500/10'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Staff Ops</span>
                </button>
              )}

              <button
                onClick={() => handleNav('cart')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                  currentView === 'cart' || cartCount > 0
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 border border-slate-700 hover:text-white'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Cart</span>
                {cartCount > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] font-mono font-black rounded-full bg-slate-950 text-amber-400">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* User Dropdown */}
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="px-3 py-1.5 bg-slate-800 border border-slate-700 hover:border-amber-500 text-xs text-amber-300 font-semibold rounded-lg flex items-center gap-2 transition"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span className="max-w-[120px] truncate">{displayName}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 text-xs space-y-1">
                      <div className="px-3 py-2 border-b border-slate-800">
                        <p className="font-bold text-slate-200 truncate">{displayName}</p>
                        <p className="text-[10px] text-amber-400 uppercase font-mono mt-0.5">
                          {profile?.role || 'Customer'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleNav('orders')}
                        className="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition"
                      >
                        📄 My Orders
                      </button>
                      <button
                        onClick={() => handleNav('consultations')}
                        className="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition"
                      >
                        🌿 My Consultations
                      </button>
                      <button
                        onClick={() => handleNav('workshops')}
                        className="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition"
                      >
                        📅 My Workshops
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
                        onClick={() => {
                          logout();
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-red-400 hover:bg-red-950/40 rounded-lg transition flex items-center gap-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/40 hover:bg-amber-500/20 text-xs font-semibold text-amber-300 rounded-lg transition flex items-center gap-1.5"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
              )}
            </div>

            {/* Mobile Menu Trigger */}
            <div className="flex items-center gap-2 xl:hidden">
              <button
                onClick={() => handleNav('cart')}
                className="p-2 bg-slate-800 text-amber-400 rounded-lg relative"
              >
                <ShoppingCart className="w-4 h-4" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1 text-[9px] font-bold bg-amber-500 text-slate-950 rounded-full">
                    {cartCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 bg-slate-800 text-slate-300 hover:text-white rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="xl:hidden bg-slate-900 border-b border-slate-800 px-4 py-4 space-y-2 text-xs">
            {navLinks.map((link) => (
              <button
                key={link.view}
                onClick={() => handleNav(link.view)}
                className={`w-full text-left px-3 py-2 rounded-lg font-semibold transition ${
                  currentView === link.view
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                {link.label}
              </button>
            ))}

            <div className="pt-3 border-t border-slate-800 space-y-2">
              {user ? (
                <>
                  <div className="px-3 py-1 text-slate-400">
                    Signed in as <span className="text-amber-400 font-bold">{displayName}</span> (
                    {profile?.role})
                  </div>
                  <button
                    onClick={() => handleNav('orders')}
                    className="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-800 rounded-lg"
                  >
                    📄 My Orders
                  </button>
                  <button
                    onClick={() => handleNav('consultations')}
                    className="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-800 rounded-lg"
                  >
                    🌿 My Consultations
                  </button>
                  <button
                    onClick={() => handleNav('workshops')}
                    className="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-800 rounded-lg"
                  >
                    📅 My Workshops
                  </button>
                  {isStaff && (
                    <button
                      onClick={() => handleNav('admin')}
                      className="w-full text-left px-3 py-2 bg-amber-500/20 text-amber-300 font-bold rounded-lg"
                    >
                      🛡️ Staff Operations
                    </button>
                  )}
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-red-400 hover:bg-slate-800 rounded-lg"
                  >
                    🚪 Sign Out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setAuthModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2 bg-amber-500 text-slate-950 font-bold rounded-lg text-center"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
};
