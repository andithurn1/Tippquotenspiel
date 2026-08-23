// ============================================================
//  SCHAUFENSTER — eine Demo-Runde, in der ALLES an ist
//
//  🔴 Andi am 23.08.2026: „mach die demo runde bzw tests so dass sie alle
//  Einstellbarkeiten abdeckt … um sie zu prüfen."
//
//  Die Demo-Runde „Freundeskreis" fährt `DEFAULT_RULES` — und die haben fast
//  alles AUS. Das ist richtig so (eine frische Runde soll nicht mit zwölf
//  Mechaniken zugleich anfangen), es macht die App aber unprüfbar: wer
//  nachsehen will, ob das Schild in der Tippabgabe erscheint oder das Los
//  angezeigt wird, sieht schlicht nichts. Genau daran ist der Browser-Durchgang
//  zu JK14 am 23.08.2026 gescheitert.
//
//  Deshalb eine ZWEITE Runde neben der ersten, Beitritts-Code `ALLES`.
//
//  ── ⛔ Die Zahlen hier sind DEMO-Werte, keine Empfehlung ──
//  Sie sind so gewählt, dass jede Mechanik SICHTBAR wird, nicht dass sie sich
//  gut anfühlt. Balancing ist Endphase (CLAUDE.md), und diese Datei ist
//  ausdrücklich kein Vorgriff darauf.
//
//  ⚠️ **Nichts hiervon gehört in `presets.js` oder `charaktere.js`.** Ein
//  Charakter behauptet eine Empfehlung; dieses Regelwerk behauptet nur, dass
//  sich alles einschalten LÄSST. Wer die Werte kopiert, macht aus einer
//  Prüfhilfe eine Aussage über das Spiel.
//
//  ── Warum ausgerechnet diese Abweichungen von der Vorgabe ──
//  Jede unten hat einen Grund, und der steht daneben. Alles, was nicht
//  kommentiert ist, bleibt bei der Vorgabe des jeweiligen Moduls — je weniger
//  hier steht, desto weniger läuft auseinander.
// ============================================================

import { DEFAULT_RULES, sanitizeRules } from "./engine";

export const SCHAU_ROUND_ID = "00000000-0000-0000-0000-000000000002";
export const SCHAU_JOIN_CODE = "ALLES";
export const SCHAU_NAME = "Schaufenster (alles an)";

// 🔴 Die Fremdjoker verlangen einen ZWEI-PHASEN-SPIELTAG (JK18) — ohne ihn
// meldet `fremdjoker.konflikte()` sofort. Also gehört er zum Schaufenster
// dazu, sonst zeigt es einen kaputten Zustand statt einer Runde.
const TIPPFENSTER = { vorlaufStunden: 168, anker: "spieltag", schlussStunden: 24 };

export function schaufensterRegeln() {
  return sanitizeRules({
    ...DEFAULT_RULES,
    name: SCHAU_NAME,

    // Nur Bundesliga: eine Runde über sechs Wettbewerbe hat sechsmal
    // „Spieltag 1", und dann ist beim Nachsehen nie klar, welcher gemeint ist.
    spiele: { ...DEFAULT_RULES.spiele, modus: "alle", wettbewerbe: ["bl"] },

    tippfenster: TIPPFENSTER,

    // ── Die FREMDJOKER-Familie, vollständig ──
    duell: {
      ...DEFAULT_RULES.duell,
      enabled: true,
      typen: ["klau", "block"],
      // 🔴 `manuell` mit einem Fenster, das bei Spieltag 1 ANFÄNGT, und
      // `anzahl` = Fensterbreite: nur so ist der erste Spieltag garantiert ein
      // Einsatz-Spieltag. Mit der Vorgabe („letztes Drittel", zufällig
      // verteilt) sähe man beim Nachsehen mit hoher Wahrscheinlichkeit nichts
      // — und hielte die Mechanik für kaputt.
      phase: "manuell",
      abSpieltag: 1,
      bisSpieltag: 6,
      anzahl: 6,
      // Zwei Fremdjoker am selben Spieltag, auf verschiedenen Spielen — der
      // Fall, den „max. je Spieltag" seit dem 23.08.2026 überhaupt erst
      // möglich macht.
      proSpieltag: 2,
      // Freie Zielwahl, damit die Zielliste mehr als einen Namen zeigt. Das
      // LOS (JK12) hat seine eigene Schaufenster-Runde nicht — es würde die
      // Liste auf genau einen Namen kürzen und damit alles andere verdecken.
      zielWahl: "frei",
      maxProZiel: 3,
      immun: 0,
      maxProSaison: 150,
    },

    eingriffe: {
      ...DEFAULT_RULES.eingriffe,
      enabled: true,
      // Alle vier Arten laufen — das ist der ganze Zweck dieser Runde.
      trittbrett: { ...DEFAULT_RULES.eingriffe.trittbrett, enabled: true },
      gegenwette: { ...DEFAULT_RULES.eingriffe.gegenwette, enabled: true },
      // JK5 in allen drei Ebenen sichtbar: ein Standard, eine Abweichung je
      // Art, und der wachsende Cooldown aus Andis Beispiel.
      sperrfrist: {
        standard: { spieltage: 0, aufschlag: 2, hoechstens: 6 },
        block: { spieltage: 3, aufschlag: 0 },
      },
      // JK6: der Block liegt offen (darüber soll geredet werden), die
      // Gegenwette nicht (sie soll überraschen).
      sichtbar: { standard: true, gegenwette: false },
      // JK14: ein Schild je Spieltag — die Vorgabe, hier nur ausdrücklich.
      schutz: { proSpieltag: 1, sichtbar: true, verfall: "zurueck" },
    },
  });
}

