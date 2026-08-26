"use client";

import { C, RUND } from "@/lib/theme";
import { TAPZIEL } from "@/lib/tapziel";
import { Zahl } from "@/components/Eingaben";
import Feinheiten from "@/components/Feinheiten";
import { sanitizeSperre, DEFAULT_SPERRE, SPERRE_LIMITS, SPERRE_MODI } from "@/lib/favoritenSperre";

// ============================================================
//  FAVORITEN-SPERRE — Oberfläche
//
//  🔴 Andi am 26.08.2026: „dass der admin einstellen kann, dass bspw. die
//  wahrscheinlichsten quoten bei Torschützen und Spielstand nicht ausgewählt
//  werden können … find halt immer harry kane nehmen boringo."
//
//  ⚠️ Die WAHL der Bauart steht oben und nicht in den Feinheiten, obwohl sie
//  technischer klingt als die Zahlen darunter. Sie ist die Frage, an der sich
//  entscheidet, ob die Einstellung an einem Spiel überhaupt etwas tut:
//
//    Rang  — „die 2 wahrscheinlichsten". Gilt relativ zu DIESEM Spiel und
//            beantwortet Andis Klammer („in abhängigkeit der betippten
//            Mannschaften und pro Wettbewerb") von selbst.
//    Quote — „alles unter 2,0". Leichter zu erklären, aber in einer schwachen
//            Liga sperrt es nichts und bei Bayern gegen einen Aufsteiger fast
//            alles.
//
//  ⚠️ `mindestensOffen` ist kein Beiwerk, sondern die Sicherung: eine Sperre,
//  die einen Tipp unmöglich macht, wäre ein Fehler und keine Einstellung.
//  Sie steht deshalb MIT Erklärung da und nicht als nackte Zahl.
// ============================================================

const MODUS_TEXT = {
  rang: { key: "rang", label: "Die wahrscheinlichsten", hint: "relativ zu diesem Spiel — passt sich jedem Wettbewerb an" },
  quote: { key: "quote", label: "Alles unter einer Quote", hint: "feste Schwelle für alle Spiele" },
};

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
                ...TAPZIEL, flex: 1, minWidth: 140, cursor: "pointer",
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

// Ein Satz, der die eingestellte Sperre in Worten sagt — ohne ein konkretes
// Spiel, denn das Regelwerk gilt für alle. Was sie an EINEM Spiel bewirkt,
// sagt `beschreibeSperre(snap, rules)` in der Tippabgabe.
function satz(cfg) {
  if (!cfg.enabled) return "aus — alles ist wählbar";
  const teile = [];
  if (cfg.modus === "quote") {
    teile.push(`alles unter Quote ${String(cfg.mindestQuote).replace(".", ",")}`);
  } else {
    if (cfg.schuetzen) teile.push(`${cfg.schuetzen} Torschütze${cfg.schuetzen === 1 ? "" : "n"}`);
    if (cfg.ergebnisse) teile.push(`${cfg.ergebnisse} Ergebnis${cfg.ergebnisse === 1 ? "" : "se"}`);
  }
  return `${teile.join(" · ")} gesperrt, mindestens ${cfg.mindestensOffen} bleiben offen`;
}

export default function FavoritenSperre({ rules, onChange }) {
  const cfg = sanitizeSperre(rules?.sperre);
  const D = DEFAULT_SPERRE;
  const L = SPERRE_LIMITS;
  const setze = (teil) => onChange({ sperre: { ...cfg, ...teil } });
  const nachQuote = cfg.modus === "quote";

  // Was hinter der Klappe von der Vorgabe abweicht — gegen `DEFAULT_SPERRE`
  // geprüft und nicht gegen hier notierte Werte (zweite Wahrheit).
  const feinAbweichend = [
    cfg.mindestensOffen !== D.mindestensOffen ? "Mindestauswahl" : null,
    nachQuote && cfg.mindestQuote !== D.mindestQuote ? "Schwelle" : null,
  ].filter(Boolean);

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
            Favoriten sperren
          </span>
          <span style={{ display: "block", fontSize: "0.6875rem", color: C.muted, marginTop: 1 }}>
            {satz(cfg)}
          </span>
        </span>
      </button>

      {cfg.enabled && (
        <>
          <p style={{ fontSize: "0.6875rem", color: C.muted, margin: "0 0 10px", lineHeight: 1.45 }}>
            Nimmt die <b style={{ color: C.text }}>naheliegendsten</b> Torschützen und Endstände
            aus der Auswahl. Verrechnet wird nichts anders — es steht nur weniger zur Wahl.
          </p>

          <Wahl
            label="Woran gemessen wird"
            wert={cfg.modus}
            onChange={(modus) => setze({ modus })}
            // ⚠️ Aus `SPERRE_MODI` aufgebaut und nicht hier aufgezählt: eine
            // dritte Bauart im Katalog wäre sonst gebaut, geprüft — und in der
            // Oberfläche unsichtbar.
            optionen={SPERRE_MODI.map((k) => MODUS_TEXT[k])}
          />

          {!nachQuote && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <Zahl label="Torschützen gesperrt" wert={cfg.schuetzen} limits={L.schuetzen}
                onChange={(v) => setze({ schuetzen: v })} />
              <Zahl label="Ergebnisse gesperrt" wert={cfg.ergebnisse} limits={L.ergebnisse}
                onChange={(v) => setze({ ergebnisse: v })} />
            </div>
          )}

          {nachQuote && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <Zahl label="gesperrt unter Quote" wert={cfg.mindestQuote} limits={L.mindestQuote}
                onChange={(v) => setze({ mindestQuote: v })} />
            </div>
          )}

          {/* 🔴 Andis Detail-Regel (SA6): oben das, was fast jeder verstellt —
              wie viel gesperrt wird. Dahinter die Sicherung, die man erst
              braucht, wenn man merkt, dass ein Spiel wenig Auswahl hat. */}
          <Feinheiten
            titel="Feinheiten: wie viel muss übrig bleiben"
            zusammenfassung={feinAbweichend.length ? feinAbweichend.join(" · ") : "Vorgabe"}
            abweichend={feinAbweichend.length > 0}
          >
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <Zahl label="mindestens wählbar" wert={cfg.mindestensOffen} limits={L.mindestensOffen}
                onChange={(v) => setze({ mindestensOffen: v })} />
              {!nachQuote && (
                <Zahl label="gesperrt unter Quote" wert={cfg.mindestQuote} limits={L.mindestQuote}
                  onChange={(v) => setze({ mindestQuote: v })} />
              )}
            </div>
            <p style={{ fontSize: "0.6875rem", color: C.muted, margin: 0, lineHeight: 1.45 }}>
              Die Sperre hört auf, sobald so viele Optionen übrig sind. An einem Spiel mit
              wenig Auswahl greift sie dadurch schwächer als eingestellt — gewollt: eine
              Sperre, die keinen Tipp mehr zulässt, wäre ein Fehler.
            </p>
          </Feinheiten>

          <p style={{ fontSize: "0.6875rem", color: C.akzent, margin: "6px 0 0", lineHeight: 1.45 }}>
            Die Spieler sehen die gesperrten Namen und Felder weiterhin — ausgegraut, mit
            dem Grund daneben. Wer nichts sieht, sucht.
          </p>
        </>
      )}
    </div>
  );
}
