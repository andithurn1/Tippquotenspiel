"use client";

import { useState, useEffect } from "react";
import BackLink from "@/components/BackLink";
import { C, MONO, SCHRIFT, RUND } from "@/lib/theme";
import {
  DEFAULT_NOTIFY, sanitizeNotify, summarize, KANAELE, KANAL_META,
  VORLAUF_OPTIONEN, NOTIFY_LIMITS,
} from "@/lib/notify";
import { waehleKanal, STATUS, STATUS_TEXT } from "@/lib/pushKanal";
import { budgetText, pruneZustellungen } from "@/lib/zustellung";
import { TAPZIEL } from "@/lib/tapziel";

// ── Benachrichtigungen einstellen ───────────────────────────
// Bewusst als „aus, bis du zustimmst" gebaut: Erst der große Schalter, dann
// die Feinheiten. Die Klartext-Zeile unten sagt jederzeit, was tatsächlich
// ankommt — man soll nie überrascht werden.
const KEY = "tqs.notify.v1";
// Was diesem Gerät schon zugestellt wurde. Bewusst LOKAL: eine System-
// Benachrichtigung erscheint auf genau einem Gerät, also gehört auch die
// Buchführung dorthin. Erst echtes Web-Push (Stufe 2) bräuchte das serverseitig.
const GESEHEN_KEY = "tqs.notify.gesehen.v1";

