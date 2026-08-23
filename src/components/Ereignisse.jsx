"use client";

import { C, MONO, RUND } from "@/lib/theme";
import {
  AUSWERTBARE_TYPEN, EREIGNIS_TYPEN, EREIGNIS_LIMITS, EREIGNIS,
  EREIGNIS_PRESETS, AUSWAHL_MODI, AUSWAHL_LIMITS, METRIKEN,
  sanitizeEreignisse, sanitizeAuswahl, beschreibeAuswahl, konflikte, beschreibeEreignisse,
} from "@/lib/ereignisse";
import { Zahl } from "@/components/Eingaben";
import { trefferAnteil } from "@/lib/auswahl";
import { TAPZIEL } from "@/lib/tapziel";
import {
  AUSWERTBARE_WIRKUNGEN, WIRKUNG, WIRKUNG_LIMITS,
  sanitizeWirkung, beschreibeWirkung, konflikte as wirkungsKonflikte,
} from "@/lib/wirkung";
import {
  AUSWERTBARE_AUSLOESER, AUSLOESER, AUSLOESER_LIMITS,
  sanitizeAusloeser, beschreibeAusloeser, haeufigkeit,
} from "@/lib/ausloeser";
import {
  AUSWERTBARE_GELTUNGEN, GELTUNG, GELTUNG_LIMITS,
  sanitizeGeltung, beschreibeGeltung, reichweite, jackpotDeckelNach,
  konflikte as geltungsKonflikte,
} from "@/lib/geltung";

// ── WEN trifft es? ──────────────────────────────────────────
// Drei Modi, eine Richtung, eine Zahl — und darunter der SATZ, den ein Spieler
// später liest. Ohne ihn steht dort „rang/unten/1", und das sagt niemandem
// etwas; dieselbe Rolle wie `anteile()` bei den Wettbewerbs-Gewichten.
// Die Beispielgröße für die Vorschau. Beim Einstellen ist die Runde noch
// leer — eine Zahl aus der echten Mitgliederliste gibt es nicht. Zwölf ist
// die Größe, mit der `auswahl.js` selbst rechnet.
const BEISPIEL_RUNDE = 12;

const MODUS_LABEL = { rang: "Feste Anzahl", perzentil: "Anteil in Prozent", mitte: "Das Mittelfeld" };

// ── WANN geht es los? ───────────────────────────────────────
// 🔴 Die vierte Achse in dieser Oberfläche (`ausloeser.js`) — und ein GATTER,
// kein Ersatz: die Ereignis-Typen selbst sind schon Auslöser („Serie",
// „erster exakter Treffer"). Hier kommt nur die zweite Frage davor: „und passt
// der Zeitpunkt?" Aus „Trost-Joker" wird so „Trost-Joker, aber nur jeden
// vierten Spieltag", ohne eine Zeile neuen Auswertungs-Code.
//
// ⚠️ Die HÄUFIGKEIT gehört dazu, nicht als Komfort: „jeder 4. Spieltag" klingt
// nach wenig und sind über eine Saison acht Auslösungen. Wörtlich dieselbe
// Falle wie bei den Wettbewerbs-Gewichten, wo `anteile()` deshalb eingebaut
// wurde — und wie `trefferAnteil` eine Achse weiter.
const BEISPIEL_SAISON = 34;

