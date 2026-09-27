/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  loginDemoUser: (role: UserRole, email: string, branchId?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  loginDemoUser: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize demo session from localStorage or default
  useEffect(() => {
    const savedProfile = localStorage.getItem('hci_cmd_demo_user');
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        setProfile(parsed);
        setUser({
          uid: parsed.uid,
          email: parsed.email,
          getIdToken: async () => `DEMO_TOKEN_${parsed.role.toUpperCase()}`,
        });
      } catch {
        localStorage.removeItem('hci_cmd_demo_user');
      }
    }
    setLoading(false);
  }, []);

  const loginDemoUser = async (role: UserRole, email: string, branchId?: string) => {
    const uid = `demo-${role}-${Date.now().toString().slice(-4)}`;
    const newProfile: UserProfile = {
      uid,
      email,
      role,
      assignedBranchId: branchId || (role === 'branch_manager' ? 'daet' : undefined),
      firstName: role === 'super_admin' ? 'Super' : role === 'practitioner' ? 'Dr. Elena' : 'Client',
      lastName: role === 'super_admin' ? 'Admin' : role === 'practitioner' ? 'Santos' : 'User',
      createdAt: new Date().toISOString(),
    };

    setProfile(newProfile);
    setUser({
      uid: newProfile.uid,
      email: newProfile.email,
      getIdToken: async () => `DEMO_TOKEN_${newProfile.role.toUpperCase()}`,
    });
    localStorage.setItem('hci_cmd_demo_user', JSON.stringify(newProfile));
  };

  const logout = async () => {
    setUser(null);
    setProfile(null);
    localStorage.removeItem('hci_cmd_demo_user');
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, loginDemoUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
