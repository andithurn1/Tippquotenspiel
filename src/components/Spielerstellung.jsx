"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  DEFAULT_RULES, RULE_LIMITS,
  encodePreset, decodePreset, sanitizeRules, istCreatorCode,
} from "@/lib/engine";
import { istTeilCode, wendeTeilCodeAn, zerlegeTeilCode } from "@/lib/teilbibliothek";
import { PRESETS } from "@/lib/presets";
import { recommendedDisplayScale } from "@/lib/rulePreview";
import { isPremium } from "@/lib/premium";
import { alleVereine, vereineVon, LIGEN } from "@/lib/ligen";
import { wettbewerbLabel } from "@/lib/wettbewerbe";
import { getStore } from "@/lib/store";
import { useAuth } from "@/components/AuthProvider";
import { useCurrentRound } from "@/components/RoundProvider";
import BackLink from "@/components/BackLink";
import VariantenWahl from "@/components/VariantenWahl";
import TeilCodeFeld from "@/components/TeilCodeFeld";
import Bibliothek from "@/components/Bibliothek";
import GesamtspielAuswahl, { GesamtspielFenster } from "@/components/GesamtspielAuswahl";
import Schichtung from "@/components/Schichtung";
import RegelVorschau from "@/components/RegelVorschau";
import PresetRating from "@/components/PresetRating";
import PresetMischen from "@/components/PresetMischen";
import WettbewerbGewichte from "@/components/WettbewerbGewichte";
import EinfacheRegler from "@/components/EinfacheRegler";
import { CHARAKTERE } from "@/lib/charaktere";
import BalanceAmpel from "@/components/BalanceAmpel";
import ProfiWarnungen from "@/components/ProfiWarnungen";
import Mitbestimmung from "@/components/Mitbestimmung";
import Bausteine from "@/components/Bausteine";
import AufwandPanel from "@/components/AufwandPanel";
import { sanitizeSpiele, spieleProSpieltag, TEAM_MODI } from "@/lib/spielauswahl";
import SpielauswahlWettbewerbe from "@/components/SpielauswahlWettbewerbe";
import SpielauswahlListe from "@/components/SpielauswahlListe";
import LigaSonderregeln from "@/components/LigaSonderregeln";
import Alleinstellung from "@/components/Alleinstellung";
import { C, MONO, SCHRIFT, RUND } from "@/lib/theme";
import { zahl, fmtFaktor } from "@/lib/format";
import { Zahl, Slider, Toggle, Field, Stepper, GrosseZeile } from "@/components/Eingaben";
import JokerSondermenue, { jokerZeileStand } from "@/components/JokerSondermenue";
import ModifikatorenSondermenue, { modifikatorenStand } from "@/components/ModifikatorenSondermenue";
import WertungSondermenue, { wertungStand } from "@/components/WertungSondermenue";
import VerlaufSondermenue, { verlaufStand } from "@/components/VerlaufSondermenue";
import SaisonZeitSondermenue, { saisonZeitStand } from "@/components/SaisonZeitSondermenue";
import { TAPZIEL } from "@/lib/tapziel";

// Alle Klubs ALLER Wettbewerbe — sonst ließe sich keine Runde bauen, die
// Bundesliga und Premier League mischt.
const ALL_TEAMS = alleVereine();

