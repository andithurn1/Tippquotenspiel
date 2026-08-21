"use client";

import { useMemo } from "react";
import { C } from "@/lib/theme";
import {
  WER, SICHT, VERFALL, WIDERRUF, SYMMETRIE, UMFANG,
  BASIS_LIMITS, DEFAULT_BASIS,
  sanitizeBasis, basisFuer, konflikte, beschreibeBasis,
} from "@/lib/jokerBasis";
import { JOKER_ARTEN } from "@/lib/jokerBudget";
import { WETTBEWERBE, PHASEN } from "@/lib/wettbewerbe";
import { Zahl as ZahlInput } from "@/components/Eingaben";
import { TAPZIEL } from "@/lib/tapziel";

// ============================================================
//  JOKER-GRUNDFORM — der Editor für die EINE Karte, die jeder Joker teilt
//  (design/joker-grundform.md, Abschnitt 1, 2 und 5)
//
//  ── Der Aufbau, auf den es ankommt ──
//  1. Der STANDARD steht oben, prominent, mit allen elf Dimensionen aus
//     DEFAULT_BASIS — für die meisten Runden das Einzige, was sie anfassen.
//  2. Abweichungen sind OPT-IN je Joker-Art: erst nur „folgt dem Standard"
//     + ein Knopf „abweichen", dann klappen die Felder auf.
//  3. Jede abweichende Art zeigt, WAS abweicht (`kurzAbweichung`) statt einer
//     stummen aufgeklappten Liste — plus ein Knopf, der die Abweichung GANZ
//     entfernt. Bewusst kein Zurückdrehen einzelner Felder: eine Abweichung
//     ist ein Ganzes, das der Admin bewusst begonnen hat.
//
//  ── ⚠️ Fokus-Falle: aus dem ROHEN Zustand rendern ──
//  Dieselbe Bauart wie Drehrad.jsx/LimitKlassen.jsx: `onChange` gibt IMMER
//  den rohen, ungefilterten `rules.jokerBasis`-Zustand weiter. `sanitizeBasis`/
//  `basisFuer` laufen NUR für die ANZEIGE (Fallback-Werte, Kurzfassung,
//  Konflikt-Meldungen) — nie als Quelle für das, was gespeichert wird. Sonst
//  würde eine gerade erst geöffnete, noch leere Abweichung (`{}`) beim
//  nächsten Tastendruck sofort wieder verschwinden, weil
//  `sanitizeJokerBasisKarte` eine leere Abweichung verwirft.
//
//  `wert(feld)` liest darum IMMER zuerst den rohen Wert und fällt erst dann
//  auf den gemergten (`effektiv`) Wert zurück — dieselbe Funktion bedient
//  sowohl den `standard`-Block (roh = immer voll) als auch jede Art-
//  Abweichung (roh = sparse), ohne Sonderfall.
// ============================================================

const katalogLabel = (katalog, key) => katalog.find((x) => x.key === key)?.label ?? key;

