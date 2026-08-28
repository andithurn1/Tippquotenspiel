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
import Feinheiten from "@/components/Feinheiten";
import { C, MONO, SCHRIFT, RUND } from "@/lib/theme";
import { TAPZIEL } from "@/lib/tapziel";


// ============================================================
//  DIE KACHELN DES RUNDEN-MENÜS — in drei Gruppen statt einer Liste
//
//  🔴 Andi, 27.08.2026: „solche optionen müssen egtl hinter nem eigenen
//  öffnenbarem Fenster sein, weil die ganzen Einstellmöglichkeiten einen sonst
//  komplett erschlagen".
//
//  ⚠️ `kurz` ist kein Beiwerk: es steht in der Zeile über der zugeklappten
//  Gruppe und ist das Einzige, was jemand sieht, bevor er klickt. Eine Gruppe,
//  die nicht sagt, was in ihr liegt, wird nicht geöffnet — dann ist die
//  Aufräumaktion eine Versteckaktion geworden.
// ============================================================

// Was man an einem normalen Spieltag tut. Immer offen, nie hinter einem Klick.
const JETZT = [
  { href: "/tippen", title: "Tipp abgeben", desc: "Spiel wählen, Ergebnis + Torschützen tippen.", tone: C.akzent },
  { href: "/ranking", title: "Ranking", desc: "Wer in dieser Runde gerade vorne liegt.", tone: C.mint },
  // 🔴 Andi, 27.08.2026: „hier sehen wir ne Übersicht über die Ereignisse und
  // angewendeten Joker bzw. wann die auch geresettet werden."
  { href: "/runde", title: "Was gerade läuft", desc: "Wer hält noch Joker, welche Ereignisse liefen — und wann was verfällt.", tone: C.gold ?? C.akzent },
];

// Was MIR gehört. Jede Kachel hängt an einer Ebene, die auch aus sein kann —
// deshalb steht neben `href` die Bedingung, unter der sie überhaupt erscheint.
const MEINS = [
  { href: "/joker", title: "🃏 Deine Joker", kurz: "Joker", tone: C.akzent,
    desc: "Wie viele du hast, welche Spieltage sie tragen, wie weit du bist.", wenn: "joker" },
  { href: "/rad", title: "🎡 Dein Glücksrad", kurz: "Glücksrad", tone: C.sky,
    desc: "Was für dich gefallen ist — und wann sich das Rad das nächste Mal dreht.", wenn: "rad" },
  { href: "/saison", title: "🏆 Saison-Wetten", kurz: "Saison-Wetten", tone: C.violet,
    desc: "Langzeit-Tipps: Meister, Torschützenkönig & Co.", wenn: "saison" },
];

// Was die RUNDE angeht — nachschlagen, nachlesen, verwalten. Nichts davon
// eilt an einem Spieltag, deshalb liegt es hinter einem Klick.
const RUNDE = [
  { href: "/fahrplan", title: "Saison-Fahrplan", kurz: "Fahrplan", tone: C.sky,
    desc: "Wo die Runde steht und was als Nächstes aufgeht.", wenn: null },
  { href: "/historie", title: "Historie & Rekorde", kurz: "Historie", tone: C.sky,
    desc: "Verlauf, Auszeichnungen und „was wäre ohne Joker gewesen?“.", wenn: null },
  { href: "/freigaben", title: "🔑 Freigaben", kurz: "Freigaben", tone: C.indigo,
    desc: "Wer an welchem Spieltag einsetzen darf — erteilt der Admin.", wenn: "freigaben" },
  { href: "/spott", title: "Spott verschicken", kurz: "Spott", tone: C.coral,
    desc: "Spruch + Clip an einen Mitspieler — über deinen normalen Chat.", wenn: null },
];

// Geparkte Premium-Features (siehe design/roadmap.md) — nur als sichtbare,
// nicht klickbare Ankündigung, noch keine eigenen Screens.
//
// Leer, und das ist Absicht: das Elfmeterschießen-Duell ist am 29.07. aus der
// Planung genommen worden. Eine Ankündigung, die niemand mehr baut, ist
// schlimmer als keine — sie wird zur Schuld, die man beim Nutzer stehen lässt.
// Kommt hier etwas Neues rein, bitte erst wenn es auch gebaut wird.
const SOON = [];

