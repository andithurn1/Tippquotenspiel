"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getStore } from "@/lib/store";
import { useAuth } from "@/components/AuthProvider";
import { useCurrentRound } from "@/components/RoundProvider";
import BackLink from "@/components/BackLink";
import { DEFAULT_RULES, sanitizeRules } from "@/lib/engine";
import { zeitachse } from "@/lib/zeitachse";
import { fahrplan, aktuellerRundenSpieltag, beschreibeFahrplan } from "@/lib/saisonfahrplan";
import { C, MONO } from "@/lib/theme";
import { TAPZIEL } from "@/lib/tapziel";

// ── Der Saison-Fahrplan aus Sicht des Spielers ──────────────
//
// „Im zeitlichen Verlauf der Saison müssen nach und nach die Freischaltungen
// und aktuellen Stände sichtbar werden" (Andi, 05.08.2026). Bis hierher konnte
// ein Spieler nachsehen, ob er JETZT tippen darf — aber nicht, was nächste
// Woche aufgeht, wann sein nächster Joker fällt oder bis wann eine Saison-Wette
// offen ist. Jede dieser Freischaltungen war einzeln richtig gerechnet und
// nirgends zusammen zu sehen.
//
// 🔴 Dieser Screen RECHNET NICHTS. Er zeigt `fahrplan()`, und das Modul holt
// jede Spalte aus dem Modul, dem sie gehört. Genau so wenig wie `MeinRad`
// seine Ziehung nachrechnet — die Lehre aus den 17 Funden des
// Anzeige-Durchgangs (Architektur-Regel 5).
//
// ⚠️ Die Route heißt `/fahrplan`, nicht `/verlauf`: `/ranking/verlauf` gibt es
// schon (der Punkte-Verlauf im Ranking). Zwei Screens mit „Verlauf" im Pfad
// beantworten verschiedene Fragen — der eine „wer lag wann vorne", dieser hier
// „was geht wann auf".
//
// Standard ist die AUSSCHNITT-Ansicht: der aktuelle Spieltag und was
// drumherum liegt. Eine Liste mit 42 Zeilen beantwortet die Frage „was kommt
// als Nächstes" schlechter als sechs.
const FENSTER_ZURUECK = 2;
const FENSTER_VOR = 6;

