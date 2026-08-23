"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createMockOddsSource, scoreTip, DEFAULT_RULES } from "@/lib/engine";
import { getStore } from "@/lib/store";
import { beschreibeTippEinfluss, mitTippEinfluss } from "@/lib/tippEinfluss";
import { useAuth } from "@/components/AuthProvider";
import { usePrefs } from "@/components/PrefsProvider";
import { useCurrentRound } from "@/components/RoundProvider";
import BackLink from "@/components/BackLink";
import ReactionGif from "@/components/ReactionGif";
import Ertragsquellen from "@/components/Ertragsquellen";
import { tipScenario, rankReaction } from "@/lib/reactions";
import { C, MONO, SCHRIFT, RUND } from "@/lib/theme";
import { TAPZIEL } from "@/lib/tapziel";

// ── Farb-Tokens ─────────────────────────────────────────────
// Nächtliches Flutlicht-Stadion: tiefes Indigo, Flutlicht-Gold,
// Zocker-Koralle, Aufstiegs-Mint. Scores als Anzeigetafel (mono).


// ── Eine Quelle: Engine rechnet, Store liefert das Leaderboard ──
//
// 🔴 Diese Zahl ist die auffälligste der ganzen App — und sie stand bis
// 05.08.2026 auf DEMO-Daten: ein fest verdrahteter Tipp, gewertet unter
// `DEFAULT_RULES`, während die Tabelle darunter aus dem Store kam und unter
// dem Regelwerk DER RUNDE gerechnet war. In jeder Runde, die nicht die
// Vorgabe fährt, standen Hero-Zahl und Tabellenzeile desselben Spielers auf
// verschiedenen Regeln. Dasselbe galt für die Aufschlüsselung darunter, der
// gar kein `rules` übergeben wurde.
//
// Jetzt wird der ZULETZT GEWERTETE EIGENE TIPP gezeigt, unter dem Regelwerk,
// das an dessen Spieltag galt (`getRegelnFuer`) — dieselbe Rechnung, die im
// Leaderboard steht. Der Demo-Fall bleibt als Rückfall für eine Runde ohne
// jeden gewerteten Tipp; ohne ihn stünde beim ersten Öffnen eine leere Fläche.
const odds = createMockOddsSource();
const DEMO = {
  snapshot: odds.getSnapshot("JOR-ESP"),
  result: odds.getResult("JOR-ESP"),
  tip: { home: 4, away: 1, goals: { home: ["Al-Naimat", "Al-Naimat"], away: ["Yamal", ""] } },
  matchday: 14,
  rules: DEFAULT_RULES,
};

// Ein Satz zur Wertung, ABGELEITET statt behauptet. Hier stand einmal fest
// „Das reale 5:1 war ein Freak-Ergebnis … du warst nur ein Tor daneben" —
// bei jedem anderen Tipp war das schlicht falsch.
function wertungsSatz(s, actual) {
  if (s.ebene === "exakt") return "Exakt getroffen — die volle Quote dieses Endstands.";
  if (s.dist === 1) {
    return `Beim ${actual.home}:${actual.away} warst du ein Tor daneben — die Nähe zahlt fast so viel `
      + "wie ein exakter Treffer.";
  }
  if (s.ebene === "abstand") return "Die Sieghöhe stimmte — dafür zahlt die Abstands-Ebene.";
  if (s.ebene === "tendenz") return "Sieger richtig, Ergebnis daneben — der Sieger-Boden trägt.";
  return "Diesmal war nichts dabei. Die Quote des realen Ergebnisses hat niemand bezahlt.";
}

function useCountUp(target, run, ms = 1100) {
  const [v, setV] = useState(0);
  const raf = useRef();
  useEffect(() => {
    if (!run) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setV(target); return; }
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setV(target * e);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, run, ms]);
  return v;
}

