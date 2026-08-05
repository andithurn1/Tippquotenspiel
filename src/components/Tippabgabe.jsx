"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  DEFAULT_RULES, projectTip, weightUsageForMatchday,
  einsatzPlanung, invalidEinsatzMatchdays, spieltagKey,
} from "@/lib/engine";
import { jokerGiltFuerSpieltag } from "@/lib/voting";
import { wettbewerbVon } from "@/lib/wettbewerbe";
import { zeitachse, rundenSchluessel, rundenSpieltagVon, verlaufNachRundenSpieltag } from "@/lib/zeitachse";
import { drehradBelohnungen } from "@/lib/drehradBoard";
import { muenzSchluessel, muenzTaktStatus, periodeLabel, spieltagsFolge } from "@/lib/muenzTakt";
import { bigGameAufschlag } from "@/lib/bigGame";
import { jokerPlan } from "@/lib/jokerPlan";
import { darfJokerSetzen, kontingent, erspielteJoker, standText } from "@/lib/jokerKontingent";
import { pruefeJokerEinsatz, basisFuer, darfWiderrufen, duellBasis as duellBasisVon } from "@/lib/jokerBasis";
import {
  kontoVerlauf, perioden, preisFuer, kannBezahlen, sanitizeBudget, istNarrenKauf, einsaetzeAllerArten,
} from "@/lib/jokerBudget";
import { duellPlan, zulaessigeZiele, einsaetzeAusTipps, DUELL_TYPEN } from "@/lib/duellJoker";
import { pruefeEinsatz } from "@/lib/limitKlassen";
import { getStore } from "@/lib/store";
import { useAuth } from "@/components/AuthProvider";
import { usePrefs } from "@/components/PrefsProvider";
import { useCurrentRound } from "@/components/RoundProvider";
import BackLink from "@/components/BackLink";
import NaheErgebnisse from "@/components/NaheErgebnisse";
import { C, MONO } from "@/lib/theme";
// ⚠️ Der SPIELER bekam hier gerundete Joker-Faktoren zu sehen: bei einem
// eingestellten ×1,15 stand „×1.2" auf dem Knopf. Seit die Faktoren auf dem
// 0,05-Raster stehen, muss die Anzeige mitziehen — Begründung in format.js.
import { fmtFaktor, zahl } from "@/lib/format";
import { Zahl } from "@/components/Eingaben";

// ── Design-Tokens (gleich wie das Abrechnungsfenster) ───────

// ── Eine Quelle: Engine liefert das Regelwerk, der Store das Match ──
// Der Screen RENDERT nur: schaltet der Admin markets.goals aus
// oder picksPerTeam auf 1, ändert sich die Oberfläche mit.
// Regelwerk kommt aus der aktiven Runde (Fallback: Default) — vorher war es hier
// hart verdrahtet, dadurch wirkten Admin-Einstellungen beim Tippen gar nicht.

const risk = (q) =>
  q == null ? { label: "—", col: C.muted }
  : q < 10 ? { label: "Solide", col: C.mint }
  : q < 40 ? { label: "Mutig", col: C.gold }
  : q < 100 ? { label: "Zocker", col: C.coral }
  : { label: "Wahnsinn", col: C.coral };

// Alle Spieler beider Mannschaften in EINER Liste — für den Modus `proSpiel`,
// in dem nicht nach Heim und Gast getrennt wird. Die Reihenfolge bleibt
// Heim-vor-Gast, damit die Auswahl nicht bei jedem Rendern springt.
const alleSpieler = (snap) => ({ ...snap.players.home, ...snap.players.away });

// Dieselbe Vorgabe wie in Drehrad.jsx/JokerVerteilung.jsx/LimitKlassen.jsx —
// für `kontoVerlauf` (design/kontaktstellen.md Abschnitt 5 Punkt 2), das
// selbst keine echte Saisonlänge kennt.
const SPIELTAGE = 34;

// Löst den Anfangs-Pick je Torschützen-Slot.
//
// Zwei Formen, je nach Regelwerk:
//   proTeam  — ein Block je Mannschaft mit `picksPerTeam` Slots (bisher)
//   proSpiel — EIN Block mit `picksProSpiel` Slots aus allen Spielern
// Beide liefern dieselbe Struktur (Array von Slot-Listen), damit der Rest des
// Screens sich nicht um den Modus kümmern muss.
const initialPicks = (snap, scorer, teams) => {
  if (scorer.modus === "proSpiel") {
    const namen = Object.keys(alleSpieler(snap));
    return [Array.from({ length: scorer.picksProSpiel }, (_, i) => ({
      // Verschiedene Vorbelegungen: zweimal derselbe Name wäre sonst als
      // Doppelpack gewertet, ohne dass der Spieler das wollte.
      main: namen[i % Math.max(1, namen.length)], backup: "",
    }))];
  }
  return teams.map((t) => Array.from({ length: scorer.picksPerTeam }, () => ({
    main: Object.keys(snap.players[t.side])[0], backup: "",
  })));
};

// Aus den Slot-Listen den Tipp bauen — die EINE Stelle, die beide Modi kennt.
//
// ⚠️ Die gespeicherte Form bleibt in beiden Fällen `{ home, away }`. Im Modus
// `proSpiel` landen alle Namen unter `home`, weil es dort keine Trennung gibt;
// `scoreGoals` führt beide Seiten ohnehin zusammen und schlägt jeden Namen auf
// beiden Mannschaften nach. Dadurch bleiben abgegebene Tipps über einen
// Moduswechsel hinweg gültig — und die Datenbank muss sich nicht ändern.
const goalsAusPicks = (picks, scorer) => {
  const namen = (liste) => (liste ?? []).map((p) => p.main).filter(Boolean);
  if (scorer.modus === "proSpiel") return { home: namen(picks[0]), away: [] };
  return { home: namen(picks[0]), away: namen(picks[1]) };
};

