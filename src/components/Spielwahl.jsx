"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { getStore } from "@/lib/store";
import { useAuth } from "@/components/AuthProvider";
import { useCurrentRound } from "@/components/RoundProvider";
import BackLink from "@/components/BackLink";
import { ErgebnisUebersicht } from "@/components/NaheErgebnisse";
import { DEFAULT_RULES, weightUsageForMatchday } from "@/lib/engine";
import { jokerGiltFuerSpieltag } from "@/lib/voting";
import { wettbewerbVon, phaseVon, wettbewerbLabel, phasenLabel, istKo, wettbewerbeIn } from "@/lib/wettbewerbe";
import { tippStatus, uebersicht, naechsteOeffnung, beschreibeTippfenster, formatZeitpunkt, spieltagStarts } from "@/lib/tippfenster";
import { bigGameAufschlag } from "@/lib/bigGame";
import { istGeoeffnet } from "@/lib/spieltagOeffnen";
import { zeitachse, rundenSpieltagVon, achsenLabel, rundenSchluessel } from "@/lib/zeitachse";
import { herkunftLabel } from "@/lib/spielplan";
import { echteSpielplaene } from "@/lib/ligen";
import { C, MONO } from "@/lib/theme";
import { TAPZIEL } from "@/lib/tapziel";


const timeFmt = new Intl.DateTimeFormat("de-DE", {
  weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  timeZone: "Europe/Berlin",
});

