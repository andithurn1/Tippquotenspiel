"use client";

import { useId, useState } from "react";
import { C, MONO, RUND, TEXT } from "@/lib/theme";
import { TAPZIEL } from "@/lib/tapziel";

// ============================================================
//  FEINHEITEN — das eine Bauteil für Andis Detail-Regel
//
//  🔴 Andi am 24.08.2026, und ausdrücklich als DAUERREGEL, nicht als
//  Einzelwunsch:
//
//    „erstmal die gängigsten sachen einstellbar und mit einem Detailfenster
//     sogar noch Feinheiten bzw. maximales Detail einstellbar, was du so
//     bitte auch wirklich auf alle anderen Einstellbarkeiten anwendest"
//
//  ⚠️ **Warum es dieses Bauteil gibt und die Regel allein nicht reicht:**
//  Am 24.08.2026 nachgesehen — die Regel war an mehreren Stellen befolgt
//  (`KoRunden`, die Sperrfrist in `Fremdjoker`, `Bibliothek`), aber **jede
//  Stelle hatte ihre eigene Fassung gebaut**: anderer Pfeil, andere Farbe,
//  andere Schriftgröße, mal mit Zusammenfassung, mal ohne, mal mit
//  `aria-expanded`, mal ohne. Das ist genau der Verlauf, den die Eckenradien
//  schon einmal genommen haben (`rund.test.js`): niemand macht etwas falsch,
//  jede Stelle ist für sich plausibel, und am Ende sind es acht Varianten.
//
//  Gegen Drift hilft keine Ansage, sondern ein Bauteil und eine Messung.
//  Die Messung heißt `npm run detail`.
//
//  ── Was hier absichtlich NICHT passiert ──
//
//  ⛔ **Kein `<details>`-Element.** Es öffnet ohne Übergang, lässt sich nicht
//  zuverlässig gestalten und ignoriert `prefers-reduced-motion` nicht, weil
//  es gar nichts animiert. Wir brauchen beides.
//
//  ⛔ **Kein Fenster, das den Screen überdeckt.** Andis Wort „Detailfenster"
//  meint „mehr Tiefe hinter einem Klick", nicht „Modal". Ein Modal reißt den
//  Bezug zur Einstellung ab, um die es geht — man sieht die gängige
//  Einstellung nicht mehr, während man ihre Feinheit verstellt.
//
//  ⚠️ **`zusammenfassung` ist der wichtigste Teil und deshalb Pflicht-nah:**
//  eine zugeklappte Feinheit muss sagen, ob dahinter etwas VERSTELLT ist.
//  Ohne das sieht eine wirksame Sonderregel aus wie eine unbenutzte — und
//  ein Admin sucht später, warum seine Runde anders rechnet, als oben steht.
// ============================================================

export default function Feinheiten({
  titel,
  zusammenfassung = null,
  // 🔴 `abweichend` färbt die Zusammenfassung. Zweiwertig und nicht frei:
  // „hier ist etwas anders als die Vorgabe" ist eine Aussage, kein Ton.
  abweichend = false,
  // Wenn eine Feinheit noch nicht GREIFT (halb gesetzt), gehört das gesagt —
  // sonst sieht eine Einstellung ohne Wirkung aus wie eine mit.
  unvollstaendig = false,
  offenAnfangs = false,
  // 🔴 Von außen STEUERBAR, wenn der Elternteil „immer nur eines offen"
  // durchsetzen muss. `KoRunden` braucht das: zwei aufgeklappte Vereinslisten
  // schieben auf 390 px alles andere aus dem Bild.
  //
  // ⚠️ Beides zugleich anbieten, statt sich zu entscheiden: der Normalfall ist
  // „eine Feinheit für sich" und soll ohne Zustand im Elternteil auskommen.
  // Ein Bauteil, das IMMER gesteuert werden muss, wird an neun von zehn
  // Stellen umständlich — und dann baut sich jemand wieder sein eigenes.
  offen: offenVonAussen = null,
  onUmschalten = null,
  children,
}) {
  const [offenIntern, setOffenIntern] = useState(offenAnfangs);
  const gesteuert = offenVonAussen !== null;
  const offen = gesteuert ? offenVonAussen : offenIntern;
  const umschalten = () => {
    if (gesteuert) onUmschalten?.(!offen);
    else setOffenIntern((o) => !o);
  };
  const id = useId();

  const farbe = unvollstaendig ? C.coral : abweichend ? C.akzent : C.muted;

  return (
    <div style={{ marginTop: 6 }}>
      <button
        type="button"
        onClick={umschalten}
        aria-expanded={offen}
        aria-controls={id}
        className="tqs-aktion"
        style={{
          display: "flex", alignItems: "center", gap: 6, width: "100%",
          cursor: "pointer", fontFamily: "inherit", textAlign: "left",
          background: "transparent", border: "none", padding: 0,
          fontSize: TEXT.footnote, color: C.sky, ...TAPZIEL,
        }}
      >
        {/* Der Pfeil dreht sich, statt ausgetauscht zu werden — ein Zeichen,
            das springt, liest sich als Neuaufbau statt als Aufklappen. */}
        <span aria-hidden style={{
          display: "inline-block", lineHeight: 1,
          transform: offen ? "rotate(90deg)" : "none",
          transition: "transform var(--tqs-dauer) var(--tqs-kurve)",
        }}>▸</span>
        <span style={{ flex: 1, minWidth: 0 }}>{titel}</span>
        {zusammenfassung && (
          <span style={{
            fontFamily: MONO, fontSize: TEXT.caption2, color: farbe,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            maxWidth: "45%",
          }}>{zusammenfassung}</span>
        )}
      </button>

      {offen && (
        <div
          id={id}
          className="tqs-auf"
          style={{
            marginTop: 6, background: C.ink, border: `1px solid ${C.line}`,
            borderRadius: RUND.karte, padding: "10px 11px",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
