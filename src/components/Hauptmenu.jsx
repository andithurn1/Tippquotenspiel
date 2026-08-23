"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthBar from "@/components/AuthBar";
import { useAuth } from "@/components/AuthProvider";
import { useCurrentRound } from "@/components/RoundProvider";
import { getStore } from "@/lib/store";
import { computeMatchStatus, countTippedByUser, rundenSpiele } from "@/lib/roundStatus";
import { muenzStand } from "@/lib/muenzstand";
import { narrenStand } from "@/lib/narrenstand";
import Waehrungen from "@/components/Waehrungen";
import { C, MONO, SCHRIFT, RUND } from "@/lib/theme";
import { TAPZIEL } from "@/lib/tapziel";

const SCREENS = [
  { href: "/erstellen", title: "Spiel erstellen", desc: "Regelwerk einstellen, Runde anlegen und per Code teilen.", tone: C.indigo, tag: "Admin" },
  { href: "/beitreten", title: "Runde beitreten", desc: "Mit Beitritts-Code einer Runde beitreten oder wechseln.", tone: C.sky },
  { href: "/einstellungen", title: "Meine Anzeige", desc: "Wie viel Mathematik & Vorschau du sehen willst.", tone: C.violet, tag: "persönlich" },
  { href: "/farben", title: "Fanfarben", desc: "Deine Vereinsfarben als Akzent — 2–3 Farben wählen.", tone: C.akzent, tag: "persönlich" },
  { href: "/benachrichtigungen", title: "Benachrichtigungen", desc: "Nur neuer Spieltag & Erinnerung vor Anpfiff — fein einstellbar.", tone: C.sky, tag: "persönlich" },
  { href: "/abrechnung", title: "Abrechnung", desc: "Dein zuletzt gewerteter Tipp, aufgeschlüsselt.", tone: C.coral },
  { href: "/explorer", title: "Auszahlungs-Explorer", desc: "Heat-Grid: was jeder mögliche Endstand zahlen würde.", tone: C.mint },
];

