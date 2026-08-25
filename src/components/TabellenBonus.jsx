"use client";

import { C, RUND } from "@/lib/theme";
import { TAPZIEL } from "@/lib/tapziel";
import { Zahl } from "@/components/Eingaben";
import Feinheiten from "@/components/Feinheiten";
import { sanitizeTabellenBonus, beschreibeTabellenBonus, DEFAULT_TABELLENBONUS } from "@/lib/tabellenBonus";

// ============================================================
//  TABELLEN-BONUS — Oberfläche (Profi-Ansicht)
//
//  🔴 Andi am 21.08.2026: „Underdog-Bonus mit Tabellenplatz bzw.
//  Punkteabstand … bitte umsetzen."
//
//  ⚠️ Der Unterschied zum vorhandenen `underdogBoost` gehört SICHTBAR in die
//  Oberfläche, nicht nur in einen Codekommentar: der eine misst am Markt, der
//  andere an der Tabelle. Wer beide einschaltet, ohne den Unterschied zu
//  kennen, hält das Zweite für eine Wiederholung des Ersten.
//
//  ⚠️ Der `fallback` steht bewusst als eigener Schalter da und nicht als
//  Feinheit im Kleingedruckten. Ohne ihn wäre der Bonus an den ersten
//  Spieltagen still wirkungslos — der unangenehmste Fehler überhaupt, weil er
//  wie „funktioniert nicht" aussieht statt wie „greift noch nicht".
// ============================================================

