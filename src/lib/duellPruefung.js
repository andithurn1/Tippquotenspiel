// ============================================================
//  DUELL-EINSATZ PRÜFEN — die Schutzregeln an der belastbaren Stelle
//
//  🔴 Der Befund, der diese Datei nötig gemacht hat (Kanal, 06.–07.08.2026):
//  `duell.zielWahl`, `duell.maxProZiel`, `duell.immun` und `duell.kosten`
//  wurden **nur in `Tippabgabe.jsx`** geprüft. `saveTip` prüfte davon nichts.
//  Wer den Store direkt anspricht — und im Live-Betrieb schreibt der Client
//  direkt in die Tabelle —, trifft jeden, beliebig oft, umsonst.
//
//  Das ist derselbe Fall wie das Tipp-Fenster am 06.08.: die zentrale
//  Fairness-Regel stand nur im Screen, und über den Store ließ sich auf ein
//  zwei Monate altes Spiel tippen. Die Lösung ist dieselbe und die Begründung
//  wörtlich dieselbe:
//
//  ⚠️ **Das ist KEINE Sicherheitsgrenze.** Wer die Datenbank direkt anspricht,
//  kommt weiterhin durch; dafür braucht es die Trigger/Policies aus dem
//  RLS-Durchgang. Was es verhindert: dass UNSER EIGENER Code es falsch macht,
//  und dass die Regel an zwei Stellen verschieden formuliert wird.
//
//  ── Warum eine eigene Datei und nicht zwei Kopien in den Stores ──
//  Die Prüfung braucht den ganzen Tabellenstand, den Duell-Plan, das
//  Joker-Kontingent und die Limit-Klassen. In beiden Stores nachgebaut wären
//  das zwei Fassungen, die auseinanderlaufen — die Fehlerklasse, an der dieses
//  Projekt `saisonBoard.js` schon einmal auseinandergezogen hat.
//
//  Deshalb hängt diese Prüfung an der STORE-SCHNITTSTELLE (`getRound`,
//  `listRoundMatches`, `getLeaderboard`, `listTips`, `getRoundEntries`,
//  `getSpieltagsPunkte`) und nicht an einer Datenbank. Mock und Supabase
//  liefern beide dasselbe — genau dafür gibt es die Schnittstelle.
//
//  ⚠️ **Sie ist teuer** (ein Leaderboard-Aufbau je Aufruf) und läuft deshalb
//  NUR, wenn wirklich ein Duell im Tipp steht und die Runde Duelle erlaubt.
//  Ein Tipp ohne `tip.duell` kostet keine einzige zusätzliche Abfrage.
//
//  ── Was sie NICHT prüft ──
//  Den Widerruf (`darfWiderrufen`). Der hängt am VORHERIGEN Stand des Tipps
//  und an dem Moment, in dem der Nutzer die Änderung vornimmt — das weiß der
//  Screen, der Store sieht nur das Ergebnis. Hier stünde er als Vermutung.
// ============================================================

import { DEFAULT_RULES, sanitizeRules } from "./engine";
import { zeitachse, rundenSpieltagVon } from "./zeitachse";
import { wettbewerbVon } from "./wettbewerbe";
import { duellPlan } from "./duellJoker";
// 🔴 Seit dem 23.08.2026 hat die Familie VIER Arten (JK4), und zwei davon
// stehen gar nicht in `rules.duell`. Alles, was „welche Art?", „welches Ziel?"
// oder „wie viele je Spieltag?" beantwortet, kommt deshalb aus `fremdjoker.js`
// bzw. `eingriffe.js` — die Kurzformen hier hätten zwei Arten übersehen.
import { aktiveArten, familieAn, zulaessigeZiele, fremdEinsaetze, sperrGrund } from "./fremdjoker";
import { FREMDJOKER_ARTEN, jokerArtVon } from "./eingriffe";
import { duellBasis as duellBasisVon } from "./jokerBasis";
import { jokerPlan } from "./jokerPlan";
import { darfDuellSetzen, erspielteJoker } from "./jokerKontingent";
import { pruefeEinsatz } from "./limitKlassen";
import { rundenSchluessel } from "./zeitachse";

