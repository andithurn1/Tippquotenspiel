"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getStore } from "@/lib/store";
import { useAuth } from "@/components/AuthProvider";
import { useCurrentRound } from "@/components/RoundProvider";
import { computeMatchStatus, countTippedByUser } from "@/lib/roundStatus";
import { muenzStand } from "@/lib/muenzstand";
import { basisFuer } from "@/lib/jokerBasis";
import { narrenStand } from "@/lib/narrenstand";
import Waehrungen from "@/components/Waehrungen";
import { C, MONO, SCHRIFT, RUND } from "@/lib/theme";
import { TAPZIEL } from "@/lib/tapziel";


// Landing-Karten der aktiven Runde: Tipp abgeben / Ranking / Ranking-Verlauf.
const CARDS = [
  { href: "/tippen", title: "Tipp abgeben", desc: "Spiel wählen, Ergebnis + Torschützen tippen.", tone: C.akzent },
  { href: "/fahrplan", title: "Saison-Fahrplan", desc: "Wo die Runde steht und was als Nächstes aufgeht.", tone: C.sky },
  { href: "/ranking", title: "Ranking", desc: "Wer in dieser Runde gerade vorne liegt.", tone: C.mint },
  // 🔴 Andi, 27.08.2026: „hier sehen wir ne Übersicht über die Ereignisse und
  // angewendeten Joker bzw. wann die auch geresettet werden."
  { href: "/runde", title: "Was gerade läuft", desc: "Wer hält noch Joker, welche Ereignisse liefen — und wann was verfällt.", tone: C.gold ?? C.akzent },
  { href: "/historie", title: "Historie & Rekorde", desc: "Verlauf, Auszeichnungen und „was wäre mit anderem Preset gewesen?“.", tone: C.sky },
  { href: "/spott", title: "Spott verschicken", desc: "Spruch + Clip an einen Mitspieler — über deinen normalen Chat.", tone: C.coral },
];

// Geparkte Premium-Features (siehe design/roadmap.md) — nur als sichtbare,
// nicht klickbare Ankündigung, noch keine eigenen Screens.
//
// Leer, und das ist Absicht: das Elfmeterschießen-Duell ist am 29.07. aus der
// Planung genommen worden. Eine Ankündigung, die niemand mehr baut, ist
// schlimmer als keine — sie wird zur Schuld, die man beim Nutzer stehen lässt.
// Kommt hier etwas Neues rein, bitte erst wenn es auch gebaut wird.
const SOON = [];