function Wahl({ label, wert, optionen, onChange }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: "0.75rem", color: C.muted, marginBottom: 5 }}>{label}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {optionen.map((o) => {
          const an = wert === o.key;
          return (
            <button
              key={o.key}
              type="button"
              aria-pressed={an}
              title={o.hint}
              onClick={() => onChange(o.key)}
              style={{
                ...TAPZIEL, flex: 1, minWidth: 120, cursor: "pointer",
                fontFamily: "inherit", fontSize: "0.75rem", textAlign: "left",
                padding: "0 12px", borderRadius: RUND.karte,
                background: an ? `${C.akzent}1A` : C.surface,
                color: an ? C.akzent : C.muted,
                border: `1px solid ${an ? C.akzent : C.line}`,
              }}
            >
              <span style={{ fontWeight: an ? 700 : 400 }}>{o.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function TabellenBonus({ rules, onChange }) {
  const cfg = sanitizeTabellenBonus(rules?.tabellenBonus);

  // Was hinter der Feinheiten-Klappe von der Vorgabe abweicht. ⚠️ Gegen
  // `DEFAULT_TABELLENBONUS` geprüft und nicht gegen einen hier notierten Wert:
  // eine zweite Fassung der Vorgabe wäre die zweite Wahrheit, und sie ginge
  // beim nächsten Vorgaben-Wechsel lautlos auseinander.
  const D = DEFAULT_TABELLENBONUS;
  const feinAbweichend = [
    cfg.nurWennRichtig !== D.nurWennRichtig ? "Geltung" : null,
    cfg.richtung !== D.richtung ? "Richtung" : null,
    cfg.fallback !== D.fallback ? "Ersatzweg" : null,
    cfg.fallback === "quote" && cfg.fallbackQuote !== D.fallbackQuote ? "Schwelle" : null,
  ].filter(Boolean);
  const setze = (teil) => onChange({ tabellenBonus: { ...cfg, ...teil } });
  const punkte = cfg.bezug === "punkte";

  return (
    <div style={{
      background: C.ink2, border: `1px solid ${C.line}`,
      borderRadius: RUND.karte, padding: "12px 12px 10px", marginBottom: 12,
    }}>
      <button
        type="button"
        aria-pressed={cfg.enabled}
        onClick={() => setze({ enabled: !cfg.enabled })}
        style={{
          display: "flex", alignItems: "center", gap: 10, width: "100%",
          ...TAPZIEL, textAlign: "left", cursor: "pointer", fontFamily: "inherit",
          padding: "8px 11px", borderRadius: RUND.karte, marginBottom: cfg.enabled ? 10 : 0,
          background: cfg.enabled ? `${C.akzent}14` : C.surface, color: C.text,
          border: `1px solid ${cfg.enabled ? C.akzent : C.line}`,
        }}
      >
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700 }}>
            Außenseiter nach Tabelle
          </span>
          <span style={{ display: "block", fontSize: "0.6875rem", color: C.muted, marginTop: 1 }}>
            {cfg.enabled ? beschreibeTabellenBonus({ tabellenBonus: cfg }) : "aus"}
          </span>
        </span>
      </button>

      {cfg.enabled && (
        <>
          <p style={{ fontSize: "0.6875rem", color: C.muted, margin: "0 0 10px", lineHeight: 1.45 }}>
            Misst am <b style={{ color: C.text }}>Tabellenstand</b>, nicht an der Quote —
            ein Aufsteiger auf Platz 4 ist für den Markt oft weiter Außenseiter, für die
            Tabelle nicht mehr.
          </p>

          <Wahl
            label="Woran gemessen wird"
            wert={cfg.bezug}
            onChange={(bezug) => setze({ bezug, abAbstand: bezug === "punkte" ? 15 : 8 })}
            optionen={[
              { key: "platz", label: "Tabellenplätze", hint: "Abstand in Rängen" },
              { key: "punkte", label: "Punkte", hint: "Abstand in Punkten" },
            ]}
          />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {/* 🔴 `wert` + `limits`, NICHT `value` + `min`/`max` (24.08.2026).
                Der ganze Block hat beim Einschalten die Seite zerlegt —
                „Cannot read properties of undefined (reading 'min')", weil
                `Zahl` aus `Eingaben.jsx` ein `limits`-Objekt erwartet.
                ⚠️ Kein Test und kein Lint konnte das sehen: `no-undef` prüft
                Variablen, keine Props, und für Screens gibt es keine Tests.
                Gefunden erst beim Durchklicken im Browser. */}
            <Zahl
              label={punkte ? "ab Punkten Abstand" : "ab Plätzen Abstand"}
              wert={cfg.abAbstand} limits={{ min: punkte ? 3 : 1, max: punkte ? 60 : 25, step: 1 }}
              onChange={(v) => setze({ abAbstand: v })}
            />
            <Zahl label="ab Spieltag" wert={cfg.abSpieltag} limits={{ min: 1, max: 20, step: 1 }}
              onChange={(v) => setze({ abSpieltag: v })} />
            <Zahl label="Aufschlag %" wert={Math.round(cfg.aufschlag * 100)} limits={{ min: 0, max: 150, step: 1 }}
              onChange={(v) => setze({ aufschlag: v / 100 })} />
          </div>

          {/* 🔴 Andis Detail-Regel (SA6, 24.08.2026): oben steht, was fast
              jeder verstellt — WORAN gemessen wird und wie stark. Was darunter
              liegt, beantwortet Fragen, die sich erst beim zweiten Hinsehen
              stellen: ob der Bonus auch ohne richtigen Tipp zählt, ob der
              Favorit gedämpft wird, was vor dem ersten Tabellenstand gilt.
              ⚠️ Die Zusammenfassung sagt, ob dahinter etwas VERSTELLT ist —
              sonst sieht eine wirksame Sonderregel aus wie eine unbenutzte. */}
          <Feinheiten
            titel="Feinheiten: Geltung, Richtung, Ersatzweg"
            zusammenfassung={feinAbweichend.length ? feinAbweichend.join(" · ") : "Vorgabe"}
            abweichend={feinAbweichend.length > 0}
          >
            <Wahl
              label="Wann er zählt"
              wert={cfg.nurWennRichtig ? "richtig" : "immer"}
              onChange={(k) => setze({ nurWennRichtig: k === "richtig" })}
              optionen={[
                { key: "richtig", label: "nur bei richtigem Tipp", hint: "Belohnung für eingelösten Mut" },
                { key: "immer", label: "als Spielgewicht", hint: "das Spiel zählt generell mehr" },
              ]}
            />

            <Wahl
              label="Richtung"
              wert={cfg.richtung}
              onChange={(richtung) => setze({ richtung })}
              optionen={[
                { key: "nurAussenseiter", label: "nur Außenseiter", hint: "kein Abzug für den Favoriten" },
                { key: "auchFavorit", label: "auch Favoriten-Dämpfer", hint: "erwartbare Siege zählen weniger" },
              ]}
            />

            <Wahl
              label="Solange keine Tabelle vorliegt"
              wert={cfg.fallback}
              onChange={(fallback) => setze({ fallback })}
              optionen={[
                { key: "quote", label: "Quote benutzen", hint: "greift ab dem 1. Spieltag" },
                { key: "aus", label: "gar nicht", hint: "greift erst mit der Tabelle" },
              ]}
            />

            {/* Nur sichtbar, wenn der Ersatzweg überhaupt benutzt wird — ein
                Regler, der gerade nichts tut, ist schlimmer als keiner. */}
            {cfg.fallback === "quote" && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                <Zahl label="Ersatzweg: ab Quotenverhältnis" wert={cfg.fallbackQuote}
                  limits={{ min: 1.2, max: 20, step: 0.1 }}
                  onChange={(v) => setze({ fallbackQuote: v })} />
              </div>
            )}
          </Feinheiten>
          <p style={{ fontSize: "0.6875rem", color: C.akzent, margin: "6px 0 0", lineHeight: 1.45 }}>
            Die Tabelle rechnen wir aus den eigenen Ergebnissen und frieren sie beim Öffnen
            des Spieltags ein — wer Freitag tippt, sieht dieselben Plätze wie wer Sonntag
            tippt. Vor Spieltag {cfg.abSpieltag} gilt
            {cfg.fallback === "quote" ? " ersatzweise die Quote." : " gar nichts."}
          </p>
        </>
      )}
    </div>
  );
}
