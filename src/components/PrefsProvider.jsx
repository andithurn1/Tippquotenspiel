"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { DEFAULT_PREFS, sanitizePrefs } from "@/lib/prefs";
import { useAuth } from "@/components/AuthProvider";

// Anzeige-Einstellungen als Context. Persistiert im localStorage (pro Browser/
// Nutzer). SSR startet mit den Defaults; nach dem Mounten werden die
// gespeicherten Werte übernommen — daher keine Hydration-Konflikte.
const KEY = "tqs.prefs.v1";
const Ctx = createContext({ prefs: DEFAULT_PREFS, setPref: () => {}, ready: false });

export const usePrefs = () => useContext(Ctx);

export default function PrefsProvider({ children }) {
  const { user, savePrefs } = useAuth();
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setPrefs(sanitizePrefs(JSON.parse(raw)));
    } catch { /* localStorage nicht verfügbar → Defaults */ }
    setReady(true);
  }, []);

  // 🔴 Die Einstellungen liegen zusätzlich am KONTO (`user_metadata`, wie die
  // Fanfarben) — sonst wären sie nach einem Zurücksetzen, einer
  // Neuinstallation oder auf einem zweiten Gerät weg. Der localStorage bleibt
  // die schnelle Kopie: er trägt vor dem Login und ohne Netz.
  //
  // ⚠️ Beim Anmelden GEWINNT das Konto, und zwar nur EINMAL je Sitzung
  // (`uebernommen`). Ohne diese Sperre überschriebe die Kontofassung jede
  // Änderung sofort wieder, die man gerade vorgenommen hat — man verstellt
  // etwas, und es springt zurück.
  const [uebernommen, setUebernommen] = useState(false);
  useEffect(() => {
    if (!ready || uebernommen || !user?.prefs) return;
    setPrefs(sanitizePrefs(user.prefs));
    try { localStorage.setItem(KEY, JSON.stringify(sanitizePrefs(user.prefs))); } catch { /* egal */ }
    setUebernommen(true);
  }, [ready, uebernommen, user?.prefs]);

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
      // Durchschreiben ans Konto — ohne `await`, weil eine Anzeige-Stufe nicht
      // auf das Netz warten darf. Schlägt es fehl, bleibt der localStorage die
      // gültige Fassung und der nächste Klick versucht es erneut.
      savePrefs?.(next)?.catch?.(() => {});
      return next;
    });

  // 🔴 Die Bewegungs-Stufe ins DOKUMENT schreiben (Andi, 25.08.2026).
  // Dieselbe Bauart wie `schreibeCssVariablen()` bei den Fanfarben und aus
  // demselben Grund: das Stylesheet kann keine React-Zustände lesen, und eine
  // Komponente, die die Stufe durchreicht, müsste sie an JEDE Stelle
  // durchreichen, an der etwas animiert ist.
  //
  // ⚠️ Ein Attribut am `<html>`, nicht am Provider-`<div>`: Rückmeldungen und
  // Übergänge hängen an einer Ebene DARÜBER (`Rueckmeldung` liegt in
  // `layout.js` ganz außen), die ein Attribut weiter innen nicht sähe.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const wurzel = document.documentElement;
    if (prefs.bewegung && prefs.bewegung !== "voll") {
      wurzel.setAttribute("data-bewegung", prefs.bewegung);
    } else {
      // Bei „voll" das Attribut ENTFERNEN statt auf "voll" zu setzen: so
      // greift ausschließlich der `prefers-reduced-motion`-Block, und die
      // Geräte-Einstellung bleibt unangetastet.
      wurzel.removeAttribute("data-bewegung");
    }
  }, [prefs.bewegung]);

  return <Ctx.Provider value={{ prefs, setPref, ready }}>{children}</Ctx.Provider>;
}
