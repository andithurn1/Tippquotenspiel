"use client";

import { useEffect, useMemo, useState } from "react";
import { getStore } from "@/lib/store";
import { useAuth } from "@/components/AuthProvider";
import { useCurrentRound } from "@/components/RoundProvider";
import BackLink from "@/components/BackLink";
import { DEFAULT_RULES } from "@/lib/engine";
import { erspielteJoker, kontingent, standText } from "@/lib/jokerKontingent";
import { jokerPlan } from "@/lib/jokerPlan";
import { zeitachse, rundenSchluessel, rundenSpieltagVon } from "@/lib/zeitachse";
import { wirkungsVorgaenge } from "@/lib/ereignisse";
import { ablaeufe, naechsterAblauf } from "@/lib/ablauf";
import { einsaetzeAllerArten } from "@/lib/jokerBudget";
import { beschreibeSchnitt, ohneZurueckgesetztes } from "@/lib/ruecksetzung";
import { offenesRecht, ausuebungenFuer, beschreibeAusuebung } from "@/lib/rechteAusuebung";
import { beschreibeAngebot } from "@/lib/rechte";
import { C, MONO, SCHRIFT, RUND } from "@/lib/theme";

// ============================================================
//  DIE RUNDEN-ÜBERSICHT — wer hält was, und wann fällt es weg
//
//  🔴 Andi, 27.08.2026: „hier sehen wir ne Übersicht über die Ereignisse und
//  angewendeten Joker **bzw. wann die auch geresettet werden**".
//
//  ── Warum es diese Seite braucht, obwohl es `/joker` schon gibt ──
//  `/joker` zeigt MEINE Joker. Diese Seite zeigt die RUNDE. Das ist nicht
//  dieselbe Auskunft mit mehr Zeilen, sondern eine andere Frage: „habe ich
//  noch einen?" gegen „wer hat noch einen?". Die zweite entscheidet, ob man
//  einen Vorsprung verteidigen kann — und sie stand bisher nirgends.
//
//  🔴 Und das „wann fällt es weg" gab es überhaupt nicht. Die REGEL steht im
//  Regelwerk (`jokerBasis.verfall`), das DATUM nirgends. Ein Spieler sah
//  „2 Joker übrig" und wusste nicht, ob er sie diese Woche ausgeben muss oder
//  bis Mai Zeit hat. `ablauf.js` übersetzt das, diese Seite zeigt es.
//
//  ⚠️ NICHTS wird hier nachgerechnet. Kontingent, Gutschriften und Vorgänge
//  kommen aus denselben Funktionen, aus denen auch die Wertung rechnet
//  (Runden-Schicht, CLAUDE.md) — eine eigene Zählung wäre die zweite
//  Wahrheit, an der dieses Projekt schon 17 Fehler an einem Tag hatte.
// ============================================================

function Karte({ titel, children, ton = null }) {
  return (
    <div style={{
      background: C.ink2, border: `1px solid ${ton ?? C.line}`,
      borderRadius: RUND.karte, padding: "13px 15px", marginBottom: 12,
    }}>
      <div style={{
        fontSize: "0.6875rem", color: C.muted, textTransform: "uppercase",
        letterSpacing: 1, marginBottom: 8,
      }}>{titel}</div>
      {children}
    </div>
  );
}

