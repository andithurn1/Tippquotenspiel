"use client";

import { C, RUND } from "@/lib/theme";
import { Zahl } from "@/components/Eingaben";
import {
  AUSWERTBARE_WIRKUNGEN, WIRKUNG, WIRKUNG_LIMITS,
  sanitizeWirkung, beschreibeWirkung, konflikte as wirkungsKonflikte,
} from "@/lib/wirkung";

// ============================================================
//  WIRKUNGSFELD — die dritte der vier Achsen, als Bauteil
//
//  🔴 Ausgelagert am 27.08.2026, als die Rechte (`rechte.js`) dieselbe
//  Auswahl brauchten. Vorher stand sie als lokale Funktion in
//  `Ereignisse.jsx`.
//
//  ⚠️ Ausgelagert und NICHT nachgebaut, und das ist der Punkt: eine zweite
//  Fassung hätte am Tag des Baus gleich ausgesehen und wäre danach still
//  auseinandergelaufen — dieselbe Geschichte wie bei den acht Eckenradien und
//  den drei Aufklapp-Mechaniken. Wer eine Wirkung einstellt, sieht ab jetzt
//  überall dasselbe Feld.
// ============================================================


// ── WAS passiert dann? ──────────────────────────────────────
// 🔴 Die dritte der vier Achsen (`wirkung.js`). Bis 07.08.2026 war die Antwort
// immer „n Joker", und das Feld hieß entsprechend `belohnung`. Es ist die
// Voreinstellung geblieben — aber nicht mehr die einzige Möglichkeit, und
// deshalb steht sie hier als Auswahl statt als stille Annahme.
//
// ⚠️ Genau EIN Regler je Wirkung, plus der Satz darunter. „bonus/20" sagt
// niemandem etwas, „+20 % auf die Punkte des Spieltags" schon — dieselbe
// Rolle wie `beschreibeAuswahl` eine Achse weiter oben.
function Wirkungsfeld({ wert, onChange }) {
  const w = sanitizeWirkung(wert);
  const info = WIRKUNG[w.typ];
  const warnungen = wirkungsKonflikte(w);
  const knopf = (aktiv, text, onClick, key, titel) => (
    <button key={key} type="button" onClick={onClick} title={titel} style={{
      border: `1px solid ${aktiv ? C.akzent : C.line}`, borderRadius: RUND.pille,
      background: aktiv ? `${C.akzent}1a` : "transparent", color: aktiv ? C.akzent : C.text,
      cursor: "pointer", padding: "4px 10px", fontSize: "0.6875rem", fontWeight: aktiv ? 700 : 500,
    }}>{text}</button>
  );
  return (
    <div style={{ width: "100%" }}>
      <div style={{ fontSize: "0.6875rem", color: C.muted, marginBottom: 4 }}>Was passiert dann?</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 6 }}>
        {AUSWERTBARE_WIRKUNGEN.map((x) =>
          knopf(w.typ === x.key, x.label, () => onChange({ ...w, typ: x.key }), x.key, x.text))}
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {info.parameter.includes("n") && (
          <Zahl label="wie viele" wert={w.n} limits={WIRKUNG_LIMITS.n} breite={110}
            onChange={(v) => onChange({ ...w, n: v })} />
        )}
        {info.parameter.includes("betrag") && (
          <Zahl label="Punkte" wert={w.betrag} limits={WIRKUNG_LIMITS.betrag} breite={110}
            onChange={(v) => onChange({ ...w, betrag: v })} />
        )}
        {info.parameter.includes("prozent") && (
          <Zahl label="Prozent" wert={w.prozent} limits={WIRKUNG_LIMITS.prozent} breite={110}
            onChange={(v) => onChange({ ...w, prozent: v })} />
        )}
        {/* Der eigene Saison-Deckel — er gehört zu dieser Wirkung und nicht
            zum Ereignis, sonst hätte dieselbe Wirkung in zwei Regeln zwei
            Deckel. 0 = keiner, und dann meldet sich die Warnung darunter. */}
        {w.typ === "punkte" && (
          <Zahl label="max./Saison" wert={w.maxProSaison} limits={WIRKUNG_LIMITS.maxPunkteProSaison}
            breite={130} onChange={(v) => onChange({ ...w, maxProSaison: v })} />
        )}
      </div>
      <div style={{ fontSize: "0.6875rem", color: C.muted, marginTop: 5, lineHeight: 1.45 }}>
        Ergebnis: <strong style={{ color: C.text }}>{beschreibeWirkung(w)}</strong> · {info.topf}
      </div>
      {warnungen.map((k) => (
        <div key={k.key} style={{
          fontSize: "0.6875rem", color: k.korrigieren ? C.coral : C.muted,
          marginTop: 4, lineHeight: 1.45,
        }}>{k.korrigieren ? "⚠️ " : "💡 "}{k.text}</div>
      ))}
    </div>
  );
}

export default Wirkungsfeld;
