"use client";

import { useState } from "react";

import { C, MONO, RUND } from "@/lib/theme";
import {
  FREMDJOKER_ARTEN, GEGEN_STUFEN, GEGEN_MODI,
  EINGRIFF_LIMITS, sanitizeEingriffe, jokerArtVon,
  sanitizeSperrKarte, sanitizeSichtKarte, sanitizeLosKarte,
  sperreFuer, sichtFuer, losFuer, wartezeit,
  LOS_TAKTE, LOS_PAARE, LOS_SICHT, SCHUTZ_VERFALL, sanitizeSchutz,
} from "@/lib/eingriffe";
import {
  aktiveArten, familieAn, familieSchalten, beschreibeFremdjoker,
  konflikte, zweiPhasenHinweis,
} from "@/lib/fremdjoker";
import { sanitizeDuellJoker } from "@/lib/duellJoker";
import { basisFuer, WIDERRUF } from "@/lib/jokerBasis";
import { Zahl } from "@/components/Eingaben";
import { TAPZIEL_QUADRAT } from "@/lib/tapziel";
import DuellJoker from "@/components/DuellJoker";
import Feinheiten from "@/components/Feinheiten";

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

  // Welche Vertiefung ist gerade offen? Immer nur EINE — dieselbe Entscheidung
  // wie bei den Karten im Joker-Sondermenü: zwei offene Ebenen sind wieder
  // eine lange Seite.
  const [tiefer, setTiefer] = useState(null);

  const karte = sanitizeSperrKarte(eg.sperrfrist);
  const sicht = sanitizeSichtKarte(eg.sichtbar);
  const losKarte = sanitizeLosKarte(eg.los);
  const schutz = sanitizeSchutz(eg.schutz);
  const setzeSchutz = (teil) => setze({ schutz: sanitizeSchutz({ ...schutz, ...teil }) });
  // 🔴 Der SCHALTER für JK12 sitzt in der Zielwahl (`DuellJoker.jsx`, fünfte
  // Stufe) — hier steht nur, WIE gelost wird. Solange er nicht umgelegt ist,
  // hat dieser Block nichts zu sagen und bleibt weg.
  const lostAus = sanitizeDuellJoker(rules?.duell).zielWahl === "ausgelost";
  const setzeLos = (art, teil) => {
    const naechste = { ...losKarte };
    if (art == null) naechste.standard = { ...losKarte.standard, ...teil };
    else naechste[art] = { ...(losKarte[art] ?? {}), ...teil };
    setze({ los: sanitizeLosKarte(naechste) });
  };
  // `undefined` löscht die Abweichung — die Art folgt dann wieder dem Standard.
  const setzeSicht = (art, wert) => {
    const naechste = { ...sicht };
    if (art == null) naechste.standard = wert;
    else if (wert === undefined) delete naechste[art];
    else naechste[art] = wert;
    setze({ sichtbar: sanitizeSichtKarte(naechste) });
  };
  // Ein Feld setzen — `null` als Art meint den Standard. `undefined` als Wert
  // LÖSCHT die Abweichung, die Art folgt dann wieder dem Standard.
  const setzeSperre = (art, teil) => {
    const naechste = { ...karte };
    if (art == null) {
      naechste.standard = { ...karte.standard, ...teil };
    } else {
      const vorher = { ...(karte[art] ?? {}) };
      for (const [k, v] of Object.entries(teil)) {
        if (v === undefined) delete vorher[k];
        else vorher[k] = v;
      }
      naechste[art] = vorher;
    }
    setze({ sperrfrist: sanitizeSperrKarte(naechste) });
  };

  const arten = aktiveArten(rules);
  // Welche Arten eine EIGENE Sperrfrist tragen — für die Zusammenfassung an
  // der Klappe. ⚠️ `undefined` heißt „folgt dem Standard": nur ein gesetzter
  // Wert zählt als Abweichung, sonst meldete die Klappe eine Sonderregel, wo
  // gar keine ist.
  const eigeneSperren = arten.filter((k) => karte[k]?.spieltage !== undefined);
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
      ...TAPZIEL_QUADRAT, cursor: "pointer", padding: "5px 11px", fontSize: "0.75rem", fontWeight: aktiv ? 700 : 500,
    }}>{text}</button>
  );

  const Block = ({ titel, hinweis: hint, children }) => (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: "0.75rem", color: C.muted, marginBottom: 5 }}>{titel}</div>
      {children}
      {hint && (
        <div style={{ fontSize: "0.6875rem", color: C.muted, marginTop: 4, lineHeight: 1.45 }}>{hint}</div>
      )}
    </div>
  );

  // Was die Grundform je laufender Art zum Widerruf sagt — gelesen, nicht
  // nachgebaut (`basisFuer` ist die einzige Stelle, die `rules.jokerBasis`
  // auflösen darf).
  const ruecknahmeText = arten.length === 0
    ? "—"
    : arten.map((k) => {
        const b = basisFuer(jokerArtVon(k), rules);
        const label = WIDERRUF.find((w) => w.key === b.widerruf)?.label ?? b.widerruf;
        const stunden = b.widerruf === "bisStunden" ? ` (${b.widerrufStunden} Std.)` : "";
        const name = FREMDJOKER_ARTEN.find((a) => a.key === k).label;
        return `${name}: ${label}${stunden}`;
      }).join(" · ");

  const stufe = GEGEN_STUFEN.find((s) => s.key === eg.gegenwette.stufe);
  const modus = GEGEN_MODI.find((m) => m.key === eg.gegenwette.modus);

  return (
    <div>
      {/* ── 1) JK7: der eine Griff ── */}
      <p style={{ fontSize: "0.75rem", color: C.muted, margin: "0 0 10px", lineHeight: 1.5 }}>
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
      <div style={{ fontFamily: MONO, fontSize: "0.6875rem", color: an ? C.akzent : C.muted, marginTop: 6 }}>
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
          fontSize: "0.75rem", color: C.coral, lineHeight: 1.5,
        }}>
          {hinweis}
        </div>
      )}

      {/* ── 3) Konflikte: gemeldet, nicht still korrigiert. Ein
             Korrektur-Knopf würde eine Runde umschreiben, die der Admin so
             gewollt haben könnte. ── */}
      {streit.map((k) => (
        <div key={k.key} style={{ fontSize: "0.6875rem", color: C.coral, marginTop: 6, lineHeight: 1.45 }}>
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
                <div style={{ fontSize: "0.6875rem", color: C.muted, marginTop: 4, lineHeight: 1.45 }}>
                  Ohne Einsatz wäre auch eine Gegenquote von 1,01 ein Geschenk — der Einsatz ist der Preis
                  dafür, dass fast jede Gegenwette aufgeht.
                </div>

                <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 10, marginBottom: 5 }}>
                  Auf welcher Genauigkeit?
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {GEGEN_STUFEN.map((s) => knopf(eg.gegenwette.stufe === s.key, s.label,
                    () => setzeGegen({ stufe: s.key }), s.key, s.desc))}
                </div>
                <div style={{ fontSize: "0.6875rem", color: C.muted, marginTop: 4, lineHeight: 1.45 }}>
                  {stufe?.desc}
                </div>

                <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 10, marginBottom: 5 }}>
                  Woher kommt der Gewinn?
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {GEGEN_MODI.map((m) => knopf(eg.gegenwette.modus === m.key, m.label,
                    () => setzeGegen({ modus: m.key }), m.key, m.desc))}
                </div>
                <div style={{ fontSize: "0.6875rem", color: C.muted, marginTop: 4, lineHeight: 1.45 }}>
                  {modus?.desc}
                </div>
              </>
            )}
          </Block>

          {/* ── 7) JK5: Schutz vor Dauer-Opfern, DREI Ebenen tief ──
                 Andi, 23.08.2026: „für jeden Joker Sperrfrist einzeln
                 einstellbar, und mach bei sowas auch weitere Option zur
                 Feineinstellung durch weiteren Klick."
                 Ebene 1 steht offen da, Ebene 2 und 3 liegen hinter je einem
                 Klick — wer nur eine Zahl will, sieht auch nur eine. */}
          <Block titel="Schutz vor Dauer-Opfern"
            hinweis={sperrText(sperreFuer(null, rules?.eingriffe))
              + " Der Unterschied zu „max. je Ziel“ bei Klau und Block: das begrenzt, wie oft jemand "
              + "INSGESAMT getroffen wird; die Sperrfrist verhindert, dass DERSELBE ihn wieder und wieder trifft."}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Zahl label="Sperrfrist (Spieltage)" wert={karte.standard.spieltage}
                limits={EINGRIFF_LIMITS.spieltage}
                breite={150} onChange={(v) => setzeSperre(null, { spieltage: v })} />
            </div>

            {/* 🔴 Seit dem 24.08.2026 über das GEMEINSAME Bauteil (`Feinheiten`).
                Vorher waren es zwei selbstgebaute Knöpfe mit eigenem Zustand —
                dieselbe Sache, aber in einer eigenen Fassung, und genau daraus
                entsteht der Wildwuchs, den `npm run detail` jetzt misst.
                `offen`/`onUmschalten` erhalten das gewollte Verhalten: immer
                nur EINE der beiden Ebenen offen. */}
            <Feinheiten
              titel="Je Fremdjoker einzeln"
              zusammenfassung={eigeneSperren.length ? `${eigeneSperren.length} abweichend` : null}
              abweichend={eigeneSperren.length > 0}
              offen={tiefer === "arten"}
              onUmschalten={(auf) => setTiefer(auf ? "arten" : null)}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: "0.6875rem", color: C.muted, lineHeight: 1.45 }}>
                  Leer heißt: diese Art folgt der Zahl oben. Gespeichert wird nur, was abweicht.
                </div>
                {arten.map((k) => {
                  const eigen = karte[k]?.spieltage;
                  const name = FREMDJOKER_ARTEN.find((a) => a.key === k).label;
                  return (
                    <div key={k} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
                      <Zahl label={name} wert={eigen ?? karte.standard.spieltage}
                        limits={EINGRIFF_LIMITS.spieltage} breite={150}
                        onChange={(v) => setzeSperre(k, { spieltage: v })} />
                      {eigen !== undefined && knopf(false, "zurück auf Standard",
                        () => setzeSperre(k, { spieltage: undefined }), `${k}-reset`,
                        "Diese Art folgt wieder der Zahl oben.")}
                    </div>
                  );
                })}
              </div>
            </Feinheiten>

            {/* ── Ebene 3: wie die Sperre sich VERHÄLT ──
                🔴 Genau Andis Beispiel: „es gibt nicht das Verbot, das doppelt
                hintereinander einzusetzen, aber der Cooldown verändert sich
                dadurch eben." Kein eigenes Modus-Feld — der Aufschlag SAGT es
                schon: 0 heißt fest, alles darüber heißt wachsend. */}
            <Feinheiten
              titel="Wie die Sperre wirkt"
              zusammenfassung={karte.standard.aufschlag > 0 ? "wachsend" : "festes Verbot"}
              abweichend={karte.standard.aufschlag > 0}
              offen={tiefer === "verhalten"}
              onUmschalten={(auf) => setTiefer(auf ? "verhalten" : null)}
            >
              <div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {knopf(karte.standard.aufschlag === 0, "Festes Verbot",
                    () => setzeSperre(null, { aufschlag: 0 }), "vh-fest",
                    "Nach einem Treffer gilt immer dieselbe Wartezeit.")}
                  {knopf(karte.standard.aufschlag > 0, "Wachsender Cooldown",
                    () => setzeSperre(null, { aufschlag: karte.standard.aufschlag || 2 }), "vh-wachs",
                    "Kein Verbot beim nächsten Mal — aber jeder Wiederholungstreffer verlängert die Wartezeit.")}
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
                  <Zahl label="Aufschlag je Wiederholung" wert={karte.standard.aufschlag}
                    limits={EINGRIFF_LIMITS.aufschlag} breite={180}
                    onChange={(v) => setzeSperre(null, { aufschlag: v })} />
                  <Zahl label="höchstens (Spieltage)" wert={karte.standard.hoechstens}
                    limits={EINGRIFF_LIMITS.hoechstens} breite={170}
                    onChange={(v) => setzeSperre(null, { hoechstens: v })} />
                </div>
                <div style={{ fontSize: "0.6875rem", color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
                  {verlaufText(sperreFuer(null, rules?.eingriffe))}
                </div>
              </div>
            </Feinheiten>
          </Block>

          {/* ── 7b) JK12: das ausgeloste Ziel ──
                 Nur wenn die Zielwahl darauf steht. Ein Block mit vier
                 Reglern, die nichts tun, wäre schlimmer als keiner. */}
          {lostAus && (
            <Block titel="Wie wird ausgelost?"
              hinweis="Du suchst dir dein Opfer nicht aus — du entscheidest, bei welchem SPIEL du zuschlägst. Jeder zieht genau einen und wird genau einmal gezogen.">
              <div style={{ fontSize: "0.75rem", color: C.muted, marginBottom: 5 }}>Wie oft neu?</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {LOS_TAKTE.map((t) => knopf(losKarte.standard.takt === t.key, t.label,
                  () => setzeLos(null, { takt: t.key }), t.key, t.desc))}
              </div>
              <div style={{ fontSize: "0.6875rem", color: C.muted, marginTop: 4, lineHeight: 1.45 }}>
                {LOS_TAKTE.find((t) => t.key === losKarte.standard.takt)?.desc}
              </div>

              <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 10, marginBottom: 5 }}>Gegenseitig?</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {LOS_PAARE.map((t) => knopf(losKarte.standard.paare === t.key, t.label,
                  () => setzeLos(null, { paare: t.key }), t.key, t.desc))}
              </div>
              <div style={{ fontSize: "0.6875rem", color: C.muted, marginTop: 4, lineHeight: 1.45 }}>
                {LOS_PAARE.find((t) => t.key === losKarte.standard.paare)?.desc}
              </div>

              <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 10, marginBottom: 5 }}>Sieht man sein Los?</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {LOS_SICHT.map((t) => knopf(losKarte.standard.sichtbar === t.key, t.label,
                  () => setzeLos(null, { sichtbar: t.key }), t.key, t.desc))}
              </div>
              <div style={{ fontSize: "0.6875rem", color: C.muted, marginTop: 4, lineHeight: 1.45 }}>
                {LOS_SICHT.find((t) => t.key === losKarte.standard.sichtbar)?.desc}
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                {knopf(!losKarte.jeArt, "Ein Los für alle Arten",
                  () => setze({ los: sanitizeLosKarte({ ...losKarte, jeArt: false }) }), "ja-aus",
                  "Dasselbe Ziel, egal welchen Fremdjoker du setzt.")}
                {knopf(losKarte.jeArt, "Je Fremdjoker ein eigenes",
                  () => setze({ los: sanitizeLosKarte({ ...losKarte, jeArt: true }) }), "ja-an",
                  "Der Block trifft jemand anderen als die Gegenwette.")}
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {knopf(tiefer === "los", "Je Fremdjoker einzeln…",
                  () => setTiefer(tiefer === "los" ? null : "los"), "tf-los",
                  "Der Block darf jeden Spieltag neu losen, während die Fehde bei der Gegenwette die Saison hält.")}
              </div>

              {tiefer === "los" && (
                <div style={{
                  marginTop: 8, paddingLeft: 10, borderLeft: `1px solid ${C.line}`,
                  display: "flex", flexDirection: "column", gap: 8,
                }}>
                  {arten.map((k) => {
                    const name = FREMDJOKER_ARTEN.find((a) => a.key === k).label;
                    const eigen = losFuer(k, rules?.eingriffe);
                    return (
                      <div key={k} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.75rem", color: C.muted, minWidth: 108 }}>{name}</span>
                        {LOS_TAKTE.map((t) => knopf(eigen.takt === t.key, t.label,
                          () => setzeLos(k, { takt: t.key }), `${k}-${t.key}`, t.desc))}
                      </div>
                    );
                  })}
                </div>
              )}
            </Block>
          )}

          {/* ── 7c) JK14: geschützte Spiele ──
                 🔴 Die einzige Schutzregel, die dem SPIELER gehört. Hier steht
                 nur die ANZAHL — die Wahl selbst trifft er bei der Tippabgabe. */}
          <Block titel="Geschützte Spiele"
            hinweis={schutz.proSpieltag === 0
              ? "0 = kein Schutz, jedes Spiel ist angreifbar. ⚠️ Wer Samstag im Stadion sitzt, kann dann nichts dagegen tun, dass genau dieses Spiel weggeblockt wird — und dann schaltet die Runde die Fremdjoker ab."
              : `Jeder darf ${schutz.proSpieltag} ${schutz.proSpieltag === 1 ? "Spiel" : "Spiele"} je Spieltag vor JEDEM Fremdjoker schützen. Er wählt sie bei der Tippabgabe — aus einem Grund, den keine Regel kennen kann: an welchem Spiel sein Abend hängt.`}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Zahl label="je Spieltag und Spieler" wert={schutz.proSpieltag}
                limits={EINGRIFF_LIMITS.proSpieltag} breite={170}
                onChange={(v) => setzeSchutz({ proSpieltag: v })} />
            </div>

            {schutz.proSpieltag > 0 && (
              <>
                <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 10, marginBottom: 5 }}>
                  Sieht der Angreifer den Schutz?
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {knopf(schutz.sichtbar, "Offen", () => setzeSchutz({ sichtbar: true }), "sch-an",
                    "Ein Schild am Spiel. Niemand verbrennt einen Einsatz für nichts.")}
                  {knopf(!schutz.sichtbar, "Verdeckt", () => setzeSchutz({ sichtbar: false }), "sch-aus",
                    "Der Angreifer erfährt es erst, wenn sein Einsatz verpufft ist.")}
                </div>
                <div style={{ fontSize: "0.6875rem", color: C.muted, marginTop: 4, lineHeight: 1.45 }}>
                  {schutz.sichtbar
                    ? "Offen: ein Fremdjoker verpufft nicht ungewarnt. Der Angreifer weiß dafür, welches Spiel dir wichtig ist."
                    : "Verdeckt: dein wichtigstes Spiel bleibt dein Geheimnis — dafür verbrennt jemand einen Einsatz für nichts."}
                </div>

                <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 10, marginBottom: 5 }}>
                  Was wird aus dem verpufften Einsatz?
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {SCHUTZ_VERFALL.map((v) => knopf(schutz.verfall === v.key, v.label,
                    () => setzeSchutz({ verfall: v.key }), v.key, v.desc))}
                </div>
                <div style={{ fontSize: "0.6875rem", color: C.muted, marginTop: 4, lineHeight: 1.45 }}>
                  {SCHUTZ_VERFALL.find((v) => v.key === schutz.verfall)?.desc}
                </div>
              </>
            )}
          </Block>

          {/* ── 8) JK6: sichtbar und zurücknehmbar ── */}
          <div style={{ fontSize: "0.6875rem", color: C.coral, marginTop: 14, lineHeight: 1.5 }}>
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
            hinweis={sicht.standard
              ? "Offen: jeder sieht mit Namen, wer bei ihm eingegriffen hat, bevor der Spieltag beginnt. Nur so kann man den anderen ansprechen."
              : "⚠️ Verborgen: der Betroffene erfährt bis zum Anpfiff gar nichts davon. Damit fällt der Austausch weg, um den es hier geht."}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {knopf(sicht.standard, "Offen", () => setzeSicht(null, true), "sv-an",
                "Der Eingriff steht mit Namen beim Betroffenen, sobald er gesetzt ist.")}
              {knopf(!sicht.standard, "Verborgen", () => setzeSicht(null, false), "sv-aus",
                "Der Betroffene sieht den Eingriff erst nach dem Anpfiff — bis dahin steht bei ihm nichts.")}
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              {knopf(tiefer === "sicht", "Je Fremdjoker einzeln…",
                () => setTiefer(tiefer === "sicht" ? null : "sicht"), "tf-sicht",
                "Der Block darf offen liegen, während die Gegenwette verborgen bleibt.")}
            </div>

            {tiefer === "sicht" && (
              <div style={{
                marginTop: 8, paddingLeft: 10, borderLeft: `1px solid ${C.line}`,
                display: "flex", flexDirection: "column", gap: 8,
              }}>
                <div style={{ fontSize: "0.6875rem", color: C.muted, lineHeight: 1.45 }}>
                  Ein Block, über den man reden kann — und eine Gegenwette, die überrascht.
                  Ohne eigene Wahl folgt jede Art dem Schalter oben.
                </div>
                {arten.map((k) => {
                  const name = FREMDJOKER_ARTEN.find((a) => a.key === k).label;
                  const wert = sichtFuer(k, rules?.eingriffe);
                  const eigen = sicht[k] !== undefined;
                  return (
                    <div key={k} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.75rem", color: C.muted, minWidth: 108 }}>{name}</span>
                      {knopf(wert, "Offen", () => setzeSicht(k, true), `${k}-s-an`)}
                      {knopf(!wert, "Verborgen", () => setzeSicht(k, false), `${k}-s-aus`)}
                      {eigen && knopf(false, "zurück auf Standard",
                        () => setzeSicht(k, undefined), `${k}-s-reset`,
                        "Diese Art folgt wieder dem Schalter oben.")}
                    </div>
                  );
                })}
              </div>
            )}
          </Block>

          {/* 🔴 Kein eigener Rücknahme-Regler. „Bis wann darf ich einen
              Einsatz zurücknehmen?" beantwortet die Joker-GRUNDFORM längst —
              je Art, mit Stunden-Variante, und die Tippabgabe setzt genau die
              beim Speichern durch. Ein zweiter Regler hier hätte anzeigen
              können, was das Speichern verweigert. Die Begründung steht bei
              `jokerArtVon` in `eingriffe.js`. */}
          <Block titel="Bis wann zurücknehmbar?"
            hinweis="Steht in der Joker-Grundform („Widerruf“), einstellbar je Fremdjoker einzeln: bis zum Anpfiff, bis X Stunden vorher, oder gar nicht. Vorgabe ist bis zum Anpfiff — nur so kann jemand den Block bei dir noch herausnehmen.">
            <div style={{ fontSize: "0.75rem", color: C.muted, lineHeight: 1.45 }}>
              {ruecknahmeText}
            </div>
          </Block>

          {/* ── 9) Die Schlusszeile, Muster `DuellJoker.jsx` ── */}
          <p style={{
            fontSize: "0.6875rem", color: C.muted, marginTop: 12, lineHeight: 1.5,
            borderTop: `1px solid ${C.line}`, paddingTop: 8,
          }}>
            <span style={{ fontFamily: MONO, fontSize: "0.6875rem", color: C.coral }}>SO LIEST ES SICH: </span>
            {beschreibeFremdjoker(rules)}
          </p>
        </>
      )}
    </div>
  );
}

