"use client";

import { useMemo, useState } from "react";
import {
  ARTEN, ASPEKT_LABEL, eintraege, bewerteAlle, verbreitung,
  suche, sortiere, SORTIERUNGEN, beschreibeTreffer, STANDARD_KENNZAHLEN,
} from "@/lib/bibliothek";
import { C, MONO, SCHRIFT, RUND } from "@/lib/theme";
import { TAPZIEL, TAPZIEL_QUADRAT } from "@/lib/tapziel";
import { useGeteilte } from "@/lib/useGeteilte";

// ============================================================
//  BIBLIOTHEK — Andis PP1: „Bibliothek als eigenes Fenster"
//
//  🔴 Warum ein Fenster und keine weitere Zeile: die Bibliothek beantwortet
//  eine Frage, die man MITTEN in der Arbeit stellt („gibt's da was Fertiges
//  für?"). Als Abschnitt im Erstellen-Screen wäre sie an einer festen Stelle
//  im Ablauf — man müsste hin, suchen und den Platz wiederfinden. Als Fenster
//  legt sie sich über alles, und hinterher steht man wieder da, wo man war.
//
//  ⚠️ Rechnet nichts: Einträge, Bewertung und Verbreitung kommen aus
//  `bibliothek.js`. Dieser Screen sucht, sortiert die fertigen Listen und
//  malt — Runden-Schicht (CLAUDE.md).
//
//  ⚠️ Übernommen wird über `onUebernehmen`. Was ein Eintrag mit dem Regelwerk
//  macht, weiß der ERSTELLEN-Screen (ein Charakter ersetzt alles, ein Baustein
//  mischt sich in einen Aspekt) — die Bibliothek kennt diesen Unterschied
//  bewusst nicht, sonst gäbe es zwei Stellen, die Regeln zusammenbauen.
// ============================================================

