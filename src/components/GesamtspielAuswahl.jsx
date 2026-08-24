"use client";

import { useMemo, useState } from "react";
import { C, MONO, RUND } from "@/lib/theme";
import { TAPZIEL } from "@/lib/tapziel";
import { eintraege, suche, sortiere, SORTIERUNGEN, verbreitung, beschreibeTreffer } from "@/lib/bibliothek";
import { merkmale } from "@/lib/charaktere";

// ============================================================
//  GESAMTSPIEL-AUSWAHL — die Bibliothek als VORAUSWAHL, ganz oben
//
//  🔴 Andi am 24.08.2026, zum dritten Mal: „gleich am anfang mit dem code auch
//  die Gesamtspielbibliothek mit den Complete game einstellungen als
//  vorauswahl und oben auch filter mit relevanz etc und suchenfunktion."
//
//  Was vorher dastand und warum es die Ansage NICHT erfüllt hat:
//  `RundenCharaktere` zeigte die vier `CHARAKTERE` als Karten — ohne Suche,
//  ohne Filter, ohne Sortierung, und ohne die REGELWERKE (`PRESETS`). Die
//  vollständige Bibliothek mit alldem gab es zwar (`Bibliothek.jsx`), aber als
//  FENSTER hinter einem Chip. Sie war damit nicht die Vorauswahl, sondern ein
//  Nachschlagewerk für Leute, die schon wissen, dass es sie gibt.
//
//  ⚠️ **Der Unterschied ist nicht Deko.** Eine Vorauswahl beantwortet die erste
//  Frage des Screens („womit fange ich an?"). Vier Karten ohne Suche
//  beantworten sie nur, solange es vier sind — mit den Regelwerken sind es
//  schon elf, und mit geladenen Codes wächst die Zahl weiter.
//
//  ── Was „Complete Game" hier heißt ──
//  Nur die beiden Arten, die ein GANZES Spiel beschreiben:
//    🎯 Runden-Idee (`charakter`) — Wertung, Wetten und Joker in einem
//    📐 Regelwerk (`preset`)      — die Wertung allein
//  Bausteine (`baustein`) sind Teilebenen und gehören NICHT in die
//  Vorauswahl — sie mischen sich in ein bestehendes Regelwerk, sie ersetzen
//  keins. Wer sie will, öffnet die volle Bibliothek über „Alle anzeigen".
//
//  ⚠️ Rechnet nichts selbst: Einträge, Suche, Sortierung und Verbreitung
//  kommen aus `bibliothek.js` — dieselben Funktionen, die das Fenster benutzt.
//  Zwei Listen, die sich unterschiedlich sortieren, wären genau die zweite
//  Wahrheit, vor der die Runden-Schicht in CLAUDE.md warnt.
//
//  ⚠️ `geladene` steht in der Schnittstelle, wird vom Erstellen-Screen aber
//  (noch) nicht befüllt — genau wie beim Fenster. Der Grund ist kein
//  Vergessen: `geladeneCodes` dort ist `{ aspekt: codeString }`, und
//  `eintraege()` erwartet Einträge mit Label und Werten. Ein String ergäbe
//  eine Karte ohne Namen. Wer das anschließt, baut ZUERST die Umwandlung —
//  an EINER Stelle, für beide Orte.
// ============================================================

// Die Arten, die ein ganzes Spiel beschreiben — siehe Kopfkommentar.
const GESAMTSPIEL = ["charakter", "preset"];

const ART_FILTER = [
  { key: null, label: "Alle" },
  { key: "charakter", label: "🎯 Runden-Ideen" },
  { key: "preset", label: "📐 Regelwerke" },
];