export default function RundenUebersicht() {
  const { user } = useAuth();
  const meId = user?.id ?? null;
  const { roundId } = useCurrentRound();
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [matches, setMatches] = useState(null);
  const [tipps, setTipps] = useState([]);
  const [board, setBoard] = useState([]);
  const [eintraege, setEintraege] = useState([]);
  const [tagesPunkte, setTagesPunkte] = useState([]);
  const [radJoker, setRadJoker] = useState([]);
  const [radSchnitte, setRadSchnitte] = useState([]);
  const [ausuebungen, setAusuebungen] = useState([]);
  // Was der Inhaber gerade anklickt. ⚠️ Reiner Anzeige-Zustand.
  const [wahl, setWahl] = useState(null);   // { angebotKey, wert }
  const [sendet, setSendet] = useState(false);

  useEffect(() => {
    let live = true;
    Promise.all([
      getStore().getRound(roundId),
      getStore().listRoundMatches(roundId, { schlank: true }),
      getStore().listTips({ roundId }),
      getStore().getLeaderboard(roundId),
      getStore().getRoundEntries(roundId),
      getStore().getSpieltagsPunkte?.(roundId) ?? Promise.resolve([]),
      getStore().getDrehradBelohnungen?.(roundId) ?? Promise.resolve(null),
      getStore().listRechteAusgeuebt?.({ roundId }) ?? Promise.resolve([]),
    ]).then(([round, ms, ts, brd, entries, punkte, rad, rechte]) => {
      if (!live) return;
      setRules(round?.rules ?? DEFAULT_RULES);
      setMatches(ms ?? []);
      setTipps(ts ?? []);
      setBoard(brd ?? []);
      setEintraege(entries ?? []);
      setTagesPunkte(punkte ?? []);
      setRadJoker(rad?.joker ?? []);
      setRadSchnitte(rad?.ruecksetzungen ?? []);
      setAusuebungen(rechte ?? []);
    }).catch(() => {
      // ⚠️ Auch im Fehlerfall aus dem Ladezustand — sonst hängt die Seite für
      // immer (`ladezustand.test.js`, der Befund vom 26.08.2026).
      if (live) { setMatches([]); setBoard([]); }
    });
    return () => { live = false; };
  }, [roundId]);

  const achse = useMemo(() => zeitachse(matches ?? [], rules?.zeitachse), [matches, rules]);
  const schluessel = useMemo(() => rundenSchluessel(achse) ?? undefined, [achse]);

  // Der laufende RUNDEN-Spieltag: der höchste, an dem schon getippt wurde.
  // ⚠️ Über die Achse, nicht über den Liga-Spieltag — sonst gäbe es „Spieltag
  // 5" in einer Runde über fünf Wettbewerbe fünfmal (CLAUDE.md).
  const spieltag = useMemo(() => {
    const tage = (matches ?? []).map((m) => rundenSpieltagVon(achse, m)).filter(Number.isFinite);
    return tage.length ? Math.max(...tage.filter((t) => t <= Math.max(...tage))) : null;
  }, [matches, achse]);

  const plan = useMemo(
    () => jokerPlan(matches ?? [], rules, { schluessel }),
    [matches, rules, schluessel]);

  // ── Wer hält was ────────────────────────────────────────
  // Über `kontingent` je Spieler — dieselbe Funktion, die auch die Tippabgabe
  // fragt, bevor sie einen Joker zulässt.
  const stand = useMemo(() => {
    if (!board.length) return [];
    return board.map((z) => {
      const gutschriften = [
        ...erspielteJoker({
          eintraege: eintraege.filter((e) => e.userId === z.userId),
          alleEintraege: eintraege, spieltagsPunkte: tagesPunkte, rules,
          schluessel, rundenId: roundId ?? "",
        }),
        ...radJoker.filter((g) => g.userId === z.userId),
      ];
      const k = kontingent({
        plan, gutschriften, tipps, userId: z.userId,
        bisSpieltag: spieltag, duell: rules?.duell,
      });
      return { userId: z.userId, name: z.name ?? z.userId, total: z.total, stand: k };
    });
  }, [board, eintraege, tagesPunkte, rules, schluessel, roundId, radJoker, plan, tipps, spieltag]);

  // ── Was ist an Ereignissen gelaufen ─────────────────────
  const ereignisse = useMemo(() => wirkungsVorgaenge({
    alleEintraege: eintraege, ereignisse: rules?.ereignisse,
    spieltagsPunkte: tagesPunkte, schluessel,
    mitglieder: board.map((z) => z.userId), rundenId: roundId ?? "",
  }), [eintraege, rules, tagesPunkte, schluessel, board, roundId]);

  const namen = useMemo(
    () => new Map(board.map((z) => [z.userId, z.name ?? z.userId])), [board]);

  // ── Meine gesetzten Joker, in RUNDEN-Spieltagen ─────────
  // 🔴 `matchday` wird hier bewusst UMGESCHRIEBEN: `einsaetzeAllerArten` liest
  // das Feld, und der LIGA-Spieltag wäre über mehrere Wettbewerbe mehrfach
  // vergeben (CLAUDE.md, zweite Frage der Runden-Schicht). Genau dieselbe
  // Umschreibung macht `MeineJoker.jsx` — es ist die Form, in der die
  // Joker-Prüfung rechnet, nicht eine eigene.
  const einsaetze = useMemo(() => {
    const matchVon = new Map((matches ?? []).map((m) => [m.id ?? m.matchId, m]));
    const inRundenTakt = (tipps ?? []).map((t) => {
      const m = matchVon.get(t.match_id ?? t.matchId);
      return {
        userId: t.user_id ?? t.userId,
        matchday: m ? rundenSpieltagVon(achse, m) : null,
        joker: t.tip?.joker === true || t.joker === true,
        gewicht: t.tip?.gewicht ?? t.gewicht,
        tip: t.tip,
      };
    });
    // 🔴 Die Rücksetzung vom Rad greift AUCH hier. Ohne diese Zeile stünde auf
    // dieser Seite „Einzel-Joker wieder frei ab Spieltag 5", während die
    // Tippabgabe den Joker längst durchlässt — zwei Wahrheiten über dieselbe
    // Sperre, und der Spieler glaubt der falschen.
    return ohneZurueckgesetztes(
      einsaetzeAllerArten(inRundenTakt, rules), radSchnitte, meId, "cooldown");
  }, [tipps, matches, achse, rules, radSchnitte, meId]);

  // ── Wer darf gerade etwas bestimmen? ────────────────────
  // 🔴 Weg B (Andi, 27.08.2026: „ja b"). Die Ablage stand seit heute Mittag,
  // gelesen wurde sie auch — nur SCHREIBEN konnte niemand. Ein Recht, das man
  // hat und nicht ausüben kann, ist kein Recht.
  //
  // ⚠️ Gewählt wird für den NÄCHSTEN Spieltag: man gewinnt an n und bestimmt
  // für n+1. `offenesRecht` rechnet das aus derselben Punkte-Liste, aus der
  // auch die Wertung liest (Frage 4 der Runden-Schicht) — nicht nachgerechnet.
  const offen = useMemo(() => offenesRecht({
    rules, ausuebungen, spieltagsPunkte: tagesPunkte,
    spieltag: Number.isFinite(spieltag) ? spieltag + 1 : null,
  }), [rules, ausuebungen, tagesPunkte, spieltag]);
  const binDran = offen?.userId != null && offen.userId === meId;

  // Für das Topspiel-Recht: die Spiele DES Spieltags, um den es geht.
  // 🔴 Über `rundenSpieltagVon`, nicht über den Liga-Spieltag — sonst stünden
  // in einer Runde über fünf Wettbewerbe fünf verschiedene „Spieltag 6" zur
  // Wahl (CLAUDE.md, zweite Frage der Runden-Schicht).
  const spieleZurWahl = useMemo(() => {
    if (!offen) return [];
    return (matches ?? []).filter((m) => rundenSpieltagVon(achse, m) === offen.spieltag);
  }, [matches, achse, offen]);

  const uebeAus = async (angebotKey, wert) => {
    if (!binDran || sendet) return;
    setSendet(true);
    try {
      await getStore().ueberechtAus({
        roundId, userId: meId, matchday: offen.spieltag, angebotKey, wert: wert ?? null,
      });
      // ⚠️ Neu LESEN statt lokal anhängen: wer zuerst da war, gewinnt, und das
      // entscheidet die Ablage — nicht dieser Screen. Hängte er die eigene
      // Wahl blind an, zeigte er eine Ansage, die es gar nicht gibt.
      setAusuebungen(await getStore().listRechteAusgeuebt({ roundId }));
      setWahl(null);
    } finally {
      setSendet(false);
    }
  };

  // ── Wann fällt was weg ──────────────────────────────────
  const fristen = useMemo(
    () => ablaeufe(rules, {
      matches: matches ?? [], spieltag, schluessel,
      einsaetze, userId: meId,
    }),
    [rules, matches, spieltag, schluessel, einsaetze, meId]);
  const dringend = naechsterAblauf(fristen);

  return (
    <div style={{
      minHeight: "100vh", background: C.ink, color: C.text, fontFamily: SCHRIFT,
      padding: "28px 16px", display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <BackLink href="/hub" label="Tippspiel" />
        <h1 style={{
          fontSize: "0.75rem", letterSpacing: 2, color: C.muted,
          textTransform: "uppercase", margin: "18px 0 14px",
        }}>Was in dieser Runde läuft</h1>

        {matches == null && (
          <div style={{ fontFamily: MONO, fontSize: "0.8125rem", color: C.muted }}>lädt …</div>
        )}

        {matches != null && (
          <>
            {/* 🔴 Das Dringendste zuerst — es ist die einzige Auskunft hier,
                auf die man HANDELN muss. */}
            {dringend && (
              <div style={{
                background: `${C.akzent}14`, border: `1px solid ${C.akzent}55`,
                borderRadius: RUND.karte, padding: "11px 13px", marginBottom: 12,
                fontSize: "0.8125rem", lineHeight: 1.5,
              }}>⏳ {dringend.text}</div>
            )}

            <Karte titel="Wer hält noch was">
              {stand.length === 0 && (
                <div style={{ fontSize: "0.75rem", color: C.muted, lineHeight: 1.5 }}>
                  Noch keine Mitspieler mit Stand — sobald getippt wird, steht es hier.
                </div>
              )}
              {stand.map((z) => (
                <div key={z.userId} style={{
                  display: "flex", justifyContent: "space-between", gap: 10,
                  alignItems: "baseline", padding: "6px 0",
                  borderTop: `1px solid ${C.line}`,
                }}>
                  <span style={{
                    fontSize: "0.8125rem", fontWeight: z.userId === meId ? 700 : 400,
                    color: z.userId === meId ? C.akzent : C.text,
                  }}>{z.name}</span>
                  <span style={{ fontSize: "0.6875rem", color: C.muted, textAlign: "right" }}>
                    {standText(z.stand) || "—"}
                  </span>
                </div>
              ))}
            </Karte>

            {/* 🔴 Das Recht des Spieltagssiegers (Weg B). Steht ganz oben, weil
                es das Einzige auf dieser Seite ist, das VERGEHT — der Spieltag
                fängt an, ob gewählt wurde oder nicht. */}
            {offen && (
              <Karte titel={binDran ? "Du bist dran" : "Jemand darf bestimmen"}
                ton={binDran ? C.akzent : null}>
                <div style={{ fontSize: "0.8125rem", lineHeight: 1.5, marginBottom: binDran ? 10 : 0 }}>
                  {binDran ? (
                    <>Du hast Spieltag {offen.gewonnenAm} gewonnen und bestimmst für
                    Spieltag {offen.spieltag}.</>
                  ) : (
                    <><strong style={{ color: C.text }}>{namen.get(offen.userId) ?? offen.userId}</strong>{" "}
                    hat Spieltag {offen.gewonnenAm} gewonnen und bestimmt für
                    Spieltag {offen.spieltag}.</>
                  )}
                </div>

                {binDran && offen.angebote.map((a) => {
                  const gewaehlt = wahl?.angebotKey === a.key;
                  return (
                    <div key={a.key} style={{ borderTop: `1px solid ${C.line}`, paddingTop: 8, marginTop: 8 }}>
                      <div style={{ fontSize: "0.8125rem", fontWeight: 600 }}>{beschreibeAngebot(a)}</div>
                      {a.art === "bigGame" ? (
                        <>
                          {/* ⚠️ Nur die Spiele DIESES Spieltags — ein Topspiel
                              aus einer anderen Woche wäre keine Wahl, sondern
                              ein Fehler, den erst die Wertung bemerkt. */}
                          <select
                            value={gewaehlt ? wahl.wert : ""}
                            onChange={(e) => setWahl({ angebotKey: a.key, wert: e.target.value })}
                            style={{
                              display: "block", width: "100%", boxSizing: "border-box", marginTop: 6,
                              background: C.ink2, color: C.text, border: `1px solid ${C.line}`,
                              borderRadius: RUND.karte, padding: "8px 9px",
                              fontSize: "0.8125rem", fontFamily: "inherit",
                            }}>
                            <option value="">— Spiel wählen —</option>
                            {spieleZurWahl.map((m) => (
                              <option key={m.id ?? m.matchId} value={m.id ?? m.matchId}>
                                {m.home ?? m.heim ?? "?"} – {m.away ?? m.gast ?? "?"}
                              </option>
                            ))}
                          </select>
                          {spieleZurWahl.length === 0 && (
                            <div style={{ fontSize: "0.6875rem", color: C.muted, marginTop: 5, lineHeight: 1.4 }}>
                              Für Spieltag {offen.spieltag} stehen noch keine Spiele fest.
                            </div>
                          )}
                        </>
                      ) : null}
                      <button
                        disabled={sendet || (a.art === "bigGame" && !(gewaehlt && wahl.wert))}
                        onClick={() => uebeAus(a.key, a.art === "bigGame" ? wahl?.wert : null)}
                        style={{
                          marginTop: 8, cursor: "pointer", fontFamily: "inherit",
                          fontSize: "0.8125rem", fontWeight: 700, width: "100%",
                          padding: "11px 0", borderRadius: RUND.karte,
                          background: `${C.akzent}22`, color: C.akzent,
                          border: `1px solid ${C.akzent}66`,
                          opacity: (sendet || (a.art === "bigGame" && !(gewaehlt && wahl.wert))) ? 0.45 : 1,
                        }}>
                        {sendet ? "…" : "Festlegen"}
                      </button>
                      {/* 🔴 Ohne diesen Satz klickt jemand, weil er es später
                          korrigieren zu können glaubt. Die Ablage lässt das
                          nicht zu, und das ist Absicht. */}
                      <div style={{ fontSize: "0.6875rem", color: C.muted, marginTop: 5, lineHeight: 1.4 }}>
                        ⚠️ Steht fest, sobald du drückst — zurücknehmen geht nicht.
                      </div>
                    </div>
                  );
                })}
              </Karte>
            )}

            {/* Was für diesen Spieltag schon bestimmt wurde. */}
            {(() => {
              const schon = ausuebungenFuer(ausuebungen, offen?.spieltag ?? (Number.isFinite(spieltag) ? spieltag + 1 : null));
              if (!schon.length) return null;
              return (
                <Karte titel="Für den nächsten Spieltag bestimmt">
                  {schon.map((a) => (
                    <div key={a.angebotKey} style={{
                      fontSize: "0.75rem", lineHeight: 1.5, padding: "5px 0",
                      borderTop: `1px solid ${C.line}`,
                    }}>{beschreibeAusuebung(a, rules, (id) => namen.get(id) ?? id)}</div>
                  ))}
                </Karte>
              );
            })()}

            {/* 🔴 Andi, 27.08.2026: „einen Eintrag für die Auslösung (mittels
                Glücksrad) für die Ereignisse". Eine Rücksetzung ist die
                einzige Wirkung, die man dem Kontostand später nicht mehr
                ansieht — ohne diese Zeile wüsste niemand, warum jemand
                plötzlich wieder Joker hat. */}
            {radSchnitte.length > 0 && (
              <Karte titel="Am Rad gezogen">
                {radSchnitte.map((r, i) => (
                  <div key={`${r.userId}-${r.ziel}-${i}`} style={{
                    display: "flex", justifyContent: "space-between", gap: 10,
                    alignItems: "baseline", padding: "6px 0", borderTop: `1px solid ${C.line}`,
                  }}>
                    <span style={{
                      fontSize: "0.8125rem",
                      fontWeight: r.userId === meId ? 700 : 400,
                      color: r.userId === meId ? C.akzent : C.text,
                    }}>{namen.get(r.userId) ?? r.userId}</span>
                    <span style={{ fontSize: "0.6875rem", color: C.muted, textAlign: "right" }}>
                      {beschreibeSchnitt(r)}
                    </span>
                  </div>
                ))}
              </Karte>
            )}

            <Karte titel={`Ereignisse (${ereignisse.length})`}>
              {ereignisse.length === 0 && (
                <div style={{ fontSize: "0.75rem", color: C.muted, lineHeight: 1.5 }}>
                  Bisher ist kein Ereignis eingetreten. ⚠️ Das heißt nicht, dass keins
                  eingestellt ist — viele lösen erst nach ein paar Spieltagen aus.
                </div>
              )}
              {ereignisse.slice(-12).reverse().map((v, i) => (
                <div key={`${v.key}-${v.userId}-${i}`} style={{
                  display: "flex", justifyContent: "space-between", gap: 10,
                  alignItems: "baseline", padding: "6px 0", borderTop: `1px solid ${C.line}`,
                }}>
                  <span style={{ fontSize: "0.75rem" }}>
                    <span style={{ color: C.muted, fontFamily: MONO }}>ST {v.matchday ?? "—"}</span>{" "}
                    <strong style={{ color: v.userId === meId ? C.akzent : C.text }}>
                      {namen.get(v.userId) ?? v.userId}
                    </strong>
                  </span>
                  <span style={{ fontSize: "0.6875rem", color: C.muted, textAlign: "right" }}>
                    {v.text ?? v.ereignisText ?? "—"}
                  </span>
                </div>
              ))}
            </Karte>

            {/* 🔴 Die Auskunft, die es bisher NIRGENDS gab: die Regel stand im
                Regelwerk, das Datum an keiner Stelle. */}
            <Karte titel="Wann fällt was weg">
              {fristen.map((f) => (
                <div key={f.was + f.wann} style={{
                  fontSize: "0.75rem", lineHeight: 1.5, padding: "5px 0",
                  color: f.wann === "spieltag" ? C.text : C.muted,
                  borderTop: `1px solid ${C.line}`,
                }}>{f.text}</div>
              ))}
            </Karte>
          </>
        )}
      </div>
    </div>
  );
}
