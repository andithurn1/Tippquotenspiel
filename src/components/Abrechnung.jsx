"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
import { darfSpotten } from "@/lib/spottPost";
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
  const { roundId, verwaist } = useCurrentRound();
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

  // 🔴 Der Rückfall MUSS erkennbar sein (24.08.2026, beim Leerzustands-Durchgang
  // gefunden): eine frisch angelegte Runde zeigte „Dein Tipp 4:1 → Endstand
  // 5:1 · GEWERTET +0" — vollständig, gewertet und **von einem echten Tipp
  // nicht zu unterscheiden**. Der Rückfall war beabsichtigt (ohne ihn eine
  // leere Fläche), nur sagte er nie, dass er einer ist.
  //
  // ⚠️ Nicht ersatzlos gestrichen: eine leere Abrechnung erklärt gar nichts.
  // Die Antwort ist, das Beispiel als Beispiel zu KENNZEICHNEN und den Weg
  // hinaus danebenzustellen — dieselbe Regel wie beim verwaisten Runden-Hinweis
  // ein paar Zeilen weiter unten.
  const istBeispiel = !eigener;
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
  // ── 🔴 SPOTT (SP1) ────────────────────────────────────────
  // ⚠️ Wer darf überhaupt? Das beantwortet `darfSpotten` — hier wird nichts
  // nachgerechnet. Ein zweiter Weg zu „darf ich" wäre eine zweite Wahrheit,
  // und ausgerechnet bei einer Funktion, die andere Leute trifft.
  const [spottAn, setSpottAn] = useState(null);      // userId, den ich aufziehe
  const [spottText, setSpottText] = useState("");
  const [spottStand, setSpottStand] = useState(null);
  const [gesendet, setGesendet] = useState([]);
  // ⚠️ Spieltag und Regelwerk kommen aus DEM Stand, den die Abrechnung
  // ohnehin anzeigt (`eigener`) — nicht aus einer zweiten Abfrage. Sonst
  // könnte der Spott an einem anderen Spieltag hängen als die Tabelle
  // darüber, und niemand verstünde, worauf er sich bezieht.
  const spottSpieltag = eigener
    ? { matchday: eigener.matchday, wettbewerb: eigener.snapshot?.wettbewerb ?? "" }
    : null;
  const spottRegeln = eigener?.rules?.spott ?? null;

  useEffect(() => {
    let live = true;
    if (!meId || !roundId) return undefined;
    getStore().listSpott?.({ userId: meId })
      .then((p) => { if (live) setGesendet((p ?? []).filter((s) => s.von_id === meId)); })
      .catch(() => {});
    return () => { live = false; };
  }, [meId, roundId]);

  const spottZiele = useMemo(() => {
    const ziele = new Set();
    if (!board || !meId || !spottSpieltag) return ziele;
    for (const z of board) {
      if (z.userId === meId) continue;
      const p = darfSpotten({
        board, vonId: meId, aufId: z.userId, spieltag: spottSpieltag,
        bereitsGesendet: gesendet, abgerechnet: true, spott: spottRegeln,
      });
      if (p.erlaubt) ziele.add(z.userId);
    }
    return ziele;
  }, [board, meId, gesendet, spottSpieltag, spottRegeln]);

  const spottSenden = async () => {
    setSpottStand(null);
    try {
      await getStore().spottSenden({
        vonId: meId, aufId: spottAn, roundId, spieltag: spottSpieltag, spruch: spottText,
      });
      setGesendet((v) => [...v, { von_id: meId, auf_id: spottAn, ...spottSpieltag }]);
      setSpottAn(null);
      setSpottText("");
    } catch (e) {
      // ⚠️ Der echte Grund. „Fehler" sagt dem Absender nichts darüber, ob er
      // es gleich nochmal versuchen soll.
      setSpottStand(String(e?.message ?? "Konnte nicht gesendet werden"));
    }
  };

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
      {/* 🔴 Die verwaiste Runde SAGEN, nicht stumm wegspringen (24.08.2026).
          Ohne diesen Hinweis stand die Abrechnung einfach auf einer anderen
          Runde als der, die der Spieler zuletzt gewählt hatte — und nichts
          erklärte, warum. */}
      {verwaist && (
        <div style={{
          width: "100%", maxWidth: "var(--tqs-schirm-breite)", marginBottom: 10, lineHeight: 1.45,
          background: C.ink2, border: `1px solid ${C.line}`, borderRadius: RUND.karte,
          padding: "10px 12px", fontSize: "0.8125rem", color: C.muted,
        }}>
          Deine zuletzt gewählte Runde gibt es nicht mehr — hier läuft jetzt die
          Demo-Runde. Über <strong style={{ color: C.text }}>wechseln</strong>
          {" "}kommst du mit einem Code zurück in eure Runde.
        </div>
      )}
      {/* 🔴 Beispiel als Beispiel kennzeichnen — Begründung bei `istBeispiel`. */}
      {istBeispiel && (
        <div style={{
          width: "100%", maxWidth: "var(--tqs-schirm-breite)", marginBottom: 10, lineHeight: 1.45,
          background: C.ink2, border: `1px solid ${C.bernstein}55`, borderRadius: RUND.karte,
          padding: "12px 14px",
        }}>
          <div style={{
            fontFamily: MONO, fontSize: "0.6875rem", color: C.bernstein,
            textTransform: "uppercase", letterSpacing: 1, marginBottom: 4,
          }}>Beispiel</div>
          <div style={{ fontSize: "0.9375rem", color: C.text, fontWeight: 700, lineHeight: 1.4 }}>
            In dieser Runde ist noch kein Tipp gewertet.
          </div>
          <div style={{ fontSize: "0.8125rem", color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
            Was unten steht, zeigt nur, wie eine Abrechnung aussieht — es sind
            nicht deine Punkte.
          </div>
          <Link href="/tippen" style={{
            ...TAPZIEL, display: "inline-flex", alignItems: "center", marginTop: 8,
            color: C.mint, textDecoration: "none", fontSize: "0.9375rem", fontWeight: 700,
          }}>Jetzt tippen →</Link>
        </div>
      )}
      <div style={{
        width: "100%", maxWidth: "var(--tqs-schirm-breite)", display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 10, fontFamily: MONO, fontSize: "0.75rem", color: C.muted,
      }}>
        <span>Runde: <span style={{ color: C.text }}>{roundName ?? "…"}</span></span>
        <Link href="/beitreten" style={{ ...TAPZIEL, display: "inline-flex", alignItems: "center", color: C.mint, textDecoration: "none", paddingLeft: 10 }}>wechseln</Link>
      </div>
      <div style={{
        width: "100%", maxWidth: "var(--tqs-schirm-breite)", position: "relative",
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
            <span style={{ fontFamily: MONO, fontSize: "0.75rem", letterSpacing: 2, color: C.muted, textTransform: "uppercase" }}>
              Spieltag {DATA.spieltag}
            </span>
            <span style={{ fontFamily: MONO, fontSize: "0.75rem", color: C.muted }}>deine abrechnung</span>
          </div>

          {/* Anzeigetafel */}
          <div style={{ ...show(1), marginTop: 18 }}>
            <div style={{ fontSize: "0.8125rem", color: C.muted, marginBottom: 8 }}>
              {DATA.home} <span style={{ opacity: .5 }}>vs</span> {DATA.away}
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
              <ScoreBox label="Dein Tipp" a={DATA.tippHome} b={DATA.tippAway} tone={C.muted} />
              <div style={{ display: "flex", alignItems: "center", color: C.muted, fontSize: "1.25rem" }}>→</div>
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
                <span style={{ fontSize: "0.8125rem", color: C.text, fontWeight: 600 }}>Distanz zum Ergebnis</span>
                <span style={{
                  fontFamily: MONO, fontSize: "0.75rem", color: C.coral,
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
              ...show(3), marginTop: 14, fontSize: "0.6875rem", color: C.muted, lineHeight: 1.5,
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
            <div style={{ fontSize: "0.75rem", color: C.muted, letterSpacing: 1, textTransform: "uppercase" }}>
              gewertet
            </div>
            <div style={{
              fontFamily: MONO, fontWeight: 700, color: C.akzent,
              fontSize: "4.25rem", lineHeight: 1, marginTop: 4,
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
              <p style={{ fontSize: "0.8125rem", color: C.muted, marginTop: 12, lineHeight: 1.5 }}>
                {wertungsSatz(me, gezeigt.result)}
              </p>
            )}
          </div>

          {/* Rang + Rollen-GIF */}
          <div style={{ ...show(5), marginTop: 20, display: "flex", gap: 10, alignItems: "stretch" }}>
            <div style={{ flex: 1, background: C.surface, borderRadius: RUND.karte, padding: "12px 14px", border: `1px solid ${C.line}` }}>
              <div style={{ fontSize: "0.6875rem", color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>Rang in der Runde</div>
              <div style={{ fontFamily: MONO, fontSize: "1.375rem", marginTop: 2, color: C.mint }}>
                {myRank ? `#${myRank}` : "…"}
              </div>
              {rankReact && (
                <div style={{ fontSize: "0.8125rem", marginTop: 6, fontWeight: 700, color: rankReact.tone }}>
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
              <span style={{ fontSize: "0.75rem", color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>Tabelle</span>
              <button onClick={() => setFair((f) => !f)} style={{
                ...TAPZIEL, fontFamily: MONO, fontSize: "0.6875rem", color: C.text, cursor: "pointer",
                background: C.surface, border: `1px solid ${C.line}`,
                borderRadius: RUND.pille, padding: "4px 10px",
              }}>
                {fair ? "fair verschoben" : "echte Werte"}
              </button>
            </div>
            {board == null ? (
              <div style={{ fontSize: "0.8125rem", color: C.muted, fontFamily: MONO, padding: "8px 0" }}>Tabelle lädt …</div>
            ) : shown.map((b, i) => (
              <div key={b.userId} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "7px 0",
                borderTop: i === 0 ? "none" : `1px solid ${C.line}`,
              }}>
                <span style={{ fontFamily: MONO, fontSize: "0.75rem", color: C.muted, width: 16 }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: "0.9375rem", color: b.userId === meId ? C.akzent : C.text, fontWeight: b.userId === meId ? 700 : 400 }}>
                  {b.name}
                  {b.userId === meId && <span style={{ color: C.coral, fontSize: "0.6875rem", marginLeft: 6 }}>● du</span>}
                </span>
                <span style={{
                  fontFamily: MONO, fontSize: "0.9375rem", fontVariantNumeric: "tabular-nums",
                  color: b.disp < 0 ? C.coral : C.text,
                }}>
                  {b.disp > 0 && !fair ? "+" : ""}{b.disp}
                </span>
                {/* ── 🔴 SPOTTEN (SP1) ────────────────────────
                    Der Knopf steht in der TABELLE, an der Zeile der Person —
                    dort sieht man, wer weit hinten liegt, und dort ist der
                    Gedanke. Eine eigene Seite dafür wäre ein Umweg um genau
                    den Moment herum, um den es geht.

                    ⚠️ Er erscheint nur, wenn `darfSpotten` JA sagt: Runde hat
                    Spott an, Spieltag abgerechnet, ich weit vorn, die Person
                    weit hinten, und heute noch keiner an sie. Ein Knopf, der
                    beim Drücken absagt, ist schlechter als keiner. */}
                {spottZiele.has(b.userId) && (
                  <button type="button" onClick={() => setSpottAn(b.userId)}
                    aria-label={`${b.name} aufziehen`}
                    style={{
                      ...TAPZIEL, cursor: "pointer", background: "transparent",
                      border: `1px solid ${C.coral}55`, borderRadius: RUND.pille,
                      color: C.coral, fontFamily: "inherit", fontSize: "0.6875rem",
                      padding: "4px 10px", minHeight: 0,
                    }}>
                    aufziehen
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* ── 🔴 SPOTT SCHREIBEN (SP1) ────────────────────
              ⚠️ Direkt unter der Tabelle, nicht in einem eigenen Fenster: der
              Gedanke entsteht beim Blick auf die Namen, und ein Fenster
              dazwischen macht aus einer Pointe eine Handlung.

              ⚠️ Der Empfänger sieht den Absender. Das steht hier auch dran —
              wer aufzieht, soll wissen, dass er dazu steht. */}
          {spottAn && (
            <div style={{
              marginTop: 14, background: `${C.coral}10`, border: `1px solid ${C.coral}44`,
              borderRadius: RUND.karte, padding: "12px 14px",
            }}>
              <div style={{ fontSize: "0.875rem", fontWeight: 700 }}>
                {board?.find((b) => b.userId === spottAn)?.name ?? "Mitspieler"} aufziehen
              </div>
              <p style={{ fontSize: "0.6875rem", color: C.muted, margin: "4px 0 8px", lineHeight: 1.45 }}>
                Erscheint in seiner Auswertung, sobald er das nächste Mal
                reinschaut — <strong>mit deinem Namen</strong>. Einer je Person
                und Spieltag.
              </p>
              <textarea value={spottText} rows={2} maxLength={180}
                onChange={(e) => setSpottText(e.target.value)}
                placeholder="Kurz und trocken ist besser als lang und gemein."
                style={{
                  width: "100%", boxSizing: "border-box", resize: "vertical",
                  background: C.ink, color: C.text, fontFamily: "inherit",
                  fontSize: "0.8125rem", padding: "8px 10px",
                  border: `1px solid ${C.line}`, borderRadius: RUND.karte,
                }} />
              {spottStand && (
                <div style={{ fontSize: "0.75rem", color: C.coral, marginTop: 6 }}>{spottStand}</div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button type="button" onClick={spottSenden} disabled={!spottText.trim()} style={{
                  ...TAPZIEL, flex: 1, cursor: spottText.trim() ? "pointer" : "default",
                  background: spottText.trim() ? C.coral : C.line, color: C.ink,
                  border: "none", borderRadius: RUND.karte, fontFamily: "inherit",
                  fontSize: "0.8125rem", fontWeight: 700,
                }}>Abschicken</button>
                <button type="button" onClick={() => { setSpottAn(null); setSpottStand(null); }} style={{
                  ...TAPZIEL, flex: 1, cursor: "pointer", background: "transparent",
                  color: C.muted, border: `1px solid ${C.line}`, borderRadius: RUND.karte,
                  fontFamily: "inherit", fontSize: "0.8125rem",
                }}>Abbrechen</button>
              </div>
            </div>
          )}

          {/* Replay */}
          <button onClick={() => { setStage(0); setKey((k) => k + 1); }} style={{
            ...TAPZIEL, ...show(5), marginTop: 18, width: "100%", cursor: "pointer",
            background: C.akzent, color: C.ink, fontWeight: 700, fontSize: "0.9375rem",
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
      <div style={{ fontSize: "0.6875rem", color: C.muted, marginBottom: 6 }}>{label}</div>
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
            fontSize: "0.6875rem", marginTop: 6, textAlign: "center",
            color: s.reached ? (s.hot ? C.coral : C.muted) : C.muted,
            fontWeight: s.hot ? 700 : 400,
          }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

