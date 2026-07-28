"use client";

import { useState, useEffect, useMemo } from "react";
import { getStore } from "@/lib/store";
import {
  zeitachse, sanitizeZeitachse, achsenLabel, warnungen, ankerWettbewerb,
  ZEITACHSE_LIMITS, DEFAULT_ZEITACHSE, PAUSEN_MODI,
} from "@/lib/zeitachse";
import { wettbewerbeIn, wettbewerbLabel } from "@/lib/wettbewerbe";
import { C, MONO } from "@/lib/theme";

// ── Zeitachse einstellen ────────────────────────────────────
// Die Frage, die dieser Block beantwortet: was ist „Spieltag 5" in einer Runde
// über vier Ligen, die alle versetzt starten? Ohne Antwort laufen vier
// Zählungen nebeneinander her und der Spieler weiß nie, wo er steht.
//
// Wichtiger als jeder Regler ist hier die VORSCHAU: der Admin muss VOR dem
// Anlegen sehen, wie seine Saison zerfällt. Eine Zeitachse, die man erst im
// Dezember als unpassend erkennt, lässt sich nicht mehr ändern — der Spielplan
// steht dann.
export default function Zeitachse({ zeitachse: cfg, onChange }) {
  const [matches, setMatches] = useState(null);
  const z = sanitizeZeitachse(cfg ?? DEFAULT_ZEITACHSE);

  useEffect(() => {
    let live = true;
    getStore().listMatches()
      .then((ms) => { if (live) setMatches(ms); })
      .catch(() => { if (live) setMatches([]); });
    return () => { live = false; };
  }, []);

  const alle = matches ?? [];
  const wettbewerbe = useMemo(() => wettbewerbeIn(alle), [alle]);
  const achse = useMemo(
    () => zeitachse(alle, z),
    [alle, z.modus, z.anker, z.buendeln, z.tage, z.pause, z.pauseAbTagen],
  );
  const hinweise = useMemo(() => warnungen(achse, z), [achse, z.modus]);
  const automatisch = useMemo(() => ankerWettbewerb(alle, null), [alle]);

  // Bei nur einem Wettbewerb ist die ganze Frage gegenstandslos — dann ist der
  // Liga-Spieltag der Runden-Spieltag. Den Block gar nicht erst zeigen.
  if (wettbewerbe.filter((w) => w.key !== "demo").length < 2) return null;

  const patch = (p) => onChange?.({ ...z, ...p });

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>Spieltage der Runde</div>
      <p style={{ fontSize: 11, color: C.muted, margin: "0 0 8px", lineHeight: 1.45 }}>
        Eure Ligen starten versetzt und zählen jede für sich. Hier legst du fest,
        was ein Spieltag EURER Runde umfasst — daran hängen Joker, Zwischenstand
        und Erinnerungen.
      </p>

      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        {[
          { key: "anker", label: "Taktgeber", hint: "Eine Liga gibt den Rhythmus vor, die anderen ordnen sich ein." },
          { key: "woche", label: "Feste Wochen", hint: "Strikt nach Zeitfenster — unabhängig von jeder Liga." },
        ].map((m) => {
          const an = z.modus === m.key;
          return (
            <button key={m.key} title={m.hint} onClick={() => patch({ modus: m.key })} style={{
              flex: 1, cursor: "pointer", fontFamily: "inherit", padding: "8px 6px",
              borderRadius: 11, fontSize: 12, fontWeight: 700,
              background: an ? `${C.sky}22` : C.surface, color: an ? C.sky : C.muted,
              border: `1px solid ${an ? C.sky + "66" : C.line}`,
            }}>{m.label}</button>
          );
        })}
      </div>

      {z.modus === "anker" ? (
        <>
          <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 5 }}>Taktgeber</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {[{ key: null, label: `Automatisch (${wettbewerbLabel(automatisch)})` },
              ...wettbewerbe.filter((w) => w.key !== "demo").map((w) => ({ key: w.key, label: w.label }))
            ].map((opt) => {
              const an = z.anker === opt.key;
              return (
                <button key={opt.key ?? "auto"} onClick={() => patch({ anker: opt.key })} style={{
                  cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, padding: "5px 10px",
                  borderRadius: 999, background: an ? `${C.mint}22` : C.surface,
                  color: an ? C.mint : C.muted, border: `1px solid ${an ? C.mint + "66" : C.line}`,
                }}>{opt.label}</button>
              );
            })}
          </div>
          <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 8, lineHeight: 1.45 }}>
            Ohne Vorgabe nimmt die Runde die Liga, die zuerst anfängt. Spiele, die
            noch davor liegen, fallen in Spieltag 1 — sie gehen nie verloren.
          </div>
          <Regler label="Zusammenfassen" wert={z.buendeln} limits={ZEITACHSE_LIMITS.buendeln}
            einheit={z.buendeln === 1 ? "Spieltag des Taktgebers = 1 Runden-Spieltag" : "Spieltage des Taktgebers = 1 Runden-Spieltag"}
            onChange={(v) => patch({ buendeln: v })} />

          {/* Winterpause & Länderspielpause: der Taktgeber setzt aus, die
              anderen Ligen spielen weiter. Ohne Antwort würde EIN Spieltag über
              die ganze Pause laufen — und ein Joker darin wäre etwas völlig
              anderes wert als in einer normalen Woche. */}
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 10, marginBottom: 5 }}>
            Wenn der Taktgeber pausiert
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {PAUSEN_MODI.map((m) => {
              const an = z.pause === m.key;
              return (
                <button key={m.key} title={m.hint} onClick={() => patch({ pause: m.key })} style={{
                  flex: 1, cursor: "pointer", fontFamily: "inherit", padding: "7px 6px",
                  borderRadius: 11, fontSize: 11.5, fontWeight: 700,
                  background: an ? `${C.mint}22` : C.surface, color: an ? C.mint : C.muted,
                  border: `1px solid ${an ? C.mint + "66" : C.line}`,
                }}>{m.label}</button>
              );
            })}
          </div>
          <div style={{ fontSize: 10.5, color: C.muted, marginTop: 5, lineHeight: 1.45 }}>
            {PAUSEN_MODI.find((m) => m.key === z.pause)?.hint}
          </div>
        </>
      ) : (
        <Regler label="Fensterlänge" wert={z.tage} limits={ZEITACHSE_LIMITS.tage}
          einheit="Tage je Runden-Spieltag" onChange={(v) => patch({ tage: v })} />
      )}

      {/* Die Vorschau ist der eigentliche Wert dieses Blocks. */}
      <div style={{
        marginTop: 10, background: C.surface, border: `1px solid ${C.line}`,
        borderRadius: 12, padding: "10px 12px",
      }}>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>
          {matches == null ? "Vorschau lädt …" : `${achse.length} Spieltage — so beginnt eure Saison:`}
        </div>
        {achse.slice(0, 4).map((e) => (
          <div key={e.nummer} style={{ display: "flex", gap: 8, fontSize: 11.5, padding: "2px 0" }}>
            <span style={{ fontFamily: MONO, color: C.sky, minWidth: 22 }}>{e.nummer}</span>
            <span style={{ flex: 1, color: C.text }}>{achsenLabel(e).replace(/^Spieltag \d+ · /, "")}</span>
            <span style={{ fontFamily: MONO, color: C.muted }}>{e.spiele.length}</span>
          </div>
        ))}
        {achse.length > 4 && (
          <div style={{ fontSize: 10.5, color: C.muted, marginTop: 4 }}>… und {achse.length - 4} weitere</div>
        )}
      </div>

      {hinweise.map((h) => (
        <div key={h.art} style={{
          marginTop: 8, background: `${C.gold}0E`, border: `1px solid ${C.gold}33`,
          borderRadius: 10, padding: "8px 10px", fontSize: 11, color: C.text, lineHeight: 1.45,
        }}>
          {h.text}
          <div style={{ color: C.muted, marginTop: 3 }}>{h.hilfe}</div>
        </div>
      ))}
    </div>
  );
}

function Regler({ label, wert, limits, einheit, onChange }) {
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: C.muted }}>
        <span>{label}</span>
        <span style={{ fontFamily: MONO, color: C.text }}>{wert} {einheit}</span>
      </div>
      <input type="range" min={limits.min} max={limits.max} step={1} value={wert}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: C.sky }} />
    </div>
  );
}
