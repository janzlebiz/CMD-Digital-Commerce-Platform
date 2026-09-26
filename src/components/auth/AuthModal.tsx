/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
  const { loginWithEmail, registerWithEmail, loginWithGoogle, loading, error, clearError } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTabSwitch = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setLocalError(null);
    clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email || !password) {
      setLocalError('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters long.');
      return;
    }

    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
      } else {
        if (!firstName || !lastName) {
          setLocalError('First and Last name are required for account registration.');
          return;
        }
        await registerWithEmail(email, password, firstName, lastName);
      }
      onClose();
    } catch (err: any) {
      // Error handled by AuthContext or caught here
    }
  };

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    clearError();
    try {
      await loginWithGoogle();
      onClose();
    } catch (err: any) {
      // Error handled by AuthContext
    }
  };

  const activeError = localError || error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-slate-100 relative">
        {/* Header with Close Button */}
        <div className="p-6 pb-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-serif font-bold text-amber-400">
              {mode === 'login' ? 'Customer Account Login' : 'Register New Account'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              HCI CMD Digital Commerce · Camarines Norte
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Mode Switch Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/50">
          <button
            type="button"
            onClick={() => handleTabSwitch('login')}
            className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition ${
              mode === 'login'
                ? 'text-amber-400 border-b-2 border-amber-400 bg-slate-900/80'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch('register')}
            className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition ${
              mode === 'register'
                ? 'text-amber-400 border-b-2 border-amber-400 bg-slate-900/80'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Register
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {activeError && (
            <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-300 text-xs flex items-start gap-2">
              <span className="shrink-0 font-bold">⚠️</span>
              <span>{activeError}</span>
            </div>
          )}

          {/* Google Quick Sign In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium text-xs rounded-xl border border-slate-700 transition flex items-center justify-center gap-2 focus:ring-2 focus:ring-amber-500 outline-none"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="flex items-center gap-3 my-2">
            <div className="h-[1px] bg-slate-800 flex-1" />
            <span className="text-[10px] font-mono text-slate-500 uppercase">Or Email & Password</span>
            <div className="h-[1px] bg-slate-800 flex-1" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'register' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jane"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
            >
              {loading ? (
                <span className="animate-spin text-sm">⏳</span>
              ) : mode === 'login' ? (
                'Sign In'
              ) : (
                'Create Customer Account'
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800 text-[10px] text-slate-400 text-center">
          🔒 Secure Firebase Auth Session · Protected under RA 10173 Privacy Rules
        </div>
      </div>
    </div>
  );
};
