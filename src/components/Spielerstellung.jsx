"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  DEFAULT_RULES, RULE_LIMITS,
  encodePreset, decodePreset, sanitizeRules, istCreatorCode,
  REGLER_FEINHEITEN, reglerSchritt, einsatzKonflikte,
} from "@/lib/engine";
import { istTeilCode, wendeTeilCodeAn } from "@/lib/teilbibliothek";
import { PRESETS } from "@/lib/presets";
import { recommendedDisplayScale } from "@/lib/rulePreview";
import { isPremium } from "@/lib/premium";
import { STAERKE_STUFEN, BETRIFFT, beschreibeBetrifft } from "@/lib/catchup";
import { KURVEN, KURVE, SAISONFORM_LIMITS, beschreibeSaisonform } from "@/lib/saisonform";
import { TIPPEINFLUSS_LIMITS, beschreibeTippEinfluss } from "@/lib/tippEinfluss";
import { VERSAEUMNIS_STRATEGIEN, VERSAEUMNIS_LABEL, VERSAEUMNIS_HINT } from "@/lib/autoTip";
import { alleVereine, vereineVon, LIGEN } from "@/lib/ligen";
import { wettbewerbLabel } from "@/lib/wettbewerbe";
import { beschreibeVerteilung } from "@/lib/jokerPlan";
import { TAKTE, perioden } from "@/lib/jokerBudget";
import { PHASEN, DUELL_LIMITS } from "@/lib/duellJoker";
import { beschreibeMuenzTakt, muenzTaktKonflikte } from "@/lib/muenzTakt";
import { getStore } from "@/lib/store";
import { useAuth } from "@/components/AuthProvider";
import { useCurrentRound } from "@/components/RoundProvider";
import BackLink from "@/components/BackLink";
import AnsichtSchalter from "@/components/AnsichtSchalter";
import VariantenWahl from "@/components/VariantenWahl";
import RegelVorschau from "@/components/RegelVorschau";
import PresetRating from "@/components/PresetRating";
import PresetMischen from "@/components/PresetMischen";
import SaisonWetten from "@/components/SaisonWetten";
import Ereignisse from "@/components/Ereignisse";
import DuellJoker from "@/components/DuellJoker";
import Drehrad from "@/components/Drehrad";
import WettbewerbGewichte from "@/components/WettbewerbGewichte";
import RundenCharaktere from "@/components/RundenCharaktere";
import EinfacheRegler from "@/components/EinfacheRegler";
import { CHARAKTERE } from "@/lib/charaktere";
import BalanceAmpel from "@/components/BalanceAmpel";
import ProfiWarnungen from "@/components/ProfiWarnungen";
import JokerVerteilung from "@/components/JokerVerteilung";
import JokerOekonomie from "@/components/JokerOekonomie";
import Mitbestimmung from "@/components/Mitbestimmung";
import Bausteine from "@/components/Bausteine";
import LimitKlassen from "@/components/LimitKlassen";
import JokerGrundform from "@/components/JokerGrundform";
import AufwandPanel from "@/components/AufwandPanel";
import { band } from "@/lib/reglerWarnung";
import { BIGGAME_LIMITS } from "@/lib/bigGame";
import { AUSWAHL_LIMITS, sanitizeSpiele, beschreibeAuswahl, spieleProSpieltag } from "@/lib/spielauswahl";
import { VORLAUF_STUFEN, ANKER, beschreibeTippfenster, erklaereTippfenster } from "@/lib/tippfenster";
import SpielauswahlWettbewerbe from "@/components/SpielauswahlWettbewerbe";
import SpielauswahlListe from "@/components/SpielauswahlListe";
import LigaSonderregeln from "@/components/LigaSonderregeln";
import Alleinstellung from "@/components/Alleinstellung";
import Zeitachse from "@/components/Zeitachse";
import { C, MONO, SCHRIFT } from "@/lib/theme";
import { zahl, fmtFaktor, fmtFaktorOderAus } from "@/lib/format";
import { Zahl } from "@/components/Eingaben";
import { TAPZIEL, TAPZIEL_QUADRAT } from "@/lib/tapziel";

// Alle Klubs ALLER Wettbewerbe — sonst ließe sich keine Runde bauen, die
// Bundesliga und Premier League mischt.
const ALL_TEAMS = alleVereine();

// Zahlen-Anzeige: `src/lib/format.js` ist die eine Quelle (Begründung dort).

// Ranking-Pool aus zwei verständlichen Reglern erzeugen: höchstes Gewicht und
// Anzahl der Stufen. Dazwischen gleichmäßig bis 1 herunter — so ist der Pool
// immer gültig (absteigend, ohne Dubletten), ohne dass der Admin einzelne
// Faktoren von Hand pflegen muss.
function buildWeightPool(max, anzahl) {
  const arr = [];
  for (let i = 0; i < anzahl; i++) {
    // ⚠️ Zwei Nachkommastellen, nicht eine. Seit die Joker-Faktoren auf dem
    // 0,05-Raster stehen, hätte `toFixed(1)` den erzeugten Pool wieder auf
    // 0,1er-Stufen gezwungen — ein Höchstgewicht von 1,15 wäre nicht baubar
    // gewesen, obwohl der Regler es hergibt. Das war kein Anzeige-, sondern
    // ein Rechenfehler: der Pool selbst wurde grob.
    arr.push(+(max - ((max - 1) * i) / (anzahl - 1)).toFixed(2));
  }
  return [...new Set(arr)].sort((a, b) => b - a);
}

// ── Design-Tokens (gleich wie die anderen Screens) ──────────

