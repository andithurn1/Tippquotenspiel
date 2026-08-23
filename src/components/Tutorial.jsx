"use client";

import { useEffect, useMemo, useState } from "react";
import BackLink from "@/components/BackLink";
import Begriff from "@/components/Begriff";
import { createMockOddsSource, scoreTip, sanitizeRules, DEFAULT_RULES } from "@/lib/engine";
import { previewArchetypes } from "@/lib/rulePreview";
import { getStore } from "@/lib/store";
import { useCurrentRound } from "@/components/RoundProvider";
import { C, MONO, SCHRIFT, RUND } from "@/lib/theme";

// Ein echtes Rechenbeispiel (Engine, nicht ausgedacht): JOR-ESP real 5:1,
// Tipp 4:1 → „hauchdünn" (richtiger Sieger, ein Tor daneben).
const odds = createMockOddsSource();
const SNAP = odds.getSnapshot("JOR-ESP");
const RESULT = odds.getResult("JOR-ESP");

// 🔴 Gerechnet wird mit dem Regelwerk DER RUNDE, nicht mit `DEFAULT_RULES`.
// Die Zahlen hier lesen sich als „so viel bekommst du" — in einer Runde mit
// eigenem Regelwerk waren sie schlicht falsch, und zwar an der Stelle, an der
// jemand das Spiel gerade erst versteht.
export default function Tutorial() {
  const { roundId } = useCurrentRound();
  const [rules, setRules] = useState(DEFAULT_RULES);
  useEffect(() => {
    let live = true;
    getStore().getRound(roundId)
      .then((r) => { if (live) setRules(sanitizeRules(r?.rules ?? DEFAULT_RULES)); })
      .catch(() => {});
    return () => { live = false; };
  }, [roundId]);

  const EX_HAUCH = useMemo(
    () => scoreTip({ home: 4, away: 1, goals: { home: [], away: [] } }, RESULT, SNAP, rules), [rules]);
  const EX_EXAKT = useMemo(
    () => scoreTip({ home: 5, away: 1, goals: { home: [], away: [] } }, RESULT, SNAP, rules), [rules]);
  const ARCHE = useMemo(() => previewArchetypes(rules), [rules]);
  // Admin-Beispiel: DERSELBE Datensatz, nur mit eingeschaltetem Favoriten-Malus.
  // Bewusst gegen das Regelwerk der Runde gestellt, nicht gegen die Vorgabe —
  // sonst zeigte der Vergleich zwei Unterschiede statt einem.
  const ARCHE_MALUS = useMemo(() => previewArchetypes({ ...rules, favFlopPenalty: 12 }), [rules]);

  return (
    <div style={{
      minHeight: "100vh", background: C.ink, color: C.text,
      fontFamily: SCHRIFT,
      padding: "28px 16px", display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <BackLink href="/menu" label="Menü" />
      <div style={{ width: "100%", maxWidth: 440 }}>
        <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: 2, color: C.muted, textTransform: "uppercase" }}>
          Tutorial
        </span>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "8px 0 6px" }}>Wie das Tippspiel funktioniert</h1>
        <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginTop: 0 }}>
          Tippe mutig — nicht nur richtig. Angetippte Wörter wie{" "}
          <Begriff term="quote" /> erklären sich selbst. Kein Echtgeld, nur Ehre.
        </p>

        {/* 1) Tippen */}
        <Section n="1" title="So gibst du einen Tipp ab">
          <ul style={ulStyle}>
            <li><b>Endstand tippen</b> — z.B. 2:1. Je unwahrscheinlicher (höhere <Begriff term="quote" />),
              desto mehr Punkte, wenn er aufgeht.</li>
            <li><b><Begriff term="torschuetzen">Torschützen</Begriff></b> — zusätzlich tippst du, wer trifft.
              Optional, gibt Extrapunkte.</li>
            <li>Beim Abgeben wird die <Begriff term="snapshot" /> eingefroren — alle bekommen dieselbe, egal wann sie tippen.</li>
          </ul>
        </Section>

        {/* 2) Punkte */}
        <Section n="2" title="So entstehen deine Punkte">
          <p style={pStyle}>
            Entscheidend ist die <Begriff term="ebene" />. Von gut nach knapp:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, margin: "10px 0" }}>
            <Ebene tone={C.mint} label="Exakt" desc="Endstand genau getroffen — volle Punkte." />
            <Ebene tone={C.akzent} label="Abstand" desc="Tordifferenz stimmt (z.B. 3:1 statt 2:0)." />
            <Ebene tone={C.indigo} label="Tendenz" desc="Nur der Sieger stimmt." />
            <Ebene tone={C.coral} label="Daneben" desc="Sieger falsch — aber die Toranzahl kann trotzdem zählen." />
          </div>
          <p style={pStyle}>
            Dazu kommen <Begriff term="sieger-boden" />, <Begriff term="naehebonus" />,{" "}
            <Begriff term="team-tore" /> und die <Begriff term="kombi" /> mit deinen Torschützen.
          </p>

          <div style={exampleBox}>
            <div style={exampleHead}>Rechenbeispiel · real 5:1</div>
            <ExRow tip="5:1" note="exakt getroffen" pts={EX_EXAKT.total} tone={C.mint} />
            <ExRow tip="4:1" note="hauchdünn — 1 Tor daneben" pts={EX_HAUCH.total} tone={C.akzent} />
            <p style={{ fontSize: 11, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
              Sieh: Ein Tor daneben bei einem so unwahrscheinlichen 5:1 zahlt fast wie ein exakter Treffer —
              genau das ist der <Begriff term="naehebonus" />.
            </p>
          </div>

          <Details summary="Beispiele: verschiedene Ausgänge im Vergleich">
            {ARCHE.map((r) => (
              <div key={r.key} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  {r.label} <span style={{ color: C.muted, fontFamily: MONO, fontWeight: 400 }}>({r.real.home}:{r.real.away})</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {r.tips.map((t, i) => (
                    <span key={i} style={chip(t.points === r.best && r.best > 0)}>
                      {t.kind} {t.tip.home}:{t.tip.away} · <b>{t.points}</b>
                    </span>
                  ))}
                </div>
              </div>
            ))}
            <p style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>
              Bei „Außenseiter siegt" zahlt der korrekt getippte Außenseiter-Sieg ein Vielfaches des
              Favoriten-Tipps — Mut, der aufgeht, wird belohnt.
            </p>
          </Details>
        </Section>

        {/* 3) Admin */}
        <Section n="3" title="Für Admins: eigene Runde & Regeln">
          <p style={pStyle}>
            Beim <b>Spiel erstellen</b> legst du das Regelwerk fest — starte mit einem Preset und dreh dann frei:
          </p>
          <ul style={ulStyle}>
            <li><b>Schärfe (k)</b> — wie stark die Belohnung mit jedem Tor Abstand abfällt.</li>
            <li><b><Begriff term="underdog-boost" /></b> — belohnt vorhergesagte Überraschungen extra.</li>
            <li><b><Begriff term="favoriten-malus" /></b> — bestraft, wer stur auf den Favoriten setzt, wenn der patzt.</li>
            <li>Beide skalieren über die <Begriff term="ramp" /> (ab welcher Quote jemand Außenseiter ist).</li>
            <li><b><Begriff term="team-filter" /></b> — Runde auf bestimmte Teams beschränken.</li>
            <li><b><Begriff term="skalierung" /></b> — nur Optik, ändert die Fairness nicht.</li>
          </ul>
          <p style={pStyle}>
            Fertiges Regelwerk teilst du per <Begriff term="creator-code" />, deine Runde per{" "}
            <Begriff term="beitritts-code" />.
          </p>

          <Details summary="Admin-Beispiel: wie der Favoriten-Malus wirkt">
            <p style={{ fontSize: 12, color: C.muted, marginBottom: 8, lineHeight: 1.5 }}>
              Spielart „Außenseiter siegt" — dieselben Tipps, links ohne, rechts mit Favoriten-Malus:
            </p>
            {(() => {
              const base = ARCHE.find((r) => r.key === "aussenseiter");
              const mal = ARCHE_MALUS.find((r) => r.key === "aussenseiter");
              return base.tips.map((t, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderTop: i === 0 ? "none" : `1px solid ${C.line}` }}>
                  <span style={{ fontSize: 13 }}>{t.kind} <span style={{ fontFamily: MONO, color: C.muted }}>{t.tip.home}:{t.tip.away}</span></span>
                  <span style={{ fontFamily: MONO, fontSize: 13 }}>
                    <span style={{ color: C.muted }}>{t.points}</span>
                    <span style={{ color: C.muted }}> → </span>
                    <span style={{ color: mal.tips[i].points < t.points ? C.coral : C.text, fontWeight: 700 }}>{mal.tips[i].points}</span>
                  </span>
                </div>
              ));
            })()}
            <p style={{ fontSize: 11, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
              Nur der Favoriten-Tipp bricht ein — der korrekt getippte Außenseiter-Sieg bleibt voll.
            </p>
          </Details>
        </Section>

        <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
          <a href="/tippen" style={cta(C.akzent)}>Jetzt tippen →</a>
          <a href="/erstellen" style={cta(C.surface2, C.text)}>Runde erstellen</a>
        </div>
      </div>
    </div>
  );
}

