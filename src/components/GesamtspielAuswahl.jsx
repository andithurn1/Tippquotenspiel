"use client";

import { useMemo, useState } from "react";
import { C, MONO, RUND } from "@/lib/theme";
import { TAPZIEL } from "@/lib/tapziel";
import { eintraege, suche, sortiere, SORTIERUNGEN, verbreitung, beschreibeTreffer } from "@/lib/bibliothek";
import { merkmale } from "@/lib/charaktere";
import { useGeteilte } from "@/lib/useGeteilte";

// ============================================================
//  GESAMTSPIEL — drei Empfehlungen im Ablauf, alles Übrige im FENSTER
//
//  🔴 Andi am 24.08.2026, nachdem der erste Anlauf es genau umgedreht hatte:
//
//    „neben dem am anfang soll ein button sein mit bibliothek
//     Kompletteinstellung wodurch ein neues fenster sich öffnet (dass das alle
//     alte überdeckt, es soll nicht im standard Kompletteinstellungsfenster
//     sein) und es sollen nur 3 vorpresets (meine Empfehlungen …) da stehen
//     direkt unter dem"
//
//  ⚠️ **Der Fehler davor war die Richtung, nicht der Inhalt.** Gebaut worden
//  war die VOLLE Liste inline: Suchfeld, zwei Filterreihen, elf Karten — alles
//  im Ablauf des Erstellen-Screens. Damit fängt der Screen mit einer
//  Recherche-Oberfläche an, obwohl die erste Frage „womit fange ich an?"
//  lautet und drei gute Antworten genügen.
//
//  Richtig herum:
//
//    IM ABLAUF   drei Empfehlungen, sonst nichts. Keine Suche, kein Filter.
//    IM FENSTER  alles — Suche, Art-Filter, Sortierung, jeder Eintrag.
//
//  Das Fenster legt sich ÜBER den Screen und gibt ihn unverändert zurück;
//  wer nichts sucht, sieht es nie. Genau das meint „soll nicht im standard
//  Kompletteinstellungsfenster sein".
//
//  ── Was „Complete Game" hier heißt ──
//  Nur die beiden Arten, die ein GANZES Spiel beschreiben:
//    🎯 Runden-Idee (`charakter`) — Wertung, Wetten und Joker in einem
//    📐 Regelwerk (`preset`)      — die Wertung allein
//  Bausteine (`baustein`) sind Teilebenen und gehören in keins von beiden —
//  sie mischen sich in ein Regelwerk, sie ersetzen keins. Für sie gibt es
//  weiter die volle Bibliothek über den 📚-Chip in der Kopfzeile.
//
//  ⚠️ Rechnet nichts selbst: Einträge, Suche, Sortierung und Verbreitung
//  kommen aus `bibliothek.js` — dieselben Funktionen, die das große
//  Bibliotheks-Fenster benutzt. Zwei Listen, die sich unterschiedlich
//  sortieren, wären die zweite Wahrheit, vor der CLAUDE.md warnt.
// ============================================================

// Die Arten, die ein ganzes Spiel beschreiben — siehe Kopfkommentar.
const GESAMTSPIEL = ["charakter", "preset"];

const ART_FILTER = [
  { key: null, label: "Alle" },
  { key: "charakter", label: "🎯 Runden-Ideen" },
  { key: "preset", label: "📐 Regelwerke" },
];

// 🔴 **Andis drei Empfehlungen — die Auswahl steht noch aus.**
// Er dazu wörtlich: „nur 3 vorpresets (meine Empfehlungen, zur
// Kompletteinstellung bzw. machen wir später)". Bis er sie benennt, stehen
// hier die ersten drei der Relevanz-Sortierung — also fertige Runden-Ideen,
// nicht nackte Regelwerke.
//
// ⚠️ Das ist ein PLATZHALTER mit Ablaufdatum, keine Empfehlung von mir. Wer
// ihn ersetzt, trägt hier drei Schlüssel ein (`charakter:…` / `preset:…`) —
// die Reihenfolge dieser Liste ist dann die Reihenfolge auf dem Schirm.
export const EMPFEHLUNGEN = null;   // null = „noch nicht gesetzt", siehe oben
const WIE_VIELE_EMPFEHLUNGEN = 3;

