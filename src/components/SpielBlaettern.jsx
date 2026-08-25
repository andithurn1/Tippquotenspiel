"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { C, MONO, RUND } from "@/lib/theme";
import { TAPZIEL } from "@/lib/tapziel";
import { nachbarn, positionText } from "@/lib/spielFolge";

// ============================================================
//  BLÄTTERN ZWISCHEN SPIELEN (Andi, KT5, 25.08.2026)
//
//  „zum nächsten Spiel bzw Tippabgabe kommt man dann mit Swipen oder
//   runterscrollen was immer so Fensterbasiert ist"
//
//  ── Was das hier IST und was noch nicht ──
//  ✅ Wischen nach links/rechts, Pfeiltasten, und ein Balken, der zeigt, wo
//     man ist und was als Nächstes kommt.
//  ⏳ NOCH NICHT das „fensterbasierte" Blättern, bei dem mehrere Spiele
//     gleichzeitig im Speicher liegen und seitlich hereinschieben. Heute ist
//     ein Spiel eine ROUTE (`/tippen/[matchId]`), und das ist kein Zufall:
//     daran hängen Zurück-Taste, Lade-Verhalten und die Speicher-Rückmeldung.
//     Der Umbau ist echt, aber er gehört auf die Masterdatei gewartet.
//     `prefetch` macht den Wechsel trotzdem sofortig.
//
//  ⚠️ WISCHEN IST NICHT SCROLLEN, und das ist die eigentliche Schwierigkeit:
//  auf einem Telefon scrollt man senkrecht durch die Tippabgabe. Wer dabei
//  minimal schräg wischt, darf NICHT im nächsten Spiel landen. Deshalb drei
//  Bedingungen, alle drei gemessen und nicht geraten:
//   · mindestens 60 px waagerecht (ein Wisch, kein Wackeln),
//   · doppelt so weit waagerecht wie senkrecht (Richtung ist eindeutig),
//   · unter 600 ms (eine Geste, kein langsames Ziehen).
//
//  ⚠️ Und: die Geste hängt am UMSCHLAG, nicht am Fenster. Ein Wisch, der in
//  einem Auswahlfeld oder auf dem Ergebnis-Raster beginnt, gehört dem
//  Bedienelement — `SPERRT` zählt sie auf.
// ============================================================

const MIN_WEITE = 60;
const MAX_DAUER = 600;
const RICHTUNGS_VERHAELTNIS = 2;

// Bedienelemente, die eigene Wischgesten haben oder waagerecht scrollen.
const SPERRT = "input, select, textarea, [data-wisch-aus], [role=slider]";

export function useWischen(ref, { onLinks, onRechts, aktiv = true }) {
  useEffect(() => {
    const el = ref?.current;
    if (!el || !aktiv) return;
    let x0 = 0, y0 = 0, t0 = 0, gesperrt = false;

    const start = (e) => {
      const t = e.changedTouches?.[0];
      if (!t) return;
      gesperrt = Boolean(e.target?.closest?.(SPERRT));
      x0 = t.clientX; y0 = t.clientY; t0 = Date.now();
    };
    const ende = (e) => {
      if (gesperrt) return;
      const t = e.changedTouches?.[0];
      if (!t) return;
      const dx = t.clientX - x0;
      const dy = t.clientY - y0;
      if (Date.now() - t0 > MAX_DAUER) return;
      if (Math.abs(dx) < MIN_WEITE) return;
      if (Math.abs(dx) < Math.abs(dy) * RICHTUNGS_VERHAELTNIS) return;
      if (dx < 0) onRechts?.();   // nach links wischen = weiter
      else onLinks?.();
    };

    // `passive`: die Geste bremst das Scrollen nie — sie liest nur mit.
    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchend", ende, { passive: true });
    return () => {
      el.removeEventListener("touchstart", start);
      el.removeEventListener("touchend", ende);
    };
  }, [ref, onLinks, onRechts, aktiv]);
}

const kurzName = (m) => {
  const s = m?.snapshot ?? {};
  const h = (s.home ?? "").split(" ").at(-1);
  const a = (s.away ?? "").split(" ").at(-1);
  return h && a ? `${h}–${a}` : (m?.matchId ?? "");
};

export default function SpielBlaettern({
  spiele = [], matchId, filter = null, umschlagRef = null, basis = "/tippen",
}) {
  const router = useRouter();
  const { vorher, nachher, index, anzahl } = nachbarn(spiele, matchId, { filter });
  // ⚠️ Die Zählung kommt aus `positionText`, nicht aus `index + 1` hier —
  // sonst stünde dieselbe Rechnung an zwei Stellen, und die eine wüsste
  // nichts vom Sonderfall „gehört gar nicht zur Runde" (dort: null).
  const position = positionText(spiele, matchId, { filter });
  const gehe = useRef({ vorher, nachher });
  gehe.current = { vorher, nachher };

  const zu = (m) => { if (m) router.push(`${basis}/${m.matchId ?? m.id}`); };

  useWischen(umschlagRef, {
    onLinks: () => zu(gehe.current.vorher),
    onRechts: () => zu(gehe.current.nachher),
    aktiv: Boolean(umschlagRef),
  });

  // Pfeiltasten — kostenlos dazu, und für den Browser-Test der einzige Weg.
  // ⚠️ Nicht, während jemand in einem Feld tippt: sonst springt der Screen
  // weg, während man den Endstand eingibt.
  useEffect(() => {
    const taste = (e) => {
      if (e.target?.closest?.(SPERRT)) return;
      if (e.key === "ArrowLeft") zu(gehe.current.vorher);
      if (e.key === "ArrowRight") zu(gehe.current.nachher);
    };
    window.addEventListener("keydown", taste);
    return () => window.removeEventListener("keydown", taste);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Ein Spiel, das nicht zur Runde gehört, bekommt keinen Balken —
  // „0 von 0" wäre eine Aussage über nichts.
  if (index < 0 || anzahl <= 1) return null;

  const Seite = ({ spiel, richtung }) => (
    <button
      className="tqs-aktion"
      onClick={() => zu(spiel)}
      disabled={!spiel}
      aria-label={richtung === "vor" ? "Vorheriges Spiel" : "Nächstes Spiel"}
      style={{
        ...TAPZIEL, display: "flex", alignItems: "center", gap: 6,
        flex: 1, minWidth: 0, justifyContent: richtung === "vor" ? "flex-start" : "flex-end",
        background: "transparent", color: spiel ? C.text : C.ghost,
        border: "none", padding: "8px 4px", fontFamily: "inherit",
        fontSize: "0.8125rem", cursor: spiel ? "pointer" : "default",
      }}
    >
      {richtung === "vor" && <span aria-hidden>‹</span>}
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {spiel ? kurzName(spiel) : ""}
      </span>
      {richtung === "nach" && <span aria-hidden>›</span>}
    </button>
  );

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, marginTop: 16,
      background: C.ink2, border: `1px solid ${C.line}`,
      borderRadius: RUND.karte, padding: "4px 8px",
    }}>
      <Seite spiel={vorher} richtung="vor" />
      <span style={{
        fontFamily: MONO, fontSize: "0.6875rem", color: C.muted,
        letterSpacing: 1, whiteSpace: "nowrap",
      }}>
        {position?.replace(" von ", " / ")}
      </span>
      <Seite spiel={nachher} richtung="nach" />
    </div>
  );
}