export default function Spielerstellung() {
  const { user } = useAuth();
  const { setRoundId } = useCurrentRound();
  // Start aus dem Standard-Preset (nicht aus DEFAULT_RULES): DEFAULT_RULES ist
  // der technische Fallback ohne Balance-Dämpfung — als Startwert für einen
  // Admin wäre das eine unausgewogene Runde.
  const [rules, setRules] = useState(() => sanitizeRules(PRESETS[0].rules));
  const [presetKey, setPresetKey] = useState("standard");
  // Ansicht: dieselbe Runde, nur unterschiedlich viel sichtbar.
  // „einfach" = Voreinstellungen und die wichtigsten Regler · „profi" = alles.
  // Beim Wechsel geht NICHTS verloren, weil beide auf demselben `rules`-Objekt
  // arbeiten. Seit 20.08.2026 nur noch ZWEI (Andi) — „anpassen" ist entfallen.
  const [stufe, setStufe] = useState("einfach");
  // 🔴 Welcher Joker-Modus galt, bevor auf „Budget" gewechselt wurde. Ohne das
  // landet ein Rückwechsel stillschweigend auf „Ein Joker": `einsatz` ist EIN
  // Wert desselben Feldes, das Verlassen überschreibt also die vorige Wahl.
  // Wer von „Rangliste" ins Budget und zurück geht, will „Rangliste" wieder.
  const [letzterModus, setLetzterModus] = useState("einzel");
  const [charakterKey, setCharakterKey] = useState(null);
  const [mischenOffen, setMischenOffen] = useState(false);
  // Die Spielauswahl ist KEIN lokaler Zustand mehr, sondern Teil des
  // Regelwerks — nur so reist sie im Creator-Code mit.
  const [eigeneVereine, setEigeneVereine] = useState(false);
  // Welche der großen Zeilen ist aufgeklappt (Andis Aufbau vom 07.08.2026)?
  // Bewusst EINE auf einmal: auf 390 px schiebt eine offene Team-Liste alles
  // andere so weit nach unten, dass zwei offene Bereiche nicht mehr in einen
  // Blick passen — der Sinn der Zeilen war, den Screen kurz zu halten.
  const [auswahlOffen, setAuswahlOffen] = useState(null);
  // Und innerhalb der Wettbewerbs-Zeile: welche LIGA zeigt ihre Mannschaften?
  // Auch hier eine auf einmal — 18 Chips sind schon eine halbe Bildschirmhöhe.
  const [offeneLiga, setOffeneLiga] = useState(null);
  // Und darin: für welche Liga steht das Sonderregel-Fenster offen (Schritt 3)?
  const [sonderregelnLiga, setSonderregelnLiga] = useState(null);
  const [imp, setImp] = useState("");
  const [impErr, setImpErr] = useState("");
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(null);
  const [createErr, setCreateErr] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);
  const [shortCode, setShortCode] = useState(null);   // veröffentlichter Kurzcode
  const [publishing, setPublishing] = useState(false);
  const [shortCopied, setShortCopied] = useState(false);

  // Jede Regeländerung macht einen zuvor erzeugten Kurzcode ungültig (er zeigt
  // sonst auf ein altes Regelwerk).
  const touched = () => { setPresetKey(null); setShortCode(null); };
  const applyPreset = (preset) => {
    setPresetKey(preset.key); setShortCode(null);
    setRules({ ...sanitizeRules(preset.rules), name: preset.label });
  };
  const patch = (p) => { touched(); setRules((r) => ({ ...r, ...p })); };
  const patchCombo = (p) => { touched(); setRules((r) => ({ ...r, combo: { ...r.combo, ...p } })); };
  const patchMarkets = (p) => { touched(); setRules((r) => ({ ...r, markets: { ...r.markets, ...p } })); };
  const patchGoals = (p) => { touched(); setRules((r) => ({ ...r, markets: { ...r.markets, goals: { ...r.markets.goals, ...p } } })); };
  const patchJoker = (p) => { touched(); setRules((r) => ({ ...r, joker: { ...r.joker, ...p } })); };

  // ── Variantenwahl (Andis erste Frage, 20.08.2026) ─────────
  // 🔴 Budget schaltet die Gewichtung MIT EIN. Ohne das wäre die Wahl folgenlos:
  // `modus` gilt nur, wenn `joker.enabled` steht — ein Admin hätte „Budget"
  // gewählt und bekäme ein Spiel ohne Münzen.
  //
  // ⚠️ Der Rückweg schaltet NICHT ab. Quotentippen ist das Grundspiel, Joker
  // sind ein Zusatz darauf (Andi: „das ist kein eigener Spielmodus") — wer die
  // Variante wechselt, will keine ausgeschaltete Gewichtung, sondern die
  // vorige zurück.
  //
  // ⚠️ Hier steht bewusst `rules.joker` und nicht die Abkürzung `j` — die wird
  // erst weiter unten gebunden. Über den Ereignispfad liefe es, weil der erst
  // nach dem Rendern feuert; lesbar wäre es nicht.
  const waehleVariante = (v) => {
    const jetzt = rules.joker?.modus;
    if (v === "budget") {
      if (jetzt !== "einsatz") setLetzterModus(jetzt || "einzel");
      patchJoker({ enabled: true, modus: "einsatz" });
    } else if (jetzt === "einsatz") {
      patchJoker({ modus: letzterModus });
    }
  };
  const patchTeamMods = (p) => { touched(); setRules((r) => ({ ...r, teamMods: { ...r.teamMods, ...p } })); };
  const patchAufholen = (p) => { touched(); setRules((r) => ({ ...r, aufholen: { ...r.aufholen, ...p } })); };
  const patchSaisonform = (p) => { touched(); setRules((r) => ({ ...r, saisonform: { ...(r.saisonform || DEFAULT_RULES.saisonform), ...p } })); };
  const patchBudget = (p) => { touched(); setRules((r) => ({ ...r, budget: { ...(r.budget || DEFAULT_RULES.budget), ...p } })); };
  // `JokerOekonomie` meldet meist nur einen Narren/Shop-Patch zurück (ein
  // einzelnes `budget`-Feld) — der läuft über `patchBudget` oben. Ein Klick in
  // der Bibliothek dort übernimmt dagegen das GANZE Regelfragment einer
  // Kombination auf einmal (`budget` + `limitKlassen` + `duell`, alle drei
  // GANZ ERSETZT, nicht gemischt) — dafür reicht ein einzelnes Budget-Feld
  // nicht, deshalb der Zweig hier. `joker` (der klassische Joker aus den
  // Wertungs-Presets) rührt die Ökonomie nicht an (design/gehaeuse-ui.md 4b).
  const patchOekonomie = (p) => {
    const keys = Object.keys(p);
    if (keys.length === 1 && keys[0] === "budget") { patchBudget(p.budget); return; }
    touched();
    setRules((r) => ({ ...r, ...p }));
  };
  const patchTippEinfluss = (p) => { touched(); setRules((r) => ({ ...r, tippEinfluss: { ...(r.tippEinfluss || DEFAULT_RULES.tippEinfluss), ...p } })); };
  const patchVersaeumnis = (p) => { touched(); setRules((r) => ({ ...r, versaeumnis: { ...r.versaeumnis, ...p } })); };
  const patchBigGame = (p) => { touched(); setRules((r) => ({ ...r, bigGame: { ...r.bigGame, ...p } })); };
  const setSaison = (saison) => { touched(); setRules((r) => ({ ...r, saison })); };
  // Faktor eines Vereins durch feste Stufen weiterdrehen. 1 = kein
  // Modifikator und fliegt aus der Liste, damit das Regelwerk klein bleibt.
  // Der nächste Wert wird IM Updater aus dem vorherigen Stand berechnet —
  // sonst lesen mehrere schnelle Klicks denselben alten Wert.
  //
  // ⚠️ Der Zyklus führt seit dem Dämpfer (02.08.) auch DURCH die Werte unter 1.
  // Vorher lief er nur aufwärts in 0,1-Schritten — damit war ein Dämpfer über
  // die Oberfläche gar nicht einstellbar, obwohl die Logik ihn seit demselben
  // Tag kann. Genau die tote Kontaktstelle, die dieser Baukasten nicht haben
  // darf; sie war beim Drehrad-Schalter schon einmal da.
  //
  // Feste Stufen statt +0,1: Mit Dämpfern wären es sonst 17 Antipper für einen
  // vollen Durchlauf. Sechs benannte Stufen sind bedienbar, liegen alle auf dem
  // 0,05-Raster, und wer es genauer will, hat den Regler in der Profi-Stufe.
  const TEAM_STUFEN = [1.25, 1.5, 2, 0.75, 0.5, 1];
  const cycleTeamFaktor = (team) => {
    touched();
    setRules((r) => {
      const teams = { ...(r.teamMods?.teams || {}) };
      const jetzt = teams[team] ?? 1;
      const i = TEAM_STUFEN.indexOf(jetzt);
      const naechster = TEAM_STUFEN[(i + 1) % TEAM_STUFEN.length];
      if (naechster !== 1) teams[team] = naechster; else delete teams[team];
      return { ...r, teamMods: { ...r.teamMods, teams } };
    });
  };

  // Empfohlene Anzeige-Skalierung — hängt am Regelwerk inkl. Joker-Faktor.
  const empfohleneSkala = useMemo(() => recommendedDisplayScale(rules), [rules]);

  // Premium des Admins: schaltet die Gewichtung frei. Die Anzeige hier ist
  // nur Komfort — durchgesetzt wird beim Anlegen im Store (applyEntitlements).
  const [premium, setPremium] = useState(false);
  useEffect(() => {
    if (!user) { setPremium(false); return; }
    let live = true;
    getStore().getProfile(user.id)
      .then((p) => { if (live) setPremium(isPremium(p)); })
      .catch(() => {});
    return () => { live = false; };
  }, [user]);

  const code = useMemo(() => encodePreset(rules), [rules]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { /* Clipboard nicht verfügbar — Nutzer kann den Code markieren */ }
  };

  // Lädt entweder einen langen Text-Creator-Code oder einen kurzen
  // Content-Creator-Code (server-gespeichertes Preset).
  // ⚠️ Die Präfixe stehen NICHT hier, sondern in `engine.js` (`istCreatorCode`).
  // Ein hier hingeschriebenes „TS1-" ließ beim Umstieg auf das Delta-Format
  // jeden neuen Code in den Kurzcode-Zweig laufen und beim Store auflaufen.
  const load = async () => {
    const val = imp.trim();
    setImpErr("");
    // ⚠️ Teil-Code (TS2A-…) MUSS vor istCreatorCode geprüft werden. Sonst
    // fiele er in den Kurzcode-Zweig darunter und liefe beim Store auf —
    // dieselbe Falle, die es beim Umstieg auf das Delta-Format schon einmal
    // gab (siehe Kommentar bei istCreatorCode unten).
    if (istTeilCode(val)) {
      try {
        const neu = wendeTeilCodeAn(rules, val);
        setPresetKey(null);
        setRules(neu);
        setImp("");
      } catch {
        setImpErr("Kein gültiger Teil-Code.");
      }
      return;
    }
    if (istCreatorCode(val)) {
      try { setPresetKey(null); setRules(sanitizeRules(decodePreset(val))); setImp(""); }
      catch { setImpErr("Kein gültiger Creator-Code."); }
      return;
    }
    try {
      const preset = await getStore().getPresetByCode(val);
      if (!preset) { setImpErr("Kein Regelwerk unter diesem Code gefunden."); return; }
      setPresetKey(null);
      setRules({ ...sanitizeRules(preset.rules), name: preset.name || sanitizeRules(preset.rules).name });
      setImp("");
    } catch { setImpErr("Konnte den Code nicht laden. Später erneut versuchen."); }
  };

  // Veröffentlicht das aktuelle Regelwerk unter einem kurzen, teilbaren Code.
  const publish = async () => {
    if (!user) { setImpErr("Zum Erstellen eines Kurzcodes bitte einloggen."); return; }
    setPublishing(true);
    try {
      const p = await getStore().publishPreset({ name: rules.name, rules, creatorId: user.id });
      setShortCode(p.code);
    } catch { setImpErr("Kurzcode konnte nicht erstellt werden. Später erneut versuchen."); }
    finally { setPublishing(false); }
  };

  const copyShort = async () => {
    if (!shortCode) return;
    try { await navigator.clipboard.writeText(shortCode); setShortCopied(true); setTimeout(() => setShortCopied(false), 1500); }
    catch { /* Nutzer kann den Code markieren */ }
  };

  // Spielauswahl aus dem Regelwerk. `patchSpiele` laesst sie durch
  // sanitizeSpiele laufen, damit ein halb gesetzter Modus („teams" mit nur
  // einem Verein) gar nicht erst entsteht — nur der Rohzustand der Vereinsliste
  // bleibt darunter erhalten, sonst koennte man nie den zweiten Verein waehlen.
  const sp = rules.spiele || DEFAULT_RULES.spiele;
  const patchSpiele = (p) => { touched(); setRules((r) => ({ ...r, spiele: { ...(r.spiele || DEFAULT_RULES.spiele), ...p } })); };
  // `modus` kann nur EINES sein. Ohne die Sperre wirkte der Team-Filter noch
  // aufgeklappt, während die Liste schon zählt — zwei sichtbare Wahrheiten
  // über dieselbe Frage.
  const listeOn = sp.modus === "liste";
  const teamFilterOn = !listeOn && (sp.modus === "teams" || (sp.teams?.length ?? 0) > 0);
  const selectedTeams = sp.teams ?? [];
  const toggleTeam = (team) => {
    const teams = selectedTeams.includes(team)
      ? selectedTeams.filter((t) => t !== team)
      : [...selectedTeams, team];
    patchSpiele({ modus: "teams", teams });
  };

  const teamFilterInvalid = teamFilterOn && selectedTeams.length < 2;

  // ── 🔴 Lässt die Auswahl überhaupt ein Spiel übrig? ────────
  // Seit dem 09.08.2026 greift die Spielauswahl WIRKLICH in der Runde. Vorher
  // war eine leere Auswahl folgenlos (es kamen ohnehin alle Spiele); jetzt
  // erzeugte sie eine Runde ohne ein einziges Spiel. Die Zahl kommt aus
  // `SpielauswahlWettbewerbe`, das sie ohnehin rechnet — nicht hier noch
  // einmal, das wäre die zweite Wahrheit.
  const [spielZahl, setSpielZahl] = useState(null);
  const meldeSpielZahl = useCallback((z) => setSpielZahl(z), []);
  // ⚠️ Zonen sind die Ausnahme, und zwar eine echte: der Tabellenstand steht
  // erst, wenn ein Spieltag geöffnet ist. Eine Runde mit Abstiegskampf zeigt
  // VOR dem Start zu Recht 0 Spiele und ist trotzdem in Ordnung. Sie hier zu
  // blockieren hieße, eine korrekte Einstellung zu verbieten.
  const mitZonen = (sp.zonen?.length ?? 0) > 0
    || Object.values(sp.jeWettbewerb ?? {}).some((a) => (a.zonen?.length ?? 0) > 0);
  const leereAuswahl = spielZahl != null && spielZahl.uebrig === 0 && !mitZonen;

  // Der Stand, der RECHTS in der zugeklappten Zeile steht. Ohne ihn müsste man
  // jede Zeile öffnen, um zu sehen, ob überhaupt etwas eingestellt ist — genau
  // der Preis, den ein Aufklapp-Layout sonst kostet.
  // „alle" ist dabei kein Platzhalter, sondern die Wahrheit: nichts angehakt
  // heißt im Filter, dass alles dabei ist (`filterSpiele`).
  const wettbewerbeStand = (() => {
    const teile = [];
    const w = sp.wettbewerbe?.length ?? 0;
    if (w > 0) teile.push(`${w} gewählt`);
    if (teamFilterOn && selectedTeams.length > 0) teile.push(`${selectedTeams.length} Teams`);
    // Sonderregeln je Liga gehören in denselben Stand: sonst steht dort „alle",
    // während eine Liga schon auf „nur Derbys" eingestellt ist — eine
    // zugeklappte Zeile, die das verschweigt, ist schlimmer als gar keine.
    const sonder = Object.keys(sp.jeWettbewerb ?? {}).length;
    if (sonder > 0) teile.push(`${sonder}× Sonderregeln`);
    return teile.length > 0 ? teile.join(" · ") : "alle";
  })();

  // ── „Was kommt am Ende dabei heraus?" ─────────────────────
  // Verteilung, Stärke und Ereignisse werden an drei Stellen eingestellt; der
  // Admin sah nirgends das Ergebnis. Diese eine Zeile fasst die drei Antworten
  // zusammen — wie viele, wie stark, und wie viele davon verdienbar.
  const jokerZusammenfassung = useMemo(() => {
    const j = rules.joker;
    if (!j?.enabled) return null;
    const teile = [];

    // Wie viele und wann — jokerPlan formuliert das schon in Klartext, endet
    // dort aber als eigener Satz. Der Punkt muss weg, sonst steht mitten in
    // der Zeile „… Joker. · jeder ×1,5."
    teile.push(beschreibeVerteilung(j.verteilung, 34).replace(/\.$/, ""));

    // Wie stark.
    teile.push(j.modus === "ranking"
      ? `Gewichte bis ${fmtFaktor(Math.max(...(j.faktoren || [1])))}`
      : `jeder ${fmtFaktor(j.faktor ?? 1.5)}`);

    // Woher zusätzlich — nur wenn Ereignisse überhaupt etwas beisteuern.
    const er = rules.ereignisse;
    if (er?.enabled && (er.aktive?.length ?? 0) > 0 && er.maxErspielt > 0) {
      teile.push(`dazu bis zu ${er.maxErspielt} verdienbar`);
    }
    return teile.filter(Boolean).join(" · ") + ".";
  }, [rules.joker, rules.ereignisse]);

  // ── Vereine je Wettbewerb ─────────────────────────────────
  // Leere Wettbewerbs-Auswahl heißt „alle" (siehe spielauswahl.js) — dann
  // werden auch alle Gruppen gezeigt. Sonst nur die gewählten: wer Bundesliga
  // und CL spielt, soll Serie A gar nicht erst sehen.
  const teamGruppen = useMemo(() => {
    const gewaehlt = sp.wettbewerbe ?? [];
    return LIGEN
      .filter((l) => gewaehlt.length === 0 || gewaehlt.includes(l.key))
      .map((l) => ({ key: l.key, label: wettbewerbLabel(l.key), vereine: vereineVon(l.key) }))
      .filter((g) => g.vereine.length > 0);
  }, [sp.wettbewerbe]);

  // Eine ganze Liga an- oder abwählen — 18-mal klicken ist keine Bedienung.
  const toggleLiga = (vereine) => {
    const alleDrin = vereine.every((v) => selectedTeams.includes(v));
    const teams = alleDrin
      ? selectedTeams.filter((t) => !vereine.includes(t))
      : [...new Set([...selectedTeams, ...vereine])];
    patchSpiele({ modus: "teams", teams });
  };

  // Gewählte Vereine, die in keiner sichtbaren Gruppe mehr vorkommen — etwa
  // weil ihr Wettbewerb nachträglich abgewählt wurde. Sie blieben sonst still
  // im Filter stehen und niemand sähe, warum die Runde leer wirkt.
  const verwaisteTeams = useMemo(() => {
    const sichtbar = new Set(teamGruppen.flatMap((g) => g.vereine));
    return selectedTeams.filter((t) => !sichtbar.has(t));
  }, [teamGruppen, selectedTeams]);

  // ── Aufwand: `kontext.spieleJeSpieltag` fürs AufwandPanel ─────
  // Eine plausible Reihe aus der aktuellen Spielauswahl, wenn eine ermittelbar
  // ist: bei „alle Spiele" ist das exakt (n Vereine → n/2 Spiele je Spieltag);
  // bei einer Team-Beschränkung liefert `spieleProSpieltag` nur eine Spanne
  // (kein Spielplan liegt hier vor) — die Mitte dient als plausibler Wert,
  // dieselbe Rechnung wie in der Rückmeldung unter der Team-Auswahl unten.
  // Ohne Spieltag-Grenzen dient eine volle Saison (34 Spieltage) als schlichte
  // Vorgabe; `aufwand()` bildet ohnehin den Median darüber (aufwand.js
  // Kopfkommentar).
  const aufwandKontext = useMemo(() => {
    const gesamt = teamGruppen.reduce((s, g) => s + g.vereine.length, 0) || ALL_TEAMS.length;
    let proSpieltag;
    if (teamFilterOn) {
      const { min, max } = spieleProSpieltag(selectedTeams.length, gesamt);
      proSpieltag = Math.round((min + max) / 2);
    } else {
      proSpieltag = Math.floor(gesamt / 2);
    }
    const von = sp.spieltagVon ?? 1;
    const bis = sp.spieltagBis ?? 34;
    const spieltage = Math.max(1, bis - von + 1);
    return { spieleJeSpieltag: Array(spieltage).fill(proSpieltag) };
  }, [teamFilterOn, selectedTeams, teamGruppen, sp.spieltagVon, sp.spieltagBis]);

  const createRound = async () => {
    if (!user) { setCreateErr("Bitte zuerst einloggen (Startseite)."); return; }
    if (teamFilterInvalid) { setCreateErr("Bitte mindestens 2 Teams auswählen (oder Team-Auswahl ausschalten)."); return; }
    if (leereAuswahl) {
      setCreateErr("Diese Auswahl lässt kein einziges Spiel übrig — die Runde hätte nichts zu tippen.");
      return;
    }
    setCreating(true); setCreateErr("");
    try {
      const round = await getStore().createRound({
        name: rules.name, adminId: user.id, adminName: user.name, rules,
        // Das Regelwerk SCHLAEGT VOR, die Runde HAELT FEST — sonst gaebe es
        // zwei Wahrheiten darueber, welche Spiele zaehlen.
        teamFilter: sanitizeSpiele(sp).modus === "teams" ? selectedTeams : null,
      });
      setCreated(round);
      setRoundId(round.id);
    } catch {
      setCreateErr("Runde konnte nicht angelegt werden. Später erneut versuchen.");
    } finally {
      setCreating(false);
    }
  };

  const copyJoinCode = async () => {
    if (!created) return;
    try { await navigator.clipboard.writeText(created.join_code); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 1500); }
    catch { /* Nutzer kann den Code markieren */ }
  };

  const L = RULE_LIMITS;
  const g = rules.markets.goals;
  const j = rules.joker;
  const jh = j.heimat ?? DEFAULT_RULES.joker.heimat;   // Heimatbonus
  const jm = j.mut ?? DEFAULT_RULES.joker.mut;         // Mut-Bonus
  const tm = rules.teamMods || { derbyFaktor: 1, teams: {} };
  const tmTeams = tm.teams || {};
  const tmAktiv = tm.derbyFaktor > 1 || Object.keys(tmTeams).length > 0;
  const au = rules.aufholen || DEFAULT_RULES.aufholen;
  const sf = rules.saisonform || DEFAULT_RULES.saisonform;
  const te = rules.tippEinfluss || DEFAULT_RULES.tippEinfluss;
  const ve = rules.versaeumnis || DEFAULT_RULES.versaeumnis;
  const bg = rules.bigGame || DEFAULT_RULES.bigGame;
  // Wie viele Runden-Spieltage teilen sich EIN Münz-Budget? Über `perioden()`
  // aus jokerBudget.js gerechnet, damit es dieselbe eine Quelle ist wie in
  // muenzTakt.js — nicht per Hand nach Takt-Namen unterschieden.
  const spieltageGesamt = aufwandKontext.spieleJeSpieltag.length || 34;
  const muenzPeriode = j.modus === "einsatz"
    ? perioden(j.einsatzTakt, { n: j.einsatzTaktN, fenster: j.einsatzFenster }, spieltageGesamt)[0] ?? null
    : null;
  const spieltageJePeriode = muenzPeriode ? muenzPeriode.bis - muenzPeriode.von + 1 : 1;
  // Typische Spieltagsgröße für den Einsatz-Modus (L2, Konflikt 2.1 Fall 2):
  // dieselbe Rechnung wie `aufwandKontext` oben fürs AufwandPanel — hier gibt
  // es keinen konkreten Spieltag, nur eine plausible Größe aus der aktuellen
  // Spielauswahl. `einsatzKonflikte` bekommt sie ausdrücklich als „typisch"
  // markiert (Text unten), verbindlich prüft erst die Tippabgabe.
  const einsatzSpieleTypisch = aufwandKontext.spieleJeSpieltag[0] ?? null;
  // ⚠️ Die Konflikt-Prüfung misst gegen die Spiele, die sich EIN Budget
  // teilen — seit dem Münz-Takt ist das nicht mehr der einzelne Spieltag,
  // sondern die ganze Periode (z. B. "alle 4 Spieltage"). Wer hier weiter die
  // Spieltagsgröße allein übergäbe, prüfte bei einem mehrspieltägigen Takt nur
  // gegen ein Viertel der wirklichen Spielzahl und meldete einen echten
  // Konflikt nicht.
  const einsatzSpieleJePeriode = einsatzSpieleTypisch != null
    ? einsatzSpieleTypisch * spieltageJePeriode : null;
  const einsatzKonfliktListe = j.modus === "einsatz"
    // Dritter Parameter: über wie viele Spieltage die Zahl geht — nur für den
    // Wortlaut. Ohne ihn meldete der Text „Bei 36 Spielen im Spieltag", obwohl
    // 36 die Spiele von vier Spieltagen sind.
    ? [...einsatzKonflikte(rules, einsatzSpieleJePeriode, spieltageJePeriode), ...muenzTaktKonflikte(rules)]
    : [];
  // Beschriftungen im Einsatz-Block hängen am Takt: "je Spieltag" stimmt nur,
  // solange sich eine Münz-Periode nicht über mehrere Spieltage erstreckt.
  const muenzZeitraum = (j.einsatzTakt ?? "spieltag") === "spieltag" ? "Spieltag" : "Periode";
  // `einsatzFenster` ist dieselbe Form wie `rules.duell`/`budget.fenster` —
  // `patchJoker` patcht nur FLACH, deshalb hier explizit mit dem bisherigen
  // Fenster mergen statt es zu ersetzen (dasselbe Muster wie `patchAufholen`
  // & Co. für andere verschachtelte Regelblöcke).
  const setzeFenster = (teil) => patchJoker({ einsatzFenster: { ...j.einsatzFenster, ...teil } });
  // Welche Voreinstellung passt zur aktuellen Stärke/Schwelle (für die Auswahl)?
  const auStufe = STAERKE_STUFEN.find((s) => s.staerke === au.staerke && s.schwelle === au.schwelle)?.key ?? "custom";

  return (
    <div style={{
      minHeight: "100vh", background: C.ink, color: C.text,
      fontFamily: SCHRIFT,
      padding: "28px 16px", display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      {/* ── Kopfzeile: „Menü“ links, Ansichts-Schalter rechts ──────────────
          🔴 20.08.2026, Andis Ansage. Zwei Dinge daran sind Absicht:

          1. **Sie klebt.** Der Schalter soll MITTENDRIN erreichbar sein — wer
             beim achten Regler merkt, dass ihm einer fehlt, soll umschalten
             können, ohne hochzuscrollen und die Stelle zu verlieren.
          2. **Sie liegt AUSSERHALB der Karte.** Die Karte hat
             `overflow: "clip"` und runde Ecken; ein Kleber darin würde am
             Kartenrand hängen, nicht am Fenster (dieselbe Falle wie bei der
             Balance-Ampel, siehe Kommentar dort).

          ⚠️ `zIndex: 20` liegt über der klebenden Ampel weiter unten (5) —
          sonst schöbe sich die Ampel beim Scrollen darüber. */}
      <div style={{
        position: "sticky", top: 0, zIndex: 20,
        width: "100%", maxWidth: 400,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
        // Deckend, sonst scrollt der Inhalt sichtbar dahinter durch. Der
        // negative Rand + Polsterung verbreitern den Deckel bis an die
        // Bildschirmkanten, ohne den Aufbau zu verschieben.
        background: C.ink, margin: "0 -16px", padding: "0 16px",
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <BackLink href="/menu" label="Menü" />
        </div>
        <AnsichtSchalter stufe={stufe} onWechsel={setStufe} />
      </div>
      <div style={{
        width: "100%", maxWidth: 400, position: "relative",
        // `clip` statt `hidden`: beides schneidet den Inhalt an den runden Ecken
        // ab, aber `hidden` macht den Rahmen zum SCROLL-Container — und damit
        // klebt `position: sticky` daran fest, statt am Fenster. Die Ampel
        // weiter unten scrollte deshalb stumm mit, ohne dass etwas kaputt
        // aussah. `clip` erzeugt keinen Scroll-Container und behebt es.
        borderRadius: 26, overflow: "clip",
        background: `radial-gradient(120% 80% at 50% -10%, ${C.ink2} 0%, ${C.ink} 60%)`,
        border: `1px solid ${C.line}`, boxShadow: "0 30px 80px -30px rgba(0,0,0,0.8)",
      }}>
        <div style={{
          position: "absolute", top: -90, left: "50%", transform: "translateX(-50%)",
          width: 320, height: 200, pointerEvents: "none",
          // 🔴 Der Schein trägt seit 21.08.2026 die VEREINSFARBE (`fan1`), nicht
          // mehr Mint. Das ist Andis „minimalistische Verzierung": die gewählte
          // Farbe taucht sichtbar auf, ohne eine Bedeutung zu überschreiben —
          // Mint heißt in dieser App „bestätigt", und ein dekorativer Schein
          // sagt gar nichts.
          background: `radial-gradient(circle, ${C.fan1}22 0%, transparent 70%)`,
        }} />

        <div style={{ position: "relative", padding: "26px 22px 24px" }}>
          {/* Kopf */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: 2, color: C.muted, textTransform: "uppercase" }}>
              Spiel erstellen
            </span>
            <button onClick={() => { setRules(DEFAULT_RULES); setPresetKey("standard"); }} style={{
              fontFamily: MONO, fontSize: 11, color: C.muted, cursor: "pointer",
              minHeight: 44, boxSizing: "border-box",
              background: C.surface, border: `1px solid ${C.line}`, borderRadius: 999, padding: "4px 14px",
            }}>zurücksetzen</button>
          </div>
          {/* 🔴 EINE Überschrift für beide Ansichten (20.08.2026). Vorher
              wechselte sie zwischen „Wie soll eure Runde sein?“ und
              „Regelwerk einstellen“ — beim Umschalten sprang also die
              Überschrift, obwohl es derselbe Bildschirm mit denselben
              Abschnitten ist. Das widerspricht ST2 in seinem Kern: die
              Ansicht ändert, WIE VIEL man sieht, nicht WO man ist.
              Gemessen am 20.08.: die Abschnittsfolge beider Ansichten war
              danach an jeder Stelle gleich. */}
          <div style={{ marginTop: 6, fontSize: 20, fontWeight: 700 }}>
            Wie soll eure Runde sein?
          </div>
          {/* Der Erklärsatz „Du als Admin legst fest …“ ist auf Andis Ansage
              (07.08.2026) GANZ weggefallen: er stand über einem Screen, der
              sich selbst erklärt, kostete auf dem iPhone drei Zeilen und
              wiederholte, was der Creator-Code-Block weiter unten ohnehin
              sagt. Der Untertitel hier gilt seit 20.08. in BEIDEN Ansichten —
              die Voreinstellungen stehen jetzt in beiden. */}
          <p style={{ fontSize: 13, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
            Ein Klick genügt — den Rest stellen wir stimmig ein. Wer mag, geht danach ins Detail.
          </p>

          {/* 🔴 Der Umschalter steht seit 20.08.2026 NICHT mehr hier, sondern
              oben rechts neben „Menü“ und klebt dort fest. Andi: „integriere
              da bitte auch oben rechts genauso wie bei Menü zurück nen
              Switchschalter der immer da ist."
              Tragend ist seine Begründung, nicht der Platz: man will
              MITTENDRIN wechseln, wenn ein Regler fehlt — nicht nur am Anfang.
              Ein Umschalter, der nach oben wegscrollt, zwingt jedes Mal hoch
              und wieder zurück. Hier bleibt nur der Hinweis darauf (ST8). */}
          <p style={{ fontSize: 12, color: C.muted, marginTop: 12, marginBottom: 14, lineHeight: 1.45 }}>
            Oben rechts schaltest du zwischen <b style={{ color: C.text }}>Einfach</b> und{" "}
            <b style={{ color: C.text }}>Profi</b> um — jederzeit, auch mitten im Einstellen.
            Die Ansicht ändert nur, WIE VIEL du siehst; deine Einstellungen bleiben
            beim Wechsel erhalten.
          </p>

          {/* ── Voreinstellungen ──────────────────────────────────
              🔴 Seit 20.08.2026 in BEIDEN Ansichten (ST2/ST3). Vorher standen
              sie nur in „einfach“ — und weil der Wettbewerbs-Block darunter
              für alle gilt, fing Profi mit den Teams an, Einfach dagegen mit
              den Voreinstellungen. Andi hat genau das gefunden: „irgendwie
              gibt man bei Profi direkt am Anfang die Teams ein."
              Die Regel dagegen, von ihm bestätigt: Profi zeigt DIESELBEN
              Abschnitte in DERSELBEN Folge, nur mit mehr Reglern je Abschnitt.
              Kein Abschnitt existiert nur in einer Ansicht. */}
          {/* ── Variantenwahl: Andis ERSTE Frage ──────────────────
              Steht vor den Voreinstellungen, weil sie als einzige alles
              Nachfolgende verändert. In BEIDEN Ansichten (ST2). */}
          <VariantenWahl rules={rules} onWaehlen={waehleVariante} />

          <RundenCharaktere
            gewaehlt={charakterKey}
            onWaehlen={(ch) => { setCharakterKey(ch.key); setPresetKey(null); setShortCode(null); setRules(ch.rules); }}
            onCodeLaden={(c) => { setImp(c); load(); }}
            codeFehler={impErr}
          />

          {/* ── Wettbewerbe auswählen ─────────────────────────────
              Andis Aufbau vom 07.08.2026 (iPhone 14): EINE Spalte, große
              Zeilen. Vorher lagen „Wettbewerbe" und „Teams" als zwei dauerhaft
              offene Abschnitte untereinander — dreizehn Chips à 29 px, dazu
              ein vierzeiliger Erklärabsatz. Von den 18 Tippzielen unter 40 px
              auf diesem Screen saßen dreizehn allein hier.
              Zwei Punkte, die den Umbau tragen: (1) große Zeilen SIND große
              Ziele, die Messung erledigt sich mit dem Layout; (2) jede Zeile
              trägt ihren Stand rechts, sonst müsste man sie öffnen, um zu
              sehen, ob etwas eingestellt ist.
              ⚠️ REIHENFOLGE innerhalb der Zeile: erst die Wettbewerbe, dann
              die Vereine. Vorher stand die Vereins-Auswahl davor und zeigte
              ALLE Klubs aus sieben Ligen in einer einzigen Wolke — über 90
              Knöpfe, Bayern neben Burnley neben Bologna. Das ist die grobe
              Entscheidung, also gehört sie nach vorn; die Vereinsliste hängt
              dann davon ab. */}
          <SectionTitle>Wettbewerbe auswählen</SectionTitle>
          <p style={{ fontSize: 13, color: C.muted, marginTop: -6, marginBottom: 10, lineHeight: 1.45 }}>
            Mannschaften und Begegnungen wählen, Regeln je Wettbewerb festlegen.
          </p>

          <GrosseZeile
            icon="⚽" titel="Wettbewerbe" unter="Ligen &amp; Teams" wert={wettbewerbeStand}
            offen={auswahlOffen === "wettbewerbe"}
            onClick={() => setAuswahlOffen((o) => (o === "wettbewerbe" ? null : "wettbewerbe"))}
          >
            <SpielauswahlWettbewerbe spiele={sp} onZahl={meldeSpielZahl}
              onChange={(neu) => { touched(); setRules((r) => ({ ...r, spiele: { ...(r.spiele || DEFAULT_RULES.spiele), ...neu } })); }} />

            {/* Teams — je Wettbewerb gruppiert, und nur aus den gewählten. */}
            <div style={{ marginTop: 14 }}>
              <Toggle label="Auf bestimmte Teams beschränken" on={teamFilterOn}
                onChange={(on) => patchSpiele(on ? { modus: "teams" } : { modus: "alle", teams: [] })} />
            </div>
          {/* 🔴 Die Liga-Zeilen stehen AUSSERHALB des Schalters, und das ist
              kein Schönheitsgriff: seit Schritt 3 hängen die Sonderregeln je
              Liga daran. Lägen sie hinter „Auf bestimmte Teams beschränken",
              käme an Abstiegskampf und Derbys nur heran, wer zusätzlich seine
              Vereine einschränkt — eine Einstellung, die für die meisten ins
              Leere läuft. Genau das verbietet der Baukasten-Grundsatz.
              Ein Klick auf einen Verein schaltet den Filter selbst ein
              (`toggleTeam` setzt `modus: "teams"`), es geht also nichts
              verloren. Was hinter dem Schalter bleibt, sind die Rückmeldungen
              zur VEREINSAUSWAHL — sie ergeben ohne sie keinen Sinn. */}
            <div style={{ marginTop: 8, marginBottom: 8 }}>
              {teamFilterOn && (
                <p style={{ fontSize: 12, color: C.muted, margin: "0 0 10px", lineHeight: 1.4 }}>
                  Mindestens 2 Vereine — ein Spiel zählt, sobald eine Seite dabei ist.
                </p>
              )}
              {/* ── Schritt 2: Liga anklicken → Mannschaften klappen auf ──
                  Vorher lagen alle Vereine ALLER gewählten Ligen offen
                  untereinander: bei sieben Wettbewerben über 90 Chips am
                  Stück, und wer die Serie A suchte, scrollte an drei Ligen
                  vorbei. Jetzt trägt jede Liga eine Zeile mit ihrem Stand
                  (`3/18`) und klappt einzeln auf.
                  ⚠️ Der „alle/keine"-Knopf steht NEBEN der Zeile, nicht
                  darin: ein Knopf im Knopf ist kein gültiges HTML, und
                  wichtiger — eine ganze Liga zu wählen darf nicht erst
                  hinter dem Aufklappen liegen. Genau dafür gibt es ihn
                  (sonst klickt man 18-mal). */}
              {teamGruppen.map((g) => {
                const drin = g.vereine.filter((v) => selectedTeams.includes(v)).length;
                const alleDrin = drin === g.vereine.length;
                const auf = offeneLiga === g.key;
                return (
                  <div key={g.key} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
                      <button onClick={() => setOffeneLiga((o) => (o === g.key ? null : g.key))} style={{
                        flex: 1, minWidth: 0, minHeight: 48, boxSizing: "border-box",
                        display: "flex", alignItems: "center", gap: 10, textAlign: "left",
                        cursor: "pointer", fontFamily: "inherit", color: C.text,
                        background: auf ? C.ink2 : C.surface,
                        border: `1px solid ${auf ? C.mint + "55" : C.line}`,
                        borderRadius: 12, padding: "10px 12px",
                      }}>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700 }}>{g.label}</span>
                        <span style={{ fontFamily: MONO, fontSize: 12, color: drin > 0 ? C.mint : C.muted }}>
                          {drin}/{g.vereine.length}
                        </span>
                        <span style={{
                          fontSize: 16, color: C.muted, lineHeight: 1,
                          transform: auf ? "rotate(90deg)" : "none", transition: "transform .15s",
                        }}>›</span>
                      </button>
                      {/* Alle einer Liga auf einmal — sonst klickt man 18-mal. */}
                      <button onClick={() => toggleLiga(g.vereine)} style={{
                        cursor: "pointer", fontFamily: "inherit", fontSize: 12, padding: "3px 14px",
                        minHeight: 48, boxSizing: "border-box", flexShrink: 0,
                        borderRadius: 12, background: "transparent", color: C.mint,
                        border: `1px solid ${C.line}`,
                      }}>{alleDrin ? "keine" : "alle"}</button>
                    </div>
                    {auf && (
                      <>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "8px 2px 2px" }}>
                          {g.vereine.map((team) => {
                            const on = selectedTeams.includes(team);
                            return (
                              <button key={team} onClick={() => toggleTeam(team)} style={{
                                cursor: "pointer", fontSize: 13, fontFamily: "inherit", padding: "6px 12px", borderRadius: 999,
                                minHeight: 44, boxSizing: "border-box",
                                background: on ? `${C.mint}22` : C.surface, color: on ? C.mint : C.muted,
                                border: `1px solid ${on ? C.mint + "66" : C.line}`,
                              }}>{team}</button>
                            );
                          })}
                        </div>
                        {/* Schritt 3: Sonderregeln JE LIGA. Sie stehen UNTER den
                            Mannschaften, weil sie die feinere Entscheidung sind —
                            dieselbe Reihenfolge wie oben zwischen Wettbewerb und
                            Verein. Was hier eingestellt wird, landet als
                            Abweichung in `spiele.jeWettbewerb[key]`; gemischt
                            wird ausschließlich in `auswahlFuer`. */}
                        <button onClick={() => setSonderregelnLiga((o) => (o === g.key ? null : g.key))} style={{
                          marginTop: 8, width: "100%", minHeight: 44, boxSizing: "border-box",
                          cursor: "pointer", fontFamily: "inherit", fontSize: 13, textAlign: "left",
                          background: "transparent", color: sonderregelnLiga === g.key ? C.mint : C.muted,
                          border: `1px dashed ${sonderregelnLiga === g.key ? C.mint + "55" : C.line}`,
                          borderRadius: 10, padding: "8px 12px",
                        }}>
                          {sonderregelnLiga === g.key ? "▾" : "▸"} Sonderregeln für {g.label}
                          {sp.jeWettbewerb?.[g.key] && " · aktiv"}
                        </button>
                        {sonderregelnLiga === g.key && (
                          <LigaSonderregeln wettbewerb={g.key} label={g.label} spiele={sp} onChange={patchSpiele} />
                        )}
                      </>
                    )}
                  </div>
                );
              })}

              {teamFilterOn && (
              <div style={{ fontSize: 11, color: teamFilterInvalid ? C.coral : C.muted, marginTop: 8 }}>
                {selectedTeams.length} von mindestens 2 Teams ausgewählt
                {teamFilterInvalid && " — bitte noch mindestens ein weiteres Team wählen"}.
              </div>
              )}

              {/* ⚠️ Gewählte Vereine, die in KEINEM gewählten Wettbewerb mehr
                  vorkommen. Ohne diesen Hinweis filtert die Runde still gegen
                  Vereine, die gar nicht mehr auftauchen. */}
              {verwaisteTeams.length > 0 && (
                <div style={{ fontSize: 11, color: C.akzent, marginTop: 4, lineHeight: 1.45 }}>
                  {verwaisteTeams.length} gewählte{verwaisteTeams.length === 1 ? "r Verein spielt" : " Vereine spielen"} in
                  keinem der gewählten Wettbewerbe ({verwaisteTeams.join(", ")}) — {verwaisteTeams.length === 1 ? "er zählt" : "sie zählen"} nicht mit.
                </div>
              )}

              {/* Was die Auswahl konkret bedeutet. Ohne diese Rückmeldung
                  stellt man „nur die Top 2" ein und merkt erst in Woche drei,
                  dass pro Spieltag ein einziges Spiel übrig bleibt. */}
              {teamFilterOn && !teamFilterInvalid && (() => {
                const gesamt = teamGruppen.reduce((s, g) => s + g.vereine.length, 0) || ALL_TEAMS.length;
                const { min, max } = spieleProSpieltag(selectedTeams.length, gesamt);
                const duenn = max < 3;
                return (
                  <div style={{ fontSize: 11, color: duenn ? C.akzent : C.mint, marginTop: 4, lineHeight: 1.45 }}>
                    Bleiben {min === max ? min : `${min} bis ${max}`} Spiele pro Spieltag
                    {duenn && " — das ist wenig; ein einzelner Tipp entscheidet dann fast den ganzen Spieltag"}.
                  </div>
                );
              })()}
            </div>
          </GrosseZeile>

          {/* Die feste Liste — der Ausweg aus der UND-Verknüpfung aller
              anderen Dimensionen. Steht bewusst hinter ihnen: erst probiert
              man die Regel, dann zählt man einzeln auf. */}
          <GrosseZeile
            icon="📋" titel="Begegnungen" unter="Feste Liste statt Regel"
            wert={listeOn ? `${(sp.matchIds ?? []).length} Spiele` : "aus"}
            offen={auswahlOffen === "begegnungen"}
            onClick={() => setAuswahlOffen((o) => (o === "begegnungen" ? null : "begegnungen"))}
          >
            <SpielauswahlListe spiele={sp} onChange={patchSpiele} />
          </GrosseZeile>

          {/* Aufwand: wie viele Entscheidungen verlangt ein Spieltag? Eine
              Auskunft, kein Regler — deshalb in ALLEN drei Stufen sichtbar,
              nicht erst ab „anpassen" (design/gehaeuse-ui.md 1). */}
          <AufwandPanel rules={rules} kontext={aufwandKontext} />

          {/* Presets: Startpunkt, danach bleibt alles frei einstellbar.
              Seit 08.08.2026 hinter EINER Zeile („Empfehlungen verwalten"),
              wie Andi es am 07.08. für die Bibliothek festgelegt hat. Der
              Baukasten-Grundsatz bleibt gewahrt: die kuratierten
              Voreinstellungen sind jederzeit abrufbar — nur nicht mehr als
              fünf offene Karten zwischen Auswahl und Reglern. Welche gerade
              gilt, steht rechts in der Zeile. */}
          {stufe === "profi" && (<>
          <GrosseZeile
            icon="📚" titel="Empfehlungen verwalten"
            wert={PRESETS.find((p) => p.key === presetKey)?.label ?? "eigenes"}
            offen={auswahlOffen === "empfehlungen"}
            onClick={() => setAuswahlOffen((o) => (o === "empfehlungen" ? null : "empfehlungen"))}
          >
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 4 }}>
            {PRESETS.map((p) => {
              const active = presetKey === p.key;
              return (
                <button key={p.key} onClick={() => applyPreset(p)} style={{
                  textAlign: "left", cursor: "pointer", fontFamily: "inherit",
                  background: active ? `${C.akzent}14` : C.surface,
                  border: `1px solid ${active ? C.akzent + "66" : C.line}`,
                  borderRadius: 14, padding: "12px 14px", color: C.text,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>
                      {p.label}
                      {/* Ohne Premium greift der Joker-Anteil nicht — das gehört
                          sichtbar an den Preset, nicht erst in eine Fehlermeldung. */}
                      {p.premium && !premium && (
                        <span style={{ fontSize: 12, color: C.akzent, marginLeft: 6 }} title="Premium-Funktion">🔒</span>
                      )}
                    </span>
                    {active && (
                      <span style={{
                        fontFamily: MONO, fontSize: 11, color: C.akzent, border: `1px solid ${C.akzent}55`,
                        borderRadius: 999, padding: "2px 8px", textTransform: "uppercase", letterSpacing: 1,
                      }}>gewählt</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 1.4 }}>{p.desc}</div>
                </button>
              );
            })}
          </div>
          <p style={{ fontSize: 11, color: C.muted, marginTop: 6, lineHeight: 1.4 }}>
            Nur ein Startpunkt — alle Regler unten bleiben danach frei einstellbar.
          </p>

          {/* Zwei Presets kombinieren (aufklappbar, damit der Einstieg schlank bleibt) */}
          <div style={{ marginTop: 10 }}>
            <button onClick={() => setMischenOffen((o) => !o)} style={{
              width: "100%", cursor: "pointer", fontFamily: "inherit", textAlign: "left",
              background: "transparent", color: C.muted, border: `1px dashed ${C.line}`,
              borderRadius: 12, padding: "10px 12px", fontSize: 13,
            }}>
              {mischenOffen ? "▾" : "▸"} Zwei Presets mischen — „Schärfe von A, Kombi von B"
            </button>
            {mischenOffen && (
              <div style={{ marginTop: 10 }}>
                <PresetMischen onUebernehmen={(mix) => {
                  setPresetKey(null); setShortCode(null);
                  setRules(mix);
                  setMischenOffen(false);
                }} />
              </div>
            )}
          </div>
          </GrosseZeile>

          {/* Name */}
          <Field label="Modus-Name">
            <input value={rules.name} maxLength={40} onChange={(e) => patch({ name: e.target.value })}
              placeholder="z. B. Hardcore-Runde" style={{
                width: "100%", boxSizing: "border-box", background: C.surface, color: C.text,
                border: `1px solid ${C.line}`, borderRadius: 12, padding: "10px 12px",
                fontSize: 15, fontFamily: "inherit", outline: "none",
              }} />
          </Field>

          {/* Live-Vorschau über typische Spielarten */}
          <RegelVorschau rules={rules} />

          {/* Reale Verteilung + Underdog-Neigung des Regelwerks. Steht jetzt
              VOR der Ampel, damit Ampel und Warnungen direkt aneinander
              grenzen und gemeinsam kleben können. */}
          <PresetRating rules={rules} />

          {/* ── Klebt beim Scrollen ────────────────────────────
              Ampel und Warnungen sind die RÜCKMELDUNG auf die Regler darunter.
              Scrollten sie weg, schöbe man einen Regler und sähe die Wirkung
              nicht — man müsste nach jedem Schritt hoch und wieder runter.
              Gedeckelt auf 42 % der Höhe (mit eigenem Scroll), sonst frisst
              der Kasten auf dem Handy die ganze Fläche. */}
          <div style={{
            position: "sticky", top: 52, zIndex: 5,
            maxHeight: "42vh", overflowY: "auto",
            // Muss DECKEND sein, sonst scrollt der Inhalt sichtbar dahinter
            // durch. `C.ink` ist der Grundton des Rahmens an dieser Stelle.
            background: C.ink, paddingBottom: 8, marginBottom: 2,
          }}>
            {/* Balance-Ampel: eine Aussage, ob die Runde noch ein Tippspiel bleibt */}
            <BalanceAmpel rules={rules} />

            {/* Leitplanken: nur in der Profi-Stufe, weil nur dort einzelne Regler
                bis an ihre harte Grenze laufen können. */}
            {stufe === "profi" && (
              <ProfiWarnungen rules={rules} onChange={(neu) => { touched(); setRules(neu); }} />
            )}
          </div>

          {/* Schärfe */}
          {/* Stufe 2: vier grosse Fragen statt der Rohregler darunter */}
          {stufe === "einfach" && (
            <>
              <SectionTitle>Die vier wichtigsten Fragen</SectionTitle>
              <EinfacheRegler rules={rules} onChange={(neu) => { touched(); setRules(neu); }} />
            </>
          )}

          {/* Joker-Ökonomie: Bibliothek + Narren + Shop bei „anpassen", dazu
              das Achsenprofil des gesamten Regelwerks bei „profi" — dieselbe
              Komponente, sie entscheidet selbst anhand von `stufe`, wie viel
              sie zeigt. Bei „einfach" unsichtbar: dort entscheiden Charakter
              und Preset. */}
          {stufe === "profi" && (
            <>
              <SectionTitle>Joker-Ökonomie</SectionTitle>
              <JokerOekonomie rules={rules} stufe={stufe} onChange={patchOekonomie} />
            </>
          )}

          {/* Mitbestimmung: Regel-Abstimmung + Verfassung
              (design/abstimmung-verfassung.md). Nur in der Profi-Stufe — bei
              „anpassen" beantwortet die Klartext-Frage „Wer darf die Regeln
              ändern?" dasselbe in drei Bündeln, und bei „einfach" entscheidet
              der Charakter. Wer Quorum, Fristen und eine Verfassung je Bereich
              einzeln stellen will, ist genau hier richtig. */}
          {stufe === "profi" && (
            <>
              <SectionTitle>Mitbestimmung</SectionTitle>
              <Mitbestimmung rules={rules}
                onChange={(p) => { touched(); setRules((r) => ({ ...r, ...p })); }} />
            </>
          )}

          {/* Alleingang-Bonus (Andis Stadt-Land-Fluss-Mechanik, 09.08.2026).
              In Stufe 2 beantwortet die Klartext-Frage „Lohnt sich ein
              Alleingang?" dasselbe in vier Bündeln; hier stehen alle
              Variablen einzeln, mit Regler UND Zahlenfeld. */}
          {stufe === "profi" && (
            <>
              <SectionTitle>Alleingang-Bonus</SectionTitle>
              <Alleinstellung rules={rules}
                onChange={(p) => { touched(); setRules((r) => ({ ...r, ...p })); }} />
            </>
          )}

          {/* Limitierungsklassen: eigenes Gefüge aus Unterkontingenten, die
              sich überlagern können — nur in der Profi-Stufe, dieselbe
              Begründung wie beim Achsenprofil in JokerOekonomie (2.4): erst
              hier sind einzelne Klassen mit eigenem Kontingent, Zeitraum und
              Aktivierung überhaupt eine Einstiegsfrage. */}
          {stufe === "profi" && (
            <>
              <SectionTitle>Limitierungsklassen</SectionTitle>
              <LimitKlassen rules={rules}
                onChange={(limitKlassen) => { touched(); setRules((r) => ({ ...r, limitKlassen })); }} />
            </>
          )}

          {/* Joker-Grundform: die EINE Karte, die jeder Joker teilt (wer,
              sicht, verfall, widerruf, stapeln, symmetrie, bestand,
              kasseSichtbar, abklingzeit, umfang, bedingung) — nur in der
              Profi-Stufe, aus demselben Grund wie Limitierungsklassen und
              das Achsenprofil: erst hier ist eine Abweichung je Joker-Art
              überhaupt eine Einstiegsfrage. */}
          {stufe === "profi" && (
            <>
              <SectionTitle>Joker-Grundform</SectionTitle>
              <JokerGrundform rules={rules}
                onChange={(jokerBasis) => { touched(); setRules((r) => ({ ...r, jokerBasis })); }} />
            </>
          )}

          {stufe === "profi" && (<>
          <SectionTitle>Regler-Feinheit</SectionTitle>
          <p style={{ fontSize: 12, color: C.muted, marginTop: -6, marginBottom: 10, lineHeight: 1.4 }}>
            Wie fein sich die Multiplikator-Regler weiter unten stellen lassen —
            eine Feineinstellung für Profis, keine Einstiegsfrage.
          </p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
            {REGLER_FEINHEITEN.map((f) => {
              const an = (rules.reglerFeinheit ?? DEFAULT_RULES.reglerFeinheit) === f.wert;
              return (
                <button key={f.key} onClick={() => patch({ reglerFeinheit: f.wert })} style={{
                  cursor: "pointer", fontSize: 12, fontFamily: "inherit", padding: "8px 12px",
                  borderRadius: 10, flex: "1 1 120px", textAlign: "left",
                  background: an ? `${C.akzent}22` : C.surface, color: an ? C.akzent : C.muted,
                  border: `1px solid ${an ? C.akzent + "66" : C.line}`,
                }}>
                  <div style={{ fontWeight: 700 }}>{f.label}</div>
                  <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{f.desc}</div>
                </button>
              );
            })}
          </div>

          <SectionTitle>Schärfe der Nähe-Belohnung</SectionTitle>
          <Slider label="Ergebnis-Nähe (k)" value={rules.k} {...L.k} step={reglerSchritt(rules, L.k)} pfad="k" onChange={(v) => patch({ k: v })}
            hint="Höher = die Belohnung fällt mit jedem Tor Abstand steiler ab (Underdog-Regler)." />
          <Slider label="Team-Tore-Nähe (m)" value={rules.m} {...L.m} step={reglerSchritt(rules, L.m)} pfad="m" onChange={(v) => patch({ m: v })}
            hint="Steilheit der siegerunabhängigen Team-Tore-Nähe." />

          {/* Underdog-Boost & Favoriten-Malus (teilen sich die Quoten-Ramp) */}
          <SectionTitle>Underdog-Boost & Favoriten-Malus</SectionTitle>
          <p style={{ fontSize: 12, color: C.muted, marginTop: -6, marginBottom: 10, lineHeight: 1.4 }}>
            Belohne das Vorhersagen von Überraschungen — und/oder bestrafe, wer stur auf den
            Favoriten setzt, wenn der patzt. Beide wirken nur bei echten Außenseiter-Siegen
            und werden über dieselbe Sieger-Quote skaliert.
          </p>
          <Slider label="Underdog-Boost (×)" value={rules.underdogBoost} {...L.underdogBoost} pfad="underdogBoost"
            onChange={(v) => patch({ underdogBoost: v })} fmt={fmtFaktor}
            hint="1,0 = aus. Höher = korrekt getippte Außenseiter-Siege zahlen zusätzlich mehr." />
          <Slider label="Favoriten-Reinfall-Malus" value={rules.favFlopPenalty} {...L.favFlopPenalty} pfad="favFlopPenalty"
            onChange={(v) => patch({ favFlopPenalty: v })} fmt={(x) => x === 0 ? "aus" : "−" + x}
            hint="Abzug, wenn du den Favoriten getippt hast und der real verliert. Gedeckelt bei 0 (kein tiefes Minus)." />
          {(rules.underdogBoost > 1 || rules.favFlopPenalty > 0) && (
            <>
              <Slider label="Wirkt ab Sieger-Quote" value={rules.underdogRampStart} {...L.underdogRampStart}
                onChange={(v) => patch({ underdogRampStart: v })} fmt={(x) => x.toFixed(1)}
                hint="Unterhalb dieser Quote gilt der Sieger nicht als Außenseiter — kein Boost, kein Malus." />
              <Slider label="Volle Wirkung ab Sieger-Quote" value={rules.underdogRampEnd} {...L.underdogRampEnd}
                onChange={(v) => patch({ underdogRampEnd: v })} fmt={(x) => x.toFixed(1)}
                hint="Dazwischen fließender Übergang statt hartem Cutoff." />
            </>
          )}

          {/* Kombi-Multiplikatoren */}
          <SectionTitle>Kombi-Multiplikatoren (Tore × Ebene)</SectionTitle>
          <Slider label="bei richtiger Tendenz" value={rules.combo.tendenz} {...L.combo.tendenz} step={reglerSchritt(rules, L.combo.tendenz)}
            onChange={(v) => patchCombo({ tendenz: v })} fmt={(x) => "×" + x.toFixed(2)} />
          <Slider label="bei richtigem Abstand" value={rules.combo.abstand} {...L.combo.abstand} step={reglerSchritt(rules, L.combo.abstand)} pfad="combo.abstand"
            onChange={(v) => patchCombo({ abstand: v })} fmt={(x) => "×" + x.toFixed(2)} />
          <Slider label="bei exaktem Ergebnis" value={rules.combo.exakt} {...L.combo.exakt} step={reglerSchritt(rules, L.combo.exakt)} pfad="combo.exakt"
            onChange={(v) => patchCombo({ exakt: v })} fmt={fmtFaktor} />

          {/* Skala & Cutoffs */}
          </>)}

          <SectionTitle>Anzeige & Cutoffs</SectionTitle>
          <Slider label="Punkte-Skalierung" value={rules.displayScale} {...L.displayScale}
            onChange={(v) => patch({ displayScale: v })} fmt={(x) => "×" + x}
            hint="Nur Optik: macht schöne hohe Zahlen. Fairness & Ranking bleiben unberührt." />
          {rules.displayScale !== empfohleneSkala && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
              background: `${C.akzent}12`, border: `1px solid ${C.akzent}33`, borderRadius: 12,
              padding: "9px 12px", marginBottom: 10,
            }}>
              <span style={{ fontSize: 12, color: C.muted, lineHeight: 1.4 }}>
                Empfohlen: <strong style={{ color: C.akzent }}>×{empfohleneSkala}</strong> — hält
                exakte Tipps bei angenehmen Werten{j.enabled ? " (Gewichtung eingerechnet)" : ""}.
              </span>
              <button onClick={() => patch({ displayScale: empfohleneSkala })} style={{
                cursor: "pointer", fontSize: 12, fontFamily: "inherit", fontWeight: 700,
                background: C.surface2, color: C.akzent, border: `1px solid ${C.akzent}44`,
                ...TAPZIEL, borderRadius: 10, padding: "7px 12px", whiteSpace: "nowrap",
              }}>übernehmen</button>
            </div>
          )}
          <Slider label="Mindest-Auszahlung (Cutoff)" value={rules.minPayout} {...L.minPayout} pfad="minPayout"
            onChange={(v) => patch({ minPayout: v })} fmt={(x) => x.toFixed(1)}
            hint="Nähe-Boni unter diesem Wert zählen nicht." />

          {/* Deckel */}
          <Toggle label="Harter Punkte-Deckel pro Spiel"
            on={rules.perGameCap != null}
            onChange={(on) => patch({ perGameCap: on ? 1000 : null })} />
          {rules.perGameCap != null && (
            <Slider label="Deckel" value={rules.perGameCap} {...L.perGameCap}
              onChange={(v) => patch({ perGameCap: v })} fmt={(x) => String(x)} />
          )}

          {/* Strafe */}
          {stufe === "profi" && (<>
          <SectionTitle>Sieger-Boden & Strafe</SectionTitle>
          <Toggle label="Sieger-Boden (richtiger Sieger zahlt mind. Quote−1)"
            on={rules.winnerFloor} onChange={(on) => patch({ winnerFloor: on })} />
          <Slider label="Strafe bei komplett falsch" value={rules.wrongPenalty} {...L.wrongPenalty} pfad="wrongPenalty"
            onChange={(v) => patch({ wrongPenalty: v })} fmt={(x) => x === 0 ? "aus" : x.toFixed(1)}
            hint="0 = keine Strafe. Negativ = Minuspunkte, wenn weder Sieger noch Nähe stimmen." />

          {/* Märkte */}
          <SectionTitle>Märkte</SectionTitle>
          <Toggle label="Ergebnis-Tipp" on={rules.markets.result}
            onChange={(on) => patchMarkets({ result: on })} />
          <Toggle label="Torschützen-Tipp" on={g.enabled}
            onChange={(on) => patchGoals({ enabled: on })} />
          {g.enabled && (
            <div style={{ paddingLeft: 12, borderLeft: `1px solid ${C.line}`, marginBottom: 8 }}>
              {/* Wie die Namen gewählt werden. Mehr als Geschmack: bei echten
                  Marktquoten kommen die Torschützen OHNE Vereinszuordnung
                  herein — im Spiel-Modus lässt sich trotzdem tippen. */}
              <div style={{ fontSize: 12, color: C.muted, marginTop: 6, marginBottom: 5 }}>
                Wie viele Schützen?
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                {[
                  { key: "proTeam", label: "Je Mannschaft", hint: "Getrennte Wahl für Heim und Auswärts." },
                  { key: "proSpiel", label: "Je Spiel", hint: "Ein Topf für beide Mannschaften — freier, und unabhängig von der Vereinszuordnung." },
                ].map((m) => {
                  const an = (g.modus ?? "proTeam") === m.key;
                  return (
                    <button key={m.key} title={m.hint} onClick={() => patchGoals({ modus: m.key })} style={{
                      ...TAPZIEL, flex: 1, cursor: "pointer", fontFamily: "inherit", padding: "8px 6px",
                      borderRadius: 11, fontSize: 12, fontWeight: 700,
                      background: an ? `${C.sky}22` : C.surface, color: an ? C.sky : C.muted,
                      border: `1px solid ${an ? C.sky + "66" : C.line}`,
                    }}>{m.label}</button>
                  );
                })}
              </div>
              {(g.modus ?? "proTeam") === "proSpiel" ? (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
                  <span style={{ fontSize: 13, color: C.muted }}>Schützen pro Spiel</span>
                  <Stepper value={g.picksProSpiel} min={L.picksProSpiel.min} max={L.picksProSpiel.max}
                    onStep={(d) => patchGoals({ picksProSpiel: Math.min(L.picksProSpiel.max, Math.max(L.picksProSpiel.min, g.picksProSpiel + d)) })} />
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
                  <span style={{ fontSize: 13, color: C.muted }}>Picks pro Team</span>
                  <Stepper value={g.picksPerTeam} min={L.picksPerTeam.min} max={L.picksPerTeam.max}
                    onStep={(d) => patchGoals({ picksPerTeam: Math.min(L.picksPerTeam.max, Math.max(L.picksPerTeam.min, g.picksPerTeam + d)) })} />
                </div>
              )}
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, lineHeight: 1.45 }}>
                {(g.modus ?? "proTeam") === "proSpiel"
                  ? `${g.picksProSpiel} Namen aus beiden Mannschaften zusammen — wer sie verteilt, ist euch überlassen.`
                  : `${g.picksPerTeam} Namen je Mannschaft, also ${g.picksPerTeam * 2} im Spiel.`}
              </div>
              <Toggle label="Doppelpack erlaubt" on={g.allowDouble}
                onChange={(on) => patchGoals({ allowDouble: on })} />
              <Toggle label="Backup-Schützen erlaubt" on={g.allowBackups}
                onChange={(on) => patchGoals({ allowBackups: on })} />
            </div>
          )}

          {/* Tipp-Einfluss auf die Quote (Totalisator-Anteil) */}
          <SectionTitle>Bewegt eure Runde die Quoten?</SectionTitle>
          <p style={{ fontSize: 12, color: C.muted, marginTop: -6, marginBottom: 10, lineHeight: 1.4 }}>
            Normalerweise gelten allein die Marktquoten. Ihr könnt aber einstellen, dass
            eure eigenen Tipps mitzählen — wie bei einem Totalisator. <strong>Wer tippt,
            was alle tippen, bekommt dann weniger</strong>; wer sich traut, mehr.
          </p>

          <Field label="Wie stark zählt die Runde mit?">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {[
                { v: 0, label: "aus" },
                { v: 0.25, label: "Hauch" },
                { v: 0.5, label: "spürbar" },
                { v: 1, label: "voll" },
              ].map((s) => {
                const on = te.staerke === s.v;
                return (
                  <button key={s.v} onClick={() => patchTippEinfluss({ staerke: s.v })} style={{
                    ...TAPZIEL, cursor: "pointer", fontSize: 12, fontFamily: "inherit", padding: "7px 11px", borderRadius: 999,
                    background: on ? `${C.akzent}22` : C.surface, color: on ? C.akzent : C.muted,
                    border: `1px solid ${on ? C.akzent + "66" : C.line}`,
                  }}>{s.label}</button>
                );
              })}
            </div>
          </Field>

          {te.staerke > 0 && (
            <div style={{ paddingLeft: 12, borderLeft: `1px solid ${C.line}`, marginBottom: 8 }}>
              {/* Der eigentliche Regler. „Gegen wie viele virtuelle Mitspieler
                  tretet ihr an" ist die Frage, die ein Admin beantworten kann —
                  ein abstrakter Mischungsfaktor wäre es nicht. */}
              <Slider label="Gegen wie großen Markt?" value={te.marktTiefe}
                min={TIPPEINFLUSS_LIMITS.marktTiefe.min} max={TIPPEINFLUSS_LIMITS.marktTiefe.max}
                step={TIPPEINFLUSS_LIMITS.marktTiefe.step}
                fmt={(v) => `${v} Mitspieler`}
                onChange={(v) => patchTippEinfluss({ marktTiefe: v })} />
              <p style={{ fontSize: 11, color: C.muted, marginTop: -8, marginBottom: 12, lineHeight: 1.4 }}>
                Kleiner Markt = eure Tipps schlagen stärker durch. Großer Markt = ihr seid
                ein Tropfen darin, so wie ein einzelner Wetter bei einem Buchmacher.
              </p>

              <Slider label="Erst ab wie vielen Tippern?" value={te.minTipper}
                min={TIPPEINFLUSS_LIMITS.minTipper.min} max={TIPPEINFLUSS_LIMITS.minTipper.max}
                step={TIPPEINFLUSS_LIMITS.minTipper.step}
                fmt={(v) => `${v} Tipper`}
                onChange={(v) => patchTippEinfluss({ minTipper: v })} />
              <p style={{ fontSize: 11, color: C.muted, marginTop: -8, marginBottom: 10, lineHeight: 1.4 }}>
                Darunter bleibt alles beim Markt — zu wenige Tipps wären Zufall, keine
                Meinung.
              </p>

              {/* Die Live-Vorschau ist hier die eigentliche Betreuung: „50 %
                  Mischung" sagt niemandem etwas, „ein Tipp verschiebt 0,45 %"
                  schon. Dieselbe Rolle wie anteile() bei den Wettbewerben. */}
              <p style={{
                fontSize: 12, color: C.text, lineHeight: 1.45,
                padding: "8px 10px", borderRadius: 8, background: C.surface, border: `1px solid ${C.line}`,
              }}>
                {beschreibeTippEinfluss(te, Math.max(te.minTipper, 12))}
              </p>

              <p style={{ fontSize: 11, color: C.muted, marginTop: 8, lineHeight: 1.45 }}>
                Fair bleibt es durch zwei Regeln: <strong>dein eigener Tipp drückt deine
                eigene Quote nicht</strong>, und gerechnet wird erst nach Anpfiff, wenn
                alle Tipps da sind — früh oder spät tippen ändert also nichts. Die
                Sieger-Quoten (1X2) bleiben unangetastet, verschoben werden nur die
                Ergebnis-Quoten.
              </p>
            </div>
          )}

          {/* Joker / Gewichtung */}
          <SectionTitle>Joker &amp; Gewichtung</SectionTitle>
          <p style={{ fontSize: 12, color: C.muted, marginTop: -6, marginBottom: 10, lineHeight: 1.4 }}>
            Lässt Tipper einzelne Spiele höher gewichten. Der Faktor greift auf die
            fertige Wertung — Ergebnis <em>und</em> Torschützen zusammen — und wirkt in
            beide Richtungen: ein gewichtetes Spiel, das danebengeht, tut auch mehr weh.
          </p>

          {/* ⚠️ Die Zeile, die bisher gefehlt hat. Man stellt Verteilung,
              Stärke und Ereignisse an drei Stellen ein und sah nirgends, was
              dabei herauskommt. Sie steht GANZ OBEN, weil sie die Antwort auf
              die eigentliche Frage ist — „wie viele Joker hat man am Ende?" */}
          {jokerZusammenfassung && (
            <div style={{
              background: `${C.mint}12`, border: `1px solid ${C.mint}33`,
              borderRadius: 12, padding: "10px 13px", marginBottom: 10,
              fontSize: 12, color: C.mint, lineHeight: 1.5,
            }}>
              {jokerZusammenfassung}
            </div>
          )}
          {!premium ? (
            <div style={{
              background: `${C.akzent}12`, border: `1px solid ${C.akzent}44`,
              borderRadius: 14, padding: "13px 15px", marginBottom: 8,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.akzent }}>
                🔒 Premium-Funktion
              </div>
              <p style={{ fontSize: 12, color: C.muted, margin: "7px 0 0", lineHeight: 1.5 }}>
                Es genügt, wenn <strong>du als Admin</strong> Premium hast — die ganze
                Runde kann dann gewichten. Alle anderen Regler bleiben frei nutzbar.
              </p>
            </div>
          ) : (
            <Toggle label="Gewichtung erlauben" on={j.enabled}
              onChange={(on) => patchJoker({ enabled: on })} />
          )}

          {premium && j.enabled && (
            <div style={{ paddingLeft: 12, borderLeft: `1px solid ${C.line}`, marginBottom: 8 }}>
              <Field label="Modus">
                <div style={{ display: "flex", gap: 6 }}>
                  {[
                    { key: "einzel", label: "Ein Joker", hint: "Ein Spiel pro Spieltag" },
                    { key: "ranking", label: "Rangliste", hint: "Alle Spiele ranken" },
                    { key: "einsatz", label: "Einsatz", hint: "Münzen auf Spiele verteilen" },
                  ].map((m) => {
                    const on = j.modus === m.key;
                    return (
                      <button key={m.key} onClick={() => patchJoker({ modus: m.key })} style={{
                        cursor: "pointer", fontSize: 12, fontFamily: "inherit", padding: "8px 12px",
                        borderRadius: 10, flex: 1, textAlign: "left",
                        background: on ? `${C.akzent}22` : C.surface, color: on ? C.akzent : C.muted,
                        border: `1px solid ${on ? C.akzent + "66" : C.line}`,
                      }}>
                        <div style={{ fontWeight: 700 }}>{m.label}</div>
                        <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{m.hint}</div>
                      </button>
                    );
                  })}
                </div>
              </Field>

              {/* Im Ranking-Modus ist der Pool die Wahrheit — sonst zeigte der
                  Regler einen anderen Wert als die Stufen darunter.
                  ⚠️ Im Einsatz-Modus gibt es ihn NICHT: dort bestimmt der
                  gesetzte Münzbetrag den Faktor, `joker.faktor` wird gar nicht
                  gelesen. Ein sichtbarer Regler ohne Wirkung ist genau das,
                  was der Baukasten-Grundsatz ausschließt — beim Bauen der
                  Einsatz-Bedienung stehen geblieben und hier entfernt. */}
              {j.modus !== "einsatz" && (
                <Slider label={j.modus === "ranking" ? "Höchstes Gewicht" : "Joker-Faktor"}
                  value={j.modus === "ranking" ? j.faktoren[0] : j.faktor} {...L.joker.faktor} step={reglerSchritt(rules, L.joker.faktor)}
                  onChange={(v) => patchJoker(j.modus === "ranking"
                    ? { faktor: v, faktoren: buildWeightPool(v, j.faktoren.length) }
                    : { faktor: v })}
                  fmt={fmtFaktor}
                  hint={j.modus === "ranking"
                    ? "Das stärkste Gewicht der Rangliste. Die übrigen Stufen liegen gleichmäßig darunter."
                    : "Womit das markierte Spiel multipliziert wird."} />
              )}

              {j.modus === "ranking" && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
                    <span style={{ fontSize: 13, color: C.muted }}>Stufen</span>
                    <Stepper value={j.faktoren.length} min={L.joker.anzahlFaktoren.min} max={L.joker.anzahlFaktoren.max}
                      onStep={(d) => {
                        const n = Math.min(L.joker.anzahlFaktoren.max, Math.max(L.joker.anzahlFaktoren.min, j.faktoren.length + d));
                        patchJoker({ faktoren: buildWeightPool(j.faktor, n) });
                      }} />
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {j.faktoren.map((f) => (
                      <span key={f} style={{
                        ...TAPZIEL, fontSize: 12, fontFamily: MONO, padding: "5px 10px", borderRadius: 999,
                        background: f > 1 ? `${C.akzent}18` : C.surface,
                        color: f > 1 ? C.akzent : C.muted,
                        border: `1px solid ${f > 1 ? C.akzent + "44" : C.line}`,
                      }}>{fmtFaktor(f)}</span>
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: C.muted, marginBottom: 8, lineHeight: 1.4 }}>
                    Jedes Gewicht darf pro Spieltag nur <strong>einmal</strong> vergeben werden —
                    alle haben denselben Pool, die Verteilung ist die Kunst. Übrige Spiele zählen ×1,0.
                  </p>
                </>
              )}

              {/* Einsatz-Modus (L2): kein fester Pool, sondern ein Münz-Budget
                  je Spieltag, das der Spieler frei auf die Spiele verteilt.
                  Die beiden Anteils-Regler speichern weiterhin einen ANTEIL
                  (design/einsatz-joker.md Abschnitt 2: reist mit dem
                  Creator-Code, unabhängig vom Budget einer fremden Runde) —
                  angezeigt werden aber Münzen, weil der Admin in Münzen denkt. */}
              {j.modus === "einsatz" && (
                <>
                  {/* ⚠️ Beschriftung takt-abhängig (`muenzZeitraum`): das Feld
                      heißt weiter `einsatzProSpieltag` (Bezeichner bleiben),
                      aber sobald eine Münz-Periode mehrere Spieltage
                      zusammenfasst, ist "je Spieltag" nicht mehr wahr — der
                      Betrag muss dann für die ganze Periode reichen. */}
                  <Slider label={`Münzen je ${muenzZeitraum}`} value={j.einsatzProSpieltag}
                    {...L.joker.einsatzProSpieltag}
                    onChange={(v) => patchJoker({ einsatzProSpieltag: v })}
                    fmt={(x) => `${zahl(x)} Münzen`}
                    hint={muenzZeitraum === "Spieltag"
                      ? "Was jeder Spieler an diesem Spieltag zu verteilen hat."
                      : "Was jeder Spieler in dieser Periode insgesamt zu verteilen hat — wie oft eine Periode beginnt, legt der Takt unten fest."} />
                  <Zahl label={`Münzen je ${muenzZeitraum}`} wert={j.einsatzProSpieltag} limits={L.joker.einsatzProSpieltag}
                    onChange={(v) => patchJoker({ einsatzProSpieltag: v })} />

                  {/* WIE OFT es Münzen gibt — Münz-Takt (`muenzTakt.js`). Der
                      Katalog `TAKTE` kommt aus jokerBudget.js (dieselbe Quelle
                      wie beim Narren-Budget in JokerOekonomie.jsx), hier nur
                      zweitgenutzt — unmittelbar neben "wie viel", weil der
                      Takt die Frage "wie oft" zu genau diesem Betrag beantwortet. */}
                  <Field label="Wie oft gibt es Münzen?">
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {TAKTE.map((t) => {
                        const an = (j.einsatzTakt ?? "spieltag") === t.key;
                        return (
                          <button key={t.key} title={t.desc} onClick={() => patchJoker({ einsatzTakt: t.key })} style={{
                            flex: "1 1 100px", cursor: "pointer", fontFamily: "inherit", padding: "8px 8px",
                            borderRadius: 11, textAlign: "left",
                            background: an ? `${C.akzent}22` : C.surface, color: an ? C.akzent : C.muted,
                            border: `1px solid ${an ? C.akzent + "66" : C.line}`,
                          }}>
                            <div style={{ fontSize: 12, fontWeight: 700 }}>{t.label}</div>
                          </button>
                        );
                      })}
                    </div>
                  </Field>

                  {j.einsatzTakt === "alleNSpieltage" && (
                    <Zahl label="Alle wie viele Spieltage?" wert={j.einsatzTaktN} limits={L.joker.einsatzTaktN}
                      breite={150} marginTop={8} onChange={(v) => patchJoker({ einsatzTaktN: v })} />
                  )}

                  {j.einsatzTakt === "phase" && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>Saison-Fenster</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {PHASEN.map((p) => {
                          const an = (j.einsatzFenster?.phase ?? "letztesDrittel") === p.key;
                          return (
                            <button key={p.key} onClick={() => setzeFenster({ phase: p.key })} style={{
                              textAlign: "left", cursor: "pointer", fontFamily: "inherit", color: C.text,
                              background: an ? `${C.akzent}18` : C.surface,
                              border: `1px solid ${an ? C.akzent + "66" : C.line}`,
                              ...TAPZIEL, borderRadius: 12, padding: "9px 12px",
                            }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: an ? C.akzent : C.text }}>{p.label}</div>
                              <div style={{ fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>{p.desc}</div>
                            </button>
                          );
                        })}
                      </div>
                      {j.einsatzFenster?.phase === "schlussspurt" && (
                        <div style={{ marginTop: 8, maxWidth: 200 }}>
                          <Zahl label="Länge (Spieltage)" wert={j.einsatzFenster?.schlussLaenge} limits={DUELL_LIMITS.schlussLaenge}
                            onChange={(v) => setzeFenster({ schlussLaenge: v })} />
                        </div>
                      )}
                      {j.einsatzFenster?.phase === "manuell" && (
                        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                          <Zahl label="Von Spieltag" wert={j.einsatzFenster?.abSpieltag ?? ""} limits={DUELL_LIMITS.abSpieltag} leerErlaubt leerText="Vorgabe"
                            onChange={(v) => setzeFenster({ abSpieltag: v })} />
                          <Zahl label="Bis Spieltag" wert={j.einsatzFenster?.bisSpieltag ?? ""} limits={DUELL_LIMITS.bisSpieltag} leerErlaubt leerText="Vorgabe"
                            onChange={(v) => setzeFenster({ bisSpieltag: v })} />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Live-Vorschau. ⚠️ Bewusst `einsatzSpieleTypisch` (Spiele je
                      SPIELTAG) übergeben, NICHT `einsatzSpieleJePeriode` —
                      `beschreibeMuenzTakt` rechnet die Periode selbst aus
                      Spieltag-Anzahl hoch. Die bereits hochgerechnete Zahl
                      hier einzusetzen würde sie ein zweites Mal mit der
                      Periodenlänge multiplizieren. */}
                  <p style={{ fontSize: 11, color: C.muted, marginTop: 8, lineHeight: 1.45 }}>
                    {beschreibeMuenzTakt(rules, { spieltage: spieltageGesamt, spieleJeSpieltag: einsatzSpieleTypisch })}
                  </p>

                  {/* ⚠️ Kein `reglerSchritt` hier: `maxAnteilProSpiel` ist laut
                      RULE_LIMITS-Kommentar ausdrücklich NICHT Teil der
                      Multiplikator-Familie (reglerRaster.test.js) — eine
                      Validierungsgrenze, kein additiver Modifikator. Die
                      Regler-Feinheit des Admins soll dieses Feld nicht anfassen. */}
                  <Slider label="Höchsteinsatz je Spiel" value={j.maxAnteilProSpiel}
                    {...L.joker.maxAnteilProSpiel}
                    onChange={(v) => patchJoker({ maxAnteilProSpiel: v })}
                    fmt={(x) => `${zahl(Math.round(x * j.einsatzProSpieltag))} von ${zahl(j.einsatzProSpieltag)} Münzen`}
                    hint="Mehr darf niemand auf ein einzelnes Spiel setzen." />
                  <Zahl label="Höchsteinsatz je Spiel (Münzen)"
                    wert={Math.round(j.maxAnteilProSpiel * j.einsatzProSpieltag)}
                    limits={{
                      min: Math.round(L.joker.maxAnteilProSpiel.min * j.einsatzProSpieltag),
                      max: Math.round(L.joker.maxAnteilProSpiel.max * j.einsatzProSpieltag),
                      step: Math.max(1, Math.round(L.joker.maxAnteilProSpiel.step * j.einsatzProSpieltag)),
                    }}
                    onChange={(v) => patchJoker({ maxAnteilProSpiel: v / j.einsatzProSpieltag })} />

                  {/* Gleiche Begründung wie beim Höchsteinsatz oben — kein `reglerSchritt`. */}
                  <Slider label="Mindesteinsatz je Spiel" value={j.minAnteilProSpiel}
                    {...L.joker.minAnteilProSpiel}
                    onChange={(v) => patchJoker({ minAnteilProSpiel: v })}
                    fmt={(x) => x === 0 ? "kein Mindesteinsatz" : `${zahl(Math.round(x * j.einsatzProSpieltag))} Münzen`}
                    hint="0 = kein Mindesteinsatz. Sonst gilt: auf ein Spiel entweder gar nichts setzen oder mindestens so viel." />
                  <Zahl label="Mindesteinsatz je Spiel (Münzen, 0 = keiner)"
                    wert={Math.round(j.minAnteilProSpiel * j.einsatzProSpieltag)}
                    limits={{
                      min: 0,
                      max: Math.round(L.joker.minAnteilProSpiel.max * j.einsatzProSpieltag),
                      step: Math.max(1, Math.round(L.joker.minAnteilProSpiel.step * j.einsatzProSpieltag)),
                    }}
                    onChange={(v) => patchJoker({ minAnteilProSpiel: v / j.einsatzProSpieltag })} />

                  <Toggle label="Spiele auslassen erlaubt" on={j.skippenErlaubt !== false}
                    onChange={(on) => patchJoker({ skippenErlaubt: on })} />
                  <p style={{ fontSize: 11, color: C.muted, marginTop: -4, marginBottom: 8, lineHeight: 1.4 }}>
                    Erlaubt: ein Spiel mit Einsatz 0 tippen, ohne den Mindesteinsatz zu verletzen —
                    die Poker-Blind-Lesart „entweder gar nicht, oder mindestens so viel".
                  </p>

                  {/* Konflikt-Hinweise (design/einsatz-joker.md 2.1). Fall 2
                      hängt an der Zahl der Spiele, die sich EINE Münz-Periode
                      teilt — bei mehrspieltägigem Takt mehr als die eines
                      einzelnen Spieltags (Schritt 2 oben). Die Größe ist hier
                      nicht sicher bekannt — deshalb ausdrücklich als typische
                      Größe markiert; verbindlich prüft erst die Tippabgabe. */}
                  {einsatzKonfliktListe.length > 0 && (
                    <div style={{
                      background: `${C.akzent}12`, border: `1px solid ${C.akzent}33`, borderRadius: 12,
                      padding: "10px 12px", marginBottom: 10,
                    }}>
                      {einsatzKonfliktListe.map((k) => (
                        <div key={k.key} style={{ fontSize: 12, color: C.muted, lineHeight: 1.45, marginBottom: 4 }}>
                          {k.text}
                        </div>
                      ))}
                      {einsatzSpieleTypisch != null && (
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>
                          {spieltageJePeriode > 1
                            ? <>Angenommen bei etwa {einsatzSpieleTypisch} Spielen je Spieltag, macht das rund{" "}
                                {einsatzSpieleJePeriode} Spiele über die {spieltageJePeriode} Spieltage einer
                                Münz-Periode hinweg — eure tatsächliche Zahl hängt von der Spielauswahl oben ab
                                und wird beim Tippen verbindlich geprüft.</>
                            : <>Angenommen bei etwa {einsatzSpieleTypisch} Spielen je Spieltag — eure tatsächliche
                                Zahl hängt von der Spielauswahl oben ab und wird beim Tippen verbindlich geprüft.</>}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Weitere Joker-TYPEN — keine neue Ebene, sondern Spielarten
                  desselben Jokers: ihre Aufschlaege werden ADDIERT und vom
                  gemeinsamen Deckel begrenzt. */}
              <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 6, paddingTop: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Weitere Joker-Arten</div>
                <p style={{ fontSize: 11, color: C.muted, marginTop: 0, marginBottom: 8, lineHeight: 1.4 }}>
                  Greifen von allein, ohne dass jemand etwas markieren muss. Ihre
                  Aufschläge werden <strong>addiert</strong> und vom Deckel oben begrenzt.
                </p>

                <Toggle label="Heimatbonus — Spiele des eigenen Vereins" on={jh.enabled === true}
                  onChange={(on) => patchJoker({ heimat: { ...jh, enabled: on } })} />
                {jh.enabled && (
                  <Field label={`Faktor: ${fmtFaktor(jh.faktor ?? 1.2)}`}>
                    <input type="range"
                      min={L.joker.faktor.min} max={L.joker.faktor.max} step={reglerSchritt(rules, L.joker.faktor)}
                      value={jh.faktor ?? 1.2}
                      onChange={(e) => patchJoker({ heimat: { ...jh, faktor: Number(e.target.value) } })}
                      style={{ width: "100%", accentColor: C.akzent }} />
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 1.4 }}>
                      Jeder wählt seinen Verein selbst. Wirkt symmetrisch — auch auf
                      Minuspunkte, denn Fans tippen ihr Team gern zu optimistisch.
                    </div>
                  </Field>
                )}

                <div style={{ marginTop: 8 }}>
                  <Toggle label="Mut-Bonus — gegen den Favoriten, und du behältst recht" on={jm.enabled === true}
                    onChange={(on) => patchJoker({ mut: { ...jm, enabled: on } })} />
                </div>
                {jm.enabled && (
                  <Field label={`Faktor: ×${(jm.faktor ?? 1.1).toFixed(2)}`}>
                    <input type="range"
                      min={L.joker.mutFaktor.min} max={L.joker.mutFaktor.max} step={reglerSchritt(rules, L.joker.mutFaktor)}
                      value={jm.faktor ?? 1.1}
                      onChange={(e) => patchJoker({ mut: { ...jm, faktor: Number(e.target.value) } })}
                      style={{ width: "100%", accentColor: C.akzent }} />
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 1.4 }}>
                      Zahlt nur, wenn der mutige Tipp <strong>aufgeht</strong> — sonst würde
                      blindes Dagegenhalten belohnt. Deshalb auch die engere Obergrenze
                      (×{L.joker.mutFaktor.max}): darüber gewinnt in der Simulation der Zocker.
                    </div>
                  </Field>
                )}
              </div>

              {/* Verteilung über die Saison — Frequenz statt 34 Klicks */}
              <JokerVerteilung verteilung={j.verteilung}
                onChange={(verteilung) => patchJoker({ verteilung })} />

              {/* Gemeinsame Abstimmung — die ANDERE Antwort auf „an welchen
                  Spieltagen?". Beide gleichzeitig wären zwei Instanzen für
                  dieselbe Frage, deshalb nur bei freier Verteilung wählbar. */}
              <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 10, paddingTop: 10 }}>
                {j.verteilung?.modus === "frei" ? (
                  <>
                    <Toggle label="Spieltage gemeinsam abstimmen" on={j.abstimmung === true}
                      onChange={(on) => patchJoker({ abstimmung: on })} />
                    <p style={{ fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>
                      {j.abstimmung
                        ? "Die Runde stimmt ab: Joker gibt es nur an Spieltagen mit Mehrheit."
                        : "Aus = Joker an jedem Spieltag. An = die Runde entscheidet per Mehrheit, welche Spieltage einen Joker bekommen."}
                    </p>
                  </>
                ) : (
                  <p style={{ fontSize: 11, color: C.muted, margin: 0, lineHeight: 1.4 }}>
                    Die Abstimmung über Joker-Spieltage entfällt — du hast die Verteilung
                    oben schon festgelegt. Für eine Abstimmung wieder auf <strong>Frei</strong> stellen.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Joker verdienen — steht direkt beim Joker-Block, nicht mehr 300
              Zeilen weiter unten hinter den Saison-Wetten. Es ist dieselbe
              Frage wie darüber (WOHER kommen Joker), nur die zweite Antwort:
              zugeteilt vom Admin oder verdient durch Ereignisse. Getrennt
              wirkte es, als gäbe es nur den Verdien-Weg. */}
          <SectionTitle>Joker verdienen</SectionTitle>
          <Ereignisse rules={rules}
            onChange={(ereignisse) => { touched(); setRules((r) => ({ ...r, ereignisse })); }} />

          {/* 🔴 Duell-Joker. Gemessen am 06.08.2026 mit `npm run stufen` Teil 2:
              ACHT Regel-Felder hatten überhaupt keine Oberfläche, und alle acht
              gehörten hierher. Der Baustein war fertig gebaut, vermessen und
              über den Creator-Code teilbar — einstellen konnte ihn niemand.
              Steht direkt hinter „Joker verdienen", weil es dieselbe Frage in
              ihrer dritten Antwort ist: Joker gibt es vom Admin, durch
              Leistung — oder auf Kosten eines anderen. */}
          <SectionTitle>Duell-Joker</SectionTitle>
          <DuellJoker rules={rules}
            onChange={(duell) => { touched(); setRules((r) => ({ ...r, duell })); }} />

          {/* Drehrad — der dritte Auslöser neben Zeitpunkt (Joker) und
              Leistung (Ereignisse): reiner Zufall aus einer vom Admin selbst
              geschriebenen Tabelle (design/drehrad.md). Nur in dieser Stufe,
              weil hier bereits alles andere Feineinstellung ist. */}
          <SectionTitle>Drehrad</SectionTitle>
          <Drehrad rules={rules}
            onChange={(drehrad) => { touched(); setRules((r) => ({ ...r, drehrad })); }} />

          {/* Team- & Derby-Regeln */}
          <SectionTitle>Team- &amp; Derby-Regeln</SectionTitle>
          <p style={{ fontSize: 12, color: C.muted, marginTop: -6, marginBottom: 10, lineHeight: 1.4 }}>
            Gilt für <strong>alle</strong> in der Runde (anders als der Joker, den jeder
            selbst setzt). Traditionsduelle oder bestimmte Vereine zählen mehr.
          </p>

          {!premium ? (
            <div style={{
              background: `${C.akzent}12`, border: `1px solid ${C.akzent}44`,
              borderRadius: 14, padding: "13px 15px", marginBottom: 8,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.akzent }}>🔒 Premium-Funktion</div>
              <p style={{ fontSize: 12, color: C.muted, margin: "7px 0 0", lineHeight: 1.5 }}>
                Es genügt, wenn <strong>du als Admin</strong> Premium hast.
              </p>
            </div>
          ) : (
            <>
              <Slider label="Derby zählt" value={tm.derbyFaktor} {...L.teamMods.derbyFaktor} step={reglerSchritt(rules, L.teamMods.derbyFaktor)} pfad="teamMods.derbyFaktor"
                onChange={(v) => patchTeamMods({ derbyFaktor: v })}
                fmt={fmtFaktorOderAus}
                hint="Traditionsduelle (Revierderby, Klassiker, Nordderby …) zählen mehr. 1,0 = aus." />

              <Toggle label="Einzelne Vereine hervorheben" on={eigeneVereine}
                onChange={(on) => { setEigeneVereine(on); if (!on) patchTeamMods({ teams: {} }); }} />
              {eigeneVereine && (
                <div style={{ paddingLeft: 12, borderLeft: `1px solid ${C.line}`, marginBottom: 8 }}>
                  <p style={{ fontSize: 11, color: C.muted, margin: "2px 0 8px", lineHeight: 1.4 }}>
                    Antippen wandert durch ×1,25, ×1,5, ×2, ×0,75, ×0,5 und zurück auf „aus".
                    Werte unter ×1 dämpfen den Verein: er zählt dann weniger, nicht mehr.
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {ALL_TEAMS.map((team) => {
                      const f = tmTeams[team] ?? 1;
                      // Ein DÄMPFER (unter 1) ist genauso „an" wie ein
                      // Aufschlag — vorher galt nur `f > 1`, wodurch ein
                      // gedämpfter Verein aussah wie ein unberührter.
                      const an = f !== 1;
                      const ton = f > 1 ? C.akzent : C.indigo;
                      return (
                        <button key={team}
                          onClick={() => cycleTeamFaktor(team)}
                          title={f > 1 ? "zählt mehr" : f < 1 ? "zählt weniger" : "kein Modifikator"}
                          style={{
                            cursor: "pointer", fontSize: 12, fontFamily: "inherit", padding: "6px 10px", borderRadius: 999,
                            background: an ? `${ton}22` : C.surface, color: an ? ton : C.muted,
                            border: `1px solid ${an ? ton + "66" : C.line}`,
                          }}>
                          {team}{an && (
                            // ⚠️ Zwei Nachkommastellen: mit `toFixed(1)` würde
                            // aus einem Dämpfer von 0,75 die Anzeige „×0.8".
                            <strong style={{ marginLeft: 5, fontFamily: MONO }}>{fmtFaktor(f)}</strong>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Big Game: dieselbe Aussage wie ein Derby („dieses Spiel zählt
                  mehr"), nur wird es erst WÄHREND der Saison bestimmt. Deshalb
                  steht es hier und nicht in einem eigenen Abschnitt. */}
              <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 10, paddingTop: 12, marginBottom: 10 }}>
                <Toggle label="Big Game — das Topspiel des Spieltags" on={bg.enabled}
                  onChange={(on) => patchBigGame({ enabled: on })} />
                <p style={{ fontSize: 11, color: C.muted, margin: "2px 0 0", lineHeight: 1.45 }}>
                  Ein Derby steht vorher fest, „Erster gegen Zweiter am 31. Spieltag"
                  nicht. Beim Öffnen jedes Spieltags sucht die App das brisanteste
                  Spiel — aus Tabellenzone, Rangnähe, Quoten und Derby — und hebt es
                  hervor. Es steht <strong>fest, bevor getippt wird</strong>, und wird
                  begründet angezeigt.
                </p>

                {bg.enabled && (
                  <div style={{ paddingLeft: 12, borderLeft: `1px solid ${C.line}`, marginTop: 10 }}>
                    <Slider label="Big Game zählt zusätzlich" value={bg.aufschlag}
                      {...BIGGAME_LIMITS.aufschlag} step={reglerSchritt(rules, BIGGAME_LIMITS.aufschlag)}
                      onChange={(v) => patchBigGame({ aufschlag: v })}
                      fmt={(x) => `+${zahl(x)} → ${fmtFaktor(1 + x)}`}
                      hint="Fließt in denselben Topf wie Derby und Team-Faktoren — addiert, nicht multipliziert." />
                    <Slider label="Mindest-Brisanz" value={bg.minSpannung}
                      {...BIGGAME_LIMITS.minSpannung} step={reglerSchritt(rules, BIGGAME_LIMITS.minSpannung)}
                      onChange={(v) => patchBigGame({ minSpannung: v })}
                      fmt={(x) => x.toFixed(2)}
                      hint="Reißt kein Spiel diese Schwelle, hat der Spieltag kein Big Game — besser als ein aufgeblasenes Mittelfeldduell." />
                  </div>
                )}
              </div>

              {/* Deckel — erscheint erst, wenn es überhaupt etwas zu deckeln gibt */}
              {(tmAktiv || j.enabled || bg.enabled) && (
                <>
                  <Slider label="Deckel für alle Modifikatoren" value={rules.modCap} {...L.modCap} step={reglerSchritt(rules, L.modCap)} pfad="modCap"
                    onChange={(v) => patch({ modCap: v })} fmt={fmtFaktor}
                    hint="Obergrenze, wenn Joker und Team-Regeln zusammentreffen." />
                  <p style={{ fontSize: 11, color: C.muted, marginTop: -2, marginBottom: 8, lineHeight: 1.45 }}>
                    Modifikatoren werden <strong>addiert, nicht multipliziert</strong>: Joker ×2,0
                    und Derby ×1,5 ergeben <strong>×2,5</strong> (nicht ×3,0). Das bleibt
                    berechenbar — der Deckel fängt den Rest ab.
                  </p>
                </>
              )}
            </>
          )}

          {/* Aufhol-Mechanismus */}
          <SectionTitle>Anschluss halten</SectionTitle>
          <p style={{ fontSize: 12, color: C.muted, marginTop: -6, marginBottom: 10, lineHeight: 1.4 }}>
            Damit Zurückliegende dranbleiben: Wer abgehängt ist, bekommt je Spieltag
            einen Teil des Rückstands gutgeschrieben. <strong>Aufholen heißt nicht
            Überholen</strong> — der Führende bleibt vorn.
          </p>
          <Toggle label="Anschluss-Bonus geben" on={au.enabled}
            onChange={(on) => patchAufholen({ enabled: on })} />

          {au.enabled && (
            <div style={{ paddingLeft: 12, borderLeft: `1px solid ${C.line}`, marginBottom: 8 }}>
              <Field label="Stärke">
                <div style={{ display: "flex", gap: 6 }}>
                  {STAERKE_STUFEN.map((s) => {
                    const on = auStufe === s.key;
                    return (
                      <button key={s.key} onClick={() => patchAufholen({ staerke: s.staerke, schwelle: s.schwelle })} style={{
                        cursor: "pointer", fontSize: 12, fontFamily: "inherit", padding: "8px 12px",
                        borderRadius: 10, flex: 1, textAlign: "left",
                        background: on ? `${C.akzent}22` : C.surface, color: on ? C.akzent : C.muted,
                        border: `1px solid ${on ? C.akzent + "66" : C.line}`,
                      }}>
                        <div style={{ fontWeight: 700 }}>{s.label}</div>
                        <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2, lineHeight: 1.3 }}>{s.hint}</div>
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Field label="Wen betrifft es?">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {Object.values(BETRIFFT).map((b) => {
                    const on = au.betrifft === b.key;
                    return (
                      <button key={b.key} onClick={() => patchAufholen({ betrifft: b.key })}
                        title={b.desc} style={{
                          ...TAPZIEL, cursor: "pointer", fontSize: 12, fontFamily: "inherit", padding: "7px 11px", borderRadius: 999,
                          background: on ? `${C.mint}22` : C.surface, color: on ? C.mint : C.muted,
                          border: `1px solid ${on ? C.mint + "66" : C.line}`,
                        }}>{b.label}</button>
                    );
                  })}
                </div>
              </Field>
              {/* 🔴 `beschreibeBetrifft` statt `.desc`: bei den beiden
                  parametrierten Stufen („die letzten n", „wer mehr als x %
                  abfällt") sagt die statische Beschreibung nur, WAS für eine
                  Art Auswahl es ist — nie die eingestellte ZAHL. Der Admin
                  drehte an einem Regler und las daneben denselben Satz.
                  Gefunden über `npm run tot`: die Funktion lag gebaut und
                  getestet da und hatte keinen Aufrufer. */}
              <p style={{ fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>
                {beschreibeBetrifft(au.betrifft, au.betrifftWert)}
                {" "}Die Live-Vorschau unten zeigt, ob der Bonus zu stark wird.
              </p>
            </div>
          )}

          {/* Saisonform: Streichresultate + Gewichtung der Spieltage */}
          <SectionTitle>Streicher &amp; Saisonverlauf</SectionTitle>
          <p style={{ fontSize: 12, color: C.muted, marginTop: -6, marginBottom: 10, lineHeight: 1.4 }}>
            Wie stark darf ein einzelner Spieltag die Saison bestimmen? Beides greift
            auf die fertigen Spieltagspunkte — die Wertung eines Spiels bleibt unberührt.
          </p>

          <Field label="Streichresultate">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {[0, 1, 2, 3, 5].map((n) => {
                const on = sf.streich === n;
                return (
                  <button key={n} onClick={() => patchSaisonform({ streich: n })} style={{
                    ...TAPZIEL, cursor: "pointer", fontSize: 12, fontFamily: "inherit", padding: "7px 11px", borderRadius: 999,
                    background: on ? `${C.mint}22` : C.surface, color: on ? C.mint : C.muted,
                    border: `1px solid ${on ? C.mint + "66" : C.line}`,
                  }}>{n === 0 ? "keine" : `${n} streichen`}</button>
                );
              })}
            </div>
          </Field>
          <p style={{ fontSize: 11, color: C.muted, marginTop: 2, marginBottom: 10, lineHeight: 1.4 }}>
            Die schwächsten Spieltage zählen nicht — verzeiht einen Ausrutscher oder
            einen Urlaub. <strong>Gemessen der einzige milde Ausgleich hier</strong>:
            senkt den Vorsprung des Ersten leicht, ohne das Können zu entwerten.
          </p>

          {sf.streich > 0 && (
            <div style={{ paddingLeft: 12, borderLeft: `1px solid ${C.line}`, marginBottom: 10 }}>
              <Toggle label="Nur Spieltage streichen, an denen getippt wurde"
                on={sf.nurGetippte}
                onChange={(on) => patchSaisonform({ nurGetippte: on })} />
              <p style={{ fontSize: 11, color: sf.nurGetippte ? C.muted : C.coral, marginTop: 2, lineHeight: 1.4 }}>
                {sf.nurGetippte
                  ? "Ein vergessener Spieltag bleibt stehen und wird nicht verschenkt."
                  : "⚠️ Aus: ein vergessener Spieltag wird als Nullrunde gestrichen — Auslassen kostet dann nichts mehr und arbeitet gegen die Versäumnis-Regel."}
              </p>
            </div>
          )}

          <Field label="Gewichtung über die Saison">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {KURVEN.map((k) => {
                const on = sf.kurve === k.key;
                return (
                  <button key={k.key} onClick={() => patchSaisonform({ kurve: k.key })}
                    title={k.text} style={{
                      ...TAPZIEL, cursor: "pointer", fontSize: 12, fontFamily: "inherit", padding: "7px 11px", borderRadius: 999,
                      background: on ? `${C.akzent}22` : C.surface, color: on ? C.akzent : C.muted,
                      border: `1px solid ${on ? C.akzent + "66" : C.line}`,
                    }}>{k.label}</button>
                );
              })}
            </div>
          </Field>
          <p style={{ fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>
            {KURVE[sf.kurve]?.text}
          </p>

          {/* ⚠️ Diese Warnung ist der Grund, warum der Regler überhaupt so
              beschrieben ist. Gemessen (400 Läufe): „Endspurt" senkt den
              Vorsprung des Ersten NICHT, sondern vergrößert ihn — weil Gewicht
              auf einen Teil der Saison die wirksame Stichprobe verkleinert.
              Ohne diesen Hinweis stellt ein Admin das ein, um auszugleichen,
              und bekommt das Gegenteil. */}
          {sf.kurve !== "flach" && (
            <div style={{
              marginTop: 8, marginBottom: 8, padding: "9px 11px", borderRadius: 10,
              background: `${C.coral}14`, border: `1px solid ${C.coral}44`,
            }}>
              <div style={{ fontSize: 12, color: C.coral, fontWeight: 700, marginBottom: 3 }}>
                Kein Ausgleich — ein Spannungsregler
              </div>
              <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.45 }}>
                Nachgemessen: eine ungleiche Gewichtung <strong>vergrößert</strong> den
                Vorsprung des Ersten und macht die Saison zufälliger, weil weniger
                Spieltage wirklich zählen. Für ein spannendes Saisonende gut — zum
                Ausgleichen nicht. Dafür sind die Streicher da.
              </div>
              <div style={{ marginTop: 8 }}>
                <Slider label="Wie ausgeprägt?" value={sf.staerke}
                  min={SAISONFORM_LIMITS.staerke.min} max={SAISONFORM_LIMITS.staerke.max}
                  step={SAISONFORM_LIMITS.staerke.step}
                  fmt={(v) => `×${v.toFixed(1)}`}
                  onChange={(v) => patchSaisonform({ staerke: v })} />
              </div>
            </div>
          )}

          {/* Die Zusammenfassung nur zeigen, wenn sie mehr sagt als die
              Kurvenzeile darüber. Im Standardzustand stünde sonst zweimal
              „Jeder Spieltag zählt gleich viel." untereinander. */}
          {(sf.kurve !== "flach" || sf.streich > 0) && (
            <p style={{
              fontSize: 12, color: C.text, marginTop: 4, marginBottom: 12, lineHeight: 1.45,
              padding: "8px 10px", borderRadius: 8, background: C.surface, border: `1px solid ${C.line}`,
            }}>
              {beschreibeSaisonform(sf, 34)}
            </p>
          )}

          {/* Saison-Wetten (Langzeit-Ebene) */}
          </>)}

          <SectionTitle>Saison-Wetten</SectionTitle>
          <SaisonWetten
            saison={rules.saison || DEFAULT_RULES.saison}
            onChange={setSaison}
            teams={ALL_TEAMS}
          />

          {/* Wettbewerbs-Gewichte — gehört zu den Modifikatoren, steht aber
              hier unten, weil es nur Runden mit mehreren Wettbewerben betrifft. */}
          <SectionTitle>Wettbewerbe gewichten</SectionTitle>
          <WettbewerbGewichte rules={rules}
            onChange={(wettbewerbe) => { touched(); setRules((r) => ({ ...r, wettbewerbe })); }} />


          {/* Versäumnis: Spieltag vergessen */}
          {stufe === "profi" && (<>
          <SectionTitle>Spieltag vergessen</SectionTitle>
          <p style={{ fontSize: 12, color: C.muted, marginTop: -6, marginBottom: 10, lineHeight: 1.4 }}>
            Wer mal keine Zeit hatte, steht sonst mit null Punkten da und steigt aus.
            Mit Kulanz bekommt er einen Ersatz-Tipp — <strong>immer schlechter als
            selbst tippen</strong>, aber besser als nichts.
          </p>
          <Toggle label="Ersatz-Tipp bei Versäumnis" on={ve.enabled}
            onChange={(on) => patchVersaeumnis({ enabled: on })} />

          {ve.enabled && (
            <div style={{ paddingLeft: 12, borderLeft: `1px solid ${C.line}`, marginBottom: 8 }}>
              <Field label="Woher kommt der Ersatz-Tipp?">
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {VERSAEUMNIS_STRATEGIEN.map((s) => {
                    const on = ve.strategie === s;
                    return (
                      <button key={s} onClick={() => patchVersaeumnis({ strategie: s })} style={{
                        cursor: "pointer", fontSize: 12, fontFamily: "inherit", padding: "8px 12px",
                        borderRadius: 10, textAlign: "left",
                        background: on ? `${C.akzent}22` : C.surface, color: on ? C.akzent : C.muted,
                        border: `1px solid ${on ? C.akzent + "66" : C.line}`,
                      }}>
                        <div style={{ fontWeight: 700 }}>{VERSAEUMNIS_LABEL[s]}</div>
                        <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2, lineHeight: 1.3 }}>{VERSAEUMNIS_HINT[s]}</div>
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Field label={`Abzug auf den Ersatz-Tipp: ${ve.malusProzent} %`}>
                <input type="range"
                  min={RULE_LIMITS.versaeumnis.malusProzent.min}
                  max={RULE_LIMITS.versaeumnis.malusProzent.max}
                  step={RULE_LIMITS.versaeumnis.malusProzent.step}
                  value={ve.malusProzent}
                  onChange={(e) => patchVersaeumnis({ malusProzent: Number(e.target.value) })}
                  style={{ width: "100%", accentColor: C.akzent }} />
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4, lineHeight: 1.4 }}>
                  {ve.malusProzent === 0 && "Volle Wertung — sehr gnädig, macht Vergessen folgenlos."}
                  {ve.malusProzent > 0 && ve.malusProzent < 100 && `Der Ersatz-Tipp zählt nur zu ${100 - ve.malusProzent} %.`}
                  {ve.malusProzent === 100 && "Wertlos — wie gar nicht getippt (nur fürs Gefühl dabei)."}
                </div>
              </Field>

              <Field label={ve.maxProSaison === 0 ? "Unbegrenzt oft" : `Höchstens ${ve.maxProSaison}× pro Saison`}>
                <input type="range"
                  min={RULE_LIMITS.versaeumnis.maxProSaison.min}
                  max={RULE_LIMITS.versaeumnis.maxProSaison.max}
                  step={RULE_LIMITS.versaeumnis.maxProSaison.step}
                  value={ve.maxProSaison}
                  onChange={(e) => patchVersaeumnis({ maxProSaison: Number(e.target.value) })}
                  style={{ width: "100%", accentColor: C.akzent }} />
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4, lineHeight: 1.4 }}>
                  {ve.maxProSaison === 0
                    ? "Die Kulanz greift immer — auch bei Dauer-Aussetzern."
                    : "Danach zählt ein vergessener Spieltag wieder null. Verhindert dauerhaftes Aussetzen."}
                </div>
              </Field>
            </div>
          )}


          {/* Tipp-Fenster: wie früh vor Anpfiff getippt wird. Gehört hierher,
              weil es dieselbe Frage beantwortet wie die Spielauswahl — WAS
              steht wann zum Tippen an. */}
          <div style={{ marginTop: 12, marginBottom: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Ab wann tippbar?</div>
            <p style={{ fontSize: 11, color: C.muted, margin: "0 0 8px", lineHeight: 1.45 }}>
              Quoten erscheinen erst einige Tage vor Anpfiff. Wie früh eure Runde
              tippt, entscheidest du — geschlossen wird immer beim Anpfiff.
            </p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {VORLAUF_STUFEN.map((st) => {
                const an = (rules.tippfenster?.vorlaufStunden ?? 168) === st.stunden;
                return (
                  <button key={st.stunden} title={st.hint}
                    /* ⚠️ `...r.tippfenster` mitnehmen: die frühere Fassung
                       ersetzte das GANZE Objekt und warf damit den Anker weg.
                       Ein Creator-Code mit `anker: "spieltag"` verlor ihn,
                       sobald jemand den Vorlauf einmal anfasste — lautlos. */
                    onClick={() => { touched(); setRules((r) => ({ ...r, tippfenster: { ...r.tippfenster, vorlaufStunden: st.stunden } })); }}
                    style={{
                      ...TAPZIEL, flex: "1 1 70px", cursor: "pointer", fontFamily: "inherit", padding: "8px 6px",
                      borderRadius: 11, fontSize: 12, fontWeight: 700,
                      background: an ? `${C.akzent}22` : C.surface,
                      color: an ? C.akzent : C.muted,
                      border: `1px solid ${an ? C.akzent + "66" : C.line}`,
                    }}>{st.label}</button>
                );
              })}
            </div>
            {/* 🔴 Der ANKER hatte bis 06.08.2026 überhaupt keine Oberfläche.
                Er stand im Regelwerk, war über den Creator-Code teilbar, wurde
                von `sanitizeRules` gesäubert — und niemand konnte ihn
                einstellen. Dazu lief er ins Leere, weil die Aufrufer die
                `starts`-Map nicht mitgaben (siehe tippfenster.js). Drei
                Schichten übereinander, und keine davon meldete sich. */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              {ANKER.map((a) => {
                const an = (rules.tippfenster?.anker ?? "spiel") === a.key;
                return (
                  <button key={a.key} title={a.erklaerung}
                    onClick={() => { touched(); setRules((r) => ({ ...r, tippfenster: { ...r.tippfenster, anker: a.key } })); }}
                    style={{
                      flex: "1 1 140px", cursor: "pointer", fontFamily: "inherit", padding: "8px 8px",
                      borderRadius: 11, fontSize: 12, fontWeight: 700,
                      background: an ? `${C.akzent}22` : C.surface,
                      color: an ? C.akzent : C.muted,
                      border: `1px solid ${an ? C.akzent + "66" : C.line}`,
                    }}>{a.label}</button>
                );
              })}
            </div>
            <p style={{ fontSize: 11, color: C.muted, marginTop: 6, lineHeight: 1.45 }}>
              {beschreibeTippfenster(rules)}
            </p>
            {/* Die drei Fragen, die ein Spieler wirklich stellt — statt einer
                Beschreibung der Einstellung. `erklaereTippfenster` war dafür
                gebaut und hatte keinen Aufrufer (gefunden über `npm run tot`). */}
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 5 }}>
              {erklaereTippfenster(rules).map((z) => (
                <div key={z.frage} style={{ fontSize: 11, lineHeight: 1.45 }}>
                  <span style={{ color: C.text, fontWeight: 700 }}>{z.frage}</span>{" "}
                  <span style={{ color: C.muted }}>{z.antwort}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Zeitachse — was ein Spieltag DER RUNDE umfasst, wenn mehrere Ligen
              versetzt laufen. Zeigt sich selbst nur bei mehreren Wettbewerben. */}
          <Zeitachse
            zeitachse={rules.zeitachse}
            onChange={(neu) => { touched(); setRules((r) => ({ ...r, zeitachse: neu })); }}
          />

          {/* Zeitraum — gilt zusätzlich zu jeder Vereins-Auswahl */}
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Zeitraum</div>
            <p style={{ fontSize: 11, color: C.muted, margin: "0 0 8px", lineHeight: 1.45 }}>
              Leer = ganze Saison. Für kurze Runden („nur die Rückrunde", „die letzten
              fünf Spieltage") hier eingrenzen.
            </p>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {[["spieltagVon", "von"], ["spieltagBis", "bis"]].map(([feld, label]) => (
                <label key={feld} style={{ flex: 1, fontSize: 12, color: C.muted }}>
                  Spieltag {label}
                  <input type="number" inputMode="numeric"
                    min={AUSWAHL_LIMITS.spieltag.min} max={AUSWAHL_LIMITS.spieltag.max}
                    value={sp[feld] ?? ""}
                    onChange={(e) => patchSpiele({ [feld]: e.target.value === "" ? null : Number(e.target.value) })}
                    placeholder="—"
                    style={{
                      display: "block", width: "100%", boxSizing: "border-box", marginTop: 3,
                      background: C.surface, color: C.text, border: `1px solid ${C.line}`,
                      borderRadius: 10, padding: "8px 10px", fontSize: 13, fontFamily: MONO, outline: "none",
                    }} />
                </label>
              ))}
            </div>
          </div>

          <div style={{
            marginTop: 10, background: C.ink2, border: `1px solid ${C.line}`,
            borderRadius: 12, padding: "10px 12px",
          }}>
            <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 1.2, color: C.muted, textTransform: "uppercase" }}>
              Wandert mit dem Code
            </div>
            <div style={{ fontSize: 12, color: C.text, marginTop: 4, lineHeight: 1.45 }}>
              {beschreibeAuswahl(sp)}
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4, lineHeight: 1.45 }}>
              Wer deinen Creator-Code lädt, bekommt diese Auswahl gleich mit — und
              kann sie danach trotzdem ändern.
            </div>
          </div>

          {/* Runde erstellen */}
          </>)}
          </>)}

          <SectionTitle>Runde erstellen</SectionTitle>
          {!created ? (
            <>
              <p style={{ fontSize: 13, color: C.muted, marginTop: -4, marginBottom: 10, lineHeight: 1.5 }}>
                Legt mit diesem Regelwerk eine echte Runde an. Du wirst Admin,
                bekommst einen Beitritts-Code zum Teilen, und diese Runde wird
                deine aktive Runde zum Tippen.
              </p>
              {!user && (
                <p style={{ fontSize: 12, color: C.akzent, marginBottom: 10 }}>
                  Bitte zuerst auf der Startseite einloggen.
                </p>
              )}
              {/* 🔴 Die Sperre steht SICHTBAR über dem Knopf und nicht erst
                  als Fehlermeldung nach dem Klick: seit die Spielauswahl in
                  der Runde wirklich greift, wäre das Ergebnis eine Runde ohne
                  ein einziges Spiel — und man sähe es erst darin. */}
              {leereAuswahl && (
                <p style={{ fontSize: 12, color: C.coral, marginBottom: 10, lineHeight: 1.45 }}>
                  Diese Auswahl lässt kein einziges Spiel übrig. So angelegt hätte die
                  Runde nichts zu tippen — oben eine Einschränkung zurücknehmen.
                </p>
              )}
              <button onClick={createRound} disabled={creating || !user || teamFilterInvalid || leereAuswahl} style={{
                width: "100%", cursor: creating || !user || teamFilterInvalid || leereAuswahl ? "default" : "pointer",
                background: C.mint, color: C.ink, fontWeight: 700, fontSize: 15,
                ...TAPZIEL, border: "none", borderRadius: 14, padding: "13px 0",
                opacity: creating || !user || teamFilterInvalid || leereAuswahl ? 0.6 : 1,
              }}>
                {creating ? "wird angelegt …" : "Runde jetzt erstellen"}
              </button>
              {createErr && <div style={{ fontSize: 12, color: C.coral, marginTop: 6 }}>{createErr}</div>}
            </>
          ) : (
            <div style={{ background: `${C.mint}12`, border: `1px solid ${C.mint}44`, borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.mint }}>✓ „{created.name}“ ist angelegt — deine aktive Runde</div>
              <div style={{ marginTop: 10, fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>Beitritts-Code</div>
              <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: C.akzent, marginTop: 4, letterSpacing: 3 }}>{created.join_code}</div>
              <button onClick={copyJoinCode} style={{
                marginTop: 10, width: "100%", cursor: "pointer",
                background: codeCopied ? C.mint : C.surface2, color: codeCopied ? C.ink : C.text, fontWeight: 700, fontSize: 13,
                border: `1px solid ${C.line}`, borderRadius: 12, padding: "10px 0",
              }}>{codeCopied ? "✓ kopiert" : "Code kopieren"}</button>
              <p style={{ fontSize: 11, color: C.muted, marginTop: 8, lineHeight: 1.4 }}>
                Freunde geben diesen Code unter „Runde beitreten" ein.
              </p>
            </div>
          )}

          {/* Creator-Code */}
          <SectionTitle>Creator-Code</SectionTitle>
          <div style={{
            background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12,
            padding: "10px 12px", fontFamily: MONO, fontSize: 12, color: C.akzent,
            wordBreak: "break-all", lineHeight: 1.5,
          }}>{code}</div>
          <button onClick={copy} style={{
            marginTop: 10, width: "100%", cursor: "pointer",
            background: copied ? C.mint : C.akzent, color: C.ink, fontWeight: 700, fontSize: 15,
            ...TAPZIEL, border: "none", borderRadius: 14, padding: "13px 0", transition: "background .2s",
          }}>{copied ? "✓ kopiert" : "Langen Code kopieren & teilen"}</button>

          {/* Kurzcode (Content-Creator) */}
          <div style={{ marginTop: 14, background: C.ink2, border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Kurzcode statt langem Code</div>
            <p style={{ fontSize: 11, color: C.muted, margin: "4px 0 10px", lineHeight: 1.4 }}>
              Speichert dein Regelwerk unter einem kurzen, merkbaren Code — perfekt zum
              Teilen (z. B. von Content-Creatorn). Andere laden ihn unten einfach ein.
            </p>
            {!shortCode ? (
              <button onClick={publish} disabled={publishing || !user} style={{
                width: "100%", cursor: publishing || !user ? "default" : "pointer",
                background: C.surface2, color: user ? C.text : C.muted, fontWeight: 700, fontSize: 13,
                border: `1px solid ${C.line}`, borderRadius: 12, padding: "11px 0", minHeight: 44,
                opacity: publishing || !user ? 0.6 : 1,
              }}>{publishing ? "wird erstellt …" : user ? "Kurzcode erstellen & teilen" : "Zum Erstellen einloggen"}</button>
            ) : (
              <div>
                <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: C.akzent, letterSpacing: 3, textAlign: "center" }}>{shortCode}</div>
                <button onClick={copyShort} style={{
                  marginTop: 8, width: "100%", cursor: "pointer",
                  background: shortCopied ? C.mint : C.surface2, color: shortCopied ? C.ink : C.text, fontWeight: 700, fontSize: 13,
                  border: `1px solid ${C.line}`, borderRadius: 12, padding: "10px 0",
                }}>{shortCopied ? "✓ kopiert" : "Kurzcode kopieren"}</button>
              </div>
            )}
          </div>

          {/* Bausteine: einzelne Aspekte (Drehrad, Joker-Ökonomie, …) als
              eigener Teil-Code — nur ab „anpassen", weil in „einfach"
              Charakter und Preset die Entscheidung treffen. */}
          {stufe === "profi" && (
            <>
              <SectionTitle>Bausteine</SectionTitle>
              <Bausteine rules={rules} />
            </>
          )}

          {/* Import: langer ODER kurzer Code */}
          <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
            <input value={imp} onChange={(e) => { setImp(e.target.value); setImpErr(""); }}
              placeholder="Code laden (Creator-Code, Kurzcode oder Teil-Code)" style={{
                flex: 1, minWidth: 0, background: C.ink2, color: C.text, border: `1px solid ${C.line}`,
                borderRadius: 12, padding: "10px 12px", fontSize: 13, fontFamily: MONO, outline: "none",
              }} />
            <button onClick={load} disabled={!imp.trim()} style={{
              cursor: imp.trim() ? "pointer" : "default", background: C.surface2,
              color: imp.trim() ? C.text : C.muted, border: `1px solid ${C.line}`,
              borderRadius: 12, padding: "0 16px", fontSize: 13, fontWeight: 600, minHeight: 44,
            }}>Laden</button>
          </div>
          {impErr && <div style={{ fontSize: 12, color: C.coral, marginTop: 6 }}>{impErr}</div>}
        </div>
      </div>
    </div>
  );
}


// ── Große Zeile ────────────────────────────────────────────
// Andis Aufbau vom 07.08.2026, wörtlich: „⚽ Wettbewerbe · Ligen & Teams ·
// 3 gewählt ›“. Eine Spalte, große Zeilen — kein Kachelraster.
//
// Drei Dinge stecken darin, die nicht wegoptimiert werden dürfen:
// 1. **Mindestens 56 px hoch.** Das ist der eigentliche Grund für dieses
//    Layout: Apple verlangt 44 pt, Google 48 dp, und auf diesem Screen lagen
//    18 Tippziele darunter. Ein großes Ziel entsteht hier von selbst.
// 2. **Der Stand steht rechts, im zugeklappten Zustand.** Eine Zeile, die
//    ihren Stand erst nach dem Öffnen zeigt, verlagert das Problem nur.
// 3. **Aufklappen statt Unterseite.** Der eingestellte Wert und seine Wirkung
//    (Spielzahl, Aufwand) bleiben auf demselben Screen — dieselbe Begründung
//    wie bei der klebenden Ampel weiter unten.
function GrosseZeile({ icon, titel, unter, wert, offen, onClick, children }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <button onClick={onClick} style={{
        width: "100%", minHeight: 56, boxSizing: "border-box",
        display: "flex", alignItems: "center", gap: 12,
        textAlign: "left", cursor: "pointer", fontFamily: "inherit", color: C.text,
        background: offen ? C.ink2 : C.surface,
        border: `1px solid ${offen ? C.mint + "55" : C.line}`,
        borderRadius: 14, padding: "12px 14px",
      }}>
        {icon && <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1 }}>{icon}</span>}
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>{titel}</span>
          {unter && (
            <span style={{ display: "block", fontSize: 12, color: C.muted, marginTop: 2 }}>{unter}</span>
          )}
        </span>
        {wert && (
          <span style={{ fontFamily: MONO, fontSize: 12, color: C.akzent, flexShrink: 0 }}>{wert}</span>
        )}
        <span style={{
          fontSize: 20, color: C.muted, flexShrink: 0, lineHeight: 1,
          transform: offen ? "rotate(90deg)" : "none", transition: "transform .15s",
        }}>›</span>
      </button>
      {offen && <div style={{ padding: "2px 2px 10px" }}>{children}</div>}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 1,
      marginTop: 22, marginBottom: 12, paddingBottom: 6, borderBottom: `1px solid ${C.line}`,
    }}>{children}</div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}

// `pfad` schaltet das Empfehlungsband frei: der Bereich, den die vermessenen
// Presets belegen, wird als Streifen unter dem Regler markiert und der Wert
// färbt sich, sobald er ihn verlässt. Bewusst direkt am Regler — der
// Zusammenhang zwischen Handgriff und Folge muss unmittelbar sein, der Kasten
// weiter oben erklärt dann das Warum.
function Slider({ label, hint, value, min, max, step, onChange, fmt, pfad }) {
  const b = pfad ? band(pfad) : null;
  const draussen = b && (value < b.von || value > b.bis);
  const anteil = (v) => `${Math.max(0, Math.min(100, ((v - min) / (max - min || 1)) * 100))}%`;

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ fontSize: 13 }}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: 13, color: draussen ? C.coral : C.akzent }}>
          {fmt ? fmt(value) : value.toFixed(2)}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(+e.target.value)}
        style={{ width: "100%", accentColor: draussen ? C.coral : C.akzent, cursor: "pointer" }} />
      {b && (
        <div title="erprobter Bereich" style={{
          position: "relative", height: 3, borderRadius: 999, background: C.line, marginTop: 1,
        }}>
          <div style={{
            position: "absolute", top: 0, bottom: 0, borderRadius: 999, background: `${C.mint}99`,
            left: anteil(b.von), right: `calc(100% - ${anteil(b.bis)})`,
          }} />
        </div>
      )}
      {hint && <div style={{ fontSize: 11, color: C.muted, marginTop: 4, lineHeight: 1.4 }}>{hint}</div>}
    </div>
  );
}

