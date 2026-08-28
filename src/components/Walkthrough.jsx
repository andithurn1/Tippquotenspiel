"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  SCHRITTE, WALKTHROUGH_KAPITEL, schrittAn, weiter, zurueck,
  kapitelUeberspringen, kapitelAnfang, fortschritt, merkeWalkthrough,
} from "@/lib/walkthrough";
import { C, RUND, MONO, TEXT } from "@/lib/theme";
import { TAPZIEL } from "@/lib/tapziel";

// ── Der geführte Rundgang (RF5) ─────────────────────────────
//
// 🔴 Andis Bild dafür: „wie in nem klassichen Handyspiel bzw aufbauspiel
// Tutorial" — Pfeil auf ein Bedienelement, ein Satz dazu, weiterklicken.
//
// Drei Dinge, die diese Bauart ausmachen und die man einzeln verlieren kann:
//
//  1. **Das Loch im Dunkel.** Der Rest der Seite wird abgedunkelt, das Ziel
//     bleibt hell. Gemacht mit EINEM Kasten und `box-shadow: 0 0 0 9999px` —
//     der Schatten füllt alles außerhalb. Vier Rechtecke drumherum wären
//     dieselbe Optik mit vier Rundungsfehlern an den Ecken.
//  2. **Der Pfeil zeigt wirklich hin**, er liegt nicht dekorativ daneben. Er
//     sitzt an der Blasenkante, die zum Ziel zeigt, und wechselt die Seite,
//     wenn die Blase unter das Ziel rutscht.
//  3. **Der Ausgang ist immer sichtbar.** Ein Tutorial, das man wegklicken
//     will und nicht findet, ist eine Sperre. Deshalb steht „Beenden" in
//     jedem Schritt, nicht erst am Ende.
//
// ⚠️ **Warum die Maße bei JEDEM Schritt neu gemessen werden** und nicht
// einmal beim Öffnen: der Rundgang scrollt selbst zum Ziel, die klebende
// Ampel verschiebt sich dabei, und auf dem Handy klappt beim Drehen die halbe
// Höhe weg. Ein einmal gemessenes Rechteck zeigt nach dem ersten Scrollen
// daneben — und ein Pfeil, der danebenzeigt, ist schlimmer als keiner.
//
// ⚠️ **Fehlt das Ziel-Element, wird der Schritt zur Karte in der Mitte** statt
// zu einem Pfeil ins Leere. Das passiert im echten Betrieb: Abschnitte
// erscheinen erst in der Profi-Stufe, und der Rundgang darf daran nicht
// zerbrechen.

const RAND = 8;          // wie viel Luft das Loch um das Ziel lässt
const BLASE_BREIT = 340; // Höchstbreite der Sprechblase

