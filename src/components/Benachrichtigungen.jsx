"use client";

import { useState, useEffect } from "react";
import BackLink from "@/components/BackLink";
import { C, MONO } from "@/lib/theme";
import {
  DEFAULT_NOTIFY, sanitizeNotify, summarize, KANAELE, KANAL_META,
  VORLAUF_OPTIONEN, NOTIFY_LIMITS,
} from "@/lib/notify";

// ── Benachrichtigungen einstellen ───────────────────────────
// Bewusst als „aus, bis du zustimmst" gebaut: Erst der große Schalter, dann
// die Feinheiten. Die Klartext-Zeile unten sagt jederzeit, was tatsächlich
// ankommt — man soll nie überrascht werden.
const KEY = "tqs.notify.v1";

export default function Benachrichtigungen() {
  const [prefs, setPrefs] = useState(DEFAULT_NOTIFY);
  const [systemStatus, setSystemStatus] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setPrefs(sanitizeNotify(JSON.parse(raw)));
    } catch {}
  }, []);

  const update = (patch) => {
    const next = sanitizeNotify({ ...prefs, ...patch });
    setPrefs(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  };

  // Der Systemdialog kommt erst, wenn der Nutzer die Funktion selbst einschaltet.
  const einschalten = async () => {
    if (prefs.enabled) { update({ enabled: false }); setSystemStatus(""); return; }
    update({ enabled: true });
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        const res = await Notification.requestPermission();
        setSystemStatus(res === "granted" ? "" : "Dein Gerät blockiert Benachrichtigungen noch — in den Systemeinstellungen freigeben.");
      } else if (typeof Notification !== "undefined" && Notification.permission === "denied") {
        setSystemStatus("Dein Gerät blockiert Benachrichtigungen — in den Systemeinstellungen freigeben.");
      }
    } catch {}
  };

  const toggleVorlauf = (h) => {
    const hat = prefs.vorlaufStunden.includes(h);
    const next = hat ? prefs.vorlaufStunden.filter((x) => x !== h) : [...prefs.vorlaufStunden, h];
    update({ vorlaufStunden: next });
  };

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
          Benachrichtigungen
        </span>
        <div style={{ marginTop: 6, fontSize: 18, fontWeight: 700 }}>Nur, wenn du sonst was verpasst</div>
        <p style={{ fontSize: 12.5, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
          Wir melden uns nur zu zwei Anlässen — neuer Spieltag und kurz bevor
          dein ungetipptes Spiel beginnt. Kein „xy hat getippt", keine Werbung.
        </p>

        {/* Hauptschalter */}
        <button onClick={einschalten} style={{
          width: "100%", marginTop: 16, cursor: "pointer", textAlign: "left",
          display: "flex", alignItems: "center", gap: 12,
          background: prefs.enabled ? `${C.gold}14` : C.surface,
          border: `1px solid ${prefs.enabled ? C.gold + "55" : C.line}`,
          borderRadius: 14, padding: "13px 15px", color: C.text, fontFamily: "inherit",
        }}>
          <Schalter an={prefs.enabled} />
          <span style={{ flex: 1 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>
              {prefs.enabled ? "Eingeschaltet" : "Ausgeschaltet"}
            </span>
            <span style={{ display: "block", fontSize: 11.5, color: C.muted, marginTop: 2 }}>
              {prefs.enabled ? "Du bekommst nur die unten gewählten Hinweise." : "Es kommt gar nichts an."}
            </span>
          </span>
        </button>
        {systemStatus && (
          <div style={{ fontSize: 11.5, color: C.coral, marginTop: 8, lineHeight: 1.5 }}>{systemStatus}</div>
        )}

        <div style={{ opacity: prefs.enabled ? 1 : 0.45, pointerEvents: prefs.enabled ? "auto" : "none" }}>
          {/* Kanäle */}
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            {KANAELE.map((k) => (
              <button key={k} onClick={() => update({ [k]: !prefs[k] })} style={{
                textAlign: "left", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 11,
                background: C.surface, border: `1px solid ${prefs[k] ? C.gold + "44" : C.line}`,
                borderRadius: 14, padding: "12px 14px", color: C.text, fontFamily: "inherit",
              }}>
                <Haken an={prefs[k]} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700 }}>{KANAL_META[k].title}</span>
                  <span style={{ display: "block", fontSize: 11.5, color: C.muted, marginTop: 3, lineHeight: 1.5 }}>
                    {KANAL_META[k].hint}
                  </span>
                </span>
              </button>
            ))}
          </div>

          {/* Vorwarnzeiten */}
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>Wie früh erinnern?</div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 3, lineHeight: 1.5 }}>
              Mehrere möglich — z. B. einmal am Vortag und einmal kurz davor.
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              {VORLAUF_OPTIONEN.map((h) => {
                const an = prefs.vorlaufStunden.includes(h);
                return (
                  <button key={h} onClick={() => toggleVorlauf(h)} style={{
                    cursor: "pointer", fontFamily: MONO, fontSize: 12.5,
                    background: an ? C.gold : C.surface, color: an ? C.ink : C.muted,
                    border: `1px solid ${an ? C.gold : C.line}`, borderRadius: 999,
                    padding: "6px 13px", fontWeight: 700,
                  }}>{h} h</button>
                );
              })}
            </div>
          </div>

          {/* Ruhezeit */}
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>Nachtruhe</div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 3, lineHeight: 1.5 }}>
              In diesem Zeitraum kommt nichts an — auch nichts Dringendes.
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
              <Stunde label="von" value={prefs.ruhezeit.von} onChange={(v) => update({ ruhezeit: { ...prefs.ruhezeit, von: v } })} />
              <span style={{ color: C.muted }}>–</span>
              <Stunde label="bis" value={prefs.ruhezeit.bis} onChange={(v) => update({ ruhezeit: { ...prefs.ruhezeit, bis: v } })} />
            </div>
          </div>

          {/* Obergrenze */}
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>Höchstens pro Tag: {prefs.maxProTag}</div>
            <input type="range" min={NOTIFY_LIMITS.maxProTag.min} max={NOTIFY_LIMITS.maxProTag.max} step={1}
              value={prefs.maxProTag} onChange={(e) => update({ maxProTag: Number(e.target.value) })}
              style={{ width: "100%", marginTop: 8, accentColor: C.gold }} />
          </div>
        </div>

        {/* Klartext-Vorschau */}
        <div style={{
          marginTop: 22, background: C.ink2, border: `1px solid ${C.line}`,
          borderRadius: 14, padding: "12px 14px",
        }}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 1, color: C.muted, textTransform: "uppercase" }}>
            Das kommt bei dir an
          </div>
          <div style={{ fontSize: 12.5, color: C.text, marginTop: 6, lineHeight: 1.6 }}>{summarize(prefs)}</div>
        </div>

        <p style={{ fontSize: 10.5, color: C.muted, marginTop: 12, lineHeight: 1.5 }}>
          Gilt für dieses Gerät. Der eigentliche Versand kommt mit der App —
          die Einstellung hier bleibt dieselbe.
        </p>
      </div>
    </div>
  );
}