// Match-Auswahl: alle Spiele aus dem Store, nach Spieltag gruppiert. Offene
// (Kickoff in der Zukunft) sind klickbar → Tippabgabe, bereits angepfiffene
// sind gesperrt. Zeigt außerdem an, wenn schon ein Tipp abgegeben wurde.
export default function Spielwahl() {
  const { user } = useAuth();
  const { roundId } = useCurrentRound();
  const [matches, setMatches] = useState(null);
  const [teamFilter, setTeamFilter] = useState(null);
  const [tippedIds, setTippedIds] = useState(new Set());
  const [rules, setRules] = useState(DEFAULT_RULES);
  // Beschluss-Lage der Runde — siehe `regelnVon` weiter unten.
  const [beschlussLage, setBeschlussLage] = useState(null);
  const [meineTips, setMeineTips] = useState([]);   // { match_id, wettbewerb, matchday, gewicht }
  const [votes, setVotes] = useState([]);           // Joker-Abstimmung der Runde
  const [adminId, setAdminId] = useState(null);     // wer darf einen Spieltag öffnen
  const [oeffnet, setOeffnet] = useState(null);     // Gruppen-Key, der gerade öffnet
  const [oeffnenFehler, setOeffnenFehler] = useState(null);
  const [neuLaden, setNeuLaden] = useState(0);      // hochzählen = Spiele neu holen
  const [ladeFehler, setLadeFehler] = useState(null);

  useEffect(() => {
    let live = true;
    (getStore().getRegelnFuer?.(roundId) ?? Promise.resolve(null))
      .then((lage) => { if (live) setBeschlussLage(lage ?? null); })
      .catch(() => {});
    // 🔴 `listRoundMatches`: die Regel „welche Spiele gehören zur Runde" hat
    // EINE Stelle (Runden-Schicht, Frage 1). Hier lag sie nachgebaut — heute
    // mit demselben Ergebnis, aber sie wäre stehengeblieben, sobald der Store
    // seine Antwort erweitert.
    Promise.all([getStore().getRound(roundId), getStore().listRoundMatches(roundId), getStore().listVotes({ roundId })]).then(([round, ms, vs]) => {
      if (!live) return;
      setTeamFilter(round?.team_filter ?? null);
      setRules(round?.rules ?? DEFAULT_RULES);
      setAdminId(round?.admin_id ?? null);
      setVotes(vs);
      setMatches([...ms].sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff)));
    }).catch((e) => {
      // Ohne diesen Zweig bleibt der Screen für immer bei „Spiele laden …" und
      // in der Konsole steht nichts Verwertbares — die Ursache liegt dann in der
      // Daten-Schicht (der Spielplan-Import bricht z. B. absichtlich hart ab),
      // ist aber von außen nicht zu sehen. Lieber eine leere Liste plus Meldung.
      if (!live) return;
      console.error("Spiele konnten nicht geladen werden:", e);
      setLadeFehler(e?.message ?? String(e));
      setMatches([]);
    });
    return () => { live = false; };
  }, [roundId, neuLaden]);

  useEffect(() => {
    let live = true;
    Promise.all([getStore().listTips({ roundId }), getStore().listRoundMatches(roundId)]).then(([tips, ms]) => {
      if (!live || !user) return;
      const eigene = tips.filter((t) => t.user_id === user.id);
      setTippedIds(new Set(eigene.map((t) => t.match_id)));
      // Wettbewerb MIT anreichern: der Gewichte-Schlüssel ist wettbewerb+matchday.
      // `wettbewerbVon` liefert dabei denselben Fallback wie die Gruppierung,
      // sonst passte der Schlüssel eines Alt-Tipps auf keine Gruppe.
      const infoOf = new Map(ms.map((m) => [m.id, { matchday: m.matchday ?? null, wettbewerb: wettbewerbVon(m) }]));
      setMeineTips(eigene.map((t) => ({
        match_id: t.match_id,
        matchday: infoOf.get(t.match_id)?.matchday ?? null,
        wettbewerb: infoOf.get(t.match_id)?.wettbewerb ?? null,
        gewicht: t.tip?.gewicht,
      })));
    });
    return () => { live = false; };
  }, [roundId, user]);

  // 🔴 Das Regelwerk je SPIELTAG, nicht nur das der Runde. Beschlossene
  // Regeländerungen wirken ab ihrem Spieltag; diese Liste zeigt Spiele über die
  // ganze Saison, also auch welche vor und nach einem Beschluss. Ohne
  // `regelnFuer` stünde am Spiel von Spieltag 30 das Tipp-Fenster und der
  // Topspiel-Aufschlag von vor der Änderung — dieselbe Frage wie in der
  // Tippabgabe, nur über viele Spieltage auf einmal.
  // Fällt nichts an (keine Beschlüsse, nichts geladen), bleibt es beim
  // Regelwerk der Runde — kein stiller Wechsel.
  const regelnVon = (m) => (beschlussLage?.regelnFuer
    ? beschlussLage.regelnFuer({ wettbewerb: wettbewerbVon(m), matchday: m?.matchday ?? null }) ?? rules
    : rules);

  const rankingModus = rules.joker?.enabled === true && rules.joker?.modus === "ranking";
  const istAdmin = Boolean(user && adminId && user.id === adminId);

  // Zeitachse: der Spieltag DER RUNDE quer über alle Ligen. Nur sinnvoll, wenn
  // die Runde wirklich mehrere Wettbewerbe umfasst — bei einer reinen
  // Bundesliga-Runde wäre „Spieltag 3 · Bundesliga 3" nur Lärm.
  const achse = useMemo(
    () => (matches ? zeitachse(matches, rules.zeitachse) : []),
    [matches, rules.zeitachse],
  );
  // Label einer Spieltags-GRUPPE: Gruppen sind nach Wettbewerb+Spieltag
  // getrennt, ein Runden-Spieltag fasst mehrere davon zusammen. Gezeigt wird
  // deshalb der Runden-Spieltag, in den das erste Spiel der Gruppe fällt.
  // Derselbe Schlüssel, den die Anzeige benutzt, gilt auch für die REGEL: der
  // Ranglisten-Pool wird einmal je Runden-Spieltag vergeben, nicht einmal je
  // Liga. Ohne das könnte man ihn in einer Runde über fünf Wettbewerbe fünfmal
  // pro Woche ausgeben. `null` = keine Achse → die Engine bleibt beim
  // Liga-Spieltag, es gibt keinen stillen Regelwechsel.
  const schluessel = useMemo(() => rundenSchluessel(achse) ?? undefined, [achse]);

  const rundenSpieltagFuer = (gruppe) => {
    if (!mehrereWettbewerbe || !achse.length) return null;
    const nummer = rundenSpieltagVon(achse, gruppe.spiele[0]);
    const eintrag = nummer == null ? null : achse.find((e) => e.nummer === nummer);
    // „Runden-Spieltag 3 · BL 1 · PD 3" — die Zahl der Runde zuerst, dann die
    // Übersetzung. Umgekehrt liest man erst die Liga und muss zurückspringen.
    return eintrag ? "Runden-" + achsenLabel(eintrag, { kurz: true }) : null;
  };

  // Spieltag öffnen = den Spannungswert des Topspiels EINFRIEREN (siehe
  // spieltagOeffnen.js). Bewusst eine ADMIN-Handlung und keine Automatik: der
  // Wert hängt am Tabellenstand in dem Moment, in dem geöffnet wird — wer den
  // Moment wählt, wählt mit. Die Server-Route prüft dieselbe Berechtigung noch
  // einmal, die Oberfläche ist umgehbar.
  const oeffneSpieltag = async (gruppe) => {
    setOeffnet(gruppe.key);
    setOeffnenFehler(null);
    try {
      await getStore().openMatchday(roundId, gruppe.matchday, gruppe.wettbewerb);
      setNeuLaden((n) => n + 1);   // Snapshots haben sich geändert → neu holen
    } catch {
      setOeffnenFehler(gruppe.key);
    } finally {
      setOeffnet(null);
    }
  };

  const now = Date.now();
  // ── Nur zeigen, was ANSTEHT ─────────────────────────────
  // Der volle Spielplan sind mit zwei Wettbewerben über 450 Spiele. Der
  // Spieler will die sehen, die jetzt tippbar sind; der Rest ist auf Wunsch
  // einblendbar, wird aber nicht verschwiegen (die Zahlen stehen daneben).
  const [alleZeigen, setAlleZeigen] = useState(false);
  // 🔴 Der erste Anpfiff je Spieltag — beim Anker `spieltag` die Bezugsgröße.
  // Ohne ihn rechnet `tippStatus` ab dem eigenen Anpfiff und verhält sich wie
  // der Anker `spiel`; die Einstellung des Admins läuft ins Leere. `uebersicht`
  // bildet die Map intern, die Zeilen darunter taten es nicht — gemessen am
  // 06.08.2026 meldete der Zähler 9 tippbare Spiele und die Liste zeigte 1.
  // Ein Screen, der sich selbst widerspricht.
  const starts = useMemo(() => spieltagStarts(matches ?? []), [matches]);
  const stand = uebersicht(matches ?? [], rules, now);
  const naechste = naechsteOeffnung(matches ?? [], rules, now);
  const offeneUndGelaufene = (matches ?? []).filter((m) => tippStatus(m, regelnVon(m), now, starts).zustand !== "zu");
  // Wenn gerade NICHTS tippbar ist (typisch in der Sommerpause), wäre die
  // Liste leer — ein leerer Screen ist immer die schlechteste Antwort. Dann
  // zeigen wir die nächsten anstehenden Spiele, deutlich als „noch nicht
  // tippbar" markiert, statt den Spieler vor eine weiße Fläche zu setzen.
  const naechsteVorschau = (matches ?? [])
    .filter((m) => tippStatus(m, regelnVon(m), now, starts).zustand === "zu")
    .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff))
    .slice(0, 9);
  const sichtbar = alleZeigen
    ? (matches ?? [])
    : (stand.offen === 0 ? [...offeneUndGelaufene, ...naechsteVorschau] : offeneUndGelaufene);
  // Wettbewerbs-Namen nur zeigen, wenn die Runde wirklich mehrere umfasst —
  // bei einer reinen Bundesliga-Runde wäre „Bundesliga ·" vor jedem Spieltag Lärm.
  const mehrereWettbewerbe = wettbewerbeIn(matches ?? []).length > 1;
  // Gruppiert wird nach WETTBEWERB + Spieltag — sonst fielen z. B. Bundesliga-
  // Spieltag 1 und Champions-League-Spieltag 1 in dieselbe Gruppe. Sortiert
  // nach dem frühesten Anpfiff der Gruppe, damit die Wettbewerbe zeitlich
  // ineinandergreifen (so tippt man auch: chronologisch, nicht nach Liga).
  const groups = new Map();
  for (const m of sichtbar) {
    const key = `${wettbewerbVon(m)}|${m.matchday ?? 0}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(m);
  }
  const gruppen = [...groups.entries()]
    .map(([key, spiele]) => ({
      key,
      spiele,
      matchday: spiele[0].matchday ?? 0,
      wettbewerb: wettbewerbVon(spiele[0]),
      phase: phaseVon(spiele[0]),
      start: spiele.reduce((min, m) => (m.kickoff < min ? m.kickoff : min), spiele[0].kickoff),
    }))
    .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));

  return (
    <div style={{
      minHeight: "100vh", background: C.ink, color: C.text,
      fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
      padding: "28px 16px", display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <BackLink href="/hub" label="Tippspiel" />
      <div style={{ width: "100%", maxWidth: 400 }}>
        <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: 2, color: C.muted, textTransform: "uppercase" }}>
          Spielwahl
        </span>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: "8px 0 10px" }}>Auf welches Spiel willst du tippen?</h1>
        {/* Ehrliche Übersicht statt stiller Kürzung */}
        {matches != null && (
          <div style={{
            background: C.ink2, border: `1px solid ${C.line}`, borderRadius: 12,
            padding: "10px 12px", marginBottom: 12,
          }}>
            <div style={{ fontSize: 12.5, color: C.text, lineHeight: 1.5 }}>
              <strong style={{ color: C.mint }}>{stand.offen} tippbar</strong>
              {stand.zu > 0 && ` · ${stand.zu} kommen noch`}
              {stand.vorbei > 0 && ` · ${stand.vorbei} gelaufen`}
            </div>
            {stand.offen === 0 && naechste && (
              <div style={{ fontSize: 11.5, color: C.sky, marginTop: 4, lineHeight: 1.45 }}>
                Gerade ist nichts tippbar — das nächste Spiel öffnet am{" "}
                {formatZeitpunkt(naechste.oeffnetAm)}. Bis dahin siehst du unten,
                was als Nächstes ansteht.
              </div>
            )}
            <div style={{ fontSize: 10.5, color: C.muted, marginTop: 5, lineHeight: 1.45 }}>
              {beschreibeTippfenster(rules)}
            </div>
            {stand.zu > 0 && (
              <button onClick={() => setAlleZeigen((v) => !v)} style={{
                marginTop: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700,
                background: "transparent", color: C.sky, border: `1px solid ${C.sky}55`,
                ...TAPZIEL, borderRadius: 999, padding: "5px 12px",
              }}>
                {alleZeigen ? "Nur anstehende zeigen" : `Auch die ${stand.zu} späteren zeigen`}
              </button>
            )}
          </div>
        )}

        {teamFilter?.length > 0 && (
          <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 12 }}>
            Diese Runde ist beschränkt auf: {teamFilter.join(", ")}
          </div>
        )}

        {/* Die Herkunft wird ABGELESEN, nicht behauptet: sobald die echten
            Kalender liegen, stimmte ein fest verdrahtetes „Simulierte Saison"
            nicht mehr — und im August ist der Katalog eine Weile gemischt, weil
            die Champions League erst Ende des Monats ausgelost wird. */}
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>
          {herkunftLabel(matches ?? [], echteSpielplaene())}
          {mehrereWettbewerbe && ` · ${wettbewerbeIn(matches ?? []).map((w) => w.label).join(" + ")}`}
          {" "}— echte Klubs. Wo keine Marktquote vorliegt, sind Quoten und
          Ergebnisse erzeugt; Torschützen sind es immer. Kein echter Spielausgang.
        </div>

        {matches == null && !ladeFehler && (
          <div style={{ fontFamily: MONO, fontSize: 13, color: C.muted }}>Spiele laden …</div>
        )}

        {ladeFehler && (
          <div style={{
            background: `${C.akzent}0E`, border: `1px solid ${C.akzent}33`, borderRadius: 10,
            padding: "10px 12px", fontSize: 11.5, color: C.text, lineHeight: 1.45,
          }}>
            Die Spiele konnten nicht geladen werden.
            <div style={{ fontFamily: MONO, color: C.muted, marginTop: 4 }}>{ladeFehler}</div>
          </div>
        )}

        {gruppen.map((g) => {
          const md = g.matchday;
          // Ranking-Leiste nur zeigen, wenn der Joker an diesem Spieltag gilt
          // (bei aktiver Abstimmung also nur an beschlossenen Spieltagen).
          // Der Spieltag trägt den Wettbewerb mit: die Gruppen sind bereits
          // danach getrennt, die Gewichte müssen es auch sein.
          const spieltag = { wettbewerb: g.wettbewerb, matchday: md };
          const belegung = rankingModus && jokerGiltFuerSpieltag(rules, spieltag, votes)
            ? weightUsageForMatchday(meineTips, spieltag, rules, null, schluessel) : null;
          const gewichtVon = (id) => meineTips.find((t) => t.match_id === id)?.gewicht;
          // K.-o.-Runden heißen nach ihrer Phase („Achtelfinale"), Ligaspiele
          // nach dem Spieltag. Der Wettbewerb steht bei mehreren immer davor.
          const titel = istKo(g.phase)
            ? phasenLabel(g.phase)
            : (md ? `Spieltag ${md}` : "Sonstige");
          return (
            <div key={g.key} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                {mehrereWettbewerbe && (
                  <span style={{ color: C.akzent }}>{wettbewerbLabel(g.wettbewerb)} · </span>
                )}
                {titel}
              </div>
              {/* Die Übersetzung in den Spieltag DER RUNDE. Bei mehreren Ligen
                  ist „Spieltag 1" allein wertlos — jede Liga zählt anders, und
                  ohne diese Zeile weiß niemand, wo in der Runde er gerade ist. */}
              {rundenSpieltagFuer(g) && (
                <div style={{ fontSize: 11, color: C.sky, marginTop: -4, marginBottom: 8 }}>
                  {rundenSpieltagFuer(g)}
                </div>
              )}
              {/* Der Spieltag ist noch nicht geöffnet — nur der Admin sieht das,
                  und nur, solange nichts angepfiffen ist: danach würde ein
                  bereits abgegebener Tipp nachträglich mehr wert werden. */}
              {istAdmin && rules.bigGame?.enabled && !istGeoeffnet(g.spiele)
                && g.spiele.every((m) => new Date(m.kickoff).getTime() > now) && (
                <div style={{
                  background: `${C.coral}0E`, border: `1px solid ${C.coral}33`,
                  borderRadius: 10, padding: "8px 10px", marginBottom: 8,
                }}>
                  <div style={{ fontSize: 11.5, color: C.text, lineHeight: 1.45 }}>
                    Spieltag noch nicht geöffnet — das Topspiel steht damit noch nicht fest.
                  </div>
                  <div style={{ fontSize: 10.5, color: C.muted, marginTop: 3, lineHeight: 1.45 }}>
                    Beim Öffnen wird der Spannungswert aus dem HEUTIGEN Tabellenstand
                    berechnet und eingefroren — danach unveränderlich, für alle gleich.
                  </div>
                  <button onClick={() => oeffneSpieltag(g)} disabled={oeffnet === g.key} style={{
                    marginTop: 7, cursor: oeffnet === g.key ? "default" : "pointer",
                    fontFamily: "inherit", fontSize: 11.5, fontWeight: 700,
                    background: "transparent", color: C.coral, border: `1px solid ${C.coral}66`,
                    ...TAPZIEL, borderRadius: 999, padding: "5px 12px",
                  }}>
                    {oeffnet === g.key ? "öffnet …" : "Spieltag öffnen"}
                  </button>
                  {oeffnenFehler === g.key && (
                    <div style={{ fontSize: 10.5, color: C.coral, marginTop: 5 }}>
                      Öffnen fehlgeschlagen — nur der Admin der Runde darf das, und nur angemeldet.
                    </div>
                  )}
                </div>
              )}
              {belegung && (
                <div style={{
                  display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6,
                  background: `${C.akzent}0E`, border: `1px solid ${C.akzent}2E`,
                  borderRadius: 10, padding: "7px 10px", marginBottom: 8,
                }}>
                  <span style={{ fontSize: 10.5, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>Gewichte:</span>
                  {belegung.belegt.filter((b) => b.gewicht !== 1).map((b) => (
                    <span key={b.gewicht} style={{
                      fontFamily: MONO, fontSize: 11, padding: "2px 7px", borderRadius: 999,
                      background: b.matchId ? "transparent" : `${C.akzent}22`,
                      color: b.matchId ? "rgba(138,144,180,0.5)" : C.akzent,
                      border: `1px solid ${b.matchId ? C.line : C.akzent + "66"}`,
                      textDecoration: b.matchId ? "line-through" : "none",
                    }}>×{b.gewicht.toFixed(1)}</span>
                  ))}
                  <span style={{ fontSize: 10.5, color: C.muted, marginLeft: "auto" }}>
                    {belegung.alleVergeben ? "alle vergeben" : `${belegung.frei.length} frei`}
                  </span>
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {g.spiele.map((m) => (
                  <MatchRow key={m.id} match={m} status={tippStatus(m, regelnVon(m), now, starts)}
                    tipped={tippedIds.has(m.id)} gewicht={gewichtVon(m.id)} rules={regelnVon(m)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// `status` kommt aus tippfenster.js und ist dreiwertig: „noch nicht", „offen",
// „vorbei". Ein Boolean würde die ersten beiden zusammenwerfen — für den
// Spieler sind das aber zwei völlig verschiedene Nachrichten.
function MatchRow({ match, status, tipped, gewicht, rules }) {
  const open = status?.offen === true;
  const gewichtet = Number.isFinite(gewicht) && gewicht > 1;
  // Big Game: NICHT am Snapshot-Häkchen ablesen, sondern über den Aufschlag
  // dieser RUNDE. Eingefroren ist nur der objektive Spannungswert; ob er als
  // Spiel des Spieltags zählt, entscheidet die eigene `minSpannung`. Zwei Runden
  // lesen denselben Wert also verschieden — genau so ist es gedacht.
  const bigGame = bigGameAufschlag(match.snapshot, rules);
  const content = (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      background: open ? C.surface : C.ink2,
      // Das Topspiel bekommt einen eigenen Rahmen, nicht nur ein Schildchen —
      // es soll beim Überfliegen der Liste auffallen, darum geht es ja.
      border: `1px solid ${bigGame > 0 ? C.coral + "88" : C.line}`, borderRadius: 14,
      padding: "12px 14px", opacity: open ? 1 : 0.55,
    }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{match.home} <span style={{ color: C.muted, fontWeight: 400 }}>vs</span> {match.away}</div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: C.muted, marginTop: 3 }}>{timeFmt.format(new Date(match.kickoff))}</div>
        {/* Die eingefrorene Begründung mitliefern: ein Aufschlag ohne Grund
            sieht nach Willkür aus. Sie steht so im Snapshot, wie sie beim
            Öffnen des Spieltags berechnet wurde. */}
        {bigGame > 0 && match.snapshot?.bigGameGrund && (
          <div style={{ fontSize: 11, color: C.coral, marginTop: 4, lineHeight: 1.4 }}>
            {match.snapshot.bigGameGrund}
          </div>
        )}
        {/* Orientierung: die lohnendsten Endstände dieses Spiels */}
        {open && <ErgebnisUebersicht snap={match.snapshot} />}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {bigGame > 0 && <Tag tone={C.coral}>★ Topspiel +{bigGame.toFixed(1)}</Tag>}
        {gewichtet && <Tag tone={C.akzent}>×{gewicht.toFixed(1)}</Tag>}
        {open ? (
          tipped
            ? <Tag tone={C.mint}>✓ getippt</Tag>
            : <Tag tone={C.akzent}>{status.text}</Tag>
        ) : status?.zustand === "zu" ? (
          <Tag tone={C.sky}>{status.text}</Tag>
        ) : (
          <Tag tone={C.muted}>Anpfiff war</Tag>
        )}
      </div>
    </div>
  );
  return open
    ? <Link href={`/tippen/${match.id}`} style={{ textDecoration: "none", color: "inherit" }}>{content}</Link>
    : <div>{content}</div>;
}

function Tag({ children, tone }) {
  return (
    <span style={{
      fontFamily: MONO, fontSize: 11, color: tone, border: `1px solid ${tone}55`,
      borderRadius: 999, padding: "3px 9px", whiteSpace: "nowrap",
    }}>{children}</span>
  );
}