export default function Walkthrough({ offen, onSchliessen, aufSchritt = null }) {
  const [index, setIndex] = useState(0);
  const [rechteck, setRechteck] = useState(null);
  const [uebersicht, setUebersicht] = useState(false);
  const messTimer = useRef(null);

  // 🔴 **Der Rundgang hängt an `document.body`, nicht an dieser Stelle im
  // Baum — und das ist kein Aufräumen, sondern die Reparatur eines echten
  // Fehlers.**
  //
  // Gemessen am 29.08.2026: der Scheinwerfer stand meilenweit daneben. Sein
  // `style.top` war RICHTIG (−906 px, genau am Ziel), sein tatsächliches
  // Rechteck lag bei −29 989. Ursache: ein Vorfahr auf dem Erstellungs-Screen
  // trägt die Einblend-Klasse `tqs-auf` mit einem `transform` — und ein
  // Element mit `transform` wird zum BEZUGSRAHMEN für alles darin, was
  // `position: fixed` ist. Das Overlay klebte damit am Dokument statt am
  // Fenster, und die Seitenhöhe wuchs von 8 000 auf 34 780 px.
  //
  // ⚠️ Die Falle ist heimtückisch, weil sie NICHT hier entsteht: dieses Bauteil
  // ist richtig, der Fehler kommt aus einer Animationsklasse drei Ebenen
  // darüber. Wer den Rundgang später woanders einhängt, nimmt das Portal bitte
  // mit — sonst kommt es genau so zurück.
  const [amKoerper, setAmKoerper] = useState(false);
  useEffect(() => { setAmKoerper(true); }, []);

  const schritt = schrittAn(index);

  // ⚠️ Beide Handgriffe stehen VOR den Effekten, weil der Escape-Effekt
  // `beenden` benutzt. Andersherum stünde im Effekt eine Bindung, die zum
  // Zeitpunkt seiner Registrierung noch nicht belegt ist.
  const beenden = useCallback(() => {
    merkeWalkthrough();
    onSchliessen?.();
  }, [onSchliessen]);

  const gehe = useCallback((naechster) => {
    if (naechster == null) { beenden(); return; }
    setIndex(naechster);
    aufSchritt?.(schrittAn(naechster));
  }, [beenden, aufSchritt]);

  // ── Ziel suchen, hinscrollen, ausmessen ───────────────────
  const messen = useCallback(() => {
    if (!schritt?.ziel || typeof document === "undefined") { setRechteck(null); return; }
    const el = document.getElementById(schritt.ziel);
    if (!el) { setRechteck(null); return; }
    const r = el.getBoundingClientRect();
    // Ein Element mit Höhe 0 (ein reiner Ankerpunkt, davon gibt es welche)
    // ergäbe ein Loch, das man nicht sieht. Dann lieber die Karte.
    if (r.height < 4 && r.width < 4) { setRechteck(null); return; }
    setRechteck({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [schritt]);

  useEffect(() => {
    if (!offen || !schritt) return undefined;
    const el = schritt.ziel && typeof document !== "undefined"
      ? document.getElementById(schritt.ziel) : null;
    // 🔴 **OHNE `behavior: "smooth"` — und das steht schon in
    // `Spielerstellung.jsx` bei der Sprungleiste, gemessen.** Ich bin trotzdem
    // hineingelaufen: mit `smooth` passierte im Browser GAR NICHTS. Gemessen
    // am 29.08.2026 an `abs-joker`: mit `smooth` blieb `scrollY` auf 0, ohne
    // sprang es auf 5776. Der Schritt wechselte, der Pfeil zeigte auf eine
    // Stelle weit außerhalb des Bildes — ein Rundgang, der nicht hinscrollt,
    // erklärt nichts.
    //
    // ✅ Der harte Sprung ist hier ohnehin der bessere: der Pfeil steht sofort
    // richtig, es gibt keine laufende Animation, gegen die die Messung
    // anrennt, und „Bewegung reduzieren" ist automatisch respektiert.
    if (el) el.scrollIntoView({ block: "center" });
    // Danach messen. Der zweite und dritte Durchgang fangen, was sich noch
    // setzt: die klebende Kopfzeile, ein nachladendes Bild, ein Aufklappen.
    messen();
    clearTimeout(messTimer.current);
    messTimer.current = setTimeout(messen, 420);
    const nochmal = setTimeout(messen, 900);
    window.addEventListener("resize", messen);
    window.addEventListener("scroll", messen, { passive: true });
    return () => {
      clearTimeout(messTimer.current);
      clearTimeout(nochmal);
      window.removeEventListener("resize", messen);
      window.removeEventListener("scroll", messen);
    };
  }, [offen, schritt, messen]);

  // 🔴 **Die Marke wird beim ÖFFNEN gesetzt, nicht beim Beenden** — dieselbe
  // Lehre wie bei `erstkontakt.js` (G5), und sie ist dort teuer bezahlt
  // worden: hängt die Marke am Wegklicken, kommt der Rundgang bei jedem Start
  // wieder, bis jemand zufällig den richtigen Knopf trifft. Wer die Seite
  // einfach zumacht, hat ihn gesehen und will ihn nicht nochmal.
  useEffect(() => {
    if (offen) merkeWalkthrough();
  }, [offen]);

  // Escape beendet — dieselbe Erwartung wie bei jedem Overlay.
  useEffect(() => {
    if (!offen) return undefined;
    const auf = (e) => { if (e.key === "Escape") beenden(); };
    window.addEventListener("keydown", auf);
    return () => window.removeEventListener("keydown", auf);
  }, [offen, beenden]);

  // ⚠️ Vor dem ersten Effekt im Browser gibt es kein `document.body` (der
  // Server rendert mit) — dann nichts zeigen statt abstürzen.
  if (!offen || !schritt || !amKoerper) return null;

  const f = fortschritt(index);
  const hatZiel = rechteck != null;

  // Blase unter das Ziel, wenn darunter Platz ist — sonst darüber. Auf einem
  // schmalen Schirm klebt sie am unteren Rand: dort liegt der Daumen.
  const schirmHoehe = typeof window === "undefined" ? 800 : window.innerHeight;
  const untenPlatz = hatZiel ? schirmHoehe - (rechteck.top + rechteck.height) : 0;
  const blaseUnten = hatZiel && untenPlatz > 260;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Rundgang: ${schritt.titel}`}
      style={{ position: "fixed", inset: 0, zIndex: 900 }}
    >
      {/* ── Das Loch im Dunkel ────────────────────────────────
          Ohne Ziel wird der ganze Schirm gleichmäßig dunkel: eine Karte in
          der Mitte hat nichts, worauf sie zeigen könnte. */}
      {hatZiel ? (
        <div
          onClick={() => gehe(weiter(index))}
          style={{
            position: "fixed",
            top: rechteck.top - RAND,
            left: rechteck.left - RAND,
            width: rechteck.width + RAND * 2,
            height: rechteck.height + RAND * 2,
            borderRadius: RUND.karte,
            boxShadow: `0 0 0 9999px ${C.ink}D9, 0 0 0 2px ${C.akzent}AA inset`,
            border: `2px solid ${C.akzent}`,
            pointerEvents: "auto",
          }}
        />
      ) : (
        <div onClick={() => gehe(weiter(index))}
          style={{ position: "fixed", inset: 0, background: `${C.ink}E6` }} />
      )}

      {/* ── Die Sprechblase ───────────────────────────────── */}
      <div style={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        // ⚠️ Über dem Ziel wird die Blase an ihrer UNTERKANTE verankert
        // (`bottom`), nicht an der Oberkante. Mit `top` müsste man ihre Höhe
        // vorher kennen — die hängt aber am Text und an den Aufzählungen und
        // ist mal 180 und mal 500 px. Ein geratener Wert schöbe die Blase über
        // das Ziel oder aus dem Bild.
        ...(hatZiel
          ? (blaseUnten
            ? { top: rechteck.top + rechteck.height + RAND + 14 }
            : { bottom: Math.max(12, schirmHoehe - rechteck.top + RAND + 14) })
          : { top: "50%", transform: "translate(-50%, -50%)" }),
        width: `min(${BLASE_BREIT}px, calc(100vw - 24px))`,
        background: C.surface,
        border: `1px solid ${C.line}`,
        borderRadius: RUND.karte,
        boxShadow: `0 12px 40px ${C.ink}88`,
      }}>
        {/* Der Pfeil. Ein gedrehtes Quadrat mit denselben zwei Kanten wie die
            Blase — ein Dreieck aus Rahmen-Tricks hätte keinen Rand.
            🔴 **Er steht auf dem RAHMEN, nicht im Scrollbereich darunter.**
            In der ersten Fassung saß er im selben Kasten wie der Text, und der
            trug `overflow-y: auto` — das schneidet alles ab, was außerhalb
            liegt, und der Pfeil war unsichtbar. Im Browser gesehen am
            29.08.2026: Scheinwerfer da, Blase da, Pfeil weg. */}
        {hatZiel && (
          <div style={{
            position: "absolute",
            left: "50%",
            marginLeft: -7,
            width: 14, height: 14,
            background: C.surface,
            transform: "rotate(45deg)",
            ...(blaseUnten
              ? { top: -8, borderLeft: `1px solid ${C.line}`, borderTop: `1px solid ${C.line}` }
              : { bottom: -8, borderRight: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}` }),
          }} />
        )}

        {/* Der scrollende Teil. Getrennt vom Rahmen, damit der Pfeil oben
            stehen bleiben kann (siehe Kommentar darüber). */}
        <div style={{
          maxHeight: "min(70vh, 560px)",
          overflowY: "auto",
          padding: "16px 16px 12px",
          borderRadius: RUND.karte,
        }}>

        {/* Kopfzeile: wo bin ich, und wie lang ist das noch */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <button
            onClick={() => setUebersicht((v) => !v)}
            title="Alle Kapitel"
            style={{
              ...TAPZIEL, cursor: "pointer", fontFamily: "inherit",
              background: "none", border: "none", padding: "0 4px 0 0",
              color: C.akzent, fontSize: TEXT.caption1, fontWeight: 700,
              textAlign: "left",
            }}
          >
            {schritt.kapitelKurz} ▾
          </button>
          <span style={{ fontFamily: MONO, fontSize: TEXT.caption2, color: C.muted, marginLeft: "auto" }}>
            {f.kapitelNr}/{f.kapitelAnzahl} · {f.imKapitel}/{f.kapitelLaenge}
          </span>
        </div>

        {/* Fortschrittsbalken — eine Länge zu sehen ist der Unterschied
            zwischen „gleich fertig" und „wie lange noch". */}
        <div style={{ height: 3, background: C.line, borderRadius: RUND.pille, marginBottom: 12 }}>
          <div style={{
            width: `${Math.round(f.anteil * 100)}%`, height: "100%",
            background: C.akzent, borderRadius: RUND.pille,
          }} />
        </div>

        {uebersicht ? (
          <div>
            <div style={{ fontSize: TEXT.caption1, color: C.muted, marginBottom: 8 }}>
              Spring hin, wo du willst:
            </div>
            {WALKTHROUGH_KAPITEL.map((k, i) => (
              <button
                key={k.key}
                onClick={() => { setUebersicht(false); gehe(kapitelAnfang(k.key)); }}
                style={{
                  ...TAPZIEL, display: "block", width: "100%", textAlign: "left",
                  cursor: "pointer", fontFamily: "inherit", marginBottom: 4,
                  background: k.key === schritt.kapitel ? `${C.akzent}1A` : "transparent",
                  border: `1px solid ${k.key === schritt.kapitel ? C.akzent + "55" : C.line}`,
                  borderRadius: RUND.karte, padding: "8px 10px",
                  color: C.text, fontSize: TEXT.footnote,
                }}
              >
                <span style={{ fontFamily: MONO, color: C.muted, marginRight: 8 }}>{i + 1}</span>
                {k.titel}
              </button>
            ))}
          </div>
        ) : (
          <>
            <div style={{ fontSize: TEXT.callout, fontWeight: 700, color: C.text, lineHeight: 1.3 }}>
              {schritt.titel}
            </div>
            <p style={{ fontSize: TEXT.footnote, color: C.muted, margin: "8px 0 0", lineHeight: 1.55 }}>
              {schritt.text}
            </p>

            {/* Die Aufzählungen kommen aus `drehrad.js` — siehe Kopf von
                `walkthrough.js`. Hier wird nur gezeichnet. */}
            {schritt.liste?.length > 0 && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 7 }}>
                {schritt.liste.map((e) => (
                  <div key={e.label} style={{
                    background: C.ink, border: `1px solid ${C.line}`,
                    borderRadius: RUND.karte, padding: "8px 10px",
                  }}>
                    <div style={{ fontSize: TEXT.caption1, fontWeight: 700, color: C.text }}>{e.label}</div>
                    <div style={{ fontSize: TEXT.caption2, color: C.muted, lineHeight: 1.45, marginTop: 2 }}>
                      {e.desc}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Steuerung ─────────────────────────────────────
            „Teil überspringen" steht bewusst NEBEN „Weiter" und nicht
            versteckt: es ist Andis ausdrücklicher Wunsch und der häufigere
            Fall als „alles abbrechen". */}
        <div style={{ display: "flex", gap: 6, marginTop: 14, alignItems: "center" }}>
          <Knopf onClick={() => gehe(zurueck(index))} schwach>Zurück</Knopf>
          <Knopf onClick={() => gehe(kapitelUeberspringen(index))} schwach>Teil überspringen</Knopf>
          <div style={{ flex: 1 }} />
          <Knopf onClick={() => gehe(weiter(index))} stark>
            {index + 1 >= SCHRITTE.length ? "Fertig" : "Weiter"}
          </Knopf>
        </div>
        <button
          onClick={beenden}
          style={{
            ...TAPZIEL, width: "100%", marginTop: 4, cursor: "pointer",
            fontFamily: "inherit", background: "none", border: "none",
            color: C.muted, fontSize: TEXT.caption2,
          }}
        >
          Rundgang beenden
        </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Knopf({ children, onClick, stark = false, schwach = false }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...TAPZIEL, cursor: "pointer", fontFamily: "inherit",
        padding: "8px 12px", borderRadius: RUND.pille,
        fontSize: TEXT.caption1, fontWeight: 700,
        background: stark ? C.akzent : "transparent",
        color: stark ? C.ink : (schwach ? C.muted : C.text),
        border: `1px solid ${stark ? C.akzent : C.line}`,
      }}
    >
      {children}
    </button>
  );
}