// ── Zwei Sätze, die aus der Einstellung folgen ──────────────
// 🔴 Sie rechnen NICHT selbst: `wartezeit()` ist dieselbe Funktion, mit der
// die Prüfung entscheidet. Ein Screen, der eine eigene Formel dafür hätte,
// wäre die zweite Wahrheit (Runden-Schicht, CLAUDE.md).

function sperrText(sperre) {
  if (sperre.spieltage === 0 && sperre.aufschlag === 0) {
    return "0 = keine Sperre. Jeder darf jeden so oft treffen, wie das Kontingent hergibt.";
  }
  if (sperre.aufschlag === 0) {
    const n = sperre.spieltage;
    return `Wer jemanden getroffen hat, lässt ihn ${n} ${n === 1 ? "Spieltag" : "Spieltage"} in Ruhe — andere dürfen weiter.`;
  }
  return sperre.spieltage === 0
    ? "Kein Verbot: du darfst dieselbe Person direkt noch einmal treffen — und genau dadurch wächst die Wartezeit danach."
    : `Nach dem ersten Treffer ${sperre.spieltage} Spieltage Ruhe, und mit jedem weiteren wächst die Wartezeit.`;
}

// Die ersten vier Treffer durchgerechnet — die Zahl macht die Einstellung
// begreifbar, ohne dass jemand die Formel im Kopf haben muss.
function verlaufText(sperre) {
  const stufen = [1, 2, 3, 4].map((n) => {
    const w = wartezeit(sperre, n);
    return `${n}. Treffer → ${w === 0 ? "sofort wieder frei" : `${w} ${w === 1 ? "Spieltag" : "Spieltage"} warten`}`;
  });
  return `Bei dieser Person: ${stufen.join(" · ")}.`;
}