function Toggle({ label, on, onChange }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%",
      textAlign: "left", gap: 12, marginBottom: 8, cursor: "pointer", color: C.text,
      background: C.surface, border: `1px solid ${on ? C.mint + "55" : C.line}`,
      borderRadius: 12, padding: "10px 14px", fontSize: 13, fontFamily: "inherit",
      // 44 pt (Apple) / 48 dp (Google) — gilt für jeden Schalter dieses Screens.
      minHeight: 44, boxSizing: "border-box",
    }}>
      <span>{label}</span>
      <span style={{
        flexShrink: 0, width: 38, height: 22, borderRadius: 999,
        background: on ? C.mint : C.surface2, position: "relative", transition: "background .2s",
      }}>
        <span style={{
          position: "absolute", top: 2, left: on ? 18 : 2, width: 18, height: 18,
          borderRadius: 999, background: "#fff", transition: "left .2s",
        }} />
      </span>
    </button>
  );
}

function Stepper({ value, min, max, onStep }) {
  // ⚠️ Hier reicht `TAPZIEL` NICHT: `min-height` schlägt `height`, aus dem
  // 30×30-Quadrat würde ein 30 breiter, 44 hoher Streifen. Quadratische
  // Knöpfe brauchen beide Maße — dafür gibt es die zweite Konstante.
  const b = (dis) => ({
    ...TAPZIEL_QUADRAT, borderRadius: 10, cursor: dis ? "default" : "pointer",
    background: C.surface2, color: dis ? C.muted : C.text, border: `1px solid ${C.line}`,
    fontSize: 20, lineHeight: 1,
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button onClick={() => onStep(-1)} disabled={value <= min} style={b(value <= min)}>−</button>
      <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 20, color: C.akzent, width: 18, textAlign: "center" }}>{value}</span>
      <button onClick={() => onStep(1)} disabled={value >= max} style={b(value >= max)}>+</button>
    </div>
  );
}
