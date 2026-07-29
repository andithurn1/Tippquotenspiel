"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { DEFAULT_RULES, projectTip, weightUsageForMatchday } from "@/lib/engine";
import { jokerGiltFuerSpieltag } from "@/lib/voting";
import { wettbewerbVon } from "@/lib/wettbewerbe";
import { zeitachse, rundenSchluessel } from "@/lib/zeitachse";
import { bigGameAufschlag } from "@/lib/bigGame";
import { jokerPlan } from "@/lib/jokerPlan";
import { darfJokerSetzen, kontingent, erspielteJoker, standText } from "@/lib/jokerKontingent";
import { getStore } from "@/lib/store";
import { useAuth } from "@/components/AuthProvider";
import { usePrefs } from "@/components/PrefsProvider";
import { useCurrentRound } from "@/components/RoundProvider";
import BackLink from "@/components/BackLink";
import NaheErgebnisse from "@/components/NaheErgebnisse";
import { C, MONO } from "@/lib/theme";

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
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | guest | error
  // Gewichtung dieses Spiels: Flag (Modus „einzel") bzw. Faktor (Modus „ranking").
  const [joker, setJoker] = useState(false);
  const [gewicht, setGewicht] = useState(1);
  // Andere Tipps des Nutzers in dieser Runde — für „welche Gewichte am selben
  // Spieltag sind schon vergeben" (Ranking-Modus).
  const [meineTips, setMeineTips] = useState([]);
  // Eigene Roh-Einträge der Runde — Grundlage für die ERSPIELTEN Joker
  // (ereignisse.js rechnet aus Tipps + Ergebnissen).
  const [meineEintraege, setMeineEintraege] = useState([]);
  const [votes, setVotes] = useState([]);   // Joker-Abstimmung der Runde
  const [alleMatches, setAlleMatches] = useState([]);  // für die Zeitachse der Runde

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
    Promise.all([getStore().listTips({ roundId }), getStore().listMatches(), getStore().listVotes({ roundId })]).then(([tips, ms, vs]) => {
      if (!live) return;
      setVotes(vs);
      // Wettbewerb mit anreichern — der Gewichte-Schlüssel ist wettbewerb+matchday.
      const infoOf = new Map(ms.map((m) => [m.id, { matchday: m.matchday ?? null, wettbewerb: wettbewerbVon(m) }]));
      const eigene = tips
        .filter((t) => t.user_id === user.id)
        .map((t) => ({
          match_id: t.match_id,
          matchday: infoOf.get(t.match_id)?.matchday ?? null,
          wettbewerb: infoOf.get(t.match_id)?.wettbewerb ?? null,
          gewicht: t.tip?.gewicht,
        }));
      setMeineTips(eigene);
      setAlleMatches(ms);
      getStore().getRoundEntries(roundId)
        .then((alle) => { if (live) setMeineEintraege(alle.filter((x) => x.userId === user.id)); })
        .catch(() => {});
      const dieser = tips.find((t) => t.user_id === user.id && t.match_id === matchId);
      if (dieser?.tip?.joker === true) setJoker(true);
      if (Number.isFinite(dieser?.tip?.gewicht)) setGewicht(dieser.tip.gewicht);
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
  const gutschriften = useMemo(
    () => erspielteJoker({ eintraege: meineEintraege, rules: RULES }),
    [meineEintraege, RULES]);
  // Der Ranglisten-Pool wird einmal je RUNDEN-Spieltag vergeben, nicht einmal je
  // Liga — sonst ließe er sich in einer Runde über fünf Wettbewerbe fünfmal pro
  // Woche ausgeben. Dieselbe Quelle wie in der Spielwahl, damit beide Screens
  // dieselben Gewichte als belegt sehen.
  const schluessel = useMemo(
    () => rundenSchluessel(zeitachse(alleMatches, RULES.zeitachse)) ?? undefined,
    [alleMatches, RULES.zeitachse],
  );

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
  // Ranking: welche Gewichte hat der Nutzer an DIESEM Spieltag schon vergeben?
  // Der eigene Tipp ist ausgenommen (man stellt ihn ja gerade ein).
  const belegung = rankingModus
    ? weightUsageForMatchday(meineTips, spieltag, RULES, matchId, schluessel)
    : null;
  const gewichtBelegtVon = (g) => belegung?.belegt.find((b) => b.gewicht === g)?.matchId ?? null;
  // Gewichtung fließt in die Vorschau ein, damit man sofort sieht, was sie bringt.
  const gewichtung = rankingModus ? { gewicht } : { joker };
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
      const goals = goalsAusPicks(picks, scorer);
      // Absicherung gegen veralteten Zustand: ein Ranking-Gewicht, das
      // inzwischen anderweitig belegt ist, wird auf neutral zurückgesetzt.
      let gewichtungSicher = gewichtung;
      if (rankingModus && gewicht !== 1 && gewichtBelegtVon(gewicht)) gewichtungSicher = { gewicht: 1 };
      await getStore().saveTip({
        roundId, matchId: SNAP.matchId, userId: user.id,
        // Gewichtung nur mitschicken, wenn sie erlaubt UND noch nicht gesperrt ist.
        tip: { home: h, away: a, goals, ...(jokerAktiv && !gesperrt ? gewichtungSicher : {}) },
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
                  {rankingModus ? "Gewicht dieses Spiels" : "Joker"}
                </div>
                {rankingModus ? (
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
                            }}>×{f.toFixed(1)}</button>
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
                      {joker ? `✓ Joker gesetzt · ×${RULES.joker.faktor.toFixed(1)}` : `Joker setzen · ×${RULES.joker.faktor.toFixed(1)}`}
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

function Confirmation({ snap, h, a, winner, csQuote, kickoffLabel, picks, teams, saveState, roundName, onEdit }) {
  const hint = saveState === "saved"
    ? { text: `✓ gespeichert in „${roundName ?? "deiner Runde"}"`, col: C.mint }
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
