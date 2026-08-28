"use client";

import { useMemo, useState } from "react";
import { C, MONO, RUND } from "@/lib/theme";
import { TAPZIEL } from "@/lib/tapziel";
import Feinheiten from "@/components/Feinheiten";
import {
  toepfeVon, vereineDerRegel, lostopfSpiele, beschreibeLostopf,
  sanitizeLostopfRegel, DEFAULT_LOSTOPF_REGEL, topfVon,
} from "@/lib/lostoepfe";
import { WETTBEWERB } from "@/lib/wettbewerbe";

// ============================================================
//  DIE LOSTOPF-VORAUSWAHL (Andi, 27.08.2026)
//
//  🔴 „mach die Lostopf Vorauswahl auch bei der CL und später auch
//  Europaleague" — und einen Tag später der Zusatz, der die Bauform bestimmt:
//  „bei der mannschaftsauswahl mit den töpfen sollen einzelne Mannschaften
//  trotzdem abgewählt werden können".
//
//  ── Warum das ein WERKZEUG ist und keine Einstellung ──
//  Diese Oberfläche schreibt nichts Eigenes ins Regelwerk. Sie rechnet Andis
//  Regel aus und legt das Ergebnis in die vorhandenen Felder:
//  `jeWettbewerb[wb] = { modus: "liste", matchIds }`.
//
//  ⚠️ **Das ist der Punkt, nicht ein Detail.** Ein neuer Regel-Block „Lostöpfe"
//  wäre eine zweite Sprache dafür, welche Spiele zur Runde gehören — und
//  `passtSpiel` ist die eine Stelle, die das beantwortet (Runden-Schicht,
//  CLAUDE.md). Ein Werkzeug, das die vorhandenen Felder füllt, kann nie
//  auseinanderlaufen; ein zweiter Block schon.
//
//  🔴 **Der Preis, und er steht auch im Text für den Admin:** eine feste
//  Begegnungsliste zeigt auf konkrete Spiele. Kommt ein neuer Spielplan, ist
//  sie veraltet. Für eine Runde ist genau das richtig — der Zuschnitt wird
//  beim Anlegen ohnehin eingefroren, damit ein späterer Beschluss nicht
//  rückwirkend ändert, welche Spiele je dazugehört haben.
//
//  ⚠️ **Und was Abwählen heißt, muss dastehen:** ein abgewählter Verein bringt
//  kein Spiel mehr herein, aber er ist kein Verbot. Real abgewählt, Bayern
//  drin → Real gegen Bayern ist weiterhin dabei. Das ist dieselbe Lesart wie
//  `teamModus: "einer"` überall sonst, und wer sie hier nicht erklärt bekommt,
//  hält das Ergebnis für einen Fehler.
// ============================================================