// Zahlen-Anzeige: `src/lib/format.js` ist die eine Quelle (Begründung dort).

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
  // 🔴 Welcher Joker-Modus galt, bevor auf „Budget" gewechselt wurde. Ohne das
  // landet ein Rückwechsel stillschweigend auf „Ein Joker": `einsatz` ist EIN
  // Wert desselben Feldes, das Verlassen überschreibt also die vorige Wahl.
  // Wer von „Rangliste" ins Budget und zurück geht, will „Rangliste" wieder.
  const [letzterModus, setLetzterModus] = useState("einzel");
  // 🔴 Welcher Teil-Code je Ebene zuletzt geladen wurde (Andi, 21.08.2026).
  // Zwei Codes derselben Ebene überschreiben einander — ohne Anzeige wirkt
  // der zweite Ladevorgang wie ein Fehlschlag des ersten.
  const [geladeneCodes, setGeladeneCodes] = useState({});
  // 🔴 Die REIHE, in der aufgelegt wurde (Andi, 24.08.2026: „schön untereinander
  // in der Reihe kombinierbar"). `geladeneCodes` weiß nur, WAS gilt — die Map
  // kann nicht erzählen, in welcher Folge es dazukam. Genau das ist sein Punkt.
  //
  // ⚠️ Ein zweiter Code desselben Aspekts rutscht ans ENDE, statt an seiner
  // alten Stelle zu bleiben: er hat zuletzt gewirkt.
  const [schichten, setSchichten] = useState([]);
  // Wurde nach dem letzten Auflegen von Hand geschraubt? `touched()` läuft bei
  // JEDER Regeländerung durch — daran hängt die Auskunft, ohne einen zweiten
  // Weg zu erfinden.
  const [handAngepasst, setHandAngepasst] = useState(false);
  // Woraus die Runde entstanden ist: Vorlage, Gesamt-Code oder die Vorgabe.
  const [basisName, setBasisName] = useState(null);

  const merkeCode = (aspekt, code) => {
    setGeladeneCodes((g) => ({ ...g, [aspekt]: code }));
    setSchichten((l) => [...l.filter((x) => x.aspekt !== aspekt), { aspekt, code }]);
    setHandAngepasst(false);
  };
  const [charakterKey, setCharakterKey] = useState(null);
  // Andis PP1: die Bibliothek ist ein FENSTER, kein Abschnitt — sie legt sich
  // über den Screen und gibt ihn danach unverändert zurück.
  const [bibliothekOffen, setBibliothekOffen] = useState(false);
  // Andis eigenes Fenster für die Kompletteinstellungen (24.08.2026) — getrennt
  // von `bibliothekOffen`: dieses zeigt NUR ganze Spiele, jenes auch Bausteine.
  const [komplettOffen, setKomplettOffen] = useState(false);
  const [mischenOffen, setMischenOffen] = useState(false);
  // Die Spielauswahl ist KEIN lokaler Zustand mehr, sondern Teil des
  // Regelwerks — nur so reist sie im Creator-Code mit.
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
  // Die Joker-Zeile hat einen EIGENEN Zustand statt in `auswahlOffen`
  // mitzulaufen: sie steht 300 Zeilen weiter unten und hat mit der
  // Betippungsauswahl nichts zu tun — gemeinsam geführt würde ein Klick
  // auf „Wettbewerbe“ das gerade geöffnete Joker-Menü zuklappen.
  const [jokerOffen, setJokerOffen] = useState(false);
  const [modsOffen, setModsOffen] = useState(false);
  // Zu einem Abschnitt der Kopfzeile springen (ST5). Über die Id statt über
  // einen Ref, weil die Ziele in drei verschiedenen Ebenen liegen — ein Ref
  // müsste durch zwei Komponenten durchgereicht werden, nur damit die
  // Kopfzeile scrollen kann.
  //
  // ⚠️ `scroll-margin-top` an den Zielen: ohne das schöbe sich die klebende
  // Kopfzeile über die Überschrift, zu der man gerade gesprungen ist.
  //
  // ⚠️ OHNE `behavior: "smooth"`, und das ist gemessen: damit passierte im
  // Browser GAR NICHTS. Der Klick kam an (das Menü klappte auf), der Scroll
  // blieb aus. Ein Sprung, der je nach Umgebung stumm ausfällt, ist schlechter
  // als einer, der immer stattfindet — und die Vorgabe `auto` respektiert
  // außerdem die Systemeinstellung „Bewegung reduzieren".
  const springZu = (id) => {
    const el = typeof document !== "undefined" && document.getElementById(id);
    if (el) el.scrollIntoView({ block: "start" });
  };
  const [wertungOffen, setWertungOffen] = useState(false);
  const [verlaufOffen, setVerlaufOffen] = useState(false);
  const [saisonOffen, setSaisonOffen] = useState(false);
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
  const touched = () => { setPresetKey(null); setShortCode(null); setHandAngepasst(true); };
  const applyPreset = (preset) => {
    setPresetKey(preset.key); setShortCode(null);
    setRules({ ...sanitizeRules(preset.rules), name: preset.label });
  };
  // 🔴 EIN Weg, einen Bibliotheks-Eintrag zu übernehmen — benutzt vom Fenster
  // (`Bibliothek`) UND von der Vorauswahl oben (`GesamtspielAuswahl`).
  // Stünde die Fallunterscheidung zweimal da, liefe sie irgendwann
  // auseinander: ein Charakter ERSETZT alles, ein Preset auch (trägt aber
  // seinen Namen), ein Baustein mischt sich nur in SEINEN Aspekt.
  const uebernimmEintrag = (e) => {
    touched();
    setShortCode(null);
    // 🔴 Eine ganze Vorlage ist eine neue GRUNDLAGE, kein Aufsatz: die Schichten
    // darüber gälten sonst weiter, obwohl das Regelwerk darunter ausgetauscht
    // ist — die Reihe behauptete dann eine Herkunft, die es nicht mehr gibt.
    // Ein BAUSTEIN dagegen ist genau ein Aufsatz und wird unten mitgezählt.
    if (e.art === "charakter" || e.art === "preset") {
      setBasisName(e.label);
      setSchichten([]);
      setGeladeneCodes({});
    } else {
      setSchichten((l) => [...l.filter((x) => x.aspekt !== e.aspekt), { aspekt: e.aspekt, code: "aus der Bibliothek" }]);
    }
    setHandAngepasst(false);
    if (e.art === "charakter") {
      setCharakterKey(e.key); setPresetKey(null); setRules(e.rules);
    } else if (e.art === "preset") {
      setCharakterKey(null); setPresetKey(e.key);
      setRules({ ...sanitizeRules(e.rules), name: e.label });
    } else {
      // Ein Baustein ERSETZT seinen Aspekt und lässt alles andere stehen —
      // dieselbe Regel wie beim Teil-Code (`wendeTeilCodeAn`). Preset- und
      // Charakter-Name fallen dabei weg: was jetzt gilt, ist keins von
      // beiden mehr.
      setCharakterKey(null); setPresetKey(null);
      setRules((r) => sanitizeRules({ ...r, ...(e.werte ?? {}) }));
    }
  };

  const patch = (p) => { touched(); setRules((r) => ({ ...r, ...p })); };
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
        // Ein Teil-Code ist ein AUFSATZ: die Reihe wächst, die Grundlage bleibt.
        const teil = zerlegeTeilCode(val);
        if (teil?.aspekt) merkeCode(teil.aspekt, val);
        setImp("");
      } catch {
        setImpErr("Kein gültiger Teil-Code.");
      }
      return;
    }
    if (istCreatorCode(val)) {
      try {
        setPresetKey(null);
        setRules(sanitizeRules(decodePreset(val)));
        // Wie eine Vorlage: neue Grundlage, die Schichten darüber verfallen.
        setBasisName("geladener GameCode");
        setSchichten([]);
        setHandAngepasst(false);
        // 🔴 Andis Regel (21.08.2026): ein GESAMT-Code setzt alle Teilebenen neu
        // und überschreibt damit auch jede vorherige Teil-Anpassung. Bliebe die
        // Merkliste stehen, behauptete die Oberfläche weiter „zuletzt geladen:
        // …", obwohl davon nichts mehr gilt.
        setGeladeneCodes({});
        setImp("");
      }
      catch { setImpErr("Kein gültiger Creator-Code."); }
      return;
    }
    try {
      const preset = await getStore().getPresetByCode(val);
      if (!preset) { setImpErr("Kein Regelwerk unter diesem Code gefunden."); return; }
      setPresetKey(null);
      setBasisName(preset.name || "geladener Kurzcode");
      setSchichten([]);
      setHandAngepasst(false);
      setRules({ ...sanitizeRules(preset.rules), name: preset.name || sanitizeRules(preset.rules).name });
      // Derselbe Fall wie beim langen Code — siehe dort.
      setGeladeneCodes({});
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
      const { min, max } = spieleProSpieltag(selectedTeams.length, gesamt, sp.teamModus);
      proSpieltag = Math.round((min + max) / 2);
    } else {
      proSpieltag = Math.floor(gesamt / 2);
    }
    const von = sp.spieltagVon ?? 1;
    const bis = sp.spieltagBis ?? 34;
    const spieltage = Math.max(1, bis - von + 1);
    return { spieleJeSpieltag: Array(spieltage).fill(proSpieltag) };
    // ⚠️ `sp.teamModus` MUSS in der Liste stehen. Ohne ihn blieb der Aufwand
    // beim Umschalten auf „nur untereinander" stehen — im Browser gemessen:
    // 2 Spiele je Spieltag vorher wie nachher, obwohl die Auswahl von „jedes
    // Spiel der beiden" auf „nur das Duell" wechselte.
  }, [teamFilterOn, selectedTeams, teamGruppen, sp.teamModus, sp.spieltagVon, sp.spieltagBis]);

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
  const j = rules.joker;
  // Welche Voreinstellung passt zur aktuellen Stärke/Schwelle (für die Auswahl)?

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
        <div style={{ flexShrink: 0 }}>
          <BackLink href="/menu" label="Menü" />
        </div>
        {/* 🔴 ST5 (Andis Folie 1, gebaut am 23.08.2026): Bibliothek · Gamemode ·
            GameCode in der Kopfzeile.

            Sie zeigen den STAND und springen zu ihrem Abschnitt — deshalb
            gehören sie hierher und nicht in den Fließtext: alle drei sind
            Fragen, die man MITTENDRIN stellt („welche Vorlage war das noch?",
            „spiele ich gerade Budget?", „habe ich schon einen Code?"), und die
            Antwort stand bisher nur ganz oben oder ganz unten.

            ⚠️ Die Werte sind ABGELESEN, nicht gemerkt: ein eigener Zustand
            neben `presetKey`/`rules`/`shortCode` wäre die zweite Wahrheit, vor
            der die Runden-Schicht in CLAUDE.md warnt. */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6, minWidth: 0,
          // Bei drei Chips auf 375 px darf die ZEILE scrollen, nie die Seite.
          overflowX: "auto", justifyContent: "flex-end", flex: 1,
        }}>
          {/* ⚠️ `name` steht MIT dabei, nicht nur im `title` (24.08.2026).
              Vorher trug jeder Chip nur sein Sinnbild und seinen Wert — „📚
              Standard" — und das Wort „Bibliothek" stand ausschließlich im
              Tooltip. Auf dem Handy gibt es keinen Tooltip. Wer die Seite zum
              ersten Mal sieht, liest damit drei Sinnbilder ohne Namen und
              findet die Bibliothek nicht, weil sie nirgends so heißt. */}
          <KopfChip icon="📚" name="Bibliothek" titel="Bibliothek — welche Vorlage gerade gilt"
            wert={PRESETS.find((p) => p.key === presetKey)?.label
              ?? CHARAKTERE.find((c) => c.key === charakterKey)?.label ?? "eigenes"}
            onClick={() => setBibliothekOffen(true)} />
          <KopfChip icon="🎮" name="Gamemode" titel="Gamemode — Quotentippen oder Budget"
            wert={rules.joker?.modus === "einsatz" ? "Budget" : "Quoten"}
            onClick={() => springZu("gamemode")} />
          <KopfChip icon="🔑" name="GameCode" titel="GameCode — der kurze Code zum Teilen"
            wert={shortCode ?? "—"}
            onClick={() => springZu("gamecode")} />
        </div>
      </div>
      <div style={{
        width: "100%", maxWidth: 400, position: "relative",
        // `clip` statt `hidden`: beides schneidet den Inhalt an den runden Ecken
        // ab, aber `hidden` macht den Rahmen zum SCROLL-Container — und damit
        // klebt `position: sticky` daran fest, statt am Fenster. Die Ampel
        // weiter unten scrollte deshalb stumm mit, ohne dass etwas kaputt
        // aussah. `clip` erzeugt keinen Scroll-Container und behebt es.
        borderRadius: RUND.schirm, overflow: "clip",
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
              background: C.surface, border: `1px solid ${C.line}`, borderRadius: RUND.pille, padding: "4px 14px",
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

          {/* ⚠️ Hier stand bis zum 22.08.2026 der Hinweis „oben rechts schaltest
              du zwischen Einfach und Profi um" (ST8). Mit dem Wegfall des
              Umschalters (EB1) versprach er etwas, das es nicht mehr gibt —
              die schlimmste Sorte Resttext, weil man ihn erst sucht und dann
              an sich selbst zweifelt. */}

          {/* ── 🔴 GameCode EINSETZEN — ganz oben (ST5, korrigiert am 24.08.2026) ──

              Andis Folie 1 nennt zwei Zeilen, nicht eine:

                  Bibliothek · Gamemode
                  **Du hast einen GameCode?** Hier einsetzen.

              Gebaut war bis heute nur die erste. Für die zweite stand ein
              🔑-Chip in der Kopfzeile, der den EIGENEN Kurzcode ANZEIGT und
              nach unten springt — das Einsetzen eines FREMDEN Codes lag am
              Seitenende, hinter dem ganzen Regelwerk.

              ⚠️ **Das Verb war verlorengegangen.** „Einsetzen" ist der erste
              Handgriff einer Runde, die jemand geteilt bekommen hat: wer einen
              Code hat, will nichts einstellen, sondern ihn loswerden. Steht das
              Feld am Ende, scrollt er an allem vorbei, was er gar nicht braucht
              — und die Voreinstellungen darüber behaupten eine Wahl, die er
              längst getroffen hat.

              Dasselbe `load()` wie unten, kein zweiter Weg: Teil-Code,
              Creator-Code und Kurzcode landen in derselben Prüfung, und ein
              Tippfehler meldet sich hier mit demselben Satz wie dort. */}
          <div id="gamecode-einsetzen" style={{ scrollMarginTop: 64, marginTop: 14 }}>
            <div style={{
              background: C.ink2, border: `1px solid ${C.line}`,
              borderRadius: RUND.karte, padding: "12px 14px",
            }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Du hast einen GameCode?</div>
              <p style={{ fontSize: 12, color: C.muted, margin: "3px 0 10px", lineHeight: 1.4 }}>
                Hier einsetzen — Regelwerk steht sofort, ohne einen einzigen Regler.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={imp} onChange={(e) => { setImp(e.target.value); setImpErr(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && imp.trim()) load(); }}
                  placeholder="Code einsetzen" style={{
                    flex: 1, minWidth: 0, background: C.ink, color: C.text,
                    border: `1px solid ${C.line}`, borderRadius: RUND.karte,
                    padding: "12px 12px", fontSize: 15, fontFamily: MONO, outline: "none",
                    minHeight: 44, boxSizing: "border-box",
                  }} />
                <button onClick={load} disabled={!imp.trim()} style={{
                  cursor: imp.trim() ? "pointer" : "default",
                  background: imp.trim() ? C.akzent : C.surface2,
                  color: imp.trim() ? C.ink : C.muted,
                  border: imp.trim() ? "none" : `1px solid ${C.line}`,
                  borderRadius: RUND.karte, padding: "0 18px", fontSize: 15, fontWeight: 700,
                  ...TAPZIEL,
                }}>Einsetzen</button>
              </div>
              {impErr && <div style={{ fontSize: 12, color: C.coral, marginTop: 6 }}>{impErr}</div>}

              {/* 🔴 „neben dem am anfang soll ein button sein mit bibliothek
                  Kompletteinstellung" (Andi, 24.08.2026). Er steht bewusst in
                  DERSELBEN Karte wie das Code-Feld: beide beantworten dieselbe
                  Frage — „ich will nicht selbst einstellen" —, nur einmal mit
                  einem geschenkten Code und einmal mit einer fertigen Vorlage. */}
              <button onClick={() => setKomplettOffen(true)} style={{
                marginTop: 10, width: "100%", cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 8, justifyContent: "center",
                background: C.surface, color: C.text, border: `1px solid ${C.line}`,
                borderRadius: RUND.karte, fontSize: 15, fontWeight: 700, ...TAPZIEL,
              }}>
                <span style={{ fontSize: 17, lineHeight: 1 }}>📚</span>
                Bibliothek — Kompletteinstellungen
              </button>
            </div>
          </div>

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
          <div id="gamemode" style={{ scrollMarginTop: 64 }}>
            <VariantenWahl rules={rules} onWaehlen={waehleVariante} />
          </div>

          {/* 🔴 Die GESAMTSPIEL-BIBLIOTHEK als Vorauswahl (Andi, 24.08.2026,
              zum dritten Mal). Hier stand `RundenCharaktere`: vier Karten aus
              `CHARAKTERE`, ohne Suche, ohne Filter, ohne Sortierung — und ohne
              die REGELWERKE. Wer mehr wollte, musste wissen, dass es hinter
              dem 📚-Chip ein Fenster gibt.

              ⚠️ Das Code-Feld, das früher eingeklappt IN diesem Block saß,
              steht jetzt oben als eigener Schritt („Du hast einen GameCode?").
              Zweimal dasselbe Feld wäre die schlimmere Antwort: der Screen
              fragte an zwei Stellen nach derselben Sache. */}
          <GesamtspielAuswahl
            gewaehltId={charakterKey ? `charakter:${charakterKey}` : presetKey ? `preset:${presetKey}` : null}
            onWaehlen={uebernimmEintrag}
            onFensterOeffnen={() => setKomplettOffen(true)}
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
          {/* Teil-Code für die Betippungsauswahl — direkt an der Ebene, nicht zentral */}
          <TeilCodeFeld aspekt="spiele" rules={rules} geladen={geladeneCodes["spiele"]}
            onGeladen={merkeCode}
            onChange={(neu) => { touched(); setRules(neu); }} />

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
                        borderRadius: RUND.karte, padding: "10px 12px",
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
                        borderRadius: RUND.karte, background: "transparent", color: C.mint,
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
                                cursor: "pointer", fontSize: 13, fontFamily: "inherit", padding: "6px 12px", borderRadius: RUND.pille,
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
                          borderRadius: RUND.karte, padding: "8px 12px",
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

              {/* ── Einer oder beide? (Andi, 23.08.2026) ──
                  🔴 Steht DIREKT unter der Vereinsliste und nicht in den
                  Sonderregeln: es ist keine Feinheit, sondern die Frage, was
                  die eben getroffene Auswahl überhaupt bedeutet. Wer „Real"
                  und „Barça" antippt, meint je nach Absicht zwei völlig
                  verschiedene Runden — zwei Spiele pro Spieltag oder zwei
                  Spiele pro SAISON. */}
              {teamFilterOn && !teamFilterInvalid && (
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  {TEAM_MODI.map((m) => {
                    const an = (sp.teamModus ?? "einer") === m.key;
                    return (
                      <button key={m.key} title={m.desc}
                        onClick={() => patchSpiele({ teamModus: m.key })}
                        style={{
                          ...TAPZIEL, flex: 1, cursor: "pointer", fontFamily: "inherit",
                          fontSize: 12, fontWeight: an ? 700 : 400, padding: "8px 10px",
                          borderRadius: RUND.karte, textAlign: "left",
                          background: an ? `${C.akzent}22` : C.surface,
                          color: an ? C.akzent : C.muted,
                          border: `1px solid ${an ? C.akzent + "66" : C.line}`,
                        }}>{m.label}</button>
                    );
                  })}
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
                const { min, max } = spieleProSpieltag(selectedTeams.length, gesamt, sp.teamModus);
                const duenn = max < 3;
                // 🔴 „Nur untereinander" braucht einen ANDEREN Satz, nicht nur
                // andere Zahlen: dort ist die Aussage nicht „wenige Spiele je
                // Spieltag", sondern „an den meisten Spieltagen gar keins".
                // Derselbe Satz mit „0 bis 1" darunter hätte das verharmlost.
                if ((sp.teamModus ?? "einer") === "beide") {
                  return (
                    <div style={{ fontSize: 11, color: C.akzent, marginTop: 4, lineHeight: 1.45 }}>
                      Höchstens {max} Spiel{max === 1 ? "" : "e"} pro Spieltag — und an den
                      meisten Spieltagen <strong>keins</strong>. In einer Hin- und Rückrunde
                      treffen sich zwei Vereine genau zweimal. Für eine Runde, die jede Woche
                      läuft, ist das zu wenig; als Ergänzung über die feste Begegnungs-Liste
                      passt es.
                    </div>
                  );
                }
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
          <div id="bibliothek" style={{ scrollMarginTop: 64 }} />
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
                  borderRadius: RUND.karte, padding: "12px 14px", color: C.text,
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
                        borderRadius: RUND.pille, padding: "2px 8px", textTransform: "uppercase", letterSpacing: 1,
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
              borderRadius: RUND.karte, padding: "10px 12px", fontSize: 13,
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
                border: `1px solid ${C.line}`, borderRadius: RUND.karte, padding: "10px 12px",
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
            <ProfiWarnungen rules={rules} onChange={(neu) => { touched(); setRules(neu); }} />
          </div>

          {/* Schärfe */}
          {/* Stufe 2: vier grosse Fragen statt der Rohregler darunter */}
          <SectionTitle>Die vier wichtigsten Fragen</SectionTitle>
          <EinfacheRegler rules={rules} onChange={(neu) => { touched(); setRules(neu); }} />

          {/* Mitbestimmung: Regel-Abstimmung + Verfassung
              (design/abstimmung-verfassung.md). Nur in der Profi-Stufe — bei
              „anpassen" beantwortet die Klartext-Frage „Wer darf die Regeln
              ändern?" dasselbe in drei Bündeln, und bei „einfach" entscheidet
              der Charakter. Wer Quorum, Fristen und eine Verfassung je Bereich
              einzeln stellen will, ist genau hier richtig. */}
          <SectionTitle>Mitbestimmung</SectionTitle>
          <Mitbestimmung rules={rules}
            onChange={(p) => { touched(); setRules((r) => ({ ...r, ...p })); }} />

          {/* Alleingang-Bonus (Andis Stadt-Land-Fluss-Mechanik, 09.08.2026).
              In Stufe 2 beantwortet die Klartext-Frage „Lohnt sich ein
              Alleingang?" dasselbe in vier Bündeln; hier stehen alle
              Variablen einzeln, mit Regler UND Zahlenfeld. */}
          <SectionTitle>Alleingang-Bonus</SectionTitle>
          <Alleinstellung rules={rules}
            onChange={(p) => { touched(); setRules((r) => ({ ...r, ...p })); }} />


          {/* 🔴 WERTUNG — eine Zeile für das, was aus Quote und Tipp Punkte
              macht (drittes Sondermenü, Andi EB2/EB4).

              Zusammengelegt sind hier sieben Abschnitte, die über 230 Zeilen
              verteilt lagen: Regler-Feinheit, Nähe, Underdog/Favorit, Kombi,
              Anzeige & Cutoffs, Sieger-Boden & Strafe, Märkte und der
              Tipp-Einfluss. Die Karten folgen der REIHENFOLGE DER RECHNUNG —
              erst wie streng gemessen wird, zuletzt welche Zahl der Spieler
              sieht.

              ⚠️ Die Sichtbarkeit bleibt unverändert: alle sieben Abschnitte
              standen schon vorher AUSSCHLIESSLICH in der Profi-Ansicht — auch
              „Anzeige & Cutoffs", was auf den ersten Blick anders aussah, weil
              es außerhalb der INNEREN Profi-Bedingung stand (im Browser
              gegengeprüft: in der einfachen Ansicht war es nie zu sehen).
              Deshalb trägt das Sondermenü selbst KEINE Stufen-Abfrage — über
              die Sichtbarkeit entscheidet allein, wo diese Zeile steht. Der
              Umbau ordnet um, er nimmt nichts weg. */}
          <SectionTitle>Wertung</SectionTitle>
          <GrosseZeile
            icon="🎯" titel="Wertung" unter="Nähe · Underdog · Tore · Anzeige"
            wert={wertungStand(rules)}
            offen={wertungOffen} onClick={() => setWertungOffen((o) => !o)}
          >
            <WertungSondermenue rules={rules} empfohleneSkala={empfohleneSkala}
              onChange={(teil) => { touched(); setRules((r) => ({ ...r, ...teil })); }} />
          </GrosseZeile>

          {/* 🔴 JOKERCODE (Andis TC3, 23.08.2026). Bis dahin gab es EIN Feld für
              Joker, Ereignisse und Modifikatoren zusammen — „ein Code nur für
              Joker" war damit gar nicht teilbar. Seit dem Aufteilen der Aspekte
              steht hier das Feld, das genau zu der Zeile darunter gehört
              (ATE1: ein eigenes Code-Feld vor jeder Bibliothek). */}
          <TeilCodeFeld aspekt="joker" rules={rules} geladen={geladeneCodes["joker"]}
            onGeladen={merkeCode}
            onChange={(neu) => { touched(); setRules(neu); }} />

          {/* 🔴 JOKER — eine Zeile, dahinter das Sondermenü mit fünf Karten
              (design/joker-sondermenue.md · Andi 22.08.2026: „Verfeinerung für
              jede Einstellung unter einem eigenen Sondereinstellungsmenü, wie
              bei den Mannschaften").

              Vorher lagen die 84 Joker-Einstellwerte an SIEBEN Stellen dieses
              Screens — Ökonomie, Limitierungsklassen, Grundform, „Joker &
              Gewichtung", „Joker verdienen", Duell, Drehrad — über 700 Zeilen
              auseinander. Das eigentliche Problem war nicht die Länge, sondern
              dass die Frage „wann kommt eigentlich ein Joker?" an DREI davon
              beantwortet wurde. Die Karten im Sondermenü ordnen nach der Frage,
              die ein Admin stellt, nicht nach dem Regel-Block.

              ⚠️ Reihenfolge des Umbaus (Andi, EB4): erst die Sondermenüs, DANN
              der Anzeige-Umschalter. Beides ist am 22.08.2026 geschehen — die
              Zeile stand zwischenzeitlich in einer Profi-Bedingung, die es
              inzwischen nicht mehr gibt. */}
          <SectionTitle>Joker</SectionTitle>
          <GrosseZeile
            icon="🃏" titel="Joker" unter="Arten · Stärke · Herkunft · Fristen · Grenzen"
            wert={jokerZeileStand(rules)}
            offen={jokerOffen} onClick={() => setJokerOffen((o) => !o)}
          >
            <JokerSondermenue rules={rules} premium={premium}
              spieleJeSpieltag={aufwandKontext.spieleJeSpieltag}
              geladeneCodes={geladeneCodes} onGeladen={merkeCode}
              onTeilCode={(neu) => { touched(); setRules(neu); }}
              onChange={(teil) => { touched(); setRules((r) => ({ ...r, ...teil })); }} />
          </GrosseZeile>

          {/* 🔴 MODIFIKATOREN — eine Zeile für das, was für ALLE gilt
              (zweites Sondermenü nach dem Joker, Andi EB2/EB4).

              Zusammengefasst ist hier kein Sammelsurium ähnlicher Regler,
              sondern EIN Rechenweg: Derby, einzelne Vereine, Big Game und der
              Tabellen-Bonus zahlen in DENSELBEN additiven Topf und teilen sich
              DENSELBEN Deckel. Vorher standen sie an drei Stellen des Screens —
              man verstellte einen und verschob die anderen mit, ohne es zu
              sehen. Der Deckel steht deshalb am Ende der Zeile, nicht bei
              einem der vier.

              ⚠️ Der Alleingang-Bonus bleibt bewusst DRAUSSEN: er ist ein
              Punkte-Kanal (Ebene 3) mit eigenem Deckel, kein Modifikator. */}
          <SectionTitle>Modifikatoren</SectionTitle>
          {/* Eigenes Code-Feld je Bibliothek (ATE1). Seit der Aufteilung trägt
              dieser Aspekt nur noch, was sich EINEN additiven Topf teilt —
              Derby, Big Game, Wettbewerbs-Gewichte, Tabellen-Bonus. */}
          <TeilCodeFeld aspekt="modifikatoren" rules={rules} geladen={geladeneCodes["modifikatoren"]}
            onGeladen={merkeCode}
            onChange={(neu) => { touched(); setRules(neu); }} />
          <GrosseZeile
            icon="⚖️" titel="Modifikatoren" unter="Derby · Vereine · Big Game · Außenseiter"
            wert={modifikatorenStand(rules)}
            offen={modsOffen} onClick={() => setModsOffen((o) => !o)}
          >
            <ModifikatorenSondermenue rules={rules} premium={premium}
              onChange={(teil) => { touched(); setRules((r) => ({ ...r, ...teil })); }} />
          </GrosseZeile>

          {/* 🔴 VERLAUF — eine Zeile für alles, was über die SAISON greift
              (viertes Sondermenü, Andi EB2/EB4).

              Anschluss-Bonus, Streicher und Ersatz-Tipp greifen NICHT in die
              Wertung eines Spiels ein, sondern in den Stand (Ebene 4). Sie
              standen an drei Stellen — und ausgerechnet ihre Wechselwirkung
              sah man dadurch nie: Streicher ohne „nur getippte" hebeln die
              Versäumnis-Regel aus. Das Sondermenü meldet genau diesen Fall
              jetzt, weil beide Schalter beieinander liegen.

              ⚠️ Das Versäumnis stand bisher 180 Zeilen weiter unten zwischen
              Tipp-Fenster und Zeitachse — dort ging es um die AUSWAHL, nicht
              um den Verlauf. Der Rest jenes Blocks bleibt unangetastet. */}
          <SectionTitle>Verlauf</SectionTitle>
          <GrosseZeile
            icon="📈" titel="Verlauf über die Saison" unter="Anschluss · Streicher · Vergessen"
            wert={verlaufStand(rules)}
            offen={verlaufOffen} onClick={() => setVerlaufOffen((o) => !o)}
          >
            <VerlaufSondermenue rules={rules}
              onChange={(teil) => { touched(); setRules((r) => ({ ...r, ...teil })); }} />
          </GrosseZeile>

          {/* 🔴 SAISON & ZEIT — die fünfte und letzte Zeile (Andi, 22.08.2026:
              „eigene zeile").

              Zusammengefasst sind Saison-Wetten, Tipp-Fenster, Zeitachse und
              Zeitraum. Was sie verbindet, ist nicht das Thema, sondern die
              ACHSE: alle vier beantworten WANN etwas gilt, nicht wie viel es
              zählt. Vorher lagen sie an drei Stellen, der Zeitraum sogar
              hinter dem Versäumnis.

              ⚠️ Der Zeitraum ist streng genommen Betippungsauswahl
              (`rules.spiele`) — er steht hier, weil ein Admin ihn dort sucht,
              wo er auch das Tipp-Fenster einstellt. Im Sondermenü steht die
              Begründung. */}
          <SectionTitle>Saison &amp; Zeit</SectionTitle>
          <GrosseZeile
            icon="📅" titel="Saison &amp; Zeit" unter="Saison-Wetten · Tippbar ab · Zeitachse · Zeitraum"
            wert={saisonZeitStand(rules)}
            offen={saisonOffen} onClick={() => setSaisonOffen((o) => !o)}
          >
            <SaisonZeitSondermenue rules={rules} teams={ALL_TEAMS}
              onChange={(teil) => { touched(); setRules((r) => ({ ...r, ...teil })); }} />
          </GrosseZeile>

          {/* Wettbewerbs-Gewichte — gehört zu den Modifikatoren, steht aber
              hier unten, weil es nur Runden mit mehreren Wettbewerben betrifft. */}
          <SectionTitle>Wettbewerbe gewichten</SectionTitle>
          <WettbewerbGewichte rules={rules}
            onChange={(wettbewerbe) => { touched(); setRules((r) => ({ ...r, wettbewerbe })); }} />


          {/* Runde erstellen */}

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
                ...TAPZIEL, border: "none", borderRadius: RUND.karte, padding: "13px 0",
                opacity: creating || !user || teamFilterInvalid || leereAuswahl ? 0.6 : 1,
              }}>
                {creating ? "wird angelegt …" : "Runde jetzt erstellen"}
              </button>
              {createErr && <div style={{ fontSize: 12, color: C.coral, marginTop: 6 }}>{createErr}</div>}
            </>
          ) : (
            <div style={{ background: `${C.mint}12`, border: `1px solid ${C.mint}44`, borderRadius: RUND.karte, padding: "14px 16px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.mint }}>✓ „{created.name}“ ist angelegt — deine aktive Runde</div>
              <div style={{ marginTop: 10, fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>Beitritts-Code</div>
              <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: C.akzent, marginTop: 4, letterSpacing: 3 }}>{created.join_code}</div>
              <button onClick={copyJoinCode} style={{
                marginTop: 10, width: "100%", cursor: "pointer",
                background: codeCopied ? C.mint : C.surface2, color: codeCopied ? C.ink : C.text, fontWeight: 700, fontSize: 13,
                border: `1px solid ${C.line}`, borderRadius: RUND.karte, padding: "10px 0",
              }}>{codeCopied ? "✓ kopiert" : "Code kopieren"}</button>
              <p style={{ fontSize: 11, color: C.muted, marginTop: 8, lineHeight: 1.4 }}>
                Freunde geben diesen Code unter „Runde beitreten" ein.
              </p>
            </div>
          )}

          {/* Creator-Code */}
          <div id="gamecode" style={{ scrollMarginTop: 64 }} />
          <SectionTitle>Creator-Code</SectionTitle>
          <div style={{
            background: C.surface, border: `1px solid ${C.line}`, borderRadius: RUND.karte,
            padding: "10px 12px", fontFamily: MONO, fontSize: 12, color: C.akzent,
            wordBreak: "break-all", lineHeight: 1.5,
          }}>{code}</div>
          <button onClick={copy} style={{
            marginTop: 10, width: "100%", cursor: "pointer",
            background: copied ? C.mint : C.akzent, color: C.ink, fontWeight: 700, fontSize: 15,
            ...TAPZIEL, border: "none", borderRadius: RUND.karte, padding: "13px 0", transition: "background .2s",
          }}>{copied ? "✓ kopiert" : "Langen Code kopieren & teilen"}</button>

          {/* Kurzcode (Content-Creator) */}
          <div style={{ marginTop: 14, background: C.ink2, border: `1px solid ${C.line}`, borderRadius: RUND.karte, padding: "12px 14px" }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Kurzcode statt langem Code</div>
            <p style={{ fontSize: 11, color: C.muted, margin: "4px 0 10px", lineHeight: 1.4 }}>
              Speichert dein Regelwerk unter einem kurzen, merkbaren Code — perfekt zum
              Teilen (z. B. von Content-Creatorn). Andere laden ihn unten einfach ein.
            </p>
            {!shortCode ? (
              <button onClick={publish} disabled={publishing || !user} style={{
                width: "100%", cursor: publishing || !user ? "default" : "pointer",
                background: C.surface2, color: user ? C.text : C.muted, fontWeight: 700, fontSize: 13,
                border: `1px solid ${C.line}`, borderRadius: RUND.karte, padding: "11px 0", minHeight: 44,
                opacity: publishing || !user ? 0.6 : 1,
              }}>{publishing ? "wird erstellt …" : user ? "Kurzcode erstellen & teilen" : "Zum Erstellen einloggen"}</button>
            ) : (
              <div>
                <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: C.akzent, letterSpacing: 3, textAlign: "center" }}>{shortCode}</div>
                <button onClick={copyShort} style={{
                  marginTop: 8, width: "100%", cursor: "pointer",
                  background: shortCopied ? C.mint : C.surface2, color: shortCopied ? C.ink : C.text, fontWeight: 700, fontSize: 13,
                  border: `1px solid ${C.line}`, borderRadius: RUND.karte, padding: "10px 0",
                }}>{shortCopied ? "✓ kopiert" : "Kurzcode kopieren"}</button>
              </div>
            )}
          </div>

          {/* Bausteine: einzelne Aspekte (Drehrad, Joker-Ökonomie, …) als
              eigener Teil-Code — nur ab „anpassen", weil in „einfach"
              Charakter und Preset die Entscheidung treffen. */}
          {/* 🔴 Andis Reihe (SA7): woraus diese Runde entstanden ist, von unten
              nach oben. Steht VOR den Bausteinen, weil sie erklärt, was die
              Codes darunter überhaupt bewirkt haben. */}
          <Schichtung basis={basisName} schichten={schichten} handAngepasst={handAngepasst} />

          <SectionTitle>Bausteine</SectionTitle>
          <Bausteine rules={rules} />

          {/* Import: langer ODER kurzer Code */}
          <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
            <input value={imp} onChange={(e) => { setImp(e.target.value); setImpErr(""); }}
              placeholder="Code laden (Creator-Code, Kurzcode oder Teil-Code)" style={{
                flex: 1, minWidth: 0, background: C.ink2, color: C.text, border: `1px solid ${C.line}`,
                borderRadius: RUND.karte, padding: "10px 12px", fontSize: 13, fontFamily: MONO, outline: "none",
              }} />
            <button onClick={load} disabled={!imp.trim()} style={{
              cursor: imp.trim() ? "pointer" : "default", background: C.surface2,
              color: imp.trim() ? C.text : C.muted, border: `1px solid ${C.line}`,
              borderRadius: RUND.karte, padding: "0 16px", fontSize: 13, fontWeight: 600, minHeight: 44,
            }}>Laden</button>
          </div>
          {impErr && <div style={{ fontSize: 12, color: C.coral, marginTop: 6 }}>{impErr}</div>}
        </div>
      </div>
      {/* ── Kompletteinstellungen: Andis eigenes Fenster (24.08.2026) ──
          Getrennt vom großen Bibliotheks-Fenster darunter, weil es eine andere
          Frage beantwortet: hier ganze Spiele, dort auch die Bausteine. */}
      <GesamtspielFenster
        offen={komplettOffen}
        onSchliessen={() => setKomplettOffen(false)}
        gewaehltId={charakterKey ? `charakter:${charakterKey}` : presetKey ? `preset:${presetKey}` : null}
        onWaehlen={uebernimmEintrag}
      />

      {/* ── Die Bibliothek (Andis PP1) ──
          Steht ganz unten im Baum und ist trotzdem oben zu sehen: als
          `position: fixed` hängt sie am Fenster, nicht an dieser Stelle. Sie
          hier zu haben heißt, dass jeder Chip und jede Zeile sie öffnen kann,
          ohne dass der halbe Screen sie durchreichen muss. */}
      <Bibliothek
        offen={bibliothekOffen}
        onSchliessen={() => setBibliothekOffen(false)}
        aktivId={charakterKey ? `charakter:${charakterKey}` : presetKey ? `preset:${presetKey}` : null}
        onUebernehmen={uebernimmEintrag}
      />

    </div>
  );
}


// ── Ein Chip der Kopfzeile (ST5) ────────────────────────────
// Zeigt einen Stand und springt zu seinem Abschnitt. Bewusst schmal: auf
// 375 px stehen drei davon neben „Menü“, und der Wert ist die Information —
// die Beschriftung steckt im Symbol und im `title`.
function KopfChip({ icon, name, wert, titel, onClick }) {
  return (
    <button onClick={onClick} title={titel} style={{
      display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
      minHeight: 44, boxSizing: "border-box", cursor: "pointer",
      fontFamily: "inherit", fontSize: 12, padding: "4px 10px",
      background: C.surface, color: C.text,
      border: `1px solid ${C.line}`, borderRadius: RUND.pille,
    }}>
      <span style={{ fontSize: 13, lineHeight: 1 }}>{icon}</span>
      {/* Der NAME trägt die Farbe des Textes, der WERT die gedämpfte — sonst
          liest sich „Bibliothek Standard" wie zwei gleichrangige Wörter. */}
      {name && <span style={{ fontSize: 12, fontWeight: 600 }}>{name}</span>}
      <span style={{
        fontFamily: MONO, fontSize: 11, color: C.muted,
        maxWidth: 88, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>{wert}</span>
    </button>
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
