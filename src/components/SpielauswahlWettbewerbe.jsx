"use client";

import { useEffect, useMemo, useState } from "react";
import { C, MONO, RUND } from "@/lib/theme";
import { getStore } from "@/lib/store";
import { PHASEN, wettbewerbeIn, wettbewerbVon, phaseVon } from "@/lib/wettbewerbe";
import { filterSpiele, engpaesse, zusammenfassung, VERKNUEPFUNG_HINWEIS } from "@/lib/spielauswahl";
import KoRunden from "@/components/KoRunden";

// ── „Nur das Interessanteste" ───────────────────────────────
// Welche Wettbewerbe und welche Phasen gehören zur Runde. Der Reiz daran ist
// nicht das Filtern selbst, sondern was übrig bleibt: „nur Champions League ab
// Achtelfinale" sind 29 Spiele statt 465 — eine ganz andere Runde. Deshalb
// steht unter jeder Auswahl sofort die Zahl.
// `onZahl` meldet die übrig bleibende Spielzahl nach oben. 🔴 Seit die
// Spielauswahl in der Runde WIRKLICH greift (09.08.2026), ist das kein
// Anzeige-Detail mehr: eine Auswahl, die nichts übrig lässt, erzeugt eine
// Runde ohne ein einziges Spiel. Die Zahl steht hier ohnehin — sie nach oben
// zu reichen ist billiger, als sie in der Spielerstellung ein zweites Mal zu
// rechnen (das wäre die zweite Wahrheit).
export default function SpielauswahlWettbewerbe({ spiele, onChange, onZahl }) {
  const [matches, setMatches] = useState(null);

  useEffect(() => {
    let live = true;
    getStore().listMatches(null, { schlank: true })
      .then((ms) => { if (live) setMatches(ms); })
      .catch(() => { if (live) setMatches([]); });
    return () => { live = false; };
  }, []);

  const alle = matches ?? [];
  const wettbewerbe = useMemo(() => wettbewerbeIn(alle), [alle]);
  // Nur Phasen anbieten, die im Spielplan wirklich vorkommen — „Achtelfinale"
  // in einer reinen Bundesliga-Runde wäre eine Auswahl ins Leere.
  const phasen = useMemo(() => {
    const da = new Set(alle.map(phaseVon));
    return PHASEN.filter((p) => da.has(p.key));
  }, [alle]);

  const gewaehltW = spiele?.wettbewerbe ?? [];
  const gewaehltP = spiele?.phasen ?? [];
  const uebrig = useMemo(() => filterSpiele(alle, spiele ?? {}), [alle, spiele]);

  // 🔴 Andis Fund vom 24.08.2026: „+Premier League" ändert die Zahl nicht,
  // „−Bundesliga" macht daraus 0 — und die Oberfläche sagt nicht, warum.
  // Beides beantwortet `engpaesse()` durch WEGLASSEN: welche Einschränkung
  // kostet die meisten Spiele?
  const engpass = useMemo(() => engpaesse(alle, spiele ?? {})[0] ?? null, [alle, spiele]);
  // Die zweite Frage daneben: welcher EINZELNE gewählte Wettbewerb trägt nichts
  // bei? Das ist der „+PL"-Fall — die Dimension ist nicht schuld, dieser eine
  // Haken ist folgenlos.
  const beitrag = useMemo(() => {
    const m = new Map();
    for (const x of uebrig) {
      const w = wettbewerbVon(x);
      m.set(w, (m.get(w) ?? 0) + 1);
    }
    return m;
  }, [uebrig]);
  const folgenlos = gewaehltW.filter((w) => (beitrag.get(w) ?? 0) === 0);
  // ⚠️ Die Spieltags-Zahl ist die zweite Auskunft, nach der Andi gefragt hat
  // („wie viele Spiele über die gesamte Saison bzw. pro Woche"). `zusammenfassung`
  // rechnet sie längst — sie stand hier nur nie.
  const summe = useMemo(() => zusammenfassung(alle, spiele ?? {}), [alle, spiele]);

  // ⚠️ Der Hook steht VOR dem frühen `return` weiter unten (CLAUDE.md: „Hooks
  // stehen VOR jedem frühen return"). Genau so lag `Tippabgabe.jsx` einmal
  // still kaputt.
  useEffect(() => {
    if (matches === null) return;   // noch nicht geladen — keine Aussage
    onZahl?.({ uebrig: uebrig.length, gesamt: alle.length });
  }, [matches, uebrig.length, alle.length, onZahl]);

  const umschalten = (feld, key, liste) => onChange({
    [feld]: liste.includes(key) ? liste.filter((k) => k !== key) : [...liste, key],
  });

  // Anzahl je Option — damit man vor dem Klicken sieht, was es kostet.
  const zaehle = (pruef) => alle.filter(pruef).length;

  if (wettbewerbe.length < 2 && phasen.length < 2) return null;

  return (
    <div style={{ marginTop: 12 }}>
      {/* Keine eigene Überschrift mehr: seit 08.08.2026 steht dieser Block in
          der aufgeklappten Zeile „Wettbewerbe" der Spielerstellung, die
          Überschrift stand dadurch zweimal übereinander. */}
      <p style={{ fontSize: "0.75rem", color: C.muted, margin: "0 0 8px", lineHeight: 1.45 }}>
        Nichts ausgewählt = alles dabei. Eingrenzen für „nur aus dem Besten“ —
        etwa nur die Champions League ab dem Achtelfinale.
      </p>

      {wettbewerbe.length > 1 && (
        <Gruppe titel="Wettbewerbe">
          {wettbewerbe.map((w) => (
            <Chip key={w.key} an={gewaehltW.includes(w.key)}
              label={w.kurz} zusatz={zaehle((m) => wettbewerbVon(m) === w.key)}
              // ⚠️ Ein gewählter Wettbewerb, der nach den ANDEREN Filtern nichts
              // beiträgt, sieht sonst aus wie jeder andere — und der Klick wirkt
              // wirkungslos statt folgenlos.
              folgenlos={gewaehltW.includes(w.key) && (beitrag.get(w.key) ?? 0) === 0}
              onClick={() => umschalten("wettbewerbe", w.key, gewaehltW)} />
          ))}
        </Gruppe>
      )}

      {phasen.length > 1 && (
        <Gruppe titel="Phasen">
          {phasen.map((p) => (
            <Chip key={p.key} an={gewaehltP.includes(p.key)}
              label={p.kurz} zusatz={zaehle((m) => phaseVon(m) === p.key)}
              onClick={() => umschalten("phasen", p.key, gewaehltP)} />
          ))}
        </Gruppe>
      )}

      {/* 🔴 K.-o.-Runden je Wettbewerb (SA1, Andi 24.08.2026). Steht NACH den
          Phasen-Chips, weil es dieselbe Frage feiner stellt: die Chips oben
          gelten für die ganze Runde, hier zählt jeder Pokal für sich. Genau
          das Muster, das Andi für alles will — gängiges oben, Feines darunter. */}
      <KoRunden spiele={spiele ?? {}} alle={alle} onChange={onChange} />

      {/* Die Zahl ist der eigentliche Punkt */}
      <div style={{
        marginTop: 9, background: C.ink2, border: `1px solid ${C.line}`,
        borderRadius: RUND.karte, padding: "9px 11px",
      }}>
        <div style={{ fontSize: "0.9375rem", color: uebrig.length === 0 ? C.coral : C.text }}>
          <strong style={{ fontFamily: MONO }}>{uebrig.length}</strong> von {alle.length} Spielen
          {summe.spieltage > 0 && (
            <span style={{ color: C.muted, fontSize: "0.8125rem" }}>
              {" · rund "}<strong style={{ fontFamily: MONO, color: C.text }}>{summe.proSpieltag}</strong>
              {" je Spieltag"}
            </span>
          )}
        </div>

        {/* 🔴 Die Begründung, nicht nur die Zahl. Ohne sie liest sich eine 0
            wie ein Fehler und ein folgenloser Haken wie ein kaputter Knopf. */}
        {uebrig.length === 0 && engpass && (
          <div style={{ fontSize: "0.8125rem", color: C.coral, marginTop: 6, lineHeight: 1.45 }}>
            Diese Auswahl lässt nichts übrig. Am meisten nimmt {FELD_TEXT[engpass.feld] ?? "eine Einschränkung"} weg
            {engpass.ohne > 0 && <> — ohne sie wären es <strong style={{ fontFamily: MONO }}>{engpass.ohne}</strong> Spiele</>}.
          </div>
        )}

        {uebrig.length > 0 && folgenlos.length > 0 && (
          <div style={{ fontSize: "0.8125rem", color: C.muted, marginTop: 6, lineHeight: 1.45 }}>
            <strong style={{ color: C.text }}>{folgenlos.join(", ").toUpperCase()}</strong>
            {folgenlos.length === 1 ? " bringt " : " bringen "}
            hier nichts: dort spielt keiner deiner gewählten Vereine.
          </div>
        )}

        {uebrig.length > 0 && summe.duenn && (
          <div style={{ fontSize: "0.8125rem", color: C.muted, marginTop: 6, lineHeight: 1.45 }}>
            Das ist dünn — an vielen Spieltagen gibt es nur ein Spiel oder keins.
          </div>
        )}

        {(gewaehltW.length > 0 || gewaehltP.length > 0) && (
          <div style={{ fontSize: "0.6875rem", color: C.muted, marginTop: 6, lineHeight: 1.45 }}>
            {VERKNUEPFUNG_HINWEIS}
          </div>
        )}
      </div>
    </div>
  );
}

