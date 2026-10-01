/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { ShieldCheck, Lock, User, CheckCircle, X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { loginDemoUser } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>('customer');
  const [email, setEmail] = useState<string>('customer@example.com');
  const [branchId, setBranchId] = useState<string>('daet');
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    if (role === 'customer') setEmail('customer@example.com');
    if (role === 'practitioner') setEmail('dr.santos@hcicmd.ph');
    if (role === 'branch_manager') setEmail('manager.daet@hcicmd.ph');
    if (role === 'regional_director') setEmail('director.bicol@hcicmd.ph');
    if (role === 'super_admin') setEmail('admin@hcicmd.ph');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await loginDemoUser(selectedRole, email, selectedRole === 'branch_manager' ? branchId : undefined);
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 text-slate-900 dark:text-slate-100 shadow-2xl relative space-y-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 text-xs font-bold mb-2">
            <ShieldCheck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>RBAC Access Authentication</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Sign In to HCI CMD Platform</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Choose a persona role below to authenticate with canonical access permissions.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">Select Access Role</label>
            <div className="grid grid-cols-1 gap-2">
              {[
                { role: 'customer', label: 'Customer / Patient', desc: 'Shop, place orders, book consultations' },
                { role: 'practitioner', label: 'Wellness Practitioner', desc: 'Manage patient consultations & KMS notes' },
                { role: 'branch_manager', label: 'Branch Manager (Daet)', desc: 'Branch inventory & order fulfillment' },
                { role: 'regional_director', label: 'Regional Director (Bicol)', desc: 'Multi-branch oversight & audit logs' },
                { role: 'super_admin', label: 'Super Admin', desc: 'Full global system administration' },
              ].map((item) => (
                <div
                  key={item.role}
                  onClick={() => handleRoleChange(item.role as UserRole)}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                    selectedRole === item.role
                      ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-slate-900 dark:text-white ring-1 ring-sky-500'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-slate-600 dark:text-slate-400 hover:border-sky-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    checked={selectedRole === item.role}
                    onChange={() => handleRoleChange(item.role as UserRole)}
                    className="mt-1 text-sky-600"
                  />
                  <div className="text-xs">
                    <div className="font-bold text-slate-900 dark:text-slate-100">{item.label}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Email Identifier</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In as Selected Persona'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