export default function Tippabgabe({ matchId }) {
  const { user } = useAuth();
  const { prefs } = usePrefs();
  const { roundId } = useCurrentRound();
  const [match, setMatch] = useState(null);
  const [h, setH] = useState(2);
  const [a, setA] = useState(1);
  const [roundName, setRoundName] = useState(null);
  const [RULES, setRules] = useState(DEFAULT_RULES);
  const scorer = RULES.markets.goals;
  const [picks, setPicks] = useState(null);
  const [done, setDone] = useState(false);
  // idle | saving | saved | guest | error | einsatzUngueltig | jokerUngueltig
  // | narrenUngueltig | klasseUngueltig | widerrufUngueltig
  const [saveState, setSaveState] = useState("idle");
  // Nur befüllt, wenn `saveState === "einsatzUngueltig"` — der ausformulierte
  // Grund, warum der Spieltag die Einsatz-Regeln verletzt.
  const [einsatzGrund, setEinsatzGrund] = useState("");
  // Nur befüllt, wenn `saveState === "jokerUngueltig"` — der ausformulierte
  // Grund, warum `pruefeJokerEinsatz` (design/kontaktstellen.md Abschnitt 5
  // Punkt 1) den Einsatz abgelehnt hat.
  const [jokerGrund, setJokerGrund] = useState("");
  // Nur befüllt, wenn `saveState === "narrenUngueltig"` — der ausformulierte
  // Grund, warum `kannBezahlen` (design/kontaktstellen.md Abschnitt 5 Punkt 2)
  // diesen Joker-Kauf abgelehnt hat.
  const [narrenGrund, setNarrenGrund] = useState("");
  // Nur befüllt, wenn `saveState === "klasseUngueltig"` — der ausformulierte
  // Grund, warum `pruefeEinsatz` (design/kontaktstellen.md Abschnitt 5
  // Punkt 5, limitKlassen.js) diesen Joker- oder Duell-Einsatz abgelehnt hat.
  const [klasseGrund, setKlasseGrund] = useState("");
  // Nur befüllt, wenn `saveState === "widerrufUngueltig"` — der ausformulierte
  // Grund, warum `darfWiderrufen` (design/kontaktstellen.md Abschnitt 5
  // Punkt 5, jokerBasis.js) das Entfernen/Verändern eines zuvor gesetzten
  // Jokers oder Duells abgelehnt hat.
  const [widerrufGrund, setWiderrufGrund] = useState("");
  // Gewichtung dieses Spiels: Flag (Modus „einzel") bzw. Faktor (Modus „ranking").
  const [joker, setJoker] = useState(false);
  const [gewicht, setGewicht] = useState(1);
  // Duell-Joker (design/duell-joker.md, design/kontaktstellen.md Abschnitt 5
  // Punkt 4): gewähltes Ziel (`userId`) und gewählte Art ("klau"/"block").
  // `null` = keine Auswahl = kein Duell — kein Zwang, siehe dortiger Plan.
  const [duellZiel, setDuellZiel] = useState(null);
  const [duellTypGewaehlt, setDuellTypGewaehlt] = useState(null);
  // Schnappschuss dessen, was beim Laden BEREITS gespeichert war — Grundlage
  // für `darfWiderrufen` (design/kontaktstellen.md Abschnitt 5 Punkt 5,
  // jokerBasis.js): nur ein VORHER gesetzter Joker/Duell, der jetzt entfernt
  // oder verändert wird, ist ein Widerruf. „Vorher keiner, jetzt einer" ist
  // keiner — dafür bleibt dieser Schnappschuss unangetastet auf der Vorgabe.
  const [urspruenglich, setUrspruenglich] = useState({ joker: false, gewicht: 1, duellZiel: null, duellTyp: null });
  // Hat der Spieler den Einsatz selbst angefasst (oder lag schon einer vor)?
  // Solange nicht, gilt der berechnete Vorschlag statt des rohen `gewicht`.
  // ⚠️ Muss HIER stehen, vor dem frühen `return` weiter unten — die Rechnung
  // dazu braucht `planung` und liegt deshalb danach, der Zustand aber nicht.
  const [einsatzBeruehrt, setEinsatzBeruehrt] = useState(false);
  // Andere Tipps des Nutzers in dieser Runde — für „welche Gewichte am selben
  // Spieltag sind schon vergeben" (Ranking-Modus).
  const [meineTips, setMeineTips] = useState([]);
  // Tipps ALLER Spieler der Runde, für `kontoVerlauf` angereichert um
  // `matchday` (design/kontaktstellen.md Abschnitt 5 Punkt 2) — `meineTips`
  // reicht dafür nicht: `spielerInPeriode` (Preis „knappheit") braucht die
  // Käufe der ANDEREN Spieler. `listTips({ roundId })` liefert ohnehin schon
  // alle, `meineTips` ist nur die gefilterte Teilmenge davon.
  const [alleTipps, setAlleTipps] = useState([]);
  // Eigene Roh-Einträge der Runde — Grundlage für die ERSPIELTEN Joker
  // (ereignisse.js rechnet aus Tipps + Ergebnissen).
  const [meineEintraege, setMeineEintraege] = useState([]);
  const [votes, setVotes] = useState([]);   // Joker-Abstimmung der Runde
  const [alleMatches, setAlleMatches] = useState([]);  // für die Zeitachse der Runde
  // Tabellenstand der Runde — für die `wer`-Modi `abPlatz`/`abRueckstand`
  // aus jokerBasis.js (design/kontaktstellen.md Abschnitt 5 Punkt 1).
  const [board, setBoard] = useState([]);
  // Spieltag-für-Spieltag-Historie des Leaderboards — für die Budget-Quellen
  // `rueckstand`/`platzierung` in `kontoVerlauf` (design/kontaktstellen.md
  // Abschnitt 5 Punkt 2). `[{ matchday, board }]`, exakt die Form, die
  // `budgetVerlauf` als `stand` erwartet.
  const [leaderboardHistory, setLeaderboardHistory] = useState([]);
  // Admin-Freigaben der Runde, `[{ userId, spieltag }]` mit RUNDEN-Spieltag —
  // die Form, die `darfEinsetzen` als `kontext.adminFreigaben` erwartet.
  const [adminFreigaben, setAdminFreigaben] = useState([]);

  useEffect(() => {
    let live = true;
    getStore().getMatch(matchId).then((m) => {
      if (!live || !m) return;
      setMatch(m);
      const teams = [{ side: "home", name: m.snapshot.home }, { side: "away", name: m.snapshot.away }];
      setPicks(initialPicks(m.snapshot, scorer, teams));
    });
    return () => { live = false; };
    // Picks hängen an der Pick-Anzahl des Regelwerks — kommt es später aus der
    // Runde nach, werden sie einmal neu aufgebaut.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, scorer.picksPerTeam, scorer.picksProSpiel, scorer.modus]);

  useEffect(() => {
    let live = true;
    getStore().getRound(roundId).then((r) => {
      if (!live) return;
      setRoundName(r?.name ?? null);
      setRules(r?.rules ?? DEFAULT_RULES);
    }).catch(() => {});
    return () => { live = false; };
  }, [roundId]);

  // Eigene Tipps laden (für belegte Ranking-Gewichte am selben Spieltag) und
  // ein evtl. schon gesetztes Gewicht/den Joker dieses Spiels vorbelegen.
  // matchday je Tipp fehlt in den Roh-Rows → aus dem Match-Katalog nachreichen.
  useEffect(() => {
    if (!user) return;
    let live = true;
    Promise.all([
      getStore().listTips({ roundId }), getStore().listMatches(), getStore().listVotes({ roundId }),
      getStore().getLeaderboard(roundId), getStore().getLeaderboardHistory(roundId),
      getStore().listAdminFreigaben({ roundId }),
    ]).then(([tips, ms, vs, lb, history, freigaben]) => {
      if (!live) return;
      setVotes(vs);
      setBoard(lb);
      setLeaderboardHistory(history);
      setAdminFreigaben(freigaben ?? []);
      // Wettbewerb mit anreichern — der Gewichte-Schlüssel ist wettbewerb+matchday.
      // `kickoff` zusätzlich für `einsaetzeAusTipps` (Gleichstand-Fall bei
      // zeitgleich angepfiffenen Spielen desselben Spieltags).
      const infoOf = new Map(ms.map((m) => [m.id, {
        matchday: m.matchday ?? null, wettbewerb: wettbewerbVon(m), kickoff: m.kickoff ?? null,
      }]));
      const eigene = tips
        .filter((t) => t.user_id === user.id)
        .map((t) => ({
          match_id: t.match_id,
          matchday: infoOf.get(t.match_id)?.matchday ?? null,
          wettbewerb: infoOf.get(t.match_id)?.wettbewerb ?? null,
          gewicht: t.tip?.gewicht,
          // Für `letzteEinsaetze` (Abklingzeit, jokerBasis.js): ob auf DIESEM
          // Tipp der Joker (Modus „einzel") gesetzt wurde.
          joker: t.tip?.joker === true,
        }));
      setMeineTips(eigene);
      // Käufe ALLER Spieler, angereichert um `matchday`/`matchId` — Grundlage
      // für `kontoVerlauf` (design/kontaktstellen.md Abschnitt 5 Punkt 2).
      // `kickoff` und der rohe `tip` zusätzlich für `einsaetzeAusTipps`
      // (design/kontaktstellen.md Abschnitt 5 Punkt 4) — dieselbe Liste
      // bedient jetzt beide Zwecke, statt einer zweiten Anreicherung.
      setAlleTipps(tips.map((t) => ({
        userId: t.user_id,
        matchId: t.match_id,
        matchday: infoOf.get(t.match_id)?.matchday ?? null,
        kickoff: infoOf.get(t.match_id)?.kickoff ?? null,
        gewicht: t.tip?.gewicht,
        joker: t.tip?.joker === true,
        tip: t.tip,
      })));
      setAlleMatches(ms);
      getStore().getRoundEntries(roundId)
        .then((alle) => { if (live) setMeineEintraege(alle.filter((x) => x.userId === user.id)); })
        .catch(() => {});
      const dieser = tips.find((t) => t.user_id === user.id && t.match_id === matchId);
      if (dieser?.tip?.joker === true) setJoker(true);
      // Ein bereits abgegebener Einsatz gewinnt immer gegen den Vorschlag.
      if (Number.isFinite(dieser?.tip?.gewicht)) { setGewicht(dieser.tip.gewicht); setEinsatzBeruehrt(true); }
      // Schon gesetzter Duell-Joker dieses Tipps vorbelegen.
      if (dieser?.tip?.duell?.auf != null) {
        setDuellZiel(dieser.tip.duell.auf);
        setDuellTypGewaehlt(dieser.tip.duell.typ ?? null);
      }
      // Schnappschuss des GELADENEN Zustands für `darfWiderrufen` (siehe
      // Kommentar bei `urspruenglich` oben) — unabhängig davon, was der
      // Spieler danach an den Reglern ändert.
      setUrspruenglich({
        joker: dieser?.tip?.joker === true,
        gewicht: Number.isFinite(dieser?.tip?.gewicht) ? dieser.tip.gewicht : 1,
        duellZiel: dieser?.tip?.duell?.auf ?? null,
        duellTyp: dieser?.tip?.duell?.typ ?? null,
      });
    }).catch(() => {});
    return () => { live = false; };
  }, [roundId, user, matchId]);

  // ⚠️ Alle Hooks stehen VOR dem frühen Return. React verlangt in jedem Render
  // dieselbe Reihenfolge; standen sie unten, wurden sie im Lade-Render
  // übersprungen und der Screen stürzte beim ersten Datensatz mit „change in
  // the order of Hooks" ab. Sie brauchen deshalb Fallbacks für den Zustand
  // „noch nichts geladen".
  const plan = useMemo(() => jokerPlan({
    verteilung: RULES.joker?.verteilung, seed: roundId ?? "", userIds: user ? [user.id] : [],
  }), [RULES.joker?.verteilung, roundId, user]);
  // 🔴 Erspielte Joker kommen aus ZWEI Quellen: den Ereignissen
  // (`erspielteJoker`) UND dem Glücksrad. Ein Rad-Feld mit Joker-Belohnung
  // wurde bisher gezogen und wirkte sich nicht aus — als Einschränkung in
  // `design/kontaktstellen.md` benannt und nach dem Baukasten-Grundsatz nicht
  // erlaubt („eine Einstellung, die ins Leere läuft, ist kein Baukastenteil").
  //
  // Zusammengeführt wird in DERSELBEN Gutschrift-Liste, kein zweiter Topf:
  // `kontingent` unten rechnet damit unverändert weiter, und die Regel
  // „wirkt ab dem Spieltag, an dem er verdient wurde" gilt automatisch mit.
  const radBelohnungen = useMemo(
    () => (user ? drehradBelohnungen({
      rules: RULES, rundenId: roundId, userIds: [user.id], spieltage: SPIELTAGE,
    }) : { joker: [], narren: [], modifikatoren: [] }),
    [RULES, roundId, user]);
  const gutschriften = useMemo(
    () => [
      ...erspielteJoker({ eintraege: meineEintraege, rules: RULES }),
      ...radBelohnungen.joker,
    ],
    [meineEintraege, RULES, radBelohnungen]);
  // Der Ranglisten-Pool wird einmal je RUNDEN-Spieltag vergeben, nicht einmal je
  // Liga — sonst ließe er sich in einer Runde über fünf Wettbewerbe fünfmal pro
  // Woche ausgeben. Dieselbe Quelle wie in der Spielwahl, damit beide Screens
  // dieselben Gewichte als belegt sehen.
  // Die Zeitachse EINMAL bauen — sie wird weiter unten noch dreimal gebraucht
  // (Narren-Konto, Münz-Takt, Runden-Spieltag dieses Spiels). Als Hook muss
  // sie VOR dem frühen Return stehen, deshalb hier oben.
  const achse = useMemo(
    () => zeitachse(alleMatches, RULES.zeitachse),
    [alleMatches, RULES.zeitachse],
  );
  const schluessel = useMemo(() => rundenSchluessel(achse) ?? undefined, [achse]);

  if (!match || !picks) {
    return (
      <div style={{
        minHeight: "100vh", background: C.ink, color: C.text,
        fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        padding: "28px 16px", display: "flex", flexDirection: "column", alignItems: "center",
      }}>
        <BackLink href="/tippen" label="Spielwahl" />
        <div style={{ fontFamily: MONO, fontSize: 13, color: C.muted, marginTop: 40 }}>Match lädt …</div>
      </div>
    );
  }

  const SNAP = match.snapshot;
  const teams = [
    { side: "home", name: SNAP.home },
    { side: "away", name: SNAP.away },
  ];
  const kickoffLabel = new Intl.DateTimeFormat("de-DE", {
    weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin",
  }).format(new Date(SNAP.kickoff));

  const csQuote = SNAP.correctScore[h]?.[a] ?? null;
  const winner = h > a ? SNAP.home : h < a ? SNAP.away : "Unentschieden";
  const r = risk(csQuote);
  // Zählt der eingefrorene Spannungswert für DIESE Runde als Big Game? Das
  // entscheidet die eigene Schwelle, nicht der Snapshot — derselbe Wert kann in
  // einer anderen Runde unter der Schwelle liegen.
  const bigGameBonus = bigGameAufschlag(SNAP, RULES);

  // Tipp-Vorschau: Potenzial, wenn der Tipp exakt aufgeht (Engine rechnet).
  const projGoals = goalsAusPicks(picks, scorer);
  // Ab Anpfiff ist die Gewichtung eingefroren — sonst könnte man den Joker
  // nachträglich auf ein bereits gutes Spiel legen. Gleiche Logik wie beim
  // Quoten-Snapshot.
  const gesperrt = Date.now() >= new Date(SNAP.kickoff).getTime();
  // Joker ist aktiv, wenn das Regelwerk ihn erlaubt UND (falls per Abstimmung
  // geregelt) dieser Spieltag beschlossen wurde.
  // Spieltag IMMER mit Wettbewerb — sonst zählen BL-Spieltag 1 und
  // CL-Spieltag 1 als derselbe Spieltag.
  const spieltag = { wettbewerb: wettbewerbVon(match), matchday: match.matchday ?? null };
  const jokerAktiv = jokerGiltFuerSpieltag(RULES, spieltag, votes);
  const rankingModus = RULES.joker?.modus === "ranking";
  // ⚠️ Zwei verschiedene Fragen, zwei verschiedene Konstanten
  // (design/wettmodus.md Abschnitt 3) — vorher gab es nur EINE, und die
  // beantwortete beides zugleich:
  //   - `einsatzRegelwerk`: spielt diese RUNDE überhaupt im Wettmodus? Eine
  //     Regelwerks-Frage, unabhängig vom Spieltag — entscheidet, ob es in
  //     dieser Runde je einen Narren-Kontostand/-Kauf gibt (den gibt es im
  //     Wettmodus grundsätzlich nicht, design/waehrungen.md Abschnitt 1).
  //   - `einsatzModus`: gibt es an DIESEM Spieltag tatsächlich Münzen? Eine
  //     Takt-Frage — beim Münz-Takt „Saison-Fenster" ist das nicht an jedem
  //     Spieltag der Fall (`muenzTakt.aktiv === false`).
  // Beide Stellen, an denen die alte einzelne Konstante „diese Runde
  // benutzt keine Narren" bedeutete, stehen jetzt auf `einsatzRegelwerk` —
  // sonst tauchte auf einem münzlosen Spieltag plötzlich ein Narren-
  // Kontostand samt Kaufprüfung auf, die es im Wettmodus gar nicht gibt.
  const einsatzRegelwerk = RULES.joker?.modus === "einsatz";
  // Spieltagsgröße für den Einsatz-Modus (design/einsatz-joker.md Abschnitt 1):
  // die Bezugsgröße ist die Zahl der Spiele IM Spieltag, nicht die der
  // getippten. `schluessel` (RUNDEN-Spieltag) fällt auf `spieltagKey` zurück,
  // wenn die Zeitachse noch keinen liefert.
  // ⚠️ Bewusst KEIN `useMemo`: diese Stelle liegt nach dem frühen Return oben
  // (Hook-Regel, siehe dortiger Kommentar) — ein einfaches `const` über eine
  // Liste kostet hier nichts.
  const schl = schluessel ?? spieltagKey;
  // `spieleImSpieltag` bleibt bestehen und behält seine bisherige Bedeutung:
  // `alleGetippt` weiter unten braucht den echten LIGA-/RUNDEN-SPIELTAG (ist
  // wirklich JEDES Spiel dieses einen Spieltags getippt?), nicht die Münz-
  // PERIODE — die beiden sind bei einem gesetzten Münz-Takt verschieden groß.
  // Nur die Einsatz-Rechnung selbst wechselt unten auf `spieleInPeriode`.
  const spieleImSpieltag = alleMatches.filter((m) => schl(m) === schl(spieltag)).length;

  // Münz-Takt (design/wettmodus.md Abschnitt 3, `muenzTakt.js`): der Schlüssel
  // für die Einsatz-Rechnung (bei Vorgabe-Takt identisch mit `schl`) und der
  // Status DIESES Spieltags im Takt — daraus ergibt sich `einsatzModus` oben.
  const muenzSchl = muenzSchluessel({ matches: alleMatches, rules: RULES, schluessel: schl });
  const muenzTakt = muenzTaktStatus({ matches: alleMatches, rules: RULES, schluessel: schl, spieltag });
  const einsatzModus = einsatzRegelwerk && muenzTakt.aktiv;
  const spieleInPeriode = muenzTakt.aktiv ? muenzTakt.spieleInPeriode : spieleImSpieltag;
  // Anzeigetext für den Münz-Zeitraum (design/wettmodus.md 3): „diesen
  // Spieltag" ist der Rückfall bei Vorgabe-Takt (`periodeLabel` liefert dann
  // `null`, siehe dortiger Kommentar) — sonst „Spieltage X–Y"/„die ganze
  // Saison". Ein Satz, der „Spieltag" sagt, während das Budget für mehrere
  // gilt, wäre schlicht falsch.
  const muenzZeitraum = periodeLabel(muenzTakt, spieltagsFolge(alleMatches, schl).length) ?? "diesen Spieltag";

  // Kontext für `pruefeJokerEinsatz` (design/kontaktstellen.md Abschnitt 5
  // Punkt 1) — hängt an `spieltag`/`schl`, die beide `match` voraussetzen und
  // deshalb erst NACH dem frühen Return oben feststehen (siehe Meldung am
  // Ende dieser Ausführung: Abweichung von der Hook-Vorgabe).
  const alleGetippt = alleMatches
    .filter((m) => schl(m) === schl(spieltag))
    .every((m) => m.id === matchId || meineTips.some((t) => t.match_id === m.id));
  // Aus den eigenen Tipps: alle mit gesetztem Joker (Modus „einzel") oder
  // einem Gewicht ungleich neutral (Modi „ranking"/„einsatz") — das sind die
  // Einsätze, an denen `pruefeAbklingzeit` in jokerBasis.js misst.
  //
  // 🔴 Der ganze Kontext rechnet in RUNDEN-Spieltagen. Vorher war es der
  // Liga-Spieltag: für die Abklingzeit ging das gerade noch auf (beide Seiten
  // lagen in derselben falschen Skala), aber in einer Runde über fünf
  // Wettbewerbe gibt es „Spieltag 5" fünfmal — ein Einsatz am
  // CL-Spieltag 5 hätte den Bundesliga-Spieltag 5 blockiert. Und die
  // Admin-Freigaben unten stehen ohnehin in Runden-Spieltagen (schema.sql).
  const meinRundenSpieltag = rundenSpieltagVon(achse, spieltag);
  const rundenSpieltagFuer = (t) => rundenSpieltagVon(achse, t) ?? t?.matchday ?? null;
  const letzteEinsaetze = meineTips
    .filter((t) => t.joker === true || (t.gewicht != null && t.gewicht !== 1))
    .map((t) => ({
      jokerArt: rankingModus ? "joker.ranking" : "joker.einzel",
      spieltag: rundenSpieltagFuer(t),
    }));
  const kontext = {
    // Der Tipp, der hier gerade gespeichert wird, IST der Tipp DIESES
    // Spieltags — die Invariante „kein Joker ohne Tipp" (jokerBasis.js,
    // Abschnitt 5.0) ist damit in diesem Screen immer erfüllt.
    hatGetippt: true,
    board,
    aktuellerSpieltag: meinRundenSpieltag,
    // Aus der Ablage statt einer leeren Liste: `wer: "adminFreigabe"` lehnte
    // vorher konsequent ab, weil es keinen Speicherort gab
    // (design/kontaktstellen.md, letzte Teil-Wirkung).
    adminFreigaben,
    alleGetippt,
    letzteEinsaetze,
  };

  // Narren-Kontostand (design/kontaktstellen.md Abschnitt 5 Punkt 2) —
  // braucht die Tipps ALLER Spieler (`alleTipps`, nicht `meineTips`), weil
  // `spielerInPeriode` (Preis „knappheit") die Käufe anderer Spieler
  // mitzählt. `board` liefert die Spielerliste (`userIds`),
  // `leaderboardHistory` (`getStore().getLeaderboardHistory`) den echten
  // Spieltag-für-Spieltag-Tabellenstand für die Budget-Quellen
  // `rueckstand`/`platzierung` — das zusätzliche `wettbewerb`-Feld je Eintrag
  // stört `kontoVerlauf`/`budgetVerlauf` nicht, sie lesen nur `matchday`/`board`.
  //
  // 🔴 Drei Werte, die in DERSELBEN Skala stehen müssen — bis hierher taten
  // sie es nicht (design/kontaktstellen.md, fünfte Teil-Wirkung):
  //  • `kontoVerlauf` rechnet über Spieltage 1…N und fragt `standAmTag` mit
  //    genau dieser Zahl,
  //  • `leaderboardHistory` trug aber LIGA-Spieltage — und über mehrere
  //    Wettbewerbe kollidieren die (Bundesliga-Spieltag 5 und CL-Spieltag 5
  //    sind zwei Tage mit derselben Zahl),
  //  • und `SPIELTAGE` war die feste Liga-Saison 34, während die Runde über
  //    fünf Wettbewerbe mehr Runden-Spieltage hat (gemessen: 42).
  // Alles drei läuft jetzt über den RUNDEN-Spieltag; der ist eindeutig.
  const spieltageDerRunde = achse.length || SPIELTAGE;
  const kontoAlle = kontoVerlauf({
    rules: RULES, tipps: alleTipps, spieltage: spieltageDerRunde,
    stand: verlaufNachRundenSpieltag(leaderboardHistory, achse),
    userIds: board.map((b) => b.userId),
    // Narren vom Rad — eine feste Gutschrift, keine Quelle mit Takt und
    // Verfall (siehe `kontoVerlauf`). Ohne sie zahlte ein Rad-Feld
    // „30 Narren" nichts aus.
    zusatz: radBelohnungen.narren,
  });
  const meinKonto = user ? kontoAlle.proSpieler[user.id] : null;
  const narrenKontostand = meinKonto?.find((v) => v.matchday === meinRundenSpieltag)?.kontostand ?? null;

  // Kontingent-Historie für `pruefeEinsatz` (design/kontaktstellen.md
  // Abschnitt 5 Punkt 5, limitKlassen.js): alle bereits gesetzten Joker- UND
  // Duell-Einsätze der Saison, OHNE den hier gerade entstehenden — der Tipp
  // zu DIESEM `matchId` ist der, der gerade geprüft wird, und darf sich
  // nicht selbst im Weg stehen (dasselbe Ausschluss-Muster wie
  // `tipsFuerPruefung` im Einsatz-Modus weiter unten).
  const alleTippsOhneAktuellenTipp = alleTipps.filter((t) => t.matchId !== matchId);
  const einsatzHistorie = einsaetzeAllerArten(alleTippsOhneAktuellenTipp, RULES);
  // `budgetStand`: Schnappschuss `{ [userId]: kontostand }` zum betreffenden
  // Spieltag, aus dem Kontoverlauf abgeleitet (`kontoAlle`, oben bereits für
  // den Narren-Kontostand berechnet) — dieselbe Quelle, kein zweiter Weg.
  const budgetStand = Object.fromEntries(
    Object.entries(kontoAlle.proSpieler).map(([uid, verlauf]) => [
      uid, verlauf.find((v) => v.matchday === spieltag.matchday)?.kontostand ?? 0,
    ]),
  );
  // `ausgeloesteEreignisse`: aus den eigenen `gutschriften` (oben bereits
  // über `erspielteJoker` berechnet) abgeleitet — `pruefeEinsatz` fragt hier
  // nur nach dem eingeloggten Spieler selbst (`klasseAktiv`s "nachEreignis"
  // filtert ohnehin nach `userId`), ein Speicherort für ANDERE Spieler ist
  // dafür nicht nötig.
  const ausgeloesteEreignisse = user
    ? gutschriften.map((g) => ({ userId: user.id, ereignisKey: g.key, spieltag: g.matchday }))
    : [];
  const klassenKontext = { spieltage: SPIELTAGE, board, budgetStand, ausgeloesteEreignisse };

  // Kontingent aus BEIDEN Töpfen: zugeteilt (Plan) + erspielt (Ereignisse).
  // Ohne diese Zusammenführung wäre ein erspielter Joker eine Zahl ohne Wirkung.
  // `plan` und `gutschriften` sind oben berechnet (Hook-Regel, siehe dort).
  const jokerErlaubnis = darfJokerSetzen({
    plan, gutschriften, tipps: meineTips, userId: user?.id, spieltag,
    wettbewerb: spieltag.wettbewerb,
  });
  const jokerStand = kontingent({
    plan, gutschriften, tipps: meineTips, userId: user?.id,
    bisSpieltag: spieltag.matchday, wettbewerb: spieltag.wettbewerb,
  });

  // Duell-Joker (design/duell-joker.md, design/kontaktstellen.md Abschnitt 5
  // Punkt 4): nur relevant, wenn `rules.duell.enabled` UND dieser Spieltag
  // laut `duellPlan` für DIESEN Spieler ein Duell-Spieltag ist.
  // `basis` kommt aus `duellBasis(rules)` (jokerBasis.js) — `duellPlan` selbst
  // kennt keine Art, es gibt nur EINEN Plan je Spieler. Sind beide Arten
  // erlaubt, gilt die LÄNGERE Abklingzeit; die Begründung steht dort.
  const duellTypenErlaubt = (RULES.duell?.typen ?? []).filter((t) => DUELL_TYPEN.some((d) => d.key === t));
  // ⚠️ Nicht mehr „klau zuerst": sind beide Arten erlaubt, gilt die LÄNGERE
  // Abklingzeit (`duellBasis` in jokerBasis.js, dort steht die Begründung).
  // Die alte Reihenfolge war keine Regel, sondern eine Reihenfolge — und sie
  // ließ die strengere Einstellung ins Leere laufen.
  const duellBasis = duellBasisVon(RULES);
  const duellPlanErgebnis = RULES.duell?.enabled && user
    ? duellPlan({
        spieltage: SPIELTAGE, duell: RULES.duell, basis: duellBasis,
        seed: roundId ?? "", userIds: board.map((b) => b.userId),
      })
    : null;
  const istDuellSpieltag = !!(RULES.duell?.enabled && user
    && duellPlanErgebnis?.proSpieler?.[user.id]?.includes(spieltag.matchday));
  // `bisherigeEinsaetze` aus den rohen Tipps ALLER Spieler abgeleitet
  // (`alleTipps`, dieselbe Liste wie beim Narren-Kontostand oben) —
  // `zulaessigeZiele` filtert selbst auf den eigenen Nutzer.
  const bisherigeDuellEinsaetze = einsaetzeAusTipps(alleTipps);
  const duellZulaessig = istDuellSpieltag
    ? zulaessigeZiele(board, user?.id, RULES.duell, {
        bisherigeEinsaetze: bisherigeDuellEinsaetze, aktuellerSpieltag: spieltag.matchday,
      })
    : [];

  // Ranking: welche Gewichte hat der Nutzer an DIESEM Spieltag schon vergeben?
  // Der eigene Tipp ist ausgenommen (man stellt ihn ja gerade ein).
  const belegung = rankingModus
    ? weightUsageForMatchday(meineTips, spieltag, RULES, matchId, schluessel)
    : null;
  const gewichtBelegtVon = (g) => belegung?.belegt.find((b) => b.gewicht === g)?.matchId ?? null;
  // Einsatz-Modus: Deckungsrechnung fürs Verteilen des Budgets über die
  // Münz-PERIODE (design/einsatz-joker.md Abschnitt 3, design/wettmodus.md
  // Abschnitt 3). `spieleInPeriode`/`muenzSchl` statt `spieleImSpieltag`/`schl`
  // — bei einem gesetzten Münz-Takt gilt Budget + Deckungsrechnung für die
  // ganze Periode, nicht nur diesen einen Spieltag. `aktuellesSpiel` zählt
  // immer als offen, auch wenn dafür schon ein Tipp vorliegt — der Spieler
  // bearbeitet ihn ja gerade (siehe Kopfkommentar von `einsatzPlanung`).
  const planung = einsatzModus
    ? einsatzPlanung({
        tips: meineTips, spieltag, spieleImSpieltag: spieleInPeriode, rules: RULES,
        aktuellesSpiel: matchId, schluessel: muenzSchl,
      })
    : null;
  // Gewichtung fließt in die Vorschau ein, damit man sofort sieht, was sie bringt.
  // ⚠️ Einsatz UND Ranking benutzen dasselbe Feld `tip.gewicht` (Absicht,
  // design/einsatz-joker.md) — kein eigenes Feld für den Einsatz-Modus.
  const setzeEinsatz = (muenzen) => {
    if (!einsatzModus || !(planung.neutralerEinsatz > 0)) return;
    setEinsatzBeruehrt(true);
    setGewicht(Math.max(0, muenzen) / planung.neutralerEinsatz);
  };
  const skippenErlaubt = RULES.joker?.skippenErlaubt !== false;

  // 🔴 Der voreingestellte Einsatz muss GÜLTIG sein.
  //
  // Im Browser aufgefallen: `gewicht` startet bei 1, das ergibt genau den
  // neutralen Einsatz — bei 21 Spielen und 100 Münzen also 4,76. Steht der
  // Mindesteinsatz auf 5, ist dieser Vorschlag von Anfang an regelwidrig: der
  // Spieler ändert nichts, drückt ab und wird abgewiesen, ohne je etwas
  // falsch gemacht zu haben. Eine Vorgabe, die man erst reparieren muss, ist
  // schlimmer als gar keine.
  //
  // Deshalb wird der neutrale Einsatz in das erlaubte Band gezogen. Passt er
  // nicht hinein (Mindesteinsatz über dem, was hier noch geht), bleibt nur
  // Auslassen — und ob das erlaubt ist, hat der Admin entschieden. Ist es das
  // nicht, ist das sein Konflikt, und `einsatzKonflikte` meldet ihn in der
  // Spielerstellung.
  const einsatzVorschlag = () => {
    const min = planung.minJeSpiel;
    const max = Math.max(0, planung.maxJetztSetzbar);
    if (min > max) return skippenErlaubt ? 0 : max;
    return Math.min(max, Math.max(min, planung.neutralerEinsatz));
  };
  // Solange der Spieler nichts angefasst hat, gilt der Vorschlag — und zwar
  // ÜBERALL: Anzeige, Vorschau und Abgabe. Sonst zeigte die Oberfläche einen
  // Wert und speicherte einen anderen.
  const einsatzAktuell = einsatzModus
    ? (einsatzBeruehrt ? gewicht * planung.neutralerEinsatz : einsatzVorschlag())
    : 0;
  const gewichtEffektiv = einsatzModus && planung.neutralerEinsatz > 0
    ? einsatzAktuell / planung.neutralerEinsatz
    : gewicht;

  // Gewichtung fließt in die Vorschau ein, damit man sofort sieht, was sie bringt.
  // ⚠️ Einsatz UND Ranking benutzen dasselbe Feld `tip.gewicht` (Absicht,
  // design/einsatz-joker.md) — kein eigenes Feld für den Einsatz-Modus.
  const gewichtung = einsatzModus
    ? { gewicht: gewichtEffektiv }
    : rankingModus ? { gewicht } : { joker };
  const proj = projectTip({ home: h, away: a, goals: projGoals, ...gewichtung }, SNAP, RULES);

  const setPick = (ti, pi, field, val) =>
    setPicks((prev) => prev.map((team, i) =>
      i !== ti ? team : team.map((p, j) => (j !== pi ? p : { ...p, [field]: val }))));

  const step = (setter, val, d) => setter(Math.max(0, Math.min(9, val + d)));

  // Tipp abgeben: Snapshot-Quote einfrieren + über den Store persistieren.
  const submit = async () => {
    setDone(true);
    setSaveState("saving");
    try {
      if (!user) { setSaveState("guest"); return; }
      // Einsatz-Modus: der Spieltag darf nach `invalidEinsatzMatchdays` nicht
      // regelwidrig werden — anders als beim Ranking-Regler (der belegte
      // Gewichte schon beim Klicken sperrt) lässt sich eine Unterdeckung beim
      // Setzen selbst nicht verhindern (design/einsatz-joker.md 3.2: „kein
      // Blockieren, solange es reparabel ist"). Gesperrt wird darum erst hier,
      // beim Absenden — und mit der Zahl, die fehlt.
      if (einsatzModus) {
        const tipsFuerPruefung = [
          ...meineTips.filter((t) => (t.match_id ?? t.matchId ?? null) !== matchId),
          // ⚠️ `gewichtEffektiv`, nicht `gewicht` — solange der Spieler den
          // Einsatz nicht angefasst hat, gilt der Vorschlag. Mit dem rohen
          // `gewicht` prüfte man einen Wert, den niemand sieht und der auch
          // nicht gespeichert wird.
          { match_id: matchId, matchday: spieltag.matchday, wettbewerb: spieltag.wettbewerb, gewicht: gewichtEffektiv },
        ];
        // ⚠️ Über den Münz-Schlüssel geprüft (`muenzSchl`), nicht über
        // `wettbewerb`/`matchday` — fasst der Takt mehrere Spieltage zu einer
        // Periode zusammen, trägt der gemeldete Eintrag irgendeinen Spieltag
        // der Gruppe (`key`, genau dafür trägt `invalidEinsatzMatchdays`
        // dieses Feld seit dem letzten Schritt), und der alte Vergleich über
        // `wettbewerb`/`matchday` des AKTUELLEN Spieltags ginge dann ins Leere.
        const fehlerhaft = invalidEinsatzMatchdays(tipsFuerPruefung, RULES, muenzSchl, spieleInPeriode)
          .some((f) => f.key === muenzSchl(spieltag));
        if (fehlerhaft) {
          // ⚠️ Die Meldung muss den GRUND nennen, nicht nur „ungültig".
          // `invalidEinsatzMatchdays` gibt nur zurück, WELCHER Spieltag
          // beanstandet ist — warum, muss hier aus den Zahlen abgeleitet
          // werden. Ein früherer Entwurf zeigte immer den Fehlbetrag; bei
          // einem Verstoß, der keine Unterdeckung ist, stand dort „dir fehlen
          // 0 Münzen" — eine Zahl, die nichts erklärt.
          const e = einsatzAktuell;
          // ⚠️ Beide Sätze nennen den Münz-ZEITRAUM (`muenzZeitraum`), nicht
          // fest „diesen Spieltag" — ein Satz, der „Spieltag" sagt, während
          // das Budget für mehrere gilt, ist schlicht falsch.
          const grund = e > 0 && e < planung.minJeSpiel - 1e-9
            ? `dein Einsatz liegt unter dem Mindesteinsatz von ${zahl(planung.minJeSpiel)} Münzen`
            : e <= 0 && !skippenErlaubt
            ? "in dieser Runde darf kein Spiel ausgelassen werden — setz mindestens den Mindesteinsatz"
            : planung.fehlbetrag > 0
            ? `dir fehlen ${zahl(planung.fehlbetrag)} Münzen, um die Mindesteinsätze für ${muenzZeitraum} zu decken`
            : `deine Münzen gehen für ${muenzZeitraum} nicht auf — nimm auf einem Spiel zurück`;
          setEinsatzGrund(grund);
          setSaveState("einsatzUngueltig");
          return;
        }
      }
      // Joker-Grundform prüfen (design/kontaktstellen.md Abschnitt 5 Punkt 1):
      // nur wenn tatsächlich eine Gewichtung gesetzt wird — sonst gäbe es für
      // einen unangetasteten Tipp gar nichts zu prüfen.
      //
      // ⚠️ Geprüft wird `gewichtEffektiv`, NICHT `gewicht` — dieselbe
      // Unterscheidung wie oben bei `einsatzAktuell`. Im Einsatz-Modus gilt bis
      // zur ersten Berührung der VORSCHLAG, und der liegt wegen des
      // Mindesteinsatzes regelmäßig ungleich neutral. Über `gewicht` geprüft
      // liefe ausgerechnet der häufigste Fall — Regler stehen lassen und
      // absenden — ungeprüft durch, obwohl ein gewichteter Tipp gespeichert
      // wird. Die Kontaktstelle wäre dann halb tot, und das ist schlechter als
      // ganz tot: sie sähe verkabelt aus.
      // Außerhalb des Einsatz-Modus ist `gewichtEffektiv === gewicht` (siehe
      // dort), Ranking- und Einzel-Fall ändern sich also nicht.
      if (jokerAktiv && !gesperrt && (joker === true || gewichtEffektiv !== 1)) {
        const jokerArt = rankingModus ? "joker.ranking" : "joker.einzel";
        const pruef = pruefeJokerEinsatz({
          rules: RULES, userId: user.id, snap: SNAP, jokerArt,
          wettbewerb: spieltag.wettbewerb, phase: match.phase ?? null,
          kontext,
        });
        if (pruef.erlaubt === false) {
          setJokerGrund(pruef.grund);
          setSaveState("jokerUngueltig");
          return;
        }
        // Narren-Zahlungsfähigkeit prüfen (design/kontaktstellen.md
        // Abschnitt 5 Punkt 2) — NICHT im Modus „einsatz": dort ist
        // `gewichtEffektiv` ein Münz-Einsatz (`einsatzPlanung`), kein
        // Narren-Kauf (design/waehrungen.md Abschnitt 1). Preis über
        // `preisFuer`, dieselben Zähler wie in `kontoVerlauf`
        // (`bisherInPeriode`/`spielerInPeriode`, chronologisch je Periode)
        // — über `perioden()` (exportiert), keine zweite Perioden-Rechnung.
        // Kauf-Erkennung über `istNarrenKauf` (exportiert aus jokerBudget.js)
        // — EIN Ort für „was zählt als Narren-Kauf", keine zweite Ternary.
        // ⚠️ `einsatzRegelwerk`, nicht `einsatzModus`: das ist eine Frage des
        // REGELWERKS (gibt es in dieser Runde je Narren?), keine des
        // Münz-Takts — sonst tauchte auf einem münzlosen Spieltag
        // (`muenzTakt.aktiv === false`) plötzlich eine Narren-Kaufprüfung
        // auf, die es im Wettmodus grundsätzlich nicht gibt.
        if (!einsatzRegelwerk) {
          const budgetCfg = sanitizeBudget(RULES.budget);
          const perioden_ = perioden(budgetCfg.takt, { n: budgetCfg.n, fenster: budgetCfg.fenster }, SPIELTAGE);
          const periodeVon = perioden_.find((p) => spieltag.matchday >= p.von && spieltag.matchday <= p.bis)?.von
            ?? spieltag.matchday;
          const kaeufeInPeriode = alleTipps.filter((t) => {
            if (!istNarrenKauf(RULES.joker?.modus, t)) return false;
            const von = perioden_.find((p) => t.matchday >= p.von && t.matchday <= p.bis)?.von ?? t.matchday;
            return von === periodeVon;
          });
          const bisherInPeriode = kaeufeInPeriode.filter((t) => t.userId === user.id).length;
          const spielerInPeriode = new Set(kaeufeInPeriode.map((t) => t.userId)).size;
          const preis = preisFuer(jokerArt, RULES.budget, { bisherInPeriode, spielerInPeriode });
          const verfuegbar = narrenKontostand ?? 0;
          if (!kannBezahlen(verfuegbar, preis)) {
            setNarrenGrund(`dieser Joker kostet ${zahl(preis)} Narren, du hast nur ${zahl(verfuegbar)} verfügbar`);
            setSaveState("narrenUngueltig");
            return;
          }
          // Kontingent-Klassen prüfen (design/kontaktstellen.md Abschnitt 5
          // Punkt 5, limitKlassen.js): dieselbe Bedingung wie die Narren-
          // Deckung direkt darüber — außerhalb des Einsatz-Modus, weil dort
          // `gewichtEffektiv` ein Münz-Einsatz ist, kein Joker-Einsatz
          // (`einsaetzeAllerArten` erzeugt für diesen Modus konsequent auch
          // keinen Historie-Eintrag, siehe jokerBudget.js).
          const klassenPruef = pruefeEinsatz(
            { spieltag: spieltag.matchday, jokerArt, vonUserId: user.id, aufUserId: null },
            RULES.limitKlassen, einsatzHistorie, klassenKontext,
          );
          if (!klassenPruef.erlaubt) {
            setKlasseGrund(klassenPruef.gruende.map((g) => g.grund).join(" "));
            setSaveState("klasseUngueltig");
            return;
          }
        }
      }
      // Widerruf prüfen (design/kontaktstellen.md Abschnitt 5 Punkt 5,
      // `darfWiderrufen` aus jokerBasis.js): nur wenn ein VORHER gesetzter
      // Joker jetzt ENTFERNT oder VERÄNDERT wird — unabhängig vom Block oben,
      // denn dessen Bedingung verlangt einen AKTIVEN neuen Joker
      // (`joker === true || gewichtEffektiv !== 1`) und würde eine Entfernung
      // (neu: kein Joker) gar nicht erst betreten. „Vorher keiner, jetzt
      // einer" ist KEIN Widerruf — dafür sorgt der `vorherGesetzt &&`-Wächter
      // unten, dieser Fall bleibt beim Block oben (`pruefeJokerEinsatz`).
      // `einsatzRegelwerk` bleibt draußen (nicht `einsatzModus`): dort ist
      // `gewicht` grundsätzlich ein Münz-Einsatz, kein Joker
      // (design/waehrungen.md Abschnitt 1) — das gilt für die ganze RUNDE,
      // nicht nur an Spieltagen mit aktivem Münz-Takt. Derselbe Ausschluss
      // wie bei der Narren-Deckung und der Kontingent-Prüfung oben.
      if (jokerAktiv && !einsatzRegelwerk) {
        const jokerArtFuerWiderruf = rankingModus ? "joker.ranking" : "joker.einzel";
        const vorherGesetzt = rankingModus ? urspruenglich.gewicht !== 1 : urspruenglich.joker === true;
        const jetztGesetzt = rankingModus ? gewichtEffektiv !== 1 : joker === true;
        const veraendertOderEntfernt = vorherGesetzt
          && (!jetztGesetzt || (rankingModus && gewichtEffektiv !== urspruenglich.gewicht));
        if (veraendertOderEntfernt) {
          const basisWiderruf = basisFuer(jokerArtFuerWiderruf, RULES);
          if (!darfWiderrufen(basisWiderruf, Date.now(), new Date(SNAP.kickoff).getTime())) {
            setWiderrufGrund("dieser Joker ist nicht mehr widerrufbar — die erlaubte Frist ist vorbei");
            setSaveState("widerrufUngueltig");
            return;
          }
        }
      }
      const goals = goalsAusPicks(picks, scorer);
      // Absicherung gegen veralteten Zustand: ein Ranking-Gewicht, das
      // inzwischen anderweitig belegt ist, wird auf neutral zurückgesetzt.
      let gewichtungSicher = gewichtung;
      if (rankingModus && gewicht !== 1 && gewichtBelegtVon(gewicht)) gewichtungSicher = { gewicht: 1 };
      // Duell-Joker: dieselbe Absicherung gegen veralteten Zustand — erneute
      // Prüfung gegen `zulaessigeZiele` im Moment des Speicherns. Ist das
      // gewählte Ziel jetzt nicht mehr zulässig (z. B. weil zwischenzeitlich
      // ein anderer Tipp dasselbe Ziel schon belegt hat), wird das Duell
      // verworfen statt ungeprüft übernommen.
      // Duell-Widerruf (design/kontaktstellen.md Abschnitt 5 Punkt 5,
      // `darfWiderrufen`): dieselbe Unterscheidung wie beim Joker oben — nur
      // ein VORHER gesetztes Duell, das jetzt entfernt oder auf ein anderes
      // Ziel/eine andere Art geändert wird, ist ein Widerruf. Die rohe
      // UI-Auswahl (`duellZiel`/`duellTypGewaehlt`) genügt hier — eine
      // ENTFERNUNG (`duellZiel === null`) muss unabhängig von einer erneuten
      // `zulaessigeZiele`-Prüfung erkannt werden, die weiter unten erst für
      // ein NEUES Ziel läuft.
      if (RULES.duell?.enabled && urspruenglich.duellZiel != null
        && (duellZiel !== urspruenglich.duellZiel || duellTypGewaehlt !== urspruenglich.duellTyp)) {
        const duellArtVorher = urspruenglich.duellTyp === "block" ? "duell.block" : "duell.klau";
        const basisWiderruf = basisFuer(duellArtVorher, RULES);
        if (!darfWiderrufen(basisWiderruf, Date.now(), new Date(SNAP.kickoff).getTime())) {
          setWiderrufGrund("dieser Duell-Joker ist nicht mehr widerrufbar — die erlaubte Frist ist vorbei");
          setSaveState("widerrufUngueltig");
          return;
        }
      }
      let duellSicher = null;
      if (istDuellSpieltag && !gesperrt && duellZiel && duellTypGewaehlt) {
        const zulaessigJetzt = zulaessigeZiele(board, user.id, RULES.duell, {
          bisherigeEinsaetze: bisherigeDuellEinsaetze, aktuellerSpieltag: spieltag.matchday,
        });
        if (zulaessigJetzt.includes(duellZiel) && duellTypenErlaubt.includes(duellTypGewaehlt)) {
          // Kontingent-Klassen prüfen (design/kontaktstellen.md Abschnitt 5
          // Punkt 5, limitKlassen.js) — dieselbe Bedingung: nur wenn hier
          // tatsächlich ein Duell gesetzt wird.
          const duellJokerArt = duellTypGewaehlt === "block" ? "duell.block" : "duell.klau";
          const klassenPruef = pruefeEinsatz(
            { spieltag: spieltag.matchday, jokerArt: duellJokerArt, vonUserId: user.id, aufUserId: duellZiel },
            RULES.limitKlassen, einsatzHistorie, klassenKontext,
          );
          if (!klassenPruef.erlaubt) {
            setKlasseGrund(klassenPruef.gruende.map((g) => g.grund).join(" "));
            setSaveState("klasseUngueltig");
            return;
          }
          duellSicher = { auf: duellZiel, typ: duellTypGewaehlt };
        }
      }
      await getStore().saveTip({
        roundId, matchId: SNAP.matchId, userId: user.id,
        // Gewichtung nur mitschicken, wenn sie erlaubt UND noch nicht gesperrt ist.
        tip: {
          home: h, away: a, goals,
          ...(jokerAktiv && !gesperrt ? gewichtungSicher : {}),
          ...(duellSicher ? { duell: duellSicher } : {}),
        },
        snapshot: SNAP,
      });
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: C.ink, color: C.text,
      fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
      padding: "28px 16px", display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <BackLink href="/tippen" label="Spielwahl" />
      <div style={{
        width: "100%", maxWidth: 400, position: "relative",
        borderRadius: 26, overflow: "hidden",
        background: `radial-gradient(120% 80% at 50% -10%, ${C.ink2} 0%, ${C.ink} 60%)`,
        border: `1px solid ${C.line}`, boxShadow: "0 30px 80px -30px rgba(0,0,0,0.8)",
      }}>
        <div style={{
          position: "absolute", top: -90, left: "50%", transform: "translateX(-50%)",
          width: 320, height: 200, pointerEvents: "none",
          background: `radial-gradient(circle, ${C.gold}22 0%, transparent 70%)`,
        }} />

        {!done ? (
          <div style={{ position: "relative", padding: "26px 22px 22px" }}>
            {/* Kopf */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: 2, color: C.muted, textTransform: "uppercase" }}>
                Tipp abgeben
              </span>
              <span style={{ fontFamily: MONO, fontSize: 12, color: C.muted }}>Anpfiff {kickoffLabel}</span>
            </div>
            <div style={{ marginTop: 6, fontSize: 18, fontWeight: 700 }}>
              {SNAP.home} <span style={{ color: C.muted, fontWeight: 400 }}>vs</span> {SNAP.away}
            </div>

            {/* Spiel des Spieltags — hier gehört es hin, weil hier die
                Entscheidung fällt. Der Aufschlag kommt aus der Schwelle DIESER
                Runde (`bigGameAufschlag`), die Begründung ist beim Öffnen des
                Spieltags eingefroren worden. Beides zusammen, nie nur die Zahl:
                ein Bonus ohne Grund sieht nach Willkür aus. */}
            {bigGameBonus > 0 && (
              <div style={{
                marginTop: 10, background: `${C.coral}14`, border: `1px solid ${C.coral}44`,
                borderRadius: 12, padding: "9px 12px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ color: C.coral, fontSize: 13 }}>★</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.coral }}>Spiel des Spieltags</span>
                  <span style={{ fontFamily: MONO, fontSize: 11.5, color: C.coral, marginLeft: "auto" }}>
                    +{bigGameBonus.toFixed(1)}
                  </span>
                </div>
                {SNAP.bigGameGrund && (
                  <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4, lineHeight: 1.45 }}>
                    {SNAP.bigGameGrund}
                  </div>
                )}
                <div style={{ fontSize: 10.5, color: C.muted, marginTop: 4, lineHeight: 1.45 }}>
                  Der Aufschlag liegt im selben Topf wie Derby und Wettbewerbs-Gewicht —
                  addiert, nicht multipliziert, und gedeckelt.
                </div>
              </div>
            )}

            {/* Ergebnis-Eingabe */}
            {RULES.markets.result && (
              <Section title="Endstand">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18 }}>
                  <Stepper value={h} onStep={(d) => step(setH, h, d)} />
                  <div style={{ fontFamily: MONO, fontSize: 28, color: C.muted }}>:</div>
                  <Stepper value={a} onStep={(d) => step(setA, a, d)} />
                </div>
                <div style={{
                  marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center",
                  background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: "10px 14px",
                }}>
                  <div style={{ fontSize: 13 }}>
                    <span style={{ color: C.muted }}>Sieger: </span>
                    <span style={{ fontWeight: 600 }}>{winner}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontFamily: MONO, fontSize: 13, color: C.gold }}>
                      {csQuote ? `Exakt ${csQuote.toFixed(1)}` : "seltenes Ergebnis"}
                    </span>
                    <span style={{
                      fontSize: 11, color: r.col, border: `1px solid ${r.col}55`,
                      borderRadius: 999, padding: "2px 8px",
                    }}>{r.label}</span>
                  </div>
                </div>
              </Section>
            )}

            {/* Echte Namen, Quote folgt noch. Nachgemessen: die
                Torschützen-Märkte öffnen erst rund zwei Tage vor Anpfiff, das
                Tipp-Fenster geht eine Woche vorher auf. Ohne diesen Hinweis
                hielte der Spieler den abgeleiteten Preis für einen Marktpreis —
                und wunderte sich, wenn er sich später ändert. */}
            {scorer.enabled && SNAP.spielerPreiseOffen && (
              <div style={{
                fontSize: 11.5, lineHeight: 1.45, color: C.muted, marginBottom: 10,
                padding: "9px 11px", borderRadius: 10,
                background: C.surface, border: `1px solid ${C.line}`,
              }}>
                <strong style={{ color: C.text }}>Die Namen sind echt, die Quoten noch vorläufig.</strong>{" "}
                Buchmacher stellen die Torschützen-Quoten erst rund <strong>48 Stunden</strong> vor
                Anpfiff. Bis dahin siehst du unsere eigene Einschätzung — tippen kannst du
                trotzdem schon jetzt. Verrechnet wird mit der Quote, die beim Öffnen
                des Spieltags für alle gilt.
              </div>
            )}

            {/* Torschützen aus dem Regelwerk */}
            {/* Modus `proSpiel`: EIN Topf für beide Mannschaften. Gebaut, weil
                die echten Torschützen-Quoten ohne Vereinszuordnung kommen —
                dieser Modus funktioniert auch dann, wenn der Kader noch offen
                ist (siehe kader.js). */}
            {scorer.enabled && scorer.modus === "proSpiel" && (
              <Section title={`Torschützen — ${scorer.picksProSpiel} im Spiel`}>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 8, fontFamily: MONO, letterSpacing: 1 }}>
                  {SNAP.home.toUpperCase()} + {SNAP.away.toUpperCase()}
                </div>
                {picks[0].map((p, pi) => (
                  <div key={pi} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <PlayerSelect
                      flex={1.4} label={`Wahl ${pi + 1}`} value={p.main}
                      quote={alleSpieler(SNAP)[p.main]?.anytime}
                      players={alleSpieler(SNAP)}
                      onChange={(v) => setPick(0, pi, "main", v)}
                    />
                    {scorer.allowBackups && (
                      <PlayerSelect
                        flex={1} label="Backup" value={p.backup} dim
                        quote={p.backup ? alleSpieler(SNAP)[p.backup]?.anytime : null}
                        players={alleSpieler(SNAP)} allowEmpty
                        onChange={(v) => setPick(0, pi, "backup", v)}
                      />
                    )}
                  </div>
                ))}
                <p style={{ fontSize: 11.5, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
                  Wie du sie auf die Mannschaften verteilst, ist dir überlassen — auch alle auf eine.
                  Steht deine Erstwahl ~1 h vor Anpfiff nicht in der Aufstellung, rückt der Backup nach.
                </p>
              </Section>
            )}

            {scorer.enabled && scorer.modus !== "proSpiel" && (
              <Section title={`Torschützen — je ${scorer.picksPerTeam} pro Team`}>
                {teams.map((team, ti) => (
                  <div key={team.side} style={{ marginBottom: ti === 0 ? 14 : 0 }}>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 8, fontFamily: MONO, letterSpacing: 1 }}>
                      {team.name.toUpperCase()}
                    </div>
                    {picks[ti].map((p, pi) => (
                      <div key={pi} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        <PlayerSelect
                          flex={1.4} label={`Wahl ${pi + 1}`} value={p.main}
                          quote={SNAP.players[team.side][p.main]?.anytime}
                          players={SNAP.players[team.side]}
                          onChange={(v) => setPick(ti, pi, "main", v)}
                        />
                        {scorer.allowBackups && (
                          <PlayerSelect
                            flex={1} label="Backup" value={p.backup} dim
                            quote={p.backup ? SNAP.players[team.side][p.backup]?.anytime : null}
                            players={SNAP.players[team.side]} allowEmpty
                            onChange={(v) => setPick(ti, pi, "backup", v)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ))}
                <p style={{ fontSize: 11.5, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
                  Steht deine Erstwahl ~1 h vor Anpfiff nicht in der Aufstellung, rückt der Backup automatisch nach.
                </p>
              </Section>
            )}

            {/* Tipp-Vorschau (je nach persönlicher Einstellung) */}
            {prefs.vorschau !== "aus" && (
              <div style={{
                marginTop: 20, background: `${C.gold}10`, border: `1px solid ${C.gold}33`,
                borderRadius: 14, padding: "12px 14px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>
                    Wenn dein Tipp exakt aufgeht
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: C.gold }}>+{proj.points}</span>
                </div>
                <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: r.col, border: `1px solid ${r.col}55`, borderRadius: 999, padding: "2px 8px" }}>{r.label}</span>
                  <span style={{ fontSize: 11.5, color: C.muted }}>
                    {csQuote ? `Exakt-Quote ${csQuote.toFixed(1)}` : "seltenes Ergebnis"}
                  </span>
                </div>
                {prefs.vorschau === "voll" && (
                  <div style={{ marginTop: 10, fontSize: 11.5, color: C.muted, lineHeight: 1.7 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Ergebnis-Nähe (roh)</span>
                      <span style={{ fontFamily: MONO }}>{proj.ergNaehe.toFixed(1)}</span>
                    </div>
                    {proj.goalsNet > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Tor-Potenzial (roh)</span>
                        <span style={{ fontFamily: MONO }}>+{proj.goalsNet.toFixed(1)}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Kombi bei exaktem Ergebnis</span>
                      <span style={{ fontFamily: MONO }}>×{proj.combo}</span>
                    </div>
                  </div>
                )}
                <p style={{ fontSize: 10.5, color: C.muted, marginTop: 8, lineHeight: 1.4 }}>
                  Nur eine Aussicht auf dein getipptes Ergebnis — die echte Wertung richtet sich nach dem realen Ausgang.
                </p>
              </div>
            )}

            {/* Nachbar-Endstände: was zahlt der Tipp bei einem Tor mehr/weniger */}
            {prefs.vorschau !== "aus" && (
              <NaheErgebnisse
                tip={{ home: h, away: a, goals: projGoals, ...gewichtung }}
                snap={SNAP} rules={RULES} kompakt={prefs.vorschau === "dezent"}
              />
            )}

            {/* Gewichtung dieses Spiels (nur wenn das Regelwerk sie erlaubt) */}
            {jokerAktiv && (
              <div style={{
                marginTop: 18, background: `${C.gold}0E`, border: `1px solid ${C.gold}33`,
                borderRadius: 14, padding: "13px 15px", opacity: gesperrt ? 0.55 : 1,
              }}>
                <div style={{ fontSize: 11, color: C.gold, textTransform: "uppercase", letterSpacing: 1 }}>
                  {einsatzRegelwerk ? "Einsatz dieses Spiels" : rankingModus ? "Gewicht dieses Spiels" : "Joker"}
                </div>
                {/* Narren-Kontostand (design/waehrungen.md Abschnitt 3.1) —
                    NUR in den Modi „einzel"/„ranking": im REGELWERK „einsatz"
                    entstehen hier grundsätzlich keine Narren-Ausgaben (siehe
                    oben), ein Kontostand wäre dort ohne Aussage — auch an
                    einem münzlosen Spieltag, denn Narren gibt es in dieser
                    Runde so oder so nicht. Nur echte Daten anzeigen
                    (Abschnitt 4) — `narrenKontostand == null` (Budget aus/
                    kein Spieler) zeigt nichts an. */}
                {!einsatzRegelwerk && narrenKontostand != null && (
                  <div style={{ fontFamily: MONO, fontSize: 11.5, color: C.muted, marginTop: 4 }}>
                    🃏 <span style={{ color: C.gold, fontWeight: 700 }}>{zahl(narrenKontostand)}</span> Narren
                  </div>
                )}
                {/* Einsatz-Regelwerk, aber an DIESEM Spieltag keine Münzen
                    (Münz-Takt „Saison-Fenster" außerhalb des Fensters,
                    design/wettmodus.md Abschnitt 3): ohne diesen Zweig fiele
                    die Kette unten bis zum Joker-Knopf durch und böte einen
                    Joker an, den das Regelwerk in diesem Modus gar nicht
                    kennt (`rankingModus`/`joker` sind hier beide falsch). */}
                {einsatzRegelwerk && !muenzTakt.aktiv ? (
                  <p style={{ fontSize: 11, color: C.muted, marginTop: 9, lineHeight: 1.45 }}>{muenzTakt.grund}</p>
                ) : einsatzModus ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                      <input type="range" min={0} max={Math.max(0, planung.maxJetztSetzbar)} step={1}
                        value={Math.min(Math.round(einsatzAktuell), Math.max(0, planung.maxJetztSetzbar))}
                        disabled={gesperrt}
                        onChange={(e) => setzeEinsatz(Number(e.target.value))}
                        style={{ flex: 1, accentColor: C.gold, cursor: gesperrt ? "default" : "pointer" }} />
                      <span style={{
                        fontFamily: MONO, fontSize: 15, fontWeight: 700, color: C.gold,
                        minWidth: 44, textAlign: "right",
                      }}>{zahl(einsatzAktuell)}</span>
                    </div>
                    <div style={{ marginTop: 8, maxWidth: 160 }}>
                      <Zahl label="Münzen auf dieses Spiel" wert={Math.round(einsatzAktuell)}
                        limits={{ min: 0, max: Math.max(0, Math.round(planung.maxJetztSetzbar)), step: 1 }}
                        onChange={(v) => setzeEinsatz(v)} />
                    </div>

                    {/* „73 von 100 Münzen verteilt" samt Balken.
                        🔴 Gezeigt wird `verteilt` PLUS dem, was gerade auf
                        diesem Spiel liegt. `planung.verteilt` lässt das
                        aktuelle Spiel bewusst aus — es wird ja gerade
                        entschieden, und `maxJetztSetzbar` muss dagegen
                        rechnen. Für die ANZEIGE ist das falsch: im Browser
                        stand „0 von 100 verteilt", während 5 Münzen auf
                        diesem Spiel lagen, und das Schnellmenü zeigte für
                        denselben Spieltag eine andere Zahl. Mit dem
                        aktuellen Einsatz stimmen beide überein — und der
                        Balken wandert beim Schieben mit, was er soll. */}
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 11.5, color: C.muted }}>
                        {zahl(planung.verteilt + einsatzAktuell)} von {zahl(planung.budget)} Münzen für {muenzZeitraum} verteilt
                      </div>
                      <div style={{ position: "relative", height: 6, borderRadius: 999, background: C.line, marginTop: 5 }}>
                        <div style={{
                          position: "absolute", top: 0, bottom: 0, left: 0, borderRadius: 999, background: C.gold,
                          width: `${Math.max(0, Math.min(100, ((planung.verteilt + einsatzAktuell) / (planung.budget || 1)) * 100))}%`,
                        }} />
                      </div>
                    </div>

                    <p style={{ fontSize: 10.5, color: C.muted, marginTop: 9, lineHeight: 1.45 }}>
                      Auf dieses Spiel kannst du höchstens {zahl(planung.maxJetztSetzbar)} Münzen setzen.
                    </p>

                    {planung.noetigFuerOffene > 0 && (
                      <p style={{ fontSize: 10.5, color: C.muted, marginTop: 5, lineHeight: 1.45 }}>
                        Noch {planung.offeneSpiele} {planung.offeneSpiele === 1 ? "Spiel" : "Spiele"} offen,
                        dafür brauchst du mindestens {zahl(planung.noetigFuerOffene)} Münzen.
                      </p>
                    )}

                    {planung.fehlbetrag > 0 && (
                      <p style={{ fontSize: 10.5, color: C.coral, marginTop: 5, lineHeight: 1.45 }}>
                        Dir fehlen {zahl(planung.fehlbetrag)} Münzen. Nimm auf einem anderen Spiel
                        zurück{skippenErlaubt ? " oder lass eines aus" : ""}.
                      </p>
                    )}
                  </>
                ) : rankingModus ? (
                  <>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                      {/* ×1,0 (neutral) ist immer wählbar; höhere Gewichte nur, wenn
                          sie an diesem Spieltag noch nicht auf einem anderen Spiel liegen. */}
                      {RULES.joker.faktoren.map((f) => {
                        const on = gewicht === f;
                        const belegtVon = f === 1 ? null : gewichtBelegtVon(f);
                        const blockiert = !!belegtVon && !on;
                        return (
                          <button key={f} disabled={gesperrt || blockiert}
                            title={blockiert ? "Dieses Gewicht liegt schon auf einem anderen Spiel dieses Spieltags" : undefined}
                            onClick={() => setGewicht(on ? 1 : f)} style={{
                              cursor: gesperrt || blockiert ? "default" : "pointer", fontFamily: MONO, fontSize: 13, fontWeight: 700,
                              padding: "8px 14px", borderRadius: 999,
                              background: on ? `${C.gold}22` : C.surface,
                              color: on ? C.gold : blockiert ? "rgba(138,144,180,0.4)" : C.muted,
                              border: `1px solid ${on ? C.gold + "77" : C.line}`,
                              textDecoration: blockiert ? "line-through" : "none",
                            }}>{fmtFaktor(f)}</button>
                        );
                      })}
                    </div>
                    <p style={{ fontSize: 10.5, color: C.muted, marginTop: 9, lineHeight: 1.45 }}>
                      Jedes Gewicht nur einmal pro Spieltag — vergebene sind ausgegraut. Übrige Spiele zählen ×1,0.
                    </p>
                  </>
                ) : (
                  <>
                    <button disabled={gesperrt || (!joker && !jokerErlaubnis.erlaubt)}
                      onClick={() => setJoker((v) => !v)} style={{
                        marginTop: 10, width: "100%",
                        cursor: gesperrt || (!joker && !jokerErlaubnis.erlaubt) ? "default" : "pointer",
                        fontFamily: "inherit", fontSize: 13.5, fontWeight: 700,
                        background: joker ? `${C.gold}22` : C.surface,
                        color: joker ? C.gold : (!jokerErlaubnis.erlaubt ? "rgba(138,144,180,0.45)" : C.muted),
                        border: `1px solid ${joker ? C.gold + "77" : C.line}`,
                        borderRadius: 12, padding: "11px 0",
                      }}>
                      {joker ? `✓ Joker gesetzt · ${fmtFaktor(RULES.joker.faktor)}` : `Joker setzen · ${fmtFaktor(RULES.joker.faktor)}`}
                    </button>
                    {/* Die HERKUNFT nennen: „du setzt einen erspielten ein" ist
                        eine andere Aussage als „heute ist dein Joker-Spieltag". */}
                    <p style={{
                      fontSize: 10.5, marginTop: 9, lineHeight: 1.45,
                      color: jokerErlaubnis.quelle === "erspielt" ? C.mint
                        : jokerErlaubnis.erlaubt ? C.muted : C.coral,
                    }}>
                      {jokerErlaubnis.grund}
                    </p>
                    <p style={{ fontSize: 10.5, color: C.muted, marginTop: 5, lineHeight: 1.45 }}>
                      Zählt in beide Richtungen — auch ein Reinfall wiegt schwerer.
                      {jokerStand.zugeteilt.gesamt !== null && ` · ${standText(jokerStand)}`}
                    </p>
                  </>
                )}
                {gesperrt && (
                  <p style={{ fontSize: 11, color: C.coral, marginTop: 8, lineHeight: 1.4 }}>
                    Angepfiffen — die Gewichtung ist eingefroren.
                  </p>
                )}
              </div>
            )}

            {/* Duell-Joker (nur an einem Duell-Spieltag DIESES Spielers, siehe
                `istDuellSpieltag` oben) — dasselbe Chip-Muster wie beim
                Ranking-Gewicht/Joker oben, nur in Coral statt Gold, damit der
                dritte Joker-Topf optisch als eigener erkennbar bleibt. */}
            {istDuellSpieltag && (
              <div style={{
                marginTop: 18, background: `${C.coral}0E`, border: `1px solid ${C.coral}33`,
                borderRadius: 14, padding: "13px 15px", opacity: gesperrt ? 0.55 : 1,
              }}>
                <div style={{ fontSize: 11, color: C.coral, textTransform: "uppercase", letterSpacing: 1 }}>
                  Duell-Joker
                </div>
                {duellZulaessig.length === 0 ? (
                  <p style={{ fontSize: 11.5, color: C.muted, marginTop: 9, lineHeight: 1.45 }}>
                    Aktuell kein zulässiges Ziel — z.&nbsp;B. weil niemand infrage kommt,
                    dein Immun-Fenster noch läuft oder du das Ziel-Limit schon erreicht hast.
                  </p>
                ) : (
                  <>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                      {duellZulaessig.map((zielId) => {
                        const name = board.find((b) => b.userId === zielId)?.name ?? zielId;
                        const on = duellZiel === zielId;
                        return (
                          <button key={zielId} disabled={gesperrt}
                            onClick={() => setDuellZiel(on ? null : zielId)} style={{
                              cursor: gesperrt ? "default" : "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700,
                              padding: "8px 14px", borderRadius: 999,
                              background: on ? `${C.coral}22` : C.surface,
                              color: on ? C.coral : C.muted,
                              border: `1px solid ${on ? C.coral + "77" : C.line}`,
                            }}>{name}</button>
                        );
                      })}
                    </div>
                    {duellZiel && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                        {duellTypenErlaubt.map((typKey) => {
                          const info = DUELL_TYPEN.find((d) => d.key === typKey);
                          const on = duellTypGewaehlt === typKey;
                          return (
                            <button key={typKey} disabled={gesperrt}
                              onClick={() => setDuellTypGewaehlt(on ? null : typKey)} style={{
                                cursor: gesperrt ? "default" : "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700,
                                padding: "8px 14px", borderRadius: 999,
                                background: on ? `${C.coral}22` : C.surface,
                                color: on ? C.coral : C.muted,
                                border: `1px solid ${on ? C.coral + "77" : C.line}`,
                              }}>{info?.label ?? typKey}</button>
                          );
                        })}
                      </div>
                    )}
                    <p style={{ fontSize: 10.5, color: C.muted, marginTop: 9, lineHeight: 1.45 }}>
                      Wähle ein Ziel und eine Art — keine Auswahl heißt kein Duell an diesem Spieltag.
                    </p>
                  </>
                )}
                {gesperrt && (
                  <p style={{ fontSize: 11, color: C.coral, marginTop: 8, lineHeight: 1.4 }}>
                    Angepfiffen — der Duell-Joker ist eingefroren.
                  </p>
                )}
              </div>
            )}

            {/* Snapshot-Hinweis + Absenden */}
            <div style={{
              marginTop: 20, display: "flex", gap: 8, alignItems: "flex-start",
              fontSize: 11.5, color: C.muted, lineHeight: 1.5,
            }}>
              <span style={{ color: C.gold }}>◆</span>
              <span>Snapshot-Quote: alle Mitspieler bekommen dieselbe Quote, egal wann sie tippen. Gilt bis Anpfiff.</span>
            </div>
            <button onClick={submit} style={{
              marginTop: 14, width: "100%", cursor: "pointer",
              background: C.gold, color: C.ink, fontWeight: 700, fontSize: 15,
              border: "none", borderRadius: 14, padding: "14px 0",
            }}>
              Tipp abgeben & Quote einfrieren
            </button>
          </div>
        ) : (
          <Confirmation
            snap={SNAP} h={h} a={a} winner={winner} csQuote={csQuote}
            kickoffLabel={kickoffLabel} picks={picks} teams={teams} saveState={saveState}
            einsatzGrund={einsatzGrund} jokerGrund={jokerGrund} narrenGrund={narrenGrund}
            klasseGrund={klasseGrund} widerrufGrund={widerrufGrund}
            roundName={roundName}
            onEdit={() => { setSaveState("idle"); setDone(false); }}
          />
        )}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Stepper({ value, onStep }) {
  const btn = {
    width: 34, height: 34, borderRadius: 10, cursor: "pointer",
    background: C.surface2, color: C.text, border: `1px solid ${C.line}`,
    fontSize: 20, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <button onClick={() => onStep(1)} style={btn}>+</button>
      <div style={{
        fontFamily: MONO, fontWeight: 700, fontSize: 44, color: C.gold, width: 54, textAlign: "center",
        fontVariantNumeric: "tabular-nums", textShadow: `0 0 24px ${C.gold}44`,
      }}>{value}</div>
      <button onClick={() => onStep(-1)} style={btn}>−</button>
    </div>
  );
}

function PlayerSelect({ label, value, quote, players, onChange, allowEmpty, dim, flex }) {
  return (
    <div style={{ flex }}>
      <div style={{
        background: dim ? C.ink2 : C.surface, border: `1px solid ${C.line}`,
        borderRadius: 12, padding: "8px 10px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 10.5, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
          {quote != null && <span style={{ fontFamily: MONO, fontSize: 11, color: C.gold }}>{quote.toFixed(1)}</span>}
        </div>
        <select value={value} onChange={(e) => onChange(e.target.value)} style={{
          width: "100%", background: "transparent", color: value ? C.text : C.muted,
          border: "none", fontSize: 14, outline: "none", fontFamily: "inherit",
        }}>
          {allowEmpty && <option value="" style={{ color: "#000" }}>– keiner –</option>}
          {Object.keys(players).map((p) => (
            <option key={p} value={p} style={{ color: "#000" }}>{p}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

const SAVE_HINT = {
  saving: { text: "wird gespeichert …", col: C.muted },
  guest:  { text: "nicht eingeloggt — lokal eingefroren, aber nicht gespeichert", col: C.gold },
  error:  { text: "Speichern fehlgeschlagen — später erneut versuchen", col: C.coral },
};

function Confirmation({
  snap, h, a, winner, csQuote, kickoffLabel, picks, teams, saveState,
  einsatzGrund, jokerGrund, narrenGrund, klasseGrund, widerrufGrund, roundName, onEdit,
}) {
  // Einsatz-Modus: nicht gespeichert, weil der Spieltag die Einsatz-Regeln
  // verletzt (design/einsatz-joker.md 3.2). Der GRUND wird beim Absenden
  // ausformuliert und hier nur eingesetzt — es gibt mehrere verschiedene, und
  // „ungültig" allein sagt dem Spieler nicht, was er tun soll.
  // Joker-Grundform: derselbe Aufbau, nur mit dem Grund aus
  // `pruefeJokerEinsatz` (design/kontaktstellen.md Abschnitt 5 Punkt 1).
  // Narren-Zahlungsfähigkeit: derselbe Aufbau, Grund aus `kannBezahlen`
  // (design/kontaktstellen.md Abschnitt 5 Punkt 2).
  // Kontingent-Klassen/Widerruf: derselbe Aufbau, Gründe aus `pruefeEinsatz`
  // bzw. `darfWiderrufen` (design/kontaktstellen.md Abschnitt 5 Punkt 5).
  const hint = saveState === "saved"
    ? { text: `✓ gespeichert in „${roundName ?? "deiner Runde"}"`, col: C.mint }
    : saveState === "einsatzUngueltig"
    ? { text: `nicht gespeichert — ${einsatzGrund}`, col: C.coral }
    : saveState === "jokerUngueltig"
    ? { text: `nicht gespeichert — ${jokerGrund}`, col: C.coral }
    : saveState === "narrenUngueltig"
    ? { text: `nicht gespeichert — ${narrenGrund}`, col: C.coral }
    : saveState === "klasseUngueltig"
    ? { text: `nicht gespeichert — ${klasseGrund}`, col: C.coral }
    : saveState === "widerrufUngueltig"
    ? { text: `nicht gespeichert — ${widerrufGrund}`, col: C.coral }
    : SAVE_HINT[saveState];
  return (
    <div style={{ position: "relative", padding: "30px 22px 24px" }}>
      <div style={{
        width: 52, height: 52, borderRadius: 999, margin: "0 auto",
        background: `${C.mint}22`, border: `1px solid ${C.mint}66`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: C.mint, fontSize: 26,
      }}>✓</div>
      <div style={{ textAlign: "center", marginTop: 14, fontSize: 18, fontWeight: 700 }}>Tipp eingefroren</div>
      <div style={{ textAlign: "center", fontSize: 12.5, color: C.muted, marginTop: 4 }}>
        Quote gesichert · gilt bis Anpfiff {kickoffLabel}
      </div>
      {hint && (
        <div style={{ textAlign: "center", fontSize: 12, color: hint.col, marginTop: 8, fontFamily: MONO }}>
          {hint.text}
        </div>
      )}

      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: 16, marginTop: 20 }}>
        <Row label="Endstand" value={`${h}:${a}`} accent={C.gold} mono />
        <Row label="Sieger" value={winner} />
        <Row label="Exakt-Quote" value={csQuote ? csQuote.toFixed(1) : "seltenes Ergebnis"} mono />
        <div style={{ height: 1, background: C.line, margin: "10px 0" }} />
        {teams.map((team, ti) => (
          <div key={team.side} style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 10.5, color: C.muted, fontFamily: MONO, letterSpacing: 1, marginBottom: 4 }}>
              {team.name.toUpperCase()}
            </div>
            {picks[ti].map((p, pi) => (
              <div key={pi} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "2px 0" }}>
                <span>{p.main}{p.backup && <span style={{ color: C.muted }}> · Backup {p.backup}</span>}</span>
                <span style={{ fontFamily: MONO, color: C.gold }}>
                  {snap.players[team.side][p.main].anytime.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <button onClick={onEdit} style={{
        marginTop: 16, width: "100%", cursor: "pointer",
        background: "transparent", color: C.text, fontWeight: 600, fontSize: 14,
        border: `1px solid ${C.line}`, borderRadius: 14, padding: "12px 0",
      }}>
        Vor Anpfiff noch bearbeiten
      </button>
      <Link href="/ranking" style={{
        marginTop: 10, display: "block", textAlign: "center", textDecoration: "none",
        color: C.ink, background: C.mint, fontWeight: 700, fontSize: 14,
        borderRadius: 14, padding: "12px 0",
      }}>
        Zum Leaderboard →
      </Link>
    </div>
  );
}

function Row({ label, value, accent, mono }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0" }}>
      <span style={{ fontSize: 13, color: C.muted }}>{label}</span>
      <span style={{
        fontSize: 15, fontWeight: 600, color: accent || C.text,
        fontFamily: mono ? MONO : "inherit",
      }}>{value}</span>
    </div>
  );
}
