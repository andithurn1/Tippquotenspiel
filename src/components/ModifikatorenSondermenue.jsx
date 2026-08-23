"use client";

import { useState } from "react";
import { RULE_LIMITS, DEFAULT_RULES, reglerSchritt } from "@/lib/engine";
import { BIGGAME_LIMITS } from "@/lib/bigGame";
import { alleVereine } from "@/lib/ligen";
import { C, MONO, RUND } from "@/lib/theme";
import { zahl, fmtFaktor, fmtFaktorOderAus } from "@/lib/format";
import { Slider, Toggle, GrosseZeile } from "@/components/Eingaben";
import TabellenBonus from "@/components/TabellenBonus";

// ============================================================
//  MODIFIKATOREN-SONDERMENÜ — was für ALLE gilt, hinter EINER Zeile
//  (zweites Sondermenü nach dem Joker · Andi EB2/EB4, 22.08.2026)
//
//  🔴 Was diese Zeile zusammenfasst, ist keine Sammlung ähnlicher Regler,
//  sondern EIN Rechenweg: Derby, einzelne Vereine, Big Game und der
//  Tabellen-Bonus zahlen alle in DENSELBEN additiven Topf (`totalModifier`)
//  und werden von DEMSELBEN Deckel (`modCap`) begrenzt. Wer einen davon
//  verstellt, verschiebt die anderen mit — und genau das sah man vorher
//  nicht, weil sie an drei Stellen des Screens standen.
//
//  ⚠️ Ebene 2, nicht Ebene 3. Der **Alleingang-Bonus** gehört bewusst NICHT
//  hierher: er ist ein Punkte-KANAL mit eigenem Deckel (`vokabular.md`, „die
//  Grenze zwischen 2 und 3 ist die wichtigste im ganzen Spiel"). Ihn hier
//  einzusortieren würde genau die Grenze verwischen, die das Vokabular
//  schützt — er behält seinen eigenen Abschnitt.
//
//  ⚠️ Die **Wettbewerbs-Gewichte** zahlen zwar in denselben Topf, stehen aber
//  weiter bei der Betippungsauswahl: MOD5 (Andi, 21.08.2026) will Ligen und
//  Mannschaften ausdrücklich DORT gewichten, wo man sie auswählt. Statt einer
//  zweiten Wahrheit steht hier ein Verweis.
// ============================================================

const ALL_TEAMS = alleVereine();

// Antippen wandert durch feste Stufen. Feste Stufen statt +0,1: mit Dämpfern
// wären es sonst 17 Antipper für einen vollen Durchlauf. Sechs benannte Stufen
// sind bedienbar, liegen alle auf dem 0,05-Raster, und wer es genauer will,
// hat den Regler.
//
// ⚠️ Der Zyklus führt bewusst auch DURCH die Werte unter 1. Vorher lief er nur
// aufwärts — damit war ein Dämpfer über die Oberfläche gar nicht einstellbar,
// obwohl die Logik ihn kann. Genau die tote Kontaktstelle, die dieser Baukasten
// nicht haben darf.
const TEAM_STUFEN = [1.25, 1.5, 2, 0.75, 0.5, 1];

export function modifikatorenStand(rules) {
  const tm = rules?.teamMods || { derbyFaktor: 1, teams: {} };
  const teams = Object.keys(tm.teams || {}).length;
  const bg = rules?.bigGame || DEFAULT_RULES.bigGame;
  const tabelle = rules?.tabellenBonus?.enabled === true;
  const teile = [
    tm.derbyFaktor > 1 ? `Derby ${fmtFaktor(tm.derbyFaktor)}` : null,
    teams > 0 ? `${teams} Verein${teams === 1 ? "" : "e"}` : null,
    bg.enabled ? "Big Game" : null,
    tabelle ? "Außenseiter" : null,
  ].filter(Boolean);
  return teile.length ? teile.join(" · ") : "aus";
}