// Kurzfassung dessen, was eine Art-Abweichung TATSÄCHLICH überschreibt —
// nur roh gesetzte Felder, keine geerbten. Für die kompakte Anzeige
// „Sicht: sofort · Abklingzeit: 3" statt einer stummen aufgeklappten Liste.
function kurzAbweichung(abweichung) {
  if (!abweichung || typeof abweichung !== "object") return [];
  const teile = [];
  if (abweichung.wer !== undefined) {
    teile.push(`Wer: ${katalogLabel(WER, abweichung.wer)}${abweichung.werWert !== undefined ? ` (${abweichung.werWert})` : ""}`);
  } else if (abweichung.werWert !== undefined) {
    teile.push(`Wert: ${abweichung.werWert}`);
  }
  if (abweichung.sicht !== undefined) teile.push(`Sicht: ${katalogLabel(SICHT, abweichung.sicht)}`);
  if (abweichung.verfall !== undefined) teile.push(`Verfall: ${katalogLabel(VERFALL, abweichung.verfall)}`);
  if (abweichung.widerruf !== undefined) {
    const stunden = abweichung.widerruf === "bisStunden" && abweichung.widerrufStunden !== undefined
      ? ` (${abweichung.widerrufStunden} Std.)` : "";
    teile.push(`Widerruf: ${katalogLabel(WIDERRUF, abweichung.widerruf)}${stunden}`);
  } else if (abweichung.widerrufStunden !== undefined) {
    teile.push(`Widerruf-Stunden: ${abweichung.widerrufStunden}`);
  }
  if (abweichung.stapeln !== undefined) teile.push(`Stapeln: ${abweichung.stapeln}`);
  if (abweichung.symmetrie !== undefined) teile.push(`Symmetrie: ${katalogLabel(SYMMETRIE, abweichung.symmetrie)}`);
  if (abweichung.bestand !== undefined) teile.push(`Bestand: ${abweichung.bestand === 0 ? "unbegrenzt" : abweichung.bestand}`);
  if (abweichung.kasseSichtbar !== undefined) teile.push(`Kasse sichtbar: ${abweichung.kasseSichtbar ? "ja" : "nein"}`);
  if (abweichung.abklingzeit !== undefined) teile.push(`Abklingzeit: ${abweichung.abklingzeit}`);
  if (abweichung.umfang !== undefined) teile.push(`Umfang: ${katalogLabel(UMFANG, abweichung.umfang)}`);
  if (abweichung.spieleProEinsatz !== undefined) teile.push(`Spiele/Einsatz: ${abweichung.spieleProEinsatz}`);
  if (abweichung.wahl !== undefined) teile.push(`Wahl: ${abweichung.wahl === "bestes" ? "automatisch bestes" : "selbst"}`);
  const bed = abweichung.bedingung;
  if (bed && typeof bed === "object") {
    if (bed.minQuote !== undefined) teile.push(`Min-Quote: ${bed.minQuote}`);
    if (bed.maxQuote !== undefined) teile.push(`Max-Quote: ${bed.maxQuote}`);
    if (Array.isArray(bed.wettbewerbe) && bed.wettbewerbe.length) teile.push(`Wettbewerbe: ${bed.wettbewerbe.length}`);
    if (Array.isArray(bed.phasen) && bed.phasen.length) teile.push(`Phasen: ${bed.phasen.length}`);
  }
  return teile;
}

