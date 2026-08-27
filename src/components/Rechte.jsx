"use client";

import { C, RUND } from "@/lib/theme";
import { TAPZIEL } from "@/lib/tapziel";
import Feinheiten from "@/components/Feinheiten";
import Wirkungsfeld from "@/components/Wirkungsfeld";
import {
  sanitizeRechte, RECHT_ARTEN, WAHL_ARTEN, RECHTE_LIMITS,
  beschreibeRechte, beschreibeAngebot, nochOhneWirkung, angeboteFuer, hatWahl,
} from "@/lib/rechte";

// ============================================================
//  RECHTE — was der Sieger bestimmen darf (Oberfläche)
//
//  🔴 Andi, 27.08.2026: „nur die der Admin einstellt, aber ja Admin kann auch
//  einstellen, dass aus einer Liste ausgewählt werden kann und diese
//  einzelnen Wirkungen können natürlich auch angepasst werden vor vom Admin."
//
//  ⚠️ Die Liste steht hinter `Feinheiten` — Andis Ansage vom selben Tag:
//  „solche optionen müssen egtl hinter nem eigenen öffnenbarem Fenster sein,
//  weil die ganzen Einstellmöglichkeiten einen sonst komplett erschlagen."
//  Oben bleibt die eine Frage, die fast jeder beantwortet: gibt es das Recht,
//  und ist es eines oder eine Auswahl.
//
//  ⚠️ Ein Angebot hat KEIN Ziel. Ein Recht trifft alle — wer eine Person
//  treffen will, nimmt einen Fremdjoker. Begründung im Kopf von `rechte.js`.
// ============================================================

function Knopf({ an, text, titel, onClick }) {
  return (
    <button type="button" onClick={onClick} title={titel} style={{
      ...TAPZIEL, cursor: "pointer", fontFamily: "inherit", fontSize: "0.75rem",
      padding: "0 12px", borderRadius: RUND.pille,
      background: an ? `${C.akzent}1A` : C.surface,
      color: an ? C.akzent : C.muted,
      border: `1px solid ${an ? C.akzent : C.line}`, fontWeight: an ? 700 : 400,
    }}>{text}</button>
  );
}

