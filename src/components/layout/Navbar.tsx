/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PageView } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useTheme, FontSize } from '../../context/ThemeContext';
import { AuthModal } from '../auth/AuthModal';
import {
  ShoppingCart,
  Menu,
  X,
  Shield,
  User,
  LogOut,
  ChevronDown,
  Sun,
  Moon,
  Type,
  Minus,
  Plus,
} from 'lucide-react';

interface NavbarProps {
  currentView: PageView;
  onNavigate: (view: PageView) => void;
  cartCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, cartCount }) => {
  const { user, profile, logout } = useAuth();
  const { theme, toggleTheme, fontSize, setFontSize, increaseFontSize, decreaseFontSize } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState<boolean>(false);
  const [fontMenuOpen, setFontMenuOpen] = useState<boolean>(false);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);

  const isStaff =
    profile?.role === 'branch_manager' ||
    profile?.role === 'regional_director' ||
    profile?.role === 'super_admin';

  // Streamlined primary navigation links (Redress, FAQ, Contact, Legal moved to footer)
  const navLinks: { view: PageView; label: string }[] = [
    { view: 'home', label: 'Home' },
    { view: 'about', label: 'About' },
    { view: 'education', label: 'Mineral Science' },
    { view: 'products', label: 'Products' },
    { view: 'consultations', label: 'Consultations' },
    { view: 'workshops', label: 'Workshops' },
    { view: 'branches', label: 'Branches' },
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
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 transition-colors shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-18">
            {/* Brand Logo & Territory Tag matching HCI CMD Image Branding */}
            <div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => handleNav('home')}
            >
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-700 text-white font-black shadow-md flex items-center justify-center transition-all group-hover:scale-105 border border-sky-400/30">
                <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none">
                  <path d="M20 6 C16 16, 9 22, 9 29 A11 11 0 0 0 31 29 C31 22, 24 16, 20 6 Z" fill="#ffffff" />
                  <ellipse cx="20" cy="30" rx="14" ry="4.5" stroke="#38bdf8" strokeWidth="2.5" fill="none" />
                  <text x="20" y="30" textAnchor="middle" fill="#0284c7" fontSize="7.5" fontWeight="900" fontFamily="sans-serif">CMD</text>
                </svg>
              </div>
              <div>
                <div className="font-black text-base sm:text-lg text-slate-900 dark:text-white tracking-tight leading-none">
                  HCI CMD
                </div>
                <div className="text-[11px] text-sky-700 dark:text-sky-400 font-extrabold tracking-wider mt-0.5">
                  CELL MINERAL DROPS
                </div>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1.5" aria-label="Main Navigation">
              {navLinks.map((link) => (
                <button
                  key={link.view}
                  onClick={() => handleNav(link.view)}
                  className={`px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                    currentView === link.view
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-sky-700 dark:hover:text-white hover:bg-sky-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {link.label}
                </button>
              ))}
            </nav>

            {/* Action Controls: Accessibility, Theme, Staff Ops, Cart, Auth */}
            <div className="hidden sm:flex items-center gap-2">
              {/* Font Size Scaling Control */}
              <div className="relative">
                <button
                  onClick={() => setFontMenuOpen(!fontMenuOpen)}
                  title="Adjust Reading Text Size"
                  aria-label="Adjust text size"
                  className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-sky-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition flex items-center gap-1 text-xs font-bold"
                >
                  <Type className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  <span className="uppercase text-[11px]">
                    {fontSize === 'normal' ? '100%' : fontSize === 'large' ? '112%' : fontSize === 'xlarge' ? '125%' : '150%'}
                  </span>
                </button>

                {fontMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-2 z-50 text-xs space-y-1">
                    <div className="px-3 py-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                      Reading Text Size
                    </div>
                    <button
                      onClick={() => {
                        setFontSize('normal');
                        setFontMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between font-medium ${
                        fontSize === 'normal'
                          ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400 font-bold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>Normal (Standard)</span>
                      <span className="text-[10px] text-slate-400">100%</span>
                    </button>
                    <button
                      onClick={() => {
                        setFontSize('large');
                        setFontMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between font-medium ${
                        fontSize === 'large'
                          ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400 font-bold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>Large (Comfort)</span>
                      <span className="text-[10px] text-slate-400">112%</span>
                    </button>
                    <button
                      onClick={() => {
                        setFontSize('xlarge');
                        setFontMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between font-medium ${
                        fontSize === 'xlarge'
                          ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400 font-bold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>Extra Large (High Zoom)</span>
                      <span className="text-[10px] text-slate-400">125%</span>
                    </button>
                    <button
                      onClick={() => {
                        setFontSize('huge');
                        setFontMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between font-medium ${
                        fontSize === 'huge'
                          ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400 font-bold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>Maximum (Accessibility)</span>
                      <span className="text-[10px] text-slate-400">150%</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Light / Dark Mode Toggle */}
              <button
                onClick={toggleTheme}
                title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                aria-label="Toggle Color Theme"
                className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-sky-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition"
              >
                {theme === 'light' ? (
                  <Moon className="w-4 h-4 text-slate-700" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-400" />
                )}
              </button>

              {/* Staff Ops Badge if authorized */}
              {isStaff && (
                <button
                  onClick={() => handleNav('admin')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition flex items-center gap-1.5 ${
                    currentView === 'admin'
                      ? 'bg-sky-600 text-white border-sky-600'
                      : 'bg-slate-100 dark:bg-slate-800 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950/30'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Staff Ops</span>
                </button>
              )}

              {/* Shopping Cart Button */}
              <button
                onClick={() => handleNav('cart')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                  currentView === 'cart' || cartCount > 0
                    ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:text-sky-700 dark:hover:text-white'
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Cart</span>
                {cartCount > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] font-mono font-black rounded-full bg-white text-sky-700 dark:bg-slate-950 dark:text-sky-400">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* User Account / Sign In */}
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-sky-500 text-xs text-sky-700 dark:text-sky-300 font-semibold rounded-lg flex items-center gap-2 transition"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span className="max-w-[120px] truncate">{displayName}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-2 z-50 text-xs space-y-1">
                      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                        <p className="font-bold text-slate-900 dark:text-slate-200 truncate">{displayName}</p>
                        <p className="text-[10px] text-sky-600 dark:text-sky-400 uppercase font-mono mt-0.5">
                          {profile?.role || 'Customer'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleNav('orders')}
                        className="w-full text-left px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                      >
                        📄 My Orders
                      </button>
                      <button
                        onClick={() => handleNav('consultations')}
                        className="w-full text-left px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                      >
                        🌿 My Consultations
                      </button>
                      <button
                        onClick={() => handleNav('workshops')}
                        className="w-full text-left px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                      >
                        📅 My Workshops
                      </button>
                      <button
                        onClick={() => handleNav('support')}
                        className="w-full text-left px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                      >
                        ⚖️ Redress & Complaints
                      </button>
                      {isStaff && (
                        <button
                          onClick={() => handleNav('admin')}
                          className="w-full text-left px-3 py-2 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-lg transition font-semibold"
                        >
                          🛡️ Staff Operations
                        </button>
                      )}
                      <button
                        onClick={() => {
                          logout();
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition flex items-center gap-1.5"
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
                  className="px-3.5 py-1.5 bg-sky-50 dark:bg-sky-500/10 border border-sky-300 dark:border-sky-500/40 hover:bg-sky-100 dark:hover:bg-sky-500/20 text-xs font-semibold text-sky-700 dark:text-sky-300 rounded-lg transition flex items-center gap-1.5"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
              )}
            </div>

            {/* Mobile Actions: Font, Theme, Cart, Hamburger */}
            <div className="flex items-center gap-2 lg:hidden">
              {/* Mobile Font Button */}
              <button
                onClick={() => {
                  if (fontSize === 'normal') setFontSize('large');
                  else if (fontSize === 'large') setFontSize('xlarge');
                  else if (fontSize === 'xlarge') setFontSize('huge');
                  else setFontSize('normal');
                }}
                title="Cycle Text Size"
                className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold"
              >
                <Type className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              </button>

              {/* Mobile Theme Button */}
              <button
                onClick={toggleTheme}
                title="Toggle Theme"
                className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700"
              >
                {theme === 'light' ? (
                  <Moon className="w-4 h-4 text-slate-700" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-400" />
                )}
              </button>

              {/* Mobile Cart */}
              <button
                onClick={() => handleNav('cart')}
                className="p-2 bg-slate-100 dark:bg-slate-800 text-sky-700 dark:text-sky-400 rounded-lg border border-slate-200 dark:border-slate-700 relative"
              >
                <ShoppingCart className="w-4 h-4" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1 text-[9px] font-bold bg-sky-600 text-white rounded-full">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg border border-slate-200 dark:border-slate-700"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-4 space-y-2 text-sm shadow-lg">
            {navLinks.map((link) => (
              <button
                key={link.view}
                onClick={() => handleNav(link.view)}
                className={`w-full text-left px-3.5 py-2.5 rounded-lg font-semibold transition ${
                  currentView === link.view
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {link.label}
              </button>
            ))}

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
              {user ? (
                <>
                  <div className="px-3.5 py-1 text-slate-500 dark:text-slate-400 text-xs">
                    Signed in as <span className="text-sky-700 dark:text-sky-400 font-bold">{displayName}</span> (
                    {profile?.role})
                  </div>
                  <button
                    onClick={() => handleNav('orders')}
                    className="w-full text-left px-3.5 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                  >
                    📄 My Orders
                  </button>
                  <button
                    onClick={() => handleNav('consultations')}
                    className="w-full text-left px-3.5 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                  >
                    🌿 My Consultations
                  </button>
                  <button
                    onClick={() => handleNav('workshops')}
                    className="w-full text-left px-3.5 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                  >
                    📅 My Workshops
                  </button>
                  <button
                    onClick={() => handleNav('support')}
                    className="w-full text-left px-3.5 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                  >
                    ⚖️ Redress & Complaints
                  </button>
                  {isStaff && (
                    <button
                      onClick={() => handleNav('admin')}
                      className="w-full text-left px-3.5 py-2 bg-sky-50 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 font-bold rounded-lg"
                    >
                      🛡️ Staff Operations
                    </button>
                  )}
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg"
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
                  className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg text-center shadow-sm"
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