export default function SaisonVerlauf() {
  const { user } = useAuth();
  const { roundId } = useCurrentRound();
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [matches, setMatches] = useState(null);
  const [zeilen, setZeilen] = useState([]);
  const [jetztTag, setJetztTag] = useState(null);
  const [alle, setAlle] = useState(false);

  useEffect(() => {
    let live = true;
    Promise.all([
      getStore().getRound(roundId),
      // Die Spiele DIESER Runde — sonst zählt der Fahrplan andere Spieltage
      // als der Store (Architektur-Regel 5).
      getStore().listRoundMatches(roundId),
      getStore().listTips({ roundId }),
      getStore().getLeaderboard(roundId),
      getStore().getLeaderboardHistory(roundId),
    ]).then(([round, ms, tips, board, history]) => {
      if (!live) return;
      const r = sanitizeRules(round?.rules ?? DEFAULT_RULES);
      setRules(r);
      setMatches(ms);
      const achse = zeitachse(ms, r.zeitachse);
      setJetztTag(aktuellerRundenSpieltag(achse, ms));
      setZeilen(fahrplan({
        matches: ms, rules: r, roundId, userId: user?.id,
        userIds: (board ?? []).map((b) => b.userId),
        history: history ?? [],
        meineTips: (tips ?? []).filter((t) => t.user_id === user?.id),
      }));
    }).catch(() => {});
    return () => { live = false; };
  }, [roundId, user]);

  const sichtbar = alle || jetztTag == null
    ? zeilen
    : zeilen.filter((z) => z.nummer >= jetztTag - FENSTER_ZURUECK
      && z.nummer <= jetztTag + FENSTER_VOR);

  return (
    <div style={{
      minHeight: "100vh", background: C.ink, color: C.text,
      fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
      padding: "28px 16px", display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <div style={{ width: "100%", maxWidth: 520 }}>
        <BackLink href="/hub" label="Tippspiel" />
        <h1 style={{ fontSize: 12, letterSpacing: 2, color: C.muted, textTransform: "uppercase", margin: "18px 0 6px" }}>
          Saison-Fahrplan
        </h1>

        {matches == null && <div style={{ fontFamily: MONO, fontSize: 13, color: C.muted }}>lädt …</div>}

        {matches != null && (
          <>
            <p style={{ fontSize: 12.5, color: C.muted, margin: "0 0 14px", lineHeight: 1.5 }}>
              {beschreibeFahrplan(zeilen, jetztTag)}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {sichtbar.map((z) => <Zeile key={z.nummer} z={z} jetzt={z.nummer === jetztTag} />)}
            </div>

            {zeilen.length > sichtbar.length && (
              <button onClick={() => setAlle(true)} style={{
                marginTop: 12, width: "100%", cursor: "pointer",
                background: C.surface2, color: C.text, border: `1px solid ${C.line}`,
                ...TAPZIEL, borderRadius: 12, padding: "10px 0", fontSize: 13, fontFamily: "inherit",
              }}>
                Alle {zeilen.length} Spieltage zeigen
              </button>
            )}

            {/* Was die Marken bedeuten. Ohne Legende ist ein Punkt am Rand
                eine Frage statt einer Antwort. */}
            <div style={{ fontSize: 10.5, color: C.muted, marginTop: 14, lineHeight: 1.6 }}>
              <b style={{ color: C.gold }}>🃏</b> dein Joker-Spieltag ·{" "}
              <b style={{ color: C.sky }}>🎡</b> Drehung am Rad ·{" "}
              <b style={{ color: C.mint }}>★</b> Saison-Wette öffnet oder schließt.
              {rules.joker?.verteilung?.sichtbarkeit === "verdeckt" && (
                <> Kommende Joker-Spieltage sind in dieser Runde verdeckt — sie
                tauchen erst auf, wenn sie dran waren.</>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Zeile({ z, jetzt }) {
  const vorbei = z.zustand === "vorbei";
  const rand = jetzt ? C.gold : vorbei ? C.line : `${C.sky}33`;
  return (
    <div style={{
      background: jetzt ? C.surface : C.ink2, border: `1px solid ${rand}`,
      borderRadius: 14, padding: "10px 13px", opacity: vorbei ? 0.65 : 1,
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{
          fontFamily: MONO, fontSize: 12, fontWeight: jetzt ? 700 : 400,
          color: jetzt ? C.gold : C.muted, minWidth: 34,
        }}>
          ST {z.nummer}
        </span>
        <span style={{ flex: 1, minWidth: 0, fontSize: 12.5 }}>{z.label}</span>
        <span style={{ display: "flex", gap: 5, fontSize: 13 }}>
          {z.joker && <span title="Dein Joker-Spieltag">🃏</span>}
          {z.rad && <span title="Drehung am Glücksrad">🎡</span>}
          {z.saison.length > 0 && (
            <span title={z.saison.map((s) => `${s.label} ${s.was === "oeffnet" ? "öffnet" : "schließt"}`).join(" · ")}
              style={{ color: C.mint }}>★</span>
          )}
        </span>
      </div>

      <div style={{ fontSize: 11, color: C.muted, marginTop: 4, display: "flex", gap: 10, flexWrap: "wrap" }}>
        {/* Was hier steht, ist bewusst SPIELERSPRACHE: „3 von 9 getippt" ist
            die Antwort auf die Frage, mit der jemand herkommt. */}
        <span>
          {z.spiele === 0
            ? "keine Spiele — Pause"
            : `${z.getippt} von ${z.spiele} getippt`}
        </span>
        {z.offen > 0 && (
          <Link href="/tippen" style={{ ...TAPZIEL, display: "inline-flex", alignItems: "center", color: C.gold, textDecoration: "none", paddingLeft: 8 }}>
            {z.offen} {z.offen === 1 ? "Spiel" : "Spiele"} jetzt tippbar →
          </Link>
        )}
        {z.punkte != null && z.punkte !== 0 && (
          <span style={{ fontFamily: MONO, color: z.punkte > 0 ? C.mint : C.coral }}>
            {z.punkte > 0 ? "+" : ""}{z.punkte}
          </span>
        )}
      </div>

      {/* Die Saison-Marken ausgeschrieben — ein Stern allein sagt nicht, WAS
          aufgeht, und genau danach fragt jemand an dieser Stelle. */}
      {z.saison.length > 0 && (
        <div style={{ fontSize: 10.5, color: C.mint, marginTop: 4, lineHeight: 1.45 }}>
          {z.saison.map((s) => `${s.label} ${s.was === "oeffnet" ? "öffnet" : "schließt"}`).join(" · ")}
        </div>
      )}
    </div>
  );
}
