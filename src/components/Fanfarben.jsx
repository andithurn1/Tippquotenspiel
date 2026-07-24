"use client";

import { useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { C, MONO, deriveRoles, readableInk, CLUB_PRESETS } from "@/lib/theme";
import BackLink from "@/components/BackLink";

// Rollen-Beschreibung (aus THEMING.md) — welche Farbe wo landet.
const SLOTS = [
  { role: "Primär", hint: "Buttons, „dein Wert“, Hervorhebungen." },
  { role: "Sekundär", hint: "Admin-Akzente, Ränder, Chips." },
  { role: "Signal", hint: "Badges, seltene Glanzmomente." },
];
const DEFAULTS = ["#F5C451", "#8B9BFF", "#B98BFF"];

export default function Fanfarben() {
  const { fanColors, setFanColors, reset } = useTheme();
  const [draft, setDraft] = useState(() => (fanColors.length ? [...fanColors] : []));

  // Vorschau lokal (reine Funktion, kein globales Umfärben beim Ziehen).
  const roles = draft.length ? deriveRoles(draft) : null;
  const preview = roles || { gold: C.gold, indigo: C.indigo, violet: C.violet };
  const dirty = JSON.stringify(draft) !== JSON.stringify(fanColors);

  // Wurde eine gewählte Farbe zur Lesbarkeit aufgehellt? (Slot i → Rolle)
  const ROLE_OF_SLOT = ["gold", "indigo", "violet"];
  const wasLightened = (i) =>
    roles && draft[i] && draft[i].toLowerCase() !== roles[ROLE_OF_SLOT[i]].toLowerCase();

  const setColor = (i, val) => setDraft((d) => d.map((c, idx) => (idx === i ? val : c)));
  const addColor = () => setDraft((d) => (d.length < 3 ? [...d, DEFAULTS[d.length]] : d));
  const removeColor = (i) => setDraft((d) => d.filter((_, idx) => idx !== i));

  const applyPreset = (colors) => { setDraft([...colors]); setFanColors(colors); };
  const save = () => setFanColors(draft);
  const clearAll = () => { setDraft([]); reset(); };

  return (
    <div style={{
      minHeight: "100vh", background: C.ink, color: C.text,
      fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
      padding: "28px 16px", display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <BackLink href="/menu" label="Menü" />
      <div style={{
        width: "100%", maxWidth: 400, borderRadius: 26,
        background: `radial-gradient(120% 80% at 50% -10%, ${C.ink2} 0%, ${C.ink} 60%)`,
        border: `1px solid ${C.line}`, boxShadow: "0 30px 80px -30px rgba(0,0,0,0.8)",
        padding: "26px 22px 24px",
      }}>
        <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: 2, color: C.muted, textTransform: "uppercase" }}>
          Fanfarben
        </span>
        <div style={{ marginTop: 6, fontSize: 18, fontWeight: 700 }}>Deine Vereinsfarben</div>
        <p style={{ fontSize: 12.5, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
          Wähle 2–3 Farben, um deinen Verein zu repräsentieren. Das Layout bleibt
          überall gleich — nur die Akzente tragen deine Farben. Zu dunkle Farben
          werden für die Lesbarkeit leicht aufgehellt.
        </p>

        {/* Live-Vorschau */}
        <Preview p={preview} />

        {/* Presets */}
        <div style={{ marginTop: 18, fontSize: 13, fontWeight: 700 }}>Schnellauswahl</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          {CLUB_PRESETS.map((p) => (
            <button key={p.id} onClick={() => applyPreset(p.colors)} title={p.label} style={{
              cursor: "pointer", display: "flex", alignItems: "center", gap: 7,
              background: C.surface, border: `1px solid ${C.line}`, borderRadius: 999,
              padding: "5px 10px 5px 6px", color: C.text, fontFamily: "inherit", fontSize: 12,
            }}>
              <Swatches colors={p.colors} />
              {p.label}
            </button>
          ))}
        </div>

        {/* Eigene Farben */}
        <div style={{ marginTop: 20, fontSize: 13, fontWeight: 700 }}>Eigene Farben</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
          {draft.map((color, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12,
              background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: "10px 12px",
            }}>
              <label style={{ position: "relative", width: 34, height: 34, flex: "0 0 auto" }}>
                <input type="color" value={color} onChange={(e) => setColor(i, e.target.value)}
                  style={{ opacity: 0, position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "pointer" }} />
                <span style={{
                  display: "block", width: 34, height: 34, borderRadius: 9,
                  background: color, border: `1px solid ${C.line}`,
                }} />
              </label>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                  {SLOTS[i]?.role || `Farbe ${i + 1}`}
                  {wasLightened(i) && (
                    <span title="Für Lesbarkeit leicht aufgehellt" style={{
                      fontFamily: MONO, fontSize: 9, color: C.mint, textTransform: "uppercase",
                      border: `1px solid ${C.mint}55`, borderRadius: 999, padding: "1px 6px", letterSpacing: 0.5,
                    }}>aufgehellt</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.4 }}>{SLOTS[i]?.hint}</div>
              </div>
              <span style={{ fontFamily: MONO, fontSize: 11, color: C.muted }}>{color.toUpperCase()}</span>
              <button onClick={() => removeColor(i)} aria-label="Farbe entfernen" style={{
                cursor: "pointer", background: "transparent", border: "none",
                color: C.muted, fontSize: 18, lineHeight: 1, padding: "0 2px",
              }}>×</button>
            </div>
          ))}
          {draft.length < 3 && (
            <button onClick={addColor} style={{
              cursor: "pointer", background: "transparent", color: C.muted,
              border: `1px dashed ${C.line}`, borderRadius: 14, padding: "10px 12px",
              fontFamily: "inherit", fontSize: 13, textAlign: "left",
            }}>+ Farbe hinzufügen {draft.length === 0 ? "" : `(${draft.length}/3)`}</button>
          )}
        </div>

        {/* Aktionen */}
        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button onClick={save} disabled={!dirty} style={{
            flex: 1, cursor: dirty ? "pointer" : "default",
            background: dirty ? C.gold : C.surface, color: dirty ? readableInk(preview.gold) : C.muted,
            fontWeight: 700, fontSize: 14, border: `1px solid ${dirty ? C.gold : C.line}`,
            borderRadius: 12, padding: "11px 0", fontFamily: "inherit",
          }}>{dirty ? "Übernehmen" : "Gespeichert"}</button>
          <button onClick={clearAll} style={{
            cursor: "pointer", background: C.surface, color: C.muted,
            border: `1px solid ${C.line}`, borderRadius: 12, padding: "11px 16px",
            fontFamily: "inherit", fontSize: 14, fontWeight: 700,
          }}>Zurücksetzen</button>
        </div>
        <p style={{ fontSize: 11, color: C.muted, marginTop: 10, lineHeight: 1.5 }}>
          Gilt nur für deine Ansicht auf diesem Gerät — jeder Mitspieler wählt
          seine eigenen Farben. Wertungsfarben (Erfolg/Warnung) bleiben immer gleich.
        </p>
      </div>
    </div>
  );
}

function Preview({ p }) {
  const onGold = readableInk(p.gold);
  return (
    <div style={{
      marginTop: 14, background: C.ink2, border: `1px solid ${C.line}`,
      borderRadius: 16, padding: "16px 16px 18px",
    }}>
      <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 1, color: C.muted, textTransform: "uppercase", marginBottom: 12 }}>
        Vorschau
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{
          background: p.gold, color: onGold, fontWeight: 700, fontSize: 13,
          borderRadius: 10, padding: "8px 14px",
        }}>Tipp abgeben</span>
        <span style={{
          fontFamily: MONO, fontSize: 12, color: p.violet,
          border: `1px solid ${p.violet}66`, borderRadius: 999, padding: "4px 10px",
        }}>Zocker des Spieltags</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: C.muted }}>
          <span style={{ width: 9, height: 9, borderRadius: 999, background: p.indigo, boxShadow: `0 0 10px ${p.indigo}` }} />
          Admin
        </span>
        <span style={{ fontFamily: MONO, fontSize: 26, fontWeight: 700, color: p.gold, textShadow: `0 0 22px ${p.gold}55` }}>
          +18,4
        </span>
      </div>
    </div>
  );
}

function Swatches({ colors }) {
  return (
    <span style={{ display: "inline-flex" }}>
      {colors.slice(0, 3).map((c, i) => (
        <span key={i} style={{
          width: 16, height: 16, borderRadius: 999, background: c,
          border: "1px solid rgba(255,255,255,0.2)", marginLeft: i === 0 ? 0 : -5,
        }} />
      ))}
    </span>
  );
}
