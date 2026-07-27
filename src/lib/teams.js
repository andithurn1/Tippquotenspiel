// ============================================================
//  TEAM-MODUS — mehrere Teams, je mehrere Mitglieder
//
//  Bisher tippt jeder für sich. Hier kommt eine zweite Wertungs-EBENE dazu:
//  die Runde wird in Teams aufgeteilt, und neben der Einzelrangliste läuft eine
//  Teamrangliste. Die Einzelwertung bleibt IMMER erhalten — sie ist die Quelle,
//  aus der die Teamwertung entsteht, und ohne sie wüsste niemand mehr, wie er
//  selbst getippt hat.
//
//  ── Der ganze Knackpunkt: UNGLEICH GROSSE TEAMS ──
//  Die Roadmap sprach von 2er-Teams, da stellt sich die Frage nicht. Sobald ein
//  Team drei und ein anderes zwei Mitglieder hat, entscheidet der Wertungs-Modus
//  über die Fairness — und zwar deutlich stärker als jeder Regler sonst:
//
//    `summe`   — alle Punkte addiert. Ein Team mit einem Mitglied mehr gewinnt
//                fast zwangsläufig. NUR bei exakt gleich großen Teams fair.
//    `schnitt` — Punkte je Mitglied. Größe spielt keine Rolle mehr. DEFAULT,
//                und der einzige Modus, der bei ungleichen Größen trägt.
//    `bester`  — je Spiel zählt der beste Tipp des Teams. Belohnt Abdeckung:
//                ein größeres Team hat mehr Lose. Fair nur bei gleicher Größe,
//                spielt sich aber ganz anders als `summe` — es lohnt sich,
//                VERSCHIEDEN zu tippen statt alle dasselbe.
//
//  Deshalb prüft `pruefeAufteilung` die Kombination aus Modus und Größen und
//  meldet die Unwucht, statt sie stillschweigend zuzulassen. Verboten wird
//  nichts — dieselbe Haltung wie bei den Profi-Warnungen: der Admin darf alles,
//  aber nie versehentlich.
//
//  ── Was hier NICHT steht ──
//  WER in welchem Team ist, gehört nicht ins Regelwerk, sondern an die Runde
//  (wie `round_members`). Das Regelwerk sagt nur, WIE gewertet wird. Sonst
//  reiste die Mannschaftsaufstellung im Creator-Code mit, und ein geteiltes
//  Preset brächte fremde Spielernamen mit.
//
//  Reine Funktionen, UI-frei.
// ============================================================

export const TEAM_LIMITS = {
  minGroesse: { min: 2, max: 6, step: 1 },
  maxTeams: 12,
};

export const WERTUNGEN = [
  {
    key: "schnitt", label: "Punkte je Mitglied",
    hint: "Die Teamgröße spielt keine Rolle — auch ein kleineres Team kann gewinnen.",
    ungleichOk: true,
  },
  {
    key: "summe", label: "Alle Punkte zusammen",
    hint: "Einfach zu verstehen. Nur fair, wenn alle Teams gleich groß sind.",
    ungleichOk: false,
  },
  {
    key: "bester", label: "Bester Tipp zählt",
    hint: "Je Spiel zählt das beste Ergebnis im Team. Es lohnt sich, verschieden zu tippen.",
    ungleichOk: false,
  },
];

export const WERTUNG = Object.fromEntries(WERTUNGEN.map((w) => [w.key, w]));

export const DEFAULT_TEAMS = {
  enabled: false,
  wertung: "schnitt",
  minGroesse: 2,
};

export function sanitizeTeams(partial = {}) {
  const p = partial && typeof partial === "object" ? partial : {};
  const L = TEAM_LIMITS.minGroesse;
  const n = Number(p.minGroesse);
  return {
    enabled: p.enabled === true,
    // Ein unbekannter Modus fiele sonst still auf „kein Team" zurück.
    wertung: WERTUNG[p.wertung] ? p.wertung : DEFAULT_TEAMS.wertung,
    minGroesse: Number.isFinite(n)
      ? Math.min(L.max, Math.max(L.min, Math.round(n)))
      : DEFAULT_TEAMS.minGroesse,
  };
}