function Ausloeserfeld({ wert, onChange }) {
  const a = sanitizeAusloeser(wert);
  const info = AUSLOESER[a.typ];
  const wieOft = haeufigkeit(a, BEISPIEL_SAISON);
  const knopf = (aktiv, text, onClick, key, titel) => (
    <button key={key} type="button" onClick={onClick} title={titel} style={{
      border: `1px solid ${aktiv ? C.akzent : C.line}`, borderRadius: RUND.pille,
      background: aktiv ? `${C.akzent}1a` : "transparent", color: aktiv ? C.akzent : C.text,
      cursor: "pointer", padding: "4px 10px", fontSize: 11, fontWeight: aktiv ? 700 : 500,
    }}>{text}</button>
  );
  return (
    <div style={{ width: "100%" }}>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Wann darf es überhaupt auslösen?</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 6 }}>
        {AUSWERTBARE_AUSLOESER.map((x) =>
          knopf(a.typ === x.key, x.label, () => onChange({ ...a, typ: x.key }), x.key, x.text))}
      </div>
      {info.parameter.length > 0 && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {info.parameter.map((feld) => (
            <Zahl key={feld} label={FELD_LABEL[feld] ?? feld} wert={a[feld]}
              limits={AUSLOESER_LIMITS[feld]} breite={120}
              onChange={(v) => onChange({ ...a, [feld]: v })} />
          ))}
        </div>
      )}
      <div style={{ fontSize: 11, color: C.muted, marginTop: 5, lineHeight: 1.45 }}>
        Gilt <strong style={{ color: C.text }}>{beschreibeAusloeser(a)}</strong>
        {wieOft != null
          ? ` — etwa ${wieOft}× in ${BEISPIEL_SAISON} Spieltagen.`
          : " — wie oft das vorkommt, hängt am Saisonverlauf und lässt sich vorher nicht sagen."}
      </div>
    </div>
  );
}

const FELD_LABEL = {
  n: "jeder n-te", spieltag: "Spieltag", letzte: "letzte n",
  frequenz: "etwa alle n", prozent: "Prozent", abQuote: "ab Quote",
};

// ── WIE LANGE gilt es? ──────────────────────────────────────
// 🔴 Die vierte und letzte Achse (`geltung.js`). Sie erzeugt nichts, sondern
// verschiebt und streckt, was die Wirkung liefert — und ist damit die einzige
// der vier, bei der zwei Einstellungen dasselbe Wort verschieden meinen: ein
// Fenster über einen AUFSCHLAG gilt drei Spieltage lang, ein Fenster über eine
// GUTSCHRIFT zahlt trotzdem einmal. Deshalb steht die Wirkung im Satz darunter
// ausdrücklich drin, statt dass der Admin den Vertrag im Kopfkommentar von
// `geltung.js` nachlesen müsste.
//
// ⚠️ Eigene Label-Tabelle: `n` heißt bei der WANN-Achse „jeder n-te" und hier
// „Spieltage". Dieselbe Abkürzung für zwei Bedeutungen wäre der Anfang der
// Sorte Verwechslung, die dieses Projekt schon mehrfach Zeit gekostet hat.
const GELTUNG_FELD_LABEL = {
  n: "Spieltage", zuwachs: "Zuwachs % je leerem Spieltag", maxFaktor: "höchstens ×",
};