// Die Einträge, die ein ganzes Spiel beschreiben — eine Stelle für beide
// Ansichten, damit die Kurzliste garantiert aus derselben Menge kommt wie
// das Fenster.
function gesamtspielEintraege(geladene, geteilte = []) {
  return eintraege(geladene, geteilte).filter((e) => GESAMTSPIEL.includes(e.art));
}

// ============================================================
//  1 · IM ABLAUF: drei Empfehlungen und ein Knopf ins Fenster
// ============================================================

export default function GesamtspielAuswahl({
  gewaehltId, onWaehlen, onFensterOeffnen, geladene = [],
}) {
  const drei = useMemo(() => {
    const alle = sortiere(gesamtspielEintraege(geladene), "relevanz");
    if (EMPFEHLUNGEN) {
      // Ausdrücklich gesetzte Auswahl: exakt diese, in dieser Reihenfolge.
      // Ein Schlüssel, den es nicht (mehr) gibt, fällt still weg — lieber
      // zwei Karten als eine Lücke mit Fehlermeldung.
      return EMPFEHLUNGEN.map((id) => alle.find((e) => e.id === id)).filter(Boolean);
    }
    return alle.slice(0, WIE_VIELE_EMPFEHLUNGEN);
  }, [geladene]);

  return (
    <div>
      <p style={{ fontSize: "0.8125rem", color: C.muted, margin: "0 0 12px", lineHeight: 1.5 }}>
        Such dir aus, wie eure Runde sich anfühlen soll. Alles andere stellen wir
        passend ein — ändern kannst du es später jederzeit.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {drei.map((e) => (
          <EintragKarte key={e.id} eintrag={e} aktiv={gewaehltId === e.id}
            onClick={() => onWaehlen?.(e)} />
        ))}
      </div>

      {/* Der Weg zu allem Übrigen. Steht UNTER den dreien, nicht darüber:
          wer schon eine passende Karte sieht, soll nicht erst an einem
          Recherche-Angebot vorbei. */}
      <button onClick={onFensterOeffnen} style={{
        marginTop: 10, width: "100%", cursor: "pointer", fontFamily: "inherit",
        color: C.text, textAlign: "left",
        background: C.ink2, border: `1px dashed ${C.sky}55`, borderRadius: RUND.karte,
        padding: "14px 16px", ...TAPZIEL,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>📚</span>
          <span style={{ fontSize: "1rem", fontWeight: 800, flex: 1 }}>Alle Kompletteinstellungen</span>
          <span style={{ color: C.sky, fontSize: "0.9375rem" }}>▸</span>
        </div>
        <div style={{ fontSize: "0.8125rem", color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
          Suchen, filtern und vergleichen — in einem eigenen Fenster.
        </div>
      </button>
    </div>
  );
}

// ============================================================
//  2 · IM FENSTER: die volle Gesamtspiel-Bibliothek
// ============================================================
//
// ⚠️ Eigenes Fenster, nicht der 📚-Chip aus der Kopfzeile: dieses hier zeigt
// NUR Kompletteinstellungen (Runden-Ideen + Regelwerke), das große auch die
// Bausteine. Zwei Fragen, zwei Fenster — wer eine ganze Runde sucht, will
// nicht durch 58 Teilstücke blättern.

export function GesamtspielFenster({
  offen, gewaehltId, onWaehlen, onSchliessen, geladene = [],
}) {
  const [text, setText] = useState("");
  const [art, setArt] = useState(null);
  const [sortierung, setSortierung] = useState("relevanz");

  // 🔴 Die geteilten Regelwerke aus dem Store — Andis „beliebteste Auswahl".
  //
  // ⚠️ `aktiv: offen`: geladen wird erst, wenn das Fenster aufgeht. Ein
  // Erstellen-Screen, der beim Öffnen die halbe Preset-Tabelle zieht, wartet
  // auf etwas, das die meisten nie aufschlagen.
  //
  // ⚠️ Die Suche läuft ZWEIMAL, und das ist Absicht: der Store sucht in dem,
  // was er hat (Name, Beschreibung, Code), `suche()` danach über alle
  // Einträge — auch die Haus-Einträge, die der Store gar nicht kennt.
  const { geteilte, laedt: geteilteLaden, fehler: geteilteFehler } =
    useGeteilte({ sortierung: sortierung === "beliebt" ? "beliebt" : "neu", text, aktiv: offen });

  const alle = useMemo(() => gesamtspielEintraege(geladene, geteilte), [geladene, geteilte]);
  const gefiltert = useMemo(() => {
    const nachArt = art ? alle.filter((e) => e.art === art) : alle;
    return sortiere(suche(nachArt, text), sortierung);
  }, [alle, art, text, sortierung]);

  if (!offen) return null;

  return (
    <div
      role="dialog" aria-modal="true" aria-label="Kompletteinstellungen"
      onClick={(e) => { if (e.target === e.currentTarget) onSchliessen?.(); }}
      className="tqs-fenster-grund"
      style={{
        position: "fixed", inset: 0, zIndex: 70, background: "rgba(17,20,28,0.35)",
        backdropFilter: "blur(3px)", display: "flex", alignItems: "center",
        justifyContent: "center", padding: 16,
      }}>
      <div className="tqs-fenster" style={{
        background: C.ink2, border: `1px solid ${C.line}`, borderRadius: RUND.karte,
        width: "100%", maxWidth: 460, maxHeight: "86vh", display: "flex", flexDirection: "column",
        boxShadow: "0 24px 60px rgba(17,20,28,0.18)",
      }}>
        {/* Kopf: bleibt stehen, damit man beim Blättern nicht zum Suchfeld
            zurückscrollen muss. */}
        <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${C.line}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>📚</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "1rem", fontWeight: 800 }}>Kompletteinstellungen</div>
              <div style={{ fontFamily: MONO, fontSize: "0.6875rem", color: C.muted }}>
                {beschreibeTreffer(gefiltert.length, alle.length, text)}
              </div>
            </div>
            <button onClick={onSchliessen} aria-label="Fenster schließen" style={{
              cursor: "pointer", fontFamily: "inherit", fontSize: "1.25rem", lineHeight: 1,
              background: C.surface, color: C.muted, border: `1px solid ${C.line}`,
              borderRadius: RUND.pille, width: 44, height: 44,
            }}>×</button>
          </div>

          <input value={text} onChange={(e) => setText(e.target.value)}
            placeholder={'Suchen — z. B. „streng" oder „joker"'}
            style={{
              width: "100%", boxSizing: "border-box", marginTop: 10,
              background: C.ink, color: C.text, border: `1px solid ${C.line}`,
              borderRadius: RUND.karte, padding: "12px 12px", fontSize: "0.9375rem",
              fontFamily: "inherit", outline: "none", minHeight: 44,
            }} />

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {ART_FILTER.map((a) => (
              <FilterChip key={a.key ?? "alle"} an={art === a.key}
                onClick={() => setArt(a.key)} label={a.label} />
            ))}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6, alignItems: "center" }}>
            <span style={{ fontFamily: MONO, fontSize: "0.6875rem", color: C.muted, marginRight: 2 }}>sortiert:</span>
            {SORTIERUNGEN.map((so) => (
              <FilterChip key={so.key} an={sortierung === so.key} titel={so.desc}
                onClick={() => setSortierung(so.key)} label={so.label} />
            ))}
          </div>
        </div>

        {/* Liste */}
        <div style={{ overflowY: "auto", padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {gefiltert.length === 0 && !geteilteLaden && (
            <div style={{ fontSize: "0.8125rem", color: C.muted, lineHeight: 1.5 }}>
              Nichts gefunden. Andere Schreibweise probieren — einzelne
              Bausteine stehen in der großen Bibliothek über den 📚-Chip.
            </div>
          )}
          {/* ⚠️ Ein Platzhalter in der Größe der kommenden Karten, kein
              Ladekreisel: der Screen springt danach nicht, weil der Platz
              schon stimmt. Siehe `.tqs-skelett` in globals.css. */}
          {geteilteLaden && (
            <div aria-hidden style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="tqs-skelett" style={{ height: 86 }} />
              <div className="tqs-skelett" style={{ height: 86 }} />
            </div>
          )}
          {/* 🔴 „Wir kommen gerade nicht an die geteilten Codes" ist NICHT
              dasselbe wie „es gibt keine". Ohne diesen Satz behauptete die
              Liste eine Leere, die sie nicht kennt. */}
          {geteilteFehler && (
            <div style={{
              fontSize: "0.75rem", color: C.muted, lineHeight: 1.5,
              border: `1px dashed ${C.line}`, borderRadius: RUND.karte, padding: "10px 12px",
            }}>
              Geteilte Regelwerke sind gerade nicht erreichbar — was hier steht,
              kommt aus dem Haus.
            </div>
          )}
          {gefiltert.map((e) => (
            <EintragKarte key={e.id} eintrag={e} aktiv={gewaehltId === e.id}
              onClick={() => { onWaehlen?.(e); onSchliessen?.(); }} />
          ))}
        </div>
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
        <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>{e.emoji ?? (e.art === "preset" ? "📐" : "🎯")}</span>
        <span style={{ fontSize: "1rem", fontWeight: 800, flex: 1 }}>{e.label}</span>
        {aktiv && (
          <span style={{
            fontFamily: MONO, fontSize: "0.6875rem", color: C.akzent, border: `1px solid ${C.akzent}66`,
            borderRadius: RUND.pille, padding: "2px 8px", textTransform: "uppercase", letterSpacing: 1,
          }}>gewählt</span>
        )}
      </div>

      {e.tagline && (
        <div style={{ fontSize: "0.8125rem", color: C.akzent, marginTop: 5, fontStyle: "italic" }}>
          {e.tagline}
        </div>
      )}
      {(e.desc || e.kurz) && (
        <div style={{ fontSize: "0.8125rem", color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
          {e.desc ?? e.kurz}
        </div>
      )}

      {marken.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 9 }}>
          {marken.map((m) => (
            <span key={m} style={{
              fontFamily: MONO, fontSize: "0.6875rem", color: C.muted,
              border: `1px solid ${C.line}`, borderRadius: RUND.pille, padding: "2px 8px",
            }}>{m}</span>
          ))}
        </div>
      )}

      <div style={{ fontSize: "0.6875rem", color: C.muted, marginTop: 8, opacity: 0.8 }}>
        {e.fuer ? `Für ${e.fuer}` : null}
        {e.fuer && v ? " · " : null}
        {v ? `in ${v.von} von ${v.gesamt} Runden-Ideen` : null}
        {/* 🔴 Die Herkunft steht DA, wo die Verbreitung stünde — beides
            beantwortet dieselbe Frage („kann ich dem trauen?"), nur trägt
            ein geteilter Code eine gezählte Zahl statt einer gerechneten.
            ⚠️ Der Code steht mit dabei: er ist bei einem geteilten Regelwerk
            die einzige Kennung, die man weitergeben kann. */}
        {e.urheber === "geteilt" ? (
          <>
            {`geteilt · ${e.code} · `}
            {e.uebernahmen > 0
              ? `${e.uebernahmen}× übernommen`
              : "noch nicht übernommen"}
          </>
        ) : null}
      </div>
    </button>
  );
}

function FilterChip({ an, label, titel, onClick }) {
  return (
    <button onClick={onClick} title={titel} style={{
      cursor: "pointer", fontFamily: "inherit", fontSize: "0.75rem", fontWeight: an ? 700 : 500,
      background: an ? C.akzent : C.surface, color: an ? C.ink : C.muted,
      border: `1px solid ${an ? C.akzent : C.line}`, borderRadius: RUND.pille,
      padding: "7px 12px", minHeight: 34,
    }}>{label}</button>
  );
}
