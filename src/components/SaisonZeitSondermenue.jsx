"use client";

import { useState } from "react";
import { DEFAULT_RULES } from "@/lib/engine";
import { AUSWAHL_LIMITS, beschreibeAuswahl } from "@/lib/spielauswahl";
import { VORLAUF_STUFEN, SCHLUSS_STUFEN, ANKER, beschreibeTippfenster, erklaereTippfenster, fensterKonflikte } from "@/lib/tippfenster";
import { C, MONO, RUND } from "@/lib/theme";
import { TAPZIEL } from "@/lib/tapziel";
import { GrosseZeile } from "@/components/Eingaben";
import SaisonWetten from "@/components/SaisonWetten";
import Zeitachse from "@/components/Zeitachse";

// ============================================================
//  SAISON & ZEIT — das fünfte und letzte Sondermenü
//  (Andi, 22.08.2026, auf die Frage eigene Zeile oder an die Wettbewerbe:
//  „eigene zeile")
//
//  🔴 Was die vier Zeilen verbindet, ist nicht das Thema, sondern die ACHSE:
//  alle vier beantworten **wann** etwas gilt, nicht **wie viel** es zählt.
//
//    · Saison-Wetten — die Ebene, die über die ganze Saison läuft
//    · Ab wann tippbar — wann ein Spiel aufgeht und wann es zufällt
//    · Zeitachse — was „Spieltag 5" heißt, wenn Ligen versetzt laufen
//    · Zeitraum — welchen Ausschnitt der Saison die Runde umfasst
//
//  ⚠️ Der ZEITRAUM ist streng genommen Betippungsauswahl (`rules.spiele`) und
//  steht trotzdem hier. Grund: er beantwortet dieselbe Frage wie die drei
//  darüber („bis wann geht das hier?"), und ein Admin sucht ihn an genau dem
//  Ort, an dem er auch das Tipp-Fenster einstellt. Die Kachel „Wandert mit dem
//  Code" bleibt bei ihm, weil sie SEINEN Stand beschreibt.
//
//  ⚠️ Die Saison-Wetten sind die einzige Zeile hier, die PUNKTE vergibt
//  (Ebene 3, eigener Deckel). Sie stehen trotzdem nicht bei der Wertung: ihre
//  Frage ist „läuft neben den Spieltagen noch etwas mit?", und das ist eine
//  Frage der Zeit, nicht der Höhe.
// ============================================================

export function saisonZeitStand(rules) {
  const sa = rules?.saison || DEFAULT_RULES.saison;
  const sp = rules?.spiele || DEFAULT_RULES.spiele;
  const stunden = rules?.tippfenster?.vorlaufStunden ?? 168;
  const vorlauf = VORLAUF_STUFEN.find((s) => s.stunden === stunden)?.label ?? `${stunden} h`;
  const wetten = Array.isArray(sa?.wetten) ? sa.wetten.filter((w) => w?.aktiv !== false).length : 0;
  const teile = [
    wetten > 0 ? `${wetten} Saison-Wette${wetten === 1 ? "" : "n"}` : null,
    vorlauf,
    sp?.spieltagVon != null || sp?.spieltagBis != null
      ? `Spieltag ${sp.spieltagVon ?? 1}–${sp.spieltagBis ?? "Ende"}`
      : null,
  ].filter(Boolean);
  return teile.join(" · ");
}

// Der Stand der Fenster-Zeile. Zeigt den Vorlauf und — nur wenn es einen
// gibt — den gemeinsamen Schluss: eine Zeile, die immer beides nennt, wäre
// für die große Mehrheit ohne Fremdjoker nur länger, nicht klarer.
function fensterStand(rules) {
  const vorlauf = VORLAUF_STUFEN.find((s) => s.stunden === (rules?.tippfenster?.vorlaufStunden ?? 168))?.label ?? "—";
  const schluss = rules?.tippfenster?.schlussStunden ?? 0;
  if (schluss <= 0) return vorlauf;
  const label = SCHLUSS_STUFEN.find((s) => s.stunden === schluss)?.label ?? `${schluss} Std. vorher`;
  return `${vorlauf} · Schluss ${label}`;
}