function Geltungsfeld({ wert, wirkung, onChange }) {
  const g = sanitizeGeltung(wert);
  const info = GELTUNG[g.typ];
  const dauer = reichweite(g, BEISPIEL_SAISON);
  const deckelNach = jackpotDeckelNach(g);
  const warnungen = geltungsKonflikte(g, wirkung);
  const knopf = (aktiv, text, onClick, key, titel) => (
    <button key={key} type="button" onClick={onClick} title={titel} style={{
      border: `1px solid ${aktiv ? C.akzent : C.line}`, borderRadius: RUND.pille,
      background: aktiv ? `${C.akzent}1a` : "transparent", color: aktiv ? C.akzent : C.text,
      cursor: "pointer", padding: "4px 10px", fontSize: 11, fontWeight: aktiv ? 700 : 500,
    }}>{text}</button>
  );
  return (
    <div style={{ width: "100%" }}>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Wie lange gilt das?</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 6 }}>
        {AUSWERTBARE_GELTUNGEN.map((x) =>
          knopf(g.typ === x.key, x.label, () => onChange({ ...g, typ: x.key }), x.key, x.text))}
      </div>
      {info.parameter.length > 0 && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {info.parameter.map((feld) => (
            <Zahl key={feld} label={GELTUNG_FELD_LABEL[feld] ?? feld} wert={g[feld]}
              limits={GELTUNG_LIMITS[feld]} breite={130}
              onChange={(v) => onChange({ ...g, [feld]: v })} />
          ))}
        </div>
      )}
      <div style={{ fontSize: 11, color: C.muted, marginTop: 5, lineHeight: 1.45 }}>
        Gilt <strong style={{ color: C.text }}>{beschreibeGeltung(g)}</strong>
        {/* Die Live-Vorschau. „rest" ist die einzige, deren Antwort am
            Zeitpunkt hängt — deshalb wird die Annahme genannt statt eine Zahl
            behauptet, wörtlich wie bei der Rundengröße eine Achse weiter. */}
        {g.typ === "rest"
          ? ` — an Spieltag ${Math.ceil(BEISPIEL_SAISON / 2)} verdient also noch ${dauer} Spieltage lang.`
          : dauer != null ? ` — das sind ${dauer} Spieltag${dauer === 1 ? "" : "e"}.` : "."}
        {deckelNach != null && (
          <> Ab {deckelNach} Spieltagen ohne Ausschüttung wächst nichts mehr.</>
        )}
      </div>
      {warnungen.map((k) => (
        <div key={k.key} style={{
          fontSize: 11, color: k.korrigieren ? C.coral : C.muted,
          marginTop: 4, lineHeight: 1.45,
        }}>{k.korrigieren ? "⚠️ " : "💡 "}{k.text}</div>
      ))}
    </div>
  );
}

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
      cursor: "pointer", padding: "4px 10px", fontSize: 11, fontWeight: aktiv ? 700 : 500,
    }}>{text}</button>
  );
  return (
    <div style={{ width: "100%" }}>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Was passiert dann?</div>
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
      <div style={{ fontSize: 11, color: C.muted, marginTop: 5, lineHeight: 1.45 }}>
        Ergebnis: <strong style={{ color: C.text }}>{beschreibeWirkung(w)}</strong> · {info.topf}
      </div>
      {warnungen.map((k) => (
        <div key={k.key} style={{
          fontSize: 11, color: k.korrigieren ? C.coral : C.muted,
          marginTop: 4, lineHeight: 1.45,
        }}>{k.korrigieren ? "⚠️ " : "💡 "}{k.text}</div>
      ))}
    </div>
  );
}

function Auswahlfeld({ wert, onChange }) {
  const a = sanitizeAuswahl(wert);
  const knopf = (aktiv, text, onClick, key) => (
    <button key={key} type="button" onClick={onClick} style={{
      border: `1px solid ${aktiv ? C.akzent : C.line}`, borderRadius: RUND.pille,
      background: aktiv ? `${C.akzent}1a` : "transparent", color: aktiv ? C.akzent : C.text,
      cursor: "pointer", padding: "4px 10px", fontSize: 11, fontWeight: aktiv ? 700 : 500,
    }}>{text}</button>
  );
  return (
    <div style={{ width: "100%" }}>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Wen trifft es?</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 6 }}>
        {AUSWAHL_MODI.map((m) => knopf(a.modus === m, MODUS_LABEL[m], () => onChange({ ...a, modus: m }), m))}
      </div>
      {/* `mitte` hat keine Richtung — es ist per Definition „weder oben noch
          unten". Den Knopf trotzdem zu zeigen wäre eine Einstellung, die ins
          Leere läuft. */}
      {a.modus !== "mitte" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 6 }}>
          {knopf(a.ende === "unten", "die Letzten", () => onChange({ ...a, ende: "unten" }), "u")}
          {knopf(a.ende === "oben", "die Besten", () => onChange({ ...a, ende: "oben" }), "o")}
        </div>
      )}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {a.modus === "rang" ? (
          <Zahl label="wie viele" wert={a.n} limits={AUSWAHL_LIMITS.n} breite={110}
            onChange={(v) => onChange({ ...a, n: v })} />
        ) : (
          <Zahl label="Anteil %" wert={a.prozent} limits={AUSWAHL_LIMITS.prozent} breite={110}
            onChange={(v) => onChange({ ...a, prozent: v })} />
        )}
      </div>
      {/* 🔴 Nicht nur WEN, sondern WIE VIELE. „die besten 5" klingt nach einer
          Kleinigkeit und ist in einer Zwölfer-Runde fast die halbe Gruppe —
          genau die Falle, für die es `anteile()` bei den Wettbewerbs-Gewichten
          gibt. `trefferAnteil()` war dafür gebaut, getestet und hatte keinen
          Aufrufer (gefunden über `npm run tot`).
          ⚠️ Die Rundengröße steht beim Einstellen noch nicht fest — deshalb
          eine ausdrücklich genannte Beispielgröße und keine erfundene Zahl. */}
      <div style={{ fontSize: 11, color: C.akzent, marginTop: 5 }}>
        Trifft: {beschreibeAuswahl(a)}
        {(() => {
          const anteil = trefferAnteil({ modus: a.modus, n: a.n, prozent: a.prozent, mitglieder: BEISPIEL_RUNDE });
          if (anteil == null) return null;
          const wieViele = Math.round(anteil * BEISPIEL_RUNDE);
          return (
            <span style={{ color: C.muted }}>
              {" "}— in einer Runde mit {BEISPIEL_RUNDE} Leuten etwa {wieViele}
              {wieViele === 1 ? " Person" : " Personen"} ({Math.round(anteil * 100)} %)
            </span>
          );
        })()}
      </div>
      {a.ende === "oben" && (
        <div style={{ fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 1.4 }}>
          ⚠️ Nach oben ausgezeichnet wirkt <strong>verstärkend</strong>: wer Spieltage
          gewinnt, bekommt ein Werkzeug, mit dem er wieder besser tippt. Eine
          Abklingzeit darunter hält das im Rahmen.
        </div>
      )}
    </div>
  );
}

