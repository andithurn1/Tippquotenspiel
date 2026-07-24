"use client";

import { createContext, useContext, useState, useEffect, useRef, useCallback, Fragment } from "react";
import { applyFanColors, resetTheme, sanitizeFanColors } from "@/lib/theme";
import { useAuth } from "@/components/AuthProvider";

// ── Fanfarben-Theme (Vereinsfarben) ─────────────────────────
// Hält die gewählten Vereinsfarben und legt sie über applyFanColors() auf die
// gemeinsamen Akzent-Tokens. Da die Screens diese Tokens als reine Werte lesen
// (kein Kontext), wird die Kind-Ebene bei jeder Änderung über einen wechselnden
// `key` neu gemountet — so lesen alle Screens die neuen Farben, ohne dass eine
// einzige Screen-Datei angefasst werden muss.
//
// Persistenz zweistufig:
//  • localStorage (tqs.theme.v1) → sofort & auch ohne Login (Gerät-Cache).
//  • Nutzerprofil (Supabase user_metadata via useAuth) → geräteübergreifend.
//    Eingeloggt gewinnt der Server-Wert und wird in den localStorage gespiegelt.
const KEY = "tqs.theme.v1";

const ThemeCtx = createContext({ fanColors: [], setFanColors: () => {}, reset: () => {} });
export const useTheme = () => useContext(ThemeCtx);

function load() {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    return raw ? sanitizeFanColors(JSON.parse(raw)) : [];
  } catch { return []; }
}
function persistLocal(clean) {
  try {
    if (clean.length) localStorage.setItem(KEY, JSON.stringify(clean));
    else localStorage.removeItem(KEY);
  } catch {}
}

export default function ThemeProvider({ children }) {
  const { user, isMock, saveFanColors } = useAuth();
  const [fanColors, setColors] = useState([]);
  const [version, setVersion] = useState(0);
  const appliedRef = useRef([]); // was derzeit auf den Tokens liegt

  const apply = useCallback((clean) => {
    if (clean.length) applyFanColors(clean);
    else resetTheme();
    appliedRef.current = clean;
    setColors(clean);
    setVersion((v) => v + 1); // Remount → Screens lesen die aktualisierten Tokens
  }, []);

  // Erst NACH der Hydration den Gerät-Cache anwenden: SSR und erster
  // Client-Render bleiben auf den Grundfarben → keine Hydration-Diskrepanz.
  useEffect(() => {
    const saved = load();
    if (saved.length) apply(saved);
  }, [apply]);

  // Sobald ein eingeloggter Nutzer mit Profil-Farben da ist: die gewinnen und
  // werden in den localStorage gespiegelt (geräteübergreifend konsistent).
  useEffect(() => {
    if (isMock || !user) return;
    const server = sanitizeFanColors(user.fanColors);
    if (server.length && JSON.stringify(server) !== JSON.stringify(appliedRef.current)) {
      persistLocal(server);
      apply(server);
    }
  }, [user, isMock, apply]);

  const setFanColors = useCallback((next) => {
    const clean = sanitizeFanColors(next);
    persistLocal(clean);
    apply(clean);
    if (!isMock && user) saveFanColors(clean).catch(() => {}); // aufs Profil, still
  }, [apply, isMock, user, saveFanColors]);

  const reset = useCallback(() => setFanColors([]), [setFanColors]);

  return (
    <ThemeCtx.Provider value={{ fanColors, setFanColors, reset }}>
      <Fragment key={version}>{children}</Fragment>
    </ThemeCtx.Provider>
  );
}
