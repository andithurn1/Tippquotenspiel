"use client";

import { useMemo } from "react";
import { C, MONO, SERIES, readableInk, RUND } from "@/lib/theme";
import {
  BELOHNUNGS_TYPEN, DREHRAD_LIMITS,
  sanitizeDrehrad, pruefeFelder, wahrscheinlichkeiten, drehradPlan, beschreibeDrehrad,
} from "@/lib/drehrad";
import { PHASEN } from "@/lib/duellJoker";
import Gluecksrad from "@/components/Gluecksrad";
import { JOKER_ARTEN } from "@/lib/jokerBudget";
import { WER } from "@/lib/jokerBasis";
import { Zahl } from "@/components/Eingaben";
import { TAPZIEL } from "@/lib/tapziel";

const SPIELTAGE = 34;
// Beispiel-Spieler nur für die Vorschau — dieselbe Bauart wie in
// JokerVerteilung.jsx, der echte Plan entsteht später aus den Mitgliedern.
const BEISPIEL_SPIELER = ["du", "spieler-2", "spieler-3"];

// Nur zwei Modi ergeben für ein Drehrad Sinn (design/drehrad.md 2.3, Kopf-
// kommentar in drehrad.js) — `drehrad.js` exportiert dafür keinen eigenen
// Katalog (anders als `jokerPlan.js`s `VERTEIL_MODI`), deshalb hier lokal.
const MODUS_OPTIONEN = [
  { key: "gleich", label: "Gleich für alle", desc: "Nur an bestimmten Spieltagen wird gedreht — für alle am selben." },
  { key: "kontingent", label: "Gleich oft, verteilt", desc: "Jeder dreht über die Saison gleich oft, aber an eigenen Spieltagen." },
];

let feldZaehler = 0;
function neueFeldId() {
  feldZaehler += 1;
  return `feld-${Date.now().toString(36)}-${feldZaehler}`;
}

// Vorgabe je Belohnungs-Typ beim Umschalten — deckt sich mit den Fallbacks in
// `sanitizeBelohnung` (drehrad.js), damit ein frisch gewählter Typ sofort
// sinnvolle Werte zeigt statt leerer Felder (Muster STANDARD_QUELLE in
// JokerOekonomie.jsx).
const STANDARD_BELOHNUNG = {
  nichts: { typ: "nichts" },
  joker: { typ: "joker", art: JOKER_ARTEN[0].key, anzahl: 1 },
  budget: { typ: "budget", betrag: 10 },
  modifikator: { typ: "modifikator", faktor: 1.2, spieltage: 1 },
  punkte: { typ: "punkte", betrag: 5 },
};