export default function Benachrichtigungen() {
  const [prefs, setPrefs] = useState(DEFAULT_NOTIFY);
  const [systemStatus, setSystemStatus] = useState("");
  const [kanalZustand, setKanalZustand] = useState(null);
  const [gesehen, setGesehen] = useState([]);
  const [testHinweis, setTestHinweis] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setPrefs(sanitizeNotify(JSON.parse(raw)));
    } catch {}
    try {
      const roh = JSON.parse(localStorage.getItem(GESEHEN_KEY) ?? "[]");
      setGesehen(pruneZustellungen(Array.isArray(roh) ? roh : []));
    } catch {}
    setKanalZustand(waehleKanal().status());
  }, []);


  const update = (patch) => {
    const next = sanitizeNotify({ ...prefs, ...patch });
    setPrefs(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  };

  // Der Systemdialog kommt erst, wenn der Nutzer die Funktion selbst einschaltet.
  // Erlaubnis UND Service Worker laufen über den Kanal (pushKanal.js) — die eine
  // Stelle, die getauscht wird, wenn später echtes Web-Push dazukommt.
  const einschalten = async () => {
    if (prefs.enabled) { update({ enabled: false }); setSystemStatus(""); return; }
    update({ enabled: true });
    const kanal = waehleKanal();
    const zustand = await kanal.erlaubnisAnfragen();
    setKanalZustand(zustand);
    // Ohne registrierten Worker zeigen mobile Browser gar nichts an.
    if (zustand === STATUS.erlaubt) await kanal.registriereWorker();
    setSystemStatus(zustand === STATUS.erlaubt ? "" : STATUS_TEXT[zustand]);
  };

  // Probe aufs Exempel: zeigt dieses Gerät überhaupt etwas an? Ohne diesen
  // Knopf merkt ein Nutzer erst am verpassten Spieltag, dass nichts ankommt.
  const testen = async () => {
    const kanal = waehleKanal();
    let zustand = kanal.status();
    if (zustand === STATUS.offen) zustand = await kanal.erlaubnisAnfragen();
    setKanalZustand(zustand);
    if (zustand !== STATUS.erlaubt) { setTestHinweis(STATUS_TEXT[zustand]); return; }
    await kanal.registriereWorker();
    const eintrag = {
      art: "test", key: `test:${Date.now()}`,
      titel: "Test — so sieht es aus",
      text: "Echte Hinweise kommen nur zu den beiden Anlässen oben.",
    };
    const raus = await kanal.zeige(eintrag, { url: "/benachrichtigungen" });
    // Der Test zählt bewusst NICHT aufs Tagesbudget: er ist vom Nutzer
    // ausgelöst, nicht von der App — sonst nimmt er sich seine echten Hinweise.
    setTestHinweis(raus ? "Rausgeschickt — schau in deine Benachrichtigungen." : "Konnte nicht angezeigt werden.");
  };

  const toggleVorlauf = (h) => {
    const hat = prefs.vorlaufStunden.includes(h);
    const next = hat ? prefs.vorlaufStunden.filter((x) => x !== h) : [...prefs.vorlaufStunden, h];
    update({ vorlaufStunden: next });
  };

  return (
    <div style={{
      minHeight: "100vh", background: C.ink, color: C.text,
      fontFamily: SCHRIFT,
      padding: "28px 16px", display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <BackLink href="/menu" label="Menü" />
      <div style={{
        width: "100%", maxWidth: "var(--tqs-schirm-breite)", borderRadius: RUND.schirm,
        background: `radial-gradient(120% 80% at 50% -10%, ${C.ink2} 0%, ${C.ink} 60%)`,
        border: `1px solid ${C.line}`, boxShadow: "0 30px 80px -30px rgba(0,0,0,0.8)",
        padding: "26px 22px 24px",
      }}>
        <span style={{ fontFamily: MONO, fontSize: "0.75rem", letterSpacing: 2, color: C.muted, textTransform: "uppercase" }}>
          Benachrichtigungen
        </span>
        <div style={{ marginTop: 6, fontSize: "1.25rem", fontWeight: 700 }}>Nur, wenn du sonst was verpasst</div>
        <p style={{ fontSize: "0.8125rem", color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
          Wir melden uns nur zu zwei Anlässen — neuer Spieltag und kurz bevor
          dein ungetipptes Spiel beginnt. Kein „xy hat getippt", keine Werbung.
        </p>

        {/* Hauptschalter */}
        <button onClick={einschalten} style={{
          width: "100%", marginTop: 16, cursor: "pointer", textAlign: "left",
          display: "flex", alignItems: "center", gap: 12,
          background: prefs.enabled ? `${C.akzent}14` : C.surface,
          border: `1px solid ${prefs.enabled ? C.akzent + "55" : C.line}`,
          borderRadius: RUND.karte, padding: "13px 15px", color: C.text, fontFamily: "inherit",
        }}>
          <Schalter an={prefs.enabled} />
          <span style={{ flex: 1 }}>
            <span style={{ fontSize: "0.9375rem", fontWeight: 700 }}>
              {prefs.enabled ? "Eingeschaltet" : "Ausgeschaltet"}
            </span>
            <span style={{ display: "block", fontSize: "0.75rem", color: C.muted, marginTop: 2 }}>
              {prefs.enabled ? "Du bekommst nur die unten gewählten Hinweise." : "Es kommt gar nichts an."}
            </span>
          </span>
        </button>
        {systemStatus && (
          <div style={{ fontSize: "0.75rem", color: C.coral, marginTop: 8, lineHeight: 1.5 }}>{systemStatus}</div>
        )}

        {/* Der Zustand des GERÄTS, getrennt von der Einstellung in der App.
            „Ich habe es eingeschaltet, es kommt aber nichts" ist sonst nicht
            aufzulösen — die Sperre sitzt dann im System, nicht hier. */}
        <div style={{
          marginTop: 10, background: C.surface, border: `1px solid ${C.line}`,
          borderRadius: RUND.karte, padding: "10px 12px",
        }}>
          <div style={{ fontSize: "0.75rem", color: C.muted, lineHeight: 1.5 }}>
            {kanalZustand ? STATUS_TEXT[kanalZustand] : "Gerät wird geprüft …"}
          </div>
          <div style={{ fontSize: "0.6875rem", color: C.muted, marginTop: 4, lineHeight: 1.45 }}>
            {budgetText(gesehen, prefs)}
          </div>
          {kanalZustand !== STATUS.nichtUnterstuetzt && (
            <button onClick={testen} style={{
              marginTop: 8, cursor: "pointer", fontFamily: "inherit", fontSize: "0.75rem", fontWeight: 700,
              background: "transparent", color: C.sky, border: `1px solid ${C.sky}55`,
              ...TAPZIEL, borderRadius: RUND.pille, padding: "5px 12px",
            }}>
              Testbenachrichtigung senden
            </button>
          )}
          {testHinweis && (
            <div style={{ fontSize: "0.6875rem", color: C.muted, marginTop: 6, lineHeight: 1.45 }}>{testHinweis}</div>
          )}
          <div style={{ fontSize: "0.6875rem", color: C.muted, marginTop: 8, lineHeight: 1.45 }}>
            Hinweise erscheinen, solange die App geöffnet ist (auch im Hintergrund).
            Zustellung bei ganz geschlossener App kommt später — dafür braucht es
            Push-Schlüssel auf dem Server.
          </div>
        </div>

        <div style={{ opacity: prefs.enabled ? 1 : 0.45, pointerEvents: prefs.enabled ? "auto" : "none" }}>
          {/* Kanäle */}
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            {KANAELE.map((k) => (
              <button key={k} onClick={() => update({ [k]: !prefs[k] })} style={{
                textAlign: "left", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 11,
                background: C.surface, border: `1px solid ${prefs[k] ? C.akzent + "44" : C.line}`,
                borderRadius: RUND.karte, padding: "12px 14px", color: C.text, fontFamily: "inherit",
              }}>
                <Haken an={prefs[k]} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: "0.8125rem", fontWeight: 700 }}>{KANAL_META[k].title}</span>
                  <span style={{ display: "block", fontSize: "0.75rem", color: C.muted, marginTop: 3, lineHeight: 1.5 }}>
                    {KANAL_META[k].hint}
                  </span>
                </span>
              </button>
            ))}
          </div>

          {/* Vorwarnzeiten */}
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: "0.8125rem", fontWeight: 700 }}>Wie früh erinnern?</div>
            <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 3, lineHeight: 1.5 }}>
              Mehrere möglich — z. B. einmal am Vortag und einmal kurz davor.
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              {VORLAUF_OPTIONEN.map((h) => {
                const an = prefs.vorlaufStunden.includes(h);
                return (
                  <button key={h} onClick={() => toggleVorlauf(h)} style={{
                    cursor: "pointer", fontFamily: MONO, fontSize: "0.8125rem",
                    background: an ? C.akzent : C.surface, color: an ? C.ink : C.muted,
                    border: `1px solid ${an ? C.akzent : C.line}`, borderRadius: RUND.pille,
                    ...TAPZIEL, padding: "6px 13px", fontWeight: 700,
                  }}>{h} h</button>
                );
              })}
            </div>
          </div>

          {/* Ruhezeit */}
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: "0.8125rem", fontWeight: 700 }}>Nachtruhe</div>
            <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 3, lineHeight: 1.5 }}>
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
            <div style={{ fontSize: "0.8125rem", fontWeight: 700 }}>Höchstens pro Tag: {prefs.maxProTag}</div>
            <input type="range" min={NOTIFY_LIMITS.maxProTag.min} max={NOTIFY_LIMITS.maxProTag.max} step={1}
              value={prefs.maxProTag} onChange={(e) => update({ maxProTag: Number(e.target.value) })}
              style={{ width: "100%", marginTop: 8, accentColor: C.akzent }} />
          </div>
        </div>

        {/* Klartext-Vorschau */}
        <div style={{
          marginTop: 22, background: C.ink2, border: `1px solid ${C.line}`,
          borderRadius: RUND.karte, padding: "12px 14px",
        }}>
          <div style={{ fontFamily: MONO, fontSize: "0.6875rem", letterSpacing: 1, color: C.muted, textTransform: "uppercase" }}>
            Das kommt bei dir an
          </div>
          <div style={{ fontSize: "0.8125rem", color: C.text, marginTop: 6, lineHeight: 1.6 }}>{summarize(prefs)}</div>
        </div>

        <p style={{ fontSize: "0.6875rem", color: C.muted, marginTop: 12, lineHeight: 1.5 }}>
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
      width: 42, height: 24, borderRadius: RUND.pille, flex: "0 0 auto",
      background: an ? C.akzent : C.surface2, border: `1px solid ${an ? C.akzent : C.line}`,
      display: "flex", alignItems: "center", padding: 2,
      justifyContent: an ? "flex-end" : "flex-start",
    }}>
      <span style={{ width: 18, height: 18, borderRadius: RUND.pille, background: an ? C.ink : C.muted }} />
    </span>
  );
}

function Haken({ an }) {
  return (
    <span style={{
      width: 20, height: 20, borderRadius: RUND.klein, flex: "0 0 auto", marginTop: 1,
      background: an ? C.akzent : "transparent", border: `1px solid ${an ? C.akzent : C.line}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: C.ink, fontSize: "0.8125rem", fontWeight: 900,
    }}>{an ? "✓" : ""}</span>
  );
}

function Stunde({ label, value, onChange }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: "0.75rem", color: C.muted }}>{label}</span>
      <select value={value} onChange={(e) => onChange(Number(e.target.value))} style={{
        background: C.surface, color: C.text, border: `1px solid ${C.line}`,
        borderRadius: RUND.karte, padding: "7px 9px", fontFamily: MONO, fontSize: "0.8125rem",
      }}>
        {Array.from({ length: 24 }, (_, h) => (
          <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
        ))}
      </select>
    </label>
  );
}
