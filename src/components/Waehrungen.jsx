"use client";

import { C, MONO } from "@/lib/theme";
import { zahl } from "@/lib/format";

// ── Münzen + Narren — EINE Stelle für beide Währungen ─────
//
// Zeigt den Münzstand (`src/lib/muenzstand.js`) UND den Narren-Kontostand
// (`src/lib/narrenstand.js`, design/kontaktstellen.md Abschnitt 5 Punkt 2),
// zwei Größen:
//   <Waehrungen stand={…} narren={…} kompakt />   Schnellmenü: eine Zeile je Runde
//   <Waehrungen stand={…} narren={…} />           Hub/Tippen: mit Balken
//
// `stand`/`narren` schließen sich nach heutigem Regelwerk gegenseitig aus —
// Münzen nur im Modus „einsatz", Narren nur in „einzel"/„ranking"
// (design/waehrungen.md Abschnitt 1) — die Komponente kümmert sich trotzdem
// unabhängig um beide, falls sich das einmal ändert.
//
// `stand === null`/`narren == null` (design/waehrungen.md 4: „eine Währung
// wird nur angezeigt, wenn ihr Stand aus echten Daten stammt") → das jeweilige
// Feld bleibt einfach weg, keine erfundene Null. Sind BEIDE leer, rendert die
// Komponente NULL, keine leere Hülle.
//
// `stand.aktiv === false` (Münz-TAKT, design/wettmodus.md 3): der Wettmodus
// läuft, aber an DIESEM Spieltag gibt es keine Münzen (Takt „Saison-Fenster"
// außerhalb des Fensters) — dann NUR `stand.grund` zeigen, keine Zahl/Balken
// (0 von 0 wäre eine erfundene Null) und in der kompakten Fassung den
// Münz-Teil ganz weglassen statt „🪙 0 von 0".
export default function Waehrungen({ stand, narren, kompakt = false }) {
  // Ein Münz-Stand ohne Münzen an diesem Spieltag (`aktiv === false`) trägt in
  // der kompakten Fassung nichts bei — dort gibt es ohnehin keine Zahl zu
  // zeigen (siehe unten). In der vollen Fassung bleibt er dagegen relevant:
  // die Überschrift + der Grund-Satz sind dort die Aussage.
  const muenzenKompaktZeigen = !!stand && stand.aktiv !== false;
  if (!stand && narren == null) return null;
  if (kompakt && !muenzenKompaktZeigen && narren == null) return null;

  if (kompakt) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        fontFamily: MONO, fontSize: 11, color: C.muted,
      }}>
        {muenzenKompaktZeigen && (
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span>🪙</span>
            <span style={{ color: C.akzent, fontWeight: 700 }}>{zahl(stand.frei)}</span>
            <span>von {zahl(stand.budget)}</span>
          </span>
        )}
        {narren != null && (
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span>🃏</span>
            <span style={{ color: C.akzent, fontWeight: 700 }}>{zahl(narren)}</span>
          </span>
        )}
      </div>
    );
  }

  const anteil = stand && stand.budget > 0
    ? Math.max(0, Math.min(100, (stand.verteilt / stand.budget) * 100)) : 0;

  return (
    <div>
      {stand && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>
              🪙 Münzen — {stand.periodeLabel ?? `Spieltag ${stand.spieltag?.matchday ?? "?"}`}
            </span>
            {stand.aktiv !== false && (
              <span style={{ fontFamily: MONO, fontSize: 13, color: C.akzent }}>
                {zahl(stand.frei)} frei
              </span>
            )}
          </div>
          {stand.aktiv === false ? (
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4 }}>{stand.grund}</div>
          ) : (
            <>
              <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4 }}>
                {zahl(stand.verteilt)} von {zahl(stand.budget)} Münzen verteilt
              </div>
              <div style={{ position: "relative", height: 6, borderRadius: 999, background: C.line, marginTop: 5 }}>
                <div style={{
                  position: "absolute", top: 0, bottom: 0, left: 0, borderRadius: 999, background: C.akzent,
                  width: `${anteil}%`,
                }} />
              </div>
            </>
          )}
        </div>
      )}
      {narren != null && (
        <div style={{ marginTop: stand ? 10 : 0, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>
            🃏 Narren
          </span>
          <span style={{ fontFamily: MONO, fontSize: 13, color: C.akzent }}>{zahl(narren)}</span>
        </div>
      )}
    </div>
  );
}