export default function ModifikatorenSondermenue({ rules, premium, onChange }) {
  const [zeile, setZeile] = useState(null);
  const [eigeneVereine, setEigeneVereine] = useState(
    () => Object.keys(rules?.teamMods?.teams || {}).length > 0,
  );
  const auf = (k) => setZeile((o) => (o === k ? null : k));

  const L = RULE_LIMITS;
  const tm = rules.teamMods || { derbyFaktor: 1, teams: {} };
  const tmTeams = tm.teams || {};
  const tmAktiv = tm.derbyFaktor > 1 || Object.keys(tmTeams).length > 0;
  const bg = rules.bigGame || DEFAULT_RULES.bigGame;

  const setzeTeamMods = (p) => onChange({ teamMods: { ...tm, ...p } });
  const setzeBigGame = (p) => onChange({ bigGame: { ...bg, ...p } });

  // Der nächste Wert wird IM Updater aus dem vorherigen Stand berechnet —
  // sonst lesen mehrere schnelle Klicks denselben alten Wert.
  const cycleTeamFaktor = (team) => {
    const teams = { ...tmTeams };
    const jetzt = teams[team] ?? 1;
    const i = TEAM_STUFEN.indexOf(jetzt);
    const naechster = TEAM_STUFEN[(i + 1) % TEAM_STUFEN.length];
    if (naechster !== 1) teams[team] = naechster; else delete teams[team];
    onChange({ teamMods: { ...tm, teams } });
  };

  if (!premium) {
    return (
      <div style={{
        background: `${C.akzent}12`, border: `1px solid ${C.akzent}44`,
        borderRadius: RUND.karte, padding: "13px 15px",
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.akzent }}>🔒 Premium-Funktion</div>
        <p style={{ fontSize: 12, color: C.muted, margin: "7px 0 0", lineHeight: 1.5 }}>
          Es genügt, wenn <strong>du als Admin</strong> Premium hast.
        </p>
      </div>
    );
  }

  const teamStand = tm.derbyFaktor > 1 || Object.keys(tmTeams).length > 0
    ? [tm.derbyFaktor > 1 ? fmtFaktor(tm.derbyFaktor) : null,
       Object.keys(tmTeams).length ? `${Object.keys(tmTeams).length} Vereine` : null]
      .filter(Boolean).join(" · ")
    : "aus";

  return (
    <div>
      <p style={{ fontSize: 12, color: C.muted, marginTop: 0, marginBottom: 10, lineHeight: 1.45 }}>
        Gilt für <strong>alle</strong> in der Runde — anders als der Joker, den jeder
        selbst setzt. Alle vier zahlen in denselben Topf und teilen sich einen Deckel.
      </p>

      {/* ── Derby & einzelne Vereine ── */}
      <GrosseZeile icon="🔥" titel="Derby &amp; einzelne Vereine" unter="Traditionsduelle, Lieblingsklubs"
        wert={teamStand} offen={zeile === "teams"} onClick={() => auf("teams")}>
        <Slider label="Derby zählt" value={tm.derbyFaktor} {...L.teamMods.derbyFaktor}
          step={reglerSchritt(rules, L.teamMods.derbyFaktor)} pfad="teamMods.derbyFaktor"
          onChange={(v) => setzeTeamMods({ derbyFaktor: v })}
          fmt={fmtFaktorOderAus}
          hint="Traditionsduelle (Revierderby, Klassiker, Nordderby …) zählen mehr. 1,0 = aus." />

        <Toggle label="Einzelne Vereine hervorheben" on={eigeneVereine}
          onChange={(on) => { setEigeneVereine(on); if (!on) setzeTeamMods({ teams: {} }); }} />
        {eigeneVereine && (
          <div style={{ paddingLeft: 12, borderLeft: `1px solid ${C.line}`, marginBottom: 8 }}>
            <p style={{ fontSize: 11, color: C.muted, margin: "2px 0 8px", lineHeight: 1.4 }}>
              Antippen wandert durch ×1,25, ×1,5, ×2, ×0,75, ×0,5 und zurück auf „aus".
              Werte unter ×1 dämpfen den Verein: er zählt dann weniger, nicht mehr.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {ALL_TEAMS.map((team) => {
                const f = tmTeams[team] ?? 1;
                // Ein DÄMPFER (unter 1) ist genauso „an" wie ein Aufschlag —
                // vorher galt nur `f > 1`, wodurch ein gedämpfter Verein
                // aussah wie ein unberührter.
                const an = f !== 1;
                const ton = f > 1 ? C.akzent : C.indigo;
                return (
                  <button key={team} onClick={() => cycleTeamFaktor(team)}
                    title={f > 1 ? "zählt mehr" : f < 1 ? "zählt weniger" : "kein Modifikator"}
                    style={{
                      cursor: "pointer", fontSize: 12, fontFamily: "inherit", padding: "6px 10px",
                      borderRadius: RUND.pille, minHeight: 44, boxSizing: "border-box",
                      background: an ? `${ton}22` : C.surface, color: an ? ton : C.muted,
                      border: `1px solid ${an ? ton + "66" : C.line}`,
                    }}>
                    {team}{an && (
                      // ⚠️ Zwei Nachkommastellen: mit `toFixed(1)` würde aus
                      // einem Dämpfer von 0,75 die Anzeige „×0.8".
                      <strong style={{ marginLeft: 5, fontFamily: MONO }}>{fmtFaktor(f)}</strong>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </GrosseZeile>

      {/* ── Big Game ── */}
      <GrosseZeile icon="⭐" titel="Big Game" unter="das Topspiel des Spieltags"
        wert={bg.enabled ? `+${zahl(bg.aufschlag)}` : "aus"}
        offen={zeile === "biggame"} onClick={() => auf("biggame")}>
        <Toggle label="Big Game — das Topspiel des Spieltags" on={bg.enabled}
          onChange={(on) => setzeBigGame({ enabled: on })} />
        <p style={{ fontSize: 11, color: C.muted, margin: "2px 0 0", lineHeight: 1.45 }}>
          Ein Derby steht vorher fest, „Erster gegen Zweiter am 31. Spieltag" nicht.
          Beim Öffnen jedes Spieltags sucht die App das brisanteste Spiel — aus
          Tabellenzone, Rangnähe, Quoten und Derby — und hebt es hervor. Es steht
          <strong> fest, bevor getippt wird</strong>, und wird begründet angezeigt.
        </p>
        {bg.enabled && (
          <div style={{ paddingLeft: 12, borderLeft: `1px solid ${C.line}`, marginTop: 10 }}>
            <Slider label="Big Game zählt zusätzlich" value={bg.aufschlag}
              {...BIGGAME_LIMITS.aufschlag} step={reglerSchritt(rules, BIGGAME_LIMITS.aufschlag)}
              onChange={(v) => setzeBigGame({ aufschlag: v })}
              fmt={(x) => `+${zahl(x)} → ${fmtFaktor(1 + x)}`}
              hint="Fließt in denselben Topf wie Derby und Team-Faktoren — addiert, nicht multipliziert." />
            <Slider label="Mindest-Brisanz" value={bg.minSpannung}
              {...BIGGAME_LIMITS.minSpannung} step={reglerSchritt(rules, BIGGAME_LIMITS.minSpannung)}
              onChange={(v) => setzeBigGame({ minSpannung: v })}
              fmt={(x) => x.toFixed(2)}
              hint="Reißt kein Spiel diese Schwelle, hat der Spieltag kein Big Game — besser als ein aufgeblasenes Mittelfeldduell." />
          </div>
        )}
      </GrosseZeile>

      {/* ── Außenseiter nach Tabelle (Andis MOD3) ── */}
      <GrosseZeile icon="📉" titel="Außenseiter nach Tabelle" unter="Tabellenplatz statt nur Quote"
        wert={rules.tabellenBonus?.enabled ? "an" : "aus"}
        offen={zeile === "tabelle"} onClick={() => auf("tabelle")}>
        <TabellenBonus rules={rules} onChange={(teil) => onChange(teil)} />
      </GrosseZeile>

      {/* ── Der gemeinsame Deckel ──
          Erscheint erst, wenn es überhaupt etwas zu deckeln gibt. Der Joker
          zahlt in denselben Topf, deshalb zählt er hier mit. */}
      {(tmAktiv || bg.enabled || rules.joker?.enabled || rules.tabellenBonus?.enabled) && (
        <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 12, paddingTop: 12 }}>
          <Slider label="Deckel für alle Modifikatoren" value={rules.modCap} {...L.modCap}
            step={reglerSchritt(rules, L.modCap)} pfad="modCap"
            onChange={(v) => onChange({ modCap: v })} fmt={fmtFaktor}
            hint="Obergrenze, wenn Joker und Team-Regeln zusammentreffen." />
          <p style={{ fontSize: 11, color: C.muted, marginTop: -2, marginBottom: 8, lineHeight: 1.45 }}>
            Modifikatoren werden <strong>addiert, nicht multipliziert</strong>: Joker ×2,0
            und Derby ×1,5 ergeben <strong>×2,5</strong> (nicht ×3,0). Das bleibt
            berechenbar — der Deckel fängt den Rest ab.
          </p>
          <p style={{ fontSize: 11, color: C.muted, margin: 0, lineHeight: 1.5 }}>
            In denselben Topf zahlen außerdem: der <strong>Joker</strong> (eigene Zeile
            oben) und die <strong>Wettbewerbs-Gewichte</strong> — die stehen bei den
            Wettbewerben, weil dort ausgewählt wird, was überhaupt mitspielt.
          </p>
        </div>
      )}
    </div>
  );
}
