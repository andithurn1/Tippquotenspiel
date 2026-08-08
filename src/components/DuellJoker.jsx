"use client";

import { C, MONO } from "@/lib/theme";
import {
  DUELL_TYPEN, ZIELWAHL, PHASEN, DUELL_LIMITS, EMPFEHLUNG,
  sanitizeDuellJoker, beschreibeDuell,
} from "@/lib/duellJoker";
import { Zahl } from "@/components/Eingaben";
import { TAPZIEL } from "@/lib/tapziel";

// ── Der Duell-Joker: der einzige Baustein, bei dem man einem ANDEREN etwas
//    wegnimmt ──────────────────────────────────────────────────
//
// 🔴 Warum es diese Datei gibt: gemessen am 06.08.2026 mit `npm run stufen`
// Teil 2 hatten ACHT Regel-Felder überhaupt keine Oberfläche — und alle acht
// gehörten hierher (`duell.block.*`, `zielWahl`, `maxProZiel`, `immun`,
// `konter`, `kosten`). Der ganze Baustein war fertig gebaut, vermessen und
// über den Creator-Code teilbar; einstellen konnte ihn niemand.
//
// ⚠️ Die Reihenfolge der Blöcke ist nicht beliebig. Ganz oben stehen die
// SCHUTZREGELN (wen darf man treffen, wie oft, wer ist geschont) und erst
// darunter die Stärke. Das ist dieselbe Entscheidung wie beim Deckel in
// `Ereignisse.jsx`: Es ist keine Feineinstellung, sondern die Zusage, dass aus
// einem Duell kein Rudelbilden wird.
export default function DuellJoker({ rules, onChange }) {
  const d = sanitizeDuellJoker(rules?.duell);
  const setze = (teil) => onChange(sanitizeDuellJoker({ ...d, ...teil }));
  const setzeBlock = (teil) => setze({ block: { ...d.block, ...teil } });
  const setzeKlau = (teil) => setze({ klau: { ...d.klau, ...teil } });

  const hatKlau = d.typen.includes("klau");
  const hatBlock = d.typen.includes("block");

  const knopf = (aktiv, text, onClick, key, titel) => (
    <button key={key} type="button" onClick={onClick} title={titel} style={{
      border: `1px solid ${aktiv ? C.coral : C.line}`, borderRadius: 999,
      background: aktiv ? `${C.coral}1a` : "transparent", color: aktiv ? C.coral : C.text,
      ...TAPZIEL, cursor: "pointer", padding: "5px 11px", fontSize: 11.5, fontWeight: aktiv ? 700 : 500,
    }}>{text}</button>
  );

  const Block = ({ titel, hinweis, children }) => (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 5 }}>{titel}</div>
      {children}
      {hinweis && (
        <div style={{ fontSize: 10.5, color: C.muted, marginTop: 4, lineHeight: 1.45 }}>{hinweis}</div>
      )}
    </div>
  );

  return (
    <div>
      <p style={{ fontSize: 11.5, color: C.muted, margin: "0 0 10px", lineHeight: 1.5 }}>
        Der einzige Joker, der jemand <strong>anderen</strong> trifft. Standardmäßig
        aus — eine Runde, die ihn einschaltet, spielt ein anderes Spiel.
      </p>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {knopf(!d.enabled, "Aus", () => setze({ enabled: false }), "aus")}
        {knopf(d.enabled, "An", () => setze({ enabled: true }), "an")}
      </div>

      {d.enabled && (
        <>
          <Block titel="Welche Arten?"
            hinweis="Ein Block nimmt keine Punkte weg, er verhindert nur eine Verstärkung — die zahmere Hälfte. Verlust wiegt schwerer als entgangener Gewinn.">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {DUELL_TYPEN.map((t) => {
                const an = d.typen.includes(t.key);
                return knopf(an, t.label, () => {
                  const neu = an ? d.typen.filter((x) => x !== t.key) : [...d.typen, t.key];
                  // Eine leere Liste fällt in `sanitizeDuellJoker` auf die
                  // Vorgabe zurück — dann stünde hier plötzlich „Klau“ an,
                  // obwohl gerade abgewählt wurde. Lieber die letzte Art
                  // stehen lassen und stattdessen ganz ausschalten.
                  if (neu.length) setze({ typen: neu });
                }, t.key, t.desc);
              })}
            </div>
          </Block>

          {/* ── Zuerst die Schutzregeln ── */}
          <Block titel="Wen darf man treffen?"
            hinweis={ZIELWAHL.find((z) => z.key === d.zielWahl)?.desc}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {ZIELWAHL.map((z) => knopf(d.zielWahl === z.key, z.label,
                () => setze({ zielWahl: z.key }), z.key, z.desc))}
            </div>
            {/* ⚠️ Die Kombinationsregel aus `EMPFEHLUNG` sichtbar machen, statt
                sie nur in `reglerWarnung.js` zu melden: viele freie Einsätze
                heißt, dass am Ende alle auf denselben gehen. */}
            {d.zielWahl === "frei" && d.anzahl >= EMPFEHLUNG.zielWahlBeiVielenEinsaetzen.abAnzahl && (
              <div style={{ fontSize: 10.5, color: C.coral, marginTop: 4, lineHeight: 1.45 }}>
                ⚠️ Freie Zielwahl bei {d.anzahl} Einsätzen: erfahrungsgemäß gehen dann
                alle auf den Führenden. „Nur nach vorne“ ist die direkte Antwort darauf.
              </div>
            )}

            {/* Der Konter steht bewusst HIER und nicht in einem eigenen Block:
                er ist eine Ausnahme von genau dieser Einstellung. Bei „nur nach
                vorne" steht der Angreifer per Definition hinter dem Getroffenen
                — ohne die Ausnahme könnte der nie antworten, und der Schalter
                wäre folgenlos. */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              {knopf(!d.konter, "Kein Konter", () => setze({ konter: false }), "kt-aus",
                "Ein Treffer ändert nichts an der Zielwahl.")}
              {knopf(d.konter, "Konter erlaubt", () => setze({ konter: true }), "kt-an",
                "Wer an diesem Spieltag getroffen wurde, darf seinen Angreifer zurückschlagen — auch entgegen der Zielwahl.")}
            </div>
            <div style={{ fontSize: 10.5, color: C.muted, marginTop: 4, lineHeight: 1.45 }}>
              {d.konter
                ? (d.zielWahl === "frei"
                    ? "Bei freier Zielwahl ändert der Konter wenig — jeder darf ohnehin jeden treffen."
                    : "Wer an diesem Spieltag getroffen wurde, darf seinen Angreifer zurückschlagen, auch wenn die Zielwahl ihn sonst ausschließt. Schonfrist und „max. je Ziel“ gelten weiter.")
                : "Getroffen zu werden gibt kein Rückschlagrecht. Ruhiger, aber bei „nur nach vorne“ kann der Getroffene nie antworten."}
            </div>
          </Block>

          <Block titel="Schutz der Getroffenen"
            hinweis="„Höchstens n-mal dasselbe Ziel“ verhindert, dass sich eine Runde auf eine Person einschießt. Die Schonfrist gibt danach Ruhe.">
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Zahl label="max. je Ziel" wert={d.maxProZiel} limits={DUELL_LIMITS.maxProZiel}
                breite={110} onChange={(v) => setze({ maxProZiel: v })} />
              <Zahl label="Schonfrist (Spieltage)" wert={d.immun} limits={DUELL_LIMITS.immun}
                breite={130} onChange={(v) => setze({ immun: v })} />
            </div>
          </Block>

          {/* 🔴 Die stärkste Bremse des ganzen Bausteins — und bis 06.08.2026
              eine reine Karteileiche: `kosten` stand im Regelwerk, wurde
              gesäubert, reiste im Creator-Code mit, und keine Zeile fragte es
              ab. Angeschlossen ist es jetzt in `jokerKontingent.js`
              (`darfDuellSetzen`), weil „kostet einen Joker" eine Aussage über
              den JOKER-VORRAT ist, nicht über die Duell-Wertung. */}
          <Block titel="Was kostet ein Einsatz?"
            hinweis={d.kosten === "stattJoker"
              ? "Wer angreift, verzichtet auf die eigene Verstärkung an diesem Spieltag. Ohne freien Joker geht kein Einsatz — auch dann nicht, wenn das Duell-Kontingent noch etwas hergäbe."
              : "Duell-Einsätze haben ihr eigenes Kontingent und lassen den Joker-Vorrat unberührt. Angreifen ist damit gratis."}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {knopf(d.kosten !== "stattJoker", "Nichts", () => setze({ kosten: "frei" }), "k-frei",
                "Ein Duell-Einsatz kostet keinen Joker.")}
              {knopf(d.kosten === "stattJoker", "Einen Joker", () => setze({ kosten: "stattJoker" }), "k-joker",
                "Ein Duell-Einsatz verbraucht einen zugeteilten oder erspielten Joker.")}
            </div>
          </Block>

          <Block titel="Wie oft insgesamt?"
            hinweis={d.maxProSaison === 0
              ? "0 = kein Punkte-Deckel. Dann begrenzt nur die Zahl der Einsätze."
              : `Höchstens ${d.maxProSaison} Punkte pro Saison aus Duellen — darüber hinaus bleibt der Einsatz wirkungslos.`}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Zahl label="Einsätze/Saison" wert={d.anzahl} limits={DUELL_LIMITS.anzahl}
                breite={120} onChange={(v) => setze({ anzahl: v })} />
              <Zahl label="max. je Spieltag" wert={d.proSpieltag} limits={DUELL_LIMITS.proSpieltag}
                breite={120} onChange={(v) => setze({ proSpieltag: v })} />
              <Zahl label="Punkte-Deckel" wert={d.maxProSaison} limits={DUELL_LIMITS.maxProSaison}
                breite={120} onChange={(v) => setze({ maxProSaison: v })} />
            </div>
            {/* 🔴 Gemessen am 06.08.2026: die VORGABE 60 liegt unter dem
                Erprobten. `reglerWarnung.js` meldet dann „der Deckel greift
                schon beim ersten Duell, ob 10 % oder 100 % geklaut werden,
                ändert am Ergebnis nichts mehr" — der Regler daneben wäre
                wirkungslos. Deshalb hier direkt am Feld. */}
            {d.maxProSaison > 0 && d.maxProSaison < 150 && (
              <div style={{ fontSize: 10.5, color: C.coral, marginTop: 4, lineHeight: 1.45 }}>
                ⚠️ Ein Deckel unter ~150 greift schon beim ersten Duell — die Stärke
                darunter ändert dann nichts mehr.
              </div>
            )}
          </Block>

          <Block titel="Wann im Saisonverlauf?"
            hinweis={PHASEN.find((p) => p.key === d.phase)?.desc}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {PHASEN.map((p) => knopf(d.phase === p.key, p.label,
                () => setze({ phase: p.key }), p.key, p.desc))}
            </div>
          </Block>

          {/* ── Erst jetzt die Stärke ── */}
          {hatKlau && (
            <Block titel="Klau-Joker: wie viel?"
              hinweis={d.klau.modus === "nullsumme"
                ? "Nullsumme: was du bekommst, fehlt dem anderen. Das Punkte-Niveau der Runde bleibt gleich."
                : "Ohne Nullsumme entstehen neue Punkte — das hebt das Niveau und verschiebt die Anzeige-Skalierung mit."}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
                <Zahl label="Anteil" wert={d.klau.anteil} limits={DUELL_LIMITS.klauAnteil}
                  breite={110} onChange={(v) => setzeKlau({ anteil: v })} />
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {knopf(d.klau.modus === "nullsumme", "Nullsumme",
                    () => setzeKlau({ modus: "nullsumme" }), "ns")}
                  {knopf(d.klau.modus !== "nullsumme", "Zusätzlich",
                    () => setzeKlau({ modus: "zusatz" }), "zu")}
                </div>
              </div>
            </Block>
          )}

          {hatBlock && (
            <Block titel="Block-Joker: wie stark?"
              hinweis={d.block.nurGewinn
                ? "Nur Gewinne werden gedämpft — ein Minus bleibt unberührt. Sonst würde ein Block dem Ziel im Zweifel helfen."
                : "⚠️ Auch ein MINUS wird gedämpft. Dann hilft dein Block dem Ziel, wenn es einen schlechten Spieltag hat."}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
                <Zahl label="Rest für das Ziel" wert={d.block.restanteil} limits={DUELL_LIMITS.blockRestanteil}
                  breite={130} onChange={(v) => setzeBlock({ restanteil: v })} />
                <Zahl label="Beute für dich" wert={d.block.beute} limits={DUELL_LIMITS.blockBeute}
                  breite={120} onChange={(v) => setzeBlock({ beute: v })} />
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {knopf(d.block.nurGewinn, "nur Gewinne",
                    () => setzeBlock({ nurGewinn: true }), "ng")}
                  {knopf(!d.block.nurGewinn, "auch Minus",
                    () => setzeBlock({ nurGewinn: false }), "am")}
                </div>
              </div>
            </Block>
          )}

          <p style={{
            fontSize: 11, color: C.muted, marginTop: 12, lineHeight: 1.5,
            borderTop: `1px solid ${C.line}`, paddingTop: 8,
          }}>
            <span style={{ fontFamily: MONO, fontSize: 10.5, color: C.coral }}>SO LIEST ES SICH: </span>
            {beschreibeDuell(d)}
          </p>
        </>
      )}
    </div>
  );
}
