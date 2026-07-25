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

// Nutzer aus der Supabase-Session ableiten. `nameSet` = ob der Anzeigename
// bewusst gewählt wurde (vs. aus der E-Mail abgeleiteter Platzhalter) →
// steuert das einmalige Namens-Onboarding nach dem ersten Login.
// `fanColors` = am Profil (user_metadata) gespeicherte Vereinsfarben → damit
// sind sie geräteübergreifend, ohne Schema-/RLS-Änderung.
const mapUser = (u) => ({
  id: u.id,
  name: u.user_metadata?.display_name || u.email?.split("@")[0] || "Ich",
  email: u.email,
  nameSet: Boolean(u.user_metadata?.display_name),
  fanColors: Array.isArray(u.user_metadata?.fan_colors) ? u.user_metadata.fan_colors : [],
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

    // persistSession + autoRefreshToken (siehe supabaseClient.js) sorgen dafür,
    // dass der Nutzer nach dem Magic-Link dauerhaft eingeloggt bleibt — die
    // Session liegt im localStorage und wird automatisch erneuert.
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

  // Anzeigenamen setzen/ändern — sowohl in den Auth-Metadaten (Quelle für
  // mapUser) als auch in der profiles-Zeile (Quelle fürs Leaderboard).
  const updateName = async (name) => {
    const clean = String(name || "").trim().slice(0, 40);
    if (!clean) throw new Error("Bitte einen Namen eingeben.");
    const sb = getSupabaseBrowserClient();
    if (!sb) throw new Error("Supabase nicht konfiguriert.");
    const { data, error } = await sb.auth.updateUser({ data: { display_name: clean } });
    if (error) throw error;
    if (data?.user) {
      await sb.from("profiles").update({ display_name: clean }).eq("id", data.user.id);
      setUser(mapUser(data.user));
    }
  };

  // Vereinsfarben am Profil (user_metadata) speichern → geräteübergreifend.
  // Im Mock/ohne Login ein No-Op (dann greift nur der localStorage-Cache).
  const saveFanColors = async (colors) => {
    const sb = getSupabaseBrowserClient();
    if (!sb || !user) return;
    const clean = Array.isArray(colors) ? colors.slice(0, 3) : [];
    const { data, error } = await sb.auth.updateUser({ data: { fan_colors: clean } });
    if (error) throw error;
    if (data?.user) setUser(mapUser(data.user));
  };

  // Auskunftsrecht (Art. 15 DSGVO): alle eigenen Daten als JSON-Objekt.
  // RLS erlaubt jedem, ausschließlich die eigenen Zeilen zu lesen.
  const exportMyData = async () => {
    const sb = getSupabaseBrowserClient();
    if (!sb || !user) throw new Error("Nicht eingeloggt.");
    const [{ data: profile }, { data: tips }, { data: memberships }] = await Promise.all([
      sb.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      sb.from("tips").select("*").eq("user_id", user.id),
      sb.from("round_members").select("*").eq("user_id", user.id),
    ]);
    return {
      exportiert_am: new Date().toISOString(),
      konto: { id: user.id, email: user.email },
      profil: profile ?? null,
      einstellungen: { anzeigename: user.name, fan_colors: user.fanColors ?? [] },
      tipps: tips ?? [],
      runden_mitgliedschaften: memberships ?? [],
    };
  };

  // Recht auf Löschung (Art. 17 DSGVO): serverseitige Route löscht den
  // auth.users-Eintrag; das DB-Schema räumt per ON DELETE CASCADE alles
  // Übrige (Profil, Tipps, Mitgliedschaften) automatisch mit ab.
  const deleteAccount = async () => {
    const sb = getSupabaseBrowserClient();
    if (!sb || !user) throw new Error("Nicht eingeloggt.");
    const { data: { session } } = await sb.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error("Keine gültige Sitzung.");
    const res = await fetch("/api/account/delete", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Löschen fehlgeschlagen.");
    }
    await sb.auth.signOut();
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{
      user, loading, isMock: !hasSupabaseEnv,
      signInWithEmail, signOut, updateName, saveFanColors, exportMyData, deleteAccount,
    }}>
      {children}
    </AuthCtx.Provider>
  );
}
