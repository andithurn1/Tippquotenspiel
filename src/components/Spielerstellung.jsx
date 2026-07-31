"use client";

import { useState, useMemo, useEffect } from "react";
import {
  DEFAULT_RULES, RULE_LIMITS,
  encodePreset, decodePreset, sanitizeRules,
} from "@/lib/engine";
import { PRESETS } from "@/lib/presets";
import { recommendedDisplayScale } from "@/lib/rulePreview";
import { isPremium } from "@/lib/premium";
import { STAERKE_STUFEN, BETRIFFT } from "@/lib/catchup";
import { KURVEN, KURVE, SAISONFORM_LIMITS, beschreibeSaisonform } from "@/lib/saisonform";
import { TIPPEINFLUSS_LIMITS, beschreibeTippEinfluss } from "@/lib/tippEinfluss";
import { VERSAEUMNIS_STRATEGIEN, VERSAEUMNIS_LABEL, VERSAEUMNIS_HINT } from "@/lib/autoTip";
import { alleVereine, vereineVon, LIGEN } from "@/lib/ligen";
import { wettbewerbLabel } from "@/lib/wettbewerbe";
import { beschreibeVerteilung } from "@/lib/jokerPlan";
import { getStore } from "@/lib/store";
import { useAuth } from "@/components/AuthProvider";
import { useCurrentRound } from "@/components/RoundProvider";
import BackLink from "@/components/BackLink";
import RegelVorschau from "@/components/RegelVorschau";
import PresetRating from "@/components/PresetRating";
import PresetMischen from "@/components/PresetMischen";
import SaisonWetten from "@/components/SaisonWetten";
import Ereignisse from "@/components/Ereignisse";
import WettbewerbGewichte from "@/components/WettbewerbGewichte";
import RundenCharaktere from "@/components/RundenCharaktere";
import EinfacheRegler from "@/components/EinfacheRegler";
import { CHARAKTERE } from "@/lib/charaktere";
import BalanceAmpel from "@/components/BalanceAmpel";
import ProfiWarnungen from "@/components/ProfiWarnungen";
import JokerVerteilung from "@/components/JokerVerteilung";
import { band } from "@/lib/reglerWarnung";
import { BIGGAME_LIMITS } from "@/lib/bigGame";
import { AUSWAHL_LIMITS, sanitizeSpiele, beschreibeAuswahl, spieleProSpieltag } from "@/lib/spielauswahl";
import { VORLAUF_STUFEN, beschreibeTippfenster } from "@/lib/tippfenster";
import SpielauswahlWettbewerbe from "@/components/SpielauswahlWettbewerbe";
import SpielauswahlListe from "@/components/SpielauswahlListe";
import Zeitachse from "@/components/Zeitachse";
import { C, MONO } from "@/lib/theme";

// Alle Klubs ALLER Wettbewerbe — sonst ließe sich keine Runde bauen, die
// Bundesliga und Premier League mischt.
const ALL_TEAMS = alleVereine();

