"use client";

import { useEffect, useState } from "react";
import { getStore } from "@/lib/store";
import { useAuth } from "@/components/AuthProvider";
import { useCurrentRound } from "@/components/RoundProvider";
import BackLink from "@/components/BackLink";
import { DEFAULT_RULES, sanitizeRules } from "@/lib/engine";
import { zeitachse, rundenSpieltagVon, achsenLabel, bespielteSpieltage } from "@/lib/zeitachse";
import { naechstesOffenesSpiel } from "@/lib/muenzstand";
import {
  jokerPlan, sichtbareSpieltage, fortschritt, uebersicht, beschreibeVerteilung,
  sanitizeVerteilung,
} from "@/lib/jokerPlan";
import { kontingent, erspielteJoker, standText } from "@/lib/jokerKontingent";
import { C, MONO } from "@/lib/theme";

// ── „Meine Joker" — die fehlende Anzeige WÄHREND der Runde ───
//
// Die Joker-Verteilung (`rules.joker.verteilung`) war bis 05.08.2026 nur an
// zwei Orten sichtbar: in der Admin-Vorschau beim Anlegen der Runde und als
// halber Satz in der Tippabgabe, für genau das eine Spiel, das gerade offen
// ist. Wie viele Joker man hat, welche Spieltage sie tragen und wie weit man
// ist, konnte ein Spieler nirgends nachsehen.
//
// 🔴 `jokerPlan.js` hat für all das längst Funktionen — `sichtbareSpieltage`,
// `fortschritt`, `uebersicht` —, sie wurden nur von keiner Oberfläche benutzt.
// Nach dem Baukasten-Grundsatz ist eine Einstellung, deren Wirkung man nicht
// sehen kann, nicht fertig.
//
// ⚠️ Alles hier rechnet in RUNDEN-Spieltagen. Der Plan verteilt darüber
// (`drehradPlan` genauso), und der Liga-Spieltag ist in einer Runde über
// mehrere Wettbewerbe eine andere Zahl. Genau daran hing der Fehler, der dem
// Bau dieser Ansicht vorausging: gemessen 27 Joker-Spieltage statt der 11, die
// der Plan vorsieht.
//
// ⚠️ Und: VERDECKT bleibt verdeckt. `sichtbareSpieltage` liefert bei
// `sichtbarkeit: "verdeckt"` nur die bereits gespielten Tage — diese Ansicht
// darf daran nicht vorbeirechnen, sonst nimmt sie der Einstellung ihren Sinn.
export default function MeineJoker() {
  const { user } = useAuth();
  const { roundId } = useCurrentRound();
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [matches, setMatches] = useState(null);
  const [meineTips, setMeineTips] = useState([]);
  const [board, setBoard] = useState([]);
  const [eintraege, setEintraege] = useState([]);
  const [radJoker, setRadJoker] = useState([]);

  useEffect(() => {
    let live = true;
    Promise.all([
      getStore().getRound(roundId),
      // Die Spiele DIESER Runde — die Achse unten muss dieselbe sein wie im
      // Store, sonst zählt diese Ansicht andere Spieltage als die Wertung.
      getStore().listRoundMatches(roundId),
      getStore().listTips({ roundId }),
      getStore().getLeaderboard(roundId),
      getStore().getRoundEntries(roundId),
      getStore().getDrehradBelohnungen?.(roundId) ?? Promise.resolve(null),
    ]).then(([round, ms, tips, brd, entries, rad]) => {
      if (!live) return;
      setRules(sanitizeRules(round?.rules ?? DEFAULT_RULES));
      setMatches(ms);
      setMeineTips((tips ?? []).filter((t) => t.user_id === user?.id));
      setBoard(brd ?? []);
      setEintraege(entries ?? []);
      setRadJoker(rad?.joker ?? []);
    }).catch(() => {});
    return () => { live = false; };
  }, [roundId, user]);

  const jokerAn = rules.joker?.enabled === true;
  const verteilung = sanitizeVerteilung(rules.joker?.verteilung);

  const achse = zeitachse(matches ?? [], rules.zeitachse);
  const spieltage = achse.length || 34;
  const naechstes = naechstesOffenesSpiel(matches ?? [], new Date());
  const jetzt = naechstes ? rundenSpieltagVon(achse, naechstes) : null;
  // Ohne anstehendes Spiel ist die Saison durch — dann gilt alles als gespielt.
  const bis = jetzt ?? spieltage;

  const userIds = board.map((b) => b.userId);
  const nameVon = (id) => board.find((b) => b.userId === id)?.name ?? id;
  // `bespielt`: ein Joker in der Länderspielpause wäre unbenutzbar.
  const plan = jokerPlan({
    spieltage, bespielt: bespielteSpieltage(achse),
    verteilung, seed: roundId ?? "", userIds,
  });

  // Dieselben Umrechnungen wie in der Tippabgabe: Tipps und Gutschriften im
  // RUNDEN-Spieltag, sonst zählt `kontingent` gegen die falsche Skala.
  const matchVon = new Map((matches ?? []).map((m) => [m.id, m]));
  const meineTipsRunde = meineTips.map((t) => {
    const m = matchVon.get(t.match_id);
    return {
      userId: t.user_id, wettbewerb: null,
      matchday: m ? rundenSpieltagVon(achse, m) : null,
      joker: t.tip?.joker === true,
    };
  });
  const gutschriften = [
    ...erspielteJoker({ eintraege: eintraege.filter((e) => e.userId === user?.id), rules })
      .map((g) => {
        const runde = rundenSpieltagVon(achse, { wettbewerb: g.wettbewerb, matchday: g.matchday });
        return runde == null ? g : { ...g, matchday: runde };
      }),
    ...radJoker.filter((g) => g.userId === user?.id),
  ];

  const stand = kontingent({
    plan, gutschriften, tipps: meineTipsRunde, userId: user?.id, bisSpieltag: bis,
  });
  const meinFortschritt = fortschritt(plan, user?.id, bis);
  const sichtbar = sichtbareSpieltage(plan, user?.id, verteilung, bis);
  const gesetzt = new Set(meineTipsRunde.filter((t) => t.joker).map((t) => t.matchday));
  const andere = uebersicht(plan, bis, userIds);

  return (
    <div style={{
      minHeight: "100vh", background: C.ink, color: C.text,
      fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
      padding: "28px 16px", display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <BackLink href="/hub" label="Tippspiel" />
        <h1 style={{ fontSize: 12, letterSpacing: 2, color: C.muted, textTransform: "uppercase", margin: "18px 0 6px" }}>
          Deine Joker
        </h1>

        {matches == null && <div style={{ fontFamily: MONO, fontSize: 13, color: C.muted }}>lädt …</div>}

        {matches != null && !jokerAn && (
          <Kasten>
            In dieser Runde gibt es keinen Joker. Der Admin kann ihn in der
            Spielerstellung einschalten — dort steht auch, wie oft es einen gibt.
          </Kasten>
        )}

        {matches != null && jokerAn && (
          <>
            <p style={{ fontSize: 12.5, color: C.muted, margin: "0 0 14px", lineHeight: 1.5 }}>
              {beschreibeVerteilung(verteilung, spieltage)}
            </p>

            {/* Der Stand — die Zahl, die man sucht, wenn man hier landet. */}
            <div style={{
              background: C.surface, border: `1px solid ${C.gold}44`, borderRadius: 14,
              padding: "13px 15px", marginBottom: 14,
            }}>
              <div style={{ fontSize: 11, color: C.gold, textTransform: "uppercase", letterSpacing: 1 }}>
                Stand
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>
                {meinFortschritt.text || "—"}
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 1.45 }}>
                {standText(stand) || "Noch nichts verbraucht."}
              </div>
            </div>

            {/* Die Spieltage. `null` = Modus „frei": jeder Spieltag trägt einen. */}
            <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>
              {sichtbar === null ? "Jeder Spieltag" : "Deine Joker-Spieltage"}
            </div>
            {sichtbar === null ? (
              <Kasten>
                In dieser Runde trägt jeder Spieltag einen Joker — du entscheidest
                nur, auf welches Spiel du ihn setzt.
              </Kasten>
            ) : sichtbar.length === 0 ? (
              <Kasten>
                {verteilung.sichtbarkeit === "verdeckt"
                  ? "Bisher war keiner deiner Joker-Spieltage dran. Welcher als Nächstes kommt, bleibt verdeckt."
                  : "Für dich ist in dieser Runde kein Joker-Spieltag vorgesehen."}
              </Kasten>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {sichtbar.map((t) => {
                  const benutzt = gesetzt.has(t);
                  const kommt = t > bis;
                  return (
                    <span key={t} title={achsenLabel(achse[t - 1]) || undefined} style={{
                      fontFamily: MONO, fontSize: 12, borderRadius: 999, padding: "5px 11px",
                      background: benutzt ? `${C.mint}22` : kommt ? C.surface : C.surface2,
                      color: benutzt ? C.mint : kommt ? C.gold : C.muted,
                      border: `1px solid ${benutzt ? C.mint + "66" : kommt ? C.gold + "55" : C.line}`,
                    }}>
                      ST {t}{benutzt ? " ✓" : ""}
                    </span>
                  );
                })}
              </div>
            )}
            <p style={{ fontSize: 10.5, color: C.muted, marginTop: 8, lineHeight: 1.45 }}>
              {verteilung.sichtbarkeit === "verdeckt"
                ? "Gezeigt sind nur die Spieltage, die schon dran waren — die kommenden bleiben verdeckt. "
                : "Alle Spieltage stehen vorab fest. "}
              Ein Haken heißt: dort hast du deinen Joker gesetzt.
            </p>

            {/* Die Mitspieler. Bei verdeckter Reihenfolge haben zwei Spieler
                mitten in der Saison zwangsläufig unterschiedlich viele Joker
                gehabt — ohne diese Zeile sieht das nach Bevorzugung aus. Genau
                dafür gibt es `uebersicht`. */}
            {andere.length > 1 && plan.modus === "kontingent" && (
              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>
                  Bei den anderen
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {andere.map((o) => (
                    <div key={o.userId} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "baseline",
                      background: C.surface, border: `1px solid ${C.line}`,
                      borderRadius: 12, padding: "7px 12px",
                    }}>
                      <span style={{ fontSize: 12.5 }}>{nameVon(o.userId)}</span>
                      <span style={{ fontFamily: MONO, fontSize: 12, color: C.muted }}>{o.text}</span>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 10.5, color: C.muted, marginTop: 8, lineHeight: 1.45 }}>
                  Jeder hat eigene Joker-Spieltage. Dass mitten in der Saison
                  unterschiedlich viele davon dran waren, gehört dazu — über die
                  ganze Runde bekommt jeder gleich viele.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Kasten({ children }) {
  return (
    <div style={{
      background: C.ink2, border: `1px solid ${C.line}`, borderRadius: 14,
      padding: "14px 16px", fontSize: 13, color: C.muted, lineHeight: 1.5, marginBottom: 12,
    }}>{children}</div>
  );
}
