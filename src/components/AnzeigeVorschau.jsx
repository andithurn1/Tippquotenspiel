"use client";

import { useMemo } from "react";
import { C, MONO, RUND } from "@/lib/theme";
import { DEFAULT_RULES, createMockOddsSource, scoreTip } from "@/lib/engine";
import NaheErgebnisse from "@/components/NaheErgebnisse";
import ErgebnisMatrix from "@/components/ErgebnisMatrix";
import { breakdown } from "@/lib/breakdown";
import { tippKurz } from "@/lib/format";
import { startErgebnis } from "@/lib/vorbelegung";

// ============================================================
//  VORSCHAU DER ANZEIGE-STUFEN (Andi, 25.08.2026)
//
//  „können wir bei den anzeigeeinstellungen beim account auch jeweils eine
//   vorschau erstellen wie das dann praktisch später aussehen wird"
//
//  🔴 DER GRUNDSATZ, der diese Datei baut: eine Vorschau, die NACHGEZEICHNET
//  ist, ist eine zweite Wahrheit. Sie sieht am Tag des Baus richtig aus und
//  weicht danach still ab — jede Änderung an der echten Anzeige müsste hier
//  nachgezogen werden, und genau das vergisst man. Das ist dieselbe Falle,
//  die in diesem Projekt schon 17 Fehler an einem Tag verursacht hat.
//
//  Deshalb rendert die Vorschau die ECHTEN Bauteile — `NaheErgebnisse`,
//  `ErgebnisMatrix`, die echte Aufschlüsselung — nur klein, mit einem
//  Beispiel-Spiel und der VORGEFÜHRTEN Stufe statt der eingestellten.
//  Ändert sich die Anzeige, ändert sich die Vorschau mit. Von selbst.
//
//  ⚠️ Das Beispiel-Spiel kommt aus `createMockOddsSource()` — dieselbe Quelle,
//  aus der die Tests rechnen. Kein erfundener Schnappschuss: eine Vorschau
//  mit ausgedachten Zahlen zeigt Auszahlungen, die es nicht gibt.
// ============================================================

// Ein Tipp, an dem sich alle drei Stufen unterscheiden: knapp daneben, damit
// es Nachbarn gibt, und mit Torschützen, damit die Aufschlüsselung etwas hat.
// ⚠️ GEMESSEN ausgewählt, nicht geraten: mit „2:1 → real 3:1" hat die
// Aufschlüsselung nur ZWEI Posten — und dann sehen „Voll" und „Dezent" in der
// Vorschau identisch aus. Eine Vorschau, in der sich zwei Stufen nicht
// unterscheiden, zeigt nichts. Der Fall unten liefert drei Posten
// (Ergebnis-Nähe · Sieger richtig · Abstand getroffen).
const BEISPIEL_TIPP = {
  home: 4, away: 1,
  goals: { home: ["Al-Naimat", "Al-Naimat"], away: ["Yamal"] },
};
const BEISPIEL_REAL = {
  home: 4, away: 1,
  playerGoals: { home: ["Al-Naimat", "Al-Naimat", "Al-Naimat", "Al-Naimat"], away: ["Yamal"] },
};
// Für die Vorschau beim TIPPEN („was, wenn es anders ausgeht?") braucht es
// einen Tipp, dessen Nachbarn sich unterscheiden — nicht den exakten Treffer.
const BEISPIEL_TIPP_OFFEN = { home: 2, away: 1, goals: { home: [], away: [] } };

