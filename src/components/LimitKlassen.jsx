"use client";

import { useMemo } from "react";
import { C } from "@/lib/theme";
import {
  AKTIVIERUNG_TYPEN, PRO_ZEITRAUM, LIMIT_KLASSEN_LIMITS,
  pruefeKlassen, beschreibeKlasse,
} from "@/lib/limitKlassen";
import { JOKER_ARTEN } from "@/lib/jokerBudget";
import { EREIGNIS_TYPEN } from "@/lib/ereignisse";
import { Zahl } from "@/components/Eingaben";

const SPIELTAGE = 34;

let klassenZaehler = 0;
function neueKlassenId() {
  klassenZaehler += 1;
  return `klasse-${Date.now().toString(36)}-${klassenZaehler}`;
}

// Vorgabe je Aktivierungs-Typ beim Umschalten — deckt sich mit den Fallbacks
// in `sanitizeAktivierung` (limitKlassen.js), Muster STANDARD_QUELLE
// (JokerOekonomie.jsx) / STANDARD_BELOHNUNG (Drehrad.jsx).
const STANDARD_AKTIVIERUNG = {
  immer: { typ: "immer" },
  abSpieltag: { typ: "abSpieltag", wert: 1 },
  fenster: { typ: "fenster", von: 1, bis: SPIELTAGE },
  abRueckstand: { typ: "abRueckstand", wert: 10 },
  abVorsprung: { typ: "abVorsprung", wert: 10 },
  nachEreignis: { typ: "nachEreignis", ereignisKey: EREIGNIS_TYPEN[0]?.key ?? "" },
  abBudget: { typ: "abBudget", wert: 10 },
  nurGegenFuehrende: { typ: "nurGegenFuehrende", plaetze: 3 },
};

// Kurztext für den Zeitraum — für die kompakte Abdeckungs-Übersicht je
// Joker-Art (design/joker-oekonomie.md: „Klau-Joker → Angriffe (3 pro
// Saison) · …"). `beschreibeKlasse` (limitKlassen.js) liefert einen ganzen
// Satz und wäre dafür zu lang.
function zeitraumKurz(k) {
  if (k.proZeitraum === "spieltag") return "pro Spieltag";
  if (k.proZeitraum === "nSpieltage") return `pro ${k.n} Spieltage`;
  if (k.proZeitraum === "phase") return "im Aktivierungs-Fenster";
  return "pro Saison";
}