const ulStyle = { margin: "6px 0", paddingLeft: 18, fontSize: 13, lineHeight: 1.7, color: C.text };
const pStyle = { fontSize: 13, color: C.text, lineHeight: 1.6, margin: "6px 0" };

function Section({ n, title, children }) {
  return (
    <div style={{ marginTop: 22, paddingTop: 18, borderTop: `1px solid ${C.line}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{
          width: 24, height: 24, borderRadius: RUND.pille, background: `${C.akzent}22`, color: C.akzent,
          border: `1px solid ${C.akzent}55`, display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: MONO, fontSize: 12, fontWeight: 700, flexShrink: 0,
        }}>{n}</span>
        <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Ebene({ tone, label, desc }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ width: 10, height: 10, borderRadius: RUND.pille, background: tone, flexShrink: 0 }} />
      <span style={{ fontSize: 13 }}><b>{label}</b> <span style={{ color: C.muted }}>— {desc}</span></span>
    </div>
  );
}

const exampleBox = { marginTop: 14, background: `${C.akzent}10`, border: `1px solid ${C.akzent}33`, borderRadius: RUND.karte, padding: "12px 14px" };
const exampleHead = { fontFamily: MONO, fontSize: 11, letterSpacing: 1, color: C.akzent, textTransform: "uppercase", marginBottom: 8 };

function ExRow({ tip, note, pts, tone }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0" }}>
      <span style={{ fontSize: 13 }}><span style={{ fontFamily: MONO, color: tone, fontWeight: 700 }}>{tip}</span> <span style={{ color: C.muted }}>· {note}</span></span>
      <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, color: tone }}>{pts}</span>
    </div>
  );
}

function chip(best) {
  return {
    fontFamily: MONO, fontSize: 12, padding: "4px 8px", borderRadius: RUND.karte,
    background: best ? `${C.akzent}18` : C.surface, color: best ? C.akzent : C.muted,
    border: `1px solid ${best ? C.akzent + "55" : C.line}`,
  };
}

function Details({ summary, children }) {
  return (
    <details style={{ marginTop: 12, background: C.ink2, border: `1px solid ${C.line}`, borderRadius: RUND.karte, padding: "0 14px" }}>
      <summary style={{
        cursor: "pointer", padding: "12px 0", fontSize: 13, fontWeight: 600, color: C.mint,
        listStyle: "none", display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{ fontSize: 11 }}>▶</span> {summary}
      </summary>
      <div style={{ paddingBottom: 14 }}>{children}</div>
    </details>
  );
}

function cta(bg, color) {
  return {
    flex: 1, textAlign: "center", textDecoration: "none", padding: "12px 0", borderRadius: RUND.karte,
    background: bg, color: color ?? C.ink, fontWeight: 700, fontSize: 15,
    border: color ? `1px solid ${C.line}` : "none",
  };
}
