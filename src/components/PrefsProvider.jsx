"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { DEFAULT_PREFS, sanitizePrefs } from "@/lib/prefs";

// Anzeige-Einstellungen als Context. Persistiert im localStorage (pro Browser/
// Nutzer). SSR startet mit den Defaults; nach dem Mounten werden die
// gespeicherten Werte übernommen — daher keine Hydration-Konflikte.
const KEY = "tqs.prefs.v1";
const Ctx = createContext({ prefs: DEFAULT_PREFS, setPref: () => {}, ready: false });

export const usePrefs = () => useContext(Ctx);

export default function PrefsProvider({ children }) {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setPrefs(sanitizePrefs(JSON.parse(raw)));
    } catch { /* localStorage nicht verfügbar → Defaults */ }
    setReady(true);
  }, []);

  const setPref = (key, value) =>
    setPrefs((p) => {
      const next = sanitizePrefs({ ...p, [key]: value });
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignorieren */ }
      return next;
    });

  return <Ctx.Provider value={{ prefs, setPref, ready }}>{children}</Ctx.Provider>;
}
