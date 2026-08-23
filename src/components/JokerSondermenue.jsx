"use client";

import { useMemo, useState } from "react";
import { DEFAULT_RULES, RULE_LIMITS, reglerSchritt, einsatzKonflikte } from "@/lib/engine";
import { beschreibeVerteilung } from "@/lib/jokerPlan";
import { TAKTE, perioden } from "@/lib/jokerBudget";
import { PHASEN, DUELL_LIMITS, sanitizeDuellJoker } from "@/lib/duellJoker";
import { beschreibeMuenzTakt, muenzTaktKonflikte } from "@/lib/muenzTakt";
import { C, MONO, RUND } from "@/lib/theme";
import { zahl, fmtFaktor } from "@/lib/format";
import { TAPZIEL } from "@/lib/tapziel";
import { Zahl, Slider, Toggle, Field, Stepper, GrosseZeile } from "@/components/Eingaben";
import JokerVerteilung from "@/components/JokerVerteilung";
import JokerOekonomie from "@/components/JokerOekonomie";
import JokerGrundform from "@/components/JokerGrundform";
import LimitKlassen from "@/components/LimitKlassen";
import Ereignisse from "@/components/Ereignisse";
import DuellJoker from "@/components/DuellJoker";
import Drehrad from "@/components/Drehrad";
import TeilCodeFeld from "@/components/TeilCodeFeld";

// ============================================================
//  JOKER-SONDERMENÜ — die 84 Einstellwerte hinter EINER Zeile
//  (design/joker-sondermenue.md, Abschnitt 2)
//
//  🔴 Warum es diese Datei gibt: die Joker-Einstellungen lagen in
//  `Spielerstellung.jsx` an SIEBEN Stellen verstreut — Joker-Ökonomie,
//  Limitierungsklassen, Joker-Grundform, „Joker & Gewichtung", „Joker
//  verdienen", Duell-Joker, Drehrad — über 700 Zeilen auseinander. Die Frage
//  „wann kommt eigentlich ein Joker?" wurde damit an DREI Orten beantwortet.
//
//  ⚠️ Die Ordnung folgt NICHT dem Code, sondern der Frage, die ein Admin
//  stellt. `joker`, `budget`, `jokerBasis`, `duell` und `drehrad` sind
//  technisch fünf Blöcke — zum Bedienen sind sie fünf ANDERE:
//
//    A · Welche Joker gibt es?     D · Wann gelten sie?
//    B · Wie stark wirken sie?     E · Wo sind die Grenzen?
//    C · Woher kommen sie?
//
//  ── Was diese Datei bedienbar hält (Andis Bedingung: „auch ohne viel
//     durchzulesen und alles einzeln einstellen") ──
//  1. Jede Karte zeigt ZUGEKLAPPT ihren Stand. Wer nichts ändern will, liest
//     fünf Zeilen und schließt wieder.
//  2. Alle Karten starten geschlossen. Das Sondermenü ist damit selbst im
//     geöffneten Zustand eine halbe Bildschirmhöhe, nicht 700 Zeilen.
//  3. Die Voreinstellung setzt alle 84 Werte — Aufklappen ist Kür.
//
//  ── ⚠️ Zwei bewusste Abweichungen von der Spec, die Andi entscheiden soll ──
//  1. **`JokerGrundform` steht GANZ in Karte E**, obwohl die Spec ihre
//     Zeitfelder (Verfall, Widerruf, Abklingzeit) in Karte D listet. Der Grund
//     ist die Bauform: die Grundform trägt Standard UND Abweichung je Art —
//     dieses Gerüst dreimal zu rendern (einmal je Karte) wäre unbedienbarer
//     als der Verweis, der jetzt in Karte D steht.
//  2. **Drehrad und Ereignisse stehen in Karte C**, nicht in A. Die Spec nennt
//     sie an beiden Stellen (A „eigene Zeile", C „erspielt"). C gewinnt, weil
//     dort die Frage steht, die sie beantworten: WOHER kommt ein Joker. In A
//     stehen sie als Schalter, damit sichtbar bleibt, dass es sie gibt.
//  Beides ist in `design/joker-sondermenue.md` Abschnitt 4 als offene Frage
//  vermerkt.
// ============================================================

// Der Stand für die zugeklappte Hauptzeile. Steht hier und nicht im Screen,
// damit Zeile und Menü dieselbe Quelle haben (Runden-Schicht, CLAUDE.md).
export function jokerZeileStand(rules) {
  const j = rules?.joker;
  if (!j?.enabled) return "aus";
  const modus = j.modus === "ranking" ? "Rangliste" : j.modus === "einsatz" ? "Einsatz" : "Ein Joker";
  const staerke = j.modus === "einsatz"
    ? `${zahl(j.einsatzProSpieltag)} Münzen`
    : j.modus === "ranking"
      ? `bis ${fmtFaktor(Math.max(...(j.faktoren || [1])))}`
      : fmtFaktor(j.faktor ?? 1.5);
  return `${modus} · ${staerke}`;
}

