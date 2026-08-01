"use client";

import { useMemo } from "react";
import { C, MONO } from "@/lib/theme";
import { KOMBINATIONEN, ACHSEN, achsenProfil, achsenKonflikte } from "@/lib/jokerBibliothek";
import {
  BUDGET_QUELLEN, TAKTE, VERFALL_TYPEN, PREISMODI, JOKER_ARTEN,
  preisFuer, BUDGET_LIMITS, beschreibeBudget,
} from "@/lib/jokerBudget";

// Vorgabe je Quellen-Typ beim Hinzufügen — deckt sich mit den Fallbacks in
// `sanitizeQuelle` (jokerBudget.js), damit ein frisch hinzugefügter Block
// sofort sinnvolle Werte zeigt statt leerer Felder.
const STANDARD_QUELLE = {
  startkapital: { typ: "startkapital", betrag: 0 },
  gleich: { typ: "gleich", betrag: 10 },
  leistung: { typ: "leistung", proEreignis: 1, ausgeloest: [] },
  rueckstand: { typ: "rueckstand", proPunktRueckstand: 0.5, deckel: 0 },
  platzierung: { typ: "platzierung", betrag: 10, kurve: "linear" },
};

const EINSAETZE = [1, 2, 3, 4];

// ── Bibliothek, Münzen, Jokershop, Achsenprofil ─────────────
// „Acht Module liegen fertig und getestet in src/lib/. Kein einziges ist über
// die Oberfläche erreichbar." (design/gehaeuse-ui.md). Diese Komponente macht
// vier davon bedienbar: die kuratierte Bibliothek (`jokerBibliothek.js`), die
// gemeinsame Währung samt Preisen (`jokerBudget.js`) und — nur in der
// Profi-Stufe — das Achsenprofil über das GANZE Regelwerk.
//
// Sprache in sichtbaren Texten: „Münzen" und „Shop", nie „Budget"
// (design/joker-ausloeser.md Abschnitt 0). Die Code-Bezeichner bleiben wie
// sie sind.
export default function JokerOekonomie({ rules, onChange, stufe }) {
  const budget = rules.budget || {};
  const quellen = budget.quellen || [];
  const preise = budget.preise || {};

  // Nur in der Profi-Stufe sichtbar (2.4), aber als Hook UNBEDINGT aufgerufen
  // — genau die Falle aus CLAUDE.md: ein Hook unter einer Bedingung fliegt
  // beim zweiten Render mit „change in the order of Hooks" auseinander,
  // dieselbe Ursache wie einst bei Tippabgabe.jsx.
  const profil = useMemo(() => achsenProfil(rules), [rules]);
  const konflikte = useMemo(() => achsenKonflikte(profil), [profil]);

  const istAn = (typ) => quellen.some((q) => q.typ === typ);
  const wert = (typ, feld) => quellen.find((q) => q.typ === typ)?.[feld];
  const umschaltenQuelle = (typ) => onChange({
    budget: {
      quellen: istAn(typ)
        ? quellen.filter((q) => q.typ !== typ)
        : [...quellen, STANDARD_QUELLE[typ]],
    },
  });
  const setzeQuelleFeld = (typ, feld, v) => onChange({
    budget: { quellen: quellen.map((q) => (q.typ === typ ? { ...q, [feld]: v } : q)) },
  });
  const patchBudgetFeld = (p) => onChange({ budget: p });
  const setzePreis = (key, v) => onChange({ budget: { preise: { ...preise, [key]: v } } });

  // Ein Klick übernimmt das komplette Regelfragment der Kombination —
  // `budget`, `limitKlassen` und `duell` werden GANZ ERSETZT, nicht mit dem
  // bisherigen Regelwerk gemischt. Die drei sind ein zusammengehöriger Satz;
  // ein halb übernommener Satz ergäbe eine Kombination, die niemand entworfen
  // hat — dieselbe Begründung, aus der die Aspekte in `presetMerge.js`
  // gemeinsam wandern (design/gehaeuse-ui.md 4b).
  //
  // ⚠️ `rules.joker` bleibt UNANGETASTET. Das ist der klassische Joker aus den
  // Wertungs-Presets (`presets.js`) — beanspruchte die Ökonomie dasselbe Feld,
  // überschriebe die Auswahl einer Kombination still die Wertung, und das
  // zweiachsige Codeschema `<Wertung>-<Ökonomie>` wäre eine Lüge.
  const waehleKombi = (k) => onChange({
    budget: k.budget,
    limitKlassen: k.limitKlassen,
    duell: k.duell,
  });

  return (
    <div>
      {/* 2.1 Bibliothek — immer sichtbar, sechs kuratierte Kombinationen in
          der vorhandenen, nach Würze aufsteigenden Reihenfolge. */}
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Bibliothek</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {KOMBINATIONEN.map((k) => {
          // Achsenprofil NUR der Kombination (nicht des aktuellen Regelwerks)
          // — so lassen sich die sechs Karten untereinander vergleichen, bevor
          // eine davon gewählt wird. Das Profil des GANZEN Regelwerks steht
          // unten in 2.4.
          const kProfil = achsenProfil({ budget: k.budget, duell: k.duell });
          return (
            <button key={k.key} onClick={() => waehleKombi(k)} style={{
              textAlign: "left", cursor: "pointer", fontFamily: "inherit", color: C.text,
              background: C.surface, border: `1px solid ${C.line}`,
              borderRadius: 12, padding: "10px 12px",
            }}>
              <div style={{ fontSize: 12.5, fontWeight: 700 }}>{k.label}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>{k.desc}</div>
              <MiniAchsen profil={kProfil} />
            </button>
          );
        })}
      </div>
      <p style={{ fontSize: 10.5, color: C.muted, marginTop: 6, lineHeight: 1.4 }}>
        Die Balken zeigen nur eine <strong>Richtung</strong>, keine Bewertung — kein Balken
        ist „zu hoch".
      </p>

      {/* 2.2 Münzen */}
      <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 14, paddingTop: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Münzen</div>
        <p style={{ fontSize: 11, color: C.muted, margin: "4px 0 9px", lineHeight: 1.45 }}>
          Woher eure Münzen kommen. Mehrere Quellen gleichzeitig sind erlaubt —
          sie addieren sich.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {BUDGET_QUELLEN.map((q) => {
            const an = istAn(q.key);
            return (
              <div key={q.key} style={{
                background: an ? `${C.gold}12` : C.surface,
                border: `1px solid ${an ? C.gold + "55" : C.line}`,
                borderRadius: 12, padding: "10px 12px",
              }}>
                <button onClick={() => umschaltenQuelle(q.key)} style={{
                  width: "100%", textAlign: "left", background: "transparent", border: "none",
                  padding: 0, fontFamily: "inherit", color: C.text, cursor: "pointer",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, flex: 1 }}>{q.label}</span>
                    <span style={{ color: an ? C.gold : C.muted, fontSize: 13 }}>{an ? "✓" : "+"}</span>
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 1.45 }}>{q.desc}</div>
                </button>

                {an && (
                  <div style={{ marginTop: 9, paddingTop: 9, borderTop: `1px solid ${C.line}`, display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {(q.key === "startkapital" || q.key === "gleich" || q.key === "platzierung") && (
                      <Zahl label="Münzen" wert={wert(q.key, "betrag")} limits={BUDGET_LIMITS.betrag}
                        onChange={(v) => setzeQuelleFeld(q.key, "betrag", v)} />
                    )}
                    {q.key === "leistung" && (
                      <Zahl label="Münzen je Ereignis" wert={wert(q.key, "proEreignis")} limits={BUDGET_LIMITS.proEreignis}
                        onChange={(v) => setzeQuelleFeld(q.key, "proEreignis", v)} />
                    )}
                    {q.key === "rueckstand" && (
                      <>
                        <Zahl label="Münzen je Punkt Rückstand" wert={wert(q.key, "proPunktRueckstand")} limits={BUDGET_LIMITS.proPunktRueckstand}
                          onChange={(v) => setzeQuelleFeld(q.key, "proPunktRueckstand", v)} />
                        <Zahl label="Deckel je Vorfall (0 = keiner)" wert={wert(q.key, "deckel")} limits={BUDGET_LIMITS.deckel}
                          onChange={(v) => setzeQuelleFeld(q.key, "deckel", v)} />
                      </>
                    )}
                    {q.key === "platzierung" && (
                      <label style={{ fontSize: 11, color: C.muted, flex: "1 1 150px" }}>
                        Kurve
                        <div style={{ display: "flex", gap: 6, marginTop: 3 }}>
                          {["linear", "top-schwer"].map((kv) => {
                            const kan = wert(q.key, "kurve") === kv;
                            return (
                              <button key={kv} onClick={() => setzeQuelleFeld(q.key, "kurve", kv)} style={{
                                cursor: "pointer", fontSize: 11.5, fontFamily: "inherit", padding: "6px 10px", borderRadius: 999,
                                background: kan ? `${C.gold}22` : C.surface2, color: kan ? C.gold : C.muted,
                                border: `1px solid ${kan ? C.gold + "66" : C.line}`,
                              }}>{kv}</button>
                            );
                          })}
                        </div>
                      </label>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Takt & Verfall — als Karten-Reihe */}
        <Field label="Takt">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {TAKTE.map((t) => {
              const an = (budget.takt ?? "spieltag") === t.key;
              return (
                <button key={t.key} title={t.desc} onClick={() => patchBudgetFeld({ takt: t.key })} style={{
                  flex: "1 1 100px", cursor: "pointer", fontFamily: "inherit", padding: "8px 8px",
                  borderRadius: 11, textAlign: "left",
                  background: an ? `${C.gold}22` : C.surface, color: an ? C.gold : C.muted,
                  border: `1px solid ${an ? C.gold + "66" : C.line}`,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{t.label}</div>
                </button>
              );
            })}
          </div>
        </Field>
        {budget.takt === "alleNSpieltage" && (
          <Zahl label="N Spieltage" wert={budget.n} limits={BUDGET_LIMITS.n}
            onChange={(v) => patchBudgetFeld({ n: v })} />
        )}

        <Field label="Verfall">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {VERFALL_TYPEN.map((v) => {
              const an = (budget.verfall ?? "deckel") === v.key;
              return (
                <button key={v.key} title={v.desc} onClick={() => patchBudgetFeld({ verfall: v.key })} style={{
                  flex: "1 1 100px", cursor: "pointer", fontFamily: "inherit", padding: "8px 8px",
                  borderRadius: 11, textAlign: "left",
                  background: an ? `${C.gold}22` : C.surface, color: an ? C.gold : C.muted,
                  border: `1px solid ${an ? C.gold + "66" : C.line}`,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{v.label}</div>
                </button>
              );
            })}
          </div>
        </Field>
        {budget.verfall === "deckel" && (
          <Zahl label="Deckel (max. Ansparen)" wert={budget.maxAnsparen} limits={BUDGET_LIMITS.maxAnsparen}
            onChange={(v) => patchBudgetFeld({ maxAnsparen: v })} />
        )}

        <p style={{ fontSize: 11, color: C.muted, marginTop: 10, lineHeight: 1.45 }}>
          {beschreibeBudget(budget)}
        </p>
      </div>

      {/* 2.3 Jokershop */}
      <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 14, paddingTop: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Shop</div>
        <p style={{ fontSize: 11, color: C.muted, margin: "4px 0 9px", lineHeight: 1.45 }}>
          Was jede Joker-Art in dieser Runde kostet. Rechts steht der Startpreis
          — wie er sich bei mehrfachem Einsatz in derselben Periode entwickelt,
          zeigt die Zeile darunter.
        </p>

        <Field label="Preisniveau">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {PREISMODI.map((m) => {
              const an = (budget.preisModus ?? "fix") === m.key;
              return (
                <button key={m.key} title={m.desc} onClick={() => patchBudgetFeld({ preisModus: m.key })} style={{
                  flex: "1 1 90px", cursor: "pointer", fontFamily: "inherit", padding: "8px 8px",
                  borderRadius: 11, textAlign: "left",
                  background: an ? `${C.gold}22` : C.surface, color: an ? C.gold : C.muted,
                  border: `1px solid ${an ? C.gold + "66" : C.line}`,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{m.label}</div>
                </button>
              );
            })}
          </div>
        </Field>
        {budget.preisModus !== "fix" && (
          <Zahl label="Steigerung je weiterem Einsatz" wert={budget.steigerung} limits={BUDGET_LIMITS.steigerung}
            onChange={(v) => patchBudgetFeld({ steigerung: v })} />
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {JOKER_ARTEN.map((art) => (
            <div key={art.key} style={{
              background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: "10px 12px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>{art.label}</span>
                <input type="number" value={preise[art.key] ?? 0}
                  min={BUDGET_LIMITS.preis.min} max={BUDGET_LIMITS.preis.max} step={BUDGET_LIMITS.preis.step}
                  onChange={(e) => setzePreis(art.key, Number(e.target.value))}
                  style={{
                    width: 70, boxSizing: "border-box", background: C.ink2, color: C.text,
                    border: `1px solid ${C.line}`, borderRadius: 10, padding: "5px 8px",
                    fontSize: 13, fontFamily: MONO, textAlign: "right", outline: "none",
                  }} />
              </div>
              <div style={{ fontSize: 10.5, color: C.muted, marginTop: 3, lineHeight: 1.4 }}>{art.desc}</div>
              {/* Der eigentliche Punkt bei `preisModus: "steigend"`: sichtbar
                  machen, dass aus einem Startpreis von 10 beim vierten Einsatz
                  ein deutlich höherer Preis wird. */}
              <div style={{ display: "flex", gap: 12, marginTop: 7, flexWrap: "wrap" }}>
                {EINSAETZE.map((n) => (
                  <span key={n} style={{ fontFamily: MONO, fontSize: 11, color: C.muted }}>
                    {n}. Einsatz{" "}
                    <strong style={{ color: n > 1 ? C.gold : C.text }}>
                      {fmtGeld(preisFuer(art.key, budget, { bisherInPeriode: n - 1, spielerInPeriode: n - 1 }))}
                    </strong>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2.4 Achsenprofil — nur Profi-Stufe. Das Profil des GANZEN aktuellen
          Regelwerks, nicht nur der Bibliothek-Kombination. */}
      {stufe === "profi" && (
        <div style={{
          marginTop: 14, background: C.ink2, border: `1px solid ${C.line}`,
          borderRadius: 14, padding: "14px 16px",
        }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Achsenprofil des gesamten Regelwerks</div>
          {/* ⚠️ Muss sichtbar stehen, nicht im Kleingedruckten: die Zuordnung
              ist geschätzt, keine Messung. */}
          <p style={{ fontSize: 11, color: C.muted, marginTop: 6, marginBottom: 12, lineHeight: 1.5 }}>
            <strong style={{ color: C.text }}>Geschätzt, nicht gemessen:</strong> welches Feld
            wie stark auf welche Achse zählt, ist eine Annahme, keine Messung. Die Balken
            zeigen eine Richtung, keine Bewertung — kein Wert ist „zu hoch".
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {ACHSEN.map((a) => (
              <AchsenZeile key={a.key} achse={a} eintrag={profil[a.key]} />
            ))}
          </div>
          {konflikte.map((k) => (
            <div key={k.achse} style={{
              background: `${C.indigo}12`, border: `1px solid ${C.indigo}44`, borderRadius: 12,
              padding: "9px 11px", marginTop: 10, fontSize: 11, color: C.muted, lineHeight: 1.5,
            }}>
              {k.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Sechs kleine Balken (A–F) für eine einzelne Bibliothek-Karte.
function MiniAchsen({ profil }) {
  return (
    <div style={{ display: "flex", gap: 3, marginTop: 8, height: 16, alignItems: "flex-end" }}>
      {ACHSEN.map((a) => {
        const w = profil[a.key]?.wert ?? 0;
        return (
          <div key={a.key} title={`${a.label}: ${w}/3`} style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end" }}>
            <div style={{
              width: "100%", borderRadius: 2, background: w > 0 ? C.indigo : C.line,
              height: `${Math.max(15, (w / 3) * 100)}%`,
            }} />
          </div>
        );
      })}
    </div>
  );
}

// Eine volle Achsen-Zeile im 2.4-Panel — Muster PresetRating.jsx.
function AchsenZeile({ achse, eintrag }) {
  const w = eintrag?.wert ?? 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 12, width: 108, flexShrink: 0 }}>{achse.label}</span>
      <div style={{ flex: 1, height: 7, borderRadius: 999, background: C.surface, overflow: "hidden" }}>
        <div style={{ width: `${(w / 3) * 100}%`, height: "100%", background: C.indigo }} />
      </div>
      <span style={{ fontFamily: MONO, fontSize: 11, color: C.muted, width: 26, textAlign: "right" }}>{w}/3</span>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function Zahl({ label, wert, limits, onChange }) {
  return (
    <label style={{ fontSize: 11, color: C.muted, flex: "1 1 150px", display: "block", marginTop: 8 }}>
      {label}
      <input type="number" value={wert ?? ""}
        min={limits.min} max={limits.max} step={limits.step}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          display: "block", width: "100%", boxSizing: "border-box", marginTop: 3,
          background: C.ink2, color: C.text, border: `1px solid ${C.line}`,
          borderRadius: 10, padding: "7px 9px", fontSize: 13, fontFamily: MONO, outline: "none",
        }} />
    </label>
  );
}

// Ganze Zahlen ohne Nachkommastellen, sonst höchstens zwei — die Preisvorschau
// (`preisFuer`) liefert bereits auf zwei Nachkommastellen gerundete Werte.
function fmtGeld(n) {
  const num = Number(n) || 0;
  return Number.isInteger(num) ? String(num) : String(Math.round(num * 100) / 100);
}