// ============================================================
//  LIMITKLASSEN — der Profi-Editor für Unterkontingente
//  (design/joker-oekonomie.md, Baustein 2 + Abschnitt 5d)
//
//  ── Warum die Klassen-Liste NICHT über `sanitizeLimitKlassen` läuft ──
//  Dieselbe Falle wie in Drehrad.jsx: `sanitizeKlasse` wirft eine Klasse OHNE
//  gültige `id` sofort raus (limitKlassen.js). Die `id` ist hier aber kein
//  Eingabefeld — sie wird beim Anlegen einmalig vergeben (`neueKlassenId`)
//  und bleibt über die ganze Lebensdauer der Klasse stabil; editierbar ist
//  nur `label` (der Name). Trotzdem läuft die editierbare Liste über den
//  ROHEN `rules.limitKlassen`-Zustand, nicht über das sanitierte Ergebnis —
//  `pruefeKlassen` läuft NUR für die Anzeige (verworfene Zeilen, Abdeckungs-
//  Übersicht), nie als Quelle für das, was gespeichert wird. Sonst verlöre
//  eine Klasse ihre Mitglieder-Auswahl unter dem Cursor, sobald sie
//  zwischenzeitlich (z. B. leere Mitgliederliste) als ungültig gälte.
//
//  ── Der eigentliche Punkt: die Überlagerung sichtbar machen ──
//  Ein Editor, der nur die Klassen selbst zeigt, verfehlt den Zweck der
//  Limitierungsklassen — mehrere Klassen sollen sich ÜBERLAGERN (Kopfkommentar
//  limitKlassen.js, Punkt 1). Deshalb zusätzlich eine Übersicht JE JOKER-ART:
//  welche Klassen decken sie ab, und eine Art ohne jede Klasse steht
//  ausdrücklich als „unbegrenzt" da, statt stillschweigend zu gelten.
// ============================================================
export default function LimitKlassen({ rules, onChange }) {
  const klassen = Array.isArray(rules?.limitKlassen) ? rules.limitKlassen : [];

  // Nur für ANZEIGE (verworfene Zeilen, Abdeckungs-Übersicht) — nie als
  // Quelle für das, was gespeichert wird (siehe Kopfkommentar).
  const pruefung = useMemo(() => pruefeKlassen(klassen), [klassen]);

  // Abdeckung je Joker-Art, aus den GÜLTIGEN (sanitierten) Klassen — eine
  // verworfene Klasse verschwindet damit hier korrekt mit all ihren Limits,
  // statt trotzdem als Abdeckung angezeigt zu werden.
  const abdeckung = useMemo(() => JOKER_ARTEN.map((art) => ({
    art,
    treffer: pruefung.klassen.filter((k) => k.mitglieder.includes(art.key)),
  })), [pruefung.klassen]);

  const setze = (naechsteKlassen) => onChange(naechsteKlassen);
  const patchKlasse = (id, patch) => setze(klassen.map((k) => (k.id === id ? { ...k, ...patch } : k)));
  const patchAktivierung = (id, patch) => setze(
    klassen.map((k) => (k.id === id ? { ...k, aktivierung: { ...k.aktivierung, ...patch } } : k)),
  );
  const setzeAktivierungsTyp = (id, typ) => setze(
    klassen.map((k) => (k.id === id ? { ...k, aktivierung: { ...STANDARD_AKTIVIERUNG[typ] } } : k)),
  );
  const toggleMitglied = (id, art) => setze(klassen.map((k) => {
    if (k.id !== id) return k;
    const mitglieder = Array.isArray(k.mitglieder) ? k.mitglieder : [];
    return {
      ...k,
      mitglieder: mitglieder.includes(art)
        ? mitglieder.filter((m) => m !== art)
        : [...mitglieder, art],
    };
  }));
  const hinzufuegen = () => setze([...klassen, {
    id: neueKlassenId(), label: "", mitglieder: [], max: 3, proZeitraum: "saison", n: 5,
    aktivierung: { typ: "immer" },
  }]);
  const entfernen = (id) => setze(klassen.filter((k) => k.id !== id));

  return (
    <div>
      <p style={{ fontSize: 11.5, color: C.muted, margin: "0 0 10px", lineHeight: 1.5 }}>
        Eine Limitierungsklasse ist ein gemeinsames Kontingent für mehrere Joker-Arten.
        Mehrere Klassen dürfen sich <strong>überlagern</strong> — ein Einsatz zählt gegen
        JEDE Klasse, in der seine Art Mitglied ist.
      </p>

      {klassen.length === 0 && (
        <Banner ton="gold">
          Noch keine Klassen angelegt — ohne eine einzige Klasse gibt es keine Kontingente,
          alle Joker-Arten sind unbegrenzt einsetzbar.
        </Banner>
      )}

      {pruefung.verworfen.length > 0 && (
        <Banner ton="coral">
          <strong>{pruefung.verworfen.length} Klasse(n) zählen gerade nicht mit:</strong>
          <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
            {pruefung.verworfen.map((v) => <li key={v.index}>{v.grund}</li>)}
          </ul>
        </Banner>
      )}

      {/* ── Die Überlagerung: Abdeckung je Joker-Art ── */}
      {klassen.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Abdeckung je Joker-Art</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {abdeckung.map(({ art, treffer }) => (
              <div key={art.key} style={{
                background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10,
                padding: "8px 10px", fontSize: 11.5, lineHeight: 1.5,
              }}>
                <span style={{ fontWeight: 700 }}>{art.label}</span>
                {" → "}
                {treffer.length === 0 ? (
                  <span style={{ color: C.muted }}>in keiner Klasse — unbegrenzt</span>
                ) : (
                  treffer.map((k, i) => (
                    <span key={k.id} style={{ color: C.text }}>
                      {i > 0 && " · "}
                      {k.label} ({k.max} {zeitraumKurz(k)})
                    </span>
                  ))
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Klassen-Liste ── */}
      <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4, marginBottom: 8 }}>
        Klassen ({klassen.length})
      </div>
      {klassen.length === 0 && (
        <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 8 }}>
          Noch keine Klassen — leg die erste an.
        </div>
      )}
      <div>
        {klassen.map((k) => {
          const verworfenEintrag = pruefung.verworfen.find((v) => v.id === k.id && v.id != null);
          return (
            <KlasseZeile key={k.id} klasse={k} verworfenGrund={verworfenEintrag?.grund}
              onPatch={(p) => patchKlasse(k.id, p)}
              onAktivierungPatch={(p) => patchAktivierung(k.id, p)}
              onAktivierungsTyp={(typ) => setzeAktivierungsTyp(k.id, typ)}
              onToggleMitglied={(art) => toggleMitglied(k.id, art)}
              onEntfernen={() => entfernen(k.id)} />
          );
        })}
      </div>
      <button onClick={hinzufuegen} style={{
        cursor: "pointer", background: "transparent", color: C.muted,
        border: `1px dashed ${C.line}`, borderRadius: 14, padding: "10px 12px",
        fontFamily: "inherit", fontSize: 13, textAlign: "left", width: "100%", boxSizing: "border-box",
      }}>+ Klasse anlegen</button>
    </div>
  );
}

// ── Eine Klassen-Zeile ──────────────────────────────────────
function KlasseZeile({
  klasse, verworfenGrund, onPatch, onAktivierungPatch, onAktivierungsTyp, onToggleMitglied, onEntfernen,
}) {
  const mitglieder = Array.isArray(klasse.mitglieder) ? klasse.mitglieder : [];
  const aktivierung = klasse.aktivierung && typeof klasse.aktivierung === "object"
    ? klasse.aktivierung : { typ: "immer" };
  const beschreibung = beschreibeKlasse(klasse, SPIELTAGE);

  return (
    <div style={{
      background: C.surface, border: `1px solid ${verworfenGrund ? C.coral + "66" : C.line}`,
      borderRadius: 12, padding: "10px 12px", marginBottom: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input value={klasse.label ?? ""} placeholder="Name der Klasse"
          onChange={(e) => onPatch({ label: e.target.value })}
          style={{
            flex: 1, minWidth: 0, boxSizing: "border-box", background: C.ink2, color: C.text,
            border: `1px solid ${C.line}`, borderRadius: 9, padding: "7px 9px",
            fontSize: 13, fontFamily: "inherit", outline: "none",
          }} />
        <button onClick={onEntfernen} aria-label="Klasse entfernen" style={{
          cursor: "pointer", background: "transparent", border: "none",
          color: C.muted, fontSize: 18, lineHeight: 1, padding: "0 2px", flexShrink: 0,
        }}>×</button>
      </div>

      {verworfenGrund && (
        <div style={{ fontSize: 10.5, color: C.coral, marginTop: 6, lineHeight: 1.4 }}>
          Zählt gerade nicht mit: {verworfenGrund}
        </div>
      )}

      {/* Mitglieder */}
      <div style={{ marginTop: 9 }}>
        <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 5 }}>Mitglieder</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {JOKER_ARTEN.map((art) => {
            const an = mitglieder.includes(art.key);
            return (
              <button key={art.key} title={art.desc} onClick={() => onToggleMitglied(art.key)} style={{
                cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, padding: "5px 10px", borderRadius: 999,
                background: an ? `${C.indigo}22` : C.surface2, color: an ? C.indigo : C.muted,
                border: `1px solid ${an ? C.indigo + "66" : C.line}`,
              }}>{art.label}</button>
            );
          })}
        </div>
        {mitglieder.length === 0 && (
          <div style={{ fontSize: 10.5, color: C.gold, marginTop: 5, lineHeight: 1.4 }}>
            Ohne Mitglieder greift diese Klasse für keine Joker-Art.
          </div>
        )}
      </div>

      {/* Kontingent */}
      <div style={{ display: "flex", gap: 10, marginTop: 9, flexWrap: "wrap" }}>
        <Zahl label="Höchstens" wert={klasse.max} limits={LIMIT_KLASSEN_LIMITS.max}
          onChange={(v) => onPatch({ max: v })} />
      </div>

      {/* Zeitraum */}
      <div style={{ marginTop: 9 }}>
        <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 5 }}>Zeitraum</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {PRO_ZEITRAUM.map((p) => {
            const an = (klasse.proZeitraum ?? "saison") === p.key;
            return (
              <button key={p.key} title={p.desc} onClick={() => onPatch({ proZeitraum: p.key })} style={{
                cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, padding: "5px 10px", borderRadius: 999,
                background: an ? `${C.gold}22` : C.surface2, color: an ? C.gold : C.muted,
                border: `1px solid ${an ? C.gold + "66" : C.line}`,
              }}>{p.label}</button>
            );
          })}
        </div>
        {klasse.proZeitraum === "nSpieltage" && (
          <div style={{ marginTop: 8, maxWidth: 150 }}>
            <Zahl label="N Spieltage" wert={klasse.n ?? 5} limits={LIMIT_KLASSEN_LIMITS.n}
              onChange={(v) => onPatch({ n: v })} />
          </div>
        )}
      </div>

      {/* Aktivierung — nur die Parameter zeigen, die der gewählte Typ braucht. */}
      <div style={{ marginTop: 9 }}>
        <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 5 }}>Aktivierung</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {AKTIVIERUNG_TYPEN.map((t) => {
            const an = aktivierung.typ === t.key;
            return (
              <button key={t.key} title={t.desc} onClick={() => onAktivierungsTyp(t.key)} style={{
                cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, padding: "5px 10px", borderRadius: 999,
                background: an ? `${C.mint}22` : C.surface2, color: an ? C.mint : C.muted,
                border: `1px solid ${an ? C.mint + "66" : C.line}`,
              }}>{t.label}</button>
            );
          })}
        </div>

        {aktivierung.typ === "abSpieltag" && (
          <div style={{ marginTop: 8, maxWidth: 150 }}>
            <Zahl label="Ab Spieltag" wert={aktivierung.wert ?? LIMIT_KLASSEN_LIMITS.abSpieltag.min}
              limits={LIMIT_KLASSEN_LIMITS.abSpieltag}
              onChange={(v) => onAktivierungPatch({ wert: v })} />
          </div>
        )}
        {aktivierung.typ === "fenster" && (
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <Zahl label="Von Spieltag" wert={aktivierung.von ?? LIMIT_KLASSEN_LIMITS.fensterSpieltag.min}
              limits={LIMIT_KLASSEN_LIMITS.fensterSpieltag}
              onChange={(v) => onAktivierungPatch({ von: v })} />
            <Zahl label="Bis Spieltag" wert={aktivierung.bis ?? LIMIT_KLASSEN_LIMITS.fensterSpieltag.max}
              limits={LIMIT_KLASSEN_LIMITS.fensterSpieltag}
              onChange={(v) => onAktivierungPatch({ bis: v })} />
          </div>
        )}
        {aktivierung.typ === "abRueckstand" && (
          <div style={{ marginTop: 8, maxWidth: 150 }}>
            <Zahl label="Ab Rückstand (Punkte)" wert={aktivierung.wert ?? 0} limits={LIMIT_KLASSEN_LIMITS.abRueckstand}
              onChange={(v) => onAktivierungPatch({ wert: v })} />
          </div>
        )}
        {aktivierung.typ === "abVorsprung" && (
          <div style={{ marginTop: 8, maxWidth: 150 }}>
            <Zahl label="Ab Vorsprung (Punkte)" wert={aktivierung.wert ?? 0} limits={LIMIT_KLASSEN_LIMITS.abVorsprung}
              onChange={(v) => onAktivierungPatch({ wert: v })} />
          </div>
        )}
        {aktivierung.typ === "nachEreignis" && (
          <label style={{ fontSize: 11, color: C.muted, display: "block", marginTop: 8, maxWidth: 280 }}>
            Ereignis
            <select value={aktivierung.ereignisKey ?? ""}
              onChange={(e) => onAktivierungPatch({ ereignisKey: e.target.value })}
              style={{
                display: "block", width: "100%", boxSizing: "border-box", marginTop: 3,
                background: C.ink2, color: C.text, border: `1px solid ${C.line}`,
                borderRadius: 10, padding: "7px 9px", fontSize: 13, fontFamily: "inherit",
              }}>
              <option value="">— auswählen —</option>
              {EREIGNIS_TYPEN.map((e) => <option key={e.key} value={e.key}>{e.label}</option>)}
            </select>
          </label>
        )}
        {aktivierung.typ === "abBudget" && (
          <div style={{ marginTop: 8, maxWidth: 150 }}>
            <Zahl label="Ab Narrenstand" wert={aktivierung.wert ?? 0} limits={LIMIT_KLASSEN_LIMITS.abBudget}
              onChange={(v) => onAktivierungPatch({ wert: v })} />
          </div>
        )}
        {aktivierung.typ === "nurGegenFuehrende" && (
          <div style={{ marginTop: 8, maxWidth: 150 }}>
            <Zahl label="Erste N Plätze" wert={aktivierung.plaetze ?? 1} limits={LIMIT_KLASSEN_LIMITS.plaetze}
              onChange={(v) => onAktivierungPatch({ plaetze: v })} />
          </div>
        )}
      </div>

      {beschreibung && (
        <div style={{ fontSize: 10.5, color: C.muted, marginTop: 9, lineHeight: 1.4 }}>{beschreibung}</div>
      )}
    </div>
  );
}

// ── Kleinteile ───────────────────────────────────────────────

function Banner({ ton, children }) {
  const farbe = ton === "coral" ? C.coral : C.gold;
  return (
    <div style={{
      background: `${farbe}12`, border: `1px solid ${farbe}55`, borderRadius: 12,
      padding: "9px 11px", marginBottom: 10, fontSize: 11.5, color: C.text, lineHeight: 1.5,
    }}>
      {children}
    </div>
  );
}
