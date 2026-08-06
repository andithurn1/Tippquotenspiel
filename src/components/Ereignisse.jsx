"use client";

import { C, MONO } from "@/lib/theme";
import {
  AUSWERTBARE_TYPEN, EREIGNIS_TYPEN, EREIGNIS_LIMITS, EREIGNIS,
  EREIGNIS_PRESETS, sanitizeEreignisse, konflikte, beschreibeEreignisse,
} from "@/lib/ereignisse";
import { Zahl } from "@/components/Eingaben";

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
  const setzeFeld = (key, feld, v) => setze({
    ...cfg,
    aktive: cfg.aktive.map((a) => (a.key === key ? { ...a, [feld]: v } : a)),
  });

  return (
    <div>
      <p style={{ fontSize: 11.5, color: C.muted, margin: "0 0 10px", lineHeight: 1.5 }}>
        Neben den Jokern, die du verteilst, kann man sich welche <strong>verdienen</strong>.
        Belohnt wird immer dasselbe: eine Joker-Gutschrift — kein zweiter Punkte-Kanal,
        damit der Deckel weiter greift.
      </p>

      {/* 🔴 Die kuratierten Bündel bleiben JEDERZEIT abrufbar, auch nachdem
          jemand alles verstellt hat — Punkt 2 des Baukasten-Grundsatzes. Ohne
          sie führt der Weg zurück zu einer stimmigen Einstellung nur über
          „alles wieder abwählen und neu raten". */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: C.muted, marginBottom: 6 }}>
          Empfohlene Zusammenstellungen
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {EREIGNIS_PRESETS.map((p) => {
            const aktiv = JSON.stringify(sanitizeEreignisse(p.ereignisse)) === JSON.stringify(cfg);
            return (
              <button key={p.key} type="button" onClick={() => setze(p.ereignisse)}
                title={p.text}
                style={{
                  border: `1px solid ${aktiv ? C.mint : C.line}`, borderRadius: 999,
                  background: aktiv ? `${C.mint}1a` : "transparent",
                  color: aktiv ? C.mint : C.text, cursor: "pointer",
                  padding: "5px 11px", fontSize: 11.5, fontWeight: aktiv ? 700 : 500,
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
          background: `${C.mint}0e`, border: `1px solid ${C.mint}44`, borderRadius: 12,
          padding: "10px 12px", marginBottom: 12,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>Höchstens erspielbar</span>
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
          background: `${C.gold}12`, border: `1px solid ${C.gold}55`, borderRadius: 12,
          padding: "10px 12px", marginBottom: 10, fontSize: 11.5, color: C.text, lineHeight: 1.5,
        }}>
          <strong style={{ color: C.gold }}>Doppelt belohnt: </strong>{w.text}
        </div>
      ))}

      {["meilenstein", "widerfahrnis"].map((kat) => (
        <div key={kat} style={{ marginBottom: 12 }}>
          <div style={{
            fontFamily: MONO, fontSize: 9.5, letterSpacing: 1.2, color: C.muted,
            textTransform: "uppercase", marginBottom: 6,
          }}>{KATEGORIE[kat]}</div>

          {AUSWERTBARE_TYPEN.filter((t) => t.kategorie === kat).map((t) => {
            const an = istAn(t.key);
            return (
              <div key={t.key} style={{
                background: an ? `${C.gold}12` : C.surface,
                border: `1px solid ${an ? C.gold + "55" : C.line}`,
                borderRadius: 12, padding: "10px 12px", marginBottom: 6,
              }}>
                <button onClick={() => umschalten(t.key)} style={{
                  width: "100%", textAlign: "left", background: "transparent", border: "none",
                  padding: 0, fontFamily: "inherit", color: C.text, cursor: "pointer",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, flex: 1 }}>{t.label}</span>
                    <span style={{ color: an ? C.gold : C.muted, fontSize: 13 }}>{an ? "✓" : "+"}</span>
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 1.45 }}>{t.hint}</div>
                </button>

                {an && (
                  <div style={{ marginTop: 9, paddingTop: 9, borderTop: `1px solid ${C.line}`, display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <Zahl label="Joker dafür" wert={wert(t.key, "belohnung")}
                      limits={EREIGNIS_LIMITS.belohnung} breite={110}
                      onChange={(v) => setzeFeld(t.key, "belohnung", v)} />
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
        border: `1px dashed ${C.line}`, borderRadius: 12, padding: "10px 12px", marginBottom: 8,
      }}>
        <div style={{
          fontFamily: MONO, fontSize: 9.5, letterSpacing: 1.2, color: C.muted,
          textTransform: "uppercase", marginBottom: 5,
        }}>{KATEGORIE.herausforderung} · kommt später</div>
        {EREIGNIS_TYPEN.filter((t) => t.kategorie === "herausforderung").map((t) => (
          <div key={t.key} style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5, marginTop: 3 }}>
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