export default function Abrechnung() {
  const { user } = useAuth();
  const { prefs } = usePrefs();
  const { roundId } = useCurrentRound();
  const lvl = prefs.abrechnung;             // voll | dezent | aus
  const meId = user?.id ?? "u-du";          // im Mock „u-du", live die echte Id
  const [stage, setStage] = useState(0);   // 0..5 gestaffelte Enthüllung
  const [key, setKey] = useState(0);        // Replay
  const [fair, setFair] = useState(false);  // Ranking-Toggle
  const [board, setBoard] = useState(null); // Leaderboard aus dem Store
  const [roundName, setRoundName] = useState(null);
  // Der zuletzt gewertete eigene Tipp — samt dem Regelwerk seines Spieltags.
  const [eigener, setEigener] = useState(null);

  useEffect(() => {
    let live = true;
    getStore().getLeaderboard(roundId)
      .then((b) => { if (live) setBoard(b); })
      .catch(() => { if (live) setBoard([]); });
    getStore().getRound(roundId)
      .then((r) => { if (live) setRoundName(r?.name ?? null); })
      .catch(() => {});
    Promise.all([
      getStore().getRoundEntries(roundId),
      getStore().getRegelnFuer?.(roundId) ?? Promise.resolve(null),
      getStore().getRound(roundId),
    ]).then(([entries, lage, round]) => {
      if (!live) return;
      // Der JÜNGSTE gewertete Tipp — chronologisch, nicht nach Spieltags-Zahl:
      // über mehrere Wettbewerbe sagt die Zahl nichts über die Reihenfolge.
      // 🔴 GEMESSEN am 07.08.2026: 53 von 120 Tipps standen hier anders als im
      // Leaderboard, bis zu 445 Punkte Unterschied. Grund: `scoreLeaderboard`
      // rechnet über `mitTippEinfluss(entries, rules)` — das Ergebnis-Raster
      // wird von den Tipps der Runde mitbewegt —, diese Ansicht nahm aber den
      // ROHEN Snapshot des Eintrags. Bei eingeschaltetem `tippEinfluss` zeigte
      // dieselbe Wertung zwei Zahlen: die große oben und die Tabellenzeile
      // desselben Spielers darunter.
      //
      // ⚠️ Gemischt wird mit dem RUNDEN-Regelwerk, nicht mit dem des
      // Spieltags: die Mischung ist eine Eigenschaft der Runde und muss
      // dieselbe sein wie im Leaderboard. Ist die Regel aus (Vorgabe), kommen
      // die Einträge unverändert zurück — kein Kopieren, kein Unterschied.
      const gewertet = mitTippEinfluss(entries ?? [], round?.rules ?? DEFAULT_RULES);
      const meine = gewertet
        .filter((e) => e.userId === meId && e.result && e.snapshot)
        .sort((a, b) => new Date(a.kickoff ?? 0) - new Date(b.kickoff ?? 0));
      const letzter = meine[meine.length - 1] ?? null;
      setEigener(letzter ? {
        snapshot: letzter.snapshot, result: letzter.result, tip: letzter.tip,
        matchday: letzter.matchday,
        // Das Regelwerk, das an DIESEM Spieltag galt — dieselbe Quelle wie im
        // Leaderboard. Ohne sie wäre eine beschlossene Änderung hier unsichtbar.
        rules: (lage?.regelnFuer ? lage.regelnFuer(letzter) : null) ?? round?.rules ?? DEFAULT_RULES,
      } : null);
    }).catch(() => {});
    return () => { live = false; };
  }, [roundId, meId]);

  const gezeigt = eigener ?? DEMO;
  const me = scoreTip(gezeigt.tip, gezeigt.result, gezeigt.snapshot, gezeigt.rules);
  const TIP_REACTION = tipScenario(me);   // GIF nach Tipp-Genauigkeit
  const DATA = {
    spieltag: gezeigt.matchday,
    home: gezeigt.snapshot.home,
    away: gezeigt.snapshot.away,
    tippHome: gezeigt.tip.home, tippAway: gezeigt.tip.away,
    realHome: gezeigt.result.home, realAway: gezeigt.result.away,
    total: me.total,                              // Display-Punkte (skaliert)
    dist: me.dist,
  };

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const gaps = reduce ? [0, 0, 0, 0, 0, 0] : [200, 900, 1500, 2200, 3000, 4100];
    const ts = gaps.map((g, i) => setTimeout(() => setStage(i), g));
    return () => ts.forEach(clearTimeout);
  }, [key]);

  const punkte = useCountUp(DATA.total, stage >= 4);

  const myRank = board?.find((b) => b.userId === meId)?.rank ?? null;
  const rankReact = rankReaction(myRank, board?.length ?? null); // Rollen-GIF (Sieger/…)
  const min = board?.length ? Math.min(...board.map((b) => b.total)) : 0;
  const shown = (board ?? [])
    .map((b) => ({ ...b, disp: fair ? b.total - min : b.total }))
    .sort((a, b) => b.disp - a.disp);

  const show = (n) => ({
    opacity: stage >= n ? 1 : 0,
    transform: stage >= n ? "translateY(0)" : "translateY(14px)",
    transition: "opacity .6s ease, transform .6s cubic-bezier(.2,.7,.2,1)",
  });

  return (
    <div style={{
      minHeight: "100vh", background: C.ink, color: C.text,
      fontFamily: SCHRIFT,
      padding: "28px 16px", display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <BackLink href="/menu" label="Menü" />
      <div style={{
        width: "100%", maxWidth: 400, display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 10, fontFamily: MONO, fontSize: 12, color: C.muted,
      }}>
        <span>Runde: <span style={{ color: C.text }}>{roundName ?? "…"}</span></span>
        <Link href="/beitreten" style={{ ...TAPZIEL, display: "inline-flex", alignItems: "center", color: C.mint, textDecoration: "none", paddingLeft: 10 }}>wechseln</Link>
      </div>
      <div style={{
        width: "100%", maxWidth: 400, position: "relative",
        borderRadius: RUND.schirm, overflow: "hidden",
        background: `radial-gradient(120% 80% at 50% -10%, ${C.ink2} 0%, ${C.ink} 60%)`,
        border: `1px solid ${C.line}`,
        boxShadow: "0 30px 80px -30px rgba(0,0,0,0.8)",
      }}>
        {/* Flutlicht-Schein oben */}
        <div style={{
          position: "absolute", top: -90, left: "50%", transform: "translateX(-50%)",
          width: 320, height: 200, pointerEvents: "none",
          background: `radial-gradient(circle, ${C.akzent}22 0%, transparent 70%)`,
        }} />

        <div style={{ position: "relative", padding: "26px 22px 22px" }}>
          {/* Eyebrow */}
          <div style={{ ...show(0), display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: 2, color: C.muted, textTransform: "uppercase" }}>
              Spieltag {DATA.spieltag}
            </span>
            <span style={{ fontFamily: MONO, fontSize: 12, color: C.muted }}>deine abrechnung</span>
          </div>

          {/* Anzeigetafel */}
          <div style={{ ...show(1), marginTop: 18 }}>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 8 }}>
              {DATA.home} <span style={{ opacity: .5 }}>vs</span> {DATA.away}
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
              <ScoreBox label="Dein Tipp" a={DATA.tippHome} b={DATA.tippAway} tone={C.muted} />
              <div style={{ display: "flex", alignItems: "center", color: C.muted, fontSize: 20 }}>→</div>
              <ScoreBox label="Endstand" a={DATA.realHome} b={DATA.realAway} tone={C.akzent}
                stamped={stage >= 2} big />
            </div>
          </div>

          {/* Distanz / Nähe — nur bei voller Transparenz */}
          {lvl === "voll" && (
            <div style={{ ...show(3), marginTop: 20 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
              }}>
                <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>Distanz zum Ergebnis</span>
                <span style={{
                  fontFamily: MONO, fontSize: 12, color: C.coral,
                  border: `1px solid ${C.coral}55`, borderRadius: RUND.pille, padding: "2px 8px",
                }}>{DATA.dist} {DATA.dist === 1 ? "Tor — hauchdünn" : "Tore"}</span>
              </div>
              <DistanceLadder active={stage >= 3} wertung={me} />
            </div>
          )}

          {/* 🔴 Tipp-Einfluss — der letzte Regel-Block ohne Spieler-Anzeige
              (gefunden mit `npm run sicht`, 07.08.2026). Die Regel bewegt das
              Ergebnis-Raster mit den Tipps der Runde und greift beim WERTEN
              (`mitTippEinfluss` in `scoreLeaderboard`), nicht beim Tippen —
              deshalb steht der Satz hier und nicht in der Tippabgabe.
              `beschreibeTippEinfluss()` gab es längst; aufgerufen wurde es nur
              in der Spielerstellung, also im ADMIN-Screen.
              ⚠️ Nur wenn die Regel wirklich an ist: ein Satz über eine
              abgeschaltete Mechanik erklärt nichts und lässt den Spieler nach
              einem Effekt suchen, den es nicht gibt. */}
          {lvl === "voll" && gezeigt?.rules?.tippEinfluss?.staerke > 0 && (
            <div style={{
              ...show(3), marginTop: 14, fontSize: 11, color: C.muted, lineHeight: 1.5,
              borderLeft: `2px solid ${C.line}`, paddingLeft: 10,
            }}>
              <strong style={{ color: C.text }}>Eure Tipps zählen mit: </strong>
              {beschreibeTippEinfluss(gezeigt.rules.tippEinfluss)}
            </div>
          )}

          {/* Reaktions-GIF zum Tipp — erscheint zum Höhepunkt */}
          <div style={{ ...show(4), marginTop: 22, display: "flex", justifyContent: "center" }}>
            <ReactionGif reaction={TIP_REACTION} size={132} />
          </div>

          {/* Punkte-Zähler */}
          <div style={{ ...show(4), marginTop: 14, textAlign: "center" }}>
            <div style={{ fontSize: 12, color: C.muted, letterSpacing: 1, textTransform: "uppercase" }}>
              gewertet
            </div>
            <div style={{
              fontFamily: MONO, fontWeight: 700, color: C.akzent,
              fontSize: 68, lineHeight: 1, marginTop: 4,
              fontVariantNumeric: "tabular-nums",
              textShadow: `0 0 34px ${C.akzent}66`,
            }}>
              +{Math.round(punkte)}
            </div>
            {/* Aufgeschlüsselt statt Chips: Sieger-Boden und Nähe KONKURRIEREN
                (der größere gewinnt), sie addieren sich nicht — nebeneinander
                gezeigte Chips haben genau das fälschlich suggeriert. */}
            {lvl !== "aus" && (
              <div style={{ textAlign: "left" }}>
                <Ertragsquellen tip={gezeigt.tip} actual={gezeigt.result} snap={gezeigt.snapshot}
                  rules={gezeigt.rules} stufe={lvl} />
              </div>
            )}
            {lvl !== "aus" && (
              <p style={{ fontSize: 13, color: C.muted, marginTop: 12, lineHeight: 1.5 }}>
                {wertungsSatz(me, gezeigt.result)}
              </p>
            )}
          </div>

          {/* Rang + Rollen-GIF */}
          <div style={{ ...show(5), marginTop: 20, display: "flex", gap: 10, alignItems: "stretch" }}>
            <div style={{ flex: 1, background: C.surface, borderRadius: RUND.karte, padding: "12px 14px", border: `1px solid ${C.line}` }}>
              <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>Rang in der Runde</div>
              <div style={{ fontFamily: MONO, fontSize: 22, marginTop: 2, color: C.mint }}>
                {myRank ? `#${myRank}` : "…"}
              </div>
              {rankReact && (
                <div style={{ fontSize: 13, marginTop: 6, fontWeight: 700, color: rankReact.tone }}>
                  {rankReact.emoji} {rankReact.label}
                </div>
              )}
            </div>
            {rankReact && (
              <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
                <ReactionGif reaction={rankReact} size={92} />
              </div>
            )}
          </div>

          {/* Mini-Leaderboard mit Toggle */}
          <div style={{ ...show(5), marginTop: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>Tabelle</span>
              <button onClick={() => setFair((f) => !f)} style={{
                ...TAPZIEL, fontFamily: MONO, fontSize: 11, color: C.text, cursor: "pointer",
                background: C.surface, border: `1px solid ${C.line}`,
                borderRadius: RUND.pille, padding: "4px 10px",
              }}>
                {fair ? "fair verschoben" : "echte Werte"}
              </button>
            </div>
            {board == null ? (
              <div style={{ fontSize: 13, color: C.muted, fontFamily: MONO, padding: "8px 0" }}>Tabelle lädt …</div>
            ) : shown.map((b, i) => (
              <div key={b.userId} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "7px 0",
                borderTop: i === 0 ? "none" : `1px solid ${C.line}`,
              }}>
                <span style={{ fontFamily: MONO, fontSize: 12, color: C.muted, width: 16 }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: 15, color: b.userId === meId ? C.akzent : C.text, fontWeight: b.userId === meId ? 700 : 400 }}>
                  {b.name}
                  {b.userId === meId && <span style={{ color: C.coral, fontSize: 11, marginLeft: 6 }}>● du</span>}
                </span>
                <span style={{
                  fontFamily: MONO, fontSize: 15, fontVariantNumeric: "tabular-nums",
                  color: b.disp < 0 ? C.coral : C.text,
                }}>
                  {b.disp > 0 && !fair ? "+" : ""}{b.disp}
                </span>
              </div>
            ))}
          </div>

          {/* Replay */}
          <button onClick={() => { setStage(0); setKey((k) => k + 1); }} style={{
            ...TAPZIEL, ...show(5), marginTop: 18, width: "100%", cursor: "pointer",
            background: C.akzent, color: C.ink, fontWeight: 700, fontSize: 15,
            border: "none", borderRadius: RUND.karte, padding: "13px 0",
          }}>
            Nochmal ansehen
          </button>
        </div>
      </div>
    </div>
  );
}