// Ranking-Pool aus zwei verständlichen Reglern erzeugen: höchstes Gewicht und
// Anzahl der Stufen. Dazwischen gleichmäßig bis 1 herunter — so ist der Pool
// immer gültig (absteigend, ohne Dubletten), ohne dass der Admin einzelne
// Faktoren von Hand pflegen muss.
function buildWeightPool(max, anzahl) {
  const arr = [];
  for (let i = 0; i < anzahl; i++) {
    arr.push(+(max - ((max - 1) * i) / (anzahl - 1)).toFixed(1));
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
  // Komplexitaets-Stufe: dieselbe Runde, nur unterschiedlich viel sichtbar.
  // „einfach" = ein Klick auf einen Charakter · „anpassen" = wenige grosse
  // Regler · „profi" = alles. Beim Wechsel geht NICHTS verloren, weil alle
  // Stufen auf demselben `rules`-Objekt arbeiten.
  const [stufe, setStufe] = useState("einfach");
  const [charakterKey, setCharakterKey] = useState(null);
  const [mischenOffen, setMischenOffen] = useState(false);
  // Die Spielauswahl ist KEIN lokaler Zustand mehr, sondern Teil des
  // Regelwerks — nur so reist sie im Creator-Code mit.
  const [eigeneVereine, setEigeneVereine] = useState(false);
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
  const patchTeamMods = (p) => { touched(); setRules((r) => ({ ...r, teamMods: { ...r.teamMods, ...p } })); };
  const patchAufholen = (p) => { touched(); setRules((r) => ({ ...r, aufholen: { ...r.aufholen, ...p } })); };
  const patchSaisonform = (p) => { touched(); setRules((r) => ({ ...r, saisonform: { ...(r.saisonform || DEFAULT_RULES.saisonform), ...p } })); };
  const patchTippEinfluss = (p) => { touched(); setRules((r) => ({ ...r, tippEinfluss: { ...(r.tippEinfluss || DEFAULT_RULES.tippEinfluss), ...p } })); };
  const patchVersaeumnis = (p) => { touched(); setRules((r) => ({ ...r, versaeumnis: { ...r.versaeumnis, ...p } })); };
  const patchBigGame = (p) => { touched(); setRules((r) => ({ ...r, bigGame: { ...r.bigGame, ...p } })); };
  const setSaison = (saison) => { touched(); setRules((r) => ({ ...r, saison })); };
  // Faktor eines Vereins eine Stufe weiterdrehen; über dem Maximum zurück auf
  // „aus" (1 = kein Modifikator, fliegt aus der Liste, damit das Regelwerk
  // klein bleibt). Der nächste Wert wird IM Updater aus dem vorherigen Stand
  // berechnet — sonst lesen mehrere schnelle Klicks denselben alten Wert.
  const cycleTeamFaktor = (team) => {
    touched();
    setRules((r) => {
      const teams = { ...(r.teamMods?.teams || {}) };
      const jetzt = teams[team] ?? 1;
      const naechster = jetzt >= RULE_LIMITS.teamMods.teamFaktor.max ? 1 : +(jetzt + 0.1).toFixed(1);
      if (naechster > 1) teams[team] = naechster; else delete teams[team];
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

  // Lädt entweder einen langen Text-Creator-Code (TS1-…) oder einen kurzen
  // Content-Creator-Code (server-gespeichertes Preset).
  const load = async () => {
    const val = imp.trim();
    setImpErr("");
    if (val.startsWith("TS1-")) {
      try { setPresetKey(null); setRules(sanitizeRules(decodePreset(val))); setImp(""); }
      catch { setImpErr("Kein gültiger Creator-Code (TS1-…)"); }
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
      ? `Gewichte bis ×${Math.max(...(j.faktoren || [1])).toFixed(1)}`
      : `jeder ×${(j.faktor ?? 1.5).toFixed(1)}`);

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

  const createRound = async () => {
    if (!user) { setCreateErr("Bitte zuerst einloggen (Startseite)."); return; }
    if (teamFilterInvalid) { setCreateErr("Bitte mindestens 2 Teams auswählen (oder Team-Auswahl ausschalten)."); return; }
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
  // Welche Voreinstellung passt zur aktuellen Stärke/Schwelle (für die Auswahl)?
  const auStufe = STAERKE_STUFEN.find((s) => s.staerke === au.staerke && s.schwelle === au.schwelle)?.key ?? "custom";

  return (
    <div style={{
      minHeight: "100vh", background: C.ink, color: C.text,
      fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
      padding: "28px 16px", display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <BackLink href="/menu" label="Menü" />
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
          background: `radial-gradient(circle, ${C.mint}22 0%, transparent 70%)`,
        }} />

        <div style={{ position: "relative", padding: "26px 22px 24px" }}>
          {/* Kopf */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: 2, color: C.muted, textTransform: "uppercase" }}>
              Spiel erstellen
            </span>
            <button onClick={() => { setRules(DEFAULT_RULES); setPresetKey("standard"); }} style={{
              fontFamily: MONO, fontSize: 11, color: C.muted, cursor: "pointer",
              background: C.surface, border: `1px solid ${C.line}`, borderRadius: 999, padding: "4px 10px",
            }}>zurücksetzen</button>
          </div>
          <div style={{ marginTop: 6, fontSize: 18, fontWeight: 700 }}>
            {stufe === "einfach" ? "Wie soll eure Runde sein?" : "Regelwerk einstellen"}
          </div>
          <p style={{ fontSize: 12.5, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
            {stufe === "einfach"
              ? "Ein Klick genügt — den Rest stellen wir stimmig ein. Wer mag, geht danach ins Detail."
              : "Du als Admin legst fest, wie mutig belohnt wird. Teile das fertige Regelwerk per Creator-Code — alle Mitspieler bekommen exakt dieselben Regeln."}
          </p>

          {/* Stufen-Umschalter: dieselbe Runde, nur mehr oder weniger sichtbar */}
          <div style={{ display: "flex", gap: 6, marginTop: 14, marginBottom: 4 }}>
            {[
              ["einfach", "Einfach", "Ein Klick"],
              ["anpassen", "Anpassen", "Wenige Regler"],
              ["profi", "Profi", "Alles"],
            ].map(([key, label, unter]) => {
              const an = stufe === key;
              return (
                <button key={key} onClick={() => setStufe(key)} style={{
                  flex: 1, cursor: "pointer", fontFamily: "inherit", padding: "8px 4px",
                  borderRadius: 11, textAlign: "center",
                  background: an ? C.gold : C.surface, color: an ? C.ink : C.muted,
                  border: `1px solid ${an ? C.gold : C.line}`,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{label}</div>
                  <div style={{ fontSize: 9.5, opacity: 0.75, marginTop: 1 }}>{unter}</div>
                </button>
              );
            })}
          </div>
          <p style={{ fontSize: 11, color: C.muted, marginTop: 2, marginBottom: 14, lineHeight: 1.4 }}>
            Die Stufe ändert nur die ANSICHT — deine Einstellungen bleiben beim Wechsel erhalten.
          </p>

          {/* ── Stufe 1: ganze Runden-Ideen statt Einzelregler ── */}
          {stufe === "einfach" && (
            <RundenCharaktere
              gewaehlt={charakterKey}
              onWaehlen={(ch) => { setCharakterKey(ch.key); setPresetKey(null); setShortCode(null); setRules(ch.rules); }}
              onCodeLaden={(c) => { setImp(c); load(); }}
              codeFehler={impErr}
            />
          )}

          {/* ⚠️ REIHENFOLGE: erst die Wettbewerbe, dann die Vereine.
              Vorher stand die Vereins-Auswahl davor und zeigte ALLE Klubs aus
              fünf Ligen in einer einzigen Wolke — über 90 Knöpfe, Bayern neben
              Burnley neben Bologna. Das ist die grobe Entscheidung, also gehört
              sie nach vorn; die Vereinsliste hängt dann davon ab. */}
          <SectionTitle>Wettbewerbe</SectionTitle>
          <SpielauswahlWettbewerbe spiele={sp} onChange={(neu) => { touched(); setRules((r) => ({ ...r, spiele: { ...(r.spiele || DEFAULT_RULES.spiele), ...neu } })); }} />

          {/* Teams — je Wettbewerb gruppiert, und nur aus den gewählten. */}
          <SectionTitle>Teams</SectionTitle>
          <p style={{ fontSize: 11.5, color: C.muted, marginTop: -6, marginBottom: 10, lineHeight: 1.4 }}>
            Standardmäßig zählen alle Spiele der oben gewählten Wettbewerbe. Willst du
            dich auf bestimmte Vereine beschränken (z. B. weniger Aufwand mit
            Torschützen, oder ihr wollt nur eure Lieblingsklubs), wählt hier
            mindestens 2 — ein Spiel zählt, sobald mindestens eine Seite dabei ist.
          </p>
          <Toggle label="Auf bestimmte Teams beschränken" on={teamFilterOn}
            onChange={(on) => patchSpiele(on ? { modus: "teams" } : { modus: "alle", teams: [] })} />
          {teamFilterOn && (
            <div style={{ marginTop: 8, marginBottom: 8 }}>
              {teamGruppen.map((g) => (
                <div key={g.key} style={{ marginBottom: 10 }}>
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "baseline",
                    marginBottom: 5,
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{g.label}</span>
                    {/* Alle einer Liga auf einmal — sonst klickt man 18-mal. */}
                    <button onClick={() => toggleLiga(g.vereine)} style={{
                      cursor: "pointer", fontFamily: "inherit", fontSize: 10.5, padding: "3px 8px",
                      borderRadius: 999, background: "transparent", color: C.mint,
                      border: `1px solid ${C.line}`,
                    }}>{g.vereine.every((v) => selectedTeams.includes(v)) ? "keine" : "alle"}</button>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {g.vereine.map((team) => {
                      const on = selectedTeams.includes(team);
                      return (
                        <button key={team} onClick={() => toggleTeam(team)} style={{
                          cursor: "pointer", fontSize: 12, fontFamily: "inherit", padding: "6px 10px", borderRadius: 999,
                          background: on ? `${C.mint}22` : C.surface, color: on ? C.mint : C.muted,
                          border: `1px solid ${on ? C.mint + "66" : C.line}`,
                        }}>{team}</button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div style={{ fontSize: 11, color: teamFilterInvalid ? C.coral : C.muted, marginTop: 8 }}>
                {selectedTeams.length} von mindestens 2 Teams ausgewählt
                {teamFilterInvalid && " — bitte noch mindestens ein weiteres Team wählen"}.
              </div>

              {/* ⚠️ Gewählte Vereine, die in KEINEM gewählten Wettbewerb mehr
                  vorkommen. Ohne diesen Hinweis filtert die Runde still gegen
                  Vereine, die gar nicht mehr auftauchen. */}
              {verwaisteTeams.length > 0 && (
                <div style={{ fontSize: 11, color: C.gold, marginTop: 4, lineHeight: 1.45 }}>
                  {verwaisteTeams.length} gewählte{verwaisteTeams.length === 1 ? "r Verein spielt" : " Vereine spielen"} in
                  keinem der gewählten Wettbewerbe ({verwaisteTeams.join(", ")}) — {verwaisteTeams.length === 1 ? "er zählt" : "sie zählen"} nicht mit.
                </div>
              )}

              {/* Was die Auswahl konkret bedeutet. Ohne diese Rückmeldung
                  stellt man „nur die Top 2" ein und merkt erst in Woche drei,
                  dass pro Spieltag ein einziges Spiel übrig bleibt. */}
              {!teamFilterInvalid && (() => {
                const gesamt = teamGruppen.reduce((s, g) => s + g.vereine.length, 0) || ALL_TEAMS.length;
                const { min, max } = spieleProSpieltag(selectedTeams.length, gesamt);
                const duenn = max < 3;
                return (
                  <div style={{ fontSize: 11, color: duenn ? C.gold : C.mint, marginTop: 4, lineHeight: 1.45 }}>
                    Bleiben {min === max ? min : `${min} bis ${max}`} Spiele pro Spieltag
                    {duenn && " — das ist wenig; ein einzelner Tipp entscheidet dann fast den ganzen Spieltag"}.
                  </div>
                );
              })()}
            </div>
          )}

          {/* Die feste Liste — der Ausweg aus der UND-Verknüpfung aller
              anderen Dimensionen. Steht bewusst hinter ihnen: erst probiert
              man die Regel, dann zählt man einzeln auf. */}
          <SpielauswahlListe spiele={sp} onChange={patchSpiele} />

          {/* Presets: Startpunkt, danach bleibt alles frei einstellbar */}
          {stufe !== "einfach" && <SectionTitle>Presets</SectionTitle>}
          {stufe !== "einfach" && (<>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 4 }}>
            {PRESETS.map((p) => {
              const active = presetKey === p.key;
              return (
                <button key={p.key} onClick={() => applyPreset(p)} style={{
                  textAlign: "left", cursor: "pointer", fontFamily: "inherit",
                  background: active ? `${C.gold}14` : C.surface,
                  border: `1px solid ${active ? C.gold + "66" : C.line}`,
                  borderRadius: 14, padding: "12px 14px", color: C.text,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>
                      {p.label}
                      {/* Ohne Premium greift der Joker-Anteil nicht — das gehört
                          sichtbar an den Preset, nicht erst in eine Fehlermeldung. */}
                      {p.premium && !premium && (
                        <span style={{ fontSize: 12, color: C.gold, marginLeft: 6 }} title="Premium-Funktion">🔒</span>
                      )}
                    </span>
                    {active && (
                      <span style={{
                        fontFamily: MONO, fontSize: 10, color: C.gold, border: `1px solid ${C.gold}55`,
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
              borderRadius: 12, padding: "10px 12px", fontSize: 12.5,
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

          {/* Name */}
          <Field label="Modus-Name">
            <input value={rules.name} maxLength={40} onChange={(e) => patch({ name: e.target.value })}
              placeholder="z. B. Hardcore-Runde" style={{
                width: "100%", boxSizing: "border-box", background: C.surface, color: C.text,
                border: `1px solid ${C.line}`, borderRadius: 12, padding: "10px 12px",
                fontSize: 14, fontFamily: "inherit", outline: "none",
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
            position: "sticky", top: 0, zIndex: 5,
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
          {stufe === "anpassen" && (
            <>
              <SectionTitle>Die vier wichtigsten Fragen</SectionTitle>
              <EinfacheRegler rules={rules} onChange={(neu) => { touched(); setRules(neu); }} />
            </>
          )}

          {stufe === "profi" && (<>
          <SectionTitle>Schärfe der Nähe-Belohnung</SectionTitle>
          <Slider label="Ergebnis-Nähe (k)" value={rules.k} {...L.k} pfad="k" onChange={(v) => patch({ k: v })}
            hint="Höher = die Belohnung fällt mit jedem Tor Abstand steiler ab (Underdog-Regler)." />
          <Slider label="Team-Tore-Nähe (m)" value={rules.m} {...L.m} pfad="m" onChange={(v) => patch({ m: v })}
            hint="Steilheit der siegerunabhängigen Team-Tore-Nähe." />

          {/* Underdog-Boost & Favoriten-Malus (teilen sich die Quoten-Ramp) */}
          <SectionTitle>Underdog-Boost & Favoriten-Malus</SectionTitle>
          <p style={{ fontSize: 11.5, color: C.muted, marginTop: -6, marginBottom: 10, lineHeight: 1.4 }}>
            Belohne das Vorhersagen von Überraschungen — und/oder bestrafe, wer stur auf den
            Favoriten setzt, wenn der patzt. Beide wirken nur bei echten Außenseiter-Siegen
            und werden über dieselbe Sieger-Quote skaliert.
          </p>
          <Slider label="Underdog-Boost (×)" value={rules.underdogBoost} {...L.underdogBoost} pfad="underdogBoost"
            onChange={(v) => patch({ underdogBoost: v })} fmt={(x) => "×" + x.toFixed(1)}
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
          <Slider label="bei richtiger Tendenz" value={rules.combo.tendenz} {...L.combo.tendenz}
            onChange={(v) => patchCombo({ tendenz: v })} fmt={(x) => "×" + x.toFixed(2)} />
          <Slider label="bei richtigem Abstand" value={rules.combo.abstand} {...L.combo.abstand} pfad="combo.abstand"
            onChange={(v) => patchCombo({ abstand: v })} fmt={(x) => "×" + x.toFixed(2)} />
          <Slider label="bei exaktem Ergebnis" value={rules.combo.exakt} {...L.combo.exakt} pfad="combo.exakt"
            onChange={(v) => patchCombo({ exakt: v })} fmt={(x) => "×" + x.toFixed(1)} />

          {/* Skala & Cutoffs */}
          </>)}

          <SectionTitle>Anzeige & Cutoffs</SectionTitle>
          <Slider label="Punkte-Skalierung" value={rules.displayScale} {...L.displayScale}
            onChange={(v) => patch({ displayScale: v })} fmt={(x) => "×" + x}
            hint="Nur Optik: macht schöne hohe Zahlen. Fairness & Ranking bleiben unberührt." />
          {rules.displayScale !== empfohleneSkala && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
              background: `${C.gold}12`, border: `1px solid ${C.gold}33`, borderRadius: 12,
              padding: "9px 12px", marginBottom: 10,
            }}>
              <span style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.4 }}>
                Empfohlen: <strong style={{ color: C.gold }}>×{empfohleneSkala}</strong> — hält
                exakte Tipps bei angenehmen Werten{j.enabled ? " (Gewichtung eingerechnet)" : ""}.
              </span>
              <button onClick={() => patch({ displayScale: empfohleneSkala })} style={{
                cursor: "pointer", fontSize: 12, fontFamily: "inherit", fontWeight: 700,
                background: C.surface2, color: C.gold, border: `1px solid ${C.gold}44`,
                borderRadius: 10, padding: "7px 12px", whiteSpace: "nowrap",
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
              <div style={{ fontSize: 11.5, color: C.muted, marginTop: 6, marginBottom: 5 }}>
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
                      flex: 1, cursor: "pointer", fontFamily: "inherit", padding: "8px 6px",
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
              <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 6, lineHeight: 1.45 }}>
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
          <p style={{ fontSize: 11.5, color: C.muted, marginTop: -6, marginBottom: 10, lineHeight: 1.4 }}>
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
                    cursor: "pointer", fontSize: 12, fontFamily: "inherit", padding: "7px 11px", borderRadius: 999,
                    background: on ? `${C.gold}22` : C.surface, color: on ? C.gold : C.muted,
                    border: `1px solid ${on ? C.gold + "66" : C.line}`,
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
                fontSize: 11.5, color: C.text, lineHeight: 1.45,
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
          <p style={{ fontSize: 11.5, color: C.muted, marginTop: -6, marginBottom: 10, lineHeight: 1.4 }}>
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
              background: `${C.gold}12`, border: `1px solid ${C.gold}44`,
              borderRadius: 14, padding: "13px 15px", marginBottom: 8,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.gold }}>
                🔒 Premium-Funktion
              </div>
              <p style={{ fontSize: 11.5, color: C.muted, margin: "7px 0 0", lineHeight: 1.5 }}>
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
                  ].map((m) => {
                    const on = j.modus === m.key;
                    return (
                      <button key={m.key} onClick={() => patchJoker({ modus: m.key })} style={{
                        cursor: "pointer", fontSize: 12, fontFamily: "inherit", padding: "8px 12px",
                        borderRadius: 10, flex: 1, textAlign: "left",
                        background: on ? `${C.gold}22` : C.surface, color: on ? C.gold : C.muted,
                        border: `1px solid ${on ? C.gold + "66" : C.line}`,
                      }}>
                        <div style={{ fontWeight: 700 }}>{m.label}</div>
                        <div style={{ fontSize: 10.5, opacity: 0.8, marginTop: 2 }}>{m.hint}</div>
                      </button>
                    );
                  })}
                </div>
              </Field>

              {/* Im Ranking-Modus ist der Pool die Wahrheit — sonst zeigte der
                  Regler einen anderen Wert als die Stufen darunter. */}
              <Slider label={j.modus === "ranking" ? "Höchstes Gewicht" : "Joker-Faktor"}
                value={j.modus === "ranking" ? j.faktoren[0] : j.faktor} {...L.joker.faktor}
                onChange={(v) => patchJoker(j.modus === "ranking"
                  ? { faktor: v, faktoren: buildWeightPool(v, j.faktoren.length) }
                  : { faktor: v })}
                fmt={(x) => "×" + x.toFixed(1)}
                hint={j.modus === "ranking"
                  ? "Das stärkste Gewicht der Rangliste. Die übrigen Stufen liegen gleichmäßig darunter."
                  : "Womit das markierte Spiel multipliziert wird."} />

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
                        fontSize: 12, fontFamily: MONO, padding: "5px 10px", borderRadius: 999,
                        background: f > 1 ? `${C.gold}18` : C.surface,
                        color: f > 1 ? C.gold : C.muted,
                        border: `1px solid ${f > 1 ? C.gold + "44" : C.line}`,
                      }}>×{f.toFixed(1)}</span>
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: C.muted, marginBottom: 8, lineHeight: 1.4 }}>
                    Jedes Gewicht darf pro Spieltag nur <strong>einmal</strong> vergeben werden —
                    alle haben denselben Pool, die Verteilung ist die Kunst. Übrige Spiele zählen ×1,0.
                  </p>
                </>
              )}

              {/* Weitere Joker-TYPEN — keine neue Ebene, sondern Spielarten
                  desselben Jokers: ihre Aufschlaege werden ADDIERT und vom
                  gemeinsamen Deckel begrenzt. */}
              <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 6, paddingTop: 10 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 2 }}>Weitere Joker-Arten</div>
                <p style={{ fontSize: 11, color: C.muted, marginTop: 0, marginBottom: 8, lineHeight: 1.4 }}>
                  Greifen von allein, ohne dass jemand etwas markieren muss. Ihre
                  Aufschläge werden <strong>addiert</strong> und vom Deckel oben begrenzt.
                </p>

                <Toggle label="Heimatbonus — Spiele des eigenen Vereins" on={jh.enabled === true}
                  onChange={(on) => patchJoker({ heimat: { ...jh, enabled: on } })} />
                {jh.enabled && (
                  <Field label={`Faktor: ×${(jh.faktor ?? 1.2).toFixed(1)}`}>
                    <input type="range"
                      min={L.joker.faktor.min} max={L.joker.faktor.max} step={L.joker.faktor.step}
                      value={jh.faktor ?? 1.2}
                      onChange={(e) => patchJoker({ heimat: { ...jh, faktor: Number(e.target.value) } })}
                      style={{ width: "100%", accentColor: C.gold }} />
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
                      min={L.joker.mutFaktor.min} max={L.joker.mutFaktor.max} step={L.joker.mutFaktor.step}
                      value={jm.faktor ?? 1.1}
                      onChange={(e) => patchJoker({ mut: { ...jm, faktor: Number(e.target.value) } })}
                      style={{ width: "100%", accentColor: C.gold }} />
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

          {/* Team- & Derby-Regeln */}
          <SectionTitle>Team- &amp; Derby-Regeln</SectionTitle>
          <p style={{ fontSize: 11.5, color: C.muted, marginTop: -6, marginBottom: 10, lineHeight: 1.4 }}>
            Gilt für <strong>alle</strong> in der Runde (anders als der Joker, den jeder
            selbst setzt). Traditionsduelle oder bestimmte Vereine zählen mehr.
          </p>

          {!premium ? (
            <div style={{
              background: `${C.gold}12`, border: `1px solid ${C.gold}44`,
              borderRadius: 14, padding: "13px 15px", marginBottom: 8,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.gold }}>🔒 Premium-Funktion</div>
              <p style={{ fontSize: 11.5, color: C.muted, margin: "7px 0 0", lineHeight: 1.5 }}>
                Es genügt, wenn <strong>du als Admin</strong> Premium hast.
              </p>
            </div>
          ) : (
            <>
              <Slider label="Derby zählt" value={tm.derbyFaktor} {...L.teamMods.derbyFaktor} pfad="teamMods.derbyFaktor"
                onChange={(v) => patchTeamMods({ derbyFaktor: v })}
                fmt={(x) => x <= 1 ? "aus" : "×" + x.toFixed(1)}
                hint="Traditionsduelle (Revierderby, Klassiker, Nordderby …) zählen mehr. 1,0 = aus." />

              <Toggle label="Einzelne Vereine hervorheben" on={eigeneVereine}
                onChange={(on) => { setEigeneVereine(on); if (!on) patchTeamMods({ teams: {} }); }} />
              {eigeneVereine && (
                <div style={{ paddingLeft: 12, borderLeft: `1px solid ${C.line}`, marginBottom: 8 }}>
                  <p style={{ fontSize: 11, color: C.muted, margin: "2px 0 8px", lineHeight: 1.4 }}>
                    Antippen erhöht den Faktor in 0,1-Schritten bis ×2,0 und springt dann zurück auf „aus".
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {ALL_TEAMS.map((team) => {
                      const f = tmTeams[team] ?? 1;
                      const an = f > 1;
                      return (
                        <button key={team}
                          onClick={() => cycleTeamFaktor(team)}
                          style={{
                            cursor: "pointer", fontSize: 12, fontFamily: "inherit", padding: "6px 10px", borderRadius: 999,
                            background: an ? `${C.gold}22` : C.surface, color: an ? C.gold : C.muted,
                            border: `1px solid ${an ? C.gold + "66" : C.line}`,
                          }}>
                          {team}{an && <strong style={{ marginLeft: 5, fontFamily: MONO }}>×{f.toFixed(1)}</strong>}
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
                      {...BIGGAME_LIMITS.aufschlag}
                      onChange={(v) => patchBigGame({ aufschlag: v })}
                      fmt={(x) => `+${x.toFixed(1)} → ×${(1 + x).toFixed(1)}`}
                      hint="Fließt in denselben Topf wie Derby und Team-Faktoren — addiert, nicht multipliziert." />
                    <Slider label="Mindest-Brisanz" value={bg.minSpannung}
                      {...BIGGAME_LIMITS.minSpannung}
                      onChange={(v) => patchBigGame({ minSpannung: v })}
                      fmt={(x) => x.toFixed(2)}
                      hint="Reißt kein Spiel diese Schwelle, hat der Spieltag kein Big Game — besser als ein aufgeblasenes Mittelfeldduell." />
                  </div>
                )}
              </div>

              {/* Deckel — erscheint erst, wenn es überhaupt etwas zu deckeln gibt */}
              {(tmAktiv || j.enabled || bg.enabled) && (
                <>
                  <Slider label="Deckel für alle Modifikatoren" value={rules.modCap} {...L.modCap} pfad="modCap"
                    onChange={(v) => patch({ modCap: v })} fmt={(x) => "×" + x.toFixed(1)}
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
          <p style={{ fontSize: 11.5, color: C.muted, marginTop: -6, marginBottom: 10, lineHeight: 1.4 }}>
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
                        background: on ? `${C.gold}22` : C.surface, color: on ? C.gold : C.muted,
                        border: `1px solid ${on ? C.gold + "66" : C.line}`,
                      }}>
                        <div style={{ fontWeight: 700 }}>{s.label}</div>
                        <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2, lineHeight: 1.3 }}>{s.hint}</div>
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
                          cursor: "pointer", fontSize: 12, fontFamily: "inherit", padding: "7px 11px", borderRadius: 999,
                          background: on ? `${C.mint}22` : C.surface, color: on ? C.mint : C.muted,
                          border: `1px solid ${on ? C.mint + "66" : C.line}`,
                        }}>{b.label}</button>
                    );
                  })}
                </div>
              </Field>
              <p style={{ fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>
                {Object.values(BETRIFFT).find((b) => b.key === au.betrifft)?.desc}
                {" "}Die Live-Vorschau unten zeigt, ob der Bonus zu stark wird.
              </p>
            </div>
          )}

          {/* Saisonform: Streichresultate + Gewichtung der Spieltage */}
          <SectionTitle>Streicher &amp; Saisonverlauf</SectionTitle>
          <p style={{ fontSize: 11.5, color: C.muted, marginTop: -6, marginBottom: 10, lineHeight: 1.4 }}>
            Wie stark darf ein einzelner Spieltag die Saison bestimmen? Beides greift
            auf die fertigen Spieltagspunkte — die Wertung eines Spiels bleibt unberührt.
          </p>

          <Field label="Streichresultate">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {[0, 1, 2, 3, 5].map((n) => {
                const on = sf.streich === n;
                return (
                  <button key={n} onClick={() => patchSaisonform({ streich: n })} style={{
                    cursor: "pointer", fontSize: 12, fontFamily: "inherit", padding: "7px 11px", borderRadius: 999,
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
                      cursor: "pointer", fontSize: 12, fontFamily: "inherit", padding: "7px 11px", borderRadius: 999,
                      background: on ? `${C.gold}22` : C.surface, color: on ? C.gold : C.muted,
                      border: `1px solid ${on ? C.gold + "66" : C.line}`,
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
              <div style={{ fontSize: 11.5, color: C.coral, fontWeight: 700, marginBottom: 3 }}>
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
              fontSize: 11.5, color: C.text, marginTop: 4, marginBottom: 12, lineHeight: 1.45,
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
          <p style={{ fontSize: 11.5, color: C.muted, marginTop: -6, marginBottom: 10, lineHeight: 1.4 }}>
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
                        background: on ? `${C.gold}22` : C.surface, color: on ? C.gold : C.muted,
                        border: `1px solid ${on ? C.gold + "66" : C.line}`,
                      }}>
                        <div style={{ fontWeight: 700 }}>{VERSAEUMNIS_LABEL[s]}</div>
                        <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2, lineHeight: 1.3 }}>{VERSAEUMNIS_HINT[s]}</div>
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
                  style={{ width: "100%", accentColor: C.gold }} />
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
                  style={{ width: "100%", accentColor: C.gold }} />
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
            <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>Ab wann tippbar?</div>
            <p style={{ fontSize: 11, color: C.muted, margin: "0 0 8px", lineHeight: 1.45 }}>
              Quoten erscheinen erst einige Tage vor Anpfiff. Wie früh eure Runde
              tippt, entscheidest du — geschlossen wird immer beim Anpfiff.
            </p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {VORLAUF_STUFEN.map((st) => {
                const an = (rules.tippfenster?.vorlaufStunden ?? 168) === st.stunden;
                return (
                  <button key={st.stunden} title={st.hint}
                    onClick={() => { touched(); setRules((r) => ({ ...r, tippfenster: { vorlaufStunden: st.stunden } })); }}
                    style={{
                      flex: "1 1 70px", cursor: "pointer", fontFamily: "inherit", padding: "8px 6px",
                      borderRadius: 11, fontSize: 12, fontWeight: 700,
                      background: an ? `${C.gold}22` : C.surface,
                      color: an ? C.gold : C.muted,
                      border: `1px solid ${an ? C.gold + "66" : C.line}`,
                    }}>{st.label}</button>
                );
              })}
            </div>
            <p style={{ fontSize: 10.5, color: C.muted, marginTop: 6, lineHeight: 1.45 }}>
              {beschreibeTippfenster(rules)}
            </p>
          </div>

          {/* Zeitachse — was ein Spieltag DER RUNDE umfasst, wenn mehrere Ligen
              versetzt laufen. Zeigt sich selbst nur bei mehreren Wettbewerben. */}
          <Zeitachse
            zeitachse={rules.zeitachse}
            onChange={(neu) => { touched(); setRules((r) => ({ ...r, zeitachse: neu })); }}
          />

          {/* Zeitraum — gilt zusätzlich zu jeder Vereins-Auswahl */}
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>Zeitraum</div>
            <p style={{ fontSize: 11, color: C.muted, margin: "0 0 8px", lineHeight: 1.45 }}>
              Leer = ganze Saison. Für kurze Runden („nur die Rückrunde", „die letzten
              fünf Spieltage") hier eingrenzen.
            </p>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {[["spieltagVon", "von"], ["spieltagBis", "bis"]].map(([feld, label]) => (
                <label key={feld} style={{ flex: 1, fontSize: 11.5, color: C.muted }}>
                  Spieltag {label}
                  <input type="number" inputMode="numeric"
                    min={AUSWAHL_LIMITS.spieltag.min} max={AUSWAHL_LIMITS.spieltag.max}
                    value={sp[feld] ?? ""}
                    onChange={(e) => patchSpiele({ [feld]: e.target.value === "" ? null : Number(e.target.value) })}
                    placeholder="—"
                    style={{
                      display: "block", width: "100%", boxSizing: "border-box", marginTop: 3,
                      background: C.surface, color: C.text, border: `1px solid ${C.line}`,
                      borderRadius: 10, padding: "8px 10px", fontSize: 13.5, fontFamily: MONO, outline: "none",
                    }} />
                </label>
              ))}
            </div>
          </div>

          <div style={{
            marginTop: 10, background: C.ink2, border: `1px solid ${C.line}`,
            borderRadius: 12, padding: "10px 12px",
          }}>
            <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: 1.2, color: C.muted, textTransform: "uppercase" }}>
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
              <p style={{ fontSize: 12.5, color: C.muted, marginTop: -4, marginBottom: 10, lineHeight: 1.5 }}>
                Legt mit diesem Regelwerk eine echte Runde an. Du wirst Admin,
                bekommst einen Beitritts-Code zum Teilen, und diese Runde wird
                deine aktive Runde zum Tippen.
              </p>
              {!user && (
                <p style={{ fontSize: 12, color: C.gold, marginBottom: 10 }}>
                  Bitte zuerst auf der Startseite einloggen.
                </p>
              )}
              <button onClick={createRound} disabled={creating || !user || teamFilterInvalid} style={{
                width: "100%", cursor: creating || !user || teamFilterInvalid ? "default" : "pointer",
                background: C.mint, color: C.ink, fontWeight: 700, fontSize: 14,
                border: "none", borderRadius: 14, padding: "13px 0", opacity: creating || !user || teamFilterInvalid ? 0.6 : 1,
              }}>
                {creating ? "wird angelegt …" : "Runde jetzt erstellen"}
              </button>
              {createErr && <div style={{ fontSize: 12, color: C.coral, marginTop: 6 }}>{createErr}</div>}
            </>
          ) : (
            <div style={{ background: `${C.mint}12`, border: `1px solid ${C.mint}44`, borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.mint }}>✓ „{created.name}" ist angelegt — deine aktive Runde</div>
              <div style={{ marginTop: 10, fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>Beitritts-Code</div>
              <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: C.gold, marginTop: 4, letterSpacing: 3 }}>{created.join_code}</div>
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
            padding: "10px 12px", fontFamily: MONO, fontSize: 12, color: C.gold,
            wordBreak: "break-all", lineHeight: 1.5,
          }}>{code}</div>
          <button onClick={copy} style={{
            marginTop: 10, width: "100%", cursor: "pointer",
            background: copied ? C.mint : C.gold, color: C.ink, fontWeight: 700, fontSize: 14,
            border: "none", borderRadius: 14, padding: "13px 0", transition: "background .2s",
          }}>{copied ? "✓ kopiert" : "Langen Code kopieren & teilen"}</button>

          {/* Kurzcode (Content-Creator) */}
          <div style={{ marginTop: 14, background: C.ink2, border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ fontSize: 12.5, fontWeight: 700 }}>Kurzcode statt langem Code</div>
            <p style={{ fontSize: 11, color: C.muted, margin: "4px 0 10px", lineHeight: 1.4 }}>
              Speichert dein Regelwerk unter einem kurzen, merkbaren Code — perfekt zum
              Teilen (z. B. von Content-Creatorn). Andere laden ihn unten einfach ein.
            </p>
            {!shortCode ? (
              <button onClick={publish} disabled={publishing || !user} style={{
                width: "100%", cursor: publishing || !user ? "default" : "pointer",
                background: C.surface2, color: user ? C.text : C.muted, fontWeight: 700, fontSize: 13,
                border: `1px solid ${C.line}`, borderRadius: 12, padding: "11px 0", opacity: publishing || !user ? 0.6 : 1,
              }}>{publishing ? "wird erstellt …" : user ? "Kurzcode erstellen & teilen" : "Zum Erstellen einloggen"}</button>
            ) : (
              <div>
                <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 700, color: C.gold, letterSpacing: 3, textAlign: "center" }}>{shortCode}</div>
                <button onClick={copyShort} style={{
                  marginTop: 8, width: "100%", cursor: "pointer",
                  background: shortCopied ? C.mint : C.surface2, color: shortCopied ? C.ink : C.text, fontWeight: 700, fontSize: 13,
                  border: `1px solid ${C.line}`, borderRadius: 12, padding: "10px 0",
                }}>{shortCopied ? "✓ kopiert" : "Kurzcode kopieren"}</button>
              </div>
            )}
          </div>

          {/* Import: langer ODER kurzer Code */}
          <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
            <input value={imp} onChange={(e) => { setImp(e.target.value); setImpErr(""); }}
              placeholder="Code laden (TS1-… oder Kurzcode)" style={{
                flex: 1, minWidth: 0, background: C.ink2, color: C.text, border: `1px solid ${C.line}`,
                borderRadius: 12, padding: "10px 12px", fontSize: 13, fontFamily: MONO, outline: "none",
              }} />
            <button onClick={load} disabled={!imp.trim()} style={{
              cursor: imp.trim() ? "pointer" : "default", background: C.surface2,
              color: imp.trim() ? C.text : C.muted, border: `1px solid ${C.line}`,
              borderRadius: 12, padding: "0 16px", fontSize: 13, fontWeight: 600,
            }}>Laden</button>
          </div>
          {impErr && <div style={{ fontSize: 12, color: C.coral, marginTop: 6 }}>{impErr}</div>}
        </div>
      </div>
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
        <span style={{ fontFamily: MONO, fontSize: 13, color: draussen ? C.coral : C.gold }}>
          {fmt ? fmt(value) : value.toFixed(2)}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(+e.target.value)}
        style={{ width: "100%", accentColor: draussen ? C.coral : C.gold, cursor: "pointer" }} />
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
  const b = (dis) => ({
    width: 30, height: 30, borderRadius: 8, cursor: dis ? "default" : "pointer",
    background: C.surface2, color: dis ? C.muted : C.text, border: `1px solid ${C.line}`,
    fontSize: 18, lineHeight: 1,
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button onClick={() => onStep(-1)} disabled={value <= min} style={b(value <= min)}>−</button>
      <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 18, color: C.gold, width: 18, textAlign: "center" }}>{value}</span>
      <button onClick={() => onStep(1)} disabled={value >= max} style={b(value >= max)}>+</button>
    </div>
  );
}
