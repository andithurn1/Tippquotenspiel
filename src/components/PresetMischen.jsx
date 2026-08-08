"use client";

import { useState, useMemo } from "react";
import { C, MONO } from "@/lib/theme";
import { PRESETS } from "@/lib/presets";
import { ASPEKTE, defaultAuswahl, mergePresets, unterschiede } from "@/lib/presetMerge";
import { TAPZIEL } from "@/lib/tapziel";

// ── Zwei Presets zu einem mischen ───────────────────────────
// Der knifflige Teil ist laut Roadmap die BEDIENUNG. Lösung: nicht 20 Regler,
// sondern wenige benannte Aspekte — und je Aspekt ein Schiebe-Umschalter
// zwischen den beiden Presets. Aspekte, in denen sich die beiden gar nicht
// unterscheiden, werden ausgeblendet: dort gibt es nichts zu entscheiden.
//
// Als eigenständige Komponente gebaut, damit sie sowohl auf einer eigenen
// Seite als auch später eingebettet in der Spielerstellung laufen kann.
export default function PresetMischen({ onUebernehmen = null }) {
  const [aKey, setAKey] = useState(PRESETS[0].key);
  const [bKey, setBKey] = useState(PRESETS[1]?.key ?? PRESETS[0].key);
  const [auswahl, setAuswahl] = useState(() => defaultAuswahl("a"));
  const [name, setName] = useState("");

  const A = PRESETS.find((p) => p.key === aKey);
  const B = PRESETS.find((p) => p.key === bKey);

  const relevante = useMemo(() => {
    const diff = new Set(unterschiede(A.rules, B.rules));
    return ASPEKTE.filter((asp) => diff.has(asp.key));
  }, [A, B]);

  const mix = useMemo(
    () => mergePresets(A.rules, B.rules, auswahl, name.trim() || null),
    [A, B, auswahl, name]
  );

  const setzeAlle = (seite) => setAuswahl(defaultAuswahl(seite));

  return (
    <div style={{
      background: C.ink2, border: `1px solid ${C.line}`, borderRadius: 18, padding: "18px 16px",
    }}>
      <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 1.5, color: C.muted, textTransform: "uppercase" }}>
        Presets mischen
      </div>
      <p style={{ fontSize: 12, color: C.muted, margin: "6px 0 14px", lineHeight: 1.5 }}>
        Zwei Regelwerke kombinieren — z. B. die Schärfe des einen mit den
        Kombi-Stufen des anderen. Du entscheidest nur dort, wo sie sich
        tatsächlich unterscheiden.
      </p>

      {/* Die beiden Quellen */}
      <div style={{ display: "flex", gap: 8 }}>
        <PresetWahl label="A" value={aKey} onChange={setAKey} tone={C.gold} />
        <PresetWahl label="B" value={bKey} onChange={setBKey} tone={C.sky} />
      </div>

      {relevante.length === 0 ? (
        <div style={{ fontSize: 12.5, color: C.muted, marginTop: 16, lineHeight: 1.5 }}>
          Diese beiden Regelwerke sind identisch — es gibt nichts zu mischen.
          Wähle zwei verschiedene Presets.
        </div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 18, marginBottom: 8 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, flex: 1 }}>
              {relevante.length} Unterschied{relevante.length === 1 ? "" : "e"}
            </span>
            <MiniBtn onClick={() => setzeAlle("a")}>alles A</MiniBtn>
            <MiniBtn onClick={() => setzeAlle("b")}>alles B</MiniBtn>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {relevante.map((asp) => {
              const seite = auswahl[asp.key];
              return (
                <div key={asp.key} style={{
                  background: C.surface, border: `1px solid ${C.line}`,
                  borderRadius: 14, padding: "11px 13px",
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{asp.label}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 1.45 }}>{asp.hint}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 9 }}>
                    <Seite an={seite === "a"} tone={C.gold} label={A.label}
                      onClick={() => setAuswahl((w) => ({ ...w, [asp.key]: "a" }))} />
                    <Seite an={seite === "b"} tone={C.sky} label={B.label}
                      onClick={() => setAuswahl((w) => ({ ...w, [asp.key]: "b" }))} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Name + Übernehmen */}
          <div style={{ marginTop: 16 }}>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40}
              placeholder={mix.name} style={{
                width: "100%", background: C.ink2, color: C.text, border: `1px solid ${C.line}`,
                borderRadius: 12, padding: "10px 12px", fontSize: 13.5, fontFamily: "inherit", outline: "none",
              }} />
            <div style={{ fontSize: 10.5, color: C.muted, marginTop: 5 }}>
              Name des Mixes — leer lassen für „{mix.name}".
            </div>
          </div>

          {onUebernehmen && (
            <button onClick={() => onUebernehmen(mix)} style={{
              width: "100%", marginTop: 12, cursor: "pointer", background: C.gold, color: C.ink,
              fontWeight: 700, fontSize: 14.5, border: "none", borderRadius: 12, padding: "12px 0",
              fontFamily: "inherit",
            }}>Mix als Regelwerk übernehmen</button>
          )}
        </>
      )}
    </div>
  );
}

function PresetWahl({ label, value, onChange, tone }) {
  return (
    <label style={{ flex: 1, minWidth: 0 }}>
      <span style={{ display: "block", fontFamily: MONO, fontSize: 10.5, color: tone, marginBottom: 4 }}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{
        width: "100%", background: C.surface, color: C.text, border: `1px solid ${tone}44`,
        borderRadius: 11, padding: "9px 10px", fontSize: 13, fontFamily: "inherit",
      }}>
        {PRESETS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
      </select>
    </label>
  );
}

function Seite({ an, tone, label, onClick }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700,
      ...TAPZIEL, padding: "8px 6px", borderRadius: 10,
      background: an ? `${tone}22` : "transparent", color: an ? tone : C.muted,
      border: `1px solid ${an ? tone + "66" : C.line}`,
      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
    }}>{label}</button>
  );
}

function MiniBtn({ children, onClick }) {
  return (
    <button onClick={onClick} style={{
      cursor: "pointer", fontFamily: MONO, fontSize: 10.5, color: C.muted,
      background: C.surface, border: `1px solid ${C.line}`, borderRadius: 999, padding: "4px 9px",
    }}>{children}</button>
  );
}
