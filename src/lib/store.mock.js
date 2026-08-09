// ── Mock-Store: In-Memory-Daten, damit die App ohne Backend läuft ──
// Gleiche Schnittstelle wie der Supabase-Store. Seed: die Demo-Runde
// „Freundeskreis" auf dem Match JOR-ESP (real 5:1). Zurücksetzen bei
// jedem Prozessstart — bewusst, es ist nur eine Attrappe.

import { createMockOddsSource, DEFAULT_RULES, scoreLeaderboard, scoreLeaderboardHistory, sanitizeRules, brauchtVerlauf } from "./engine";
// Beschlossene Regeländerungen wirken ab IHREM Spieltag (Schritt 5 von
// design/abstimmung-verfassung.md). `regelnFuerSpieltag` liefert dafür die
// Funktion, die die Engine als `regelnFuer` erwartet.
import { regelnFuerSpieltag } from "./beschluss";
import { zeitachse, rundenSpieltagVon, bespielteSpieltage } from "./zeitachse";
import { DEMO_ROUND_ID, DEMO_JOIN_CODE } from "./constants";
import { generateJoinCode } from "./joinCode";
import { alleMatches } from "./ligen";
import { sanitizeDisplayName, sanitizeAvatar, DEFAULT_AVATAR } from "./avatars";
import { isPremium, applyEntitlements } from "./premium";
import { spieltagOeffnen } from "./spieltagOeffnen";
import { withSaisonPunkte } from "./saisonBoard";
import { scoreSaison } from "./saisonwetten";
import { withDrehradPunkte, drehradZiehungen, drehradBelohnungen } from "./drehradBoard";
import { wettbewerbVon, DEFAULT_WETTBEWERB } from "./wettbewerbe";
import { einsaetzeAusTipps } from "./duellJoker";
import { rundenSpiele as rundenSpieleVon, rundenAuswahl } from "./roundStatus";
import { ersatzEintraege } from "./versaeumnisBoard";
import { punkteJeSpieltag } from "./spieltagsPunkte";
import { darfSaisonTippen } from "./saisonFenster";
import { tippStatus, spieltagStarts } from "./tippfenster";
import { pruefeDuellEinsatz } from "./duellPruefung";

// Dieselbe Spanne, die alle anderen Aufrufer von `spieltage`-Parametern im
// Projekt verwenden (Tippabgabe.jsx, Drehrad.jsx, JokerVerteilung.jsx,
// LimitKlassen.jsx) — eine feste Saison-Länge, kein echter Spielplan-Bezug.
const SPIELTAGE = 34;

const odds = createMockOddsSource();
const SNAP = odds.getSnapshot("JOR-ESP");
const RESULT = odds.getResult("JOR-ESP");

// Demo-Mitspieler mit ihren (bereits abgegebenen) Tipps auf JOR-ESP.
const DEMO_TIPS = [
  { userId: "u-du",    name: "Du",    avatar: "fan-schal",   tip: { home: 4, away: 1, goals: { home: ["Al-Naimat", "Al-Naimat"], away: ["Yamal", ""] } } },
  { userId: "u-lena",  name: "Lena",  avatar: "fan-rakete",  tip: { home: 2, away: 1, goals: { home: [], away: ["Yamal", ""] } } },
  { userId: "u-kemal", name: "Kemal", avatar: "fan-trommel", tip: { home: 1, away: 1, goals: { home: [], away: ["Yamal", ""] } } },
  { userId: "u-max",   name: "Max",   avatar: "fan-bier",    tip: { home: 2, away: 1, goals: { home: [], away: [] } } },
  { userId: "u-jonas", name: "Jonas", avatar: "fan-clown",   tip: { home: 0, away: 2, goals: { home: [], away: ["Oyarzabal", ""] } } },
];

const ROUND_ID = DEMO_ROUND_ID;

