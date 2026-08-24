"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AMPEL, C, MONO, RUND, TEXT } from "@/lib/theme";

// ============================================================
//  RÜCKMELDUNG — die Antwort der App auf eine Handlung
//
//  🔴 Andi am 24.08.2026, wörtlich:
//
//    „ich will wirklich das ganze dann in ne richtig professionell
//     aussehende app mit entsprechender UX haben und flüssige (kleine
//     animationen) bspw bei neuem fenster laden oder feedback dass
//     eingeloggt und abgespeichert ist etc…"
//
//  ⚠️ **Was hier gefehlt hat, war nicht die Animation — es war die Antwort.**
//  Die Bewegungs-Schicht in `globals.css` stand schon: Druck, Leuchten,
//  Fenster-Übergänge. Was es NICHT gab, war irgendeine Stelle, an der die App
//  sagt „ist gespeichert". Ein Tipp wurde abgegeben und der Screen sah danach
//  aus wie davor. Genau das ist der Unterschied zwischen „hat funktioniert"
//  und „fühlt sich fertig an".
//
//  ── Warum eine SCHICHT und kein Hinweis je Screen ──
//  Ein Speichern-Hinweis, den jeder Screen selbst baut, sieht in jedem Screen
//  anders aus und fehlt in dem einen, an den niemand gedacht hat. Dieselbe
//  Sache wie bei der zweiten Wahrheit in CLAUDE.md — nur für Gestaltung
//  statt für Zahlen.
//
//  ── Drei Arten, mehr nicht ──
//    ✅ gespeichert  etwas ist durchgegangen        (grün, 2,2 s)
//    ⚠️ fehler       etwas ist NICHT durchgegangen  (rot, 5 s, bleibt länger)
//    ℹ️ info         etwas ist passiert             (neutral, 2,8 s)
//
//  Ein Fehler steht länger als ein Erfolg: „gespeichert" darf man verpassen,
//  „nicht gespeichert" nicht.
//
//  ⚠️ Die Meldung ist BEIWERK. Sie darf nie der einzige Ort sein, an dem eine
//  Information steht — wer zwei Sekunden wegsieht, hat sie verpasst. Was
//  bleiben muss, gehört auf den Screen.
// ============================================================

const Ctx = createContext(null);

// Wie lange eine Meldung steht, je Art. In Millisekunden.
const STANDZEIT = { gespeichert: 2200, fehler: 5000, info: 2800 };

// ⚠️ Grün und Rot kommen aus `AMPEL`, nicht aus einer eigenen Farbe: die
// Bedeutung „gut / schlecht" hat im Projekt genau einen Ort, und eine
// Meldung ist derselbe Gedanke wie eine Ampel — nur flüchtig.
const AUSSEHEN = {
  gespeichert: { icon: "✅", farbe: () => AMPEL.gruen },
  fehler:      { icon: "⚠️", farbe: () => AMPEL.rot },
  info:        { icon: "ℹ️", farbe: () => C.akzent },
};

let laufendeId = 0;

export function RueckmeldungProvider({ children }) {
  const [meldungen, setMeldungen] = useState([]);
  // Timer je Meldung, damit ein vorzeitiges Wegtippen den Timer mit aufräumt
  // und nicht später eine schon entfernte Id noch einmal entfernt.
  const timer = useRef(new Map());

  const weg = useCallback((id) => {
    setMeldungen((m) => m.filter((x) => x.id !== id));
    const t = timer.current.get(id);
    if (t) { clearTimeout(t); timer.current.delete(id); }
  }, []);

  const melde = useCallback((text, art = "info") => {
    const sauber = String(text ?? "").trim();
    if (!sauber) return null;
    const id = ++laufendeId;
    setMeldungen((m) => {
      // ⚠️ Dieselbe Meldung zweimal hintereinander (Doppelklick auf
      // „Speichern") stapelt sich nicht, sie erneuert sich. Zwei identische
      // Streifen übereinander sehen nach Fehler aus, nicht nach Bestätigung.
      const ohneGleiche = m.filter((x) => !(x.text === sauber && x.art === art));
      // Höchstens drei gleichzeitig — darüber verdeckt der Stapel den Screen,
      // um den es eigentlich geht.
      return [...ohneGleiche, { id, text: sauber, art }].slice(-3);
    });
    timer.current.set(id, setTimeout(() => weg(id), STANDZEIT[art] ?? STANDZEIT.info));
    return id;
  }, [weg]);

  useEffect(() => {
    const offen = timer.current;
    return () => { offen.forEach(clearTimeout); offen.clear(); };
  }, []);

  const wert = useMemo(() => ({
    melde,
    gespeichert: (t = "Gespeichert") => melde(t, "gespeichert"),
    fehler: (t) => melde(t, "fehler"),
    info: (t) => melde(t, "info"),
  }), [melde]);

  return (
    <Ctx.Provider value={wert}>
      {children}
      <Streifen meldungen={meldungen} onWeg={weg} />
    </Ctx.Provider>
  );
}

