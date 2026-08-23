"use client";

import { useState } from "react";
import { DEFAULT_RULES, RULE_LIMITS } from "@/lib/engine";
import { STAERKE_STUFEN, BETRIFFT, beschreibeBetrifft } from "@/lib/catchup";
import { KURVEN, KURVE, SAISONFORM_LIMITS, beschreibeSaisonform } from "@/lib/saisonform";
import { VERSAEUMNIS_STRATEGIEN, VERSAEUMNIS_LABEL, VERSAEUMNIS_HINT } from "@/lib/autoTip";
import { C, RUND } from "@/lib/theme";
import { TAPZIEL } from "@/lib/tapziel";
import { Slider, Toggle, Field, GrosseZeile } from "@/components/Eingaben";

// ============================================================
//  VERLAUFS-SONDERMENÜ — was über die SAISON greift, nicht über ein Spiel
//  (viertes Sondermenü · Andi EB2/EB4)
//
//  🔴 Die drei hier gehören zusammen, weil sie dieselbe Frage beantworten:
//  **wie viel darf ein einzelner Spieltag über die Saison entscheiden?**
//  Anschluss-Bonus, Streicher und Ersatz-Tipp greifen alle NICHT in die
//  Wertung eines Spiels ein, sondern in den Stand — Ebene 4 im Vokabular.
//  Genau deshalb sieht man ihre Wechselwirkung nur, wenn sie beieinander
//  stehen: die Streicher werfen die SCHWÄCHSTEN Wertungen weg — und das sind
//  die Ersatz-Tipps, die die Versäumnis-Regel gerade vergeben hat. Ohne
//  „Keine Ersatz-Tipps streichen" heben sich die beiden gegenseitig auf.
//
//  ⚠️ Reihenfolge ist Absicht: erst wer zurückliegt (Anschluss), dann was
//  wegfallen darf (Streicher), dann was passiert, wenn jemand gar nicht
//  tippt (Ersatz-Tipp). Von der mildesten zur eingreifendsten Regel.
// ============================================================

export function verlaufStand(rules) {
  const au = rules?.aufholen || DEFAULT_RULES.aufholen;
  const sf = rules?.saisonform || DEFAULT_RULES.saisonform;
  const ve = rules?.versaeumnis || DEFAULT_RULES.versaeumnis;
  const teile = [
    au.enabled ? "Anschluss" : null,
    sf.streich > 0 ? `${sf.streich} Spiel${sf.streich === 1 ? "" : "e"} gestrichen` : null,
    sf.kurve && sf.kurve !== "flach" ? KURVE[sf.kurve]?.label ?? sf.kurve : null,
    ve.enabled ? "Ersatz-Tipp" : null,
  ].filter(Boolean);
  return teile.length ? teile.join(" · ") : "aus";
}