function Rahmen({ children, leer = false, bewegung = null }) {
  return (
    <div
      data-bewegung={bewegung ?? undefined}
      style={{
        marginTop: 8, padding: leer ? "14px 12px" : "10px 12px",
        background: C.ink2, border: `1px dashed ${C.line}`,
        borderRadius: RUND.karte,
        // ⚠️ Die Vorschau ist eine ANSICHT, kein Bedienelement: nichts darin
        // ist anklickbar, sonst verstellt man beim Ansehen etwas.
        pointerEvents: "none", userSelect: "none",
        maxHeight: 260, overflow: "hidden", position: "relative",
      }}
    >
      <div style={{
        fontFamily: MONO, fontSize: "0.625rem", letterSpacing: 1,
        color: C.ghost, textTransform: "uppercase", marginBottom: 6,
      }}>
        So sieht es aus
      </div>
      {children}
      {/* Weicher Abschluss, damit ein abgeschnittener Block nicht wie ein
          Fehler wirkt. */}
      {!leer && (
        <div aria-hidden style={{
          position: "absolute", left: 0, right: 0, bottom: 0, height: 26,
          background: `linear-gradient(transparent, ${C.ink2})`,
        }} />
      )}
    </div>
  );
}

const Leer = ({ text }) => (
  <div style={{ fontSize: "0.75rem", color: C.muted, lineHeight: 1.5 }}>{text}</div>
);