// 🔴 Gibt einen funktionierenden Notbehelf zurück, wenn der Provider fehlt —
// KEINEN Fehler. Ein vergessener Provider darf nicht dazu führen, dass sich
// ein Tipp nicht mehr abgeben lässt: die Meldung ist Beiwerk, das Speichern
// ist die Sache. Die Warnung steht in der Konsole, damit es trotzdem auffällt.
const NOTBEHELF = {
  melde: (t, a) => { if (typeof console !== "undefined") console.warn(`[rueckmeldung ohne Provider] ${a}: ${t}`); return null; },
};
NOTBEHELF.gespeichert = (t = "Gespeichert") => NOTBEHELF.melde(t, "gespeichert");
NOTBEHELF.fehler = (t) => NOTBEHELF.melde(t, "fehler");
NOTBEHELF.info = (t) => NOTBEHELF.melde(t, "info");

export function useRueckmeldung() {
  return useContext(Ctx) ?? NOTBEHELF;
}

// ============================================================
//  Der Streifen selbst
//
//  Sitzt UNTEN, nicht oben: oben liegt auf dem Handy die Statusleiste und in
//  den meisten Screens die Kopfzeile — eine Meldung dort verdeckt genau das,
//  was man gerade gelesen hat. Unten ist außerdem der Daumen.
//
//  ⚠️ `pointerEvents: "none"` auf dem Rahmen, `"auto"` auf der Meldung: der
//  Streifen darf nicht den halben Screen blockieren, nur weil er ihn
//  überspannt. Getippt wird die Meldung, nicht der Platz daneben.
// ============================================================
function Streifen({ meldungen, onWeg }) {
  if (!meldungen.length) return null;
  return (
    <div
      // `status` statt `alert`: eine Bestätigung soll den Screenreader nicht
      // unterbrechen, sondern sich einreihen.
      role="status"
      aria-live="polite"
      style={{
        position: "fixed", left: 0, right: 0,
        // Über der Sicherheitszone am unteren Rand — sonst liegt die Meldung
        // auf dem iPhone unter dem Home-Balken.
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        padding: "0 16px", zIndex: 9000, pointerEvents: "none",
      }}
    >
      {meldungen.map((m) => {
        const a = AUSSEHEN[m.art] ?? AUSSEHEN.info;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onWeg(m.id)}
            className="tqs-meldung tqs-aktion"
            aria-label={`${m.text} — antippen zum Schließen`}
            style={{
              pointerEvents: "auto",
              display: "flex", alignItems: "center", gap: 10,
              width: "100%", maxWidth: "var(--tqs-schirm-breite)",
              textAlign: "left",
              padding: "12px 14px",
              borderRadius: RUND.karte,
              border: `1px solid ${a.farbe()}`,
              background: C.ink2,
              color: C.text,
              fontSize: TEXT.subhead,
              fontFamily: "inherit",
              cursor: "pointer",
              boxShadow: "0 12px 32px rgba(17, 20, 28, 0.16)",
            }}
          >
            <span aria-hidden style={{ fontSize: TEXT.callout, lineHeight: 1 }}>{a.icon}</span>
            <span style={{ flex: 1, lineHeight: 1.35 }}>{m.text}</span>
            <span aria-hidden style={{ fontFamily: MONO, fontSize: TEXT.caption2, color: C.muted }}>✕</span>
          </button>
        );
      })}
    </div>
  );
}

export default RueckmeldungProvider;
