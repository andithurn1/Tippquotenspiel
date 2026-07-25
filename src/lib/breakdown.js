// ============================================================
//  ERTRAGSQUELLEN — „woher kamen meine Punkte?"
//
//  Die Endzahl allein sagt nichts. Aufgeschlüsselt liest sie sich wie eine
//  Abrechnung: man sieht, WO man gut war, und weiß, woran man nächste Woche
//  drehen kann. Genau deshalb ist das kein Anzeige-Beiwerk, sondern Teil des
//  Spiels.
//
//  ⚠️ Die Rechenkette ist NICHT einfach eine Summe — und genau daran scheitern
//  naive Aufschlüsselungen:
//
//    1) GRUNDWERT: Sieger-Boden, Abstand und Nähe konkurrieren, der GRÖSSTE
//       gewinnt (`Math.max`). Sie addieren sich NIE. Die unterlegenen Teile
//       zeigen wir als Kontext („hätte X gebracht"), nicht als Posten.
//    2) × Underdog-Boost (falls das reale Ergebnis eine Überraschung war)
//    3) + Torschützen, danach × Kombi — die Kombi wirkt auf die SUMME aus
//       Grundwert und Toren, nicht auf die Tore allein.
//    4) − Favoriten-Reinfall (schließt den Sieger-Boden logisch aus: der Malus
//       greift nur, wenn man auf den Favoriten gesetzt hat UND der verlor —
//       dann war der Sieger-Tipp falsch. Beide gleichzeitig ist unmöglich.)
//    5) × Modifikatoren (Joker, Team/Derby — additiv gebündelt und gedeckelt)
//    6) × Anzeige-Skalierung, evtl. Deckel je Spiel
//
//  Deshalb liefert dieses Modul POSTEN MIT TYP: `summe` (addiert sich),
//  `faktor` (multipliziert) und `info` (nur Kontext). Die UI muss nichts
//  rechnen — sie zeigt nur an.
//
//  Reine Funktionen, UI-frei. Rechnet nichts selbst, sondern liest `scoreTip`.
// ============================================================

import { scoreTip, applyCombo, jokerAufschlaege, DEFAULT_RULES } from "./engine";

const r1 = (v) => Math.round(v * 10) / 10;

// Die Quelle des Grundwerts — welcher der konkurrierenden Teile gewonnen hat.
const GRUND_LABEL = {
  tendenz: "Sieger richtig",
  abstand: "Abstand getroffen",
  naehe: "Ergebnis-Nähe",
  teamtore: "Team-Tore-Nähe",
  strafe: "Komplett daneben",
  keiner: "Nichts getroffen",
};