export default function VerlaufSondermenue({ rules, onChange }) {
  const [zeile, setZeile] = useState(null);
  const auf = (k) => setZeile((o) => (o === k ? null : k));

  const au = rules.aufholen || DEFAULT_RULES.aufholen;
  const sf = rules.saisonform || DEFAULT_RULES.saisonform;
  const ve = rules.versaeumnis || DEFAULT_RULES.versaeumnis;

  const setzeAufholen = (p) => onChange({ aufholen: { ...au, ...p } });
  const setzeSaisonform = (p) => onChange({ saisonform: { ...sf, ...p } });
  const setzeVersaeumnis = (p) => onChange({ versaeumnis: { ...ve, ...p } });

  // Welche Voreinstellung passt zur aktuellen Stärke/Schwelle?
  const auStufe = STAERKE_STUFEN.find((s) => s.staerke === au.staerke && s.schwelle === au.schwelle)?.key ?? "custom";

  return (
    <div>
      {/* ── Anschluss halten ── */}
      <GrosseZeile icon="🪝" titel="Anschluss halten" unter="Bonus für Zurückliegende"
        wert={au.enabled ? (STAERKE_STUFEN.find((s) => s.key === auStufe)?.label ?? "eigen") : "aus"}
        offen={zeile === "aufholen"} onClick={() => auf("aufholen")}>
        <p style={{ fontSize: 12, color: C.muted, marginTop: 4, marginBottom: 10, lineHeight: 1.4 }}>
          Damit Zurückliegende dranbleiben: Wer abgehängt ist, bekommt je Spieltag
          einen Teil des Rückstands gutgeschrieben. <strong>Aufholen heißt nicht
          Überholen</strong> — der Führende bleibt vorn.
        </p>
        <Toggle label="Anschluss-Bonus geben" on={au.enabled}
          onChange={(on) => setzeAufholen({ enabled: on })} />

        {au.enabled && (
          <div style={{ paddingLeft: 12, borderLeft: `1px solid ${C.line}`, marginBottom: 8 }}>
            <Field label="Stärke">
              <div style={{ display: "flex", gap: 6 }}>
                {STAERKE_STUFEN.map((s) => {
                  const on = auStufe === s.key;
                  return (
                    <button key={s.key} onClick={() => setzeAufholen({ staerke: s.staerke, schwelle: s.schwelle })} style={{
                      cursor: "pointer", fontSize: 12, fontFamily: "inherit", padding: "8px 12px",
                      borderRadius: RUND.karte, flex: 1, textAlign: "left",
                      background: on ? `${C.akzent}22` : C.surface, color: on ? C.akzent : C.muted,
                      border: `1px solid ${on ? C.akzent + "66" : C.line}`,
                    }}>
                      <div style={{ fontWeight: 700 }}>{s.label}</div>
                      <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2, lineHeight: 1.3 }}>{s.hint}</div>
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="Wen betrifft es?">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {Object.values(BETRIFFT).map((b) => {
                  const on = au.betrifft === b.key;
                  return (
                    <button key={b.key} onClick={() => setzeAufholen({ betrifft: b.key })}
                      title={b.desc} style={{
                        ...TAPZIEL, cursor: "pointer", fontSize: 12, fontFamily: "inherit", padding: "7px 11px", borderRadius: RUND.pille,
                        background: on ? `${C.mint}22` : C.surface, color: on ? C.mint : C.muted,
                        border: `1px solid ${on ? C.mint + "66" : C.line}`,
                      }}>{b.label}</button>
                  );
                })}
              </div>
            </Field>
            {/* 🔴 `beschreibeBetrifft` statt `.desc`: bei den beiden
                parametrierten Stufen („die letzten n", „wer mehr als x %
                abfällt") sagt die statische Beschreibung nur, WAS für eine Art
                Auswahl es ist — nie die eingestellte ZAHL. Der Admin drehte an
                einem Regler und las daneben denselben Satz. */}
            <p style={{ fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>
              {beschreibeBetrifft(au.betrifft, au.betrifftWert)}
              {" "}Die Live-Vorschau unten zeigt, ob der Bonus zu stark wird.
            </p>
          </div>
        )}
      </GrosseZeile>

      {/* ── Streicher & Saisonverlauf ── */}
      <GrosseZeile icon="📆" titel="Streicher &amp; Saisonverlauf" unter="was ein einzelnes Spiel wiegt"
        wert={sf.streich > 0 || sf.kurve !== "flach"
          ? [sf.streich > 0 ? `${sf.streich} Streicher` : null, sf.kurve !== "flach" ? KURVE[sf.kurve]?.label : null].filter(Boolean).join(" · ")
          : "gleichmäßig"}
        offen={zeile === "saisonform"} onClick={() => auf("saisonform")}>
        <p style={{ fontSize: 12, color: C.muted, marginTop: 4, marginBottom: 10, lineHeight: 1.4 }}>
          Wie stark darf ein einzelner Spieltag die Saison bestimmen? Beides greift
          auf die fertigen Spieltagspunkte — die Wertung eines Spiels bleibt unberührt.
        </p>

        <Field label="Streichresultate — die schwächsten EINZELSPIELE zählen nicht">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {[0, 1, 2, 3, 5].map((n) => {
              const on = sf.streich === n;
              return (
                <button key={n} onClick={() => setzeSaisonform({ streich: n })} style={{
                  ...TAPZIEL, cursor: "pointer", fontSize: 12, fontFamily: "inherit", padding: "7px 11px", borderRadius: RUND.pille,
                  background: on ? `${C.mint}22` : C.surface, color: on ? C.mint : C.muted,
                  border: `1px solid ${on ? C.mint + "66" : C.line}`,
                }}>{n === 0 ? "keine" : `${n} Spiel${n === 1 ? "" : "e"}`}</button>
              );
            })}
          </div>
        </Field>
        <p style={{ fontSize: 11, color: C.muted, marginTop: 2, marginBottom: 10, lineHeight: 1.4 }}>
          Die schwächsten <strong>Einzelspiele</strong> zählen nicht — verzeiht einen
          Fehlgriff. Ein ganzer Spieltag fällt dabei nie weg: von einem Spieltag mit
          mehreren Spielen bleibt immer eines stehen. <strong>Gemessen der einzige
          milde Ausgleich hier</strong>: senkt den Vorsprung des Ersten leicht, ohne
          das Können zu entwerten.
        </p>

        {sf.streich > 0 && (
          <div style={{ paddingLeft: 12, borderLeft: `1px solid ${C.line}`, marginBottom: 10 }}>
            <Toggle label="Keine Ersatz-Tipps streichen"
              on={sf.nurGetippte}
              onChange={(on) => setzeSaisonform({ nurGetippte: on })} />
            <p style={{ fontSize: 11, color: sf.nurGetippte ? C.muted : C.coral, marginTop: 2, lineHeight: 1.4 }}>
              {sf.nurGetippte
                ? "Ein Ersatz-Tipp aus der Versäumnis-Regel bleibt stehen. Ein gar nicht getippter Spieltag hat ohnehin keine Spiele, die gestrichen werden könnten."
                : "⚠️ Aus: auch Ersatz-Tipps sind Streichkandidaten — und weil sie die schwächsten Wertungen tragen, fliegen genau sie zuerst raus. Vergessen kostet dann fast nichts mehr."}
            </p>
          </div>
        )}

        <Field label="Gewichtung über die Saison">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {KURVEN.map((k) => {
              const on = sf.kurve === k.key;
              return (
                <button key={k.key} onClick={() => setzeSaisonform({ kurve: k.key })}
                  title={k.text} style={{
                    ...TAPZIEL, cursor: "pointer", fontSize: 12, fontFamily: "inherit", padding: "7px 11px", borderRadius: RUND.pille,
                    background: on ? `${C.akzent}22` : C.surface, color: on ? C.akzent : C.muted,
                    border: `1px solid ${on ? C.akzent + "66" : C.line}`,
                  }}>{k.label}</button>
              );
            })}
          </div>
        </Field>
        <p style={{ fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>
          {KURVE[sf.kurve]?.text}
        </p>

        {/* ⚠️ Diese Warnung ist der Grund, warum der Regler überhaupt so
            beschrieben ist. Gemessen (400 Läufe): „Endspurt" senkt den
            Vorsprung des Ersten NICHT, sondern vergrößert ihn — weil Gewicht
            auf einen Teil der Saison die wirksame Stichprobe verkleinert.
            Ohne diesen Hinweis stellt ein Admin das ein, um auszugleichen,
            und bekommt das Gegenteil. */}
        {sf.kurve !== "flach" && (
          <div style={{
            marginTop: 8, marginBottom: 8, padding: "9px 11px", borderRadius: RUND.karte,
            background: `${C.coral}14`, border: `1px solid ${C.coral}44`,
          }}>
            <div style={{ fontSize: 12, color: C.coral, fontWeight: 700, marginBottom: 3 }}>
              Kein Ausgleich — ein Spannungsregler
            </div>
            <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.45 }}>
              Nachgemessen: eine ungleiche Gewichtung <strong>vergrößert</strong> den
              Vorsprung des Ersten und macht die Saison zufälliger, weil weniger
              Spieltage wirklich zählen. Für ein spannendes Saisonende gut — zum
              Ausgleichen nicht. Dafür sind die Streicher da.
            </div>
            <div style={{ marginTop: 8 }}>
              <Slider label="Wie ausgeprägt?" value={sf.staerke}
                min={SAISONFORM_LIMITS.staerke.min} max={SAISONFORM_LIMITS.staerke.max}
                step={SAISONFORM_LIMITS.staerke.step}
                fmt={(v) => `×${v.toFixed(1)}`}
                onChange={(v) => setzeSaisonform({ staerke: v })} />
            </div>
          </div>
        )}

        {/* Die Zusammenfassung nur zeigen, wenn sie mehr sagt als die
            Kurvenzeile darüber. Im Standardzustand stünde sonst zweimal
            „Jeder Spieltag zählt gleich viel." untereinander. */}
        {(sf.kurve !== "flach" || sf.streich > 0) && (
          <p style={{
            fontSize: 12, color: C.text, marginTop: 4, marginBottom: 12, lineHeight: 1.45,
            padding: "8px 10px", borderRadius: RUND.karte, background: C.surface, border: `1px solid ${C.line}`,
          }}>
            {beschreibeSaisonform(sf, 34)}
          </p>
        )}
      </GrosseZeile>

      {/* ── Spieltag vergessen ── */}
      <GrosseZeile icon="💤" titel="Spieltag vergessen" unter="Ersatz-Tipp statt null Punkte"
        wert={ve.enabled ? `−${ve.malusProzent} %` : "aus"}
        offen={zeile === "versaeumnis"} onClick={() => auf("versaeumnis")}>
        <p style={{ fontSize: 12, color: C.muted, marginTop: 4, marginBottom: 10, lineHeight: 1.4 }}>
          Wer mal keine Zeit hatte, steht sonst mit null Punkten da und steigt aus.
          Mit Kulanz bekommt er einen Ersatz-Tipp — <strong>immer schlechter als
          selbst tippen</strong>, aber besser als nichts.
        </p>
        <Toggle label="Ersatz-Tipp bei Versäumnis" on={ve.enabled}
          onChange={(on) => setzeVersaeumnis({ enabled: on })} />

        {ve.enabled && (
          <div style={{ paddingLeft: 12, borderLeft: `1px solid ${C.line}`, marginBottom: 8 }}>
            <Field label="Woher kommt der Ersatz-Tipp?">
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {VERSAEUMNIS_STRATEGIEN.map((s) => {
                  const on = ve.strategie === s;
                  return (
                    <button key={s} onClick={() => setzeVersaeumnis({ strategie: s })} style={{
                      cursor: "pointer", fontSize: 12, fontFamily: "inherit", padding: "8px 12px",
                      borderRadius: RUND.karte, textAlign: "left",
                      background: on ? `${C.akzent}22` : C.surface, color: on ? C.akzent : C.muted,
                      border: `1px solid ${on ? C.akzent + "66" : C.line}`,
                    }}>
                      <div style={{ fontWeight: 700 }}>{VERSAEUMNIS_LABEL[s]}</div>
                      <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2, lineHeight: 1.3 }}>{VERSAEUMNIS_HINT[s]}</div>
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label={`Abzug auf den Ersatz-Tipp: ${ve.malusProzent} %`}>
              <input type="range"
                min={RULE_LIMITS.versaeumnis.malusProzent.min}
                max={RULE_LIMITS.versaeumnis.malusProzent.max}
                step={RULE_LIMITS.versaeumnis.malusProzent.step}
                value={ve.malusProzent}
                onChange={(e) => setzeVersaeumnis({ malusProzent: Number(e.target.value) })}
                style={{ width: "100%", accentColor: C.akzent }} />
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4, lineHeight: 1.4 }}>
                {ve.malusProzent === 0 && "Volle Wertung — sehr gnädig, macht Vergessen folgenlos."}
                {ve.malusProzent > 0 && ve.malusProzent < 100 && `Der Ersatz-Tipp zählt nur zu ${100 - ve.malusProzent} %.`}
                {ve.malusProzent === 100 && "Wertlos — wie gar nicht getippt (nur fürs Gefühl dabei)."}
              </div>
            </Field>

            <Field label={ve.maxProSaison === 0 ? "Unbegrenzt oft" : `Höchstens ${ve.maxProSaison}× pro Saison`}>
              <input type="range"
                min={RULE_LIMITS.versaeumnis.maxProSaison.min}
                max={RULE_LIMITS.versaeumnis.maxProSaison.max}
                step={RULE_LIMITS.versaeumnis.maxProSaison.step}
                value={ve.maxProSaison}
                onChange={(e) => setzeVersaeumnis({ maxProSaison: Number(e.target.value) })}
                style={{ width: "100%", accentColor: C.akzent }} />
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4, lineHeight: 1.4 }}>
                {ve.maxProSaison === 0
                  ? "Die Kulanz greift immer — auch bei Dauer-Aussetzern."
                  : "Danach zählt ein vergessener Spieltag wieder null. Verhindert dauerhaftes Aussetzen."}
              </div>
            </Field>
          </div>
        )}
      </GrosseZeile>

      {/* 🔴 Die Wechselwirkung, die man nur sieht, wenn beide beieinander
          stehen — und der eigentliche Grund für dieses Sondermenü. */}
      {sf.streich > 0 && !sf.nurGetippte && ve.enabled && (
        <div style={{
          marginTop: 8, padding: "10px 12px", borderRadius: RUND.karte,
          background: `${C.coral}14`, border: `1px solid ${C.coral}44`,
          fontSize: 12, color: C.muted, lineHeight: 1.5,
        }}>
          <strong style={{ color: C.coral }}>Diese beiden arbeiten gegeneinander:</strong> die
          Streicher werfen zuerst die schwächsten Wertungen weg — und das sind die
          Ersatz-Tipps, die die Versäumnis-Regel gerade vergeben hat. Wer beides will,
          schaltet oben <strong>„Keine Ersatz-Tipps streichen"</strong> ein.
        </div>
      )}
    </div>
  );
}
