"use client";

// ============================================================
//  MUSTERSEITE — jeder Baustein, jeder Zustand, ein Kürzel
//
//  Angelegt 09.08.2026, weil Andi gefragt hat, wie er mir „ohne viel Aufwand"
//  sagen kann, wie die Elemente aussehen und sich anfühlen sollen.
//
//  🔴 Der Zweck ist nicht Schönheit, sondern ein GEMEINSAMES VOKABULAR.
//  Jedes Muster trägt ein Kürzel (F1, M2, B3 …). Damit wird aus „die Kacheln
//  wirken klobig" ein Satz, auf den ich zielen kann: „B2: Ecken auf 8, Rand
//  weg." Vorher haben wir beide geraten — er beim Beschreiben, ich beim
//  Umsetzen.
//
//  ⚠️ Diese Seite ist ein WERKZEUG, kein Teil des Spiels. Sie hängt an keiner
//  Navigation und ist nur über `/stil` erreichbar. Wenn das Design steht, kann
//  sie bleiben (dann ist sie die lebende Doku) oder weg — beides in Ordnung.
//
//  ⚠️ Bewusst OHNE die alten Inline-Styles gebaut: hier steht, wie es werden
//  soll, nicht wie es ist. Die Werte kommen aus `globals.css`.
// ============================================================

import { useState } from "react";
import { SCHRIFT, RUND } from "@/lib/theme";
import Aktion from "@/components/Aktion";
import BackLink from "@/components/BackLink";
import { useRueckmeldung } from "@/components/Rueckmeldung";

const FARBEN = [
  ["F1", "--tqs-ink", "Seitengrund"],
  ["F2", "--tqs-ink2", "abgesetzte Karte"],
  ["F3", "--tqs-surface", "Bedienelement"],
  ["F4", "--tqs-surface2", "hervorgehoben"],
  ["F5", "--tqs-text", "Fließtext"],
  ["F6", "--tqs-muted", "Nebeninfo"],
  ["F7", "--tqs-akzent", "Markenfarbe — Hervorhebung, dein Wert"],
  ["F8", "--tqs-mint", "positiv"],
  ["F9", "--tqs-coral", "negativ"],
  // 🔴 Neu am 21.08.2026, als F7 von Gold auf Lila wechselte: der alte
  // Goldton bleibt als eigener WARNTON. Er sagt „sieh hin", nicht „Fehler" —
  // und eine lila Ampelstufe zwischen grün und rot liest niemand als Warnung.
  ["F10", "--tqs-bernstein", "Warnton, gelbe Ampelstufe"],
  // Die drei Verzierungs-Rollen tragen die VEREINSFARBEN des Nutzers. Ohne
  // Auswahl stehen sie auf den Markenwerten.
  ["F11", "--tqs-fan1", "Vereinsfarbe 1 — nur Verzierung"],
  ["F12", "--tqs-fan2", "Vereinsfarbe 2 — nur Verzierung"],
  ["F13", "--tqs-fan3", "Vereinsfarbe 3 — nur Verzierung"],
];

const RUNDUNGEN = [
  // ⚠️ R2 ist Andis bevorzugter Radius (09.08.2026) und BLEIBT 12 px. R1 und
  // R3 haben sich am 23.08.2026 geändert, als aus zwei Leitern eine wurde:
  // R1 ist jetzt der Radius für Winzigkeiten (Balken, Punkte), R3 der äußere
  // Bildschirmrahmen. Was dazwischen liegt, ist R2 — und zwar alles.
  ["R1", "--tqs-rund-klein", "4"],
  ["R2", "--tqs-rund", "12"],
  ["R3", "--tqs-rund-schirm", "26"],
  ["R4", "--tqs-rund-pille", "Pille"],
];

const SCHRIFTEN = [
  ["S1", "--tqs-schrift-mikro", "Mikro — Beschriftung über einem Wert"],
  ["S2", "--tqs-schrift-klein", "Klein — Nebeninfo, Hinweis"],
  ["S3", "--tqs-schrift", "Text — der Normalfall"],
  ["S4", "--tqs-schrift-gross", "Groß — Zeilentitel"],
  ["S5", "--tqs-schrift-titel", "Titel — Abschnitt"],
  ["S6", "--tqs-schrift-schlag", "Schlagzeile — einmal pro Seite"],
];

// Nebenknopf der Rückmeldungs-Muster — steht hier statt inline, damit die
// beiden Knöpfe garantiert gleich aussehen.
const NEBEN = {
  flex: 1, minHeight: 44, cursor: "pointer", fontFamily: "inherit",
  background: "var(--tqs-ink2)", border: "1px solid var(--tqs-line)",
  borderRadius: "var(--tqs-rund)", color: "var(--tqs-muted)",
  fontSize: "var(--tqs-schrift-klein)",
};

