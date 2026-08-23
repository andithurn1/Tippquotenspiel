"use client";

import { C, MONO, RUND } from "@/lib/theme";
import {
  FREMDJOKER_ARTEN, RUECKNAHME, GEGEN_STUFEN, GEGEN_MODI,
  EINGRIFF_LIMITS, sanitizeEingriffe,
} from "@/lib/eingriffe";
import {
  aktiveArten, familieAn, familieSchalten, beschreibeFremdjoker,
  konflikte, zweiPhasenHinweis,
} from "@/lib/fremdjoker";
import { Zahl } from "@/components/Eingaben";
import { TAPZIEL_QUADRAT } from "@/lib/tapziel";
import DuellJoker from "@/components/DuellJoker";

// ── FREMDJOKER — das DACH über den vier Arten, die in einen FREMDEN Tipp
//    greifen: Block · Klau · Trittbrettfahrer · Gegenwette ─────
//
// 🔴 Warum diese Datei über `DuellJoker.jsx` steht und es nicht ersetzt:
// Klau und Block wohnen im Regel-Block `rules.duell`, Trittbrettfahrer und
// Gegenwette in `rules.eingriffe`. Diese Asymmetrie ist Absicht (Kopf von
// `fremdjoker.js`) — die beiden alten Arten ein zweites Mal unter `eingriffe`
// zu führen hieße, dass eine Runde ZWEI Antworten auf „ist der Block an?"
// hätte. Also stellt `DuellJoker.jsx` weiterhin Klau und Block ein und wird
// hier eingebettet; die zwei NEUEN Arten und alles, was für die ganze Familie
// gilt, stehen in dieser Datei.
//
// Auftrag: `design/joker-sondermenue.md` Teil D, in `design/auftraege.md` als
// JK4–JK7 geführt:
//
//   JK4  Eingriffe in fremde Tipps: blocken · mitprofitieren · dagegen wetten
//   JK5  Sperrfrist je Ziel — damit nicht immer dieselben getroffen werden
//   JK6  Eingriffe müssen VOR der Frist sichtbar und zurücknehmbar sein
//   JK7  Die ganze Familie in EINEM Griff schaltbar
//
// ⚠️ Die Reihenfolge der Blöcke ist dieselbe Entscheidung wie in
// `DuellJoker.jsx`: erst der EINE Griff, dann der ehrliche Hinweis und die
// Konflikte, dann die Arten, und erst danach Schutz, Sichtbarkeit und
// Rücknahme. Wer den Preis der Familie erst unten liest, hat oben schon
// eingeschaltet.
//
// ⚠️ Was hier NICHT steht: die SPIELER-Ansicht der gesetzten Eingriffe („wer
// hat bei mir geblockt, und kann ich es noch herausnehmen?"). Sie läuft über
// `offeneEingriffe` aus `fremdjoker.js` und steht in `MeineJoker.jsx`, gespeist
// aus der Store-Methode `getFremdEingriffe`. Diese Datei ist reine
// Admin-Einstellung — was der Admin hier festlegt, wird dort erlebt.
//
// `onChange` bekommt ein TEIL-Regelwerk, genau wie `JokerSondermenue` es an
// seine Bausteine weitergibt: `{ eingriffe: … }`, `{ duell: … }` oder beides.
export default function Fremdjoker({ rules, onChange }) {
  const eg = sanitizeEingriffe(rules?.eingriffe);
  // Jede Änderung durch die Bereinigung — ein Tippfehler im Feldnamen sieht
  // sonst exakt aus wie eine tote Einstellung (`npm run greift`, Sperrklinke
  // „EINSTELLUNG VERWORFEN").
  const setze = (teil) => onChange({ eingriffe: sanitizeEingriffe({ ...eg, ...teil }) });
  const setzeTritt = (teil) => setze({ trittbrett: { ...eg.trittbrett, ...teil } });
  const setzeGegen = (teil) => setze({ gegenwette: { ...eg.gegenwette, ...teil } });

  const arten = aktiveArten(rules);
  const an = familieAn(rules);
  const hinweis = zweiPhasenHinweis(rules);
  const streit = konflikte(rules);

  // 🔴 JK7 — der EINE Griff. `familieSchalten` gibt ein GANZES Regelwerk
  // zurück (es muss beim Einschalten auch `duell` anfassen, sonst wäre „an"
  // ein Klick ohne Wirkung); weitergereicht werden davon nur die zwei Blöcke,
  // die es wirklich verändert.
  const schalte = (wert) => {
    const neu = familieSchalten(rules, wert);
    onChange({ eingriffe: neu.eingriffe, duell: neu.duell });
  };

  const knopf = (aktiv, text, onClick, key, titel) => (
    <button key={key} type="button" onClick={onClick} title={titel} style={{
      border: `1px solid ${aktiv ? C.coral : C.line}`, borderRadius: RUND.pille,
      background: aktiv ? `${C.coral}1a` : "transparent", color: aktiv ? C.coral : C.text,
      // 🔴 `TAPZIEL_QUADRAT` statt `TAPZIEL`, gemessen am 23.08.2026 im Browser
      // auf 375 px: „An" und „Aus" sind so kurz, dass die Pille nur 40 px breit
      // wird — 44 hoch, 40 breit. `TAPZIEL` setzt bewusst nur die HÖHE (die
      // Begründung steht in `tapziel.js`), und bei langen Beschriftungen genügt
      // das auch. Bei zwei Buchstaben nicht.
      ...TAPZIEL_QUADRAT, cursor: "pointer", padding: "5px 11px", fontSize: 12, fontWeight: aktiv ? 700 : 500,
    }}>{text}</button>
  );

  const Block = ({ titel, hinweis: hint, children }) => (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 5 }}>{titel}</div>
      {children}
      {hint && (
        <div style={{ fontSize: 11, color: C.muted, marginTop: 4, lineHeight: 1.45 }}>{hint}</div>
      )}
    </div>
  );

  const stufe = GEGEN_STUFEN.find((s) => s.key === eg.gegenwette.stufe);
  const modus = GEGEN_MODI.find((m) => m.key === eg.gegenwette.modus);
  const zurueck = RUECKNAHME.find((r) => r.key === eg.ruecknahme);

  return (
    <div>
      {/* ── 1) JK7: der eine Griff ── */}
      <p style={{ fontSize: 12, color: C.muted, margin: "0 0 10px", lineHeight: 1.5 }}>
        Vier Joker in den Tipp eines <strong>anderen</strong>: blocken, klauen,
        mitprofitieren, dagegen wetten. Ein Griff für die ganze Familie —
        Büro-Runde aus, Freundesrunde an.
      </p>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {knopf(!an, "Aus", () => schalte(false), "aus",
          "Kein Fremdjoker — auch Klau und Block bleiben stumm, ihre Einstellungen aber erhalten.")}
        {knopf(an, "An", () => schalte(true), "an",
          "Fremdjoker frei. Läuft noch keine Art, kommen Klau und Block als Grundausstattung dazu.")}
      </div>

      {/* Die eine Auskunft über die Familie — `aktiveArten` ist die EINZIGE
          Stelle, an der „welche Fremdjoker laufen gerade?" beantwortet wird.
          Hier nachzuzählen wäre die zweite Wahrheit (Runden-Schicht, CLAUDE.md). */}
      <div style={{ fontFamily: MONO, fontSize: 11, color: an ? C.akzent : C.muted, marginTop: 6 }}>
        {arten.length} von {FREMDJOKER_ARTEN.length} Arten aktiv
        {arten.length > 0 && `: ${arten.map((k) => FREMDJOKER_ARTEN.find((a) => a.key === k).label).join(" · ")}`}
      </div>

      {/* ── 2) JK19: der ehrliche Hinweis. Der TEXT kommt aus
             `zweiPhasenHinweis` — dieselbe Aussage in der Komponente noch
             einmal zu formulieren hieße, dass sie beim nächsten Umbau
             auseinanderläuft. ── */}
      {an && hinweis && (
        <div style={{
          border: `1px solid ${C.coral}`, background: `${C.coral}12`,
          borderRadius: RUND.karte, padding: "10px 13px", marginTop: 10,
          fontSize: 12, color: C.coral, lineHeight: 1.5,
        }}>
          {hinweis}
        </div>
      )}

      {/* ── 3) Konflikte: gemeldet, nicht still korrigiert. Ein
             Korrektur-Knopf würde eine Runde umschreiben, die der Admin so
             gewollt haben könnte. ── */}
      {streit.map((k) => (
        <div key={k.key} style={{ fontSize: 11, color: C.coral, marginTop: 6, lineHeight: 1.45 }}>
          ⚠️ {k.text}
        </div>
      ))}

      {an && (
        <>
          {/* ── 4) Klau und Block: unverändert aus `DuellJoker.jsx`. ── */}
          <Block titel="Klauen und blocken"
            hinweis="Die zwei alten Arten mitsamt ihren Schutzregeln, Kontingenten und Stärken.">
            <div style={{ paddingLeft: 10, borderLeft: `1px solid ${C.line}` }}>
              <DuellJoker rules={rules} onChange={(d) => onChange({ duell: d })} />
            </div>
          </Block>

          {/* ── 5) JK4: Trittbrettfahrer ── */}
          <Block titel="Trittbrettfahrer"
            hinweis={eg.trittbrett.enabled
              ? `Anteil für dich: so viel von dem, was der fremde Tipp einbringt, landet bei dir. `
                + `Aufschlag für den Kopierten: was er zusätzlich bekommt, weil jemand auf ihn gesetzt hat — `
                + `${eg.trittbrett.kopierterBekommt > 0
                  ? "sein Preis für die Aufmerksamkeit."
                  : "0 = er merkt nur, dass er kopiert wurde, und bekommt nichts dafür."}`
              : "Anhängen an den fremden Tipp statt selbst tippen: du bekommst einen Anteil dessen, was er bringt."}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {knopf(!eg.trittbrett.enabled, "Aus", () => setzeTritt({ enabled: false }), "tb-aus",
                "Niemand hängt sich an einen fremden Tipp.")}
              {knopf(eg.trittbrett.enabled, "An", () => setzeTritt({ enabled: true }), "tb-an",
                "Du hängst dich an den fremden Tipp und bekommst einen Anteil dessen, was er bringt.")}
            </div>
            {eg.trittbrett.enabled && (
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
                <Zahl label="Anteil für dich" wert={eg.trittbrett.anteil} limits={EINGRIFF_LIMITS.anteil}
                  breite={120} onChange={(v) => setzeTritt({ anteil: v })} />
                <Zahl label="Aufschlag für den Kopierten" wert={eg.trittbrett.kopierterBekommt}
                  limits={EINGRIFF_LIMITS.kopierterBekommt}
                  breite={170} onChange={(v) => setzeTritt({ kopierterBekommt: v })} />
              </div>
            )}
          </Block>

          {/* ── 6) JK4: Gegenwette ── */}
          <Block titel="Gegenwette"
            hinweis={eg.gegenwette.enabled
              ? "Ausgewertet über die Gegenquote: gegen einen Favoritentipp zahlt es dreifach, gegen ein exaktes Ergebnis ein Prozent. Der Einsatz ist bei einem Treffer des Getippten weg."
              : "Setzen darauf, dass der fremde Tipp NICHT aufgeht — zur Gegenquote."}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {knopf(!eg.gegenwette.enabled, "Aus", () => setzeGegen({ enabled: false }), "gw-aus",
                "Niemand wettet gegen einen fremden Tipp.")}
              {knopf(eg.gegenwette.enabled, "An", () => setzeGegen({ enabled: true }), "gw-an",
                "Du setzt darauf, dass der fremde Tipp NICHT aufgeht — zur Gegenquote.")}
            </div>

            {eg.gegenwette.enabled && (
              <>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
                  <Zahl label="Einsatz" wert={eg.gegenwette.einsatz} limits={EINGRIFF_LIMITS.einsatz}
                    breite={110} onChange={(v) => setzeGegen({ einsatz: v })} />
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4, lineHeight: 1.45 }}>
                  Ohne Einsatz wäre auch eine Gegenquote von 1,01 ein Geschenk — der Einsatz ist der Preis
                  dafür, dass fast jede Gegenwette aufgeht.
                </div>

                <div style={{ fontSize: 12, color: C.muted, marginTop: 10, marginBottom: 5 }}>
                  Auf welcher Genauigkeit?
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {GEGEN_STUFEN.map((s) => knopf(eg.gegenwette.stufe === s.key, s.label,
                    () => setzeGegen({ stufe: s.key }), s.key, s.desc))}
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4, lineHeight: 1.45 }}>
                  {stufe?.desc}
                </div>

                <div style={{ fontSize: 12, color: C.muted, marginTop: 10, marginBottom: 5 }}>
                  Woher kommt der Gewinn?
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {GEGEN_MODI.map((m) => knopf(eg.gegenwette.modus === m.key, m.label,
                    () => setzeGegen({ modus: m.key }), m.key, m.desc))}
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4, lineHeight: 1.45 }}>
                  {modus?.desc}
                </div>
              </>
            )}
          </Block>

          {/* ── 7) JK5: Schutz vor Dauer-Opfern ── */}
          <Block titel="Schutz vor Dauer-Opfern"
            hinweis={eg.sperrfristJeZiel > 0
              ? `Wer jemanden getroffen hat, lässt ihn ${eg.sperrfristJeZiel} `
                + `${eg.sperrfristJeZiel === 1 ? "Spieltag" : "Spieltage"} in Ruhe — andere dürfen weiter. `
                + "Der Unterschied zu „max. je Ziel“ bei Klau und Block: das begrenzt, wie oft jemand "
                + "INSGESAMT getroffen wird; die Sperrfrist verhindert, dass DERSELBE ihn wieder und wieder trifft."
              : "0 = Sperrfrist aus. „max. je Ziel“ bei Klau und Block begrenzt dann nur, wie oft jemand "
                + "INSGESAMT getroffen wird — nicht, ob es immer derselbe Gegner ist."}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Zahl label="Sperrfrist je Ziel" wert={eg.sperrfristJeZiel}
                limits={EINGRIFF_LIMITS.sperrfristJeZiel}
                breite={140} onChange={(v) => setze({ sperrfristJeZiel: v })} />
            </div>
          </Block>

          {/* ── 8) JK6: sichtbar und zurücknehmbar ── */}
          <div style={{ fontSize: 11, color: C.coral, marginTop: 14, lineHeight: 1.5 }}>
            🔴 Der ganze Zweck der Familie: „nimm den Block bei mir fürs Bayern-Spiel raus, ich habe da
            ein zu gutes Gefühl." Ein Eingriff, den man erst bei der Abrechnung sieht oder nicht mehr
            herausnehmen kann, leistet davon nichts — aus dem Austausch wird eine stille
            Punkteverschiebung.
          </div>

          {/* ⚠️ „Verborgen" heißt: der Betroffene sieht GAR NICHTS, bis
              angepfiffen ist — kein Mittelding „jemand blockt eines deiner
              Spiele". Ob dieses Mittelding die bessere Form wäre, ist in
              `joker-sondermenue.md` Teil D eine ausdrücklich OFFENE Frage von
              Andi. Der Text hier muss sagen, was die Mechanik TUT, nicht was
              sie tun könnte: eine Beschriftung, die einen dritten Zustand
              verspricht, den es nicht gibt, ist schlimmer als gar keine. */}
          <Block titel="Vor der Frist sichtbar?"
            hinweis={eg.sichtbarVorFrist
              ? "Offen: jeder sieht mit Namen, wer bei ihm eingegriffen hat, bevor der Spieltag beginnt. Nur so kann man den anderen ansprechen."
              : "⚠️ Verborgen: der Betroffene erfährt bis zum Anpfiff gar nichts davon. Damit fällt der Austausch weg, um den es hier geht."}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {knopf(eg.sichtbarVorFrist, "Offen", () => setze({ sichtbarVorFrist: true }), "sv-an",
                "Der Eingriff steht mit Namen beim Betroffenen, sobald er gesetzt ist.")}
              {knopf(!eg.sichtbarVorFrist, "Verborgen", () => setze({ sichtbarVorFrist: false }), "sv-aus",
                "Der Betroffene sieht den Eingriff erst nach dem Anpfiff — bis dahin steht bei ihm nichts.")}
            </div>
          </Block>

          <Block titel="Bis wann zurücknehmbar?" hinweis={zurueck?.desc}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {RUECKNAHME.map((r) => knopf(eg.ruecknahme === r.key, r.label,
                () => setze({ ruecknahme: r.key }), r.key, r.desc))}
            </div>
          </Block>

          {/* ── 9) Die Schlusszeile, Muster `DuellJoker.jsx` ── */}
          <p style={{
            fontSize: 11, color: C.muted, marginTop: 12, lineHeight: 1.5,
            borderTop: `1px solid ${C.line}`, paddingTop: 8,
          }}>
            <span style={{ fontFamily: MONO, fontSize: 11, color: C.coral }}>SO LIEST ES SICH: </span>
            {beschreibeFremdjoker(rules)}
          </p>
        </>
      )}
    </div>
  );
}