function Schalter({ an }) {
  return (
    <span style={{
      width: 42, height: 24, borderRadius: 999, flex: "0 0 auto",
      background: an ? C.gold : C.surface2, border: `1px solid ${an ? C.gold : C.line}`,
      display: "flex", alignItems: "center", padding: 2,
      justifyContent: an ? "flex-end" : "flex-start",
    }}>
      <span style={{ width: 18, height: 18, borderRadius: 999, background: an ? C.ink : C.muted }} />
    </span>
  );
}

function Haken({ an }) {
  return (
    <span style={{
      width: 20, height: 20, borderRadius: 6, flex: "0 0 auto", marginTop: 1,
      background: an ? C.gold : "transparent", border: `1px solid ${an ? C.gold : C.line}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: C.ink, fontSize: 13, fontWeight: 900,
    }}>{an ? "✓" : ""}</span>
  );
}

function Stunde({ label, value, onChange }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 11.5, color: C.muted }}>{label}</span>
      <select value={value} onChange={(e) => onChange(Number(e.target.value))} style={{
        background: C.surface, color: C.text, border: `1px solid ${C.line}`,
        borderRadius: 10, padding: "7px 9px", fontFamily: MONO, fontSize: 13,
      }}>
        {Array.from({ length: 24 }, (_, h) => (
          <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
        ))}
      </select>
    </label>
  );
}
