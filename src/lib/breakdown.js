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
import { bigGameAufschlag } from "./bigGame";
import { wettbewerbAufschlag } from "./wettbewerbGewicht";
import { wettbewerbLabel, phasenLabel, wettbewerbVon, phaseVon, istKo } from "./wettbewerbe";

// ⚠️ Wie genau ein FAKTOR angezeigt wird, ist keine Geschmacksfrage — er
// multipliziert alles darüber, sein Rundungsfehler wächst also mit der
// Punktzahl mit. Gemessen am 05.08.2026 (`npm run anzeige`, 1600 Tipps je
// Regelwerk):
//   eine Stelle  → die Kette lief bei „Underdog-Party" um bis zu 273 Punkte
//                  an der eigenen Endsumme vorbei (×3,5 statt ×3,47)
//   zwei Stellen → höchstens 19,4 Punkte
//   drei Stellen → höchstens 3,0 Punkte
// Deshalb: BERECHNETE Faktoren (Außenseiter, Modifikator-Bündel) mit drei
// Stellen, EINGESTELLTE mit zwei — die Kombi-Stufe hat der Admin selbst
// getippt, „×2,300" wäre dort nur Lärm. Summen-Posten bleiben ganzzahlig,
// der Rest steht als eigene `Rundung`-Zeile darunter.
const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;
const r3 = (v) => Math.round(v * 1000) / 1000;

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
      wert: r3(s.underdogMult),
      hinweis: "Das reale Ergebnis war eine Überraschung.",
    });
  }

  // ── 3) Torschützen + Kombi ────────────────────────────────
  if (s.goals.net > 0) {
    for (const d of s.goals.detail) {
      const quote = d.type === "double" ? d.double : d.anytime;
      const getroffen = d.scored == null ? true : d.scored >= 1;
      if (!getroffen) continue;
      // 🔴 Der Favoriten-Malus (26.08.2026) gehört SICHTBAR in die Zeile.
      // `scoreGoals` rechnet `(q − 1) × (1 − malus)`; stünde hier weiter der
      // volle Gewinn, ergäbe die Aufschlüsselung eine andere Summe als die
      // Wertung — genau die Sorte Abweichung, die `npm run anzeige` misst und
      // die am 05.08.2026 17 Funde an einem Tag hervorgebracht hat.
      const malus = d.malus ?? 0;
      posten.push({
        key: `tor-${d.side}-${d.player}`,
        label: d.type === "double" ? `Doppelpack ${d.player}` : `Torschütze ${d.player}`,
        art: "summe",
        wert: zeige((quote - 1) * (1 - malus)),
        hinweis: malus
          ? `Quote ${r1(quote)} · −${Math.round(malus * 100)} % (zu wahrscheinlich)`
          : `Quote ${r1(quote)}`,
      });
    }
    const nachKombi = applyCombo(s.resultPart, s.ebene, s.goals.net, rules);
    const ohneKombi = s.resultPart + s.goals.net;
    if (nachKombi > ohneKombi) {
      posten.push({
        key: "kombi",
        label: `Kombi (${s.ebene})`,
        art: "faktor",
        wert: r2(rules.combo[s.ebene] ?? 1),
        hinweis: "Wirkt auf Ergebnis UND Tore zusammen.",
      });
    }
  }

  // ── 3b) Abzug für einen komplett danebenliegenden Tipp ────
  // 🔴 Gefunden mit `npm run sicht` (07.08.2026): `wrongPenalty` greift, ist
  // einstellbar und reist im Creator-Code mit — kam aber in KEINER Anzeige für
  // den Spieler vor. Wer den Abzug abbekam, sah eine kleinere Zahl und keinen
  // Grund.
  //
  // ⚠️ Erkannt am ZUSTAND, nicht am Regelwert: `resultPart` ist genau dann
  // negativ, wenn die Engine auf `rules.wrongPenalty` zurückgefallen ist
  // (Sieger falsch UND nichts aus der Nähe). Über `rules.wrongPenalty < 0`
  // geprüft stünde die Zeile auch bei einem Tipp da, den der Abzug gar nicht
  // getroffen hat — eine Behauptung über den Tipp, die nicht stimmt.
  if (s.resultPart < 0) {
    posten.push({
      key: "wrongpenalty",
      label: "Komplett daneben",
      art: "summe",
      wert: zeige(s.resultPart),
      hinweis: "Weder Sieger noch Ergebnis-Nähe getroffen — diese Runde zieht dafür ab.",
    });
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
      wert: r3(mod.faktor),
      hinweis: mod.gedeckelt
        ? "Gedeckelt — die Aufschläge werden addiert, nicht multipliziert."
        : "Aufschläge werden addiert, nicht multipliziert.",
    });
    for (const typ of jokerAufschlaege(tip, snap, rules, actual)) {
      posten.push({
        key: `mod-${typ.key}`,
        label: typ.label,
        art: "info",
        wert: r2(typ.aufschlag),
        hinweis: `Aufschlag +${r2(typ.aufschlag)} (oben eingerechnet)`,
      });
    }
    // ⚠️ Der „Team"-Topf sind in Wahrheit DREI verschiedene Aussagen: Verein/
    // Derby, Spiel des Spieltags und Wettbewerbs-/K.-o.-Gewicht. Sie fallen in
    // denselben additiven Aufschlag (`teamModFactor`) — in der Aufschlüsselung
    // müssen sie aber getrennt stehen. „Team / Derby +0,5" bei einer Begegnung
    // ohne jedes Derby erklärt nichts, es verwirrt: der Spieler sucht ein Derby,
    // das es nicht gibt. Aufgeteilt wird über DIESELBEN Funktionen, die die
    // Engine benutzt, damit keine zweite Rechnung entsteht.
    // 🔴 Tabellen-Bonus getrennt ausweisen (21.08.2026). Er steckt NICHT in
    // `mod.team`, sondern liegt daneben — deshalb hier ein eigener Zweig und
    // nicht im Block darüber. Ohne eigene Zeile sähe der Spieler nur einen
    // größeren Gesamtfaktor und könnte ihn von einem Rechenfehler nicht
    // unterscheiden.
    if (Math.abs(mod.tabelle ?? 0) > 0.001) {
      const tb = mod.tabelle;
      const platz = snap?.tabellenPlatz;
      const woher = platz
        ? `Tabelle ${platz.home}. gegen ${platz.away}.`
        : "ohne Tabelle über die Quote";
      posten.push({
        key: "mod-tabelle",
        label: tb > 0 ? "Außenseiter nach Tabelle" : "Favoriten-Dämpfer",
        art: "info",
        wert: r2(tb),
        hinweis: `${woher} · ${tb > 0 ? "Aufschlag +" : "Abzug "}${r2(tb)} (oben eingerechnet)`,
      });
    }

    if (mod.team > 1) {
      const bigGame = bigGameAufschlag(snap, rules);
      const wettbewerb = wettbewerbAufschlag(snap, rules);
      const teamRest = +(mod.team - 1 - bigGame - wettbewerb).toFixed(3);
      if (teamRest > 0.001) {
        posten.push({
          key: "mod-team",
          label: "Team / Derby",
          art: "info",
          wert: r2(teamRest),
          hinweis: `Aufschlag +${r2(teamRest)} (oben eingerechnet)`,
        });
      }
      if (bigGame > 0) {
        posten.push({
          key: "mod-biggame",
          label: "Spiel des Spieltags",
          art: "info",
          wert: r2(bigGame),
          // Der Grund wurde beim Öffnen des Spieltags mit eingefroren. Ohne ihn
          // wirkt die Auswahl willkürlich — und genau daran stirbt das Vertrauen
          // in einen Automatismus, der Punkte verteilt.
          hinweis: snap?.bigGameGrund
            ? `${snap.bigGameGrund} · Aufschlag +${r2(bigGame)} (oben eingerechnet)`
            : `Aufschlag +${r2(bigGame)} (oben eingerechnet)`,
        });
      }
      if (wettbewerb > 0) {
        const phase = phaseVon(snap);
        posten.push({
          key: "mod-wettbewerb",
          label: "Wettbewerbs-Gewicht",
          art: "info",
          wert: r2(wettbewerb),
          hinweis: `${wettbewerbLabel(wettbewerbVon(snap))}${istKo(phase) ? ` · ${phasenLabel(phase)}` : ""}`
            + ` · Aufschlag +${r2(wettbewerb)} (oben eingerechnet)`,
        });
      }
    }
  }

  // ── 6) Deckel je Spiel ────────────────────────────────────
  // ⚠️ Der Deckel ist ein ABZUG, keine Fußnote. Als `info`-Zeile (durchgestrichen
  // dargestellt) stand er neben einer Kette, die weiter auf den ungedeckelten
  // Wert zeigte — die Aufschlüsselung behauptete also eine Zahl, die nie
  // ausgezahlt wurde. Jetzt trägt er die Differenz und die Spalte kommt unten an.
  const ungedeckelt = Math.round(s.raw * skala);
  if (rules.perGameCap != null && ungedeckelt > rules.perGameCap) {
    posten.push({
      key: "deckel",
      label: "Deckel je Spiel",
      art: "summe",
      wert: -(ungedeckelt - rules.perGameCap),
      hinweis: `Mehr als ${rules.perGameCap} zahlt ein Spiel nicht — ohne Deckel wären es ${ungedeckelt} gewesen.`,
    });
  }

  // ── 7) Rundung ────────────────────────────────────────────
  // 🔴 Die Zeile, die aus einer Aufschlüsselung eine Abrechnung macht.
  //
  // Jeder Posten oben wird EINZELN gerundet, und die Faktoren darunter
  // vervielfachen diesen Rundungsrest. Gemessen (`npm run anzeige`,
  // 05.08.2026): in 16–39 % aller Tipps kam die angezeigte Kette nicht auf die
  // angezeigte Endsumme — wer nachrechnete, bekam eine andere Zahl als die,
  // die im Leaderboard stand. Ein Test mit Toleranz hat das nie gemeldet.
  //
  // Der Rest wird deshalb ausgewiesen, nicht versteckt: der Spieler soll die
  // Spalte von oben nach unten addieren können und unten genau `gesamt`
  // herausbekommen. `gesamt` bleibt unverändert die Zahl aus `scoreTip` —
  // die Anzeige rechnet nichts schön, sie benennt ihre eigene Rundung.
  //
  // Die Zeile erscheint nur, wenn sie etwas ändert: solange die addierte Spalte
  // AUF die angezeigte Zahl rundet, ist sie überflüssiger Lärm. Gemessen ohne
  // diese Schranke stand sie bei 28 % aller Tipps da, meist wegen 0,2 Punkten.
  // ⚠️ Auf eine Nachkommastelle gerundet VERGLEICHEN, nicht roh: 3025 × 2,3
  // ergibt in Gleitkomma 6957,499999999999, auf dem Papier aber 6957,5. Ohne
  // diese Stelle bekommt der Rechner recht und der Spieler unrecht — und die
  // halbe Stelle fällt genau dort an, wo sie sichtbar wird.
  const kette = r1(ketteSumme(posten));
  const rest = r2(s.total - kette);
  if (Math.round(kette) !== s.total) {
    posten.push({
      key: "rundung",
      label: "Rundung",
      art: "summe",
      wert: rest,
      hinweis: "Die Posten oben sind einzeln gerundet — das ist der Rest zur tatsächlichen Wertung.",
    });
  }

  return {
    posten,
    gesamt: s.total,
    roh: s.raw,
    ebene: s.ebene,
    // Selbstkontrolle: rechnet die Kette auf die Endzahl auf?
    stimmt: pruefeKette(posten, s),
  };
}

