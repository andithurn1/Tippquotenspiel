"use client";

import { createMockOddsSource, scoreTip, toDisplay, projectTip } from "@/lib/engine";
import { usePrefs } from "@/components/PrefsProvider";
import { PREF_META, LEVELS, LEVEL_LABEL, START_SCREENS, START_SCREEN_LABEL } from "@/lib/prefs";
import BackLink from "@/components/BackLink";
import { C, MONO } from "@/lib/theme";


// Demo-Daten für die Live-Vorschau (dieselbe Engine wie überall).
const odds = createMockOddsSource();
const SNAP = odds.getSnapshot("JOR-ESP");
const RESULT = odds.getResult("JOR-ESP");
const DEMO_TIP = { home: 4, away: 1, goals: { home: ["Al-Naimat", "Al-Naimat"], away: ["Yamal", ""] } };
const ME = scoreTip(DEMO_TIP, RESULT, SNAP);
const PROJ = projectTip({ home: 3, away: 1, goals: { home: ["Al-Naimat"], away: [] } }, SNAP);
const ABR = {
  total: ME.total, rank: 2,
  boden: toDisplay(ME.parts.tendBoden), naehe: toDisplay(ME.parts.ergNaehe), tore: toDisplay(ME.goals.net),
};

export default function Einstellungen() {
  const { prefs, setPref } = usePrefs();

  return (
    <div style={{
      minHeight: "100vh", background: C.ink, color: C.text,
      fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
      padding: "28px 16px", display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <BackLink href="/menu" label="Menü" />
      <div style={{
        width: "100%", maxWidth: 400, position: "relative",
        borderRadius: 26, overflow: "hidden",
        background: `radial-gradient(120% 80% at 50% -10%, ${C.ink2} 0%, ${C.ink} 60%)`,
        border: `1px solid ${C.line}`, boxShadow: "0 30px 80px -30px rgba(0,0,0,0.8)",
      }}>
        <div style={{ position: "relative", padding: "26px 22px 24px" }}>
          <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: 2, color: C.muted, textTransform: "uppercase" }}>
            Meine Anzeige
          </span>
          <div style={{ marginTop: 6, fontSize: 18, fontWeight: 700 }}>Wie viel Hintergrund willst du sehen?</div>
          <p style={{ fontSize: 12.5, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
            Nur für dich — ändert nichts an den Punkten, nur daran, wie viel Mathematik
            und Vorschau dir angezeigt wird. Jeder Mitspieler stellt das selbst ein.
          </p>

          <PrefSection meta={PREF_META.abrechnung} value={prefs.abrechnung} onChange={(v) => setPref("abrechnung", v)} />
          <AbrechnungPreview lvl={prefs.abrechnung} />

          <div style={{ height: 1, background: C.line, margin: "22px 0" }} />

          <PrefSection meta={PREF_META.vorschau} value={prefs.vorschau} onChange={(v) => setPref("vorschau", v)} />
          <VorschauPreview lvl={prefs.vorschau} />

          <div style={{ height: 1, background: C.line, margin: "22px 0" }} />

          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>App-Start</div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
              Was du siehst, sobald du die App öffnest.
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
              {START_SCREENS.map((s) => (
                <button key={s} onClick={() => setPref("startScreen", s)} style={{
                  flex: 1, cursor: "pointer", fontSize: 13, fontWeight: 700, padding: "9px 0", borderRadius: 10,
                  background: prefs.startScreen === s ? C.gold : C.surface, color: prefs.startScreen === s ? C.ink : C.muted,
                  border: `1px solid ${prefs.startScreen === s ? C.gold : C.line}`, fontFamily: "inherit",
                }}>{START_SCREEN_LABEL[s]}</button>
              ))}
            </div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
              {prefs.startScreen === "hub"
                ? "Direkt rein ins Tippen: Tipp abgeben, Ranking & Co. deiner aktiven Runde."
                : "Erst die Übersicht: eigene Tippspiele, erstellen, beitreten, Einstellungen."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrefSection({ meta, value, onChange }) {
  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ fontSize: 14, fontWeight: 700 }}>{meta.title}</div>
      <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>{meta.hint}</div>
      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        {LEVELS.map((lv) => (
          <button key={lv} onClick={() => onChange(lv)} style={{
            flex: 1, cursor: "pointer", fontSize: 13, fontWeight: 700, padding: "9px 0", borderRadius: 10,
            background: value === lv ? C.gold : C.surface, color: value === lv ? C.ink : C.muted,
            border: `1px solid ${value === lv ? C.gold : C.line}`, fontFamily: "inherit",
          }}>{LEVEL_LABEL[lv]}</button>
        ))}
      </div>
      <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>{meta.levels[value]}</div>
    </div>
  );
}

function PreviewFrame({ label, children }) {
  return (
    <div style={{ marginTop: 12, background: C.ink2, border: `1px solid ${C.line}`, borderRadius: 14, padding: "12px 14px" }}>
      <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 1, color: C.muted, textTransform: "uppercase", marginBottom: 10 }}>
        Vorschau · {label}
      </div>
      {children}
    </div>
  );
}

