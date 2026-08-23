"use client";

import { C, MONO, RUND } from "@/lib/theme";
import { nearPayouts, likelyScorelines } from "@/lib/nearResults";

// ── „Was zahlt es, wenn es knapp anders ausgeht?" ────────────
// Zwei Darstellungen aus derselben Quelle (src/lib/nearResults.js):
//
//  <NaheErgebnisse tip snap rules />  — beim Tippen: der eigene Endstand und
//      seine Nachbarn (gleicher Abstand / ein Tor mehr oder weniger je Team)
//      mit möglicher Auszahlung. Beantwortet: „und wenn der Gegner doch trifft?"
//
//  <ErgebnisUebersicht snap rules />  — in der Spielwahl: die lohnendsten
//      Endstände dieses Spiels, ohne dass schon ein Tipp existiert.
//
// Reine Anzeige — gerechnet wird in der Engine, nie hier.

const KIND_LABEL = {
  exakt: "dein Tipp",
  abstand: "gleicher Abstand",
  heim: "Heim ±1 Tor",
  gast: "Gast ±1 Tor",
};

export default function NaheErgebnisse({ tip, snap, rules, kompakt = false }) {
  const rows = nearPayouts(tip, snap, rules);
  if (!rows.length) return null;

  const best = Math.max(...rows.map((r) => r.points), 1);

  return (
    <div style={{
      marginTop: 12, background: C.ink2, border: `1px solid ${C.line}`,
      borderRadius: RUND.karte, padding: "12px 14px",
    }}>
      <div style={{
        fontFamily: MONO, fontSize: 11, letterSpacing: 1, color: C.muted,
        textTransform: "uppercase", marginBottom: 4,
      }}>
        Wenn es knapp anders ausgeht
      </div>
      {!kompakt && (
        <p style={{ fontSize: 11, color: C.muted, margin: "0 0 10px", lineHeight: 1.5 }}>
          Was dein Tipp zahlt, falls ein Tor mehr oder weniger fällt — die Nähe
          wird belohnt, du gehst also nicht leer aus.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {rows.map((r) => (
          <Zeile key={`${r.home}:${r.away}`} r={r} best={best} />
        ))}
      </div>
    </div>
  );
}

function Zeile({ r, best }) {
  const anteil = Math.max(0.04, r.points / best);
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10, padding: "5px 8px", borderRadius: RUND.karte, overflow: "hidden", background: r.isTip ? `${C.akzent}14` : "transparent", border: `1px solid ${r.isTip ? C.akzent + "44" : "transparent"}` }}>
      {/* Balken als Hintergrund: relative Auszahlung auf einen Blick */}
      <span aria-hidden style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: `${anteil * 100}%`,
        background: r.isTip ? `${C.akzent}20` : `${C.indigo}18`,
      }} />
      <span style={{
        position: "relative", fontFamily: MONO, fontSize: 15, fontWeight: 700,
        color: r.isTip ? C.akzent : C.text, minWidth: 40,
      }}>
        {r.home}:{r.away}
      </span>
      <span style={{ position: "relative", fontSize: 11, color: C.muted, flex: 1, minWidth: 0 }}>
        {KIND_LABEL[r.kind]}
      </span>
      {r.quote != null && (
        <span style={{ position: "relative", fontFamily: MONO, fontSize: 11, color: C.muted }}>
          Quote {r.quote.toFixed(1)}
        </span>
      )}
      <span style={{
        position: "relative", fontFamily: MONO, fontSize: 13, fontWeight: 700,
        color: r.points > 0 ? (r.isTip ? C.akzent : C.mint) : C.muted, minWidth: 52, textAlign: "right",
      }}>
        {r.points > 0 ? `+${r.points}` : "0"}
      </span>
    </div>
  );
}

// ── Übersicht ohne eigenen Tipp (Spielwahl) ─────────────────
// Bewusst die WAHRSCHEINLICHSTEN Endstände statt der bestbezahlten: die
// höchsten Auszahlungen liegen alle bei absurden Ergebnissen (5:5, 0:5) und
// laufen in den Punkte-Deckel — als Orientierung wertlos. Realistische
// Endstände mit ihrer Auszahlung zeigen dagegen, wo das Spiel steht.
export function ErgebnisUebersicht({ snap, rules, limit = 3 }) {
  const rows = likelyScorelines(snap, rules, limit);
  if (!rows.length) return null;
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
      {rows.map((r) => (
        <span key={`${r.home}:${r.away}`} style={{
          fontFamily: MONO, fontSize: 11, color: C.muted,
          border: `1px solid ${C.line}`, borderRadius: RUND.pille, padding: "3px 9px",
        }}>
          {r.home}:{r.away} <span style={{ color: C.mint, fontWeight: 700 }}>+{r.points}</span>
        </span>
      ))}
    </div>
  );
}