const KATEGORIE = {
  meilenstein: "Aus dem Tippen selbst",
  widerfahrnis: "Wenn jemandem etwas widerfährt",
  herausforderung: "Herausforderungen",
};

// ── Joker verdienen ─────────────────────────────────────────
// Zweiter Joker-Topf neben der Verteilung. Der Deckel steht bewusst GANZ OBEN
// und nicht am Ende: er ist keine Feineinstellung, sondern die Zusage, dass
// niemand das Tippspiel über Nebenaufgaben gewinnt.
export default function Ereignisse({ rules, onChange }) {
  const cfg = sanitizeEreignisse(rules?.ereignisse);
  const warnungen = konflikte({ ...rules, ereignisse: cfg });

  const setze = (naechste) => onChange(sanitizeEreignisse(naechste));
  const istAn = (key) => cfg.aktive.some((a) => a.key === key);
  const wert = (key, feld) => cfg.aktive.find((a) => a.key === key)?.[feld];

  const umschalten = (key) => {
    const typ = EREIGNIS[key];
    setze({
      ...cfg, enabled: true,
      aktive: istAn(key)
        ? cfg.aktive.filter((a) => a.key !== key)
        : [...cfg.aktive, { key, ...typ.standard }],
    });
  };
  const setzeFeld = (key, feld, v) => setzeEintrag(key, { [feld]: v });

  // Mehrere Felder EINES Eintrags in einem Zug. Nötig, seit der Joker-Regler
  // die Wirkung mitschreibt: zwei `setzeFeld`-Aufrufe hintereinander gingen
  // beide von demselben alten `cfg` aus, und der zweite überschriebe den
  // ersten — der klassische Zustands-Fehler, und er wäre still.
  function setzeEintrag(key, teil) {
    setze({
      ...cfg,
      aktive: cfg.aktive.map((a) => (a.key === key ? { ...a, ...teil } : a)),
    });
  }

  return (
    <div>
      <p style={{ fontSize: 12, color: C.muted, margin: "0 0 10px", lineHeight: 1.5 }}>
        Neben den Jokern, die du verteilst, kann man sich welche <strong>verdienen</strong>.
        Belohnt wird immer dasselbe: eine Joker-Gutschrift — kein zweiter Punkte-Kanal,
        damit der Deckel weiter greift.
      </p>

      {/* 🔴 Die kuratierten Bündel bleiben JEDERZEIT abrufbar, auch nachdem
          jemand alles verstellt hat — Punkt 2 des Baukasten-Grundsatzes. Ohne
          sie führt der Weg zurück zu einer stimmigen Einstellung nur über
          „alles wieder abwählen und neu raten". */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 6 }}>
          Empfohlene Zusammenstellungen
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {EREIGNIS_PRESETS.map((p) => {
            const aktiv = JSON.stringify(sanitizeEreignisse(p.ereignisse)) === JSON.stringify(cfg);
            return (
              <button key={p.key} type="button" onClick={() => setze(p.ereignisse)}
                title={p.text}
                style={{
                  border: `1px solid ${aktiv ? C.mint : C.line}`, borderRadius: RUND.pille,
                  background: aktiv ? `${C.mint}1a` : "transparent",
                  color: aktiv ? C.mint : C.text, cursor: "pointer",
                  ...TAPZIEL, padding: "5px 11px", fontSize: 12, fontWeight: aktiv ? 700 : 500,
                }}>
                {p.label}
                {/* ⚠️ Die Wirkrichtung ist ABGELEITET, nicht gemessen (siehe
                    ereignisse.js) — deshalb steht „eher" davor. Ein Etikett,
                    das mehr behauptet, als die Zahl hergibt, ist schlimmer als
                    keins. */}
                {p.wirkrichtung === "verstärkend" && (
                  <span style={{ color: C.muted, fontWeight: 400 }}> · eher verstärkend</span>
                )}
                {p.wirkrichtung === "ausgleichend" && (
                  <span style={{ color: C.muted, fontWeight: 400 }}> · eher ausgleichend</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {cfg.enabled && (
        <div style={{
          background: `${C.mint}0e`, border: `1px solid ${C.mint}44`, borderRadius: RUND.karte,
          padding: "10px 12px", marginBottom: 12,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Höchstens erspielbar</span>
            <span style={{ fontFamily: MONO, fontSize: 13, color: C.mint }}>
              {cfg.maxErspielt} Joker / Saison
            </span>
          </div>
          <input type="range" value={cfg.maxErspielt}
            min={EREIGNIS_LIMITS.maxErspielt.min} max={EREIGNIS_LIMITS.maxErspielt.max}
            step={EREIGNIS_LIMITS.maxErspielt.step}
            onChange={(ev) => setze({ ...cfg, maxErspielt: +ev.target.value })}
            style={{ width: "100%", accentColor: C.mint, cursor: "pointer", marginTop: 6 }} />
          <p style={{ fontSize: 11, color: C.muted, margin: "3px 0 0", lineHeight: 1.45 }}>
            Ohne diese Grenze gewinnt eure Runde, wer die Nebenaufgaben am besten
            erledigt — und nicht, wer am besten tippt.
          </p>
        </div>
      )}

      {warnungen.map((w) => (
        <div key={w.key} style={{
          background: `${C.akzent}12`, border: `1px solid ${C.akzent}55`, borderRadius: RUND.karte,
          padding: "10px 12px", marginBottom: 10, fontSize: 12, color: C.text, lineHeight: 1.5,
        }}>
          <strong style={{ color: C.akzent }}>Doppelt belohnt: </strong>{w.text}
        </div>
      ))}

      {["meilenstein", "widerfahrnis"].map((kat) => (
        <div key={kat} style={{ marginBottom: 12 }}>
          <div style={{
            fontFamily: MONO, fontSize: 11, letterSpacing: 1.2, color: C.muted,
            textTransform: "uppercase", marginBottom: 6,
          }}>{KATEGORIE[kat]}</div>

          {AUSWERTBARE_TYPEN.filter((t) => t.kategorie === kat).map((t) => {
            const an = istAn(t.key);
            return (
              <div key={t.key} style={{
                background: an ? `${C.akzent}12` : C.surface,
                border: `1px solid ${an ? C.akzent + "55" : C.line}`,
                borderRadius: RUND.karte, padding: "10px 12px", marginBottom: 6,
              }}>
                <button onClick={() => umschalten(t.key)} style={{
                  width: "100%", textAlign: "left", background: "transparent", border: "none",
                  padding: 0, fontFamily: "inherit", color: C.text, cursor: "pointer",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{t.label}</span>
                    <span style={{ color: an ? C.akzent : C.muted, fontSize: 13 }}>{an ? "✓" : "+"}</span>
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 1.45 }}>{t.hint}</div>
                </button>

                {an && (
                  <div style={{ marginTop: 9, paddingTop: 9, borderTop: `1px solid ${C.line}`, display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {/* 🔴 Die WAS-Achse. Der Joker-Regler bleibt der Weg für
                        den Normalfall (und schreibt die Wirkung gleich mit),
                        darunter steht die volle Auswahl — sonst müsste jeder,
                        der nur „ein Joker" will, erst durch einen Katalog. */}
                    <Zahl label="Joker dafür" wert={wert(t.key, "belohnung")}
                      limits={EREIGNIS_LIMITS.belohnung} breite={110}
                      onChange={(v) => setzeEintrag(t.key, {
                        belohnung: v, wirkung: { typ: "joker", n: v },
                      })} />
                    {t.parameter.includes("anzahl") && (
                      <Zahl label="Spieltage in Folge" wert={wert(t.key, "anzahl")}
                        limits={EREIGNIS_LIMITS.anzahl} breite={110}
                        onChange={(v) => setzeFeld(t.key, "anzahl", v)} />
                    )}
                    {t.parameter.includes("abQuote") && (
                      <Zahl label="ab Sieger-Quote" wert={wert(t.key, "abQuote")}
                        limits={EREIGNIS_LIMITS.abQuote} breite={110}
                        onChange={(v) => setzeFeld(t.key, "abQuote", v)} />
                    )}
                    {/* 🔴 Die WEN-Achse (`auswahl.js`). Derselbe Eintrag ist
                        Trost-Joker ODER Spieltags-Krone — der Unterschied ist
                        eine Einstellung, kein zweiter Ereignis-Typ. */}
                    {/* 🔴 Der ZEITRAUM gehört direkt über die Auswahl: er sagt,
                        WORÜBER die Platzierung gerechnet wird, und ohne ihn
                        liest man „der Beste" automatisch als „der Beste dieses
                        Spieltags". Über drei Spieltage ist das ein anderer
                        Anreiz — Konstanz statt Glückstag. */}
                    {t.parameter.includes("zeitraum") && (
                      <div style={{ width: "100%" }}>
                        <Zahl label="Wertung über … Spieltage" wert={wert(t.key, "zeitraum")}
                          limits={EREIGNIS_LIMITS.zeitraum} breite={160}
                          onChange={(v) => setzeFeld(t.key, "zeitraum", v)} />
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 4, lineHeight: 1.45 }}>
                          {(wert(t.key, "zeitraum") ?? 1) > 1
                            ? <>Gewertet wird die Summe über <strong style={{ color: C.text }}>
                                {wert(t.key, "zeitraum")} Spieltage</strong>, ausgezeichnet wird am
                                letzten davon. Belohnt Konstanz statt eines einzelnen guten Tages.
                                {" "}⚠️ Passt am besten zu einem Auslöser „jeder {wert(t.key, "zeitraum")}.
                                Spieltag“ — sonst fällt die Auszeichnung mitten in einen laufenden Block.</>
                            : <>Gewertet wird <strong style={{ color: C.text }}>jeder Spieltag
                                einzeln</strong>.</>}
                        </div>
                      </div>
                    )}
                    {/* 🔴 WONACH gewertet wird. Ohne diese Wahl heißt „der
                        Beste" immer „die meisten Punkte" — und damit ist ein
                        Sonderspiel wie die Jokerjagd („wer trifft in drei
                        Spieltagen am häufigsten exakt") nicht formulierbar.
                        ⚠️ Der Hinweis zur leeren Jagd gehört dazu: bei
                        Gleichstand an der Kante gewinnt niemand, und wenn
                        keiner trifft, sind alle gleich. Das ist gewollt, sieht
                        aber ohne Erklärung nach einer kaputten Regel aus. */}
                    {t.parameter.includes("metrik") && (
                      <div style={{ width: "100%" }}>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Wonach wird gewertet?</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {METRIKEN.map((m) => {
                            const aktiv = (wert(t.key, "metrik") ?? "punkte") === m.key;
                            return (
                              <button key={m.key} type="button" title={m.text}
                                onClick={() => setzeFeld(t.key, "metrik", m.key)}
                                style={{
                                  border: `1px solid ${aktiv ? C.akzent : C.line}`, borderRadius: RUND.pille,
                                  background: aktiv ? `${C.akzent}1a` : "transparent",
                                  color: aktiv ? C.akzent : C.text, cursor: "pointer",
                                  padding: "4px 10px", fontSize: 11, fontWeight: aktiv ? 700 : 500,
                                }}>{m.label}</button>
                            );
                          })}
                        </div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 5, lineHeight: 1.45 }}>
                          {METRIKEN.find((m) => m.key === (wert(t.key, "metrik") ?? "punkte"))?.text}
                          {(wert(t.key, "metrik") ?? "punkte") !== "punkte" && (
                            <> ⚠️ Sind alle gleichauf, gewinnt niemand — bei „exakte Treffer“ heißt
                              das: trifft in dem Zeitraum keiner, gibt es nichts. Das ist gewollt.</>
                          )}
                        </div>
                      </div>
                    )}
                    {t.parameter.includes("auswahl") && (
                      <Auswahlfeld wert={wert(t.key, "auswahl")}
                        onChange={(v) => setzeFeld(t.key, "auswahl", v)} />
                    )}
                    <Wirkungsfeld wert={wert(t.key, "wirkung")}
                      onChange={(v) => setzeFeld(t.key, "wirkung", v)} />
                    <Ausloeserfeld wert={wert(t.key, "ausloeser")}
                      onChange={(v) => setzeFeld(t.key, "ausloeser", v)} />
                    {/* 🔴 Die WIE-LANGE-Achse (`geltung.js`). Sie bekommt die
                        WIRKUNG mit, weil dieselbe Geltung über einem Aufschlag
                        etwas anderes bedeutet als über einer Gutschrift — und
                        weil die gefährlichste Kombination der ganzen Achse
                        (Aufschlag ohne Ende) nur aus beiden zusammen sichtbar
                        ist. */}
                    <Geltungsfeld wert={wert(t.key, "geltung")}
                      wirkung={wert(t.key, "wirkung")}
                      onChange={(v) => setzeFeld(t.key, "geltung", v)} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* Vorbereitet, aber ehrlich als „geht noch nicht" ausgewiesen — statt
          etwas anbieten zu können, das nie auslöst. */}
      <div style={{
        border: `1px dashed ${C.line}`, borderRadius: RUND.karte, padding: "10px 12px", marginBottom: 8,
      }}>
        <div style={{
          fontFamily: MONO, fontSize: 11, letterSpacing: 1.2, color: C.muted,
          textTransform: "uppercase", marginBottom: 5,
        }}>{KATEGORIE.herausforderung} · kommt später</div>
        {EREIGNIS_TYPEN.filter((t) => t.kategorie === "herausforderung").map((t) => (
          <div key={t.key} style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, marginTop: 3 }}>
            <strong style={{ color: C.text }}>{t.label}</strong> — {t.hint}
          </div>
        ))}
        <div style={{ fontSize: 11, color: C.muted, marginTop: 7, lineHeight: 1.45, opacity: 0.85 }}>
          Fußball-Tic-Tac-Toe („welcher Spieler spielte für beide Vereine?“) geht mit
          unseren Daten noch nicht — unsere Kader sind erzeugt, nicht echt.
        </div>
      </div>

      <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.45 }}>
        {beschreibeEreignisse(cfg)}
      </div>
    </div>
  );
}