export default function GesamtspielAuswahl({
  gewaehltId, onWaehlen, onAlleAnzeigen, geladene = [],
}) {
  const [text, setText] = useState("");
  const [art, setArt] = useState(null);
  const [sortierung, setSortierung] = useState("relevanz");

  // Nur Gesamtspiel-Einträge. `eintraege()` liefert ALLES (auch Bausteine) —
  // gefiltert wird hier, nicht dort: die Bibliothek soll für beide Orte
  // dieselbe Liste bauen.
  const alle = useMemo(
    () => eintraege(geladene).filter((e) => GESAMTSPIEL.includes(e.art)),
    [geladene],
  );

  const gefiltert = useMemo(() => {
    const nachArt = art ? alle.filter((e) => e.art === art) : alle;
    return sortiere(suche(nachArt, text), sortierung);
  }, [alle, art, text, sortierung]);

  return (
    <div>
      <p style={{ fontSize: 13, color: C.muted, margin: "0 0 12px", lineHeight: 1.5 }}>
        Such dir aus, wie eure Runde sich anfühlen soll. Alles andere stellen wir
        passend ein — ändern kannst du es später jederzeit.
      </p>

      {/* ── Suche ──────────────────────────────────────────── */}
      <input value={text} onChange={(e) => setText(e.target.value)}
        placeholder={'Suchen — z. B. „streng" oder „joker"'}
        style={{
          width: "100%", boxSizing: "border-box", background: C.ink2, color: C.text,
          border: `1px solid ${C.line}`, borderRadius: RUND.karte,
          padding: "12px 12px", fontSize: 15, fontFamily: "inherit", outline: "none",
          minHeight: 44,
        }} />

      {/* ── Filter nach Art ────────────────────────────────── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
        {ART_FILTER.map((a) => (
          <FilterChip key={a.key ?? "alle"} an={art === a.key}
            onClick={() => setArt(a.key)} label={a.label} />
        ))}
      </div>

      {/* ── Sortierung: Andis „filter mit relevanz etc" ────── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6, alignItems: "center" }}>
        <span style={{ fontFamily: MONO, fontSize: 11, color: C.muted, marginRight: 2 }}>sortiert:</span>
        {SORTIERUNGEN.map((s) => (
          <FilterChip key={s.key} an={sortierung === s.key} titel={s.desc}
            onClick={() => setSortierung(s.key)} label={s.label} />
        ))}
      </div>

      <div style={{ fontFamily: MONO, fontSize: 11, color: C.muted, marginTop: 8 }}>
        {beschreibeTreffer(gefiltert.length, alle.length, text)}
      </div>

      {/* ── Die Karten ─────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
        {gefiltert.length === 0 && (
          <div style={{
            fontSize: 13, color: C.muted, background: C.ink2, border: `1px solid ${C.line}`,
            borderRadius: RUND.karte, padding: "14px 16px", lineHeight: 1.5,
          }}>
            Nichts gefunden. Andere Schreibweise probieren — oder die volle
            Bibliothek öffnen, dort stehen auch die einzelnen Bausteine.
          </div>
        )}

        {gefiltert.map((e) => (
          <EintragKarte key={e.id} eintrag={e} aktiv={gewaehltId === e.id}
            onClick={() => onWaehlen?.(e)} />
        ))}

        {/* Die volle Bibliothek — mit Bausteinen, Kennzahlen und Urheber. */}
        <button onClick={onAlleAnzeigen} style={{
          cursor: "pointer", fontFamily: "inherit", color: C.text, textAlign: "left",
          background: C.ink2, border: `1px dashed ${C.sky}55`, borderRadius: RUND.karte,
          padding: "14px 16px", ...TAPZIEL,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>📚</span>
            <span style={{ fontSize: 16, fontWeight: 800, flex: 1 }}>Alle anzeigen</span>
            <span style={{ color: C.sky, fontSize: 15 }}>▸</span>
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
            Die volle Bibliothek — zusätzlich die einzelnen Bausteine, mit
            Kennzahlen, Urheber und Verbreitung.
          </div>
        </button>
      </div>
    </div>
  );
}

// ── Eine Karte je Eintrag ───────────────────────────────────
// Derselbe Zuschnitt wie zuvor bei den Charakteren (Andi, 07.08.2026:
// „weniger Text, dafür größer") — nur trägt sie jetzt auch Regelwerke, und
// die haben weder `emoji` noch `tagline`. Beides fällt dann weg statt durch
// einen Platzhalter ersetzt zu werden: eine leere Zeile ist ehrlicher als
// ein erfundener Untertitel.
function EintragKarte({ eintrag: e, aktiv, onClick }) {
  const v = verbreitung(e);
  const marken = e.art === "charakter" && e.rules ? merkmale(e) : [];

  return (
    <button onClick={onClick} style={{
      textAlign: "left", cursor: "pointer", fontFamily: "inherit", color: C.text,
      background: aktiv
        ? `radial-gradient(120% 120% at 50% -20%, ${C.akzent}22 0%, ${C.surface} 100%)`
        : `radial-gradient(120% 120% at 50% -20%, ${C.ink2} 0%, ${C.surface} 100%)`,
      border: `1px solid ${aktiv ? C.akzent + "77" : C.line}`,
      borderRadius: RUND.karte, padding: "15px 16px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <span style={{ fontSize: 20, lineHeight: 1 }}>{e.emoji ?? (e.art === "preset" ? "📐" : "🎯")}</span>
        <span style={{ fontSize: 16, fontWeight: 800, flex: 1 }}>{e.label}</span>
        {aktiv && (
          <span style={{
            fontFamily: MONO, fontSize: 11, color: C.akzent, border: `1px solid ${C.akzent}66`,
            borderRadius: RUND.pille, padding: "2px 8px", textTransform: "uppercase", letterSpacing: 1,
          }}>gewählt</span>
        )}
      </div>

      {e.tagline && (
        <div style={{ fontSize: 13, color: C.akzent, marginTop: 5, fontStyle: "italic" }}>
          {e.tagline}
        </div>
      )}
      {(e.desc || e.kurz) && (
        <div style={{ fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
          {e.desc ?? e.kurz}
        </div>
      )}

      {marken.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 9 }}>
          {marken.map((m) => (
            <span key={m} style={{
              fontFamily: MONO, fontSize: 11, color: C.muted,
              border: `1px solid ${C.line}`, borderRadius: RUND.pille, padding: "2px 8px",
            }}>{m}</span>
          ))}
        </div>
      )}

      <div style={{ fontSize: 11, color: C.muted, marginTop: 8, opacity: 0.8 }}>
        {e.fuer ? `Für ${e.fuer}` : null}
        {e.fuer && v ? " · " : null}
        {v ? `in ${v.von} von ${v.gesamt} Runden-Ideen` : null}
      </div>
    </button>
  );
}

function FilterChip({ an, label, titel, onClick }) {
  return (
    <button onClick={onClick} title={titel} style={{
      cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: an ? 700 : 500,
      background: an ? C.akzent : C.surface, color: an ? C.ink : C.muted,
      border: `1px solid ${an ? C.akzent : C.line}`, borderRadius: RUND.pille,
      padding: "7px 12px", minHeight: 34,
    }}>{label}</button>
  );
}