// ── Die Vorschauen, eine je Einstellung ─────────────────────
export default function AnzeigeVorschau({ art, stufe }) {
  // ⚠️ `useMemo`, NICHT `useState` + `useEffect`. Der erste Bau holte den
  // Snapshot in einem Effekt mit stillem `catch` — und die Vorschau blieb im
  // Browser komplett leer, ohne Fehlermeldung. Der stille `catch` hat den
  // Grund verschluckt, und ohne Browser-Probe wäre es nicht aufgefallen:
  // Tests grün, Build grün, Lint grün, Seite ohne die halbe Neuerung.
  //
  // Ein Snapshot ist eine REINE Rechnung — dafür braucht es keinen Effekt,
  // keinen zweiten Rendervorgang und keinen Zustand, der leer sein kann.
  const snap = useMemo(() => createMockOddsSource().getSnapshot("JOR-ESP"), []);
  if (!snap) return null;

  if (art === "vorschau") {
    if (stufe === "aus") {
      return <Rahmen leer><Leer text="Kein Ausblick beim Tippen — nur dein Endstand und die Quote." /></Rahmen>;
    }
    return (
      <Rahmen>
        <NaheErgebnisse tip={BEISPIEL_TIPP_OFFEN} snap={snap} rules={DEFAULT_RULES}
          kompakt={stufe === "dezent"} />
      </Rahmen>
    );
  }

  if (art === "abrechnung") {
    const s = scoreTip(BEISPIEL_TIPP, BEISPIEL_REAL, snap, DEFAULT_RULES);
    if (stufe === "aus") {
      return (
        <Rahmen>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: "0.8125rem", color: C.muted }}>Jordanien – Spanien</span>
            <span style={{ fontFamily: MONO, fontSize: "1.125rem", fontWeight: 700, color: C.mint }}>
              {Math.round(s.total)}
            </span>
          </div>
        </Rahmen>
      );
    }
    // 🔴 Die ECHTE Aufschlüsselung, nicht eine nachgebaute Liste.
    const { posten } = breakdown(BEISPIEL_TIPP, BEISPIEL_REAL, snap, DEFAULT_RULES);
    // „Dezent" = der wichtigste Posten und die Summe. „Voll" = die ganze Kette.
    const zeigen = stufe === "dezent" ? (posten ?? []).slice(0, 1) : (posten ?? []);
    return (
      <Rahmen>
        {zeigen.map((p, i) => (
          <div key={p.key ?? i} style={{
            display: "flex", justifyContent: "space-between",
            fontSize: "0.75rem", marginTop: i ? 4 : 0,
          }}>
            <span style={{ color: C.muted }}>{p.label}</span>
            <span style={{ fontFamily: MONO, color: C.text }}>
              {typeof p.wert === "number" ? p.wert.toFixed(1) : String(p.wert ?? "")}
            </span>
          </div>
        ))}
        <div style={{
          display: "flex", justifyContent: "space-between", marginTop: 7,
          borderTop: `1px solid ${C.line}`, paddingTop: 6,
          fontSize: "0.8125rem", fontWeight: 700,
        }}>
          <span>Gesamt</span>
          <span style={{ fontFamily: MONO, color: C.mint }}>{Math.round(s.total)}</span>
        </div>
      </Rahmen>
    );
  }

  if (art === "zwischenabrechnung") {
    if (stufe === "aus") {
      return <Rahmen leer><Leer text="Keine Einblendung beim Öffnen. Die Abrechnung bleibt über das Menü erreichbar." /></Rahmen>;
    }
    const s = scoreTip(BEISPIEL_TIPP, BEISPIEL_REAL, snap, DEFAULT_RULES);
    return (
      <Rahmen>
        <div style={{ fontSize: "0.875rem", fontWeight: 700 }}>Während du weg warst</div>
        {stufe === "voll" ? (
          <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 5, lineHeight: 1.6 }}>
            Jordanien – Spanien<br />
            <span style={{ fontFamily: MONO }}>
              dein Tipp {tippKurz(BEISPIEL_TIPP)} · Ergebnis {tippKurz(BEISPIEL_REAL)} · <b style={{ color: C.mint }}>{Math.round(s.total)}</b>
            </span>
          </div>
        ) : (
          <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 5 }}>
            1 Spiel fertig · <b style={{ color: C.mint }}>{Math.round(s.total)} Punkte</b>
          </div>
        )}
      </Rahmen>
    );
  }

  if (art === "rasterWeite") {
    return (
      <Rahmen>
        {/* Das ECHTE Raster, nur mit der vorgeführten Weite statt der
            eingestellten (`weite`-Ausweg in `ErgebnisMatrix`). */}
        <ErgebnisMatrix snap={snap} rules={DEFAULT_RULES} tip={BEISPIEL_TIPP_OFFEN}
          weite={stufe} gesperrt />
      </Rahmen>
    );
  }

  if (art === "vorbelegung") {
    // 🔴 Wieder das ECHTE Raster statt einer Zeichnung — nur mit dem Tipp, auf
    // dem der Stepper STARTEN würde. Man sieht damit sofort, welches Feld die
    // Einstellung anspringt, und die Punkte daneben stehen schon dort.
    const start = startErgebnis(snap, stufe);
    return (
      <Rahmen>
        <div style={{ fontSize: "0.75rem", color: C.muted, marginBottom: 6, lineHeight: 1.5 }}>
          Der Stepper startet bei <strong style={{ color: C.ink }}>{start.home}:{start.away}</strong>
          {start.quelle === "quote" && start.quote
            ? ` — dem Endstand mit der niedrigsten Quote (${start.quote.toFixed(1)}).`
            : " — unabhängig vom Spiel."}
        </div>
        <ErgebnisMatrix snap={snap} rules={DEFAULT_RULES}
          tip={{ ...BEISPIEL_TIPP_OFFEN, home: start.home, away: start.away }}
          weite="raster" gesperrt />
      </Rahmen>
    );
  }

  if (art === "bewegung") {
    // ⚠️ Die Stufe hängt an DIESER Kiste (`data-bewegung`), nicht am Dokument
    // — sonst müsste man sie einschalten, um sie zu sehen.
    return (
      <Rahmen bewegung={stufe === "voll" ? undefined : stufe}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="tqs-laedt" style={{
            width: 26, height: 26, borderRadius: RUND.pille,
            background: C.akzent, display: "inline-block",
          }} />
          <div className="tqs-skelett" style={{
            flex: 1, height: 12, borderRadius: RUND.klein, background: C.surface,
          }} />
        </div>
        <div className="tqs-aktion" style={{
          marginTop: 8, background: C.surface, border: `1px solid ${C.line}`,
          borderRadius: RUND.karte, padding: "8px 11px", fontSize: "0.75rem", color: C.muted,
        }}>
          {stufe === "aus"
            ? "Alles ist sofort da — keine Übergänge."
            : stufe === "sparsam"
              ? "Ein- und Ausblenden bleibt. Kein Leuchten, Bilder stehen still."
              : "Mit Übergängen, Leuchten und laufenden Bildern."}
        </div>
      </Rahmen>
    );
  }

  return null;
}