export default function LostopfVorauswahl({ wettbewerb, matches = [], spiele, onChange }) {
  const toepfe = toepfeVon(wettbewerb);
  const [regel, setRegel] = useState(DEFAULT_LOSTOPF_REGEL);

  const rein = useMemo(() => sanitizeLostopfRegel(regel, wettbewerb), [regel, wettbewerb]);
  const vereine = useMemo(() => vereineDerRegel(rein, wettbewerb), [rein, wettbewerb]);
  const ids = useMemo(
    () => lostopfSpiele(matches, rein, wettbewerb), [matches, rein, wettbewerb]);

  // Wie viele Spiele hat der Wettbewerb überhaupt? ⚠️ Ohne die Gegenzahl sagt
  // „85 Spiele" nichts — 85 von 159 ist eine Aussage, 85 von 85 wäre keine.
  const gesamt = useMemo(
    () => matches.filter((m) => m?.wettbewerb === wettbewerb).length, [matches, wettbewerb]);

  if (!toepfe.length || !gesamt) return null;

  const setze = (patch) => setRegel({ ...rein, ...patch });
  const topfUm = (feld, nr) => {
    const liste = rein[feld];
    setze({ [feld]: liste.includes(nr) ? liste.filter((x) => x !== nr) : [...liste, nr] });
  };
  const vereinUm = (name) => {
    const ohne = rein.ohne;
    setze({ ohne: ohne.includes(name) ? ohne.filter((v) => v !== name) : [...ohne, name] });
  };

  const uebernehmen = () => onChange({
    jeWettbewerb: {
      ...(spiele?.jeWettbewerb ?? {}),
      [wettbewerb]: { modus: "liste", matchIds: ids },
    },
  });

  const schonUebernommen = (spiele?.jeWettbewerb?.[wettbewerb]?.matchIds ?? []).length;
  const kurz = WETTBEWERB[wettbewerb]?.kurz ?? wettbewerb.toUpperCase();

  return (
    <Feinheiten
      titel={`Lostopf-Vorauswahl (${kurz})`}
      zusammenfassung={schonUebernommen
        ? `${schonUebernommen} Spiele übernommen`
        : `${ids.length} von ${gesamt} Spielen`}
      abweichend={schonUebernommen > 0}
    >
      <p style={{ fontSize: "0.75rem", color: C.muted, margin: "8px 0", lineHeight: 1.5 }}>
        Nicht alle Vereine, sondern die aus bestimmten Töpfen — und in der K.-o.-Runde
        gern mehr als in der Ligaphase. Einzelne Vereine kannst du danach abwählen.
      </p>

      <Reihe titel="Töpfe (ganze Runde)">
        {toepfe.map((nr) => (
          <Knopf key={nr} an={rein.toepfe.includes(nr)} ton={C.mint}
            label={`Topf ${nr}`} onClick={() => topfUm("toepfe", nr)} />
        ))}
      </Reihe>

      <Reihe titel="Zusätzlich in der K.-o.-Runde">
        {toepfe.map((nr) => (
          <Knopf key={nr} an={rein.koToepfe.includes(nr)} ton={C.indigo}
            label={`Topf ${nr}`} onClick={() => topfUm("koToepfe", nr)} />
        ))}
      </Reihe>

      {/* 🔴 Andis „deutsche Mannschaften": abgeleitet aus der Liga-Zugehörigkeit,
          nicht als zweite Länderliste gepflegt. */}
      <Reihe titel="Dazu die Vereine aus">
        {["bl", "bl2"].map((liga) => (
          <Knopf key={liga} an={rein.ausLigen.includes(liga)} ton={C.gold ?? C.akzent}
            label={WETTBEWERB[liga]?.label ?? liga}
            onClick={() => setze({
              ausLigen: rein.ausLigen.includes(liga)
                ? rein.ausLigen.filter((l) => l !== liga)
                : [...rein.ausLigen, liga],
            })} />
        ))}
      </Reihe>

      {/* ── Einzelne abwählen ──
          🔴 Der Zusatz, der aus der Vorauswahl ein Werkzeug macht. */}
      {vereine.zurWahl.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: "0.6875rem", color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
            Vereine ({vereine.gewaehlt.length} von {vereine.zurWahl.length})
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {[...vereine.zurWahl].sort((a, b) => a.localeCompare(b)).map((v) => {
              const raus = vereine.abgewaehlt.includes(v);
              return (
                <button key={v} onClick={() => vereinUm(v)} style={{
                  ...TAPZIEL, cursor: "pointer", fontFamily: "inherit", fontSize: "0.75rem",
                  padding: "5px 10px", borderRadius: RUND.pille,
                  background: raus ? "transparent" : `${C.mint}1e`,
                  color: raus ? C.muted : C.text,
                  border: `1px solid ${raus ? C.line : C.mint + "55"}`,
                  textDecoration: raus ? "line-through" : "none",
                }}>
                  {v}<span style={{ color: C.muted, marginLeft: 5, fontFamily: MONO, fontSize: "0.625rem" }}>
                    T{topfVon(wettbewerb, v) ?? "–"}
                  </span>
                </button>
              );
            })}
          </div>
          {/* ⚠️ Ohne diesen Satz hält jemand das Ergebnis für einen Fehler. */}
          <p style={{ fontSize: "0.6875rem", color: C.muted, margin: "6px 0 0", lineHeight: 1.45 }}>
            Ein abgewählter Verein bringt kein Spiel mehr herein — verbietet ihn aber nicht:
            spielt er gegen einen gewählten, ist die Begegnung weiter dabei.
          </p>
        </div>
      )}

      {vereine.nurKo.length > 0 && (
        <p style={{ fontSize: "0.6875rem", color: C.muted, margin: "8px 0 0", lineHeight: 1.45 }}>
          Nur in der K.-o.-Runde dabei: {vereine.nurKo.length} weitere Vereine.
        </p>
      )}

      <div style={{
        background: `${C.mint}10`, border: `1px solid ${C.mint}33`, borderRadius: RUND.karte,
        padding: "9px 11px", margin: "12px 0 8px", fontSize: "0.75rem", lineHeight: 1.5,
      }}>
        <div style={{ fontFamily: MONO, color: C.mint, fontWeight: 700 }}>
          {ids.length} von {gesamt} Spielen
        </div>
        <div style={{ color: C.muted, marginTop: 3 }}>{beschreibeLostopf(rein, wettbewerb)}</div>
      </div>

      <button onClick={uebernehmen} disabled={!ids.length} style={{
        cursor: ids.length ? "pointer" : "default", fontFamily: "inherit",
        fontSize: "0.8125rem", fontWeight: 700, width: "100%", boxSizing: "border-box",
        padding: "11px 0", borderRadius: RUND.karte,
        background: `${C.akzent}22`, color: C.akzent, border: `1px solid ${C.akzent}66`,
        opacity: ids.length ? 1 : 0.45,
      }}>
        {schonUebernommen ? "Auswahl ersetzen" : "Als Spielauswahl übernehmen"}
      </button>

      {/* 🔴 Der Preis gehört zum Knopf, nicht in eine Fußnote. */}
      <p style={{ fontSize: "0.6875rem", color: C.muted, margin: "6px 0 0", lineHeight: 1.45 }}>
        Übernommen wird eine feste Begegnungs-Liste. Sie gilt für diesen Spielplan —
        bei einem neuen Spielplan hier neu übernehmen.
      </p>
    </Feinheiten>
  );
}

function Reihe({ titel, children }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: "0.6875rem", color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>
        {titel}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{children}</div>
    </div>
  );
}

function Knopf({ an, label, ton, onClick }) {
  return (
    <button onClick={onClick} style={{
      ...TAPZIEL, cursor: "pointer", fontFamily: "inherit", fontSize: "0.75rem", fontWeight: 600,
      padding: "5px 11px", borderRadius: RUND.pille,
      background: an ? `${ton}22` : C.surface2, color: an ? ton : C.muted,
      border: `1px solid ${an ? ton + "66" : C.line}`,
    }}>{label}</button>
  );
}