// Baut die Posten-Liste eines einzelnen Tipps.
// Rückgabe: { posten: [...], gesamt, roh, stimmt }
//   posten[i] = { key, label, art: "summe"|"faktor"|"info", wert, hinweis? }
//   `stimmt` = ob die Kette rechnerisch auf `gesamt` aufgeht (Selbstkontrolle).
export function breakdown(tip, actual, snap, rules = DEFAULT_RULES) {
  const s = scoreTip(tip, actual, snap, rules);
  const skala = rules.displayScale ?? 1;
  const zeige = (rohWert) => Math.round(rohWert * skala);

  const posten = [];
  const p = s.parts;

  // ── 1) Grundwert: welcher Teil hat gewonnen? ──────────────
  const naheRoh = Math.max(p.ergNaehe, p.teamTore);
  const naheZaehlt = naheRoh >= (rules.minPayout ?? 0) ? naheRoh : 0;
  const kandidaten = [
    { key: "tendenz", wert: p.tendBoden },
    { key: "abstand", wert: p.abstand },
    { key: p.ergNaehe >= p.teamTore ? "naehe" : "teamtore", wert: naheZaehlt },
  ];
  const sieger = kandidaten.reduce((a, b) => (b.wert > a.wert ? b : a), kandidaten[0]);

  // Grundwert VOR dem Underdog-Boost (resultPart enthält ihn schon).
  const grundRoh = s.underdogMult > 0 ? s.resultPart / s.underdogMult : s.resultPart;
  const bestrafung = s.resultPart < 0;

  posten.push({
    key: "grund",
    label: bestrafung ? GRUND_LABEL.strafe : (GRUND_LABEL[sieger.key] ?? GRUND_LABEL.keiner),
    art: "summe",
    wert: zeige(grundRoh),
    hinweis: bestrafung ? "Weder Sieger noch Nähe — Abzug laut Regelwerk." : null,
  });

  // Die unterlegenen Teile als KONTEXT, nicht als Posten. Macht sichtbar, dass
  // die Engine automatisch den besten Weg für dich nimmt.
  if (!bestrafung) {
    for (const k of kandidaten) {
      if (k.key === sieger.key || k.wert <= 0) continue;
      posten.push({
        key: `alt-${k.key}`,
        label: GRUND_LABEL[k.key],
        art: "info",
        wert: zeige(k.wert),
        hinweis: "zählt nicht — der höhere Wert oben gewinnt",
      });
    }
  }

  // ── 2) Underdog-Boost ─────────────────────────────────────
  if (s.underdogMult > 1) {
    posten.push({
      key: "underdog",
      label: "Außenseiter-Bonus",
      art: "faktor",
      wert: r1(s.underdogMult),
      hinweis: "Das reale Ergebnis war eine Überraschung.",
    });
  }

  // ── 3) Torschützen + Kombi ────────────────────────────────
  if (s.goals.net > 0) {
    for (const d of s.goals.detail) {
      const quote = d.type === "double" ? d.double : d.anytime;
      const getroffen = d.scored == null ? true : d.scored >= 1;
      if (!getroffen) continue;
      posten.push({
        key: `tor-${d.side}-${d.player}`,
        label: d.type === "double" ? `Doppelpack ${d.player}` : `Torschütze ${d.player}`,
        art: "summe",
        wert: zeige(quote - 1),
        hinweis: `Quote ${r1(quote)}`,
      });
    }
    const nachKombi = applyCombo(s.resultPart, s.ebene, s.goals.net, rules);
    const ohneKombi = s.resultPart + s.goals.net;
    if (nachKombi > ohneKombi) {
      posten.push({
        key: "kombi",
        label: `Kombi (${s.ebene})`,
        art: "faktor",
        wert: r1(rules.combo[s.ebene] ?? 1),
        hinweis: "Wirkt auf Ergebnis UND Tore zusammen.",
      });
    }
  }

  // ── 4) Favoriten-Reinfall (schließt den Sieger-Boden aus) ─
  if (s.favFlop > 0) {
    posten.push({
      key: "favflop",
      label: "Favoriten-Reinfall",
      art: "summe",
      wert: -zeige(s.favFlop),
      hinweis: "Du hast auf den Favoriten gesetzt — der hat verloren.",
    });
  }

  // ── 5) Modifikatoren (Joker-Typen, Team/Derby) ────────────
  // ⚠️ GENAU EINE Faktor-Zeile. Die einzelnen Joker-Typen erscheinen als
  // INFO-Zeilen darunter — sie werden ADDIERT, nicht multipliziert. Drei
  // Faktor-Zeilen nebeneinander würden das Gegenteil suggerieren (×1,5 × ×1,2
  // × ×1,2 = 2,16 statt der tatsächlichen 1,9).
  const mod = s.modifier;
  if (mod && mod.faktor !== 1) {
    posten.push({
      key: "modifikator",
      label: "Modifikatoren",
      art: "faktor",
      wert: r1(mod.faktor),
      hinweis: mod.gedeckelt
        ? "Gedeckelt — die Aufschläge werden addiert, nicht multipliziert."
        : "Aufschläge werden addiert, nicht multipliziert.",
    });
    for (const typ of jokerAufschlaege(tip, snap, rules, actual)) {
      posten.push({
        key: `mod-${typ.key}`,
        label: typ.label,
        art: "info",
        wert: r1(typ.aufschlag),
        hinweis: `Aufschlag +${r1(typ.aufschlag)} (oben eingerechnet)`,
      });
    }
    if (mod.team > 1) {
      posten.push({
        key: "mod-team",
        label: "Team / Derby",
        art: "info",
        wert: r1(mod.team - 1),
        hinweis: `Aufschlag +${r1(mod.team - 1)} (oben eingerechnet)`,
      });
    }
  }

  // ── 6) Deckel je Spiel ────────────────────────────────────
  const ungedeckelt = Math.round(s.raw * skala);
  if (rules.perGameCap != null && ungedeckelt > rules.perGameCap) {
    posten.push({
      key: "deckel",
      label: "Deckel je Spiel",
      art: "info",
      wert: rules.perGameCap,
      hinweis: `Ohne Deckel wären es ${ungedeckelt} gewesen.`,
    });
  }

  return {
    posten,
    gesamt: s.total,
    roh: s.raw,
    ebene: s.ebene,
    // Selbstkontrolle: rechnet die Kette auf die Endzahl auf?
    stimmt: pruefeKette(posten, s, rules),
  };
}

// Rechnet die Posten nach: Summen addieren, Faktoren multiplizieren.
// Nur zur Selbstkontrolle (und als Test-Anker) — die UI zeigt einfach an.
function pruefeKette(posten, s, rules) {
  const skala = rules.displayScale ?? 1;
  let wert = 0;
  for (const post of posten) {
    if (post.art === "summe") wert += post.wert;
    else if (post.art === "faktor") wert *= post.wert;
  }
  const erwartet = rules.perGameCap != null
    ? Math.min(Math.round(s.raw * skala), rules.perGameCap)
    : Math.round(s.raw * skala);
  // Rundungsspielraum: jeder Posten wird einzeln gerundet.
  return Math.abs(wert - erwartet) <= Math.max(2, Math.abs(erwartet) * 0.03);
}

// Wichtige Zusicherung für die Anzeige: Sieger-Boden und Favoriten-Reinfall
// können NIE gleichzeitig auftreten (der Malus setzt einen falschen Sieger-Tipp
// voraus). Wird von den Tests geprüft, damit die Liste nie widersprüchlich wirkt.
export function istWiderspruechlich(posten = []) {
  const grund = posten.find((p) => p.key === "grund");
  const flop = posten.find((p) => p.key === "favflop");
  return Boolean(flop && grund && grund.label === GRUND_LABEL.tendenz && grund.wert > 0);
}