// Stabile Farbe je Feld-Id (nicht je Listenindex) — sonst tauschen alle
// Farben rundenweise durch, sobald mittendrin ein Feld entfernt wird.
function hashId(id) {
  let h = 0;
  const s = String(id ?? "");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function farbeFuer(id) {
  return SERIES[hashId(id) % SERIES.length];
}

// ============================================================
//  DREHRAD — der Feld-Editor (design/drehrad.md)
//
//  Der Admin schreibt die Tabelle SELBST: Beschriftung, Gewicht (= Feldgröße),
//  Belohnung, Sperrfrist. Keine Balance-Vorgabe, keine Empfehlung — nur, dass
//  die Einstellungen sichtbar greifen.
//
//  ── ⚠️ Warum die Felder-Liste NICHT über `sanitizeDrehrad` läuft ──
//  `pruefeFelder` (und damit `sanitizeDrehrad`) wirft ein Feld OHNE Label
//  sofort aus der Liste. Ein Admin, der ein Label zum Neuschreiben leert,
//  verlöre mitten im Tippen genau dieses Eingabefeld, würde die Zeilen-Liste
//  bei jedem Tastendruck aus dem sanitierten Ergebnis neu aufgebaut — die
//  Zeile verschwindet unter dem Cursor, das Eingabefeld verliert den Fokus
//  (CLAUDE.md: „Hooks vor jedem frühen return" ist die eine Hook-Falle,
//  „Liste bei jeder Änderung neu aufbauen" die andere, hier einschlägige).
//  Deshalb: `onChange` gibt IMMER den rohen, vom Admin geschriebenen Zustand
//  weiter (`{ ...raw, felder: naechsteFelder }`, ungefiltert). `pruefeFelder`
//  und `wahrscheinlichkeiten` laufen nur für die ANZEIGE über dieselben rohen
//  Felder — nie, um daraus die gespeicherte Liste zu bauen. Jede Zeile ist an
//  ihrer `id` gekeyt und behält sie über ihre ganze Lebensdauer, damit React
//  das Eingabefeld nie neu montiert.
//
//  ── Der Kern: Anteil je Feld, live ──
//  `wahrscheinlichkeiten(felder)` liefert den Anteil aus dem Gewicht — das
//  Gewicht IST die Feldgröße. Der Proportionalbalken ist die Draufsicht aufs
//  Rad; bewusst KEIN rundes Rad (auf dem Telefon liest sich ein Balken besser,
//  das Runde gehört in den Spieler-Screen).
// ============================================================
export default function Drehrad({ rules, onChange }) {
  const raw = rules?.drehrad && typeof rules.drehrad === "object" ? rules.drehrad : {};
  const felder = Array.isArray(raw.felder) ? raw.felder : [];
  // Nur für ANZEIGE-Zwecke (Slider-Vorgaben, Plan-Vorschau, Text) — nie als
  // Quelle für das, was gespeichert wird (siehe Kopfkommentar).
  const cfg = useMemo(() => sanitizeDrehrad(raw), [raw]);

  const pruefung = useMemo(() => pruefeFelder(felder, cfg.sperrfrist), [felder, cfg.sperrfrist]);
  const anteile = useMemo(() => wahrscheinlichkeiten(felder), [felder]);
  const plan = useMemo(
    () => drehradPlan({ spieltage: SPIELTAGE, drehrad: cfg, seed: "vorschau", userIds: BEISPIEL_SPIELER }),
    [cfg.frequenz, cfg.modus, cfg.phase, cfg.schlussLaenge, cfg.abSpieltag, cfg.bisSpieltag],
  );

  // `maxPunkteProSaison` ist nur eine Frage, wenn es überhaupt ein
  // Punkte-Feld gibt — sonst eine Einstellung zu etwas, das es nicht gibt.
  const hatPunkteFeld = felder.some((f) => f?.belohnung?.typ === "punkte");

  const werWertLimits = cfg.wer === "abPlatz" ? DREHRAD_LIMITS.abPlatz
    : cfg.wer === "abRueckstand" ? DREHRAD_LIMITS.abRueckstand
    : null;

  const setze = (patch) => onChange({ ...raw, ...patch });
  const patchFeld = (id, patch) => setze({
    felder: felder.map((f) => (f.id === id ? { ...f, ...patch } : f)),
  });
  const patchBelohnung = (id, patch) => setze({
    felder: felder.map((f) => (f.id === id ? { ...f, belohnung: { ...f.belohnung, ...patch } } : f)),
  });
  const setzeBelohnungsTyp = (id, typ) => setze({
    felder: felder.map((f) => (f.id === id ? { ...f, belohnung: { ...STANDARD_BELOHNUNG[typ] } } : f)),
  });
  const hinzufuegen = () => setze({
    felder: [...felder, { id: neueFeldId(), label: "", gewicht: 1, belohnung: { typ: "nichts" } }],
  });
  const entfernen = (id) => setze({ felder: felder.filter((f) => f.id !== id) });

  return (
    <div>
      <p style={{ fontSize: 12, color: C.muted, margin: "0 0 10px", lineHeight: 1.5 }}>
        Ein Rad aus Feldern, die <strong>du</strong> schreibst: Beschriftung, Größe, Belohnung.
        Keine Empfehlung, keine Vorgabe — was ein Feld auszahlt und wie groß es ist, entscheidest du.
      </p>

      {/* ── Der Aus-Schalter ──
          Nachgetragen: `enabled` kam später in `drehrad.js` dazu, die
          Komponente entstand vorher. Ohne diesen Schalter stand das Rad auf
          der Vorgabe „aus" und liess sich über die Oberfläche NICHT
          einschalten — die ganze Ebene war unerreichbar.
          Der Editor bleibt bewusst sichtbar, wenn das Rad aus ist: man soll
          ein Rad in Ruhe vorbereiten und erst dann scharf schalten koennen. */}
      <button
        onClick={() => setze({ enabled: !cfg.enabled })}
        style={{
          display: "flex", alignItems: "center", gap: 10, width: "100%",
          textAlign: "left", cursor: "pointer", fontFamily: "inherit",
          background: cfg.enabled ? `${C.akzent}18` : C.surface,
          border: `1px solid ${cfg.enabled ? C.akzent + "66" : C.line}`,
          borderRadius: RUND.karte, padding: "10px 12px", marginBottom: 12, color: C.text,
        }}
      >
        <span style={{
          width: 34, height: 20, borderRadius: RUND.pille, flexShrink: 0, position: "relative",
          background: cfg.enabled ? C.akzent : C.surface2,
          border: `1px solid ${cfg.enabled ? "transparent" : C.line}`,
        }}>
          <span style={{
            position: "absolute", top: 2, left: cfg.enabled ? 16 : 2,
            width: 14, height: 14, borderRadius: RUND.pille, background: C.ink2, transition: "left .15s",
          }} />
        </span>
        <span>
          <span style={{ fontSize: 13, fontWeight: 700, color: cfg.enabled ? C.akzent : C.text }}>
            {cfg.enabled ? "Drehrad ist an" : "Drehrad ist aus"}
          </span>
          <span style={{ display: "block", fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>
            {cfg.enabled
              ? "In dieser Runde wird gedreht."
              : "Du kannst das Rad trotzdem schon bauen — gedreht wird erst, wenn du es einschaltest."}
          </span>
        </span>
      </button>

      {/* ── Das Rad selbst (design/drehrad.md 3c) ──
          Prozedural aus der Feldliste, kein vorgerenderter Clip: Anzahl,
          Beschriftung und Gewicht schreibt der Admin, die Kombinationsmenge
          ist also nicht endlich — und ein Clip würde den Text einbacken.
          Hier im Editor ohne Ergebnis, es ist die LIVE-VORSCHAU: wer ein
          Gewicht ändert, sieht das Segment sofort wandern. Beide Ansichten
          lesen dieselbe Zahl aus `wahrscheinlichkeiten` — der Balken bleibt
          daneben, weil er kleine Anteile zeigt, die im Rad nur ein Strich
          wären. */}
      <div style={{ margin: "6px 0 2px" }}>
        <Gluecksrad felder={felder} anteile={anteile} />
      </div>

      {/* ── Der Proportionalbalken: die Draufsicht aufs Rad ── */}
      <Balken felder={felder} anteile={anteile} />

      {/* ── Warnungen aus pruefeFelder — nichts verschwindet stillschweigend ── */}
      {!pruefung.gueltig && (
        <Banner ton="coral">{pruefung.grund}</Banner>
      )}
      {pruefung.warnung && (
        <Banner ton="bernstein">{pruefung.warnung}</Banner>
      )}
      {pruefung.verworfen.length > 0 && (
        <Banner ton="bernstein">
          <strong>{pruefung.verworfen.length} Zeile(n) zählen nicht mit:</strong>
          <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
            {pruefung.verworfen.map((v) => <li key={v.index}>{v.grund}</li>)}
          </ul>
        </Banner>
      )}

      {/* ── Felder-Liste ── */}
      <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4, marginBottom: 8 }}>
        Felder ({felder.length})
      </div>
      {felder.length === 0 && (
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>
          Noch keine Felder — leg das erste an.
        </div>
      )}
      <div>
        {felder.map((f) => {
          const anteil = anteile.find((a) => a.id === f.id)?.anteil ?? 0;
          const verworfenEintrag = pruefung.verworfen.find((v) => v.id === f.id && v.id != null);
          return (
            <FeldZeile key={f.id} feld={f} farbe={farbeFuer(f.id)} anteil={anteil}
              sperrfristVorgabe={cfg.sperrfrist}
              verworfenGrund={verworfenEintrag?.grund}
              onPatch={(p) => patchFeld(f.id, p)}
              onBelohnungPatch={(p) => patchBelohnung(f.id, p)}
              onBelohnungsTyp={(typ) => setzeBelohnungsTyp(f.id, typ)}
              onEntfernen={() => entfernen(f.id)} />
          );
        })}
      </div>
      <button onClick={hinzufuegen} style={{
        cursor: "pointer", background: "transparent", color: C.muted,
        ...TAPZIEL, border: `1px dashed ${C.line}`, borderRadius: RUND.karte, padding: "10px 12px",
        fontFamily: "inherit", fontSize: 13, textAlign: "left", width: "100%", boxSizing: "border-box",
      }}>+ Feld hinzufügen</button>

      {/* ── Sperrfrist-Vorgabe fürs ganze Rad (2.2b) ── */}
      <div style={{ marginTop: 14 }}>
        <Zahl label="Sperrfrist-Vorgabe für alle Felder (Drehungen dieses Spielers, 0 = keine Sperre)"
          wert={cfg.sperrfrist} limits={DREHRAD_LIMITS.sperrfrist}
          onChange={(v) => setze({ sperrfrist: v })} />
        <p style={{ fontSize: 11, color: C.muted, marginTop: 4, lineHeight: 1.4 }}>
          Am einzelnen Feld gesetzt schlägt diese Vorgabe. Sind rechnerisch irgendwann alle
          Felder gleichzeitig gesperrt, wird die Sperre für diese eine Drehung ausnahmsweise
          ignoriert — eine Drehung ohne Ergebnis wäre der schlechtere Fehler.
        </p>
      </div>

      {/* ── Wann wird gedreht ── */}
      <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 14, paddingTop: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Wann wird gedreht?</div>
        <p style={{ fontSize: 11, color: C.muted, margin: "4px 0 9px", lineHeight: 1.45 }}>
          {beschreibeDrehrad(raw, SPIELTAGE)}
        </p>

        <div style={{ marginTop: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
            <span style={{ fontSize: 13 }}>Etwa jeder {cfg.frequenz}. Spieltag</span>
          </div>
          <input type="range" value={cfg.frequenz}
            min={DREHRAD_LIMITS.frequenz.min} max={DREHRAD_LIMITS.frequenz.max} step={DREHRAD_LIMITS.frequenz.step}
            onChange={(e) => setze({ frequenz: +e.target.value })}
            style={{ width: "100%", accentColor: C.akzent, cursor: "pointer" }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
          {MODUS_OPTIONEN.map((m) => {
            const an = cfg.modus === m.key;
            return (
              <button key={m.key} onClick={() => setze({ modus: m.key })} style={{
                textAlign: "left", cursor: "pointer", fontFamily: "inherit", color: C.text,
                background: an ? `${C.akzent}18` : C.surface,
                border: `1px solid ${an ? C.akzent + "66" : C.line}`,
                borderRadius: RUND.karte, padding: "9px 12px",
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: an ? C.akzent : C.text }}>{m.label}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>{m.desc}</div>
              </button>
            );
          })}
        </div>

        <Leiste titel={cfg.modus === "gleich" ? "Dreh-Spieltage der Runde" : "So sähe ein Spieler aus"}
          tage={plan.proSpieler[BEISPIEL_SPIELER[0]]} von={plan.von} bis={plan.bis} />
        {cfg.modus === "kontingent" && (
          <Leiste titel="…und ein anderer" tage={plan.proSpieler[BEISPIEL_SPIELER[1]]}
            von={plan.von} bis={plan.bis} gedimmt />
        )}

        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Saison-Fenster</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {PHASEN.map((p) => {
              const an = cfg.phase === p.key;
              return (
                <button key={p.key} onClick={() => setze({ phase: p.key })} style={{
                  textAlign: "left", cursor: "pointer", fontFamily: "inherit", color: C.text,
                  background: an ? `${C.indigo}18` : C.surface,
                  border: `1px solid ${an ? C.indigo + "66" : C.line}`,
                  borderRadius: RUND.karte, padding: "9px 12px",
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: an ? C.indigo : C.text }}>{p.label}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>{p.desc}</div>
                </button>
              );
            })}
          </div>
          {cfg.phase === "schlussspurt" && (
            <div style={{ marginTop: 8, maxWidth: 200 }}>
              <Zahl label="Länge (Spieltage)" wert={cfg.schlussLaenge} limits={DREHRAD_LIMITS.schlussLaenge}
                onChange={(v) => setze({ schlussLaenge: v })} />
            </div>
          )}
          {cfg.phase === "manuell" && (
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <Zahl label="Von Spieltag" wert={cfg.abSpieltag ?? ""} limits={DREHRAD_LIMITS.abSpieltag} leerErlaubt leerText="Vorgabe"
                onChange={(v) => setze({ abSpieltag: v })} />
              <Zahl label="Bis Spieltag" wert={cfg.bisSpieltag ?? ""} limits={DREHRAD_LIMITS.bisSpieltag} leerErlaubt leerText="Vorgabe"
                onChange={(v) => setze({ bisSpieltag: v })} />
            </div>
          )}
        </div>
      </div>

      {/* ── Wer darf drehen ── */}
      <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 14, paddingTop: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Wer darf drehen?</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {WER.map((w) => {
            const an = cfg.wer === w.key;
            return (
              <button key={w.key} onClick={() => setze({ wer: w.key })} style={{
                textAlign: "left", cursor: "pointer", fontFamily: "inherit", color: C.text,
                background: an ? `${C.akzent}18` : C.surface,
                border: `1px solid ${an ? C.akzent + "66" : C.line}`,
                borderRadius: RUND.karte, padding: "9px 12px",
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: an ? C.akzent : C.text }}>{w.label}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>{w.desc}</div>
              </button>
            );
          })}
        </div>
        {werWertLimits && (
          <div style={{ marginTop: 8, maxWidth: 220 }}>
            <Zahl label={cfg.wer === "abPlatz" ? "Ab Tabellenplatz (abwärts)" : "Ab Rückstand (Punkte)"}
              wert={cfg.werWert ?? werWertLimits.min} limits={werWertLimits}
              onChange={(v) => setze({ werWert: v })} />
          </div>
        )}
      </div>

      {/* ── Punkte-Deckel — nur eine Frage, wenn es ein Punkte-Feld gibt ── */}
      {hatPunkteFeld && (
        <div style={{
          marginTop: 14, background: `${C.akzent}0e`, border: `1px solid ${C.akzent}44`, borderRadius: RUND.karte,
          padding: "10px 12px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Punkte-Deckel je Saison</span>
            <span style={{ fontFamily: MONO, fontSize: 13, color: C.akzent }}>
              {cfg.maxPunkteProSaison === 0 ? "kein Deckel" : `${cfg.maxPunkteProSaison} Punkte`}
            </span>
          </div>
          <input type="range" value={cfg.maxPunkteProSaison}
            min={DREHRAD_LIMITS.maxPunkteProSaison.min} max={DREHRAD_LIMITS.maxPunkteProSaison.max}
            step={DREHRAD_LIMITS.maxPunkteProSaison.step}
            onChange={(e) => setze({ maxPunkteProSaison: +e.target.value })}
            style={{ width: "100%", accentColor: C.akzent, cursor: "pointer", marginTop: 8 }} />
          <p style={{ fontSize: 11, color: C.muted, margin: "6px 0 0", lineHeight: 1.45 }}>
            Gilt nur für Felder vom Typ „Punkte". Ganz nach links (0) heißt <strong>kein Deckel</strong>,
            nicht „keine Punkte". Ohne Grenze hebelt ein Rad sonst die ganze Wertung aus.
          </p>
        </div>
      )}

      <p style={{ fontSize: 11, color: C.muted, marginTop: 14, lineHeight: 1.45 }}>
        {beschreibeDrehrad(raw, SPIELTAGE)}
      </p>
    </div>
  );
}

// ── Der Proportionalbalken ──────────────────────────────────
// Waagerecht statt rund: auf dem Telefon lesbarer, und das runde Rad gehört
// in den Spieler-Screen, nicht in den Editor (design/drehrad.md).
function Balken({ felder, anteile }) {
  const gesamt = felder.reduce((s, f) => s + (Number(f.gewicht) || 0), 0);
  return (
    <div style={{
      display: "flex", width: "100%", height: 36, borderRadius: RUND.karte,
      overflow: "hidden", border: `1px solid ${C.line}`, background: C.ink2, marginBottom: 12,
    }}>
      {gesamt <= 0 ? (
        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, color: C.muted,
        }}>Noch keine Feldgröße über 0</div>
      ) : (
        felder.filter((f) => (Number(f.gewicht) || 0) > 0).map((f) => {
          const anteil = anteile.find((a) => a.id === f.id)?.anteil ?? 0;
          const prozent = anteil * 100;
          const farbe = farbeFuer(f.id);
          return (
            <div key={f.id} title={`${f.label || "(ohne Beschriftung)"}: ${prozent.toFixed(1)} %`}
              style={{
                width: `${prozent}%`, background: farbe,
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden", borderRight: `1px solid ${C.ink}`,
              }}>
              {prozent >= 9 && (
                <span style={{
                  fontSize: 11, fontWeight: 700, color: readableInk(farbe), padding: "0 4px",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {f.label || "…"} {prozent.toFixed(0)}%
                </span>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// 34 Kästchen — dieselbe Bauart wie `Leiste` in JokerVerteilung.jsx, hier
// lokal (nicht exportiert), dazu leicht gedimmt außerhalb des Saison-Fensters.
function Leiste({ titel, tage = [], von, bis, gedimmt = false }) {
  const set = new Set(tage);
  return (
    <div style={{ marginTop: 11 }}>
      <div style={{
        fontFamily: MONO, fontSize: 11, letterSpacing: 1.2, color: C.muted,
        textTransform: "uppercase", marginBottom: 5,
      }}>{titel}</div>
      <div style={{ display: "flex", gap: 2 }}>
        {Array.from({ length: SPIELTAGE }, (_, i) => i + 1).map((md) => {
          const an = set.has(md);
          const imFenster = von == null || bis == null || (md >= von && md <= bis);
          return (
            <div key={md} title={`Spieltag ${md}`} style={{
              flex: 1, height: 18, borderRadius: RUND.klein,
              background: an ? (gedimmt ? `${C.akzent}77` : C.akzent) : C.surface2,
              border: `1px solid ${an ? "transparent" : C.line}`,
              opacity: imFenster ? 1 : 0.35,
            }} />
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
        {[1, 9, 17, 25, 34].map((md) => (
          <span key={md} style={{ fontFamily: MONO, fontSize: 11, color: C.muted }}>{md}</span>
        ))}
      </div>
    </div>
  );
}

// ── Eine Feld-Zeile ─────────────────────────────────────────
function FeldZeile({
  feld, farbe, anteil, sperrfristVorgabe, verworfenGrund,
  onPatch, onBelohnungPatch, onBelohnungsTyp, onEntfernen,
}) {
  const belohnung = feld.belohnung && typeof feld.belohnung === "object" ? feld.belohnung : { typ: "nichts" };
  const gewichtNull = Number(feld.gewicht) === 0;
  const eigeneSperrfrist = typeof feld.sperrfrist === "number" && Number.isFinite(feld.sperrfrist);

  return (
    <div style={{
      background: C.surface, border: `1px solid ${verworfenGrund ? C.coral + "66" : C.line}`,
      borderRadius: RUND.karte, padding: "10px 12px", marginBottom: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span title={`${(anteil * 100).toFixed(1)} %`} style={{
          width: 12, height: 12, borderRadius: RUND.klein, background: farbe, flexShrink: 0,
        }} />
        <input value={feld.label} placeholder="Beschriftung"
          onChange={(e) => onPatch({ label: e.target.value })}
          style={{
            flex: 1, minWidth: 0, boxSizing: "border-box", background: C.ink2, color: C.text,
            border: `1px solid ${C.line}`, borderRadius: RUND.karte, padding: "7px 9px",
            fontSize: 13, fontFamily: "inherit", outline: "none",
          }} />
        <span style={{ fontFamily: MONO, fontSize: 13, color: C.akzent, width: 50, textAlign: "right", flexShrink: 0 }}>
          {(anteil * 100).toFixed(1)}%
        </span>
        <button onClick={onEntfernen} aria-label="Feld entfernen" style={{
          cursor: "pointer", background: "transparent", border: "none",
          color: C.muted, fontSize: 20, lineHeight: 1, padding: "0 2px", flexShrink: 0,
        }}>×</button>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
        <Zahl label="Gewicht (Feldgröße)" wert={feld.gewicht} limits={DREHRAD_LIMITS.gewicht}
          onChange={(v) => onPatch({ gewicht: v })} />
        <div style={{ flex: "1 1 150px" }}>
          <Zahl label={`Sperrfrist (Vorgabe ${sperrfristVorgabe})`} wert={feld.sperrfrist ?? ""}
            limits={DREHRAD_LIMITS.sperrfrist} leerErlaubt leerText="Vorgabe"
            onChange={(v) => onPatch({ sperrfrist: v })} />
          <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
            {eigeneSperrfrist ? "eigener Wert" : `folgt der Vorgabe (${sperrfristVorgabe})`}
          </div>
        </div>
      </div>

      {gewichtNull && (
        <div style={{ fontSize: 11, color: C.akzent, marginTop: 6, lineHeight: 1.4 }}>
          Gewicht 0 — liegt auf dem Rad, kann aber nicht fallen.
        </div>
      )}
      {verworfenGrund && (
        <div style={{ fontSize: 11, color: C.coral, marginTop: 6, lineHeight: 1.4 }}>
          Zählt gerade nicht mit: {verworfenGrund}
        </div>
      )}

      {/* Belohnungs-Typ */}
      <div style={{ marginTop: 9, display: "flex", flexWrap: "wrap", gap: 5 }}>
        {BELOHNUNGS_TYPEN.map((t) => {
          const an = belohnung.typ === t.key;
          return (
            <button key={t.key} title={t.desc} onClick={() => onBelohnungsTyp(t.key)} style={{
              ...TAPZIEL, cursor: "pointer", fontFamily: "inherit", fontSize: 12, padding: "5px 10px", borderRadius: RUND.pille,
              background: an ? `${C.indigo}22` : C.surface2, color: an ? C.indigo : C.muted,
              border: `1px solid ${an ? C.indigo + "66" : C.line}`,
            }}>{t.label}</button>
          );
        })}
      </div>

      {/* Zusatzfelder je Belohnungs-Typ */}
      {belohnung.typ === "joker" && (
        <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
          <label style={{ fontSize: 11, color: C.muted, flex: "1 1 150px" }}>
            Joker-Art
            <select value={belohnung.art ?? JOKER_ARTEN[0].key}
              onChange={(e) => onBelohnungPatch({ art: e.target.value })}
              style={{
                display: "block", width: "100%", boxSizing: "border-box", marginTop: 3,
                background: C.ink2, color: C.text, border: `1px solid ${C.line}`,
                borderRadius: RUND.karte, padding: "7px 9px", fontSize: 13, fontFamily: "inherit",
              }}>
              {JOKER_ARTEN.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
            </select>
          </label>
          <Zahl label="Anzahl" wert={belohnung.anzahl} limits={DREHRAD_LIMITS.jokerAnzahl}
            onChange={(v) => onBelohnungPatch({ anzahl: v })} />
        </div>
      )}
      {belohnung.typ === "budget" && (
        <div style={{ marginTop: 8, maxWidth: 150 }}>
          <Zahl label="Narren" wert={belohnung.betrag} limits={DREHRAD_LIMITS.budgetBetrag}
            onChange={(v) => onBelohnungPatch({ betrag: v })} />
        </div>
      )}
      {belohnung.typ === "modifikator" && (
        <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
          <Zahl label="Faktor" wert={belohnung.faktor} limits={DREHRAD_LIMITS.modFaktor}
            onChange={(v) => onBelohnungPatch({ faktor: v })} />
          <Zahl label="Spieltage" wert={belohnung.spieltage} limits={DREHRAD_LIMITS.modSpieltage}
            onChange={(v) => onBelohnungPatch({ spieltage: v })} />
        </div>
      )}
      {belohnung.typ === "punkte" && (
        <div style={{ marginTop: 8, maxWidth: 150 }}>
          <Zahl label="Punkte" wert={belohnung.betrag} limits={DREHRAD_LIMITS.punkteBetrag}
            onChange={(v) => onBelohnungPatch({ betrag: v })} />
        </div>
      )}
    </div>
  );
}

// ── Kleinteile ───────────────────────────────────────────────

function Banner({ ton, children }) {
  const farbe = ton === "coral" ? C.coral : C.bernstein;
  return (
    <div style={{
      background: `${farbe}12`, border: `1px solid ${farbe}55`, borderRadius: RUND.karte,
      padding: "9px 11px", marginBottom: 10, fontSize: 12, color: C.text, lineHeight: 1.5,
    }}>
      {children}
    </div>
  );
}