// Die Beschriftung der Engpass-Schlüssel. Sie steht HIER und nicht in
// `spielauswahl.js`: die Logik liefert Zahlen und Schlüssel, die Worte gehören
// in die Oberfläche (Architektur-Regel 1).
const FELD_TEXT = {
  teams: "deine Vereinsliste",
  wettbewerbe: "die Wettbewerbs-Auswahl",
  phasen: "die Phasen-Auswahl",
  spieltage: "der gewählte Spieltag-Bereich",
  zonen: "die Tabellenzone",
  liste: "die feste Begegnungs-Liste",
};

function Gruppe({ titel, children }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{
        fontFamily: MONO, fontSize: "0.6875rem", letterSpacing: 1.2, color: C.muted,
        textTransform: "uppercase", marginBottom: 5,
      }}>{titel}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{children}</div>
    </div>
  );
}

// ⚠️ `minHeight: 44` ist eine Vorgabe, kein Geschmack: Apple verlangt 44 pt,
// Google 48 dp. Diese Chips waren 29 px hoch und stellten allein dreizehn der
// 18 zu kleinen Tippziele auf dem Erstellungs-Screen (gemessen 07.08.2026 bei
// 390 px Breite).
function Chip({ an, label, zusatz, folgenlos, onClick }) {
  return (
    <button onClick={onClick}
      title={folgenlos ? "Gewählt, trägt aber nichts bei" : undefined}
      style={{
      cursor: "pointer", fontFamily: "inherit", fontSize: "0.8125rem", padding: "6px 13px",
      minHeight: 44, boxSizing: "border-box",
      borderRadius: RUND.pille, display: "flex", alignItems: "center", gap: 5,
      background: an ? (folgenlos ? C.surface : `${C.mint}22`) : C.surface,
      color: an ? (folgenlos ? C.muted : C.mint) : C.muted,
      // Gewählt UND folgenlos: gestrichelt statt durchgezogen — der Haken ist
      // gesetzt, wirkt aber nicht.
      border: `1px ${an && folgenlos ? "dashed" : "solid"} ${an ? (folgenlos ? C.line : C.mint + "66") : C.line}`,
    }}>
      <span style={{ fontWeight: 700 }}>{label}</span>
      <span style={{ fontFamily: MONO, fontSize: "0.6875rem", opacity: 0.75 }}>{zusatz}</span>
    </button>
  );
}
