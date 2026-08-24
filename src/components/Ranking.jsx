"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getStore } from "@/lib/store";
import { useAuth } from "@/components/AuthProvider";
import { useCurrentRound } from "@/components/RoundProvider";
import BackLink from "@/components/BackLink";
import { C, MONO, SCHRIFT, RUND } from "@/lib/theme";
import { TAPZIEL } from "@/lib/tapziel";

// Schlankes, echtes Ranking für die aktive Runde — im Unterschied zu
// Abrechnung.jsx (feste JOR-ESP-Demo-Choreographie) funktioniert das hier für
// jede Runde und jedes Match, weil es nur getLeaderboard(roundId) anzeigt.
export default function Ranking() {
  const { user } = useAuth();
  const meId = user?.id ?? null;
  const { roundId } = useCurrentRound();
  const [board, setBoard] = useState(null);
  const [roundName, setRoundName] = useState(null);
  // 🔴 Wer hat wen getroffen. Die Marke „−340 Duell" allein ist die halbe
  // Nachricht: bei einer Mechanik, deren ganzer Sinn ist, dass ein ANDERER es
  // war, muss der Name dabeistehen. Kommt aus dem Store (`getDuellVorgaenge`)
  // und wird NICHT nachgerechnet — die Beträge hängen am Deckel und an der
  // Reihenfolge (Runden-Schicht, Frage 4).
  const [duelle, setDuelle] = useState([]);

  useEffect(() => {
    let live = true;
    getStore().getLeaderboard(roundId).then((b) => { if (live) setBoard(b); }).catch(() => { if (live) setBoard([]); });
    getStore().getRound(roundId).then((r) => { if (live) setRoundName(r?.name ?? null); }).catch(() => {});
    (getStore().getDuellVorgaenge?.(roundId) ?? Promise.resolve([]))
      .then((v) => { if (live) setDuelle(v ?? []); }).catch(() => {});
    return () => { live = false; };
  }, [roundId]);

  // Was mich getroffen hat und was ich selbst geholt habe — chronologisch
  // rückwärts, das Neueste zuerst.
  const meineDuelle = duelle
    .filter((v) => v.vonUserId === meId || v.aufUserId === meId)
    .sort((a, b) => b.spieltag - a.spieltag);



  return (
    <div style={{
      minHeight: "100vh", background: C.ink, color: C.text,
      fontFamily: SCHRIFT,
      padding: "28px 16px", display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <BackLink href="/hub" label="Tippspiel" />
      <div style={{
        width: "100%", maxWidth: "var(--tqs-schirm-breite)", position: "relative",
        borderRadius: RUND.schirm, overflow: "hidden",
        background: `radial-gradient(120% 80% at 50% -10%, ${C.ink2} 0%, ${C.ink} 60%)`,
        border: `1px solid ${C.line}`, boxShadow: "0 30px 80px -30px rgba(0,0,0,0.8)",
      }}>
        <div style={{ position: "relative", padding: "26px 22px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: MONO, fontSize: "0.75rem", letterSpacing: 2, color: C.muted, textTransform: "uppercase" }}>
              Ranking
            </span>
            <Link href="/ranking/verlauf" style={{ ...TAPZIEL, display: "inline-flex", alignItems: "center", fontFamily: MONO, fontSize: "0.75rem", color: C.mint, textDecoration: "none", paddingLeft: 10 }}>
              Verlauf →
            </Link>
          </div>
          <div style={{ marginTop: 6, fontSize: "1.25rem", fontWeight: 700 }}>{roundName ?? "…"}</div>

          <div style={{ marginTop: 20 }}>
            {board == null ? (
              <div style={{ fontSize: "0.8125rem", color: C.muted, fontFamily: MONO, padding: "8px 0" }}>Tabelle lädt …</div>
            ) : board.length === 0 ? (
              <div style={{ fontSize: "0.8125rem", color: C.muted, padding: "8px 0" }}>Noch keine gewerteten Tipps in dieser Runde.</div>
            ) : board.map((b, i) => (
              <div key={b.userId} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "9px 0",
                borderTop: i === 0 ? "none" : `1px solid ${C.line}`,
              }}>
                <span style={{ fontFamily: MONO, fontSize: "0.8125rem", color: C.muted, width: 20 }}>{b.rank}</span>
                <span style={{ flex: 1, fontSize: "0.9375rem", color: b.userId === meId ? C.akzent : C.text, fontWeight: b.userId === meId ? 700 : 400 }}>
                  {b.name}
                  {b.userId === meId && <span style={{ color: C.coral, fontSize: "0.6875rem", marginLeft: 6 }}>● du</span>}
                </span>
                {/* gewertet/getippt — bei einem reinen Saison-Tipper wäre „0/0"
                    irreführend: er hat keinen Spieltag versäumt, sondern eine
                    andere Ebene bespielt. `saison !== undefined` heißt: die
                    Saison-Wetten laufen in dieser Runde überhaupt. */}
                {b.tips === 0 && b.saison !== undefined ? (
                  <span title="Bisher nur Saison-Wetten, kein Spieltags-Tipp" style={{ fontFamily: MONO, fontSize: "0.6875rem", color: C.muted }}>
                    nur Saison
                  </span>
                ) : (
                  <span style={{ fontFamily: MONO, fontSize: "0.6875rem", color: C.muted }}>{b.gewertet}/{b.tips}</span>
                )}
                {/* Anschluss-Bonus (Aufhol-Mechanismus) — nur wenn welcher anfiel */}
                {b.bonus > 0 && (
                  <span title="Anschluss-Bonus für Zurückliegende" style={{
                    fontFamily: MONO, fontSize: "0.6875rem", color: C.sky,
                    border: `1px solid ${C.sky}55`, borderRadius: RUND.pille, padding: "2px 7px",
                  }}>+{b.bonus} Anschluss</span>
                )}
                {/* Saison-Wetten — eigene Zeile, weil sie NICHT aus Spieltagen
                    stammen. Ohne die Trennung sähe es aus, als hätte jemand
                    besser getippt, obwohl er nur früh richtig geraten hat. */}
                {b.saison > 0 && (
                  <span title="Punkte aus den Saison-Wetten (Meister, Torschützenkönig …)" style={{
                    fontFamily: MONO, fontSize: "0.6875rem", color: C.mint,
                    border: `1px solid ${C.mint}55`, borderRadius: RUND.pille, padding: "2px 7px",
                  }}>+{b.saison} Saison</span>
                )}
                {/* Streichresultate — ohne diesen Hinweis sieht der Spieler eine
                    Summe, die nicht zu seinen Spieltagen passt, und kann sich
                    das nicht erklären. `vorläufig`, weil noch ein schlechterer
                    Spieltag kommen kann und dann ein anderer herausfällt. */}
                {b.gestrichen > 0 && (
                  <span title={`Die ${b.gestrichen} schwächsten Spieltage zählen nicht`
                    + (b.gestrichenPunkte ? ` — das sind ${b.gestrichenPunkte} Punkte.` : ".")
                    + (b.vorlaeufig ? " Welche das sind, kann sich noch ändern." : "")} style={{
                    fontFamily: MONO, fontSize: "0.6875rem", color: C.muted,
                    border: `1px solid ${C.line}`, borderRadius: RUND.pille, padding: "2px 7px",
                  }}>−{b.gestrichen} gestrichen</span>
                )}
                {/* Duell-Joker: geklaut oder geblockt. Ein Spieler, dem Punkte
                    fehlen, muss sehen WARUM — sonst wirkt es wie ein Fehler. */}
                {b.duell != null && b.duell !== 0 && (
                  <span title={b.duell > 0
                    ? "Aus Duellen gewonnen"
                    : "Durch ein Duell verloren — jemand hat auf dich gesetzt"} style={{
                    fontFamily: MONO, fontSize: "0.6875rem", color: b.duell > 0 ? C.mint : C.coral,
                    border: `1px solid ${b.duell > 0 ? C.mint + "55" : C.coral + "55"}`,
                    borderRadius: RUND.pille, padding: "2px 7px",
                  }}>{b.duell > 0 ? "+" : ""}{b.duell} Duell</span>
                )}
                {/* Ersatz-Tipps (Versäumnis). Kulanz der Runde, keine eigene
                    Leistung — und genau deshalb benannt: sonst sieht der
                    Spieler eine Summe, zu der seine Tipps nicht führen. */}
                {b.ersatz > 0 && (
                  <span title={`${b.ersatz} versäumte Spiele wurden mit einem Ersatz-Tipp gewertet`
                    + (b.ersatzPunkte ? ` — das sind ${b.ersatzPunkte} Punkte.` : ".")} style={{
                    fontFamily: MONO, fontSize: "0.6875rem", color: C.muted,
                    border: `1px solid ${C.line}`, borderRadius: RUND.pille, padding: "2px 7px",
                  }}>+{b.ersatzPunkte} Ersatz</span>
                )}
                {/* 🔴 Alleinstellung (Andis Stadt-Land-Fluss-Bonus, 09.08.2026).
                    Eigene Marke aus demselben Grund wie beim Ersatz-Tipp: ein
                    Zuschlag, der nur im Total steckt, ist für den Empfänger
                    nicht von einem Rechenfehler zu unterscheiden. Dieser hier
                    ist der auffälligste von allen, weil er nur EINEN trifft —
                    ohne Marke sähe er nach Bevorzugung aus. */}
                {b.alleinPunkte > 0 && (
                  <span title="Bonus dafür, dass du als (fast) Einziger richtig lagst" style={{
                    fontFamily: MONO, fontSize: "0.6875rem", color: C.akzent,
                    border: `1px solid ${C.akzent}55`, borderRadius: RUND.pille, padding: "2px 7px",
                  }}>+{b.alleinPunkte} Alleingang</span>
                )}
                {/* 🔴 Was die Saison-KURVE verschoben hat. Die Streicher
                    hatten längst eine Marke, die Kurve nicht — sie verschob den
                    Stand gemessen um bis zu 186 Punkte, ohne dass irgendwo
                    etwas stand. `form` ist `null`, wenn die Kurve flach ist. */}
                {b.form != null && b.form !== 0 && (
                  <span title="Späte Spieltage zählen anders als frühe (Saison-Kurve)" style={{
                    fontFamily: MONO, fontSize: "0.6875rem", color: b.form > 0 ? C.mint : C.muted,
                    border: `1px solid ${b.form > 0 ? C.mint + "55" : C.line}`,
                    borderRadius: RUND.pille, padding: "2px 7px",
                  }}>{b.form > 0 ? "+" : ""}{b.form} Kurve</span>
                )}
                {/* 🔴 Rad-Punkte. Sie fließen wie Anschluss-Bonus und
                    Saison-Wetten ins Total, wurden hier aber als einzige NICHT
                    ausgewiesen — ein Spieler sah eine Summe, die nicht zu
                    seinen Spieltagen passt, ohne dass irgendwo stand, warum.
                    Dieselbe Begründung wie bei den drei Marken darüber. */}
                {b.drehrad > 0 && (
                  <span title="Punkte vom Glücksrad" style={{
                    fontFamily: MONO, fontSize: "0.6875rem", color: C.akzent,
                    border: `1px solid ${C.akzent}55`, borderRadius: RUND.pille, padding: "2px 7px",
                  }}>+{b.drehrad} Rad</span>
                )}
                <span style={{
                  fontFamily: MONO, fontSize: "0.9375rem", fontVariantNumeric: "tabular-nums", minWidth: 44, textAlign: "right",
                  color: b.total < 0 ? C.coral : C.text,
                }}>{b.total}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 🔴 Wer hat mich getroffen. Die Marke „−340 Duell" in der Zeile sagt
          WIEVIEL, aber nicht VON WEM — und genau das ist bei dieser Mechanik
          die eigentliche Nachricht. Die Beträge kommen ungerundet aus dem
          Store; gerundet wird je Zeile für die Anzeige, die SUMME oben in der
          Marke wird aus den rohen Werten gebildet. Eine erste Fassung rundete
          jede Zeile und kam auf 1123, wo im Ranking 1122 stand. */}
      {meineDuelle.length > 0 && (
        <div style={{ width: "100%", maxWidth: "var(--tqs-schirm-breite)", marginTop: 18 }}>
          <div style={{ fontSize: "0.75rem", letterSpacing: 1.5, color: C.muted, textTransform: "uppercase", marginBottom: 8 }}>
            Deine Duelle
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {meineDuelle.map((v, i) => {
              const ichAngreifer = v.vonUserId === meId;
              const betrag = Math.round(ichAngreifer ? v.gewinn : v.verlust);
              // Ein Block ohne Beute bringt dem Angreifer nichts — die Zeile
              // muss trotzdem stehen, sonst fehlt beim Getroffenen die Ursache.
              const text = ichAngreifer
                ? (v.typ === "klau"
                  ? `Du hast ${v.aufName} ${betrag} Punkte abgenommen`
                  : `Du hast ${v.aufName} gedämpft${betrag ? ` (+${betrag} für dich)` : ""}`)
                : (v.typ === "klau"
                  ? `${v.vonName} hat dir ${betrag} Punkte abgenommen`
                  : `${v.vonName} hat dich gedämpft (−${betrag})`);
              return (
                <div key={`${v.spieltag}-${v.vonUserId}-${v.aufUserId}-${i}`} style={{
                  display: "flex", alignItems: "baseline", gap: 8,
                  background: C.surface, border: `1px solid ${C.line}`,
                  borderRadius: RUND.karte, padding: "8px 11px",
                }}>
                  <span style={{ fontFamily: MONO, fontSize: "0.6875rem", color: C.muted, minWidth: 34 }}>
                    ST {v.spieltag}
                  </span>
                  <span style={{ flex: 1, fontSize: "0.75rem", lineHeight: 1.4 }}>{text}</span>
                  <span style={{
                    fontFamily: MONO, fontSize: "0.6875rem",
                    color: ichAngreifer ? C.mint : C.coral,
                  }}>{ichAngreifer ? "+" : "−"}{betrag}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
