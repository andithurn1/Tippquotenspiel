"use client";

// ============================================================
//  ALLEINSTELLUNG — Profi-Ansicht (Stufe 3)
//
//  Andis Stadt-Land-Fluss-Bonus (09.08.2026). Der Baukasten-Grundsatz gilt
//  hier vollständig: **jede** Variable ist einzeln einstellbar, jede hat
//  Regler UND Zahlenfeld, wo ein Regler etwas fühlbar macht — und über allem
//  steht eine Live-Vorschau, die den eingestellten Wert in Punkte übersetzt.
//  „Anteil 1" sagt niemandem etwas, „aus 300 werden 600" schon.
//
//  Die Rechnung selbst steht in `alleinstellung.js`, nicht hier. Dieser Screen
//  stellt ein und zeigt an; was daraus folgt, beantwortet die Engine.
// ============================================================

import { C, MONO, RUND } from "@/lib/theme";
import { TAPZIEL } from "@/lib/tapziel";
import {
  DEFAULT_ALLEINSTELLUNG, ALLEIN_LIMITS, ALLEIN_MODI, ALLEIN_ARTEN, EBENEN,
  sanitizeAlleinstellung, beschreibeAlleinstellung,
} from "@/lib/alleinstellung";

export default function Alleinstellung({ rules, onChange }) {
  const a = sanitizeAlleinstellung(rules?.alleinstellung ?? DEFAULT_ALLEINSTELLUNG);
  const setze = (teil) => onChange({ alleinstellung: { ...a, ...teil } });
  const L = ALLEIN_LIMITS;

  return (
    <div>
      <Schalter an={a.enabled} onChange={(v) => setze({ enabled: v })}
        titel="Bonus für den Alleingang"
        unter="Extra Punkte, wenn sonst (fast) niemand richtig lag" />

      {a.enabled && (
        <div style={{ marginTop: 10 }}>
          {/* Die Betreuung zuerst: was bedeutet das Eingestellte konkret? */}
          <div style={{
            background: `${C.akzent}10`, border: `1px solid ${C.akzent}33`,
            borderRadius: RUND.karte, padding: "10px 12px", fontSize: "0.75rem",
            color: C.text, lineHeight: 1.5, marginBottom: 12,
          }}>
            {beschreibeAlleinstellung({ alleinstellung: a })}
          </div>

          <Feld titel="Was zählt als richtig?"
            hint="Je feiner die Ebene, desto seltener der Bonus — und desto größer das Erlebnis.">
            <Reihe optionen={EBENEN} wert={a.ebene} onWaehlen={(k) => setze({ ebene: k })} />
          </Feld>

          <Feld titel="Wann gilt man als allein?"
            hint="„Anteil“ wächst mit der Rundengröße mit, eine feste Zahl nicht.">
            <Reihe optionen={ALLEIN_MODI} wert={a.modus} onWaehlen={(k) => setze({ modus: k })} />
          </Feld>

          {a.modus === "wenige" && (
            <Regler label="Höchstens so viele Treffer" wert={a.maxTipper} limits={L.maxTipper}
              fmt={(v) => `${v} Tipper`} onChange={(v) => setze({ maxTipper: v })} />
          )}
          {a.modus === "anteil" && (
            <Regler label="Höchstens dieser Anteil der Tipper" wert={a.maxAnteil} limits={L.maxAnteil}
              fmt={(v) => `${Math.round(v * 100)} %`} onChange={(v) => setze({ maxAnteil: v })} />
          )}

          <Feld titel="Wie wird belohnt?"
            hint="Ein Anteil passt sich der Quote an, feste Punkte sind bei jedem Spiel gleich.">
            <Reihe optionen={ALLEIN_ARTEN} wert={a.art} onWaehlen={(k) => setze({ art: k })} />
          </Feld>

          {a.art === "anteil" ? (
            <Regler label="Zuschlag auf die Punkte dieses Spiels" wert={a.anteil} limits={L.anteil}
              fmt={(v) => `+${Math.round(v * 100)} %`} onChange={(v) => setze({ anteil: v })} />
          ) : (
            <Regler label="Feste Zusatzpunkte" wert={a.punkte} limits={L.punkte}
              fmt={(v) => `+${v}`} onChange={(v) => setze({ punkte: v })} />
          )}

          {/* 🔴 Der eigene Deckel. Er ist keine Feinheit, sondern der Grund,
              warum diese Ebene den additiven Modifikator-Deckel nicht
              aushebelt — Begründung im Kopf von `alleinstellung.js`. */}
          <Regler label="Höchstens je Spiel" wert={a.maxZuschlag} limits={L.maxZuschlag}
            fmt={(v) => `${v} Punkte`} onChange={(v) => setze({ maxZuschlag: v })}
            hint="Eigener Deckel dieser Ebene — sie liegt außerhalb des Modifikator-Topfs und braucht ihre eigene Grenze." />

          <Regler label="Erst ab so vielen Tippern je Spiel" wert={a.minTipper} limits={L.minTipper}
            fmt={(v) => `${v} Tipper`} onChange={(v) => setze({ minTipper: v })}
            hint="Zu zweit ist man immer allein — ohne diese Schranke wäre der Bonus die Normalzahlung." />

          <Regler label="Höchstens pro Saison und Spieler" wert={a.maxProSaison} limits={L.maxProSaison}
            fmt={(v) => (v === 0 ? "unbegrenzt" : `${v}×`)} onChange={(v) => setze({ maxProSaison: v })}
            hint="0 = unbegrenzt. Gedeckelt wird chronologisch, wie bei den Ereignissen." />

          <Schalter an={a.ersatzZaehlt} onChange={(v) => setze({ ersatzZaehlt: v })}
            titel="Ersatz-Tipps zählen mit"
            unter="Sonst entscheidet die Kulanz der Runde über den Bonus eines anderen" />
        </div>
      )}
    </div>
  );
}