export default function JokerGrundform({ rules, onChange }) {
  const karte = rules?.jokerBasis && typeof rules.jokerBasis === "object"
    ? rules.jokerBasis : { standard: { ...DEFAULT_BASIS } };
  const standard = karte.standard && typeof karte.standard === "object" ? karte.standard : DEFAULT_BASIS;

  // Nur für ANZEIGE (Fallback-Werte, Ein-Satz-Beschreibung) — nie als Quelle
  // für das, was gespeichert wird (siehe Kopfkommentar).
  const effektivStandard = useMemo(() => sanitizeBasis(standard), [standard]);
  const konfliktListe = useMemo(() => konflikte(rules), [rules]);

  const setze = (naechsteKarte) => onChange(naechsteKarte);
  const patchStandard = (patch) => setze({ ...karte, standard: { ...standard, ...patch } });
  const patchStandardBedingung = (patch) => patchStandard({
    bedingung: { ...(standard.bedingung ?? DEFAULT_BASIS.bedingung), ...patch },
  });
  const patchArt = (artKey, patch) => setze({ ...karte, [artKey]: { ...(karte[artKey] ?? {}), ...patch } });
  const patchArtBedingung = (artKey, patch) => patchArt(artKey, {
    bedingung: { ...(karte[artKey]?.bedingung ?? {}), ...patch },
  });
  // Öffnet den Abweichungs-Block — auch ohne ein einziges eigenes Feld, sonst
  // ließe sich „abweichen" gar nicht erst anklicken.
  const beginneAbweichung = (artKey) => setze({
    ...karte, [artKey]: karte[artKey] && typeof karte[artKey] === "object" ? karte[artKey] : {},
  });
  // Entfernt die Abweichung GANZ, nicht Feld für Feld (design/joker-grundform.md).
  const entferneAbweichung = (artKey) => {
    const rest = { ...karte };
    delete rest[artKey];
    setze(rest);
  };

  const labelFuerBereich = (bereich) => bereich === "standard"
    ? "Standard" : (JOKER_ARTEN.find((a) => a.key === bereich)?.label ?? bereich);

  return (
    <div>
      <p style={{ fontSize: 12, color: C.muted, margin: "0 0 10px", lineHeight: 1.5 }}>
        Sechs bis dreizehn Fragen, die sich bei JEDEM Joker wiederholen — hier stellst du sie
        <strong> einmal</strong> als Standard und weichst nur dort ab, wo du willst.
      </p>

      <Banner ton="indigo">
        <strong>Kein Joker ohne Tipp:</strong> ein Joker wird immer zusammen mit dem Tipp gesetzt.
        Wer den Spieltag nicht tippt, kann dort nichts setzen — auch nicht auf dem Ersatz-Tipp bei
        Versäumnis. Das ist keine Einstellung hier, sondern gilt immer.
      </Banner>

      {konfliktListe.length > 0 && (
        <Banner ton="bernstein">
          <strong>{konfliktListe.length} Hinweis(e) — keine Sperren, nur doppelt abgesichert:</strong>
          <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
            {konfliktListe.map((k) => (
              <li key={k.key}>
                <span style={{ color: C.muted }}>[{labelFuerBereich(k.bereich)}]</span> {k.text}
              </li>
            ))}
          </ul>
        </Banner>
      )}

      {/* ── Der Standard: prominent, alle elf Dimensionen ── */}
      <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4, marginBottom: 4 }}>
        Standard — gilt für alle Joker-Arten
      </div>
      <p style={{ fontSize: 11, color: C.muted, marginBottom: 10, lineHeight: 1.4 }}>
        {beschreibeBasis(effektivStandard)}
      </p>
      <BasisFelder basisRoh={standard} effektiv={effektivStandard}
        onPatch={patchStandard} onPatchBedingung={patchStandardBedingung} />

      {/* ── Abweichungen: opt-in je Joker-Art ── */}
      <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 16, paddingTop: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Abweichungen je Joker-Art</div>
        <p style={{ fontSize: 11, color: C.muted, marginBottom: 10, lineHeight: 1.4 }}>
          Jede Art folgt dem Standard oben, bis du für sie ausdrücklich abweichst.
        </p>
        {JOKER_ARTEN.map((art) => (
          <ArtZeile key={art.key} art={art} rules={rules} abweichung={karte[art.key]}
            onBeginnen={() => beginneAbweichung(art.key)}
            onZuruecksetzen={() => entferneAbweichung(art.key)}
            onPatch={(p) => patchArt(art.key, p)}
            onPatchBedingung={(p) => patchArtBedingung(art.key, p)} />
        ))}
      </div>
    </div>
  );
}

