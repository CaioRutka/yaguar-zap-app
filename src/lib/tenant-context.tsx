'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

type TenantCtx = {
  tenantId: string;
  setTenantId: (id: string) => void;
};

const TenantContext = createContext<TenantCtx | null>(null);

const STORAGE_KEY = 'yaguarzap:tenantId';
const DEFAULT_TENANT = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID ?? 'default';

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenantId, setTenantIdRaw] = useState(DEFAULT_TENANT);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setTenantIdRaw(stored);
    setHydrated(true);
  }, []);

  const setTenantId = useCallback((id: string) => {
    setTenantIdRaw(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  if (!hydrated) return null;

  return (
    <TenantContext.Provider value={{ tenantId, setTenantId }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant(): TenantCtx {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used within TenantProvider');
  return ctx;
}
