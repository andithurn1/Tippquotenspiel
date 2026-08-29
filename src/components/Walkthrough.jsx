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
// 🔴 Andis Zuschnitt vom 29.08.2026, und er ist strenger als die erste
// Fassung: *„sehr interaktiv mit aufblinkenden Pfeilen die eben erst zum
// nächsten Schritt gehen wenn was eingetippt wurde … erst wenn der Klick
// richtig gesetzt wurde springt (mit scrollanimation) weiter."*
//
// Damit ist es kein Textheft mit Pfeil mehr, sondern ein Tutorial wie in einem
// Aufbauspiel. Vier Sachen machen den Unterschied, und jede einzelne kann man
// verlieren:
//
//  1. **Der Schritt WARTET.** Trägt er eine `aktion`, geht es erst weiter,
//     wenn der Nutzer sie wirklich ausgeführt hat — nicht, wenn er „Weiter"
//     drückt. Ein Tutorial, das man durchklicken kann, ohne etwas zu tun, ist
//     eine Diashow.
//  2. **Die Blase deckt nie zu, worauf sie zeigt.** Andi ausdrücklich: *„in
//     der Regel oberes Drittel Einblendung mit Pfeil auf das zu klickende."*
//     Deshalb wird das ZIEL in die untere Hälfte gescrollt und die Blase sitzt
//     oben. Immer dieselbe Geometrie — der Blick muss sie nicht jedes Mal neu
//     suchen.
//  3. **Der Pfeil winkt.** Ein stehender Pfeil geht im Gewimmel unter.
//  4. **Der Scheinwerfer lässt Klicks DURCH.** `pointer-events: none` — sonst
//     könnte man genau das nicht anklicken, worauf gezeigt wird. Das ist der
//     Unterschied zwischen „zeigen" und „machen lassen".
//
// ⚠️ **Gescrollt wird von Hand, nicht mit `behavior: "smooth"`.** Gemessen am
// 29.08.2026: mit `smooth` bewegte sich im Browser GAR NICHTS (`scrollY` blieb
// 0 statt auf 7221 zu springen) — dieselbe Falle steht schon bei der
// Sprungleiste in `Spielerstellung.jsx`. Die eigene Animation läuft über
// `requestAnimationFrame` und hält sich an „Bewegung reduzieren".
//
// ⚠️ **Das Overlay hängt per Portal an `document.body`.** Ein Vorfahr auf dem
// Erstellungs-Screen trägt die Einblend-Klasse `tqs-auf` mit `transform`, und
// ein Element mit `transform` wird zum Bezugsrahmen für alles `fixed` darin.
// Ohne Portal stand der Scheinwerfer 29 000 px daneben (gemessen).

const RAND = 8;            // Luft, die das Loch um das Ziel lässt
const BLASE_BREIT = 360;   // Höchstbreite der Sprechblase
const BLASE_OBEN = 12;     // Abstand der Blase zur Oberkante
const LUFT = 26;           // Abstand zwischen Blasenunterkante und Ziel
const SCROLL_MS = 420;

const ruhig = () => typeof window !== "undefined"
  && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

// Eigene Scroll-Animation. `scrollTo({behavior:"smooth"})` tut hier nichts —
// siehe Kopf. Weiche Kurve, damit der Sprung nicht ruckt.
function scrolleZu(y, fertig) {
  if (typeof window === "undefined") { fertig?.(); return; }
  const ziel = Math.max(0, y);
  const von = window.scrollY;
  const weg = ziel - von;
  if (ruhig() || Math.abs(weg) < 2) { window.scrollTo(0, ziel); fertig?.(); return; }
  const start = performance.now();
  const schritt = (jetzt) => {
    const t = Math.min(1, (jetzt - start) / SCROLL_MS);
    const e = t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;   // easeInOutQuad
    window.scrollTo(0, von + weg * e);
    if (t < 1) requestAnimationFrame(schritt); else fertig?.();
  };
  requestAnimationFrame(schritt);
}

