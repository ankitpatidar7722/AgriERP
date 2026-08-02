"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, tokenStore } from "@/lib/api-client";
import type { AuthResponse, CurrentUser } from "@/types/api";

interface AuthContextValue {
  user: CurrentUser | null;
  /** True until the stored session has been checked, so guards do not flash. */
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (userName: string, password: string) => Promise<CurrentUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  /** Mirrors the server's permission check; the server still enforces it. */
  can: (permission: string) => boolean;
  canAny: (...permissions: string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      // Show the cached user immediately so the shell renders without a flash,
      // then confirm with the server - the cached copy can be stale if the
      // user's role changed since they last signed in.
      const cached = tokenStore.readUser<CurrentUser>();
      if (cached && !cancelled) setUser(cached);

      if (!tokenStore.access) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      try {
        const fresh = await apiGet<CurrentUser>("/auth/me");
        if (!cancelled) {
          setUser(fresh);
          tokenStore.saveUser(fresh);
        }
      } catch {
        // The api-client already redirects to /login when the refresh token is
        // dead; nothing useful to add here.
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (userName: string, password: string) => {
    const auth = await apiPost<AuthResponse>("/auth/login", { userName, password });
    tokenStore.save(auth);
    setUser(auth.user);
    return auth.user;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = tokenStore.refresh;
    try {
      // Best effort: the server revokes the refresh token so the session cannot
      // be resumed elsewhere. A failure here must not trap the user in the app.
      if (refreshToken) await apiPost("/auth/logout", { refreshToken });
    } catch {
      /* ignored on purpose */
    } finally {
      tokenStore.clear();
      setUser(null);
      router.push("/login");
    }
  }, [router]);

  const refreshUser = useCallback(async () => {
    const fresh = await apiGet<CurrentUser>("/auth/me");
    setUser(fresh);
    tokenStore.saveUser(fresh);
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const permissions = new Set(user?.permissions ?? []);
    return {
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      logout,
      refreshUser,
      can: (permission: string) => permissions.has(permission),
      canAny: (...list: string[]) => list.some((permission) => permissions.has(permission)),
    };
  }, [user, isLoading, login, logout, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>.");
  return context;
}