function Feld({ titel, hint, children }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: "0.8125rem", fontWeight: 700, marginBottom: 2 }}>{titel}</div>
      {hint && <div style={{ fontSize: "0.6875rem", color: C.muted, marginBottom: 7, lineHeight: 1.4 }}>{hint}</div>}
      {children}
    </div>
  );
}

function Reihe({ optionen, wert, onWaehlen }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {optionen.map((o) => {
        const an = o.key === wert;
        return (
          <button key={o.key} onClick={() => onWaehlen(o.key)} title={o.desc} style={{
            ...TAPZIEL, flex: "1 1 120px", cursor: "pointer", fontFamily: "inherit",
            textAlign: "left", padding: "8px 10px", borderRadius: RUND.karte,
            background: an ? `${C.mint}18` : C.surface, color: C.text,
            border: `1px solid ${an ? C.mint + "66" : C.line}`,
          }}>
            <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: an ? C.mint : C.text }}>{o.label}</div>
            <div style={{ fontSize: "0.6875rem", color: C.muted, marginTop: 1, lineHeight: 1.35 }}>{o.desc}</div>
          </button>
        );
      })}
    </div>
  );
}

// Regler UND Zahlenfeld nebeneinander — Baukasten-Grundsatz 1: „Der Regler ist
// zum Fühlen, das Feld zum Treffen."
function Regler({ label, wert, limits, fmt, onChange, hint }) {
  const { min, max, step } = limits;
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ fontSize: "0.8125rem" }}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: "0.8125rem", color: C.akzent }}>{fmt ? fmt(wert) : wert}</span>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input type="range" min={min} max={max} step={step} value={wert}
          onChange={(e) => onChange(+e.target.value)}
          style={{ flex: 1, minWidth: 0, accentColor: C.akzent, cursor: "pointer" }} />
        <input type="number" min={min} max={max} step={step} value={wert}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
          }}
          style={{
            width: 78, minHeight: 44, boxSizing: "border-box", flexShrink: 0,
            background: C.surface, color: C.text, border: `1px solid ${C.line}`,
            borderRadius: RUND.karte, padding: "8px 10px", fontSize: "0.8125rem", fontFamily: MONO, outline: "none",
          }} />
      </div>
      {hint && <div style={{ fontSize: "0.6875rem", color: C.muted, marginTop: 4, lineHeight: 1.4 }}>{hint}</div>}
    </div>
  );
}

function Schalter({ an, titel, unter, onChange }) {
  return (
    <button onClick={() => onChange(!an)} style={{
      ...TAPZIEL, display: "flex", alignItems: "center", gap: 10, width: "100%",
      textAlign: "left", cursor: "pointer", fontFamily: "inherit", padding: "9px 12px",
      borderRadius: RUND.karte, marginTop: 10,
      background: an ? `${C.mint}14` : C.surface, color: C.text,
      border: `1px solid ${an ? C.mint + "55" : C.line}`,
    }}>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700 }}>{titel}</span>
        <span style={{ display: "block", fontSize: "0.6875rem", color: C.muted, marginTop: 1, lineHeight: 1.4 }}>{unter}</span>
      </span>
      <span style={{
        flexShrink: 0, width: 34, height: 20, borderRadius: RUND.pille,
        background: an ? C.mint : C.surface2, position: "relative",
      }}>
        <span style={{
          position: "absolute", top: 2, left: an ? 16 : 2, width: 16, height: 16,
          borderRadius: RUND.pille, background: "#fff", transition: "left .15s",
        }} />
      </span>
    </button>
  );
}
