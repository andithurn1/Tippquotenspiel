"use client";

import { useState } from "react";
import { DEFAULT_RULES, RULE_LIMITS, REGLER_FEINHEITEN, reglerSchritt } from "@/lib/engine";
import { TIPPEINFLUSS_LIMITS, beschreibeTippEinfluss } from "@/lib/tippEinfluss";
import { KOMBI_STUFEN, KOMBI_LIMITS, DEFAULT_KOMBI, beschreibeKombi } from "@/lib/kombiBonus";
import { C, RUND } from "@/lib/theme";
import { fmtFaktor } from "@/lib/format";
import { TAPZIEL } from "@/lib/tapziel";
import { Slider, Toggle, Field, Stepper, GrosseZeile } from "@/components/Eingaben";

// ============================================================
//  WERTUNGS-SONDERMENÜ — wie aus Quote und Tipp Punkte werden
//  (drittes Sondermenü nach Joker und Modifikatoren · Andi EB2/EB4)
//
//  🔴 Der Unterschied zu den ersten beiden: hier steht die WERTUNG selbst
//  (Ebene 1), nicht was sie hinterher skaliert. Deshalb ist die Reihenfolge
//  der Karten die Reihenfolge der Rechnung — erst wie streng gemessen wird,
//  dann wer zusätzlich belohnt wird, dann was aus Toren dazukommt, und erst
//  ganz zuletzt, welche Zahl der Spieler zu sehen bekommt.
//
//  ⚠️ Die letzte Karte ist die gefährlichste, weil sie harmlos aussieht:
//  `displayScale` ist **reine Optik** und darf nie die Reihenfolge ändern
//  (`vokabular.md`, Ebene 7). `minPayout` und `perGameCap` dagegen sind
//  Fairness — sie stehen in derselben Karte, weil ein Admin sie zusammen
//  sucht, aber ihre Wirkung ist eine völlig andere. Der Text sagt es dazu.
//
//  ⚠️ Was hier NICHT hingehört: alles, was die fertige Wertung nur noch
//  SKALIERT (Joker, Derby, Big Game). Das ist Ebene 2 und hat seine eigenen
//  Zeilen — sonst stünde der gemeinsame Deckel an zwei Orten.
// ============================================================

export function wertungStand(rules) {
  const teile = [];
  if (rules?.underdogBoost > 1) teile.push(`Underdog ${fmtFaktor(rules.underdogBoost)}`);
  if (rules?.favFlopPenalty > 0) teile.push(`Malus −${rules.favFlopPenalty}`);
  if (rules?.markets?.goals?.enabled) teile.push("Torschützen");
  teile.push(`×${rules?.displayScale ?? 1}`);
  return teile.join(" · ");
}