export default function Rechte({ rules, onChange }) {
  const cfg = sanitizeRechte(rules?.rechte);
  const setze = (teil) => onChange({ rechte: { ...cfg, ...teil } });
  const offen = nochOhneWirkung({ rechte: cfg });
  // 🔴 Was WIRKLICH zur Wahl steht — gefragt, nicht nachgezählt. Bei „ein
  // festes Recht" ist das nur das ERSTE Angebot, auch wenn mehr gespeichert
  // sind. Ohne diesen Unterschied zeigte die Oberfläche drei Möglichkeiten,
  // von denen zwei nie jemand zu sehen bekommt.
  const imAngebot = angeboteFuer({ rechte: cfg });
  const wahlMoeglich = hatWahl({ rechte: cfg });

  const setzeAngebot = (i, teil) => setze({
    angebote: cfg.angebote.map((a, k) => (k === i ? { ...a, ...teil } : a)),
  });
  const dazu = () => setze({
    angebote: [...cfg.angebote, { key: `angebot-${cfg.angebote.length + 1}`, art: "bigGame" }],
  });
  const weg = (i) => setze({ angebote: cfg.angebote.filter((_, k) => k !== i) });

  return (
    <div style={{
      background: C.ink2, border: `1px solid ${C.line}`,
      borderRadius: RUND.karte, padding: "12px 12px 10px", marginBottom: 12,
    }}>
      <button
        type="button"
        aria-pressed={cfg.enabled}
        onClick={() => setze({
          enabled: !cfg.enabled,
          // ⚠️ Einschalten OHNE Angebot ginge nicht durch die Bereinigung —
          // der Schalter bliebe stumm stehen. Also gleich eins mitgeben.
          angebote: cfg.angebote.length ? cfg.angebote : [{ key: "angebot-1", art: "bigGame" }],
        })}
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
            Der Sieger bestimmt etwas
          </span>
          <span style={{ display: "block", fontSize: "0.6875rem", color: C.muted, marginTop: 1 }}>
            {beschreibeRechte({ rechte: cfg })}
          </span>
        </span>
      </button>

      {cfg.enabled && (
        <>
          <p style={{ fontSize: "0.6875rem", color: C.muted, margin: "0 0 10px", lineHeight: 1.45 }}>
            Wer einen Spieltag gewinnt, dreht an einer Sache für die
            <b style={{ color: C.text }}> ganze Runde</b> — sich selbst
            eingeschlossen. Er wählt nur aus dem, was du hier vorbereitest.
          </p>

          {cfg.angebote.length > 1 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {WAHL_ARTEN.map((w) => (
                <Knopf key={w.key} an={cfg.wahl === w.key} text={w.label} titel={w.text}
                  onClick={() => setze({ wahl: w.key })} />
              ))}
            </div>
          )}

          <Feinheiten
            titel={`Was zur Wahl steht (${cfg.angebote.length})`}
            zusammenfassung={imAngebot.map(beschreibeAngebot).join(" · ")}
            abweichend={cfg.angebote.length > 1 || cfg.angebote[0]?.art !== "bigGame"}
          >
            {cfg.angebote.map((a, i) => (
              <div key={a.key ?? i} style={{
                border: `1px solid ${C.line}`, borderRadius: RUND.karte,
                padding: "9px 10px", marginBottom: 8,
              }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                  {RECHT_ARTEN.map((art) => (
                    <Knopf key={art.key} an={a.art === art.key} text={art.label} titel={art.text}
                      onClick={() => setzeAngebot(i, { art: art.key })} />
                  ))}
                  {cfg.angebote.length > 1 && (
                    <Knopf an={false} text="entfernen" titel="Dieses Angebot streichen"
                      onClick={() => weg(i)} />
                  )}
                </div>
                {/* 🔴 Dasselbe Wirkungsfeld wie bei den Ereignissen — nicht
                    nachgebaut. Eine zweite Fassung sähe am Tag des Baus gleich
                    aus und liefe danach still auseinander. */}
                {a.art === "wirkung" && (
                  <Wirkungsfeld wert={a.wirkung} onChange={(w) => setzeAngebot(i, { wirkung: w })} />
                )}
              </div>
            ))}

            {/* ⚠️ Ohne diesen Satz sieht der Admin drei Angebote und glaubt,
                es stünden drei zur Wahl. Bei „ein festes Recht" zählt nur das
                erste — die übrigen bleiben gespeichert, aber ungenutzt. */}
            {!wahlMoeglich && cfg.angebote.length > 1 && (
              <p style={{ fontSize: "0.6875rem", color: C.coral, margin: "0 0 8px", lineHeight: 1.45 }}>
                ⚠️ Bei „ein festes Recht“ gilt nur das erste. Die anderen bleiben
                stehen, kommen aber niemandem zur Wahl.
              </p>
            )}

            {cfg.angebote.length < RECHTE_LIMITS.angebote.max && (
              <Knopf an={false} text="+ noch eines" titel="Ein weiteres Angebot zur Wahl stellen"
                onClick={dazu} />
            )}
            <p style={{ fontSize: "0.6875rem", color: C.muted, margin: "8px 0 0", lineHeight: 1.45 }}>
              Höchstens {RECHTE_LIMITS.angebote.max} — eine Liste, die man nicht auf
              einen Blick erfasst, ist keine Wahl mehr, sondern eine Suche.
            </p>
          </Feinheiten>

          {/* 🔴 Die Ehrlichkeits-Zeile. Der Admin kann hier mehr einstellen,
              als heute in der Wertung ankommt — er soll das SEHEN, statt es
              daran zu merken, dass nichts passiert. */}
          {offen.length > 0 && (
            <p style={{ fontSize: "0.6875rem", color: C.coral, margin: "8px 0 0", lineHeight: 1.45 }}>
              ⚠️ Noch ohne Wirkung: {offen.join(", ")}. Der Weg von der Wahl bis in die
              Wertung fehlt dort — „Das Topspiel bestimmen“ greift vollständig.
            </p>
          )}
        </>
      )}
    </div>
  );
}