export default function SaisonZeitSondermenue({ rules, teams = [], onChange }) {
  const [zeile, setZeile] = useState(null);
  const auf = (k) => setZeile((o) => (o === k ? null : k));

  const sp = rules.spiele || DEFAULT_RULES.spiele;
  const setzeSpiele = (p) => onChange({ spiele: { ...sp, ...p } });
  // ⚠️ `...rules.tippfenster` mitnehmen: eine frühere Fassung ersetzte das
  // GANZE Objekt und warf damit den Anker weg. Ein Creator-Code mit
  // `anker: "spieltag"` verlor ihn, sobald jemand den Vorlauf einmal
  // anfasste — lautlos.
  const setzeTippfenster = (p) => onChange({ tippfenster: { ...rules.tippfenster, ...p } });

  const zeitraumStand = sp.spieltagVon != null || sp.spieltagBis != null
    ? `${sp.spieltagVon ?? 1}–${sp.spieltagBis ?? "Ende"}`
    : "ganze Saison";
  const wetten = Array.isArray(rules.saison?.wetten)
    ? rules.saison.wetten.filter((w) => w?.aktiv !== false).length : 0;

  return (
    <div>
      {/* ── Saison-Wetten ── */}
      <GrosseZeile icon="🏆" titel="Saison-Wetten" unter="die Langzeit-Ebene neben den Spieltagen"
        wert={wetten > 0 ? String(wetten) : "keine"}
        offen={zeile === "saison"} onClick={() => auf("saison")}>
        <SaisonWetten
          saison={rules.saison || DEFAULT_RULES.saison}
          onChange={(saison) => onChange({ saison })}
          teams={teams}
        />
      </GrosseZeile>

      {/* ── Tipp-Fenster ── */}
      <GrosseZeile icon="⏳" titel="Ab wann tippbar?" unter="Vorlauf, Anker und Tippschluss"
        wert={fensterStand(rules)}
        offen={zeile === "fenster"} onClick={() => auf("fenster")}>
        <p style={{ fontSize: 11, color: C.muted, margin: "4px 0 8px", lineHeight: 1.45 }}>
          Quoten erscheinen erst einige Tage vor Anpfiff. Wie früh eure Runde
          tippt, entscheidest du — und seit dem gemeinsamen Tippschluss auch,
          wie spät.
        </p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {VORLAUF_STUFEN.map((st) => {
            const an = (rules.tippfenster?.vorlaufStunden ?? 168) === st.stunden;
            return (
              <button key={st.stunden} title={st.hint}
                onClick={() => setzeTippfenster({ vorlaufStunden: st.stunden })}
                style={{
                  ...TAPZIEL, flex: "1 1 70px", cursor: "pointer", fontFamily: "inherit", padding: "8px 6px",
                  borderRadius: RUND.karte, fontSize: 12, fontWeight: 700,
                  background: an ? `${C.akzent}22` : C.surface,
                  color: an ? C.akzent : C.muted,
                  border: `1px solid ${an ? C.akzent + "66" : C.line}`,
                }}>{st.label}</button>
            );
          })}
        </div>
        {/* 🔴 Der ANKER hatte bis 06.08.2026 überhaupt keine Oberfläche. Er
            stand im Regelwerk, war über den Creator-Code teilbar, wurde von
            `sanitizeRules` gesäubert — und niemand konnte ihn einstellen. */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          {ANKER.map((a) => {
            const an = (rules.tippfenster?.anker ?? "spiel") === a.key;
            return (
              <button key={a.key} title={a.erklaerung}
                onClick={() => setzeTippfenster({ anker: a.key })}
                style={{
                  flex: "1 1 140px", cursor: "pointer", fontFamily: "inherit", padding: "8px 8px",
                  borderRadius: RUND.karte, fontSize: 12, fontWeight: 700,
                  background: an ? `${C.akzent}22` : C.surface,
                  color: an ? C.akzent : C.muted,
                  border: `1px solid ${an ? C.akzent + "66" : C.line}`,
                }}>{a.label}</button>
            );
          })}
        </div>
        {/* ── Der gemeinsame Tippschluss (Andi, 23.08.2026) ──
            🔴 Die dritte Kante des Fensters. Sie steht UNTER dem Anker, weil
            sie ihn voraussetzt: ohne den Spieltag als Block gibt es keinen
            gemeinsamen Moment, an dem alle getippt haben. */}
        <div style={{ fontSize: 12, color: C.text, fontWeight: 700, marginTop: 12 }}>
          Wann ist Tippschluss?
        </div>
        <p style={{ fontSize: 11, color: C.muted, margin: "3px 0 6px", lineHeight: 1.45 }}>
          Normalerweise schließt jedes Spiel bei seinem eigenen Anpfiff. Ein
          gemeinsamer Schluss vorher macht die Tipps aller gleichzeitig
          sichtbar — die Voraussetzung für Fremdjoker.
        </p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {SCHLUSS_STUFEN.map((st) => {
            const an = (rules.tippfenster?.schlussStunden ?? 0) === st.stunden;
            return (
              <button key={st.stunden} title={st.hint}
                onClick={() => setzeTippfenster({ schlussStunden: st.stunden })}
                style={{
                  ...TAPZIEL, flex: "1 1 90px", cursor: "pointer", fontFamily: "inherit", padding: "8px 6px",
                  borderRadius: RUND.karte, fontSize: 12, fontWeight: 700,
                  background: an ? `${C.akzent}22` : C.surface,
                  color: an ? C.akzent : C.muted,
                  border: `1px solid ${an ? C.akzent + "66" : C.line}`,
                }}>{st.label}</button>
            );
          })}
        </div>

        {/* 🔴 Gemeldet, nicht still korrigiert. Andi: „Das muss halt vom Admin
            klar so eingestellt werden, weil sonst gehts nicht auf." */}
        {fensterKonflikte(rules).map((k) => (
          <div key={k.key} style={{
            marginTop: 8, background: `${C.coral}14`, border: `1px solid ${C.coral}55`,
            borderRadius: RUND.karte, padding: "8px 10px",
            fontSize: 11, color: C.text, lineHeight: 1.45,
          }}>
            ⚠️ {k.text}
          </div>
        ))}

        <p style={{ fontSize: 11, color: C.muted, marginTop: 6, lineHeight: 1.45 }}>
          {beschreibeTippfenster(rules)}
        </p>
        {/* Die drei Fragen, die ein Spieler wirklich stellt — statt einer
            Beschreibung der Einstellung. `erklaereTippfenster` war dafür
            gebaut und hatte keinen Aufrufer (gefunden über `npm run tot`). */}
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 5 }}>
          {erklaereTippfenster(rules).map((z) => (
            <div key={z.frage} style={{ fontSize: 11, lineHeight: 1.45 }}>
              <span style={{ color: C.text, fontWeight: 700 }}>{z.frage}</span>{" "}
              <span style={{ color: C.muted }}>{z.antwort}</span>
            </div>
          ))}
        </div>
      </GrosseZeile>

      {/* ── Zeitachse ──
          Zeigt sich selbst nur bei mehreren Wettbewerben — deshalb ohne
          eigenen Stand in der Zeile. */}
      <GrosseZeile icon="🧭" titel="Zeitachse" unter="was ein Spieltag EURER Runde umfasst"
        offen={zeile === "achse"} onClick={() => auf("achse")}>
        <Zeitachse
          zeitachse={rules.zeitachse}
          onChange={(neu) => onChange({ zeitachse: neu })}
        />
      </GrosseZeile>

      {/* ── Zeitraum ── */}
      <GrosseZeile icon="📅" titel="Zeitraum" unter="welchen Ausschnitt der Saison die Runde umfasst"
        wert={zeitraumStand} offen={zeile === "zeitraum"} onClick={() => auf("zeitraum")}>
        <p style={{ fontSize: 11, color: C.muted, margin: "4px 0 8px", lineHeight: 1.45 }}>
          Leer = ganze Saison. Für kurze Runden („nur die Rückrunde", „die letzten
          fünf Spieltage") hier eingrenzen.
        </p>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {[["spieltagVon", "von"], ["spieltagBis", "bis"]].map(([feld, label]) => (
            <label key={feld} style={{ flex: 1, fontSize: 12, color: C.muted }}>
              Spieltag {label}
              <input type="number" inputMode="numeric"
                min={AUSWAHL_LIMITS.spieltag.min} max={AUSWAHL_LIMITS.spieltag.max}
                value={sp[feld] ?? ""}
                onChange={(e) => setzeSpiele({ [feld]: e.target.value === "" ? null : Number(e.target.value) })}
                placeholder="—"
                style={{
                  display: "block", width: "100%", boxSizing: "border-box", marginTop: 3,
                  background: C.surface, color: C.text, border: `1px solid ${C.line}`,
                  borderRadius: RUND.karte, padding: "8px 10px", fontSize: 13, fontFamily: MONO, outline: "none",
                }} />
            </label>
          ))}
        </div>

        <div style={{
          marginTop: 10, background: C.ink2, border: `1px solid ${C.line}`,
          borderRadius: RUND.karte, padding: "10px 12px",
        }}>
          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 1.2, color: C.muted, textTransform: "uppercase" }}>
            Wandert mit dem Code
          </div>
          <div style={{ fontSize: 12, color: C.text, marginTop: 4, lineHeight: 1.45 }}>
            {beschreibeAuswahl(sp)}
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4, lineHeight: 1.45 }}>
            Wer deinen Creator-Code lädt, bekommt diese Auswahl gleich mit — und
            kann sie danach trotzdem ändern.
          </div>
        </div>
      </GrosseZeile>
    </div>
  );
}
