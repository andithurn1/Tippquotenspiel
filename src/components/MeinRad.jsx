"use client";

import { useEffect, useState } from "react";
import { getStore } from "@/lib/store";
import { useAuth } from "@/components/AuthProvider";
import { useCurrentRound } from "@/components/RoundProvider";
import BackLink from "@/components/BackLink";
import Gluecksrad from "@/components/Gluecksrad";
import { DEFAULT_RULES, sanitizeRules } from "@/lib/engine";
import { zeitachse, rundenSpieltagVon } from "@/lib/zeitachse";
import { naechstesOffenesSpiel } from "@/lib/muenzstand";
import { wahrscheinlichkeiten, auswerten, beschreibeDrehrad, BELOHNUNGS_TYPEN } from "@/lib/drehrad";
import { drehradZiehungen } from "@/lib/drehradBoard";
import { C, MONO } from "@/lib/theme";
import { zahl } from "@/lib/format";

// ── Das Rad aus Sicht des Spielers (design/drehrad.md 3c) ───
//
// Bis hierher gab es das Rad nur in der Admin-Oberfläche: der Creator konnte
// eine Feldtabelle schreiben, und die Punkte landeten still im Leaderboard.
// WO der Spieler seine eigene Drehung sieht, gab es nicht — die Ebene war
// vorhanden und unsichtbar.
//
// 🔴 Es wird nichts gespeichert und nichts „ausgelöst". Der Ausgang steht
// fest, sobald der Spieltag da ist: `ziehe` ist deterministisch aus
// (Runden-Id, Nutzer, Spieltag) plus der eigenen Vorgeschichte
// (drehrad.md 2.5). Diese Ansicht RECHNET ihn nach — ein Neuladen zeigt
// dasselbe, und ein Knopf „drehen" wäre eine Lüge über den Zeitpunkt.
//
// ⚠️ Alles hier rechnet in RUNDEN-Spieltagen, so wie `drehradPlan`. Der
// Liga-Spieltag ist eine andere Zahl (in einer Runde über fünf Wettbewerbe
// weit auseinander) — genau die Verwechslung, die im Store schon einmal die
// Drehung auf den falschen Tag gelegt hat.
export default function MeinRad() {
  const { user } = useAuth();
  const { roundId } = useCurrentRound();
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [matches, setMatches] = useState(null);
  const [tips, setTips] = useState([]);
  const [board, setBoard] = useState([]);

  useEffect(() => {
    let live = true;
    Promise.all([
      getStore().getRound(roundId), getStore().listMatches(),
      getStore().listTips({ roundId }), getStore().getLeaderboard(roundId),
    ]).then(([round, ms, ts, brd]) => {
      if (!live) return;
      setRules(sanitizeRules(round?.rules ?? DEFAULT_RULES));
      setMatches(ms);
      setTips(ts ?? []);
      setBoard(brd ?? []);
    }).catch(() => {});
    return () => { live = false; };
  }, [roundId]);

  const cfg = rules.drehrad;
  const aktiv = cfg?.enabled === true;
  const felder = Array.isArray(cfg?.felder) ? cfg.felder : [];
  const anteile = wahrscheinlichkeiten(felder);

  const achse = zeitachse(matches ?? [], rules.zeitachse);
  const naechstes = naechstesOffenesSpiel(matches ?? [], new Date());
  const jetzt = naechstes ? rundenSpieltagVon(achse, naechstes) : null;

  // Dieselben Eingaben wie im Store, damit die Anzeige nicht eine andere
  // Ziehung zeigt als die, die im Leaderboard zählt — es gibt nur EINE
  // Rechnung, `drehradZiehungen`.
  const matchVon = new Map((matches ?? []).map((m) => [m.id, m]));
  const kontext = user ? {
    board,
    tipps: (tips ?? []).map((t) => {
      const m = matchVon.get(t.match_id);
      return { userId: t.user_id, matchId: t.match_id, matchday: m ? rundenSpieltagVon(achse, m) : null };
    }),
    adminFreigaben: [],
    letzteEinsaetze: [],
  } : null;

  const meine = (aktiv && user && matches)
    ? drehradZiehungen({
      rules, rundenId: roundId, userIds: [user.id],
      spieltage: achse.length || 34, kontext,
    })
    : [];

  // `auswerten` setzt den Saison-Deckel durch — die Anzeige muss denselben
  // Wert zeigen wie die Gutschrift, nicht den ungedeckelten Wunschbetrag.
  const { gutschriften, gedeckelt } = auswerten(cfg, meine);
  const gutschriftVon = new Map(gutschriften.map((g) => [`${g.spieltag}`, g]));
  const feldVon = new Map(felder.map((f) => [f.id, f]));

  // Vergangene und kommende Drehungen trennen: das Rad oben zeigt die
  // JÜNGSTE bereits gefallene, denn eine kommende ist noch keine Aussage.
  const gefallen = jetzt == null ? meine : meine.filter((z) => z.spieltag <= jetzt);
  const kommend = jetzt == null ? [] : meine.filter((z) => z.spieltag > jetzt);
  const letzte = gefallen[gefallen.length - 1] ?? null;

  return (
    <div style={{
      minHeight: "100vh", background: C.ink, color: C.text,
      fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
      padding: "28px 16px", display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <BackLink href="/hub" label="Tippspiel" />
        <h1 style={{ fontSize: 12, letterSpacing: 2, color: C.muted, textTransform: "uppercase", margin: "18px 0 6px" }}>
          Dein Glücksrad
        </h1>

        {matches == null && <div style={{ fontFamily: MONO, fontSize: 13, color: C.muted }}>lädt …</div>}

        {matches != null && !aktiv && (
          <Kasten>
            In dieser Runde gibt es kein Glücksrad. Der Admin kann es in der
            Spielerstellung anlegen — Felder, Größen und Belohnungen schreibt er selbst.
          </Kasten>
        )}

        {matches != null && aktiv && (
          <>
            <p style={{ fontSize: 12.5, color: C.muted, margin: "0 0 14px", lineHeight: 1.5 }}>
              {beschreibeDrehrad(cfg, achse.length || 34)}
            </p>

            {/* ⚠️ Kein Knopf „drehen". Der Ausgang steht fest, sobald der
                Spieltag da ist — ein Knopf würde behaupten, der Spieler
                entscheide den Zeitpunkt. Die Drehung ist nur die Anzeige. */}
            <Gluecksrad felder={felder} anteile={anteile} ergebnisId={letzte ? letzte.feldId : null} />

            {letzte && (
              <div style={{
                background: C.surface, border: `1px solid ${C.gold}44`, borderRadius: 14,
                padding: "12px 15px", marginTop: 12,
              }}>
                <div style={{ fontSize: 11, color: C.gold, textTransform: "uppercase", letterSpacing: 1 }}>
                  Spieltag {letzte.spieltag}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>
                  {feldVon.get(letzte.feldId)?.label || "—"}
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 1.45 }}>
                  {belohnungsText(gutschriftVon.get(`${letzte.spieltag}`)?.belohnung
                    ?? feldVon.get(letzte.feldId)?.belohnung)}
                </div>
              </div>
            )}

            {!letzte && (
              <Kasten>
                {kommend.length
                  ? `Für dich ist noch keine Drehung gefallen — die nächste steht an Spieltag ${kommend[0].spieltag} an.`
                  : "Für dich ist in dieser Runde keine Drehung vorgesehen. Woran das liegt, steht oben: "
                    + "wer drehen darf und wie oft, entscheidet der Admin — und ohne Tipp gibt es keine Drehung."}
              </Kasten>
            )}

            {/* Alle bisherigen Drehungen — nachvollziehbar, nicht nur die letzte. */}
            {gefallen.length > 1 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>Bisher</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[...gefallen].reverse().map((z) => (
                    <div key={z.spieltag} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10,
                      background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: "8px 12px",
                    }}>
                      <span style={{ fontFamily: MONO, fontSize: 11, color: C.muted }}>ST {z.spieltag}</span>
                      <span style={{ fontSize: 12.5, flex: 1 }}>{feldVon.get(z.feldId)?.label || "—"}</span>
                      <span style={{ fontSize: 11.5, color: C.muted }}>
                        {belohnungsText(gutschriftVon.get(`${z.spieltag}`)?.belohnung
                          ?? feldVon.get(z.feldId)?.belohnung, true)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gedeckelte Auszahlungen benennen, statt sie stillschweigend zu
                kürzen — sonst rechnet der Spieler mit einer Zahl, die er nie
                bekommen hat. */}
            {gedeckelt.length > 0 && (
              <p style={{ fontSize: 11, color: C.muted, marginTop: 12, lineHeight: 1.45 }}>
                Der Saison-Deckel dieser Runde ist erreicht: {gedeckelt.length}{" "}
                {gedeckelt.length === 1 ? "Gewinn wurde" : "Gewinne wurden"} deshalb gekürzt.
              </p>
            )}

            {kommend.length > 0 && (
              <p style={{ fontSize: 11, color: C.muted, marginTop: 12, lineHeight: 1.45 }}>
                Nächste Drehung an Spieltag {kommend[0].spieltag}. Was dabei herauskommt,
                steht erst fest, wenn der Spieltag da ist.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Belohnung in Alltagssprache. `kurz` für die Listenzeile.
function belohnungsText(belohnung, kurz = false) {
  if (!belohnung) return "—";
  const label = BELOHNUNGS_TYPEN.find((t) => t.key === belohnung.typ)?.label ?? belohnung.typ;
  if (belohnung.typ === "nichts") return kurz ? "—" : "Diesmal nichts.";
  if (belohnung.typ === "punkte") {
    // Das Feld heißt `betrag` (siehe `sanitizeBelohnung` in drehrad.js) — hier
    // stand kurzzeitig ein `?? belohnung.punkte` als Absicherung. Genau solche
    // Absicherungen verstecken eine falsche Annahme, statt sie auffallen zu
    // lassen: hätte das Feld anders geheißen, stünde jetzt überall 0 und
    // niemand wüsste warum. Nachgesehen statt abgesichert.
    return kurz ? `+${zahl(belohnung.betrag)}` : `${zahl(belohnung.betrag)} Punkte gehen auf dein Konto.`;
  }
  return kurz ? label : `${label}.`;
}

function Kasten({ children }) {
  return (
    <div style={{
      background: C.ink2, border: `1px solid ${C.line}`, borderRadius: 14,
      padding: "14px 16px", fontSize: 13, color: C.muted, lineHeight: 1.5, marginTop: 12,
    }}>{children}</div>
  );
}