// Ein Duell im Tipp? Die billige Vorfrage, die den ganzen Aufbau erspart.
function hatDuell(tip) {
  return !!(tip && typeof tip === "object" && tip.duell && tip.duell.auf != null);
}

// `{ erlaubt: true }` oder `{ erlaubt: false, grund }`.
//
// 🔴 Die Reihenfolge der Prüfungen ist dieselbe wie im Screen, und sie ist
// nicht beliebig: erst „gibt es hier überhaupt ein Duell", dann „ist es dein
// Spieltag", dann „ist das ein erlaubtes Ziel", dann „kannst du es bezahlen",
// zuletzt die Limit-Klassen. Von grob nach fein — sonst bekommt der Nutzer die
// Feinbegründung für ein Duell, das schon aus einem gröberen Grund nicht geht.
export async function pruefeDuellEinsatz({ store, roundId, matchId, userId, tip } = {}) {
  if (!hatDuell(tip)) return { erlaubt: true, grund: null };

  const round = await store.getRound(roundId);
  const rules = sanitizeRules(round?.rules ?? DEFAULT_RULES);
  if (!familieAn(rules)) {
    return { erlaubt: false, grund: "In dieser Runde gibt es keine Fremdjoker." };
  }

  const ziel = tip.duell.auf;
  const erlaubteArten = aktiveArten(rules);
  const typ = tip.duell.typ ?? erlaubteArten[0];
  if (ziel === userId) {
    return { erlaubt: false, grund: "Man kann sich nicht selbst herausfordern." };
  }
  if (!erlaubteArten.includes(typ)) {
    const name = FREMDJOKER_ARTEN.find((a) => a.key === typ)?.label ?? typ;
    return { erlaubt: false, grund: `„${name}“ gibt es in dieser Runde nicht.` };
  }

  const [spiele, board, alleTipps, entries, spieltagsPunkte] = await Promise.all([
    store.listRoundMatches(roundId),
    store.getLeaderboard(roundId),
    store.listTips({ roundId }),
    store.getRoundEntries(roundId),
    store.getSpieltagsPunkte(roundId),
  ]);

  // ⚠️ Ein Ziel, das gar nicht in der Runde ist, fällt sonst still durch:
  // `zulaessigeZiele` liefert nur, was im Board steht, und ein Unbekannter ist
  // dort nicht — die Ablehnung käme dann mit der falschen Begründung.
  if (!board.some((b) => b.userId === ziel)) {
    return { erlaubt: false, grund: "Dieser Spieler gehört nicht zu dieser Runde." };
  }

  const match = spiele.find((m) => (m.id ?? m.matchId) === matchId);
  if (!match) return { erlaubt: false, grund: "Dieses Spiel gehört nicht zu dieser Runde." };

  const achse = zeitachse(spiele, rules.zeitachse);
  const spieltage = achse.length || spiele.length;
  const spieltag = rundenSpieltagVon(achse, match);
  // 🔴 Ohne Runden-Spieltag lässt sich weder der Plan noch eine Abklingzeit
  // beantworten. Fehlende Daten heißen NEIN — dieselbe Regel wie bei den
  // Auslösern und beim Tipp-Fenster (ohne verwertbaren Anpfiff gilt ZU).
  if (spieltag == null) {
    return { erlaubt: false, grund: "Der Spieltag dieses Spiels lässt sich nicht bestimmen." };
  }

  const userIds = board.map((b) => b.userId);
  const seed = roundId ?? "";

  // Ist es überhaupt ein Duell-Spieltag für DIESEN Spieler?
  const dPlan = duellPlan({
    spieltage, duell: rules.duell, basis: duellBasisVon(rules), seed, userIds,
  });
  if (!dPlan?.proSpieler?.[userId]?.includes(spieltag)) {
    return { erlaubt: false, grund: "An diesem Spieltag hast du keinen Duell-Joker." };
  }

  // Tipps in die Form bringen, die `einsaetzeAusTipps` erwartet: Spieltag und
  // Wettbewerb stehen am SPIEL, nicht am Tipp.
  const spielVon = new Map(spiele.map((m) => [m.id ?? m.matchId, m]));
  const alsEintrag = (t) => {
    const mid = t.match_id ?? t.matchId;
    const m = spielVon.get(mid);
    return {
      userId: t.user_id ?? t.userId, tip: t.tip, matchId: mid,
      matchday: m?.matchday ?? null, wettbewerb: m ? wettbewerbVon(m) : null,
      kickoff: m?.kickoff ?? null,
      joker: t.tip?.joker === true, duell: t.tip?.duell ?? null,
    };
  };
  // ⚠️ Der AKTUELLE Tipp fliegt raus — er wird ja gerade geschrieben. Bleibt
  // er drin, prüft sich ein geändertes Duell gegen seinen eigenen Vorgänger:
  // `maxProZiel` wäre um eins zu streng, und bei `kosten: "stattJoker"` nähme
  // sich der Nutzer selbst den letzten Joker weg. Genau diese Ausnahme macht
  // der Screen auch (`meineTipsOhneAktuellen`).
  const andere = alleTipps.filter((t) => (t.match_id ?? t.matchId) !== matchId);
  const bisherigeEinsaetze = fremdEinsaetze(andere.map(alsEintrag), rules);

  // ⚠️ MIT der Art gefragt: die Sperrfrist steht je Fremdjoker (JK5, Ebene 2),
  // also ist „ist Kemal ein erlaubtes Ziel?" ohne sie gar nicht beantwortbar.
  const zulaessig = zulaessigeZiele(board, userId, rules, {
    bisherigeEinsaetze, aktuellerSpieltag: spieltag, art: typ,
  });
  if (!zulaessig.includes(ziel)) {
    // 🔴 Wenn es die SPERRE war, sagen wir das auch — samt „wieder frei ab".
    // Ein „geht gerade nicht" ohne Grund liest sich wie ein Fehler, und der
    // Spieler sucht ihn dann bei sich.
    const grund = sperrGrund(rules, {
      art: typ, vonUserId: userId, aufUserId: ziel, bisherigeEinsaetze,
      aktuellerSpieltag: spieltag,
    });
    return { erlaubt: false, grund: grund?.text ?? "Dieser Spieler ist gerade kein erlaubtes Ziel." };
  }

  // Kosten: bei `stattJoker` verbraucht ein Duell einen Joker aus demselben
  // Vorrat wie ein normaler Joker-Einsatz.
  const schluessel = rundenSchluessel(achse) ?? undefined;
  const gutschriften = erspielteJoker({
    eintraege: entries.filter((e) => e.userId === userId),
    alleEintraege: entries, spieltagsPunkte, rules, schluessel, rundenId: roundId,
  });
  const jPlan = jokerPlan({
    spieltage, verteilung: rules.joker?.verteilung, seed, userIds,
  });
  const meineTipps = andere.filter((t) => (t.user_id ?? t.userId) === userId).map(alsEintrag);
  const kosten = darfDuellSetzen({
    plan: jPlan, gutschriften, tipps: meineTipps, userId, spieltag, duell: rules.duell,
  });
  if (!kosten.erlaubt) return { erlaubt: false, grund: kosten.grund };

  // Zuletzt die Limit-Klassen: die feinste Frage, und die einzige, die quer
  // über mehrere Joker-Arten geht.
  const jokerArt = jokerArtVon(typ) ?? "duell.klau";
  const historie = bisherigeEinsaetze.map((e) => ({
    spieltag: e.spieltag,
    jokerArt: jokerArtVon(e.typ) ?? "duell.klau",
    vonUserId: e.vonUserId, aufUserId: e.aufUserId,
  }));
  const klassen = pruefeEinsatz(
    { spieltag, jokerArt, vonUserId: userId, aufUserId: ziel },
    rules.limitKlassen, historie, { spieltage, board },
  );
  if (!klassen.erlaubt) {
    return { erlaubt: false, grund: klassen.gruende.map((g) => g.grund).join(" ") };
  }

  return { erlaubt: true, grund: null };
}