export default function Bibliothek({ offen, onUebernehmen, onSchliessen, geladene = [], aktivId = null }) {
  const [text, setText] = useState("");
  const [art, setArt] = useState(null);          // null = alle
  const [sortierung, setSortierung] = useState("relevanz");
  const [detail, setDetail] = useState(null);    // aufgeklappter Eintrag

  // Dieselbe Quelle wie im Gesamtspiel-Fenster (`useGeteilte`). ⚠️ Zwei
  // Bibliotheken, die verschiedene Einträge zeigen, wären genau die zweite
  // Wahrheit, vor der CLAUDE.md warnt — nur eben für Listen statt für Zahlen.
  const { geteilte, laedt: geteilteLaden } = useGeteilte({
    sortierung: sortierung === "beliebt" ? "beliebt" : "neu", text, aktiv: offen,
  });

  const alle = useMemo(() => eintraege(geladene, geteilte), [geladene, geteilte]);
  const bewertungen = useMemo(() => bewerteAlle(alle), [alle]);

  const gefiltert = useMemo(() => {
    const nachArt = art ? alle.filter((e) => e.art === art) : alle;
    return sortiere(suche(nachArt, text), sortierung);
  }, [alle, art, text, sortierung]);

  if (!offen) return null;

  return (
    <div
      role="dialog" aria-modal="true" aria-label="Bibliothek"
      onClick={(e) => { if (e.target === e.currentTarget) onSchliessen?.(); }}
      className="tqs-fenster-grund"
      style={{
        position: "fixed", inset: 0, zIndex: 60, background: "rgba(17,20,28,0.35)",
        backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, fontFamily: SCHRIFT,
      }}>
      <div className="tqs-fenster" style={{
        background: C.ink2, border: `1px solid ${C.line}`, borderRadius: RUND.karte,
        width: "100%", maxWidth: 460, maxHeight: "86vh", display: "flex", flexDirection: "column",
        boxShadow: "0 24px 60px rgba(17,20,28,0.18)",
      }}>
        {/* ── Kopf: Titel, Suche, Filter. Bleibt stehen, damit man beim
            Blättern nicht zum Suchfeld zurückscrollen muss. ── */}
        <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${C.line}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: MONO, fontSize: "0.6875rem", letterSpacing: 1.2, color: C.muted, textTransform: "uppercase",
              }}>Bibliothek</div>
              <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 3 }}>
                {beschreibeTreffer(gefiltert.length, alle.length, text)}
              </div>
            </div>
            <button onClick={onSchliessen} aria-label="Bibliothek schließen" style={{
              ...TAPZIEL_QUADRAT, borderRadius: RUND.karte, cursor: "pointer", fontFamily: "inherit",
              background: C.surface, color: C.muted, border: `1px solid ${C.line}`, fontSize: "1.25rem", lineHeight: 1,
            }}>✕</button>
          </div>

          <input
            type="search" value={text} onChange={(e) => setText(e.target.value)}
            placeholder={'Suchen — z. B. „streng" oder „joker"'}
            style={{
              ...TAPZIEL, width: "100%", marginTop: 10, boxSizing: "border-box",
              background: C.surface, color: C.text, border: `1px solid ${C.line}`,
              borderRadius: RUND.karte, padding: "10px 12px", fontSize: "0.9375rem",
              fontFamily: "inherit", outline: "none",
            }} />

          {/* Art-Filter. „Alle" steht vorn, weil das der Normalfall ist. */}
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}>
            <FilterChip an={art === null} onClick={() => setArt(null)} label="Alle" />
            {ARTEN.map((a) => (
              <FilterChip key={a.key} an={art === a.key} onClick={() => setArt(a.key)}
                label={`${a.icon} ${a.label}`} title={a.desc} />
            ))}
          </div>

          {/* Sortierung — Andis „Filter nach Relevanz und Beliebtheit". */}
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
            {SORTIERUNGEN.map((s) => (
              <FilterChip key={s.key} an={sortierung === s.key} onClick={() => setSortierung(s.key)}
                label={s.label} title={s.desc} klein />
            ))}
          </div>
        </div>

        {/* ── Liste ── */}
        <div style={{ overflowY: "auto", padding: "10px 16px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Platzhalter in Kartengröße statt Ladekreisel — der Screen
              springt danach nicht (`.tqs-skelett`, globals.css). */}
          {geteilteLaden && (
            <div aria-hidden style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="tqs-skelett" style={{ height: 72 }} />
              <div className="tqs-skelett" style={{ height: 72 }} />
            </div>
          )}
          {gefiltert.length === 0 && !geteilteLaden && (
            <p style={{ fontSize: "0.8125rem", color: C.muted, lineHeight: 1.5, margin: "10px 0" }}>
              Dafür gibt es noch nichts Fertiges. Alles, was hier fehlt, lässt
              sich in den Sondermenüs von Hand einstellen — und als Teil-Code
              teilen.
            </p>
          )}
          {gefiltert.map((e) => (
            <Karte key={e.id} eintrag={e} bewertung={bewertungen.get(e.id)}
              aktiv={aktivId === e.id}
              offen={detail === e.id}
              onDetail={() => setDetail((d) => (d === e.id ? null : e.id))}
              onUebernehmen={() => { onUebernehmen?.(e); onSchliessen?.(); }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function FilterChip({ an, onClick, label, title, klein = false }) {
  return (
    <button onClick={onClick} title={title} style={{
      // ⚠️ Kein TAPZIEL: eine Filterzeile mit 44 px hohen Chips frisst auf
      // 375 px den halben Kopf. Sie stehen dafür in einer Reihe mit viel
      // Abstand, und die Liste darunter ist das eigentliche Ziel.
      cursor: "pointer", fontFamily: "inherit", fontSize: klein ? 11 : 12,
      padding: klein ? "5px 9px" : "7px 11px", borderRadius: RUND.pille,
      background: an ? `${C.akzent}22` : C.surface,
      color: an ? C.akzent : C.muted,
      border: `1px solid ${an ? C.akzent + "66" : C.line}`,
      fontWeight: an ? 700 : 400,
    }}>{label}</button>
  );
}

// Eine Karte. Zugeklappt: was es ist, was es tut, wie verbreitet es ist.
// Aufgeklappt zusätzlich die gemessenen Zahlen — die will nicht jeder sehen,
// aber wer sie sucht, soll sie nicht woanders suchen müssen.
function Karte({ eintrag, bewertung, aktiv, offen, onDetail, onUebernehmen }) {
  const v = verbreitung(eintrag);
  const artInfo = ARTEN.find((a) => a.key === eintrag.art);
  const badges = [...(bewertung?.wirkungen ?? [])];
  if (bewertung?.aufwand) badges.push(bewertung.aufwand);

  return (
    <div style={{
      background: aktiv ? `${C.akzent}14` : C.surface,
      border: `1px solid ${aktiv ? C.akzent + "66" : C.line}`,
      borderRadius: RUND.karte, padding: "12px 13px",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{ fontSize: "1.25rem", lineHeight: 1.1, flexShrink: 0 }}>{eintrag.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.9375rem", fontWeight: 700, color: C.text }}>{eintrag.label}</span>
            <span style={{ fontSize: "0.6875rem", color: C.muted }}>
              {artInfo?.label}{eintrag.aspekt ? ` · ${ASPEKT_LABEL[eintrag.aspekt] ?? eintrag.aspekt}` : ""}
            </span>
          </div>
          {eintrag.kurz && (
            <div style={{ fontSize: "0.75rem", color: C.akzent, marginTop: 2 }}>{eintrag.kurz}</div>
          )}
          <p style={{ fontSize: "0.75rem", color: C.muted, margin: "4px 0 0", lineHeight: 1.45 }}>{eintrag.desc}</p>
          {eintrag.fuer && (
            <p style={{ fontSize: "0.6875rem", color: C.muted, margin: "3px 0 0", lineHeight: 1.4 }}>Für {eintrag.fuer}</p>
          )}
        </div>
      </div>

      {badges.length > 0 && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}>
          {badges.map((b) => (
            <span key={b.achse ?? b.key} title={b.desc} style={{
              fontSize: "0.6875rem", padding: "3px 8px", borderRadius: RUND.pille,
              background: C.ink2, border: `1px solid ${C.line}`, color: C.text,
            }}>{b.icon} {b.label}</span>
          ))}
        </div>
      )}

      {/* Urheber und Verbreitung — Andis „von wem" und „Popularität". */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.6875rem", color: C.muted }}>
          {eintrag.urheber === "geladen" ? "📥 von euch geladen" : "🏠 vom Haus"}
        </span>
        {v && (
          <span title="Wie viele der fünf kuratierten Runden-Ideen das benutzen — nachgerechnet, nicht gezählt."
            style={{ fontSize: "0.6875rem", color: v.von > 0 ? C.akzent : C.muted, fontFamily: MONO }}>
            in {v.von}/{v.gesamt} Runden-Ideen
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        <button onClick={onUebernehmen} style={{
          ...TAPZIEL, flex: 1, cursor: "pointer", fontFamily: "inherit", fontSize: "0.8125rem", fontWeight: 700,
          background: aktiv ? C.surface : `${C.akzent}22`, color: aktiv ? C.muted : C.akzent,
          border: `1px solid ${aktiv ? C.line : C.akzent + "66"}`, borderRadius: RUND.karte,
        }}>{aktiv ? "gilt gerade" : "Übernehmen"}</button>
        {bewertung?.kennzahlen && (
          <button onClick={onDetail} aria-expanded={offen} style={{
            ...TAPZIEL, cursor: "pointer", fontFamily: "inherit", fontSize: "0.75rem", padding: "0 12px",
            background: C.surface, color: C.muted, border: `1px solid ${C.line}`, borderRadius: RUND.karte,
          }}>{offen ? "Zahlen aus" : "Zahlen"}</button>
        )}
      </div>

      {offen && bewertung?.kennzahlen && (
        <div style={{
          marginTop: 8, background: C.ink2, border: `1px solid ${C.line}`,
          borderRadius: RUND.karte, padding: "9px 11px",
        }}>
          {[
            ["Schärfe", "schaerfe", "wie viel ein knapper Fehltipp verliert"],
            ["Boden", "boden", "der schlechteste Tipp der Vorschau"],
            ["Überraschung", "ueberraschung", "Außenseiter gegen Favorit"],
            ["Torschützen", "schuetzen", "Anteil der Schützen an der Summe"],
          ].map(([label, key, hint]) => (
            <div key={key} title={hint} style={{
              display: "flex", justifyContent: "space-between", gap: 8, fontSize: "0.6875rem", padding: "2px 0",
            }}>
              <span style={{ color: C.muted }}>{label}</span>
              <span style={{ fontFamily: MONO, color: C.text }}>
                {bewertung.kennzahlen[key]}
                <span style={{ color: C.muted }}> · Standard {STANDARD_KENNZAHLEN[key]}</span>
              </span>
            </div>
          ))}
          <p style={{ fontSize: "0.6875rem", color: C.muted, margin: "6px 0 0", lineHeight: 1.4 }}>
            Gemessen an denselben drei Beispielspielen, die auch die Vorschau
            im Erstellen-Screen benutzt.
          </p>
        </div>
      )}
    </div>
  );
}