// Die Kette so, wie ein Spieler sie auf dem Bildschirm liest: von oben nach
// unten, Summen addieren, Faktoren multiplizieren, Info-Zeilen überspringen
// (die stehen durchgestrichen da).
function ketteSumme(posten) {
  let wert = 0;
  for (const post of posten) {
    if (post.art === "summe") wert += post.wert;
    else if (post.art === "faktor") wert *= post.wert;
  }
  return wert;
}

// Rechnet die Posten nach. ⚠️ Die Prüfung ist STRENG geworden: früher stand
// hier eine Toleranz von 3 % — und genau die hat den Befund oben zugedeckt,
// weil 273 Punkte bei 9000 Gesamtpunkten innerhalb von 3 % liegen. Die Frage
// lautet jetzt wörtlich: rundet die addierte Spalte auf die angezeigte Zahl?
function pruefeKette(posten, s) {
  return Math.round(r1(ketteSumme(posten))) === s.total;
}

// Wichtige Zusicherung für die Anzeige: Sieger-Boden und Favoriten-Reinfall
// können NIE gleichzeitig auftreten (der Malus setzt einen falschen Sieger-Tipp
// voraus). Wird von den Tests geprüft, damit die Liste nie widersprüchlich wirkt.
export function istWiderspruechlich(posten = []) {
  const grund = posten.find((p) => p.key === "grund");
  const flop = posten.find((p) => p.key === "favflop");
  return Boolean(flop && grund && grund.label === GRUND_LABEL.tendenz && grund.wert > 0);
}