// ── Eine Joker-Art: entweder kollabiert („folgt dem Standard") oder mit
// aufgeklappten Feldern, sobald eine Abweichung besteht. ──
function ArtZeile({ art, rules, abweichung, onBeginnen, onZuruecksetzen, onPatch, onPatchBedingung }) {
  const abweichend = abweichung && typeof abweichung === "object";
  // Nur für ANZEIGE: der gemergte Wert dieser Art, für Fallbacks in den
  // Feldern UND für die Kurzfassung „was abweicht" (siehe Kopfkommentar).
  const effektiv = useMemo(() => basisFuer(art.key, rules), [rules, art.key]);
  const kurz = abweichend ? kurzAbweichung(abweichung) : [];

  if (!abweichend) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
        background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12,
        padding: "9px 12px", marginBottom: 8,
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{art.label}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>folgt dem Standard</div>
        </div>
        <button onClick={onBeginnen} style={{
          cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, flexShrink: 0,
          background: C.surface2, color: C.akzent, border: `1px solid ${C.akzent}44`,
          ...TAPZIEL, borderRadius: 10, padding: "7px 12px", whiteSpace: "nowrap",
        }}>abweichen</button>
      </div>
    );
  }

  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.akzent}44`, borderRadius: 12,
      padding: "10px 12px", marginBottom: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.akzent }}>{art.label}</div>
        <button onClick={onZuruecksetzen} style={{
          cursor: "pointer", fontFamily: "inherit", fontSize: 12, flexShrink: 0,
          background: "transparent", color: C.muted, border: `1px solid ${C.line}`,
          borderRadius: 10, padding: "6px 10px", whiteSpace: "nowrap",
        }}>auf Standard zurücksetzen</button>
      </div>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 5, lineHeight: 1.5 }}>
        {kurz.length ? kurz.join(" · ") : "Noch keine eigene Einstellung — unten anpassen."}
      </div>
      <div style={{ marginTop: 9 }}>
        <BasisFelder basisRoh={abweichung} effektiv={effektiv} onPatch={onPatch} onPatchBedingung={onPatchBedingung} />
      </div>
    </div>
  );
}

// ── Die elf Dimensionen — geteilt zwischen Standard und jeder Art-Abweichung.
// `basisRoh` ist entweder der volle `standard` oder eine sparse Abweichung;
// `wert(feld)` liest immer zuerst roh, erst dann `effektiv` (Fokus-Falle,
// Kopfkommentar). Zusatzfelder nur, wenn der gewählte Wert sie braucht. ──
function BasisFelder({ basisRoh, effektiv, onPatch, onPatchBedingung }) {
  const roh = basisRoh && typeof basisRoh === "object" ? basisRoh : {};
  const wert = (feld) => (roh[feld] !== undefined ? roh[feld] : effektiv[feld]);
  const bed = roh.bedingung && typeof roh.bedingung === "object" ? roh.bedingung : {};
  const effBed = effektiv.bedingung ?? DEFAULT_BASIS.bedingung;
  const bedWert = (feld) => (bed[feld] !== undefined ? bed[feld] : effBed[feld]);

  const werAktuell = wert("wer");
  const werWertLimits = werAktuell === "abPlatz" ? BASIS_LIMITS.abPlatz
    : werAktuell === "abRueckstand" ? BASIS_LIMITS.abRueckstand : null;
  const widerrufAktuell = wert("widerruf");
  const umfangAktuell = wert("umfang");

  const patchWettbewerbe = (key) => {
    const aktuell = bedWert("wettbewerbe") ?? [];
    const naechste = aktuell.includes(key) ? aktuell.filter((x) => x !== key) : [...aktuell, key];
    onPatchBedingung({ wettbewerbe: naechste });
  };
  const patchPhasen = (key) => {
    const aktuell = bedWert("phasen") ?? [];
    const naechste = aktuell.includes(key) ? aktuell.filter((x) => x !== key) : [...aktuell, key];
    onPatchBedingung({ phasen: naechste });
  };

  return (
    <div>
      <Feldgruppe titel="Wer darf einsetzen">
        <Katalog katalog={WER} aktiv={werAktuell} onWahl={(k) => onPatch({ wer: k })} />
        {werWertLimits && (
          <ZahlInput label={werAktuell === "abPlatz" ? "Ab Tabellenplatz (abwärts)" : "Ab Rückstand (Punkte)"}
            wert={wert("werWert") ?? werWertLimits.min} limits={werWertLimits} breite={150}
            onChange={(v) => onPatch({ werWert: v })} />
        )}
      </Feldgruppe>

      <Feldgruppe titel="Sicht — wer den Einsatz wann sieht">
        <Katalog katalog={SICHT} aktiv={wert("sicht")} onWahl={(k) => onPatch({ sicht: k })} />
      </Feldgruppe>

      <Feldgruppe titel="Verfall — was mit einem ungenutzten Joker geschieht">
        <Katalog katalog={VERFALL} aktiv={wert("verfall")} onWahl={(k) => onPatch({ verfall: k })} />
      </Feldgruppe>

      <Feldgruppe titel="Widerruf — bis wann änderbar">
        <Katalog katalog={WIDERRUF} aktiv={widerrufAktuell} onWahl={(k) => onPatch({ widerruf: k })} />
        {widerrufAktuell === "bisStunden" && (
          <ZahlInput label="Stunden vor Anpfiff (nie darüber hinaus)"
            wert={wert("widerrufStunden") ?? DEFAULT_BASIS.widerrufStunden}
            limits={BASIS_LIMITS.widerrufStunden} breite={150} onChange={(v) => onPatch({ widerrufStunden: v })} />
        )}
      </Feldgruppe>

      <Feldgruppe titel="Stapeln — wie viele Joker höchstens auf dasselbe Spiel (über alle Arten hinweg)">
        <ZahlInput label="Höchstens" wert={wert("stapeln")} limits={BASIS_LIMITS.stapeln} breite={150}
          onChange={(v) => onPatch({ stapeln: v })} />
      </Feldgruppe>

      <Feldgruppe titel="Symmetrie — wirkt der Joker auch nach unten?">
        <Katalog katalog={SYMMETRIE} aktiv={wert("symmetrie")} onWahl={(k) => onPatch({ symmetrie: k })} />
      </Feldgruppe>

      <Feldgruppe titel="Bestand — wie viele man höchstens im Inventar HALTEN darf (0 = unbegrenzt)">
        <ZahlInput label="Höchstens im Bestand" wert={wert("bestand")} limits={BASIS_LIMITS.bestand} breite={150}
          onChange={(v) => onPatch({ bestand: v })} />
      </Feldgruppe>

      <Feldgruppe titel="Kasse sichtbar — sehen andere Narrenstand und Bestand?">
        <ToggleKnopf an={wert("kasseSichtbar")} onChange={(v) => onPatch({ kasseSichtbar: v })}
          textAn="Offen — jeder sieht Narren und Bestand" textAus="Verdeckt — jeder Einsatz bleibt eine Überraschung" />
      </Feldgruppe>

      <Feldgruppe titel="Abklingzeit — Sperre in Spieltagen nach einem Einsatz DIESER Art">
        <ZahlInput label="Spieltage gesperrt (0 = keine Sperre)" wert={wert("abklingzeit")} limits={BASIS_LIMITS.abklingzeit} breite={150}
          onChange={(v) => onPatch({ abklingzeit: v })} />
      </Feldgruppe>

      <Feldgruppe titel="Umfang — worauf ein Einsatz wirkt">
        <Katalog katalog={UMFANG} aktiv={umfangAktuell} onWahl={(k) => onPatch({ umfang: k })} />
        {umfangAktuell === "nSpiele" && (
          <ZahlInput label="Spiele pro Einsatz" wert={wert("spieleProEinsatz")} limits={BASIS_LIMITS.spieleProEinsatz} breite={150}
            onChange={(v) => onPatch({ spieleProEinsatz: v })} />
        )}
        {umfangAktuell !== "spieltag" && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 5 }}>Welche Spiele</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              <ChipButton aktiv={wert("wahl") === "selbst"} onClick={() => onPatch({ wahl: "selbst" })}>Selbst wählen</ChipButton>
              <ChipButton aktiv={wert("wahl") === "bestes"} onClick={() => onPatch({ wahl: "bestes" })}>Automatisch das beste</ChipButton>
            </div>
          </div>
        )}
      </Feldgruppe>

      <Feldgruppe titel="Bedingung — worauf der Joker überhaupt gilt">
        <p style={{ fontSize: 11, color: C.akzent, margin: "0 0 8px", lineHeight: 1.45 }}>
          ⚠️ Min./Max.-Quote messen die Außenseiter-Siegquote <strong>des Spiels</strong>, nicht die
          Quote deines Tipps — sonst ließe sich die Bedingung farmen (aussichtslos tippen, um
          freizuschalten, und dann auf das setzen, was man wirklich erwartet).
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <ZahlInput label="Min. Außenseiter-Quote (leer = keine)" wert={bedWert("minQuote") ?? ""}
            limits={BASIS_LIMITS.quote} leerErlaubt breite={150} onChange={(v) => onPatchBedingung({ minQuote: v })} />
          <ZahlInput label="Max. Außenseiter-Quote (leer = keine)" wert={bedWert("maxQuote") ?? ""}
            limits={BASIS_LIMITS.quote} leerErlaubt breite={150} onChange={(v) => onPatchBedingung({ maxQuote: v })} />
        </div>
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 5 }}>Wettbewerbe (leer = alle)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {WETTBEWERBE.map((w) => (
              <ChipButton key={w.key} aktiv={(bedWert("wettbewerbe") ?? []).includes(w.key)}
                onClick={() => patchWettbewerbe(w.key)}>{w.label}</ChipButton>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 5 }}>Phasen (leer = alle)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {PHASEN.map((p) => (
              <ChipButton key={p.key} aktiv={(bedWert("phasen") ?? []).includes(p.key)}
                onClick={() => patchPhasen(p.key)}>{p.label}</ChipButton>
            ))}
          </div>
        </div>
      </Feldgruppe>
    </div>
  );
}

// ── Kleinteile ───────────────────────────────────────────────

function Feldgruppe({ titel, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 5, lineHeight: 1.4 }}>{titel}</div>
      {children}
    </div>
  );
}

function Katalog({ katalog, aktiv, onWahl }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
      {katalog.map((k) => (
        <ChipButton key={k.key} aktiv={aktiv === k.key} titel={k.desc} onClick={() => onWahl(k.key)}>
          {k.label}
        </ChipButton>
      ))}
    </div>
  );
}

function ChipButton({ aktiv, titel, onClick, children }) {
  return (
    <button title={titel} onClick={onClick} style={{
      ...TAPZIEL, cursor: "pointer", fontFamily: "inherit", fontSize: 12, padding: "5px 10px", borderRadius: 999,
      background: aktiv ? `${C.indigo}22` : C.surface2, color: aktiv ? C.indigo : C.muted,
      border: `1px solid ${aktiv ? C.indigo + "66" : C.line}`,
    }}>{children}</button>
  );
}

function ToggleKnopf({ an, onChange, textAn, textAus }) {
  return (
    <button onClick={() => onChange(!an)} style={{
      display: "flex", alignItems: "center", gap: 10, width: "100%",
      textAlign: "left", cursor: "pointer", fontFamily: "inherit", color: C.text,
      background: C.surface2, border: `1px solid ${an ? C.mint + "55" : C.line}`,
      ...TAPZIEL, borderRadius: 10, padding: "8px 10px",
    }}>
      <span style={{
        flexShrink: 0, width: 34, height: 20, borderRadius: 999, position: "relative",
        background: an ? C.mint : C.surface, border: `1px solid ${an ? "transparent" : C.line}`,
      }}>
        <span style={{
          position: "absolute", top: 2, left: an ? 16 : 2, width: 14, height: 14,
          borderRadius: 999, background: C.ink2, transition: "left .15s",
        }} />
      </span>
      <span style={{ fontSize: 12 }}>{an ? textAn : textAus}</span>
    </button>
  );
}

function Banner({ ton, children }) {
  const farbe = ton === "coral" ? C.coral : ton === "indigo" ? C.indigo : C.bernstein;
  return (
    <div style={{
      background: `${farbe}12`, border: `1px solid ${farbe}55`, borderRadius: 12,
      padding: "9px 11px", marginBottom: 10, fontSize: 12, color: C.text, lineHeight: 1.5,
    }}>
      {children}
    </div>
  );
}