function AbrechnungPreview({ lvl }) {
  return (
    <PreviewFrame label="Abrechnung">
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 10.5, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>gewertet</div>
        <div style={{ fontFamily: MONO, fontWeight: 700, color: C.gold, fontSize: 40, lineHeight: 1.1, textShadow: `0 0 24px ${C.gold}55` }}>
          +{ABR.total}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 13, color: C.mint, marginTop: 2 }}>Rang #{ABR.rank}</div>
      </div>
      {lvl === "voll" && (
        <div style={{ marginTop: 10, display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
          <MiniChip>Sieger-Boden +{ABR.boden}</MiniChip>
          <MiniChip tone={C.coral}>Nähebonus +{ABR.naehe}</MiniChip>
          {ABR.tore > 0 && <MiniChip tone={C.mint}>Tore +{ABR.tore}</MiniChip>}
        </div>
      )}
      {lvl !== "aus" && (
        <p style={{ fontSize: 11, color: C.muted, marginTop: 10, lineHeight: 1.5, textAlign: "center" }}>
          Nur ein Tor daneben — die Nähe zahlt fast wie ein exakter Treffer.
        </p>
      )}
      {lvl === "aus" && (
        <p style={{ fontSize: 11, color: C.muted, marginTop: 10, lineHeight: 1.5, textAlign: "center" }}>
          Nur Endpunkte und Rang — keine Mathematik, volle Spannung.
        </p>
      )}
    </PreviewFrame>
  );
}

function VorschauPreview({ lvl }) {
  if (lvl === "aus") {
    return (
      <PreviewFrame label="Tippen">
        <div style={{ fontSize: 12.5, color: C.muted, textAlign: "center", padding: "6px 0" }}>
          Keine Vorschau — du tippst blind.
        </div>
      </PreviewFrame>
    );
  }
  return (
    <PreviewFrame label="Tippen">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>Wenn exakt (Tipp 3:1)</span>
        <span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: C.gold }}>+{PROJ.points}</span>
      </div>
      <div style={{ marginTop: 6 }}>
        <span style={{ fontSize: 11, color: C.gold, border: `1px solid ${C.gold}55`, borderRadius: 999, padding: "2px 8px" }}>
          Mutig · Quote {PROJ.exaktQuote?.toFixed(1)}
        </span>
      </div>
      {lvl === "voll" && (
        <div style={{ marginTop: 10, fontSize: 11.5, color: C.muted, lineHeight: 1.7 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Ergebnis-Nähe (roh)</span><span style={{ fontFamily: MONO }}>{PROJ.ergNaehe.toFixed(1)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Tor-Potenzial (roh)</span><span style={{ fontFamily: MONO }}>+{PROJ.goalsNet.toFixed(1)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Kombi bei exakt</span><span style={{ fontFamily: MONO }}>×{PROJ.combo}</span>
          </div>
        </div>
      )}
    </PreviewFrame>
  );
}

function MiniChip({ children, tone }) {
  return (
    <span style={{
      fontFamily: MONO, fontSize: 10.5, color: tone || C.muted,
      border: `1px solid ${tone ? tone + "55" : C.line}`, borderRadius: 999, padding: "3px 8px",
    }}>{children}</span>
  );
}