function ScoreBox({ label, a, b, tone, big, stamped }) {
  return (
    <div style={{
      flex: 1, background: C.surface, borderRadius: RUND.karte, padding: "10px 12px 12px",
      border: `1px solid ${C.line}`, textAlign: "center",
      transform: stamped ? "scale(1)" : big ? "scale(0.9)" : "scale(1)",
      transition: "transform .5s cubic-bezier(.2,1.5,.4,1)",
    }}>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>{label}</div>
      <div style={{
        fontFamily: MONO, fontWeight: 700, color: tone,
        fontSize: big ? 30 : 26, letterSpacing: 1,
        fontVariantNumeric: "tabular-nums",
        textShadow: big && stamped ? `0 0 22px ${C.akzent}55` : "none",
      }}>
        {a}:{b}
      </div>
    </div>
  );
}

function DistanceLadder({ active, wertung }) {
  // Leiter: Sieger → Nähe → Exakt. Stufen kommen aus der Engine-Wertung.
  const steps = [
    { label: "Sieger", reached: wertung.winnerRight },
    { label: `Nähe (Δ${wertung.dist})`, reached: wertung.dist > 0 && wertung.resultPart > 0, hot: true },
    { label: "Exakt", reached: wertung.dist === 0 },
  ];
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {steps.map((s, i) => (
        <div key={s.label} style={{ flex: 1 }}>
          <div style={{
            height: 8, borderRadius: RUND.pille,
            background: s.reached ? (s.hot ? C.coral : C.akzent) : C.surface,
            border: s.reached ? "none" : `1px solid ${C.line}`,
            transform: active ? "scaleX(1)" : "scaleX(0)",
            transformOrigin: "left",
            transition: `transform .5s ease ${i * 0.18}s`,
            boxShadow: s.hot && s.reached && active ? `0 0 16px ${C.coral}aa` : "none",
          }} />
          <div style={{
            fontSize: 11, marginTop: 6, textAlign: "center",
            color: s.reached ? (s.hot ? C.coral : C.muted) : C.muted,
            fontWeight: s.hot ? 700 : 400,
          }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