export default function Stilmuster() {
  const melder = useRueckmeldung();
  const [an, setAn] = useState(true);
  const [gedrueckt, setGedrueckt] = useState(null);

  return (
    <main style={{
      minHeight: "100vh", background: "var(--tqs-ink)", color: "var(--tqs-text)",
      fontFamily: SCHRIFT,
      padding: "28px 16px 64px", display: "flex", justifyContent: "center",
    }}>
      <div style={{ width: "100%", maxWidth: "var(--tqs-schirm-breite)" }}>
        <BackLink href="/menu" label="Menü" />

        <h1 style={{ fontSize: "var(--tqs-schrift-schlag)", fontWeight: 800, margin: "0 0 6px" }}>
          Musterseite
        </h1>
        <p style={{ fontSize: "var(--tqs-schrift-klein)", color: "var(--tqs-muted)", lineHeight: 1.6, margin: "0 0 8px" }}>
          Jedes Muster hat ein Kürzel. Schreib mir einfach „B2 Ecken zu rund" oder
          „L1 zu grell" — dann treffe ich genau das Richtige.
        </p>
        <p style={{ fontSize: "var(--tqs-schrift-mikro)", color: "var(--tqs-muted)", lineHeight: 1.6, margin: "0 0 24px" }}>
          Drücken und halten zeigt den Druck-Zustand. Auf dem Handy gibt es kein
          Überfahren mit der Maus — die Zeile darunter zeigt ihn trotzdem.
        </p>

        <Titel>Farben</Titel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--tqs-raum-2)" }}>
          {FARBEN.map(([k, v, was]) => (
            <div key={k} style={{
              border: "1px solid var(--tqs-line)", borderRadius: "var(--tqs-rund)", overflow: "hidden",
            }}>
              <div style={{ height: 44, background: `var(${v})` }} />
              <div style={{ padding: "var(--tqs-raum-2)" }}>
                <Kuerzel>{k}</Kuerzel>
                <div style={{ fontSize: "var(--tqs-schrift-mikro)", color: "var(--tqs-muted)", lineHeight: 1.35, marginTop: 2 }}>{was}</div>
              </div>
            </div>
          ))}
        </div>

        <Titel>Ecken</Titel>
        <div style={{ display: "flex", gap: "var(--tqs-raum-2)", flexWrap: "wrap" }}>
          {RUNDUNGEN.map(([k, v, was]) => (
            <div key={k} style={{ textAlign: "center" }}>
              <div style={{
                width: 68, height: 52, background: "var(--tqs-surface)",
                border: "1px solid var(--tqs-line)", borderRadius: `var(${v})`,
              }} />
              <Kuerzel>{k}</Kuerzel>
              <div style={{ fontSize: "var(--tqs-schrift-mikro)", color: "var(--tqs-muted)" }}>{was}</div>
            </div>
          ))}
        </div>

        <Titel>Schrift</Titel>
        {SCHRIFTEN.map(([k, v, was]) => (
          <div key={k} style={{ display: "flex", alignItems: "baseline", gap: "var(--tqs-raum-3)", marginBottom: "var(--tqs-raum-2)" }}>
            <Kuerzel>{k}</Kuerzel>
            <span style={{ fontSize: `var(${v})`, lineHeight: 1.35 }}>{was}</span>
          </div>
        ))}

        <Titel>Bausteine</Titel>

        <Muster k="B1" was="Zeile — der Normalfall der App: antippen, es geht weiter">
          <Aktion href="/stil" style={{
            minHeight: 56, display: "flex", alignItems: "center", gap: "var(--tqs-raum-3)",
            background: "var(--tqs-surface)", border: "1px solid var(--tqs-line)",
            borderRadius: "var(--tqs-rund)", padding: "var(--tqs-raum-3) var(--tqs-raum-4)",
          }}>
            <span style={{ fontSize: "1.25rem" }}>⚽</span>
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontSize: "var(--tqs-schrift-gross)", fontWeight: 700 }}>Wettbewerbe</span>
              <span style={{ display: "block", fontSize: "var(--tqs-schrift-klein)", color: "var(--tqs-muted)" }}>Ligen &amp; Teams</span>
            </span>
            <span style={{ color: "var(--tqs-akzent)", fontFamily: "ui-monospace, monospace", fontSize: "var(--tqs-schrift-klein)" }}>3 gewählt</span>
            <span style={{ color: "var(--tqs-muted)" }}>›</span>
          </Aktion>
        </Muster>

        <Muster k="B2" was="Karte — trägt Inhalt, ist selbst nicht anklickbar">
          <div style={{
            background: "var(--tqs-ink2)", border: "1px solid var(--tqs-line)",
            borderRadius: "var(--tqs-rund)", padding: "var(--tqs-raum-4)",
          }}>
            <div style={{ fontSize: "var(--tqs-schrift-mikro)", color: "var(--tqs-muted)", textTransform: "uppercase", letterSpacing: 1 }}>Spieltag 4</div>
            <div style={{ fontSize: "var(--tqs-schrift-titel)", fontWeight: 700, marginTop: 4 }}>Bayern – Dortmund</div>
            <div style={{ fontSize: "var(--tqs-schrift-klein)", color: "var(--tqs-muted)", marginTop: 4 }}>Sa 18:30 · Quote 2,4</div>
          </div>
        </Muster>

        <Muster k="B3" was="Knopf — die eine wichtige Handlung einer Seite">
          <button className="tqs-aktion" style={{
            width: "100%", minHeight: 48, cursor: "pointer", fontFamily: "inherit",
            background: "var(--tqs-mint)", color: "#fff", border: "none",
            borderRadius: "var(--tqs-rund)", fontSize: "var(--tqs-schrift)", fontWeight: 700,
          }}>Runde jetzt erstellen</button>
        </Muster>

        <Muster k="B4" was="Knopf, zweite Wahl — daneben, nie allein">
          <button className="tqs-aktion" style={{
            width: "100%", minHeight: 48, cursor: "pointer", fontFamily: "inherit",
            background: "var(--tqs-surface)", color: "var(--tqs-text)",
            border: "1px solid var(--tqs-line)", borderRadius: "var(--tqs-rund)",
            fontSize: "var(--tqs-schrift)", fontWeight: 700,
          }}>Abbrechen</button>
        </Muster>

        <Muster k="B5" was="Chips — eine Auswahl aus wenigen">
          <div style={{ display: "flex", gap: "var(--tqs-raum-2)", flexWrap: "wrap" }}>
            {["Bundesliga", "Premier League", "Serie A"].map((t, i) => (
              <button key={t} className="tqs-aktion" onClick={() => setGedrueckt(i)} style={{
                minHeight: 44, cursor: "pointer", fontFamily: "inherit",
                padding: "0 var(--tqs-raum-3)", borderRadius: "var(--tqs-rund-pille)",
                fontSize: "var(--tqs-schrift-klein)", fontWeight: 700,
                background: gedrueckt === i ? "color-mix(in srgb, var(--tqs-mint) 14%, transparent)" : "var(--tqs-surface)",
                color: gedrueckt === i ? "var(--tqs-mint)" : "var(--tqs-muted)",
                border: `1px solid ${gedrueckt === i ? "color-mix(in srgb, var(--tqs-mint) 45%, transparent)" : "var(--tqs-line)"}`,
              }}>{t}</button>
            ))}
          </div>
        </Muster>

        <Muster k="B6" was="Schalter — an oder aus, sonst nichts">
          <button className="tqs-aktion" onClick={() => setAn((v) => !v)} style={{
            width: "100%", minHeight: 48, display: "flex", alignItems: "center", gap: "var(--tqs-raum-3)",
            cursor: "pointer", fontFamily: "inherit", textAlign: "left",
            background: "var(--tqs-surface)", color: "var(--tqs-text)",
            border: `1px solid ${an ? "color-mix(in srgb, var(--tqs-mint) 45%, transparent)" : "var(--tqs-line)"}`,
            borderRadius: "var(--tqs-rund)", padding: "0 var(--tqs-raum-4)", fontSize: "var(--tqs-schrift)",
          }}>
            <span style={{ flex: 1 }}>Auf bestimmte Teams beschränken</span>
            <span style={{
              width: 40, height: 24, borderRadius: RUND.pille, position: "relative", flexShrink: 0,
              background: an ? "var(--tqs-mint)" : "var(--tqs-surface2)",
              transition: "background var(--tqs-dauer) var(--tqs-kurve)",
            }}>
              <span style={{
                position: "absolute", top: 3, left: an ? 19 : 3, width: 18, height: 18,
                borderRadius: RUND.pille, background: "#fff",
                transition: "left var(--tqs-dauer) var(--tqs-kurve-feder)",
              }} />
            </span>
          </button>
        </Muster>

        <Titel>Bewegung</Titel>
        <p style={{ fontSize: "var(--tqs-schrift-klein)", color: "var(--tqs-muted)", lineHeight: 1.6, margin: "0 0 12px" }}>
          L1 leuchtet, solange die nächste Seite lädt — kein Timer, der Link weiß
          selbst Bescheid. Auf einer schnellen Verbindung blitzt es nur kurz auf;
          das ist richtig so.
        </p>

        <Muster k="L1" was="Laden — Leuchten bis die Seite da ist (antippen)">
          <Aktion href="/tippen" style={{
            minHeight: 56, display: "flex", alignItems: "center",
            background: "var(--tqs-surface)", border: "1px solid var(--tqs-line)",
            borderRadius: "var(--tqs-rund)", padding: "0 var(--tqs-raum-4)",
            fontSize: "var(--tqs-schrift)", fontWeight: 700,
          }}>Zur Spielwahl →</Aktion>
        </Muster>

        <Muster k="L2" was="Hereinkommen — für Inhalt, der nachgeladen wurde">
          <div className="tqs-auf" key={String(an)} style={{
            background: "var(--tqs-ink2)", border: "1px solid var(--tqs-line)",
            borderRadius: "var(--tqs-rund)", padding: "var(--tqs-raum-3) var(--tqs-raum-4)",
            fontSize: "var(--tqs-schrift-klein)", color: "var(--tqs-muted)",
          }}>
            Schalte B6 um — dieser Kasten kommt jedes Mal neu herein.
          </div>
        </Muster>

        <Muster k="L3" was="Platzhalter — steht in der Größe dessen, was kommt">
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--tqs-raum-2)" }}>
            <div className="tqs-skelett" style={{ height: 56 }} />
            <div className="tqs-skelett" style={{ height: 56, width: "70%" }} />
          </div>
        </Muster>

        <Muster k="L4" was={'Rückmeldung — „gespeichert“, antippen zum Auslösen'}>
          <button onClick={() => melder.gespeichert("Beispiel gespeichert")} style={{
            minHeight: 56, width: "100%", cursor: "pointer", fontFamily: "inherit",
            background: "var(--tqs-surface)", border: "1px solid var(--tqs-line)",
            borderRadius: "var(--tqs-rund)", color: "var(--tqs-text)",
            fontSize: "var(--tqs-schrift)", fontWeight: 700,
          }}>Melden lassen</button>
          <div style={{ display: "flex", gap: "var(--tqs-raum-2)", marginTop: "var(--tqs-raum-2)" }}>
            <button onClick={() => melder.fehler("Beispiel: ging nicht")} style={NEBEN}>Fehler</button>
            <button onClick={() => melder.info("Beispiel: Hinweis")} style={NEBEN}>Hinweis</button>
          </div>
        </Muster>

        <Muster k="L5" was="Haken — für den Moment nach dem Speichern">
          <span key={String(an)} className="tqs-haken" style={{
            fontSize: "var(--tqs-schrift-schlag)", color: "var(--tqs-mint)",
          }}>✓</span>
        </Muster>

        <p style={{ fontSize: "var(--tqs-schrift-mikro)", color: "var(--tqs-muted)", lineHeight: 1.6, marginTop: "var(--tqs-raum-6)" }}>
          Wer am Gerät „Bewegung reduzieren" eingeschaltet hat, sieht alle
          Zustände, aber keine Bewegung dorthin. Das ist eingebaut, nicht
          nachträglich.
        </p>
      </div>
    </main>
  );
}

