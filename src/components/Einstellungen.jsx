"use client";

import { useEffect, useMemo, useState } from "react";
import { createMockOddsSource, scoreTip, toDisplay, projectTip, sanitizeRules, DEFAULT_RULES } from "@/lib/engine";
import { usePrefs } from "@/components/PrefsProvider";
import { getStore } from "@/lib/store";
import { useCurrentRound } from "@/components/RoundProvider";
import {
  PREF_META, LEVELS, LEVEL_LABEL, START_SCREENS, START_SCREEN_LABEL,
  MAX_VERGLEICH, toggleVergleich, vergleichFuer,
} from "@/lib/prefs";
import { useAuth } from "@/components/AuthProvider";
import BackLink from "@/components/BackLink";
import { C, MONO, SCHRIFT, RUND } from "@/lib/theme";
import { TAPZIEL } from "@/lib/tapziel";


// Beispiel-Begegnung für die Live-Vorschau (dieselbe Engine wie überall).
const odds = createMockOddsSource();
const SNAP = odds.getSnapshot("JOR-ESP");
const RESULT = odds.getResult("JOR-ESP");
const DEMO_TIP = { home: 4, away: 1, goals: { home: ["Al-Naimat", "Al-Naimat"], away: ["Yamal", ""] } };

export default function Einstellungen() {
  const { prefs, setPref } = usePrefs();
  const { user } = useAuth();
  // 🔴 Auch die Vorschau rechnet mit dem Regelwerk DER RUNDE. Sie zeigt, wie
  // die eigene Abrechnung gleich aussehen wird — mit `DEFAULT_RULES` standen
  // dort Punktzahlen, die es in dieser Runde nicht gibt.
  const { roundId } = useCurrentRound();
  const [rules, setRules] = useState(DEFAULT_RULES);
  useEffect(() => {
    let live = true;
    getStore().getRound(roundId)
      .then((r) => { if (live) setRules(sanitizeRules(r?.rules ?? DEFAULT_RULES)); })
      .catch(() => {});
    return () => { live = false; };
  }, [roundId]);

  // Die Mitspieler DIESER Runde — für die Vergleichs-Auswahl. Ohne sie wäre
  // die Einstellung eine Liste von Nutzer-Ids, und niemand weiß, wer „u-kemal"
  // ist.
  const [mitglieder, setMitglieder] = useState([]);
  useEffect(() => {
    let live = true;
    getStore().listMembers(roundId)
      .then((m) => { if (live) setMitglieder(m ?? []); })
      .catch(() => {});
    return () => { live = false; };
  }, [roundId]);

  const gewaehlteFreunde = vergleichFuer(prefs, roundId);

  const ME = useMemo(() => scoreTip(DEMO_TIP, RESULT, SNAP, rules), [rules]);
  const PROJ = useMemo(
    () => projectTip({ home: 3, away: 1, goals: { home: ["Al-Naimat"], away: [] } }, SNAP, rules), [rules]);
  const ABR = useMemo(() => ({
    total: ME.total, rank: 2,
    boden: toDisplay(ME.parts.tendBoden, rules),
    naehe: toDisplay(ME.parts.ergNaehe, rules),
    tore: toDisplay(ME.goals.net, rules),
  }), [ME, rules]);

  return (
    <div style={{
      minHeight: "100vh", background: C.ink, color: C.text,
      fontFamily: SCHRIFT,
      padding: "28px 16px", display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <BackLink href="/menu" label="Menü" />
      <div style={{
        width: "100%", maxWidth: "var(--tqs-schirm-breite)", position: "relative",
        borderRadius: RUND.schirm, overflow: "hidden",
        background: `radial-gradient(120% 80% at 50% -10%, ${C.ink2} 0%, ${C.ink} 60%)`,
        border: `1px solid ${C.line}`, boxShadow: "0 30px 80px -30px rgba(0,0,0,0.8)",
      }}>
        <div style={{ position: "relative", padding: "26px 22px 24px" }}>
          <span style={{ fontFamily: MONO, fontSize: "0.75rem", letterSpacing: 2, color: C.muted, textTransform: "uppercase" }}>
            Meine Anzeige
          </span>
          <div style={{ marginTop: 6, fontSize: "1.25rem", fontWeight: 700 }}>Wie viel Hintergrund willst du sehen?</div>
          <p style={{ fontSize: "0.8125rem", color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
            Nur für dich — ändert nichts an den Punkten, nur daran, wie viel Mathematik
            und Vorschau dir angezeigt wird. Jeder Mitspieler stellt das selbst ein.
          </p>

          <PrefSection meta={PREF_META.abrechnung} value={prefs.abrechnung} onChange={(v) => setPref("abrechnung", v)} />
          <AbrechnungPreview lvl={prefs.abrechnung} abr={ABR} />

          <div style={{ height: 1, background: C.line, margin: "22px 0" }} />

          <PrefSection meta={PREF_META.vorschau} value={prefs.vorschau} onChange={(v) => setPref("vorschau", v)} />
          <VorschauPreview lvl={prefs.vorschau} proj={PROJ} />

          <div style={{ height: 1, background: C.line, margin: "22px 0" }} />

          {/* 🔴 Die Einblendung nach Spielende. Sie legt sich beim Öffnen vor
              alles — der Schalter dafür MUSS hier stehen, und der Hinweis in
              der Einblendung verlinkt genau hierher. */}
          <PrefSection meta={PREF_META.zwischenabrechnung} value={prefs.zwischenabrechnung}
            onChange={(v) => setPref("zwischenabrechnung", v)} />

          {/* 🔴 Mit wem vergleiche ich mich? Eine PERSÖNLICHE Wahl und keine
              Regel der Runde — der Admin hat damit nichts zu tun, und zwei
              Spieler derselben Runde dürfen verschiedene Leute im Blick haben.
              Steht direkt unter der Einblendung, weil sie dort auftaucht. */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: C.text }}>
              Vergleich mit Mitspielern
            </div>
            <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
              Bis zu {MAX_VERGLEICH} aus dieser Runde. Ihre Tipps und Punkte stehen dann neben
              deinen — auch in der Einblendung nach dem Spiel. Nur für dich sichtbar.
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {mitglieder
                .filter((m) => m.user_id !== user?.id)
                .map((m) => {
                  const gewaehlt = gewaehlteFreunde.includes(m.user_id);
                  // ⚠️ Voll heißt GESPERRT, nicht „verdrängt den ersten". Ein
                  // Häkchen, das still ein anderes wegnimmt, ist die Sorte
                  // Oberfläche, bei der man beim dritten Klick aufgibt.
                  const voll = !gewaehlt && gewaehlteFreunde.length >= MAX_VERGLEICH;
                  return (
                    <button key={m.user_id} type="button" disabled={voll}
                      // ⚠️ Funktionale Form: `toggleVergleich(prefs.vergleich, …)`
                      // rechnet gegen den Stand VOM RENDERN — drei Klicks
                      // hintereinander speicherten dann nur den letzten
                      // (im Browser gemessen). Siehe `PrefsProvider`.
                      onClick={() => setPref("vergleich", (v) => toggleVergleich(v, roundId, m.user_id))}
                      title={voll ? `Höchstens ${MAX_VERGLEICH} — erst einen abwählen.` : undefined}
                      style={{
                        border: `1px solid ${gewaehlt ? C.akzent : C.line}`, borderRadius: RUND.pille,
                        background: gewaehlt ? `${C.akzent}1a` : "transparent",
                        color: gewaehlt ? C.akzent : (voll ? C.ghost : C.text),
                        cursor: voll ? "not-allowed" : "pointer",
                        ...TAPZIEL, padding: "5px 11px", fontSize: "0.75rem", fontWeight: gewaehlt ? 700 : 500,
                      }}>
                      {gewaehlt ? "✓ " : ""}{m.name ?? m.user_id}
                    </button>
                  );
                })}
            </div>
            <div style={{ fontSize: "0.6875rem", color: C.muted, marginTop: 7 }}>
              {gewaehlteFreunde.length === 0
                ? "Niemand ausgewählt — es stehen nur deine eigenen Zahlen da."
                : `${gewaehlteFreunde.length} von ${MAX_VERGLEICH} ausgewählt.`}
            </div>
          </div>

          <div style={{ height: 1, background: C.line, margin: "22px 0" }} />

          <div>
            <div style={{ fontSize: "0.9375rem", fontWeight: 700 }}>App-Start</div>
            <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
              Was du siehst, sobald du die App öffnest.
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
              {START_SCREENS.map((s) => (
                <button key={s} onClick={() => setPref("startScreen", s)} style={{
                  ...TAPZIEL, flex: 1, cursor: "pointer", fontSize: "0.8125rem", fontWeight: 700, padding: "9px 0", borderRadius: RUND.karte,
                  background: prefs.startScreen === s ? C.akzent : C.surface, color: prefs.startScreen === s ? C.ink : C.muted,
                  border: `1px solid ${prefs.startScreen === s ? C.akzent : C.line}`, fontFamily: "inherit",
                }}>{START_SCREEN_LABEL[s]}</button>
              ))}
            </div>
            <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
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
      <div style={{ fontSize: "0.9375rem", fontWeight: 700 }}>{meta.title}</div>
      <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 4, lineHeight: 1.5 }}>{meta.hint}</div>
      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        {LEVELS.map((lv) => (
          <button key={lv} onClick={() => onChange(lv)} style={{
            ...TAPZIEL, flex: 1, cursor: "pointer", fontSize: "0.8125rem", fontWeight: 700, padding: "9px 0", borderRadius: RUND.karte,
            background: value === lv ? C.akzent : C.surface, color: value === lv ? C.ink : C.muted,
            border: `1px solid ${value === lv ? C.akzent : C.line}`, fontFamily: "inherit",
          }}>{LEVEL_LABEL[lv]}</button>
        ))}
      </div>
      <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 8, lineHeight: 1.5 }}>{meta.levels[value]}</div>
    </div>
  );
}