export default function Walkthrough({ offen, onSchliessen, aufSchritt = null }) {
  const [index, setIndex] = useState(0);
  const [rechteck, setRechteck] = useState(null);
  const [uebersicht, setUebersicht] = useState(false);
  const [erledigt, setErledigt] = useState(false);   // Aktion dieses Schritts getan?
  const [amKoerper, setAmKoerper] = useState(false);
  // Blase unter das Ziel statt darüber? Nur der Ausnahmefall, siehe Effekt.
  const [blaseUnten, setBlaseUnten] = useState(false);
  const messTimer = useRef(null);
  const blaseRef = useRef(null);

  useEffect(() => { setAmKoerper(true); }, []);

  const schritt = schrittAn(index);

  const beenden = useCallback(() => {
    merkeWalkthrough();
    onSchliessen?.();
  }, [onSchliessen]);

  const gehe = useCallback((naechster) => {
    if (naechster == null) { beenden(); return; }
    setErledigt(false);
    setIndex(naechster);
    aufSchritt?.(schrittAn(naechster));
  }, [beenden, aufSchritt]);

  // ── Ziel ausmessen ────────────────────────────────────────
  const zielElement = useCallback(() => {
    if (!schritt?.ziel || typeof document === "undefined") return null;
    return document.getElementById(schritt.ziel);
  }, [schritt]);

  const messen = useCallback(() => {
    const el = zielElement();
    if (!el) { setRechteck(null); return; }
    const r = el.getBoundingClientRect();
    // Ein reiner Ankerpunkt ohne Fläche ergäbe ein Loch, das man nicht sieht.
    if (r.height < 4 && r.width < 4) { setRechteck(null); return; }
    setRechteck({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [zielElement]);

  // ── Hinscrollen: das Ziel UNTER die Blase ─────────────────
  //
  // 🔴 Andi ausdrücklich: *„achte darauf dass dann immer automatisch so
  // gescrolled bzw gewischt wird, dass die Einblendungsfelder grade nicht das
  // wesentliche überdecken."*
  //
  // ⚠️ **Ein fester Prozentwert reicht dafür nicht** — das war die erste
  // Fassung und im Browser gemessen falsch: die Blase reichte bis 366 px, das
  // Ziel begann bei 312, also 54 px Überdeckung. Der Grund ist, dass die Blase
  // KEINE feste Höhe hat: ein Schritt mit sieben Aufzählungspunkten ist
  // doppelt so hoch wie einer mit zwei Sätzen.
  //
  // ✅ Deshalb wird an der ECHTEN Blasenhöhe ausgerichtet. Sie steht schon im
  // DOM, wenn dieser Effekt läuft — Effekte laufen nach dem Rendern.
  useEffect(() => {
    if (!offen || !schritt) return undefined;
    const el = zielElement();
    if (el) {
      const r = el.getBoundingClientRect();
      const blaseHoch = blaseRef.current?.getBoundingClientRect().height ?? 300;
      const wunschTop = BLASE_OBEN + blaseHoch + LUFT;
      // 🔴 **Der Ausnahmefall, und er ist keine Kleinigkeit: manches Ziel kann
      // gar nicht unter die Blase.** Das Code-Feld sitzt auf Dokumentposition
      // 312 — um es auf 365 zu bringen, müsste `scrollY` auf −53, und das gibt
      // es nicht. Gemessen am 29.08.2026; die Überdeckung blieb hartnäckig,
      // bis ich nachgerechnet habe statt weiter am Scrollen zu drehen.
      //
      // ✅ Dann wandert die BLASE unter das Ziel und der Pfeil dreht sich um.
      // Andis Vorgabe war „in der Regel oberes Drittel" — „in der Regel" lässt
      // genau diesen Fall zu, und eine Blase, die das Wesentliche verdeckt,
      // wäre der schlechtere Bruch.
      const dokTop = r.top + window.scrollY;
      const passtDrunter = dokTop >= wunschTop;
      setBlaseUnten(!passtDrunter);
      scrolleZu(
        passtDrunter
          ? window.scrollY + r.top - wunschTop
          // Blase unten: das Ziel nach oben holen, damit darunter Platz bleibt.
          : window.scrollY + r.top - BLASE_OBEN - 40,
        messen,
      );
    }
    // 🔴 **Nachjustieren, und das ist keine Vorsicht, sondern nachgemessen.**
    // Beim ersten Anlauf stand das Ziel trotzdem 53 px zu hoch — gerechnet
    // wurde mit der Blasenhöhe des VORIGEN Schritts (274 statt 327; 12 + 274 +
    // 26 ergibt exakt die beobachteten 312). Wann genau die neue Höhe steht,
    // hängt an Schriftladen und Umbruch und ist nichts, worauf man sich
    // verlassen sollte.
    //
    // ✅ Also nach dem Scrollen noch einmal nachsehen und den Rest schieben.
    // Das ist billig (ein Rechteck) und macht die Zusage unabhängig davon,
    // wann welche Höhe feststeht.
    const nachjustieren = () => {
      messen();
      const ziel = zielElement();
      const blase = blaseRef.current;
      if (!ziel || !blase) return;
      const z = ziel.getBoundingClientRect();
      const b = blase.getBoundingClientRect();
      // ⚠️ Das Vorzeichen ist die ganze Zeile: um das Ziel im Bild nach UNTEN
      // zu schieben, muss die Seite nach OBEN scrollen. Beim ersten Versuch
      // stand hier `+`, und die Überdeckung blieb exakt gleich groß.
      const fehlt = blaseUnten
        ? (z.bottom + LUFT) - b.top      // Blase unten: Ziel nach OBEN schieben
        : (b.bottom + LUFT) - z.top;     // Blase oben:  Ziel nach UNTEN schieben
      if (fehlt > 2) scrolleZu(window.scrollY + (blaseUnten ? fehlt : -fehlt), messen);
    };

    messen();
    clearTimeout(messTimer.current);
    messTimer.current = setTimeout(nachjustieren, SCROLL_MS + 80);
    const spaet = setTimeout(nachjustieren, 1000);
    window.addEventListener("resize", messen);
    window.addEventListener("scroll", messen, { passive: true });
    return () => {
      clearTimeout(messTimer.current);
      clearTimeout(spaet);
      window.removeEventListener("resize", messen);
      window.removeEventListener("scroll", messen);
    };
  }, [offen, schritt, messen, zielElement, blaseUnten]);

  // ── 🔴 Auf die echte Handlung warten ──────────────────────
  //
  // `aktion: "klick"`   — irgendwo INNERHALB des Ziels wurde geklickt.
  // `aktion: "eingabe"` — ein Feld im Ziel trägt jetzt etwas.
  //
  // ⚠️ Gelauscht wird in der EINFANG-Phase am Dokument. Ein Klick auf einen
  // Knopf, der sich beim Klick selbst entfernt (ein Menü, das zuklappt), wäre
  // sonst schon weg, bevor der Lauscher dran ist.
  useEffect(() => {
    if (!offen || !schritt?.aktion || erledigt) return undefined;
    const el = zielElement();
    if (!el) return undefined;

    const drin = (n) => n instanceof Node && el.contains(n);

    const aufKlick = (e) => { if (drin(e.target)) setErledigt(true); };
    const aufEingabe = (e) => {
      if (!drin(e.target)) return;
      if (String(e.target.value ?? "").trim().length > 0) setErledigt(true);
    };

    if (schritt.aktion === "klick") document.addEventListener("click", aufKlick, true);
    if (schritt.aktion === "eingabe") document.addEventListener("input", aufEingabe, true);
    return () => {
      document.removeEventListener("click", aufKlick, true);
      document.removeEventListener("input", aufEingabe, true);
    };
  }, [offen, schritt, erledigt, zielElement]);

  // Ist die Handlung getan, geht es von selbst weiter — mit einer kurzen
  // Pause, damit man das Häkchen noch sieht und der Sprung nicht überfällt.
  useEffect(() => {
    if (!erledigt || !schritt?.aktion) return undefined;
    const t = setTimeout(() => gehe(weiter(index)), ruhig() ? 250 : 700);
    return () => clearTimeout(t);
  }, [erledigt, schritt, index, gehe]);

  // Die Marke wird beim ÖFFNEN gesetzt, nicht beim Beenden — dieselbe Lehre
  // wie bei `erstkontakt.js` (G5): sonst kommt der Rundgang bei jedem Start
  // wieder, bis jemand zufällig den richtigen Knopf trifft.
  useEffect(() => { if (offen) merkeWalkthrough(); }, [offen]);

  useEffect(() => {
    if (!offen) return undefined;
    const auf = (e) => { if (e.key === "Escape") beenden(); };
    window.addEventListener("keydown", auf);
    return () => window.removeEventListener("keydown", auf);
  }, [offen, beenden]);

  if (!offen || !schritt || !amKoerper) return null;

  const f = fortschritt(index);
  const hatZiel = rechteck != null;
  const wartet = Boolean(schritt.aktion) && !erledigt;

  return createPortal(
    <div
      role="dialog"
      aria-modal="false"
      aria-label={`Rundgang: ${schritt.titel}`}
      style={{ position: "fixed", inset: 0, zIndex: 900, pointerEvents: "none" }}
    >
      {/* ── Der Scheinwerfer ──────────────────────────────────
          🔴 `pointerEvents: "none"` ist hier die wichtigste Zeile. Der Nutzer
          soll das Ding ANKLICKEN, auf das gezeigt wird — ein Loch, das Klicks
          abfängt, macht aus dem Tutorial eine Vorführung. */}
      {hatZiel ? (
        <div
          className="tqs-tut-loch"
          style={{
            position: "fixed",
            top: rechteck.top - RAND,
            left: rechteck.left - RAND,
            width: rechteck.width + RAND * 2,
            height: rechteck.height + RAND * 2,
            borderRadius: RUND.karte,
            boxShadow: `0 0 0 9999px ${C.ink}D0`,
            border: `2px solid ${C.akzent}`,
            pointerEvents: "none",
          }}
        />
      ) : (
        <div style={{ position: "fixed", inset: 0, background: `${C.ink}E6`, pointerEvents: "auto" }} />
      )}

      {/* ── Die Sprechblase: IMMER oben ───────────────────────
          Andis Vorgabe: oberes Drittel, Pfeil nach unten auf das Ziel. Eine
          feste Geometrie ist hier mehr wert als eine schlaue: der Blick muss
          die Blase nicht bei jedem Schritt neu suchen. */}
      <div ref={blaseRef} style={{
        position: "fixed",
        ...(blaseUnten && hatZiel
          ? { top: Math.min(rechteck.top + rechteck.height + RAND + 14, window.innerHeight - 120) }
          : { top: BLASE_OBEN }),
        left: "50%",
        transform: "translateX(-50%)",
        width: `min(${BLASE_BREIT}px, calc(100vw - 20px))`,
        maxHeight: "40vh",
        background: C.surface,
        border: `1px solid ${C.line}`,
        borderRadius: RUND.karte,
        boxShadow: `0 12px 40px ${C.ink}88`,
        pointerEvents: "auto",
      }}>
        {/* Der winkende Pfeil an der Unterkante — zeigt nach unten aufs Ziel.
            ⚠️ Er sitzt auf dem RAHMEN, nicht im Scrollbereich darunter: der
            trägt `overflow-y: auto`, und das schneidet alles außerhalb ab
            (in der ersten Fassung war der Pfeil deshalb unsichtbar). */}
        {hatZiel && (
          <div
            className="tqs-tut-pfeil"
            style={{
              position: "absolute", left: "50%", marginLeft: -7,
              width: 14, height: 14, background: C.surface,
              pointerEvents: "none",
              ...(blaseUnten
                ? { top: -8, borderLeft: `1px solid ${C.line}`, borderTop: `1px solid ${C.line}` }
                : { bottom: -8, borderRight: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}` }),
            }}
          />
        )}

        <div style={{ maxHeight: "40vh", overflowY: "auto", padding: "14px 16px 12px", borderRadius: RUND.karte }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <button
              onClick={() => setUebersicht((v) => !v)}
              title="Alle Kapitel"
              style={{
                ...TAPZIEL, cursor: "pointer", fontFamily: "inherit",
                background: "none", border: "none", padding: "0 4px 0 0",
                color: C.akzent, fontSize: TEXT.caption1, fontWeight: 700, textAlign: "left",
              }}
            >{schritt.kapitelKurz} ▾</button>
            <span style={{ fontFamily: MONO, fontSize: TEXT.caption2, color: C.muted, marginLeft: "auto" }}>
              {f.kapitelNr}/{f.kapitelAnzahl} · {f.imKapitel}/{f.kapitelLaenge}
            </span>
          </div>

          <div style={{ height: 3, background: C.line, borderRadius: RUND.pille, marginBottom: 12 }}>
            <div style={{
              width: `${Math.round(f.anteil * 100)}%`, height: "100%",
              background: C.akzent, borderRadius: RUND.pille,
            }} />
          </div>

          {uebersicht ? (
            <div>
              <div style={{ fontSize: TEXT.caption1, color: C.muted, marginBottom: 8 }}>Spring hin, wo du willst:</div>
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

              {schritt.liste?.length > 0 && (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 7 }}>
                  {schritt.liste.map((e) => (
                    <div key={e.label} style={{
                      background: C.ink, border: `1px solid ${C.line}`,
                      borderRadius: RUND.karte, padding: "8px 10px",
                    }}>
                      <div style={{ fontSize: TEXT.caption1, fontWeight: 700, color: C.text }}>{e.label}</div>
                      <div style={{ fontSize: TEXT.caption2, color: C.muted, lineHeight: 1.45, marginTop: 2 }}>{e.desc}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* 🔴 Die Aufforderung. Sie ist der Unterschied zur Diashow —
                  hier steht, was der Nutzer TUN soll, und der Rundgang wartet
                  darauf. Erledigt wird sie grün quittiert, bevor es weitergeht. */}
              {schritt.aktion && (
                <div style={{
                  marginTop: 10, padding: "8px 10px", borderRadius: RUND.karte,
                  background: erledigt ? `${C.mint}1A` : `${C.akzent}14`,
                  border: `1px solid ${erledigt ? C.mint + "55" : C.akzent + "44"}`,
                  color: erledigt ? C.mint : C.akzent,
                  fontSize: TEXT.caption1, fontWeight: 700,
                }}>
                  {erledigt ? "✓ Passt — weiter geht's" : (schritt.tuWas ?? "Klick auf das markierte Feld")}
                </div>
              )}
            </>
          )}

          <div style={{ display: "flex", gap: 6, marginTop: 14, alignItems: "center" }}>
            <Knopf onClick={() => gehe(zurueck(index))} schwach>Zurück</Knopf>
            <Knopf onClick={() => gehe(kapitelUeberspringen(index))} schwach>Teil überspringen</Knopf>
            <div style={{ flex: 1 }} />
            {/* ⚠️ Bei einem Schritt mit Aufgabe gibt es KEIN „Weiter". Wer sich
                durchklicken kann, ohne etwas zu tun, hat nichts gelernt — und
                genau das war Andis Punkt. Der Ausgang bleibt trotzdem offen:
                „Teil überspringen" und „Beenden" stehen daneben. */}
            {!wartet && (
              <Knopf onClick={() => gehe(weiter(index))} stark>
                {index + 1 >= SCHRITTE.length ? "Fertig" : "Weiter"}
              </Knopf>
            )}
          </div>
          <button
            onClick={beenden}
            style={{
              ...TAPZIEL, width: "100%", marginTop: 4, cursor: "pointer",
              fontFamily: "inherit", background: "none", border: "none",
              color: C.muted, fontSize: TEXT.caption2,
            }}
          >Rundgang beenden</button>
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