function Titel({ children }) {
  return (
    <div style={{
      fontSize: "var(--tqs-schrift-mikro)", color: "var(--tqs-muted)",
      textTransform: "uppercase", letterSpacing: 1,
      marginTop: "var(--tqs-raum-6)", marginBottom: "var(--tqs-raum-3)",
      paddingBottom: "var(--tqs-raum-1)", borderBottom: "1px solid var(--tqs-line)",
    }}>{children}</div>
  );
}

function Kuerzel({ children }) {
  return (
    <span style={{
      fontFamily: "ui-monospace, monospace", fontSize: "0.6875rem", fontWeight: 700,
      color: "var(--tqs-akzent)", border: "1px solid color-mix(in srgb, var(--tqs-akzent) 40%, transparent)",
      borderRadius: RUND.pille, padding: "1px 6px", whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

function Muster({ k, was, children }) {
  return (
    <div style={{ marginBottom: "var(--tqs-raum-5)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--tqs-raum-2)", marginBottom: "var(--tqs-raum-2)" }}>
        <Kuerzel>{k}</Kuerzel>
        <span style={{ fontSize: "var(--tqs-schrift-mikro)", color: "var(--tqs-muted)", lineHeight: 1.35 }}>{was}</span>
      </div>
      {children}
    </div>
  );
}