function PreviewFrame({ label, children }) {
  return (
    <div style={{ marginTop: 12, background: C.ink2, border: `1px solid ${C.line}`, borderRadius: RUND.karte, padding: "12px 14px" }}>
      <div style={{ fontFamily: MONO, fontSize: "0.6875rem", letterSpacing: 1, color: C.muted, textTransform: "uppercase", marginBottom: 10 }}>
        Vorschau · {label}
      </div>
      {children}
    </div>
  );
}

// `abr`/`proj` kommen als Prop herein, nicht aus einem Modul-Konstantenblock:
// die Zahlen hängen jetzt am Regelwerk der Runde und entstehen deshalb erst
// im Screen.
function AbrechnungPreview({ lvl, abr }) {
  return (
    <PreviewFrame label="Abrechnung">
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "0.6875rem", color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>gewertet</div>
        <div style={{ fontFamily: MONO, fontWeight: 700, color: C.akzent, fontSize: "2.5rem", lineHeight: 1.1, textShadow: `0 0 24px ${C.akzent}55` }}>
          +{abr.total}
        </div>
        <div style={{ fontFamily: MONO, fontSize: "0.8125rem", color: C.mint, marginTop: 2 }}>Rang #{abr.rank}</div>
      </div>
      {lvl === "voll" && (
        <div style={{ marginTop: 10, display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
          <MiniChip>Sieger-Boden +{abr.boden}</MiniChip>
          <MiniChip tone={C.coral}>Nähebonus +{abr.naehe}</MiniChip>
          {abr.tore > 0 && <MiniChip tone={C.mint}>Tore +{abr.tore}</MiniChip>}
        </div>
      )}
      {lvl !== "aus" && (
        <p style={{ fontSize: "0.6875rem", color: C.muted, marginTop: 10, lineHeight: 1.5, textAlign: "center" }}>
          Nur ein Tor daneben — die Nähe zahlt fast wie ein exakter Treffer.
        </p>
      )}
      {lvl === "aus" && (
        <p style={{ fontSize: "0.6875rem", color: C.muted, marginTop: 10, lineHeight: 1.5, textAlign: "center" }}>
          Nur Endpunkte und Rang — keine Mathematik, volle Spannung.
        </p>
      )}
    </PreviewFrame>
  );
}

function VorschauPreview({ lvl, proj }) {
  if (lvl === "aus") {
    return (
      <PreviewFrame label="Tippen">
        <div style={{ fontSize: "0.8125rem", color: C.muted, textAlign: "center", padding: "6px 0" }}>
          Keine Vorschau — du tippst blind.
        </div>
      </PreviewFrame>
    );
  }
  return (
    <PreviewFrame label="Tippen">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: "0.75rem", color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>Wenn exakt (Tipp 3:1)</span>
        <span style={{ fontFamily: MONO, fontSize: "1.25rem", fontWeight: 700, color: C.akzent }}>+{proj.points}</span>
      </div>
      <div style={{ marginTop: 6 }}>
        <span style={{ fontSize: "0.6875rem", color: C.akzent, border: `1px solid ${C.akzent}55`, borderRadius: RUND.pille, padding: "2px 8px" }}>
          Mutig · Quote {proj.exaktQuote?.toFixed(1)}
        </span>
      </div>
      {lvl === "voll" && (
        <div style={{ marginTop: 10, fontSize: "0.75rem", color: C.muted, lineHeight: 1.7 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Ergebnis-Nähe (roh)</span><span style={{ fontFamily: MONO }}>{proj.ergNaehe.toFixed(1)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Tor-Potenzial (roh)</span><span style={{ fontFamily: MONO }}>+{proj.goalsNet.toFixed(1)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Kombi bei exakt</span><span style={{ fontFamily: MONO }}>×{proj.combo}</span>
          </div>
        </div>
      )}
    </PreviewFrame>
  );
}

function MiniChip({ children, tone }) {
  return (
    <span style={{
      fontFamily: MONO, fontSize: "0.6875rem", color: tone || C.muted,
      border: `1px solid ${tone ? tone + "55" : C.line}`, borderRadius: RUND.pille, padding: "3px 8px",
    }}>{children}</span>
  );
}