// `onTeilCode`, `geladeneCodes` und `onGeladen` sind optional: ohne sie zeigt
// das Menü kein Code-Feld. Der Screen entscheidet, ob eines hingehört — das
// Menü kennt weder die Merkliste noch den Ladeweg.
export default function JokerSondermenue({ rules, premium, spieleJeSpieltag = [], onChange, onTeilCode = null, geladeneCodes = null, onGeladen = null }) {
  // Eine Karte zur Zeit — dieselbe Entscheidung wie bei den Liga-Zeilen in der
  // Betippungsauswahl: zwei offene Karten sind wieder eine lange Seite.
  const [karte, setKarte] = useState(null);
  const [unter, setUnter] = useState(null);
  const auf = (k) => setKarte((o) => (o === k ? null : k));
  const aufUnter = (k) => setUnter((o) => (o === k ? null : k));

  const L = RULE_LIMITS;
  const j = rules.joker;
  const jh = j.heimat ?? DEFAULT_RULES.joker.heimat;   // Heimatbonus
  const jm = j.mut ?? DEFAULT_RULES.joker.mut;         // Mut-Bonus
  const duell = sanitizeDuellJoker(rules?.duell);

  const setzeJoker = (p) => onChange({ joker: { ...j, ...p } });
  // `einsatzFenster` ist dieselbe Form wie `rules.duell`/`budget.fenster` —
  // explizit mit dem bisherigen Fenster mergen statt es zu ersetzen.
  const setzeFenster = (teil) => setzeJoker({ einsatzFenster: { ...j.einsatzFenster, ...teil } });
  // `JokerOekonomie` meldet meist nur einen Narren/Shop-Patch zurück (ein
  // einzelnes `budget`-Feld); ein Klick in der Bibliothek dort übernimmt
  // dagegen das GANZE Regelfragment einer Kombination (`budget` +
  // `limitKlassen` + `duell`, alle drei GANZ ERSETZT, nicht gemischt).
  const setzeOekonomie = (p) => {
    const keys = Object.keys(p);
    if (keys.length === 1 && keys[0] === "budget") {
      onChange({ budget: { ...(rules.budget || DEFAULT_RULES.budget), ...p.budget } });
      return;
    }
    onChange(p);
  };

  // ── Münz-Rechnung (Einsatz-Modus) ─────────────────────────
  // Wie viele Runden-Spieltage teilen sich EIN Münz-Budget? Über `perioden()`
  // aus jokerBudget.js gerechnet, damit es dieselbe eine Quelle ist wie in
  // muenzTakt.js — nicht per Hand nach Takt-Namen unterschieden.
  const spieltageGesamt = spieleJeSpieltag.length || 34;
  const muenzPeriode = j.modus === "einsatz"
    ? perioden(j.einsatzTakt, { n: j.einsatzTaktN, fenster: j.einsatzFenster }, spieltageGesamt)[0] ?? null
    : null;
  const spieltageJePeriode = muenzPeriode ? muenzPeriode.bis - muenzPeriode.von + 1 : 1;
  // Typische Spieltagsgröße für den Einsatz-Modus: hier gibt es keinen
  // konkreten Spieltag, nur eine plausible Größe aus der aktuellen
  // Spielauswahl. Verbindlich prüft erst die Tippabgabe (Text unten).
  const einsatzSpieleTypisch = spieleJeSpieltag[0] ?? null;
  // ⚠️ Die Konflikt-Prüfung misst gegen die Spiele, die sich EIN Budget
  // teilen — seit dem Münz-Takt ist das nicht mehr der einzelne Spieltag,
  // sondern die ganze Periode (z. B. „alle 4 Spieltage").
  const einsatzSpieleJePeriode = einsatzSpieleTypisch != null
    ? einsatzSpieleTypisch * spieltageJePeriode : null;
  const einsatzKonfliktListe = j.modus === "einsatz"
    ? [...einsatzKonflikte(rules, einsatzSpieleJePeriode, spieltageJePeriode), ...muenzTaktKonflikte(rules)]
    : [];
  // Beschriftungen im Einsatz-Block hängen am Takt: „je Spieltag" stimmt nur,
  // solange sich eine Münz-Periode nicht über mehrere Spieltage erstreckt.
  const muenzZeitraum = (j.einsatzTakt ?? "spieltag") === "spieltag" ? "Spieltag" : "Periode";

  // ── „Was kommt am Ende dabei heraus?" ─────────────────────
  // Verteilung, Stärke und Ereignisse werden in DREI Karten eingestellt; diese
  // eine Zeile fasst die drei Antworten zusammen und steht deshalb ÜBER den
  // Karten, nicht in einer davon.
  const zusammenfassung = useMemo(() => {
    if (!j?.enabled) return null;
    const teile = [];
    // `beschreibeVerteilung` endet als eigener Satz — der Punkt muss weg,
    // sonst steht mitten in der Zeile „… Joker. · jeder ×1,5."
    teile.push(beschreibeVerteilung(j.verteilung, 34).replace(/\.$/, ""));
    teile.push(j.modus === "ranking"
      ? `Gewichte bis ${fmtFaktor(Math.max(...(j.faktoren || [1])))}`
      : `jeder ${fmtFaktor(j.faktor ?? 1.5)}`);
    const er = rules.ereignisse;
    if (er?.enabled && (er.aktive?.length ?? 0) > 0 && er.maxErspielt > 0) {
      teile.push(`dazu bis zu ${er.maxErspielt} verdienbar`);
    }
    return teile.filter(Boolean).join(" · ") + ".";
  }, [j, rules.ereignisse]);

  // ── Der Stand je Karte, zugeklappt lesbar ─────────────────
  const standA = !j.enabled ? "aus" : [
    j.modus === "ranking" ? "Rangliste" : j.modus === "einsatz" ? "Einsatz" : "Ein Joker",
    jh.enabled ? "Heimat" : null,
    jm.enabled ? "Mut" : null,
    duell.enabled ? "Duell" : null,
  ].filter(Boolean).join(" · ");

  const standB = !j.enabled ? "—" : j.modus === "einsatz"
    ? `${zahl(j.einsatzProSpieltag)} Münzen je ${muenzZeitraum}`
    : j.modus === "ranking"
      ? `bis ${fmtFaktor(Math.max(...(j.faktoren || [1])))}`
      : fmtFaktor(j.faktor ?? 1.5);

  const budgetAn = (rules.budget ?? DEFAULT_RULES.budget)?.enabled === true;
  const radAn = (rules.drehrad ?? DEFAULT_RULES.drehrad)?.enabled === true;
  const ereignisseAn = rules.ereignisse?.enabled === true;
  const standC = [
    j.enabled ? "geschenkt" : null,
    budgetAn ? "Shop" : null,
    ereignisseAn || radAn ? "erspielt" : null,
  ].filter(Boolean).join(" · ") || "keine Quelle";

  const standD = j.modus === "einsatz"
    ? (TAKTE.find((t) => t.key === (j.einsatzTakt ?? "spieltag"))?.label ?? "je Spieltag")
    : "je Spieltag";

  const klassen = Array.isArray(rules.limitKlassen) ? rules.limitKlassen.length : 0;
  const standE = klassen > 0 ? `${klassen} Klasse${klassen === 1 ? "" : "n"}` : "Grundform";

  return (
    <div>
      {zusammenfassung && (
        <div style={{
          background: `${C.mint}12`, border: `1px solid ${C.mint}33`,
          borderRadius: RUND.karte, padding: "10px 13px", marginBottom: 10,
          fontSize: 12, color: C.mint, lineHeight: 1.5,
        }}>
          {zusammenfassung}
        </div>
      )}

      {/* ══ A · Welche Joker gibt es? ══════════════════════ */}
      <GrosseZeile icon="🃏" titel="Welche Joker gibt es?" unter="Arten und Wirkprinzipien"
        wert={standA} offen={karte === "A"} onClick={() => auf("A")}>

        {!premium ? (
          <div style={{
            background: `${C.akzent}12`, border: `1px solid ${C.akzent}44`,
            borderRadius: RUND.karte, padding: "13px 15px", marginBottom: 8,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.akzent }}>🔒 Premium-Funktion</div>
            <p style={{ fontSize: 12, color: C.muted, margin: "7px 0 0", lineHeight: 1.5 }}>
              Es genügt, wenn <strong>du als Admin</strong> Premium hast — die ganze
              Runde kann dann gewichten. Alle anderen Regler bleiben frei nutzbar.
            </p>
          </div>
        ) : (
          <Toggle label="Gewichtung erlauben" on={j.enabled}
            onChange={(on) => setzeJoker({ enabled: on })} />
        )}

        {premium && j.enabled && (
          <>
            <Field label="Modus">
              <div style={{ display: "flex", gap: 6 }}>
                {[
                  { key: "einzel", label: "Ein Joker", hint: "Ein Spiel pro Spieltag" },
                  { key: "ranking", label: "Rangliste", hint: "Alle Spiele ranken" },
                  { key: "einsatz", label: "Einsatz", hint: "Münzen auf Spiele verteilen" },
                ].map((m) => {
                  const on = j.modus === m.key;
                  return (
                    <button key={m.key} onClick={() => setzeJoker({ modus: m.key })} style={{
                      cursor: "pointer", fontSize: 12, fontFamily: "inherit", padding: "8px 12px",
                      borderRadius: RUND.karte, flex: 1, textAlign: "left",
                      background: on ? `${C.akzent}22` : C.surface, color: on ? C.akzent : C.muted,
                      border: `1px solid ${on ? C.akzent + "66" : C.line}`,
                    }}>
                      <div style={{ fontWeight: 700 }}>{m.label}</div>
                      <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{m.hint}</div>
                    </button>
                  );
                })}
              </div>
            </Field>

            {/* Die passiven Arten: sie greifen von allein, ohne dass jemand
                etwas markieren muss. Hier nur die SCHALTER — die Stärke steht
                in Karte B, weil das die Frage „wie stark" ist. */}
            <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 12, paddingTop: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Weitere Joker-Arten</div>
              <p style={{ fontSize: 11, color: C.muted, marginTop: 0, marginBottom: 8, lineHeight: 1.4 }}>
                Greifen von allein, ohne dass jemand etwas markieren muss. Ihre
                Aufschläge werden <strong>addiert</strong> und vom Deckel begrenzt.
              </p>
              <Toggle label="Heimatbonus — Spiele des eigenen Vereins" on={jh.enabled === true}
                onChange={(on) => setzeJoker({ heimat: { ...jh, enabled: on } })} />
              <Toggle label="Mut-Bonus — gegen den Favoriten, und du behältst recht" on={jm.enabled === true}
                onChange={(on) => setzeJoker({ mut: { ...jm, enabled: on } })} />
              <p style={{ fontSize: 11, color: C.muted, marginTop: -2, lineHeight: 1.4 }}>
                Wie stark die beiden wirken, steht in <strong>Wie stark wirken sie?</strong>
              </p>
            </div>
          </>
        )}

        {/* Fremdjoker (Andi, 22.08.2026): der einzige Joker, der jemand
            ANDEREN trifft — eigene Zeile mit eigenem Untermenü, weil er
            eigene Zeitfenster und eigene Schutzregeln hat. */}
        <div style={{ marginTop: 12 }}>
          <GrosseZeile icon="⚔️" titel="Fremdjoker (Duell)" unter="Klauen und Blocken"
            wert={duell.enabled ? "an" : "aus"}
            offen={unter === "duell"} onClick={() => aufUnter("duell")}>
            <DuellJoker rules={rules} onChange={(d) => onChange({ duell: d })} />
          </GrosseZeile>
        </div>
      </GrosseZeile>

      {/* ══ B · Wie stark wirken sie? ══════════════════════ */}
      <GrosseZeile icon="📈" titel="Wie stark wirken sie?" unter="Faktoren und Einsätze"
        wert={standB} offen={karte === "B"} onClick={() => auf("B")}>

        {!premium || !j.enabled ? (
          <p style={{ fontSize: 12, color: C.muted, margin: "4px 0", lineHeight: 1.5 }}>
            Die Gewichtung ist aus — es gibt nichts zu stärken. Einschalten in
            <strong> Welche Joker gibt es?</strong>
          </p>
        ) : (
          <div style={{ paddingLeft: 12, borderLeft: `1px solid ${C.line}` }}>
            <p style={{ fontSize: 12, color: C.muted, marginTop: 0, marginBottom: 10, lineHeight: 1.4 }}>
              Der Faktor greift auf die fertige Wertung — Ergebnis <em>und</em> Torschützen
              zusammen — und wirkt in beide Richtungen: ein gewichtetes Spiel, das
              danebengeht, tut auch mehr weh.
            </p>

            {/* Im Ranking-Modus ist der Pool die Wahrheit — sonst zeigte der
                Regler einen anderen Wert als die Stufen darunter.
                ⚠️ Im Einsatz-Modus gibt es ihn NICHT: dort bestimmt der
                gesetzte Münzbetrag den Faktor, `joker.faktor` wird gar nicht
                gelesen. Ein sichtbarer Regler ohne Wirkung ist genau das, was
                der Baukasten-Grundsatz ausschließt. */}
            {j.modus !== "einsatz" && (
              <Slider label={j.modus === "ranking" ? "Höchstes Gewicht" : "Joker-Faktor"}
                value={j.modus === "ranking" ? j.faktoren[0] : j.faktor} {...L.joker.faktor}
                step={reglerSchritt(rules, L.joker.faktor)}
                onChange={(v) => setzeJoker(j.modus === "ranking"
                  ? { faktor: v, faktoren: buildWeightPool(v, j.faktoren.length) }
                  : { faktor: v })}
                fmt={fmtFaktor}
                hint={j.modus === "ranking"
                  ? "Das stärkste Gewicht der Rangliste. Die übrigen Stufen liegen gleichmäßig darunter."
                  : "Womit das markierte Spiel multipliziert wird."} />
            )}

            {j.modus === "ranking" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
                  <span style={{ fontSize: 13, color: C.muted }}>Stufen</span>
                  <Stepper value={j.faktoren.length} min={L.joker.anzahlFaktoren.min} max={L.joker.anzahlFaktoren.max}
                    onStep={(d) => {
                      const n = Math.min(L.joker.anzahlFaktoren.max, Math.max(L.joker.anzahlFaktoren.min, j.faktoren.length + d));
                      setzeJoker({ faktoren: buildWeightPool(j.faktor, n) });
                    }} />
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  {j.faktoren.map((f) => (
                    <span key={f} style={{
                      ...TAPZIEL, fontSize: 12, fontFamily: MONO, padding: "5px 10px", borderRadius: RUND.pille,
                      background: f > 1 ? `${C.akzent}18` : C.surface,
                      color: f > 1 ? C.akzent : C.muted,
                      border: `1px solid ${f > 1 ? C.akzent + "44" : C.line}`,
                    }}>{fmtFaktor(f)}</span>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: C.muted, marginBottom: 8, lineHeight: 1.4 }}>
                  Jedes Gewicht darf pro Spieltag nur <strong>einmal</strong> vergeben werden —
                  alle haben denselben Pool, die Verteilung ist die Kunst. Übrige Spiele zählen ×1,0.
                </p>
              </>
            )}

            {/* Einsatz-Modus (L2): kein fester Pool, sondern ein Münz-Budget,
                das der Spieler frei auf die Spiele verteilt. Die beiden
                Anteils-Regler speichern weiterhin einen ANTEIL (reist mit dem
                Creator-Code, unabhängig vom Budget einer fremden Runde) —
                angezeigt werden Münzen, weil der Admin in Münzen denkt.
                ⚠️ WIE OFT es Münzen gibt, steht in Karte „Wann gelten sie?" */}
            {j.modus === "einsatz" && (
              <>
                <Slider label={`Münzen je ${muenzZeitraum}`} value={j.einsatzProSpieltag}
                  {...L.joker.einsatzProSpieltag}
                  onChange={(v) => setzeJoker({ einsatzProSpieltag: v })}
                  fmt={(x) => `${zahl(x)} Münzen`}
                  hint={muenzZeitraum === "Spieltag"
                    ? "Was jeder Spieler an diesem Spieltag zu verteilen hat."
                    : "Was jeder Spieler in dieser Periode insgesamt zu verteilen hat — wie oft eine Periode beginnt, steht unter „Wann gelten sie?“."} />
                <Zahl label={`Münzen je ${muenzZeitraum}`} wert={j.einsatzProSpieltag} limits={L.joker.einsatzProSpieltag}
                  onChange={(v) => setzeJoker({ einsatzProSpieltag: v })} />

                {/* ⚠️ Kein `reglerSchritt` hier: `maxAnteilProSpiel` ist laut
                    RULE_LIMITS-Kommentar ausdrücklich NICHT Teil der
                    Multiplikator-Familie (reglerRaster.test.js) — eine
                    Validierungsgrenze, kein additiver Modifikator. */}
                <Slider label="Höchsteinsatz je Spiel" value={j.maxAnteilProSpiel}
                  {...L.joker.maxAnteilProSpiel}
                  onChange={(v) => setzeJoker({ maxAnteilProSpiel: v })}
                  fmt={(x) => `${zahl(Math.round(x * j.einsatzProSpieltag))} von ${zahl(j.einsatzProSpieltag)} Münzen`}
                  hint="Mehr darf niemand auf ein einzelnes Spiel setzen." />
                <Zahl label="Höchsteinsatz je Spiel (Münzen)"
                  wert={Math.round(j.maxAnteilProSpiel * j.einsatzProSpieltag)}
                  limits={{
                    min: Math.round(L.joker.maxAnteilProSpiel.min * j.einsatzProSpieltag),
                    max: Math.round(L.joker.maxAnteilProSpiel.max * j.einsatzProSpieltag),
                    step: Math.max(1, Math.round(L.joker.maxAnteilProSpiel.step * j.einsatzProSpieltag)),
                  }}
                  onChange={(v) => setzeJoker({ maxAnteilProSpiel: v / j.einsatzProSpieltag })} />

                {/* Gleiche Begründung wie beim Höchsteinsatz — kein `reglerSchritt`. */}
                <Slider label="Mindesteinsatz je Spiel" value={j.minAnteilProSpiel}
                  {...L.joker.minAnteilProSpiel}
                  onChange={(v) => setzeJoker({ minAnteilProSpiel: v })}
                  fmt={(x) => x === 0 ? "kein Mindesteinsatz" : `${zahl(Math.round(x * j.einsatzProSpieltag))} Münzen`}
                  hint="0 = kein Mindesteinsatz. Sonst gilt: auf ein Spiel entweder gar nichts setzen oder mindestens so viel." />
                <Zahl label="Mindesteinsatz je Spiel (Münzen, 0 = keiner)"
                  wert={Math.round(j.minAnteilProSpiel * j.einsatzProSpieltag)}
                  limits={{
                    min: 0,
                    max: Math.round(L.joker.minAnteilProSpiel.max * j.einsatzProSpieltag),
                    step: Math.max(1, Math.round(L.joker.minAnteilProSpiel.step * j.einsatzProSpieltag)),
                  }}
                  onChange={(v) => setzeJoker({ minAnteilProSpiel: v / j.einsatzProSpieltag })} />

                <Toggle label="Spiele auslassen erlaubt" on={j.skippenErlaubt !== false}
                  onChange={(on) => setzeJoker({ skippenErlaubt: on })} />
                <p style={{ fontSize: 11, color: C.muted, marginTop: -4, marginBottom: 8, lineHeight: 1.4 }}>
                  Erlaubt: ein Spiel mit Einsatz 0 tippen, ohne den Mindesteinsatz zu verletzen —
                  die Poker-Blind-Lesart „entweder gar nicht, oder mindestens so viel".
                </p>

                {/* Konflikt-Hinweise. Die Zahl der Spiele je Periode ist hier
                    nicht sicher bekannt — deshalb ausdrücklich als typische
                    Größe markiert; verbindlich prüft erst die Tippabgabe. */}
                {einsatzKonfliktListe.length > 0 && (
                  <div style={{
                    background: `${C.akzent}12`, border: `1px solid ${C.akzent}33`, borderRadius: RUND.karte,
                    padding: "10px 12px", marginBottom: 10,
                  }}>
                    {einsatzKonfliktListe.map((k) => (
                      <div key={k.key} style={{ fontSize: 12, color: C.muted, lineHeight: 1.45, marginBottom: 4 }}>
                        {k.text}
                      </div>
                    ))}
                    {einsatzSpieleTypisch != null && (
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>
                        {spieltageJePeriode > 1
                          ? <>Angenommen bei etwa {einsatzSpieleTypisch} Spielen je Spieltag, macht das rund{" "}
                              {einsatzSpieleJePeriode} Spiele über die {spieltageJePeriode} Spieltage einer
                              Münz-Periode hinweg — eure tatsächliche Zahl hängt von der Spielauswahl ab
                              und wird beim Tippen verbindlich geprüft.</>
                          : <>Angenommen bei etwa {einsatzSpieleTypisch} Spielen je Spieltag — eure tatsächliche
                              Zahl hängt von der Spielauswahl ab und wird beim Tippen verbindlich geprüft.</>}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Die Stärke der passiven Arten — die Schalter stehen in Karte A. */}
            {jh.enabled && (
              <Field label={`Heimatbonus: ${fmtFaktor(jh.faktor ?? 1.2)}`}>
                <input type="range"
                  min={L.joker.faktor.min} max={L.joker.faktor.max} step={reglerSchritt(rules, L.joker.faktor)}
                  value={jh.faktor ?? 1.2}
                  onChange={(e) => setzeJoker({ heimat: { ...jh, faktor: Number(e.target.value) } })}
                  style={{ width: "100%", accentColor: C.akzent }} />
                <div style={{ fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 1.4 }}>
                  Jeder wählt seinen Verein selbst. Wirkt symmetrisch — auch auf
                  Minuspunkte, denn Fans tippen ihr Team gern zu optimistisch.
                </div>
              </Field>
            )}

            {jm.enabled && (
              <Field label={`Mut-Bonus: ×${(jm.faktor ?? 1.1).toFixed(2)}`}>
                <input type="range"
                  min={L.joker.mutFaktor.min} max={L.joker.mutFaktor.max} step={reglerSchritt(rules, L.joker.mutFaktor)}
                  value={jm.faktor ?? 1.1}
                  onChange={(e) => setzeJoker({ mut: { ...jm, faktor: Number(e.target.value) } })}
                  style={{ width: "100%", accentColor: C.akzent }} />
                <div style={{ fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 1.4 }}>
                  Zahlt nur, wenn der mutige Tipp <strong>aufgeht</strong> — sonst würde
                  blindes Dagegenhalten belohnt. Deshalb auch die engere Obergrenze
                  (×{L.joker.mutFaktor.max}): darüber gewinnt in der Simulation der Zocker.
                </div>
              </Field>
            )}

            {duell.enabled && (
              <p style={{
                fontSize: 11, color: C.muted, marginTop: 10, lineHeight: 1.45,
                borderTop: `1px solid ${C.line}`, paddingTop: 8,
              }}>
                Wie viel ein <strong>Fremdjoker</strong> klaut oder blockt, steht bei ihm
                selbst — in <strong>Welche Joker gibt es?</strong>, Zeile „Fremdjoker".
              </p>
            )}
          </div>
        )}
      </GrosseZeile>

      {/* ══ C · Woher kommen sie? ══════════════════════════ */}
      <GrosseZeile icon="🎁" titel="Woher kommen sie?" unter="geschenkt · gekauft · erspielt"
        wert={standC} offen={karte === "C"} onClick={() => auf("C")}>

        <p style={{ fontSize: 12, color: C.muted, marginTop: 4, marginBottom: 10, lineHeight: 1.45 }}>
          Drei Wege nebeneinander, jeder einzeln zuschaltbar. Wer keinen davon
          einschaltet, spielt reines Quotentippen.
        </p>

        {/* ── geschenkt ── */}
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Geschenkt — vom Admin verteilt</div>
        {j.enabled ? (
          <>
            <JokerVerteilung verteilung={j.verteilung}
              onChange={(verteilung) => setzeJoker({ verteilung })} />

            {/* Gemeinsame Abstimmung — die ANDERE Antwort auf „an welchen
                Spieltagen?". Beide gleichzeitig wären zwei Instanzen für
                dieselbe Frage, deshalb nur bei freier Verteilung wählbar. */}
            <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 10, paddingTop: 10 }}>
              {j.verteilung?.modus === "frei" ? (
                <>
                  <Toggle label="Spieltage gemeinsam abstimmen" on={j.abstimmung === true}
                    onChange={(on) => setzeJoker({ abstimmung: on })} />
                  <p style={{ fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>
                    {j.abstimmung
                      ? "Die Runde stimmt ab: Joker gibt es nur an Spieltagen mit Mehrheit."
                      : "Aus = Joker an jedem Spieltag. An = die Runde entscheidet per Mehrheit, welche Spieltage einen Joker bekommen."}
                  </p>
                </>
              ) : (
                <p style={{ fontSize: 11, color: C.muted, margin: 0, lineHeight: 1.4 }}>
                  Die Abstimmung über Joker-Spieltage entfällt — du hast die Verteilung
                  oben schon festgelegt. Für eine Abstimmung wieder auf <strong>Frei</strong> stellen.
                </p>
              )}
            </div>
          </>
        ) : (
          <p style={{ fontSize: 12, color: C.muted, margin: "0 0 10px", lineHeight: 1.45 }}>
            Die Gewichtung ist aus — es wird nichts verteilt.
          </p>
        )}

        {/* ── gekauft ── */}
        <div style={{ marginTop: 14 }}>
          <GrosseZeile icon="🃏" titel="Gekauft — der Narren-Shop" unter="Zufluss, Preise, Verfall"
            wert={budgetAn ? "an" : "aus"}
            offen={unter === "shop"} onClick={() => aufUnter("shop")}>
            <JokerOekonomie rules={rules} onChange={setzeOekonomie} />
          </GrosseZeile>

          {/* ── erspielt ── */}
          {/* 🔴 EREIGNIS-CODE (Andis TC4, 23.08.2026) — „ein Code nur für
              Ereignisse, samt Auslosung am Rad". Er steht hier und nicht oben
              an der Joker-Zeile, weil genau darunter beides liegt, was er
              trägt: die Ereignisse und das Drehrad. Ein Code-Feld gehört vor
              SEINE Bibliothek (ATE1), nicht an den Anfang des Menüs. */}
          {onTeilCode && (
            <div style={{ marginBottom: 4 }}>
              <TeilCodeFeld aspekt="ereignisse" rules={rules} geladen={geladeneCodes?.ereignisse}
                onGeladen={onGeladen} onChange={onTeilCode} />
            </div>
          )}
          <GrosseZeile icon="🏅" titel="Erspielt — Ereignisse" unter="Joker, die man sich verdient"
            wert={ereignisseAn ? "an" : "aus"}
            offen={unter === "ereignisse"} onClick={() => aufUnter("ereignisse")}>
            <Ereignisse rules={rules} onChange={(ereignisse) => onChange({ ereignisse })} />
          </GrosseZeile>

          <GrosseZeile icon="🎡" titel="Erspielt — Drehrad" unter="reiner Zufall aus eigener Tabelle"
            wert={radAn ? "an" : "aus"}
            offen={unter === "drehrad"} onClick={() => aufUnter("drehrad")}>
            <Drehrad rules={rules} onChange={(drehrad) => onChange({ drehrad })} />
          </GrosseZeile>
        </div>
      </GrosseZeile>

      {/* ══ D · Wann gelten sie? ═══════════════════════════ */}
      <GrosseZeile icon="⏱️" titel="Wann gelten sie?" unter="Takt, Fenster, Fristen"
        wert={standD} offen={karte === "D"} onClick={() => auf("D")}>

        {j.enabled && j.modus === "einsatz" ? (
          <>
            {/* WIE OFT es Münzen gibt — Münz-Takt (`muenzTakt.js`). Der Katalog
                `TAKTE` kommt aus jokerBudget.js (dieselbe Quelle wie beim
                Narren-Budget), hier nur zweitgenutzt. */}
            <Field label="Wie oft gibt es Münzen?">
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {TAKTE.map((t) => {
                  const an = (j.einsatzTakt ?? "spieltag") === t.key;
                  return (
                    <button key={t.key} title={t.desc} onClick={() => setzeJoker({ einsatzTakt: t.key })} style={{
                      flex: "1 1 100px", cursor: "pointer", fontFamily: "inherit", padding: "8px 8px",
                      borderRadius: RUND.karte, textAlign: "left",
                      background: an ? `${C.akzent}22` : C.surface, color: an ? C.akzent : C.muted,
                      border: `1px solid ${an ? C.akzent + "66" : C.line}`,
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{t.label}</div>
                    </button>
                  );
                })}
              </div>
            </Field>

            {j.einsatzTakt === "alleNSpieltage" && (
              <Zahl label="Alle wie viele Spieltage?" wert={j.einsatzTaktN} limits={L.joker.einsatzTaktN}
                breite={150} marginTop={8} onChange={(v) => setzeJoker({ einsatzTaktN: v })} />
            )}

            {j.einsatzTakt === "phase" && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>Saison-Fenster</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {PHASEN.map((p) => {
                    const an = (j.einsatzFenster?.phase ?? "letztesDrittel") === p.key;
                    return (
                      <button key={p.key} onClick={() => setzeFenster({ phase: p.key })} style={{
                        textAlign: "left", cursor: "pointer", fontFamily: "inherit", color: C.text,
                        background: an ? `${C.akzent}18` : C.surface,
                        border: `1px solid ${an ? C.akzent + "66" : C.line}`,
                        ...TAPZIEL, borderRadius: RUND.karte, padding: "9px 12px",
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: an ? C.akzent : C.text }}>{p.label}</div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>{p.desc}</div>
                      </button>
                    );
                  })}
                </div>
                {j.einsatzFenster?.phase === "schlussspurt" && (
                  <div style={{ marginTop: 8, maxWidth: 200 }}>
                    <Zahl label="Länge (Spieltage)" wert={j.einsatzFenster?.schlussLaenge} limits={DUELL_LIMITS.schlussLaenge}
                      onChange={(v) => setzeFenster({ schlussLaenge: v })} />
                  </div>
                )}
                {j.einsatzFenster?.phase === "manuell" && (
                  <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                    <Zahl label="Von Spieltag" wert={j.einsatzFenster?.abSpieltag ?? ""} limits={DUELL_LIMITS.abSpieltag} leerErlaubt leerText="Vorgabe"
                      onChange={(v) => setzeFenster({ abSpieltag: v })} />
                    <Zahl label="Bis Spieltag" wert={j.einsatzFenster?.bisSpieltag ?? ""} limits={DUELL_LIMITS.bisSpieltag} leerErlaubt leerText="Vorgabe"
                      onChange={(v) => setzeFenster({ bisSpieltag: v })} />
                  </div>
                )}
              </div>
            )}

            {/* Live-Vorschau. ⚠️ Bewusst `einsatzSpieleTypisch` (Spiele je
                SPIELTAG) übergeben, NICHT `einsatzSpieleJePeriode` —
                `beschreibeMuenzTakt` rechnet die Periode selbst hoch. Die
                bereits hochgerechnete Zahl würde ein zweites Mal multipliziert. */}
            <p style={{ fontSize: 11, color: C.muted, marginTop: 8, lineHeight: 1.45 }}>
              {beschreibeMuenzTakt(rules, { spieltage: spieltageGesamt, spieleJeSpieltag: einsatzSpieleTypisch })}
            </p>
          </>
        ) : (
          <p style={{ fontSize: 12, color: C.muted, marginTop: 4, marginBottom: 10, lineHeight: 1.45 }}>
            Ein Joker gilt für den Spieltag, an dem er gesetzt wird — er wird mit dem
            Tipp abgegeben und friert beim Anpfiff ein. Einen eigenen Takt gibt es nur
            im <strong>Einsatz</strong>-Modus (Münzen), einzustellen in
            <strong> Welche Joker gibt es?</strong>
          </p>
        )}

        {/* ⚠️ Die Spec will „alles Zeitliche an EINER Stelle". Drei Fenster
            liegen bauformbedingt bei ihrem Baustein — statt sie zu duplizieren
            (zwei Wahrheiten) steht hier, wo sie zu finden sind. */}
        <div style={{
          borderTop: `1px solid ${C.line}`, marginTop: 10, paddingTop: 10,
          fontSize: 11, color: C.muted, lineHeight: 1.6,
        }}>
          <strong style={{ color: C.text }}>Weitere Fristen, dort wo sie hingehören:</strong>
          <div>· <strong>Verfall · Widerruf · Abklingzeit</strong> je Joker-Art → <em>Wo sind die Grenzen?</em>, Grundform</div>
          <div>· <strong>Shop-Takt und -Fenster</strong> → <em>Woher kommen sie?</em>, Narren-Shop</div>
          <div>· <strong>Drehrad-Frequenz und Sperrfrist</strong> → <em>Woher kommen sie?</em>, Drehrad</div>
          <div>· <strong>Saison-Phase der Fremdjoker</strong> → <em>Welche Joker gibt es?</em>, Fremdjoker</div>
        </div>
      </GrosseZeile>

      {/* ══ E · Wo sind die Grenzen? ═══════════════════════ */}
      <GrosseZeile icon="🛡️" titel="Wo sind die Grenzen?" unter="Grundform, Kontingente, Bedingungen"
        wert={standE} offen={karte === "E"} onClick={() => auf("E")}>

        <p style={{ fontSize: 12, color: C.muted, marginTop: 4, marginBottom: 10, lineHeight: 1.45 }}>
          Was ein Joker höchstens darf — und worauf er überhaupt gilt. Diese Karte
          ist der Grund, warum ein Baukasten nicht zum Selbstbedienungsladen wird.
        </p>

        <GrosseZeile icon="📐" titel="Grundform je Joker-Art" unter="wer, Sicht, Verfall, Widerruf, Stapeln, Bedingung"
          offen={unter === "grundform"} onClick={() => aufUnter("grundform")}>
          <JokerGrundform rules={rules} onChange={(jokerBasis) => onChange({ jokerBasis })} />
        </GrosseZeile>

        <GrosseZeile icon="🧮" titel="Limitierungsklassen" unter="Unterkontingente, die sich überlagern"
          wert={klassen > 0 ? String(klassen) : "keine"}
          offen={unter === "limits"} onClick={() => aufUnter("limits")}>
          <LimitKlassen rules={rules} onChange={(limitKlassen) => onChange({ limitKlassen })} />
        </GrosseZeile>

        {duell.enabled && (
          <p style={{ fontSize: 11, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
            Die Schutzregeln der <strong>Fremdjoker</strong> (max. je Ziel, Schonfrist,
            Zielwahl, Punkte-Deckel) stehen bei ihnen selbst — in
            <strong> Welche Joker gibt es?</strong>, Zeile „Fremdjoker".
          </p>
        )}
      </GrosseZeile>
    </div>
  );
}

// Ranking-Pool aus zwei verständlichen Reglern erzeugen: höchstes Gewicht und
// Anzahl der Stufen. Dazwischen gleichmäßig bis 1 herunter — so ist der Pool
// immer gültig (absteigend, ohne Dubletten), ohne dass der Admin einzelne
// Faktoren von Hand pflegen muss.
//
// ⚠️ Zwei Nachkommastellen, nicht eine. Seit die Joker-Faktoren auf dem
// 0,05-Raster stehen, hätte `toFixed(1)` den erzeugten Pool wieder auf
// 0,1er-Stufen gezwungen — ein Höchstgewicht von 1,15 wäre nicht baubar
// gewesen, obwohl der Regler es hergibt.
function buildWeightPool(max, anzahl) {
  const arr = [];
  for (let i = 0; i < anzahl; i++) {
    arr.push(+(max - ((max - 1) * i) / (anzahl - 1)).toFixed(2));
  }
  return [...new Set(arr)].sort((a, b) => b - a);
}
