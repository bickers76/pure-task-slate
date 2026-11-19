import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, SESSION_EXPIRED_EVENT } from "@/lib/api";

export interface User {
  id: string;
  email: string;
}

interface SessionState {
  user: User | null;
  /** True on a brand-new install, before the owner account exists. */
  needsSetup: boolean;
}

const SESSION_KEY = ["session"];

export function useAuth() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: SESSION_KEY,
    queryFn: () => api<SessionState>("/auth/session"),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  // Any request that comes back "not signed in" drops the app to the sign-in screen.
  useEffect(() => {
    const onExpired = () =>
      queryClient.setQueryData<SessionState>(SESSION_KEY, { user: null, needsSetup: false });
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [queryClient]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const session = await api<SessionState>("/auth/login", { method: "POST", body: { email, password } });
      queryClient.setQueryData(SESSION_KEY, session);
    },
    [queryClient]
  );

  const setup = useCallback(
    async (code: string, email: string, password: string) => {
      const session = await api<SessionState>("/auth/setup", {
        method: "POST",
        body: { code, email, password },
      });
      queryClient.setQueryData(SESSION_KEY, session);
    },
    [queryClient]
  );

  const signOut = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } finally {
      queryClient.setQueryData<SessionState>(SESSION_KEY, { user: null, needsSetup: false });
      // Drop every cached task and project, but keep the session entry the
      // mounted screens are subscribed to.
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== SESSION_KEY[0] });
    }
  }, [queryClient]);

  return {
    user: data?.user ?? null,
    needsSetup: data?.needsSetup ?? false,
    loading: isLoading,
    signIn,
    setup,
    signOut,
  };
}
