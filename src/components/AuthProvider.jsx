"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { hasSupabaseEnv, getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { getStore } from "@/lib/store";
import { DEMO_ROUND_ID } from "@/lib/constants";
import { DEMO_USER } from "@/lib/session";

// ── Auth-Context: EINE Quelle für den eingeloggten Nutzer ────
// Mock-Betrieb (keine Supabase-Env): immer der Demo-Nutzer „Du".
// Live-Betrieb: echte Session aus supabase.auth, inkl. Auto-Beitritt
// zur gemeinsamen Freundeskreis-Runde beim ersten Login.
const AuthCtx = createContext({ user: DEMO_USER, loading: false, isMock: true });

export const useAuth = () => useContext(AuthCtx);

const mapUser = (u) => ({
  id: u.id,
  name: u.user_metadata?.display_name || u.email?.split("@")[0] || "Ich",
  email: u.email,
});

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(hasSupabaseEnv ? null : DEMO_USER);
  const [loading, setLoading] = useState(hasSupabaseEnv);

  useEffect(() => {
    if (!hasSupabaseEnv) return; // Mock: Demo-Nutzer bleibt bestehen
    const sb = getSupabaseBrowserClient();

    const apply = (sessionUser) => {
      if (!sessionUser) { setUser(null); return; }
      setUser(mapUser(sessionUser));
      // Auto-Beitritt zur Runde (idempotent); Fehler still schlucken.
      getStore().joinRound?.({ roundId: DEMO_ROUND_ID, userId: sessionUser.id }).catch(() => {});
    };

    sb.auth.getSession().then(({ data }) => { apply(data.session?.user ?? null); setLoading(false); });
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => apply(session?.user ?? null));
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  const signInWithEmail = async (email) => {
    const sb = getSupabaseBrowserClient();
    if (!sb) throw new Error("Supabase nicht konfiguriert.");
    const emailRedirectTo = typeof window !== "undefined" ? window.location.origin : undefined;
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo } });
    if (error) throw error;
  };

  const signOut = async () => {
    const sb = getSupabaseBrowserClient();
    await sb?.auth.signOut();
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, isMock: !hasSupabaseEnv, signInWithEmail, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
}
