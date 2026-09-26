'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, orgApi } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  role: string;
  _count?: { members: number; projects: number };
}

interface AuthContextType {
  user: User | null;
  organizations: Organization[];
  currentOrg: Organization | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  setCurrentOrg: (org: Organization) => void;
  refreshOrgs: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrgState] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('scalix_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      const res = await authApi.me();
      setUser(res.data.data);

      const orgRes = await orgApi.list();
      setOrganizations(orgRes.data.data);

      // Restore selected org
      const savedOrgId = localStorage.getItem('scalix_org_id');
      if (savedOrgId) {
        const savedOrg = orgRes.data.data.find((o: Organization) => o.id === savedOrgId);
        if (savedOrg) {
          setCurrentOrgState(savedOrg);
        } else if (orgRes.data.data.length > 0) {
          setCurrentOrgState(orgRes.data.data[0]);
          localStorage.setItem('scalix_org_id', orgRes.data.data[0].id);
        }
      } else if (orgRes.data.data.length > 0) {
        setCurrentOrgState(orgRes.data.data[0]);
        localStorage.setItem('scalix_org_id', orgRes.data.data[0].id);
      }
    } catch {
      localStorage.removeItem('scalix_token');
      localStorage.removeItem('scalix_org_id');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    localStorage.setItem('scalix_token', res.data.data.token);
    setUser(res.data.data.user);
    await refreshOrgs();
  };

  const register = async (email: string, password: string, name: string) => {
    const res = await authApi.register({ email, password, name });
    localStorage.setItem('scalix_token', res.data.data.token);
    setUser(res.data.data.user);
  };

  const logout = () => {
    localStorage.removeItem('scalix_token');
    localStorage.removeItem('scalix_org_id');
    setUser(null);
    setOrganizations([]);
    setCurrentOrgState(null);
    window.location.href = '/login';
  };

  const setCurrentOrg = (org: Organization) => {
    setCurrentOrgState(org);
    localStorage.setItem('scalix_org_id', org.id);
  };

  const refreshOrgs = async () => {
    try {
      const orgRes = await orgApi.list();
      setOrganizations(orgRes.data.data);

      if (orgRes.data.data.length > 0 && !currentOrg) {
        setCurrentOrgState(orgRes.data.data[0]);
        localStorage.setItem('scalix_org_id', orgRes.data.data[0].id);
      }
    } catch (error) {
      console.error('Failed to refresh organizations:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organizations,
        currentOrg,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        setCurrentOrg,
        refreshOrgs,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