// ── Die Tipps, ohne die das Schaufenster leer bleibt ─────────
//
// 🔴 **Der Befund, der diese Funktion nötig gemacht hat:** eine Runde ohne
// Tipps hat eine LEERE Tabelle — und `zulaessigeZiele` filtert die Tabelle.
// Also gab es kein Ziel, also war `istDuellSpieltag` falsch, also fehlte der
// ganze Fremdjoker-Block in der Tippabgabe. Gemessen am 23.08.2026 im
// Browser: Schild da, Fremdjoker weg.
//
// ⚠️ Im Betrieb löst sich das von selbst — der ZWEI-PHASEN-Spieltag (JK18)
// sorgt dafür, dass in Phase 2 alle Tipps vorliegen. Es ist trotzdem der
// Grund, warum ein Schaufenster ohne Tipps nichts zeigt.
//
// Jede der fünf Zeilen unten steht für eine Mechanik, die man sehen soll:
//
//   Du     Block auf Lena (Spiel 1) + Gegenwette gegen Kemal (Spiel 2)
//          → zwei Fremdjoker an EINEM Spieltag, auf verschiedenen Spielen
//   Lena   Schild auf Spiel 3 → JK14
//   Kemal  Trittbrettfahrer auf Du (Spiel 1)
//   Max    Klau bei Jonas (Spiel 2)
//   Jonas  tippt nur — jemand muss auch mal nichts tun
export const SCHAU_SPIELER = ["u-du", "u-lena", "u-kemal", "u-max", "u-jonas"];

// `matches` = die Spiele der Runde (nur Bundesliga). Genommen werden die
// ersten drei des ersten Spieltags, chronologisch — damit die Zuordnung
// „Spiel 1/2/3" nicht an der Reihenfolge im Katalog hängt.
export function schaufensterTipps(matches = []) {
  const ersteDrei = matches
    .filter((m) => m.matchday === 1)
    .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff)
      || String(a.id ?? a.matchId).localeCompare(String(b.id ?? b.matchId)))
    .slice(0, 3);
  if (ersteDrei.length < 3) return [];

  const [s1, s2, s3] = ersteDrei.map((m) => m.id ?? m.matchId);
  const extra = {
    "u-du": {
      [s1]: { duell: { auf: "u-lena", typ: "block" } },
      [s2]: { duell: { auf: "u-kemal", typ: "gegenwette" } },
    },
    "u-lena": { [s3]: { schutz: true } },
    "u-kemal": { [s1]: { duell: { auf: "u-du", typ: "trittbrett" } } },
    "u-max": { [s2]: { duell: { auf: "u-jonas", typ: "klau" } } },
  };

  const zeilen = [];
  for (const [i, m] of ersteDrei.entries()) {
    const mid = m.id ?? m.matchId;
    for (const [j, userId] of SCHAU_SPIELER.entries()) {
      // Bewusst verschiedene Tipps, damit die Tabelle nicht fünfmal denselben
      // Stand zeigt — und damit die Alleinstellung überhaupt etwas zu tun hat.
      zeilen.push({
        id: `schau-${mid}-${userId}`,
        round_id: SCHAU_ROUND_ID,
        match_id: mid,
        user_id: userId,
        tip: {
          home: (i + j) % 4,
          away: (i * 2 + j) % 3,
          goals: { home: [], away: [] },
          ...(extra[userId]?.[mid] ?? {}),
        },
        snapshot: m.snapshot,
      });
    }
  }
  return zeilen;
}