// Das Runden-Hub: Startbildschirm der AKTIVEN Runde (Tipp abgeben, Ranking,
// Ranking-Verlauf, Premium-Ausblick). Von hier geht es über die Fußzeile ins
// allgemeine Menü (andere Runden, erstellen/beitreten, Einstellungen).
export default function RundenHub() {
  const { user } = useAuth();
  const { roundId } = useCurrentRound();
  const [roundName, setRoundName] = useState(null);
  const [status, setStatus] = useState(null); // { total, open, tippedByMe }
  const [abstimmung, setAbstimmung] = useState(false);
  // ⚠️ Zwei verschiedene Abstimmungen: `abstimmung` sind die Joker-Spieltage
  // (voting.js), `regelWahl` sind Änderungen AM REGELWERK
  // (design/abstimmung-verfassung.md). Getrennte Zustände, getrennte Karten.
  const [regelWahl, setRegelWahl] = useState(false);
  const [rad, setRad] = useState(false);   // Glücksrad dieser Runde (drehrad.js)
  // Joker der Runde — die Karte „Deine Joker" ist ohne ihn gegenstandslos.
  const [joker, setJoker] = useState(false);
  // Hängt in dieser Runde irgendeine Joker-Art an einer Admin-Freigabe?
  // Nur dann ist der Freigabe-Screen überhaupt eine Aussage.
  const [freigaben, setFreigaben] = useState(false);
  const [saison, setSaison] = useState(false);
  const [stand, setStand] = useState(null); // Münzstand dieser Runde, siehe muenzstand.js
  const [narren, setNarren] = useState(null); // Narren-Kontostand dieser Runde, siehe narrenstand.js

  useEffect(() => {
    let live = true;
    Promise.all([
      // 🔴 `listRoundMatches`: die Regel „welche Spiele gehören zur Runde"
      // hat EINE Stelle (Runden-Schicht, Frage 1). Hier lag sie nachgebaut.
      getStore().getRound(roundId), getStore().listRoundMatches(roundId), getStore().listTips({ roundId }),
      getStore().getLeaderboardHistory(roundId),
      // Narren vom Glücksrad — dieselbe Quelle wie in der Tippabgabe.
      getStore().getDrehradBelohnungen?.(roundId) ?? Promise.resolve(null),
    ])
      .then(([round, matches, tips, history, rad]) => {
        if (!live) return;
        setRoundName(round?.name ?? null);
        setAbstimmung(round?.rules?.joker?.enabled === true && round?.rules?.joker?.abstimmung === true);
        setRegelWahl(round?.rules?.regelAbstimmung?.enabled === true);
        setRad(round?.rules?.drehrad?.enabled === true);
        setJoker(round?.rules?.joker?.enabled === true);
        setFreigaben(["joker.einzel", "joker.ranking", "duell.klau", "duell.block", "drehrad"]
          .some((art) => basisFuer(art, round?.rules)?.wer === "adminFreigabe"));
        setSaison(round?.rules?.saison?.enabled === true);
        const { total, open } = computeMatchStatus(matches);
        setStatus({ total, open, tippedByMe: countTippedByUser(tips, user?.id) });
        setStand(muenzStand({ rules: round?.rules, matches, tips, userId: user?.id }));
        setNarren(narrenStand({
          rules: round?.rules, matches, tips, userId: user?.id,
          stand: history, zusatz: rad?.narren ?? [],
        }));
      }).catch(() => {
        // 🔴 „Status lädt …" hängt an `status === null`. Ohne diese Zeile
        // bleibt die Kachel für immer im Ladezustand, sobald EIN Aufruf im
        // `Promise.all` scheitert — live reicht dafür eine fehlende Anmeldung.
        if (live) setStatus({ total: 0, open: 0, tippedByMe: 0 });
      });
    return () => { live = false; };
  }, [roundId, user]);

  return (
    <main style={{
      minHeight: "100vh", background: C.ink, color: C.text,
      fontFamily: SCHRIFT,
      padding: "48px 16px", display: "flex", justifyContent: "center",
    }}>
      <div style={{ width: "100%", maxWidth: "var(--tqs-schirm-breite)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontFamily: MONO, fontSize: "0.75rem", letterSpacing: 2, color: C.muted, textTransform: "uppercase" }}>
            QuotenTippspiel
          </span>
          <Link href="/menu" style={{ ...TAPZIEL, display: "inline-flex", alignItems: "center", fontFamily: MONO, fontSize: "0.75rem", color: C.mint, textDecoration: "none", paddingLeft: 10 }}>
            Alle Tippspiele →
          </Link>
        </div>
        <h1 style={{ fontSize: "1.375rem", fontWeight: 800, margin: "8px 0 6px" }}>{roundName ?? "…"}</h1>

        <div style={{ fontFamily: MONO, fontSize: "0.75rem", color: C.muted, marginBottom: 20 }}>
          {status
            ? `${status.total} Spiele · ${status.open} offen · ${status.tippedByMe} von dir getippt`
            : "Status lädt …"}
        </div>

        {(stand || narren != null) && (
          <div style={{
            background: C.surface, border: `1px solid ${C.line}`, borderRadius: RUND.karte,
            padding: "14px 16px", marginBottom: 16,
          }}>
            <Waehrungen stand={stand} narren={narren?.kontostand ?? null} />
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {abstimmung && (
            <Link href="/abstimmung" style={{
              textDecoration: "none", color: C.text,
              background: `radial-gradient(120% 120% at 50% -20%, ${C.ink2} 0%, ${C.surface} 100%)`,
              border: `1px solid ${C.akzent}44`, borderRadius: RUND.karte, padding: "16px 18px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: RUND.pille, background: C.akzent, boxShadow: `0 0 12px ${C.akzent}` }} />
                <span style={{ fontSize: "1rem", fontWeight: 700 }}>🃏 Joker-Abstimmung</span>
              </div>
              <div style={{ fontSize: "0.8125rem", color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
                Stimmt ab, an welchen Spieltagen es einen Joker gibt.
              </div>
            </Link>
          )}
          {regelWahl && (
            <Link href="/regeln" style={{
              textDecoration: "none", color: C.text,
              background: `radial-gradient(120% 120% at 50% -20%, ${C.ink2} 0%, ${C.surface} 100%)`,
              border: `1px solid ${C.akzent}44`, borderRadius: RUND.karte, padding: "16px 18px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: RUND.pille, background: C.akzent, boxShadow: `0 0 12px ${C.akzent}` }} />
                <span style={{ fontSize: "1rem", fontWeight: 700 }}>⚖️ Regeländerungen</span>
              </div>
              <div style={{ fontSize: "0.8125rem", color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
                Änderungen am Regelwerk vorschlagen und darüber abstimmen.
              </div>
            </Link>
          )}
          {freigaben && (
            <Link href="/freigaben" style={{
              textDecoration: "none", color: C.text,
              background: `radial-gradient(120% 120% at 50% -20%, ${C.ink2} 0%, ${C.surface} 100%)`,
              border: `1px solid ${C.line}`, borderRadius: RUND.karte, padding: "16px 18px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: RUND.pille, background: C.indigo, boxShadow: `0 0 12px ${C.indigo}` }} />
                <span style={{ fontSize: "1rem", fontWeight: 700 }}>🔑 Freigaben</span>
              </div>
              <div style={{ fontSize: "0.8125rem", color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
                Wer an welchem Spieltag einsetzen darf — erteilt der Admin.
              </div>
            </Link>
          )}
          {joker && (
            <Link href="/joker" style={{
              textDecoration: "none", color: C.text,
              background: `radial-gradient(120% 120% at 50% -20%, ${C.ink2} 0%, ${C.surface} 100%)`,
              border: `1px solid ${C.akzent}44`, borderRadius: RUND.karte, padding: "16px 18px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: RUND.pille, background: C.akzent, boxShadow: `0 0 12px ${C.akzent}` }} />
                <span style={{ fontSize: "1rem", fontWeight: 700 }}>🃏 Deine Joker</span>
              </div>
              <div style={{ fontSize: "0.8125rem", color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
                Wie viele du hast, welche Spieltage sie tragen, wie weit du bist.
              </div>
            </Link>
          )}
          {rad && (
            <Link href="/rad" style={{
              textDecoration: "none", color: C.text,
              background: `radial-gradient(120% 120% at 50% -20%, ${C.ink2} 0%, ${C.surface} 100%)`,
              border: `1px solid ${C.line}`, borderRadius: RUND.karte, padding: "16px 18px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: RUND.pille, background: C.sky, boxShadow: `0 0 12px ${C.sky}` }} />
                <span style={{ fontSize: "1rem", fontWeight: 700 }}>🎡 Dein Glücksrad</span>
              </div>
              <div style={{ fontSize: "0.8125rem", color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
                Was für dich gefallen ist — und wann sich das Rad das nächste Mal dreht.
              </div>
            </Link>
          )}
          {saison && (
            <Link href="/saison" style={{
              textDecoration: "none", color: C.text,
              background: `radial-gradient(120% 120% at 50% -20%, ${C.ink2} 0%, ${C.surface} 100%)`,
              border: `1px solid ${C.line}`, borderRadius: RUND.karte, padding: "16px 18px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: RUND.pille, background: C.violet, boxShadow: `0 0 12px ${C.violet}` }} />
                <span style={{ fontSize: "1rem", fontWeight: 700 }}>🏆 Saison-Wetten</span>
              </div>
              <div style={{ fontSize: "0.8125rem", color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
                Langzeit-Tipps: Meister, Torschützenkönig & Co.
              </div>
            </Link>
          )}
          {CARDS.map((s) => (
            <Link key={s.href} href={s.href} style={{
              textDecoration: "none", color: C.text,
              background: `radial-gradient(120% 120% at 50% -20%, ${C.ink2} 0%, ${C.surface} 100%)`,
              border: `1px solid ${C.line}`, borderRadius: RUND.karte, padding: "16px 18px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: RUND.pille, background: s.tone, boxShadow: `0 0 12px ${s.tone}` }} />
                <span style={{ fontSize: "1rem", fontWeight: 700 }}>{s.title}</span>
              </div>
              <div style={{ fontSize: "0.8125rem", color: C.muted, marginTop: 6, lineHeight: 1.5 }}>{s.desc}</div>
            </Link>
          ))}

          {SOON.map((s) => (
            <div key={s.title} style={{
              color: C.muted, background: C.ink2, border: `1px solid ${C.line}`,
              borderRadius: RUND.karte, padding: "16px 18px", opacity: 0.6,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: "1rem", fontWeight: 700 }}>{s.title}</span>
                <span style={{
                  marginLeft: "auto", fontFamily: MONO, fontSize: "0.6875rem", color: C.muted,
                  border: `1px solid ${C.line}`, borderRadius: RUND.pille, padding: "2px 8px",
                  textTransform: "uppercase", letterSpacing: 1,
                }}>bald verfügbar</span>
              </div>
              <div style={{ fontSize: "0.8125rem", marginTop: 6, lineHeight: 1.5 }}>{s.desc}</div>
            </div>
          ))}
        </div>

        <Link href="/menu" style={{
          marginTop: 16, display: "block", textDecoration: "none", textAlign: "center",
          color: C.text, background: C.surface2, border: `1px solid ${C.line}`,
          borderRadius: RUND.karte, padding: "13px 0", fontSize: "0.9375rem", fontWeight: 600,
        }}>
          Alle Tippspiele, erstellen, Einstellungen →
        </Link>
      </div>
    </main>
  );
}