// ⚠️ EINE Kachel-Fassung statt sechs kopierter Link-Blöcke. Vorher stand
// derselbe Verlauf, derselbe Rahmen und derselbe Punkt sechsmal im JSX —
// genau der Weg, auf dem in diesem Projekt schon einmal acht Eckenradien
// entstanden sind.
function Kachel({ href, punkt, titel, desc, rahmen = null }) {
  return (
    <Link href={href} style={{
      textDecoration: "none", color: C.text,
      background: `radial-gradient(120% 120% at 50% -20%, ${C.ink2} 0%, ${C.surface} 100%)`,
      border: `1px solid ${rahmen ?? C.line}`, borderRadius: RUND.karte, padding: "16px 18px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{
          width: 8, height: 8, borderRadius: RUND.pille,
          background: punkt, boxShadow: `0 0 12px ${punkt}`,
        }} />
        <span style={{ fontSize: "1rem", fontWeight: 700 }}>{titel}</span>
      </div>
      <div style={{ fontSize: "0.8125rem", color: C.muted, marginTop: 6, lineHeight: 1.5 }}>{desc}</div>
    </Link>
  );
}

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
      getStore().getRound(roundId), getStore().listRoundMatches(roundId, { schlank: true }), getStore().listTips({ roundId }),
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

  // Welche Kacheln erscheinen überhaupt? Eine Ebene, die in dieser Runde aus
  // ist, hat auch keine Kachel — sonst führt ein Klick auf eine leere Seite.
  const an = { joker, rad, saison, freigaben };
  const sichtbar = (k) => k.wenn === null || an[k.wenn];
  const meins = MEINS.filter(sichtbar);
  const runde = RUNDE.filter(sichtbar);

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

        {/* 🔴 Andi, 27.08.2026: „solche optionen müssen egtl hinter nem eigenen
            öffnenbarem Fenster sein, weil die ganzen Einstellmöglichkeiten
            einen sonst komplett erschlagen … dass es einen nicht erschlägt und
            man nicht alle durchscrollen muss."

            Die Ansage galt der Spielerstellung, aber sie traf diese Seite
            genauso: hier standen bis zu ELF gleich aussehende Kacheln
            untereinander. Was jetzt oben steht, ist das, was man an einem
            normalen Spieltag tut. Alles andere liegt hinter einem Klick — mit
            einer Zeile davor, die sagt, was drin ist. Eine zugeklappte Gruppe,
            von der man nicht weiß, was sie enthält, klappt niemand auf. */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Was gerade ANSTEHT — Aufrufe, die vergehen, wenn man sie übersieht.
              Sie stehen über allem und niemals hinter einem Klick. */}
          {abstimmung && (
            <Kachel href="/abstimmung" punkt={C.akzent} rahmen={`${C.akzent}44`}
              titel="🃏 Joker-Abstimmung"
              desc="Stimmt ab, an welchen Spieltagen es einen Joker gibt." />
          )}
          {regelWahl && (
            <Kachel href="/regeln" punkt={C.akzent} rahmen={`${C.akzent}44`}
              titel="⚖️ Regeländerungen"
              desc="Änderungen am Regelwerk vorschlagen und darüber abstimmen." />
          )}

          {/* Der Spieltag selbst. Drei Kacheln, immer offen. */}
          {JETZT.map((k) => (
            <Kachel key={k.href} href={k.href} punkt={k.tone} titel={k.title} desc={k.desc} />
          ))}

          {/* ⚠️ `Feinheiten` und KEIN eigener Aufklapper — das wäre die neunte
              Fassung derselben Sache (siehe Kopf von `Feinheiten.jsx`: acht
              Varianten waren am 24.08. schon einmal so entstanden). */}
          {meins.length > 0 && (
            <Feinheiten titel="Deine Sachen"
              zusammenfassung={meins.map((k) => k.kurz).join(" · ")}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                {meins.map((k) => (
                  <Kachel key={k.href} href={k.href} punkt={k.tone} titel={k.title} desc={k.desc} />
                ))}
              </div>
            </Feinheiten>
          )}

          {runde.length > 0 && (
            <Feinheiten titel="Die Runde"
              zusammenfassung={runde.map((k) => k.kurz).join(" · ")}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                {runde.map((k) => (
                  <Kachel key={k.href} href={k.href} punkt={k.tone} titel={k.title} desc={k.desc} />
                ))}
              </div>
            </Feinheiten>
          )}

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
