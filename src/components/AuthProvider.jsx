"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { apiPfad } from "@/lib/apiBasis";
import { hasSupabaseEnv, getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { getStore } from "@/lib/store";
import { DEMO_ROUND_ID } from "@/lib/constants";
import { DEMO_USER } from "@/lib/session";
import { leseAnmeldung } from "@/lib/anmeldung";
import { useRueckmeldung } from "@/components/Rueckmeldung";

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
  // 🔴 Anzeige-Einstellungen am KONTO statt nur im Browser. Dieselbe Ablage
  // wie die Fanfarben: `user_metadata` reist mit dem Nutzer, ohne Schema- oder
  // RLS-Änderung. Nach einem Zurücksetzen, einer Neuinstallation oder auf
  // einem zweiten Gerät sind die Stufen damit wieder da — vorher lagen sie nur
  // im localStorage und waren weg.
  prefs: (u.user_metadata?.prefs && typeof u.user_metadata.prefs === "object") ? u.user_metadata.prefs : null,
});

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(hasSupabaseEnv ? null : DEMO_USER);
  const [loading, setLoading] = useState(hasSupabaseEnv);
  const melder = useRueckmeldung();
  // ⚠️ In einem Ref und nicht in der Abhängigkeitsliste des Effekts: sonst
  // würde sich der Auth-Listener bei jeder neuen Meldung neu aufhängen — und
  // ein Listener, der sich beim Melden abmeldet, verpasst das nächste Ereignis.
  const melderRef = useRef(melder);
  melderRef.current = melder;
  // Merkt sich, wer schon begrüßt wurde. `onAuthStateChange` feuert auch beim
  // stillen Erneuern des Tokens — ohne diese Sperre stünde alle paar Minuten
  // „Angemeldet als …" auf dem Schirm.
  const begruesst = useRef(null);

  useEffect(() => {
    if (!hasSupabaseEnv) return; // Mock: Demo-Nutzer bleibt bestehen
    const sb = getSupabaseBrowserClient();

    const apply = (sessionUser) => {
      if (!sessionUser) { setUser(null); return; }
      const abgebildet = mapUser(sessionUser);
      setUser(abgebildet);
      // 🔴 Andis „feedback dass eingeloggt … ist" (24.08.2026). Genau hier und
      // nicht im Login-Screen: der Weg über den Magic-Link kommt gar nicht
      // durch das Formular zurück, sondern durch diesen Listener.
      if (begruesst.current !== sessionUser.id) {
        begruesst.current = sessionUser.id;
        melderRef.current.gespeichert(`Angemeldet als ${abgebildet.name}`);
      }
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

  // 🔴 Der zweite Weg hinein — und für die App auf dem HOME-BILDSCHIRM der
  // einzige, der funktioniert (gemessen am 07.08.2026 auf Andis iPhone).
  //
  // Der Magic-Link scheitert dort bauartbedingt: die Mail-App öffnet ihn in
  // SAFARI, und iOS gibt einer zum Home-Bildschirm hinzugefügten Web-App einen
  // EIGENEN Speicher. Die Anmeldung landet im Browser, während die App-Kachel
  // ausgeloggt bleibt. Das ist kein Fehler bei uns — so trennt iOS die beiden.
  //
  // Mit dem Code verlässt man die App nie: Mail lesen, sechs Ziffern
  // eintippen, fertig. Der Link bleibt daneben bestehen, weil er auf dem
  // Rechner der bequemere Weg ist.
  //
  // 🔴 GEÄNDERT am 08.08.2026, weil die Voraussetzung nicht herstellbar war:
  // Damit die Mail einen sechsstelligen Code enthält, müsste in Supabase unter
  // Authentication → Emails → „Magic Link" `{{ .Token }}` stehen — und genau
  // das lässt der GRATIS-Tarif nicht zu („Set up custom SMTP to edit
  // templates"). Die Standard-Mail trägt nur den Link.
  //
  // Deshalb nimmt dieses Feld BEIDES: den Code, falls er je in der Mail steht,
  // und den KOPIERTEN LINK aus der Standard-Mail — in ihm steckt derselbe
  // Token als `token_hash`. Damit funktioniert die Anmeldung in der
  // Home-Bildschirm-App, ohne dass an Supabase etwas geändert werden muss.
  // Was drinsteht, entscheidet `leseAnmeldung` (`src/lib/anmeldung.js`).
  const verifyCode = async (email, eingabe) => {
    const sb = getSupabaseBrowserClient();
    if (!sb) throw new Error("Supabase nicht konfiguriert.");
    const gelesen = leseAnmeldung(eingabe);
    if (gelesen.art === "leer") throw new Error("Bitte den Code oder den Link aus der Mail einsetzen.");
    if (gelesen.art === "unklar") throw new Error(gelesen.grund);

    // ⚠️ Beim LINK darf `email` NICHT mitgeschickt werden: `verifyOtp` prüft
    // dann Adresse UND Token gegeneinander, und der token_hash-Weg ist auf
    // sich allein gestellt gedacht. Beim getippten Code gehört sie dazu.
    const { error } = gelesen.art === "link"
      ? await sb.auth.verifyOtp({ token_hash: gelesen.token, type: gelesen.typ })
      : await sb.auth.verifyOtp({ email, token: gelesen.token, type: "email" });
    if (error) throw error;
  };

  const signOut = async () => {
    const sb = getSupabaseBrowserClient();
    await sb?.auth.signOut();
    setUser(null);
    // Zurücksetzen, sonst bliebe die nächste Anmeldung DESSELBEN Kontos stumm.
    begruesst.current = null;
    melder.info("Abgemeldet");
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

  // Anzeige-Einstellungen am KONTO speichern → sie überleben Zurücksetzen,
  // Neuinstallation und Gerätewechsel. Bauart wörtlich wie `saveFanColors`:
  // `user_metadata` braucht weder Schema- noch RLS-Änderung.
  //
  // ⚠️ Ohne Login ein NO-OP, kein Fehler. Im Mock-Betrieb und vor der
  // Anmeldung gibt es kein Konto, an dem etwas hängen könnte — dann trägt
  // allein der localStorage. Ein Wurf an dieser Stelle würde die Einstellungen
  // unbenutzbar machen, solange man nicht angemeldet ist.
  const savePrefs = async (prefs) => {
    const sb = getSupabaseBrowserClient();
    if (!sb || !user) return;
    const { data, error } = await sb.auth.updateUser({ data: { prefs } });
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
    const res = await fetch(apiPfad("/api/account/delete"), {
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
      signInWithEmail, verifyCode, signOut, updateName, saveFanColors, savePrefs,
      exportMyData, deleteAccount,
    }}>
      {children}
    </AuthCtx.Provider>
  );
}
