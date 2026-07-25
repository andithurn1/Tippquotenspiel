"use client";

import { useState } from "react";
import { C, MONO } from "@/lib/theme";
import {
  WETT_TYPEN, WETT_TYP, istAuswertbar, SAISON_LIMITS, SAISON_PRESETS,
  sanitizeSaison, wettenLabel, wettenId,
} from "@/lib/saisonwetten";

// ── Saison-Wetten einstellen (Admin) ────────────────────────
// Die nebenbei laufende Langzeit-Ebene. Bedienung bewusst zweistufig:
// erst eine EMPFEHLUNG übernehmen (ein Klick, fertig), dann bei Bedarf
// einzelne Wetten ergänzen und die Punkte feinjustieren.
//
// Der „außer"-Parameter ist der Grund, warum aus 7 Typen viele Wetten werden:
// „Torschützenkönig außer Bayern" ist eine andere Wette als „Torschützenkönig".
export default function SaisonWetten({ saison, onChange, teams = [] }) {
  const s = sanitizeSaison(saison);
  const [offen, setOffen] = useState(null); // key des Typs, dessen Ausschluss gerade bearbeitet wird

  const setze = (patch) => onChange(sanitizeSaison({ ...s, ...patch }));

  const hinzufuegen = (typ, ausser = []) => {
    const neu = { key: typ.key, punkte: typ.standardPunkte };
    if (ausser.length && typ.parameter.includes("ausser")) neu.ausser = ausser;
    setze({ wetten: [...s.wetten, neu] });
    setOffen(null);
  };
  const entfernen = (id) => setze({ wetten: s.wetten.filter((w) => wettenId(w) !== id) });
  const punkteSetzen = (id, punkte) =>
    setze({ wetten: s.wetten.map((w) => (wettenId(w) === id ? { ...w, punkte } : w)) });
  const feldSetzen = (id, feld, wert) =>
    setze({ wetten: s.wetten.map((w) => (wettenId(w) === id ? { ...w, [feld]: wert } : w)) });

  const belegt = new Set(s.wetten.map(wettenId));
  const voll = s.wetten.length >= SAISON_LIMITS.maxWetten;

  return (
    <div>
      <p style={{ fontSize: 11.5, color: C.muted, marginTop: -6, marginBottom: 10, lineHeight: 1.4 }}>
        Läuft nebenher über die ganze Saison: einmal getippt, am Ende abgerechnet.
        <strong> Ohne Quoten</strong> — du legst selbst fest, was jede Wette wert ist.
      </p>

      <Toggle an={s.enabled} onChange={(on) => setze({ enabled: on })} />

      {s.enabled && (
        <div style={{ paddingLeft: 12, borderLeft: `1px solid ${C.line}`, marginTop: 10 }}>
          {/* Empfehlungen */}
          <Label>Empfehlung übernehmen</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {SAISON_PRESETS.map((p) => (
              <button key={p.key} onClick={() => onChange(sanitizeSaison(p.saison))} style={{
                textAlign: "left", cursor: "pointer", fontFamily: "inherit",
                background: C.surface, border: `1px solid ${C.line}`,
                borderRadius: 12, padding: "9px 11px", color: C.text,
              }}>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>{p.label}</div>
                <div style={{ fontSize: 10.5, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>{p.desc}</div>
              </button>
            ))}
          </div>

          {/* Gewichtung */}
          <Label>Gewicht der Saison-Ebene: ×{s.gewicht.toFixed(1)}</Label>
          <input type="range"
            min={SAISON_LIMITS.gewicht.min} max={SAISON_LIMITS.gewicht.max} step={SAISON_LIMITS.gewicht.step}
            value={s.gewicht} onChange={(e) => setze({ gewicht: Number(e.target.value) })}
            style={{ width: "100%", accentColor: C.gold }} />
          <div style={{ fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 1.4 }}>
            {s.gewicht < 0.8 && "Nur Würze — die Spieltage entscheiden die Runde."}
            {s.gewicht >= 0.8 && s.gewicht <= 1.4 && "Spürbar, aber nicht dominant."}
            {s.gewicht > 1.4 && "Stark: ein guter Saison-Tipp kann einen ganzen Spieltag aufwiegen."}
          </div>

          {/* Gewählte Wetten */}
          <Label>Gewählte Wetten ({s.wetten.length}/{SAISON_LIMITS.maxWetten})</Label>
          {s.wetten.length === 0 && (
            <div style={{ fontSize: 11.5, color: C.muted, paddingBottom: 6 }}>
              Noch keine — nimm eine Empfehlung oder wähle unten einzeln aus.
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {s.wetten.map((w) => {
              const id = wettenId(w);
              return (
                <div key={id} style={{
                  background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: "10px 12px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700 }}>{wettenLabel(w)}</span>
                    <button onClick={() => entfernen(id)} aria-label="entfernen" style={{
                      cursor: "pointer", background: "transparent", border: "none",
                      color: C.muted, fontSize: 17, lineHeight: 1, padding: "0 2px",
                    }}>×</button>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 7 }}>
                    <span style={{ fontFamily: MONO, fontSize: 11, color: C.gold, minWidth: 54 }}>
                      {w.punkte} Pkt
                    </span>
                    <input type="range"
                      min={SAISON_LIMITS.punkte.min} max={SAISON_LIMITS.punkte.max} step={SAISON_LIMITS.punkte.step}
                      value={w.punkte} onChange={(e) => punkteSetzen(id, Number(e.target.value))}
                      style={{ flex: 1, accentColor: C.gold }} />
                  </div>

                  {/* Freischalt-Fenster. „Wer gewinnt die Champions League?"
                      vor dem 1. Spieltag ist reines Raten — da steht nicht
                      einmal fest, wer die K.-o.-Runde erreicht. */}
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginTop: 8 }}>
                    {[["abSpieltag", "offen ab Spieltag"], ["bisSpieltag", "bis Spieltag"]].map(([feld, label]) => (
                      <label key={feld} style={{ flex: 1, fontSize: 10.5, color: C.muted }}>
                        {label}
                        <input type="number" inputMode="numeric" placeholder="—"
                          min={SAISON_LIMITS.spieltag.min} max={SAISON_LIMITS.spieltag.max}
                          value={w[feld] ?? ""}
                          disabled={feld === "bisSpieltag" && w.abSpieltag == null}
                          onChange={(e) => feldSetzen(id, feld, e.target.value === "" ? null : Number(e.target.value))}
                          style={{
                            display: "block", width: "100%", boxSizing: "border-box", marginTop: 2,
                            background: C.ink2, color: C.text, border: `1px solid ${C.line}`,
                            borderRadius: 9, padding: "6px 8px", fontSize: 12, fontFamily: MONO, outline: "none",
                            opacity: feld === "bisSpieltag" && w.abSpieltag == null ? 0.45 : 1,
                          }} />
                      </label>
                    ))}
                  </div>
                  <p style={{ fontSize: 10, color: C.muted, marginTop: 5, lineHeight: 1.4 }}>
                    {w.abSpieltag == null
                      ? "Leer = von Anfang an abgebbar."
                      : `Abgabe nur zwischen Spieltag ${w.abSpieltag} und ${w.bisSpieltag ?? w.abSpieltag}. Die Frist ist wichtig: wer später tippt, weiß mehr.`}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Hinzufügen */}
          {!voll && (
            <>
              <Label>Wette hinzufügen</Label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {WETT_TYPEN.map((typ) => {
                  const auswertbar = istAuswertbar(typ.key);
                  const schonDrin = belegt.has(typ.key);
                  const kannAusser = typ.parameter.includes("ausser") && teams.length > 0;
                  return (
                    <div key={typ.key} style={{
                      background: C.ink2, border: `1px solid ${C.line}`, borderRadius: 12,
                      padding: "9px 11px", opacity: auswertbar ? 1 : 0.5,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 700 }}>{typ.label}</span>
                          {!auswertbar && (
                            <span title="Diese Statistik liefern unsere Ergebnisse noch nicht" style={{
                              fontFamily: MONO, fontSize: 9, color: C.muted, marginLeft: 6,
                              border: `1px solid ${C.line}`, borderRadius: 999, padding: "1px 6px",
                            }}>noch keine Daten</span>
                          )}
                          <span style={{ display: "block", fontSize: 10.5, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>
                            {typ.hint}
                          </span>
                        </span>
                        {auswertbar && (
                          <button disabled={schonDrin} onClick={() => hinzufuegen(typ)} style={{
                            cursor: schonDrin ? "default" : "pointer", fontFamily: MONO, fontSize: 11,
                            background: schonDrin ? "transparent" : C.surface2,
                            color: schonDrin ? C.muted : C.text,
                            border: `1px solid ${C.line}`, borderRadius: 999, padding: "4px 10px",
                          }}>{schonDrin ? "drin" : "+"}</button>
                        )}
                      </div>

                      {/* Variante mit Ausschluss — macht aus einem Typ viele Wetten */}
                      {auswertbar && kannAusser && (
                        <div style={{ marginTop: 7 }}>
                          <button onClick={() => setOffen(offen === typ.key ? null : typ.key)} style={{
                            cursor: "pointer", fontFamily: MONO, fontSize: 10.5, color: C.sky,
                            background: "transparent", border: `1px dashed ${C.sky}55`,
                            borderRadius: 999, padding: "3px 9px",
                          }}>
                            {offen === typ.key ? "▾" : "▸"} … außer einem Verein
                          </button>
                          {offen === typ.key && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 7 }}>
                              {teams.map((t) => (
                                <button key={t} onClick={() => hinzufuegen(typ, [t])} style={{
                                  cursor: "pointer", fontSize: 11, fontFamily: "inherit",
                                  background: C.surface, color: C.text, border: `1px solid ${C.line}`,
                                  borderRadius: 999, padding: "4px 9px",
                                }}>ohne {t}</button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Label({ children }) {
  return (
    <div style={{ fontSize: 11.5, color: C.muted, textTransform: "uppercase", letterSpacing: 1, margin: "16px 0 7px" }}>
      {children}
    </div>
  );
}

function Toggle({ an, onChange }) {
  return (
    <button onClick={() => onChange(!an)} style={{
      display: "flex", alignItems: "center", gap: 10, cursor: "pointer", width: "100%",
      textAlign: "left", background: an ? `${C.gold}14` : C.surface,
      border: `1px solid ${an ? C.gold + "55" : C.line}`, borderRadius: 12,
      padding: "10px 12px", color: C.text, fontFamily: "inherit",
    }}>
      <span style={{
        width: 38, height: 22, borderRadius: 999, flex: "0 0 auto",
        background: an ? C.gold : C.surface2, border: `1px solid ${an ? C.gold : C.line}`,
        display: "flex", alignItems: "center", padding: 2, justifyContent: an ? "flex-end" : "flex-start",
      }}>
        <span style={{ width: 16, height: 16, borderRadius: 999, background: an ? C.ink : C.muted }} />
      </span>
      <span style={{ fontSize: 13.5, fontWeight: 700 }}>Saison-Wetten anbieten</span>
    </button>
  );
}