export function createMockStore() {
  // frische Kopien pro Store, damit Schreibvorgänge isoliert sind
  const matches = new Map([
    [SNAP.matchId, {
      id: SNAP.matchId, home: SNAP.home, away: SNAP.away,
      kickoff: SNAP.kickoff, matchday: 14, snapshot: SNAP, result: RESULT,
      // Länderspiel — gehört in keine Liga, sonst stünde es unter „Bundesliga".
      wettbewerb: "demo", phase: "liga",
    }],
    // Mehrere Wettbewerbe: alle Ligen + Champions League liegen im SELBEN
    // Match-Katalog und unterscheiden sich nur über `wettbewerb`/`phase`.
    // Dadurch braucht die Runden-Erstellung keine Sonderfälle — sie filtert
    // über `rules.spiele`, egal ob eine Liga gemeint ist oder fünf.
    // Die Liste der Wettbewerbe steht in `ligen.js` — EINE Quelle für Store,
    // Seed-Skript und Vereinsfilter (bl 306 · pl 380 · pd 380 · sa 380 · cl 159).
    ...alleMatches().map((m) => [m.matchId, {
      id: m.matchId, home: m.home, away: m.away,
      kickoff: m.kickoff, matchday: m.matchday, snapshot: m.snapshot, result: m.result,
      wettbewerb: m.wettbewerb, phase: m.phase,
    }]),
  ]);
  const rounds = new Map([[ROUND_ID, {
    id: ROUND_ID, name: "Freundeskreis", admin_id: "u-du",
    rules: DEFAULT_RULES, join_code: DEMO_JOIN_CODE,
  }]]);
  const presets = new Map();  // Kurzcode → geteiltes Regelwerk (Content-Creator-Codes)
  const members = DEMO_TIPS.map((t) => ({ round_id: ROUND_ID, user_id: t.userId, name: t.name, avatar: t.avatar }));
  // Profile getrennt von der Mitgliedschaft halten — wie in der DB (profiles).
  // Der Demo-Nutzer „Du" hat Premium, damit die Premium-Funktionen beim
  // Entwickeln ohne Backend sichtbar sind; die übrigen bewusst nicht, damit
  // auch der gesperrte Zustand testbar bleibt.
  const profiles = new Map(DEMO_TIPS.map((t) => [t.userId, {
    id: t.userId, display_name: t.name, avatar: t.avatar,
    premium_until: t.userId === "u-du" ? "2099-12-31T00:00:00Z" : null,
  }]));
  const tips = DEMO_TIPS.map((t) => ({
    id: `tip-${t.userId}`, round_id: ROUND_ID, match_id: SNAP.matchId,
    user_id: t.userId, tip: t.tip, snapshot: SNAP,
  }));
  const votes = [];   // Joker-Abstimmung: { round_id, matchday, user_id, ja }
  // Regel-Abstimmung (design/abstimmung-verfassung.md) — eine ANDERE Frage
  // als `votes`: dort geht es um Joker-Spieltage, hier um Änderungen AM
  // REGELWERK. Zwei Listen, damit sie sich nie vermischen.
  const antraege = [];      // { id, round_id, user_id, aspekt, werte, gestellt_am, laeuft_bis, status, veto }
  const antragStimmen = []; // { antrag_id, user_id, ja }
  let antragZaehler = 0;
  // Admin-Freigaben: { round_id, user_id, matchday } — `matchday` ist der
  // RUNDEN-Spieltag (siehe schema.sql).
  const freigaben = [];
  const seasonTips = [];   // Saison-Wetten: { round_id, user_id, wetten_id, wert }

  const nameOf = (userId) => members.find((m) => m.user_id === userId)?.name ?? userId;

  // Ein Tipp → der Roh-Eintrag, aus dem die Engine rechnet. EINE Stelle, weil
  // Leaderboard, Verlauf und Rekorde exakt dieselben Felder brauchen — vorher
  // stand die Abbildung dreimal da und hätte auseinanderlaufen können.
  // `wettbewerb` und `kickoff` gehören dazu: ohne den Wettbewerb verschmelzen
  // im Verlauf die fünf „Spieltag 1" zu einem, ohne den Anpfiff kann die Engine
  // die Spieltage mehrerer Wettbewerbe nicht chronologisch einsortieren.
  const eintragVon = (t) => {
    const m = matches.get(t.match_id);
    return {
      userId: t.user_id, name: nameOf(t.user_id),
      tip: t.tip, snapshot: t.snapshot,
      result: m?.result ?? null,
      // 🔴 `matchId` gehört dazu, seit es die Alleinstellung gibt (09.08.2026):
      // „ich war der Einzige" ist eine Aussage über alle Tipps DESSELBEN
      // Spiels, und ohne diesen Schlüssel lässt sich das nicht gruppieren.
      // Gefunden hat die Lücke `npm run greift` — die Regel war gebaut,
      // getestet und einstellbar und bewegte trotzdem keinen einzigen Punkt.
      matchId: t.match_id,
      matchday: m?.matchday ?? null,
      wettbewerb: m ? wettbewerbVon(m) : null,
      kickoff: m?.kickoff ?? null,
    };
  };

  // Beschluss-Lage einer Runde: `regelnFuer` je Spieltag und das Regelwerk am
  // Saisonende. EINE Stelle für beide Leaderboard-Wege, sonst rechnet der
  // Verlauf mit anderen Regeln als der Endstand.
  // ⚠️ Der Admin steht in `rounds.admin_id` — `round_members` hat KEINE
  // `role`-Spalte (siehe schema.sql). Eine erste Fassung fragte hier
  // `m.role === "admin"`; das war immer falsch, ohne dass etwas fehlschlug:
  // `istAdmin` blieb überall `false`, und ein `antragsrecht: "nurAdmin"` hätte
  // AUCH den Admin abgewiesen. Beim Nachsehen aufgefallen, nicht im Test.
  const beschlussLage = (roundId, rules, achse = null) => regelnFuerSpieltag({
    rules,
    antraege: antraege.filter((a) => a.round_id === roundId).map((a) => ({
      ...a,
      stimmen: antragStimmen.filter((v) => v.antrag_id === a.id)
        .map((v) => ({ userId: v.user_id, ja: v.ja })),
    })),
    mitglieder: members.filter((m) => m.round_id === roundId)
      .map((m) => ({ userId: m.user_id, istAdmin: m.user_id === rounds.get(roundId)?.admin_id })),
    // Ohne mitgegebene Achse selbst bauen — ebenfalls über die Spiele DIESER
    // Runde, sonst kämen zwei verschiedene Runden-Spieltage heraus, je nachdem
    // wer `beschlussLage` aufruft.
    achse: achse ?? zeitachse(
      rundenSpieleVon([...matches.values()], rounds.get(roundId)),
      rules?.zeitachse,
    ),
  });

  // Der Stand VOR dem Rad — Grundlage von `getLeaderboard` UND
  // `getDrehradZiehungen`. Bewusst eine Funktion und nicht zweimal
  // hingeschrieben: sobald die Rad-Ansicht ihren Kontext selbst baut, baut
  // sie ihn anders (genau das war der Befund oben).
  async function standVorDemRad(roundId) {
    const round = rounds.get(roundId);
    const rules = round?.rules ?? DEFAULT_RULES;
    const roundTips = tips.filter((t) => t.round_id === roundId);
    // ⚠️ Über die Spiele DIESER Runde, nicht über den Katalog — siehe
    // `listRoundMatches`. Wird gleich mehrfach gebraucht (Ersatz-Tipps,
    // Zeitachse, Saison-Wetten).
    const rundenSpiele = rundenSpieleVon([...matches.values()], round);
    // 🔴 Ersatz-Tipps (Versäumnis) gehören in DIESELBE Eintragsliste wie echte
    // Tipps — sonst müsste jeder Wertungs-Weg sie einzeln kennen. Sie tragen
    // `ersatz: true` und einen `malusFaktor`, `scoreLeaderboard` verrechnet
    // beides. `autoTipsFor` war bis 06.08.2026 von niemandem aufgerufen: die
    // ganze Einstellung lief ins Leere.
    const entries = [
      ...roundTips.map(eintragVon),
      ...ersatzEintraege({
        matches: rundenSpiele, tips: roundTips, rules,
        userIds: members.filter((m) => m.round_id === roundId).map((m) => m.user_id),
        nameOf,
      }),
    ];
    // Die Zeitachse EINMAL bauen: sie wird gleich dreimal gebraucht
    // (Beschluss-Lage, Drehrad-Plan, Runden-Spieltag der Tipps).
    const achse = zeitachse(rundenSpiele, rules?.zeitachse);
    const { regelnFuer, amEnde } = beschlussLage(roundId, rules, achse);
    let board;
    let verlauf = null;
    // Verlaufsabhängige Regeln (Aufhol-Bonus, Saisonform) brauchen den ganzen
    // Verlauf. WELCHE das sind, entscheidet die Engine an einer Stelle —
    // hier stand vorher `rules.aufholen?.enabled`, und mit der Saisonform war
    // das still falsch.
    // ⚠️ BEIDE fragen: `brauchtVerlauf` entscheidet, ob überhaupt über den
    // Verlauf gerechnet wird, und es liest sonst nur das ANGELEGTE
    // Regelwerk. Beschließt eine Runde den Anschluss-Bonus erst an Spieltag
    // 20, ist er in `round.rules` aus — der Verlauf würde gar nicht gebaut
    // und der Bonus fiele still aus. Genau die halbe Verkabelung, die
    // design/kontaktstellen.md auflistet.
    if (brauchtVerlauf(rules) || brauchtVerlauf(amEnde)) {
      // `einsaetzeAusTipps` braucht `matchId` für den Gleichstand-Fall
      // (zwei Duell-Einsätze am selben Spieltag mit identischem Kickoff,
      // z. B. zwei zeitgleich angepfiffene Bundesliga-Spiele) — `entries`
      // (aus `eintragVon`) trägt das Feld nicht, `roundTips` schon
      // (`match_id`), deshalb hier separat angereichert statt `entries`
      // selbst zu verändern.
      const einsaetze = einsaetzeAusTipps(roundTips.map((t) => ({ ...eintragVon(t), matchId: t.match_id })));
      verlauf = scoreLeaderboardHistory(entries, rules, einsaetze, regelnFuer, null, roundId);
      board = verlauf.length ? verlauf[verlauf.length - 1].board : [];
    } else {
      board = scoreLeaderboard(entries, rules, regelnFuer);
    }
    // Saison-Punkte drauf (und reine Saison-Tipper ergänzen) — siehe
    // saisonBoard.js. Der Mock hält die Saison-Tipps ALLER Runden in einer
    // Liste, deshalb hier nach Runde filtern.
    // 🔴 Über die Spiele DIESER Runde, nicht über den Katalog. Gemessen am
    // 05.08.2026: über den ganzen Katalog gerechnet ist der „Meister" einer
    // Bundesliga-Runde der FC Barcelona — `tabelle()` baut eine Tabelle über
    // ALLE übergebenen Spiele, und der Katalog trägt fünf Wettbewerbe.
    // Torschützenkönig und beste Offensive genauso.
    board = withSaisonPunkte({
      board, rules, matches: rundenSpiele, nameOf,
      seasonTips: seasonTips.filter((s) => s.round_id === roundId),
    });
    // Drehrad-Punkte drauf (drehradBoard.js) — ERST Saison, DANN Rad: beide
    // sortieren und ranken das Board neu, der jeweils letzte Aufruf gewinnt.
    // Es darf nur EINE Reihenfolge geben, sonst hängt die Rangfolge am
    // Aufrufort statt an der Regel. Saison zuerst, weil Saison-Wetten auch
    // Spieler neu ins Board aufnehmen (reine Saison-Tipper) — das Rad zahlt
    // bewusst NUR an, wer schon im Board steht (siehe drehradBoard.js), muss
    // also NACH dieser Ergänzung laufen, sonst verpasst ein reiner
    // Saison-Tipper seine Rad-Ziehung.
    //
    // `kontext` macht `wer`/`werWert` UND die 5.0-Invariante („kein Rad ohne
    // Tipp") scharf (Nachtrag zu design/kontaktstellen.md, 2026-08-04) —
    // ohne ihn zöge jeder im Board, unabhängig von diesen Einstellungen.
    // `board` ist der bereits fertige (Saison-)Stand von oben — dieselbe
    // Wahl wie in `Tippabgabe.jsx`s `pruefeJokerEinsatz`. `tipps` kommt aus
    // `roundTips`, das hier schon vorliegt, nur um `matchId`/`matchday`
    // ergänzt. `adminFreigaben`/`letzteEinsaetze` bleiben leer: es gibt noch
    // keinen Speicherort für Admin-Freigaben (siehe Schritt 1) und keine
    // eigene Abklingzeit-Historie fürs Rad — ein am `jokerBasis.standard`
    // gesetzter `abklingzeit`-Wert bliebe dadurch für das Rad wirkungslos.
    //
    // 🔴 `matchday` ist hier der RUNDEN-Spieltag, nicht der Liga-Spieltag.
    // `drehradPlan` verteilt die Drehungen über RUNDEN-Spieltage (1…N);
    // `kontextFuer` in drehradBoard.js vergleicht `t.matchday === spieltag`
    // direkt damit. Mit dem Liga-Spieltag wären das zwei verschiedene
    // Skalen: „kein Rad ohne Tipp" hätte in einer Runde über fünf
    // Wettbewerbe den falschen Tag geprüft — dieselbe Fehlerklasse, die bei
    // den Jokern schon einmal fünf Joker pro Woche ergeben hätte
    // (siehe Zeitachse in CLAUDE.md).
    const kontext = {
      board,
      tipps: roundTips.map((t) => {
        const m = matches.get(t.match_id);
        return {
          userId: t.user_id, matchId: t.match_id,
          matchday: m ? rundenSpieltagVon(achse, m) : null,
        };
      }),
      // Admin-Freigaben aus der Ablage statt einer leeren Liste — sonst
      // lehnt `wer: "adminFreigabe"` hier weiter konsequent ab.
      adminFreigaben: freigaben.filter((f) => f.round_id === roundId)
        .map((f) => ({ userId: f.user_id, spieltag: f.matchday })),
      letzteEinsaetze: [],
    };
    // ⚠️ Und die LÄNGE ebenso: die feste 34 wäre die Liga-Saison. Eine Runde
    // über mehrere Wettbewerbe hat mehr Runden-Spieltage (gemessen: 42) —
    // mit 34 bekämen die letzten acht nie eine Drehung.
    // `entries`, `regelnFuer` und `verlauf` reisen mit, damit `getSpieltagsPunkte`
    // und `getLeaderboardHistory` auf DENSELBEN Einträgen rechnen wie das
    // Leaderboard — inklusive der Ersatz-Tipps aus dem Versäumnis. `verlauf` ist
    // `null`, wenn keine Regel ihn braucht; wer ihn trotzdem will, baut ihn aus
    // `entries` nach (siehe `verlaufVon`).
    return {
      board, rules, kontext, entries, regelnFuer, verlauf, roundTips,
      spieltage: achse.length || SPIELTAGE, bespielt: bespielteSpieltage(achse),
    };
  }

  // Der Verlauf einer Runde — EINE Stelle. Vorher baute `getLeaderboardHistory`
  // ihn aus den rohen Tipps, `standVorDemRad` aus `entries` (mit Ersatz-Tipps):
  // zwei Kurven für dieselbe Runde, sobald das Versäumnis eingeschaltet war.
  async function verlaufVon(roundId) {
    const { verlauf, entries, rules, regelnFuer, roundTips } = await standVorDemRad(roundId);
    if (verlauf) return verlauf;
    const einsaetze = einsaetzeAusTipps(roundTips.map((t) => ({ ...eintragVon(t), matchId: t.match_id })));
    return scoreLeaderboardHistory(entries, rules, einsaetze, regelnFuer, null, roundId);
  }

  // Der rohe Schreibvorgang ohne jede Prüfung — Grundlage von `saveTip` und
  // `seedTip`. Steht hier oben und nicht im Objektliteral, weil `saveTip` sie
  // aufruft.
  function seedTip({ roundId, matchId, userId, tip, snapshot }) {
    const existing = tips.find((t) => t.round_id === roundId && t.match_id === matchId && t.user_id === userId);
    if (existing) { existing.tip = tip; existing.snapshot = snapshot; return existing; }
    const row = { id: `tip-${userId}-${matchId}`, round_id: roundId, match_id: matchId, user_id: userId, tip, snapshot };
    tips.push(row);
    return row;
  }

  function seedSeasonTip({ roundId, userId, wettenId, wert }) {
    const existing = seasonTips.find((s) => s.round_id === roundId && s.user_id === userId && s.wetten_id === wettenId);
    if (existing) { existing.wert = wert; return existing; }
    const row = { round_id: roundId, user_id: userId, wetten_id: wettenId, wert };
    seasonTips.push(row);
    return row;
  }

  return {
    async listMatches() { return [...matches.values()]; },

    // 🔴 Die Spiele DIESER RUNDE — der ganze Katalog ist etwas anderes.
    //
    // `matches` trägt alle Wettbewerbe. Eine Runde hat aber einen
    // `team_filter`, und alles, was „Spieltag der Runde" heißt, muss über IHRE
    // Spiele gerechnet werden: die Zeitachse, und damit Joker-Verteilung,
    // Budget-Perioden, Admin-Freigaben, Rad-Tage.
    //
    // Gemessen am 05.08.2026: über den Katalog gerechnet liegt der
    // Bundesliga-Spieltag 20 auf Runden-Spieltag 27, über die Spiele der Runde
    // auf 26 — und 7 von 42 Runden-Spieltagen enthielten gar kein Spiel dieser
    // Runde. Beide Zahlen waren gleichzeitig im Umlauf: Spielwahl, Münz- und
    // Narrenstand rechneten über die gefilterten Spiele, Store, Tippabgabe,
    // Rad und Freigaben über den Katalog.
    async listRoundMatches(roundId) {
      const round = rounds.get(roundId);
      return rundenSpieleVon([...matches.values()], round);
    },
    async getMatch(id) { return matches.get(id) ?? null; },

    // Spieltag öffnen = den Zustand EINFRIEREN (aktuell: das Big Game).
    // Gehört in die Daten-Schicht, weil nur sie schreiben kann — die Rechnung
    // selbst steht in spieltagOeffnen.js. Idempotent: ein zweiter Aufruf lässt
    // alles, wie es ist, sonst änderte sich der Wert eines abgegebenen Tipps
    // rückwirkend (dieselbe Regel wie beim Quoten-Snapshot).
    // `wettbewerb` ist nötig, seit es mehrere gibt: „Spieltag 1" existiert in
    // der Bundesliga UND in der Champions League. Ohne den Schlüssel würden
    // beide als EIN Spieltag geöffnet und das Big Game aus 36 statt 18 Spielen
    // gewählt — und die Tabelle wäre aus zwei Wettbewerben gemischt.
    async openMatchday(roundId, matchday, wettbewerb = DEFAULT_WETTBEWERB) {
      const alle = [...matches.values()];
      const imWettbewerb = (m) => wettbewerbVon(m) === wettbewerb;
      const desSpieltags = alle.filter((m) => m.matchday === matchday && imWettbewerb(m));
      const rules = rounds.get(roundId)?.rules ?? DEFAULT_RULES;
      const ergebnis = spieltagOeffnen({
        spieltag: matchday,
        matches: desSpieltags,
        // Nur WIRKLICH gespielte Spiele in die Tabelle. Der Mock hat für die
        // ganze simulierte Saison Ergebnisse vorab (bundesligaData rechnet sie
        // beim Erzeugen aus) — ohne den Kickoff-Vergleich wäre die Tabelle beim
        // Öffnen des 1. Spieltags die ENDTABELLE, und das Big Game würde nach
        // Plätzen gewählt, die noch niemand kennt. In der Live-DB ist `result`
        // vor dem Anpfiff NULL (siehe seed-matches.sql), dort stimmt es von
        // selbst; hier zieht die Demo dasselbe Verhalten nach.
        gespielt: alle.filter((m) => m.result && imWettbewerb(m)
          && new Date(m.kickoff).getTime() <= Date.now()),
        rules,
      });
      for (const [id, snapshot] of Object.entries(ergebnis.snapshots)) {
        const m = matches.get(id);
        if (m) matches.set(id, { ...m, snapshot });
      }
      return ergebnis;
    },

    // ── Profil (Anzeigename + Avatar) ───────────────────────
    async getProfile(userId) {
      return profiles.get(userId) ?? null;
    },
    // Nur die übergebenen Felder ändern; beide werden gesäubert, damit weder
    // ein leerer Name noch eine unbekannte Avatar-id im Profil landet.
    async updateProfile(userId, { displayName, avatar } = {}) {
      const vorher = profiles.get(userId) ?? { id: userId, display_name: userId, avatar: DEFAULT_AVATAR };
      const name = displayName === undefined ? vorher.display_name : (sanitizeDisplayName(displayName) ?? vorher.display_name);
      const bild = avatar === undefined ? vorher.avatar : sanitizeAvatar(avatar);
      const neu = { ...vorher, display_name: name, avatar: bild };
      profiles.set(userId, neu);
      // Mitglieder-Liste mitziehen, damit Leaderboard/Runde sofort stimmen.
      for (const m of members) if (m.user_id === userId) { m.name = name; m.avatar = bild; }
      return neu;
    },

    async getRound(id) { return rounds.get(id) ?? null; },
    async getRoundByCode(code) {
      return [...rounds.values()].find((r) => r.join_code === code) ?? null;
    },
    async listMembers(roundId) {
      return members.filter((m) => m.round_id === roundId);
    },
    async listRoundsForUser(userId) {
      const roundIds = new Set(members.filter((m) => m.user_id === userId).map((m) => m.round_id));
      return [...rounds.values()].filter((r) => roundIds.has(r.id));
    },

    // Kurzcode-Presets (Content-Creator-Codes): Regelwerk unter einem kurzen,
    // teilbaren Code speichern statt als langem Text-Creator-Code.
    async publishPreset({ name, rules, creatorId }) {
      let code = generateJoinCode();
      while (presets.has(code)) code = generateJoinCode();
      const row = {
        code, name: (name ?? "").trim() || "Regelwerk",
        rules: sanitizeRules(rules), creator_id: creatorId ?? null,
      };
      presets.set(code, row);
      return row;
    },
    async getPresetByCode(code) {
      return presets.get((code ?? "").trim().toUpperCase()) ?? null;
    },
    async joinRound({ roundId, userId, name }) {
      if (!members.some((m) => m.round_id === roundId && m.user_id === userId)) {
        members.push({ round_id: roundId, user_id: userId, name: name ?? userId });
      }
      return { round_id: roundId, user_id: userId };
    },
    async createRound({ name, adminId, adminName, rules, teamFilter }) {
      let joinCode = generateJoinCode();
      while ([...rounds.values()].some((r) => r.join_code === joinCode)) joinCode = generateJoinCode();
      // Premium-Durchsetzung: Premium-Bestandteile des Regelwerks greifen nur,
      // wenn der ADMIN berechtigt ist. Hier — nicht erst in der UI, die ist
      // umgehbar.
      const admin = profiles.get(adminId) ?? null;
      const round = {
        id: `r-${joinCode.toLowerCase()}`,
        name: (name ?? "").trim() || "Neue Runde",
        admin_id: adminId,
        rules: applyEntitlements(sanitizeRules(rules), { premium: isPremium(admin) }),
        join_code: joinCode,
        team_filter: Array.isArray(teamFilter) && teamFilter.length >= 2 ? teamFilter : null,
        // 🔴 Die GANZE Spielauswahl einfrieren, nicht nur die Vereinsliste
        // (09.08.2026). Vorher hielt `team_filter` allein fest, was beim
        // Anlegen herauskam — Wettbewerbe, Phasen, Spieltag-Bereich, feste
        // Liste und die Liga-Sonderregeln gingen dabei verloren. Gemessen:
        // „nur Bundesliga" ergab 1943 statt 306 Spiele.
        //
        // ⚠️ Eingefroren und NICHT live aus `rules.spiele` gelesen: eine Runde
        // kann ihr Regelwerk per Abstimmung ändern, und ein Beschluss darf
        // nicht rückwirkend ändern, welche Spiele je dazugehört haben. Dieselbe
        // Kante wie beim Quoten-Snapshot.
        spiele: rundenAuswahl({ spiele: sanitizeRules(rules).spiele, teamFilter }),
      };
      rounds.set(round.id, round);
      members.push({ round_id: round.id, user_id: adminId, name: adminName ?? adminId });
      return round;
    },

    // 🔴 DIE zentrale Fairness-Regel des Spiels: geschlossen wird beim Anpfiff.
    //
    // Gemessen am 06.08.2026: sie stand NUR in `Tippabgabe.jsx`. Über den Store
    // ließ sich auf das Demo-Spiel tippen, dessen Anpfiff zwei Monate zurück
    // liegt — angenommen, gespeichert und mit **1440 Punkten** für den
    // „exakten Treffer" gewertet. Dritter Fall derselben Klasse an einem Tag
    // (Saison-Fenster, Duell-Ziele, und jetzt der wichtigste).
    //
    // ⚠️ Das ist KEINE Sicherheitsgrenze. Wer die Datenbank direkt anspricht,
    // kommt weiterhin durch — dafür braucht es den Trigger aus dem
    // RLS-Durchgang. Es verhindert, dass UNSER EIGENER Code es falsch macht,
    // und sorgt dafür, dass die Regel EINMAL formuliert ist: `tippStatus`.
    async saveTip({ roundId, matchId, userId, tip, snapshot }) {
      const match = matches.get(matchId);
      const round = rounds.get(roundId);
      const status = tippStatus(match, round?.rules ?? DEFAULT_RULES, Date.now(),
        spieltagStarts(rundenSpieleVon([...matches.values()], round)));
      if (!status.offen) {
        throw new Error(`Dieses Spiel ist nicht tippbar: ${status.text}.`);
      }
      // 🔴 Dieselbe Lücke eine Ebene tiefer, und der älteste offene Befund des
      // Kanals: die Duell-Schutzregeln (`zielWahl`, `maxProZiel`, `immun`,
      // `kosten`, Limit-Klassen) standen NUR in `Tippabgabe.jsx`. Über den
      // Store ließ sich jeder treffen, beliebig oft, umsonst. Die Prüfung
      // liegt in `duellPruefung.js` — EINE Fassung für beide Stores; hier
      // steht nur der Aufruf, und er kostet bei einem Tipp ohne Duell nichts.
      const duellPruef = await pruefeDuellEinsatz({ store: this, roundId, matchId, userId, tip });
      if (!duellPruef.erlaubt) {
        throw new Error(`Dieser Duell-Einsatz ist nicht möglich: ${duellPruef.grund}`);
      }
      return seedTip({ roundId, matchId, userId, tip, snapshot });
    },

    // ⚠️ NUR für Messläufe und Tests: schreibt einen Tipp OHNE die Prüfung des
    // Tipp-Fensters. `npm run greift` und `npm run anzeige` legen ganze
    // Saisons auf einmal an; kein einziger Zeitpunkt macht 54 Spiele
    // gleichzeitig tippbar (das früheste ist längst angepfiffen, wenn das
    // späteste aufgeht). Bewusst ein EIGENER, deutlich benannter Name statt
    // eines `pruefen: false`-Schalters an `saveTip` — ein Schalter wird
    // irgendwann aus Bequemlichkeit im Spielbetrieb gesetzt, ein Name mit
    // diesem Kommentar nicht.
    seedTip,
    async listTips({ roundId, matchId }) {
      return tips.filter((t) => t.round_id === roundId && (!matchId || t.match_id === matchId));
    },

    // ── Joker-Abstimmung ────────────────────────────────────
    // Eine Stimme je Nutzer/Runde/Spieltag; erneutes Abstimmen überschreibt.
    async saveVote({ roundId, matchday, userId, ja, wettbewerb = "bl" }) {
      // Wettbewerb gehoert in den Schluessel: BL-Spieltag 1 und CL-Spieltag 1
      // sind zwei verschiedene Abstimmungen.
      const existing = votes.find((v) => v.round_id === roundId && v.matchday === matchday
        && v.user_id === userId && (v.wettbewerb ?? "bl") === wettbewerb);
      if (existing) { existing.ja = ja === true; return existing; }
      const row = { round_id: roundId, matchday, wettbewerb, user_id: userId, ja: ja === true };
      votes.push(row);
      return row;
    },
    async listVotes({ roundId }) {
      return votes.filter((v) => v.round_id === roundId);
    },

    // ── Regel-Abstimmung: Anträge und Stimmen ───────────────
    // ⚠️ Nicht `saveVote`/`listVotes` — das ist die Joker-Abstimmung. Hier geht
    // es um Änderungen am Regelwerk (design/abstimmung-verfassung.md).
    //
    // `laeuftBis` wird beim Anlegen EINGEFROREN und nicht laufend nachgerechnet:
    // ändert der Admin die Dauer, während eine Abstimmung läuft, darf sich
    // deren Ende nicht mitten im Verfahren verschieben. `wirktAb` in
    // regelAbstimmung.js liest genau dieses Feld.
    async createAntrag({ roundId, userId, aspekt, werte, gestelltAm, laeuftBis }) {
      const row = {
        id: `antrag-${++antragZaehler}`,
        round_id: roundId, user_id: userId, aspekt,
        werte: werte ?? {},
        gestellt_am: gestelltAm ?? null,
        laeuft_bis: laeuftBis ?? null,
        status: "offen",
        veto: false,
      };
      antraege.push(row);
      return row;
    },

    // Anträge samt ihren Stimmen — `zaehleAus` in regelAbstimmung.js erwartet
    // `antrag.stimmen`, also wird die Liste hier schon zusammengesetzt statt in
    // jedem Screen erneut.
    async listAntraege({ roundId, status = null }) {
      return antraege
        .filter((a) => a.round_id === roundId && (!status || a.status === status))
        .map((a) => ({
          ...a,
          stimmen: antragStimmen
            .filter((s) => s.antrag_id === a.id)
            .map((s) => ({ userId: s.user_id, ja: s.ja })),
        }));
    },

    // Eine Stimme je Nutzer und Antrag; erneutes Abstimmen überschreibt —
    // dieselbe Regel wie bei der Joker-Abstimmung.
    async saveAntragStimme({ antragId, userId, ja }) {
      const existing = antragStimmen.find((s) => s.antrag_id === antragId && s.user_id === userId);
      if (existing) { existing.ja = ja === true; return existing; }
      const row = { antrag_id: antragId, user_id: userId, ja: ja === true };
      antragStimmen.push(row);
      return row;
    },

    // ── Admin-Freigaben ─────────────────────────────────────
    // `jokerBasis.wer: "adminFreigabe"` braucht sie; ohne Speicherort lehnte
    // die Prüfung überall ab. ⚠️ `matchday` ist der RUNDEN-Spieltag.
    async listAdminFreigaben({ roundId }) {
      return freigaben.filter((f) => f.round_id === roundId)
        .map((f) => ({ userId: f.user_id, spieltag: f.matchday }));
    },

    // Ein Schalter, kein Zähler: `an: false` nimmt die Freigabe zurück.
    async setAdminFreigabe({ roundId, userId, matchday, an = true }) {
      const idx = freigaben.findIndex((f) => f.round_id === roundId
        && f.user_id === userId && f.matchday === matchday);
      if (!an) {
        if (idx >= 0) freigaben.splice(idx, 1);
        return null;
      }
      if (idx >= 0) return freigaben[idx];
      const row = { round_id: roundId, user_id: userId, matchday };
      freigaben.push(row);
      return row;
    },

    // Abschluss oder Veto. Der Store entscheidet NICHT, ob ein Antrag
    // angenommen ist — das rechnet `zaehleAus`; hier wird nur festgehalten,
    // was entschieden wurde.
    async setAntragStatus({ antragId, status, veto }) {
      const a = antraege.find((x) => x.id === antragId);
      if (!a) return null;
      if (status != null) a.status = status;
      if (veto != null) a.veto = veto === true;
      return a;
    },

    // ── Saison-Wetten abgeben ───────────────────────────────
    // Ein Tipp je (Runde, Nutzer, Wette); erneutes Abgeben überschreibt.
    // 🔴 Das Freischalt-Fenster war bis 06.08.2026 ein `disabled`-Attribut.
    // Der Screen zeigte den Zustand richtig an und sperrte das Auswahlfeld —
    // hier kam jede Wette zu jeder Zeit durch. Eine Regel, die nur in der
    // Oberfläche steht, ist eine Vereinbarung.
    //
    // ⚠️ Ersetzt keine Server-Prüfung (siehe RLS-Durchgang in der Roadmap),
    // schließt aber die Lücke zwischen Anzeige und Speicherung: beide fragen
    // jetzt dieselbe Funktion.
    async saveSeasonTip({ roundId, userId, wettenId, wert }) {
      const round = rounds.get(roundId);
      const grund = darfSaisonTippen({
        rules: round?.rules ?? DEFAULT_RULES, id: wettenId,
        matches: rundenSpieleVon([...matches.values()], round),
      });
      if (grund) throw new Error(grund);
      return seedSeasonTip({ roundId, userId, wettenId, wert });
    },

    // ⚠️ Wie `seedTip`: nur für Messläufe. `npm run greift` legt denselben
    // Saison-Tipp im VERGLEICHSSTAND ab, in dem die Saison-Wetten aus sind —
    // sonst misst es zwei verschiedene Runden gegeneinander.
    seedSeasonTip,
    async listSeasonTips({ roundId, userId }) {
      return seasonTips.filter((s) => s.round_id === roundId && (!userId || s.user_id === userId));
    },

    // Leaderboard: Rohdaten sammeln, Engine rechnet. Bei aktivem Aufhol-Bonus
    // über den Verlauf gehen (der Bonus hängt am Stand vor jedem Spieltag) und
    // den Endstand nehmen — scoreLeaderboardHistory wendet applyCatchup an.
    async getLeaderboard(roundId) {
      const { board, rules, kontext, spieltage, bespielt } = await standVorDemRad(roundId);
      return withDrehradPunkte({ board, rules, rundenId: roundId, spieltage, nameOf, kontext, bespielt });
    },

    // 🔴 Die Ziehungen, die das Leaderboard tatsächlich verrechnet hat.
    //
    // `MeinRad.jsx` hat sie bis zum 05.08.2026 selbst nachgerechnet — mit
    // ANDEREN Eingaben: `adminFreigaben: []` statt der echten Freigaben, und
    // als `board` den FERTIGEN Stand inklusive der Rad-Punkte statt des
    // Standes davor. In einer Runde mit „nur nach Freigabe" zeigte der Spieler
    // damit „keine Drehung vorgesehen", während im Leaderboard Punkte dafür
    // standen; bei `abPlatz`/`abRueckstand` konnte die Bedingung an einem
    // anderen Platz geprüft werden als in der Wertung.
    // Es gibt jetzt EINE Rechnung, und der Screen fragt sie ab.
    async getDrehradZiehungen(roundId) {
      const { board, rules, kontext, spieltage, bespielt } = await standVorDemRad(roundId);
      if (!rules?.drehrad?.enabled) return { ziehungen: [], spieltage };
      return {
        ziehungen: drehradZiehungen({
          rules, rundenId: roundId, userIds: board.map((e) => e.userId), spieltage, kontext, bespielt,
        }),
        spieltage,
      };
    },


    // Roh-Einträge einer Runde (Tipp + Snapshot + Ergebnis + matchday, ohne
    // Scoring). Damit lassen sich Leaderboard, Verlauf und Rekorde unter EINEM
    // BELIEBIGEN Regelwerk neu berechnen — Grundlage fürs „was wäre mit Preset
    // X gewesen?" (die Runde selbst wechselt ihr Regelwerk nie).
    async getRoundEntries(roundId) {
      return tips.filter((t) => t.round_id === roundId)
        .map((t) => ({ ...eintragVon(t), matchId: t.match_id }));
    },

    // Ranking-Verlauf: gleiche Rohdaten wie getLeaderboard — die Engine
    // gruppiert daraus je Spieltag und rechnet kumulativ.
    // 🔴 Die Beschluss-Lage einer Runde als Funktion — damit ein Screen, der
    // etwas selbst nachrechnet, unter DENSELBEN Regeln rechnet wie die
    // Wertung. `Historie.jsx` rief `scoreLeaderboardHistory` ohne
    // `regelnFuer` auf: beschlossene Regeländerungen fehlten dort, der
    // gezeigte Verlauf wich also vom Ranking ab, sobald eine Runde etwas
    // beschlossen hatte.
    // ⚠️ Nur für die EIGENE Runde sinnvoll. Wer ein fremdes Preset durchrechnet
    // („was wäre gewesen"), darf sie NICHT anwenden — dort gab es diese
    // Beschlüsse nie.
    // 🔴 Was das Rad AUSSER Punkten auszahlt (Joker, Narren, Modifikatoren) —
    // aus DERSELBEN Vorbereitung wie das Leaderboard. Zwei Screens brauchen
    // das (`Tippabgabe.jsx` fürs Joker-Kontingent und den Narren-Zufluss,
    // `RundenHub.jsx` für den angezeigten Kontostand), und beide bauten sich
    // den Kontext bisher selbst — mit unterschiedlichem Ergebnis.
    async getDrehradBelohnungen(roundId) {
      const { board, rules, kontext, spieltage, bespielt } = await standVorDemRad(roundId);
      if (!rules?.drehrad?.enabled) return { joker: [], narren: [], modifikatoren: [] };
      return drehradBelohnungen({
        rules, rundenId: roundId, userIds: board.map((e) => e.userId), spieltage, kontext, bespielt,
      });
    },

    async getRegelnFuer(roundId) {
      const round = rounds.get(roundId);
      const rules = round?.rules ?? DEFAULT_RULES;
      return beschlussLage(roundId, rules);
    },

    // 🔴 Was hat wer an EINEM Spieltag geholt? — Frage 4 der Runden-Schicht.
    //
    // `ereignisse.auswerten()` erwartet diese Liste als `spieltagsPunkte`, und
    // ohne sie fällt der Trost-Joker („Letzter am Spieltag") stillschweigend
    // aus. Gemessen am 06.08.2026 über eine Bundesliga-Runde mit 36 Spielen und
    // drei Spielern: **0 statt 5 Gutschriften** — die Einstellung war über die
    // Oberfläche einschaltbar und tat nichts. Kein Test hat das gesehen, weil
    // `ereignisse.test.js` die Punkte selbst mitliefert.
    //
    // Gerechnet auf dem FERTIGEN Verlauf (nach Duell-Joker, Saisonform,
    // Aufhol-Bonus): der Letzte eines Spieltags muss derselbe sein, den die
    // Tabelle daneben unten zeigt.
    async getSpieltagsPunkte(roundId) {
      return punkteJeSpieltag(await verlaufVon(roundId));
    },

    // 🔴 Wer hat wen getroffen — Frage 4 der Runden-Schicht, für den
    // Duell-Joker. Das Ranking zeigte bis 06.08.2026 nur die Nettosumme
    // („−340 Duell"); bei einer Mechanik, deren ganzer Sinn ist, dass ein
    // ANDERER es war, ist das die halbe Nachricht.
    //
    // Gerechnet über DENSELBEN Weg wie die Wertung (`sammeln` wird durch
    // `scoreLeaderboardHistory` an `applyDuellJoker` durchgereicht) — die
    // Beträge hängen am Deckel und an der Reihenfolge, eine zweite Fassung
    // liefe auseinander.
    // 🔴 Wie stehen MEINE Saison-Wetten gerade? Der Screen `/saison` zeigte bis
    // 06.08.2026 nur, WAS man getippt hat — nicht, ob es gerade zutrifft. Die
    // Ebene läuft über die ganze Saison, und ihr Zwischenstand war die einzige
    // Zahl im Spiel, die man nirgends sehen konnte.
    //
    // ⚠️ Über `scoreSaison` und über die Spiele DIESER Runde — dieselbe
    // Funktion und dieselbe Grundlage wie `saisonBoard.js` fürs Leaderboard.
    // Der Screen darf das nicht selbst rechnen: über den ganzen Katalog wäre
    // der „Meister" einer Bundesliga-Runde der FC Barcelona (Befund 05.08.).
    async getSaisonStand(roundId, userId) {
      const round = rounds.get(roundId);
      const rules = round?.rules ?? DEFAULT_RULES;
      if (!rules?.saison?.enabled) return { gesamt: 0, treffer: 0, zeilen: [] };
      const tipps = Object.fromEntries(seasonTips
        .filter((t) => t.round_id === roundId && t.user_id === userId)
        .map((t) => [t.wetten_id, t.wert]));
      return scoreSaison({
        matches: rundenSpieleVon([...matches.values()], round),
        tipps, saison: rules.saison,
      });
    },

    async getDuellVorgaenge(roundId) {
      const { entries, rules, regelnFuer, roundTips } = await standVorDemRad(roundId);
      if (!rules?.duell?.enabled) return [];
      const einsaetze = einsaetzeAusTipps(roundTips.map((t) => ({ ...eintragVon(t), matchId: t.match_id })));
      const sammeln = [];
      scoreLeaderboardHistory(entries, rules, einsaetze, regelnFuer, sammeln, roundId);
      return sammeln.map((v) => ({ ...v, vonName: nameOf(v.vonUserId), aufName: nameOf(v.aufUserId) }));
    },

    async getLeaderboardHistory(roundId) {
      return verlaufVon(roundId);
    },
  };
}
