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

  // 🔴 `value` darf eine FUNKTION sein: `setPref("vergleich", (v) => …)` bekommt
  // den aktuellen Wert und liefert den neuen.
  //
  // Ohne das rechnet jeder Aufruf gegen den Stand, den die Komponente beim
  // Rendern gesehen hat — zwei Klicks kurz hintereinander gehen beide von
  // demselben alten Wert aus, und der zweite überschreibt den ersten.
  // Im Browser gemessen (07.08.2026): drei Mitspieler nacheinander angehakt,
  // gespeichert war EINER. Derselbe Zustands-Fehler, den `Ereignisse.jsx`
  // schon einmal dokumentiert hat („zwei `setzeFeld`-Aufrufe gingen beide von
  // demselben alten `cfg` aus") — nur fällt er hier nicht beim Lesen auf,
  // sondern erst beim schnellen Klicken.
  const setPref = (key, value) =>
    setPrefs((p) => {
      const neuerWert = typeof value === "function" ? value(p[key]) : value;
      const next = sanitizePrefs({ ...p, [key]: neuerWert });
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignorieren */ }
      return next;
    });

  return <Ctx.Provider value={{ prefs, setPref, ready }}>{children}</Ctx.Provider>;
}