// ── Aufteilung prüfen ───────────────────────────────────────
// `teams`:      [{ id, name, mitglieder: [userId] }]
// `mitglieder`: alle userIds der Runde — daraus ergibt sich, wer noch KEIN
//               Team hat. Ein Mitglied ohne Team fiele aus der Teamwertung
//               heraus, ohne es zu merken.
// Rückgabe: [{ key, schwere: "fehler" | "hinweis", text }] — leer = in Ordnung.
export function pruefeAufteilung(teams = [], mitglieder = [], rules) {
  const cfg = sanitizeTeams(rules?.teams);
  if (!cfg.enabled) return [];

  const meldungen = [];
  const gueltig = teams.filter((t) => t && Array.isArray(t.mitglieder));

  if (gueltig.length < 2) {
    meldungen.push({
      key: "zu-wenig-teams", schwere: "fehler",
      text: "Es braucht mindestens zwei Teams — sonst gibt es nichts zu vergleichen.",
    });
  }
  if (gueltig.length > TEAM_LIMITS.maxTeams) {
    meldungen.push({
      key: "zu-viele-teams", schwere: "fehler",
      text: `Höchstens ${TEAM_LIMITS.maxTeams} Teams.`,
    });
  }

  // Doppelte Mitgliedschaft — wer in zwei Teams steht, zählt doppelt.
  const gesehen = new Map();
  for (const t of gueltig) {
    for (const m of t.mitglieder) {
      if (gesehen.has(m)) {
        meldungen.push({
          key: "doppelt", schwere: "fehler",
          text: `Ein Mitspieler steht in zwei Teams (${gesehen.get(m)} und ${t.name ?? t.id}). Seine Punkte zählten doppelt.`,
        });
      }
      gesehen.set(m, t.name ?? t.id);
    }
  }

  // Zu kleine Teams.
  for (const t of gueltig) {
    if (t.mitglieder.length < cfg.minGroesse) {
      meldungen.push({
        key: "zu-klein", schwere: "fehler",
        text: `Team „${t.name ?? t.id}" hat ${t.mitglieder.length} von mindestens ${cfg.minGroesse} Mitgliedern.`,
      });
    }
  }

  // Mitglieder ohne Team.
  const ohne = mitglieder.filter((m) => !gesehen.has(m));
  if (ohne.length) {
    meldungen.push({
      key: "ohne-team", schwere: "hinweis",
      text: `${ohne.length} Mitspieler ${ohne.length === 1 ? "ist" : "sind"} in keinem Team und ${ohne.length === 1 ? "taucht" : "tauchen"} in der Teamwertung nicht auf.`,
    });
  }

  // ⚠️ Die eigentliche Fairness-Meldung.
  const groessen = gueltig.map((t) => t.mitglieder.length);
  const ungleich = groessen.length > 1 && Math.min(...groessen) !== Math.max(...groessen);
  if (ungleich && !WERTUNG[cfg.wertung].ungleichOk) {
    meldungen.push({
      key: "ungleich", schwere: "hinweis",
      text: `Die Teams sind unterschiedlich groß (${Math.min(...groessen)} bis ${Math.max(...groessen)}), `
        + `aber „${WERTUNG[cfg.wertung].label}" belohnt das größere Team allein für seine Größe. `
        + `Mit „${WERTUNG.schnitt.label}" spielt die Größe keine Rolle.`,
      korrektur: { wertung: "schnitt" },
    });
  }

  return meldungen;
}

// ── Die Teamrangliste ───────────────────────────────────────
// Gebaut AUS der fertigen Einzelrangliste — kein zweiter Scoring-Weg, sonst
// liefen Einzel- und Teamwertung irgendwann auseinander.
//  `board`: [{ userId, name, total, tips, gewertet }] (aus scoreLeaderboard)
//  `teams`: [{ id, name, mitglieder: [userId] }]
// Für `bester` reicht das Board nicht — dort zählt der beste Tipp JE SPIEL,
// dafür braucht es die Einzeltipps (siehe `teamLeaderboardBester`).
export function teamLeaderboard(board = [], teams = [], rules) {
  const cfg = sanitizeTeams(rules?.teams);
  const proUser = new Map(board.map((b) => [b.userId, b]));

  const zeilen = teams.map((t) => {
    const drin = (t.mitglieder || []).map((m) => proUser.get(m)).filter(Boolean);
    const summe = drin.reduce((s, b) => s + (b.total ?? 0), 0);
    const tips = drin.reduce((s, b) => s + (b.tips ?? 0), 0);
    // Geteilt wird durch die GEMELDETEN Mitglieder, nicht durch die, die
    // schon getippt haben — sonst verbesserte ein untätiges Mitglied den
    // Schnitt seines Teams, indem es nichts tut.
    const groesse = Math.max(1, (t.mitglieder || []).length);
    const total = cfg.wertung === "schnitt" ? +(summe / groesse).toFixed(1) : summe;

    return {
      teamId: t.id, name: t.name ?? String(t.id),
      total, summe, groesse, tips,
      mitglieder: drin
        .sort((a, b) => (b.total ?? 0) - (a.total ?? 0))
        .map((b) => ({ userId: b.userId, name: b.name, total: b.total ?? 0 })),
    };
  });

  return zeilen
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
    .map((z, i) => ({ ...z, rank: i + 1 }));
}

// Ein Satz für die Oberfläche — beschreibt, wie gewertet wird.
export function beschreibeTeams(rules) {
  const cfg = sanitizeTeams(rules?.teams);
  if (!cfg.enabled) return "Jeder spielt für sich.";
  return `Teams ab ${cfg.minGroesse} Mitgliedern · ${WERTUNG[cfg.wertung].label}.`;
}