// Allgemeines Menü: eigene Tippspiele wechseln/anlegen/beitreten + Einstellungen.
// Von hier aus springt man ins Runden-Hub der jeweils aktiven Runde.
export default function Hauptmenu() {
  const router = useRouter();
  const { user } = useAuth();
  const { roundId, setRoundId } = useCurrentRound();
  const [rounds, setRounds] = useState(null); // [{ ...round, status }]

  useEffect(() => {
    let live = true;
    if (!user) { setRounds([]); return; }
    Promise.all([getStore().listRoundsForUser(user.id), getStore().listMatches()]).then(async ([myRounds, matches]) => {
      if (!live) return;
      const withStatus = await Promise.all(myRounds.map(async (r) => {
        // ⚠️ Hier BEWUSST nachgebaut statt `listRoundMatches(r.id)`: dieser
        // Screen zeigt ALLE Runden des Nutzers auf einmal. Über die
        // Store-Methode wäre es ein Abruf des ganzen Katalogs JE RUNDE; so ist
        // es einer für alle. `listRoundMatches` rechnet exakt diesen Ausdruck
        // — wächst die Regel dort, muss diese Zeile MIT (Runden-Schicht,
        // Frage 1). Die vier Einzelrunden-Screens sind am 06.08.2026 auf die
        // Store-Methode umgestellt worden; das hier ist die eine Ausnahme.
        const relevant = rundenSpiele(matches, r);
        const { total, open } = computeMatchStatus(relevant);
        const [tips, history, rad] = await Promise.all([
          getStore().listTips({ roundId: r.id }), getStore().getLeaderboardHistory(r.id),
          // Narren vom Glücksrad — dieselbe Quelle wie in der Tippabgabe.
          // Ohne sie zahlte ein Rad-Feld „30 Narren" hier nichts aus, dort schon.
          getStore().getDrehradBelohnungen?.(r.id) ?? Promise.resolve(null),
        ]);
        const stand = muenzStand({ rules: r.rules, matches: relevant, tips, userId: user.id });
        const narren = narrenStand({
          rules: r.rules, matches: relevant, tips, userId: user.id,
          stand: history, zusatz: rad?.narren ?? [],
        });
        return { ...r, status: { total, open, tippedByMe: countTippedByUser(tips, user.id) }, stand, narren };
      }));
      if (live) setRounds(withStatus);
    });
    return () => { live = false; };
  }, [user]);

  const switchTo = (id) => {
    if (id !== roundId) setRoundId(id);
    router.push("/hub");
  };

  return (
    <main style={{
      minHeight: "100vh", background: C.ink, color: C.text,
      fontFamily: SCHRIFT,
      padding: "48px 16px", display: "flex", justifyContent: "center",
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* ⛔ Hier stand kurz das volle Logo als Bild (09.08.2026). Wieder
            raus auf Andis Ansage: „schaut sehr klobig aus." Und er hat recht —
            ein 148 px hohes Wappen über einer 26-px-Überschrift kippt das
            Verhältnis, die Seite fängt mit einem Klotz an statt mit einer
            Aussage. Das Logo gehört auf die App-Kachel und später vielleicht
            klein in eine Kopfzeile, nicht als Aufmacher über den Text.
            Die Dateien bleiben (`logo-hell.png`, `logo-dunkel.png`,
            `wappen-*.png`) — sie werden gebraucht, sobald die Kopfzeile
            gestaltet ist. */}
        <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: 2, color: C.muted, textTransform: "uppercase" }}>
          QuotenTippspiel
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: "8px 0 6px" }}>Mut zahlt sich aus.</h1>
        <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.6, marginTop: 0, marginBottom: 24 }}>
          Quoten-gewichtetes Tippspiel unter Freunden. Kein Echtgeld — Ehre und
          ein Wichtelgeschenk.
        </p>

        <AuthBar />

        <Section title="Meine Tippspiele">
          {rounds == null && <Hint>Tippspiele laden …</Hint>}
          {rounds?.length === 0 && <Hint>Noch keine Tippspiele — leg eins an oder tritt einem bei.</Hint>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rounds?.map((r) => {
              const active = r.id === roundId;
              return (
                <button key={r.id} onClick={() => switchTo(r.id)} style={{
                  textAlign: "left", cursor: "pointer", fontFamily: "inherit",
                  background: active ? `${C.akzent}14` : C.surface,
                  border: `1px solid ${active ? C.akzent + "55" : C.line}`,
                  borderRadius: RUND.karte, padding: "14px 16px", color: C.text,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{r.name}</span>
                    {active && (
                      <span style={{
                        fontFamily: MONO, fontSize: 11, color: C.akzent, border: `1px solid ${C.akzent}55`,
                        borderRadius: RUND.pille, padding: "2px 8px", textTransform: "uppercase", letterSpacing: 1,
                      }}>aktiv</span>
                    )}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 11, color: C.muted, marginTop: 5 }}>
                    {r.status.total} Spiele · {r.status.open} offen · {r.status.tippedByMe} von dir getippt
                  </div>
                  {(r.stand || r.narren != null) && (
                    <div style={{ marginTop: 5 }}>
                      <Waehrungen stand={r.stand} narren={r.narren?.kontostand ?? null} kompakt />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Verwalten">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {SCREENS.map((s) => (
              <Link key={s.href} href={s.href} style={{
                textDecoration: "none", color: C.text,
                background: `radial-gradient(120% 120% at 50% -20%, ${C.ink2} 0%, ${C.surface} 100%)`,
                border: `1px solid ${C.line}`, borderRadius: RUND.karte, padding: "16px 18px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: RUND.pille, background: s.tone, boxShadow: `0 0 12px ${s.tone}` }} />
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{s.title}</span>
                  {s.tag && (
                    <span style={{
                      marginLeft: "auto", fontFamily: MONO, fontSize: 11, color: s.tone,
                      border: `1px solid ${s.tone}55`, borderRadius: RUND.pille, padding: "2px 8px",
                      textTransform: "uppercase", letterSpacing: 1,
                    }}>{s.tag}</span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>{s.desc}</div>
              </Link>
            ))}

            <Link href="/tutorial" style={{
              textDecoration: "none", color: C.text,
              background: `radial-gradient(120% 120% at 50% -20%, ${C.ink2} 0%, ${C.surface} 100%)`,
              border: `1px solid ${C.line}`, borderRadius: RUND.karte, padding: "16px 18px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: RUND.pille, background: C.akzent, boxShadow: `0 0 12px ${C.akzent}` }} />
                <span style={{ fontSize: 16, fontWeight: 700 }}>Tutorial</span>
              </div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>Quoten, Punkte & das Admin-System — mit Beispielen erklärt.</div>
            </Link>
          </div>
        </Section>

        <div style={{
          textAlign: "center", fontFamily: MONO, fontSize: 11, color: C.muted,
          paddingTop: 6, borderTop: `1px solid ${C.line}`,
        }}>
          <Link href="/datenschutz" style={{ ...TAPZIEL, display: "inline-flex", alignItems: "center", color: C.muted, textDecoration: "none", padding: "0 6px" }}>Datenschutz</Link>
          <span style={{ opacity: 0.5 }}>{"  ·  "}</span>
          <Link href="/impressum" style={{ ...TAPZIEL, display: "inline-flex", alignItems: "center", color: C.muted, textDecoration: "none", padding: "0 6px" }}>Impressum</Link>
          <span style={{ opacity: 0.5 }}>{"  ·  "}</span>
          <Link href="/konto" style={{ ...TAPZIEL, display: "inline-flex", alignItems: "center", color: C.muted, textDecoration: "none", padding: "0 6px" }}>Konto</Link>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginTop: 8, marginBottom: 24 }}>
      <div style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function Hint({ children }) {
  return <div style={{ fontSize: 13, color: C.muted, fontFamily: MONO, padding: "4px 0 10px" }}>{children}</div>;
}
