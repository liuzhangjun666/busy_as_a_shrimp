"use client";

import { useEffect, useMemo, useState } from "react";
import { useUserStore, type UserRole } from "./user-store";

type AuthStatus = {
  hydrated: boolean;
  isLoggedIn: boolean;
  token: string;
  phone: string;
  role: UserRole;
  logout: () => void;
};

export function useAuthStatus(): AuthStatus {
  const token = useUserStore((state) => state.token);
  const tokenExpiresAt = useUserStore((state) => state.tokenExpiresAt);
  const phone = useUserStore((state) => state.phone);
  const role = useUserStore((state) => state.role);
  const logout = useUserStore((state) => state.logout);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !token) {
      return;
    }

    if (Date.now() >= tokenExpiresAt) {
      logout();
    }
  }, [hydrated, logout, token, tokenExpiresAt]);

  const isLoggedIn = useMemo(() => {
    if (!hydrated || !token) {
      return false;
    }

    return Date.now() < tokenExpiresAt;
  }, [hydrated, token, tokenExpiresAt]);

  return {
    hydrated,
    isLoggedIn,
    token: isLoggedIn ? token : "",
    phone: isLoggedIn ? phone : "",
    role,
    logout
  };
}