export default function WertungSondermenue({ rules, empfohleneSkala, onChange }) {
  const [karte, setKarte] = useState(null);
  const auf = (k) => setKarte((o) => (o === k ? null : k));

  const L = RULE_LIMITS;
  const g = rules.markets.goals;
  const te = rules.tippEinfluss || DEFAULT_RULES.tippEinfluss;
  const kombi = rules.kombi || DEFAULT_KOMBI;

  const setze = (p) => onChange(p);
  const setzeCombo = (p) => onChange({ combo: { ...rules.combo, ...p } });
  const setzeMarkets = (p) => onChange({ markets: { ...rules.markets, ...p } });
  const setzeGoals = (p) => onChange({ markets: { ...rules.markets, goals: { ...g, ...p } } });
  const setzeTippEinfluss = (p) => onChange({ tippEinfluss: { ...te, ...p } });
  const setzeKombi = (p) => onChange({ kombi: { ...kombi, ...p } });

  return (
    <div>
      {/* ══ Wie streng wird gemessen? ══════════════════════ */}
      <GrosseZeile icon="🎯" titel="Wie streng wird gemessen?" unter="Nähe, Sieger-Boden, Strafe"
        wert={`k ${rules.k}`} offen={karte === "naehe"} onClick={() => auf("naehe")}>
        <Slider label="Ergebnis-Nähe (k)" value={rules.k} {...L.k} step={reglerSchritt(rules, L.k)} pfad="k" rules={rules}
          onChange={(v) => setze({ k: v })}
          hint="Höher = die Belohnung fällt mit jedem Tor Abstand steiler ab (Underdog-Regler)." />
        <Slider label="Team-Tore-Nähe (m)" value={rules.m} {...L.m} step={reglerSchritt(rules, L.m)} pfad="m" rules={rules}
          onChange={(v) => setze({ m: v })}
          hint="Steilheit der siegerunabhängigen Team-Tore-Nähe." />

        <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 10, paddingTop: 10 }}>
          <Toggle label="Sieger-Boden (richtiger Sieger zahlt mind. Quote−1)"
            on={rules.winnerFloor} onChange={(on) => setze({ winnerFloor: on })} />
          <Slider label="Strafe bei komplett falsch" value={rules.wrongPenalty} {...L.wrongPenalty} pfad="wrongPenalty" rules={rules}
            onChange={(v) => setze({ wrongPenalty: v })} fmt={(x) => x === 0 ? "aus" : x.toFixed(1)}
            hint="0 = keine Strafe. Negativ = Minuspunkte, wenn weder Sieger noch Nähe stimmen." />
        </div>
      </GrosseZeile>

      {/* ══ Wer wird zusätzlich belohnt? ═══════════════════ */}
      <GrosseZeile icon="🐴" titel="Wer wird zusätzlich belohnt?" unter="Underdog-Boost &amp; Favoriten-Malus"
        wert={rules.underdogBoost > 1 || rules.favFlopPenalty > 0 ? "an" : "aus"}
        offen={karte === "underdog"} onClick={() => auf("underdog")}>
        <p style={{ fontSize: "0.75rem", color: C.muted, marginTop: 4, marginBottom: 10, lineHeight: 1.4 }}>
          Belohne das Vorhersagen von Überraschungen — und/oder bestrafe, wer stur auf den
          Favoriten setzt, wenn der patzt. Beide wirken nur bei echten Außenseiter-Siegen
          und werden über dieselbe Sieger-Quote skaliert.
        </p>
        <Slider label="Underdog-Boost (×)" value={rules.underdogBoost} {...L.underdogBoost} pfad="underdogBoost" rules={rules}
          onChange={(v) => setze({ underdogBoost: v })} fmt={fmtFaktor}
          hint="1,0 = aus. Höher = korrekt getippte Außenseiter-Siege zahlen zusätzlich mehr." />
        <Slider label="Favoriten-Reinfall-Malus" value={rules.favFlopPenalty} {...L.favFlopPenalty} pfad="favFlopPenalty" rules={rules}
          onChange={(v) => setze({ favFlopPenalty: v })} fmt={(x) => x === 0 ? "aus" : "−" + x}
          hint="Abzug, wenn du den Favoriten getippt hast und der real verliert. Gedeckelt bei 0 (kein tiefes Minus)." />
        {/* Die beiden Rampen-Regler erscheinen erst, wenn eine der beiden
            Wirkungen überhaupt an ist — sonst stellte man die Steilheit von
            nichts ein. */}
        {(rules.underdogBoost > 1 || rules.favFlopPenalty > 0) && (
          <>
            <Slider label="Wirkt ab Sieger-Quote" value={rules.underdogRampStart} {...L.underdogRampStart}
              onChange={(v) => setze({ underdogRampStart: v })} fmt={(x) => x.toFixed(1)}
              hint="Unterhalb dieser Quote gilt der Sieger nicht als Außenseiter — kein Boost, kein Malus." />
            <Slider label="Volle Wirkung ab Sieger-Quote" value={rules.underdogRampEnd} {...L.underdogRampEnd}
              onChange={(v) => setze({ underdogRampEnd: v })} fmt={(x) => x.toFixed(1)}
              hint="Dazwischen fließender Übergang statt hartem Cutoff." />
          </>
        )}
      </GrosseZeile>

      {/* ══ Tore & Kombi ══════════════════════════════════ */}
      <GrosseZeile icon="⚽" titel="Tore &amp; Kombi" unter="Märkte und was zusammen aufgeht"
        wert={g.enabled ? "Ergebnis + Tore" : "nur Ergebnis"}
        offen={karte === "tore"} onClick={() => auf("tore")}>
        <Toggle label="Ergebnis-Tipp" on={rules.markets.result}
          onChange={(on) => setzeMarkets({ result: on })} />
        <Toggle label="Torschützen-Tipp" on={g.enabled}
          onChange={(on) => setzeGoals({ enabled: on })} />
        {g.enabled && (
          <div style={{ paddingLeft: 12, borderLeft: `1px solid ${C.line}`, marginBottom: 8 }}>
            {/* Wie die Namen gewählt werden. Mehr als Geschmack: bei echten
                Marktquoten kommen die Torschützen OHNE Vereinszuordnung
                herein — im Spiel-Modus lässt sich trotzdem tippen. */}
            <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 6, marginBottom: 5 }}>
              Wie viele Schützen?
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              {[
                { key: "proTeam", label: "Je Mannschaft", hint: "Getrennte Wahl für Heim und Auswärts." },
                { key: "proSpiel", label: "Je Spiel", hint: "Ein Topf für beide Mannschaften — freier, und unabhängig von der Vereinszuordnung." },
              ].map((m) => {
                const an = (g.modus ?? "proTeam") === m.key;
                return (
                  <button key={m.key} title={m.hint} onClick={() => setzeGoals({ modus: m.key })} style={{
                    ...TAPZIEL, flex: 1, cursor: "pointer", fontFamily: "inherit", padding: "8px 6px",
                    borderRadius: RUND.karte, fontSize: "0.75rem", fontWeight: 700,
                    background: an ? `${C.sky}22` : C.surface, color: an ? C.sky : C.muted,
                    border: `1px solid ${an ? C.sky + "66" : C.line}`,
                  }}>{m.label}</button>
                );
              })}
            </div>
            {(g.modus ?? "proTeam") === "proSpiel" ? (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
                <span style={{ fontSize: "0.8125rem", color: C.muted }}>Schützen pro Spiel</span>
                <Stepper value={g.picksProSpiel} min={L.picksProSpiel.min} max={L.picksProSpiel.max}
                  onStep={(d) => setzeGoals({ picksProSpiel: Math.min(L.picksProSpiel.max, Math.max(L.picksProSpiel.min, g.picksProSpiel + d)) })} />
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
                <span style={{ fontSize: "0.8125rem", color: C.muted }}>Picks pro Team</span>
                <Stepper value={g.picksPerTeam} min={L.picksPerTeam.min} max={L.picksPerTeam.max}
                  onStep={(d) => setzeGoals({ picksPerTeam: Math.min(L.picksPerTeam.max, Math.max(L.picksPerTeam.min, g.picksPerTeam + d)) })} />
              </div>
            )}
            <div style={{ fontSize: "0.6875rem", color: C.muted, marginBottom: 6, lineHeight: 1.45 }}>
              {(g.modus ?? "proTeam") === "proSpiel"
                ? `${g.picksProSpiel} Namen aus beiden Mannschaften zusammen — wer sie verteilt, ist euch überlassen.`
                : `${g.picksPerTeam} Namen je Mannschaft, also ${g.picksPerTeam * 2} im Spiel.`}
            </div>
            <Toggle label="Doppelpack erlaubt" on={g.allowDouble}
              onChange={(on) => setzeGoals({ allowDouble: on })} />
            <Toggle label="Backup-Schützen erlaubt" on={g.allowBackups}
              onChange={(on) => setzeGoals({ allowBackups: on })} />
          </div>
        )}

        {/* Kombi: was der Tor-Gewinn wert ist, hängt davon ab, wie gut das
            ERGEBNIS getroffen wurde. Steht deshalb in derselben Karte wie
            die Märkte und nicht in einem eigenen Abschnitt. */}
        <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 10, paddingTop: 10 }}>
          <div style={{ fontSize: "0.8125rem", fontWeight: 700, marginBottom: 8 }}>Kombi-Multiplikatoren (Tore × Ebene)</div>
          <Slider label="bei richtiger Tendenz" value={rules.combo.tendenz} {...L.combo.tendenz} step={reglerSchritt(rules, L.combo.tendenz)}
            onChange={(v) => setzeCombo({ tendenz: v })} fmt={(x) => "×" + x.toFixed(2)} />
          <Slider label="bei richtigem Abstand" value={rules.combo.abstand} {...L.combo.abstand} step={reglerSchritt(rules, L.combo.abstand)} pfad="combo.abstand" rules={rules}
            onChange={(v) => setzeCombo({ abstand: v })} fmt={(x) => "×" + x.toFixed(2)} />
          <Slider label="bei exaktem Ergebnis" value={rules.combo.exakt} {...L.combo.exakt} step={reglerSchritt(rules, L.combo.exakt)} pfad="combo.exakt" rules={rules}
            onChange={(v) => setzeCombo({ exakt: v })} fmt={fmtFaktor} />

          {/* 🔴 Kombi-BONUS (B16) — der Aufschlag, der aus der Quote des
              Schützen kommt statt aus einem Regler. Andis Begründung steht in
              einem Satz darüber, weil sie den ganzen Block trägt: bei einem
              5:1 ist klar, dass der Stürmer trifft. */}
          <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 12, paddingTop: 12 }}>
            <Toggle label="Seltener Schütze zählt extra" on={kombi.enabled}
              onChange={(on) => setzeKombi({ enabled: on })} />
            <p style={{ fontSize: "0.6875rem", color: C.muted, marginTop: 2, marginBottom: 8, lineHeight: 1.45 }}>
              Bei einem 5:1 ist klar, dass der Stürmer trifft — ein pauschaler Aufschlag
              belohnt genau das. Mit dieser Regel wächst der Kombi-Faktor mit der
              <strong> Quote des Schützen</strong>: der Innenverteidiger bringt mehr als
              der Torjäger, ohne dass jemand Spieler einteilen müsste.
            </p>

            {kombi.enabled && (
              <div style={{ paddingLeft: 12, borderLeft: `1px solid ${C.line}` }}>
                <Field label="Ab welcher Ergebnis-Ebene zählt die Kombination?">
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {KOMBI_STUFEN.map((s) => {
                      const an = kombi.stufe === s.key;
                      return (
                        <button key={s.key} title={s.desc} onClick={() => setzeKombi({ stufe: s.key })} style={{
                          ...TAPZIEL, flex: "1 1 110px", cursor: "pointer", fontFamily: "inherit",
                          padding: "8px 10px", borderRadius: RUND.karte, fontSize: "0.75rem", fontWeight: 700,
                          background: an ? `${C.akzent}22` : C.surface,
                          color: an ? C.akzent : C.muted,
                          border: `1px solid ${an ? C.akzent + "66" : C.line}`,
                        }}>{s.label}</button>
                      );
                    })}
                  </div>
                </Field>

                <Slider label="Wie stark schlägt die Quote durch?" value={kombi.staerke}
                  {...KOMBI_LIMITS.staerke}
                  onChange={(v) => setzeKombi({ staerke: v })} fmt={(x) => x.toFixed(2)}
                  hint="0 = der Bonus ist aus. Höher = die Seltenheit des Schützen wiegt mehr." />
                <Slider label="Deckel für den Aufschlag" value={kombi.maxAufschlag}
                  {...KOMBI_LIMITS.maxAufschlag}
                  onChange={(v) => setzeKombi({ maxAufschlag: v })} fmt={(x) => `+${x.toFixed(2)}`}
                  hint="Ohne ihn zahlt ein 6:0 mit Torwart-Treffer unbegrenzt." />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0" }}>
                  <span style={{ fontSize: "0.8125rem", color: C.muted }}>Wie viele Schützen müssen treffen?</span>
                  <Stepper value={kombi.mindestSchuetzen}
                    min={KOMBI_LIMITS.mindestSchuetzen.min} max={KOMBI_LIMITS.mindestSchuetzen.max}
                    onStep={(d) => setzeKombi({ mindestSchuetzen: kombi.mindestSchuetzen + d })} />
                </div>

                {/* Live-Rechnung statt einer Zahl ohne Bedeutung — dieselbe
                    Rolle wie `anteilHinweis()` bei den Wettbewerben. */}
                <p style={{
                  fontSize: "0.75rem", color: C.text, lineHeight: 1.45, marginTop: 8,
                  padding: "8px 10px", borderRadius: RUND.karte, background: C.surface, border: `1px solid ${C.line}`,
                }}>
                  {beschreibeKombi(rules)}
                </p>
                <p style={{ fontSize: "0.6875rem", color: C.muted, marginTop: 6, lineHeight: 1.45 }}>
                  ⏳ Welche Werte hier gut sind, wird am Ende zusammen mit dem übrigen
                  Balancing entschieden. Die Mechanik steht unabhängig davon.
                </p>
              </div>
            )}
          </div>
        </div>
      </GrosseZeile>

      {/* ══ Anzeige & Deckel ══════════════════════════════ */}
      <GrosseZeile icon="🔢" titel="Anzeige &amp; Deckel" unter="Skalierung, Mindest-Auszahlung, Obergrenze"
        wert={`×${rules.displayScale}`} offen={karte === "anzeige"} onClick={() => auf("anzeige")}>
        <Slider label="Punkte-Skalierung" value={rules.displayScale} {...L.displayScale}
          onChange={(v) => setze({ displayScale: v })} fmt={(x) => "×" + x}
          hint="Nur Optik: macht schöne hohe Zahlen. Fairness & Ranking bleiben unberührt." />
        {rules.displayScale !== empfohleneSkala && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
            background: `${C.akzent}12`, border: `1px solid ${C.akzent}33`, borderRadius: RUND.karte,
            padding: "9px 12px", marginBottom: 10,
          }}>
            <span style={{ fontSize: "0.75rem", color: C.muted, lineHeight: 1.4 }}>
              Empfohlen: <strong style={{ color: C.akzent }}>×{empfohleneSkala}</strong> — hält
              exakte Tipps bei angenehmen Werten{rules.joker?.enabled ? " (Gewichtung eingerechnet)" : ""}.
            </span>
            <button onClick={() => setze({ displayScale: empfohleneSkala })} style={{
              cursor: "pointer", fontSize: "0.75rem", fontFamily: "inherit", fontWeight: 700,
              background: C.surface2, color: C.akzent, border: `1px solid ${C.akzent}44`,
              ...TAPZIEL, borderRadius: RUND.karte, padding: "7px 12px", whiteSpace: "nowrap",
            }}>übernehmen</button>
          </div>
        )}

        {/* ⚠️ Ab hier ist es KEINE Optik mehr. Die Skalierung oben verändert
            nur die angezeigte Zahl; die beiden hier verändern, wer gewinnt. */}
        <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 10, paddingTop: 10 }}>
          <p style={{ fontSize: "0.6875rem", color: C.muted, marginTop: 0, marginBottom: 10, lineHeight: 1.45 }}>
            Die Skalierung oben ist reine Optik. Die beiden folgenden greifen in die
            <strong> Wertung</strong> ein — sie verändern die Reihenfolge.
          </p>
          <Slider label="Mindest-Auszahlung (Cutoff)" value={rules.minPayout} {...L.minPayout} pfad="minPayout" rules={rules}
            onChange={(v) => setze({ minPayout: v })} fmt={(x) => x.toFixed(1)}
            hint="Nähe-Boni unter diesem Wert zählen nicht." />
          <Toggle label="Harter Punkte-Deckel pro Spiel"
            on={rules.perGameCap != null}
            onChange={(on) => setze({ perGameCap: on ? 1000 : null })} />
          {rules.perGameCap != null && (
            <Slider label="Deckel" value={rules.perGameCap} {...L.perGameCap}
              onChange={(v) => setze({ perGameCap: v })} fmt={(x) => String(x)} />
          )}
        </div>
      </GrosseZeile>

      {/* ══ Feinheiten ════════════════════════════════════ */}
      <GrosseZeile icon="🔬" titel="Feinheiten" unter="Regler-Raster und der Einfluss eurer Tipps"
        wert={te.staerke > 0 ? "Totalisator" : "Markt"}
        offen={karte === "fein"} onClick={() => auf("fein")}>
        <div style={{ fontSize: "0.8125rem", fontWeight: 700, marginTop: 4, marginBottom: 4 }}>Regler-Feinheit</div>
        <p style={{ fontSize: "0.75rem", color: C.muted, marginTop: 0, marginBottom: 10, lineHeight: 1.4 }}>
          Wie fein sich die Multiplikator-Regler stellen lassen — eine Feineinstellung,
          keine Einstiegsfrage.
        </p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {REGLER_FEINHEITEN.map((f) => {
            const an = (rules.reglerFeinheit ?? DEFAULT_RULES.reglerFeinheit) === f.wert;
            return (
              <button key={f.key} onClick={() => setze({ reglerFeinheit: f.wert })} style={{
                cursor: "pointer", fontSize: "0.75rem", fontFamily: "inherit", padding: "8px 12px",
                borderRadius: RUND.karte, flex: "1 1 120px", textAlign: "left",
                background: an ? `${C.akzent}22` : C.surface, color: an ? C.akzent : C.muted,
                border: `1px solid ${an ? C.akzent + "66" : C.line}`,
              }}>
                <div style={{ fontWeight: 700 }}>{f.label}</div>
                <div style={{ fontSize: "0.6875rem", opacity: 0.8, marginTop: 2 }}>{f.desc}</div>
              </button>
            );
          })}
        </div>

        {/* Tipp-Einfluss auf die Quote (Totalisator-Anteil) */}
        <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 10, paddingTop: 10 }}>
          <div style={{ fontSize: "0.8125rem", fontWeight: 700, marginBottom: 4 }}>Bewegt eure Runde die Quoten?</div>
          <p style={{ fontSize: "0.75rem", color: C.muted, marginTop: 0, marginBottom: 10, lineHeight: 1.4 }}>
            Normalerweise gelten allein die Marktquoten. Ihr könnt aber einstellen, dass
            eure eigenen Tipps mitzählen — wie bei einem Totalisator. <strong>Wer tippt,
            was alle tippen, bekommt dann weniger</strong>; wer sich traut, mehr.
          </p>

          <Field label="Wie stark zählt die Runde mit?">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {[
                { v: 0, label: "aus" },
                { v: 0.25, label: "Hauch" },
                { v: 0.5, label: "spürbar" },
                { v: 1, label: "voll" },
              ].map((s) => {
                const on = te.staerke === s.v;
                return (
                  <button key={s.v} onClick={() => setzeTippEinfluss({ staerke: s.v })} style={{
                    ...TAPZIEL, cursor: "pointer", fontSize: "0.75rem", fontFamily: "inherit", padding: "7px 11px", borderRadius: RUND.pille,
                    background: on ? `${C.akzent}22` : C.surface, color: on ? C.akzent : C.muted,
                    border: `1px solid ${on ? C.akzent + "66" : C.line}`,
                  }}>{s.label}</button>
                );
              })}
            </div>
          </Field>

          {te.staerke > 0 && (
            <div style={{ paddingLeft: 12, borderLeft: `1px solid ${C.line}`, marginBottom: 8 }}>
              {/* Der eigentliche Regler. „Gegen wie viele virtuelle Mitspieler
                  tretet ihr an" ist die Frage, die ein Admin beantworten kann —
                  ein abstrakter Mischungsfaktor wäre es nicht. */}
              <Slider label="Gegen wie großen Markt?" value={te.marktTiefe}
                min={TIPPEINFLUSS_LIMITS.marktTiefe.min} max={TIPPEINFLUSS_LIMITS.marktTiefe.max}
                step={TIPPEINFLUSS_LIMITS.marktTiefe.step}
                fmt={(v) => `${v} Mitspieler`}
                onChange={(v) => setzeTippEinfluss({ marktTiefe: v })} />
              <p style={{ fontSize: "0.6875rem", color: C.muted, marginTop: -8, marginBottom: 12, lineHeight: 1.4 }}>
                Kleiner Markt = eure Tipps schlagen stärker durch. Großer Markt = ihr seid
                ein Tropfen darin, so wie ein einzelner Wetter bei einem Buchmacher.
              </p>

              <Slider label="Erst ab wie vielen Tippern?" value={te.minTipper}
                min={TIPPEINFLUSS_LIMITS.minTipper.min} max={TIPPEINFLUSS_LIMITS.minTipper.max}
                step={TIPPEINFLUSS_LIMITS.minTipper.step}
                fmt={(v) => `${v} Tipper`}
                onChange={(v) => setzeTippEinfluss({ minTipper: v })} />
              <p style={{ fontSize: "0.6875rem", color: C.muted, marginTop: -8, marginBottom: 10, lineHeight: 1.4 }}>
                Darunter bleibt alles beim Markt — zu wenige Tipps wären Zufall, keine
                Meinung.
              </p>

              {/* Die Live-Vorschau ist hier die eigentliche Betreuung: „50 %
                  Mischung" sagt niemandem etwas, „ein Tipp verschiebt 0,45 %"
                  schon. Dieselbe Rolle wie anteile() bei den Wettbewerben. */}
              <p style={{
                fontSize: "0.75rem", color: C.text, lineHeight: 1.45,
                padding: "8px 10px", borderRadius: RUND.karte, background: C.surface, border: `1px solid ${C.line}`,
              }}>
                {beschreibeTippEinfluss(te, Math.max(te.minTipper, 12))}
              </p>

              <p style={{ fontSize: "0.6875rem", color: C.muted, marginTop: 8, lineHeight: 1.45 }}>
                Fair bleibt es durch zwei Regeln: <strong>dein eigener Tipp drückt deine
                eigene Quote nicht</strong>, und gerechnet wird erst nach Anpfiff, wenn
                alle Tipps da sind — früh oder spät tippen ändert also nichts. Die
                Sieger-Quoten (1X2) bleiben unangetastet, verschoben werden nur die
                Ergebnis-Quoten.
              </p>
            </div>
          )}
        </div>
      </GrosseZeile>
    </div>
  );
}
