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
import { wahrscheinlichkeiten, auswerten, beschreibeDrehrad, drehradPlan, BELOHNUNGS_TYPEN } from "@/lib/drehrad";
import { EREIGNIS } from "@/lib/ereignisse";
import { C, MONO, SCHRIFT, RUND } from "@/lib/theme";
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
//
// 🔴 Und deshalb rechnet dieser Screen die Ziehung NICHT selbst nach, sondern
// fragt sie beim Store ab (`getDrehradZiehungen`). Bis 05.08.2026 tat er es
// doch — mit anderen Eingaben als die Wertung: `adminFreigaben: []` statt der
// echten Freigaben, und als Tabellenstand den FERTIGEN Stand inklusive der
// Rad-Punkte statt des Standes davor. In einer Runde mit „nur nach Freigabe"
// stand hier „keine Drehung vorgesehen", während im Leaderboard Punkte dafür
// gutgeschrieben waren. Zwei Rechnungen für denselben Wert sind zwei
// Wahrheiten — die eine davon steht im Ranking, die andere liest der Spieler.
export default function MeinRad() {
  const { user } = useAuth();
  const { roundId } = useCurrentRound();
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [matches, setMatches] = useState(null);
  const [ziehungen, setZiehungen] = useState([]);
  const [spieltage, setSpieltage] = useState(34);

  useEffect(() => {
    let live = true;
    Promise.all([
      getStore().getRound(roundId),
      // ⚠️ Die Spiele DIESER Runde: die Zeitachse unten muss dieselbe sein wie
      // im Store, sonst liegt die Drehung auf einem anderen Runden-Spieltag.
      getStore().listRoundMatches(roundId),
      getStore().getDrehradZiehungen(roundId),
    ]).then(([round, ms, rad]) => {
      if (!live) return;
      setRules(sanitizeRules(round?.rules ?? DEFAULT_RULES));
      setMatches(ms);
      setZiehungen(rad?.ziehungen ?? []);
      if (Number.isFinite(rad?.spieltage)) setSpieltage(rad.spieltage);
    }).catch(() => {
      // 🔴 Der Ladezustand hängt an `matches == null`. Ein stiller `catch`,
      // der nichts setzt, lässt den Screen für immer im Ladezustand — am
      // 26.08.2026 an drei Screens gegen ein Live-Supabase gemessen. Ein
      // leeres Array ist die ehrliche Antwort: nichts da, statt gleich kommt was.
      if (live) setMatches([]);
    });
    return () => { live = false; };
  }, [roundId]);

  const cfg = rules.drehrad;
  const aktiv = cfg?.enabled === true;
  const felder = Array.isArray(cfg?.felder) ? cfg.felder : [];
  const anteile = wahrscheinlichkeiten(felder);

  const achse = zeitachse(matches ?? [], rules.zeitachse);
  const naechstes = naechstesOffenesSpiel(matches ?? [], new Date());
  const jetzt = naechstes ? rundenSpieltagVon(achse, naechstes) : null;

  // Die eigenen Drehungen aus der EINEN Rechnung des Stores herausfiltern.
  // ⚠️ Der Deckel wird auf ALLEN Ziehungen der Runde ausgewertet und erst
  // danach gefiltert: `auswerten` setzt den Saison-Deckel je Spieler durch,
  // und wer nur die eigenen Ziehungen hineinreicht, bekommt dasselbe Ergebnis
  // — aber nur, solange der Deckel je Spieler zählt. Auf der ganzen Liste zu
  // rechnen ist die Form, die auch dann noch stimmt, wenn er das einmal nicht
  // mehr tut.
  const meine = user ? ziehungen.filter((z) => z.userId === user.id) : [];
  const { gutschriften: alle, gedeckelt: alleGedeckelt } = auswerten(cfg, ziehungen);
  const gutschriften = user ? alle.filter((g) => g.userId === user.id) : [];
  const gedeckelt = user ? alleGedeckelt.filter((g) => g.userId === user.id) : [];
  const gutschriftVon = new Map(gutschriften.map((g) => [`${g.spieltag}`, g]));
  const feldVon = new Map(felder.map((f) => [f.id, f]));

  // Vergangene und kommende Drehungen trennen: das Rad oben zeigt die
  // JÜNGSTE bereits gefallene, denn eine kommende ist noch keine Aussage.
  const gefallen = jetzt == null ? meine : meine.filter((z) => z.spieltag <= jetzt);
  const letzte = gefallen[gefallen.length - 1] ?? null;

  // 🔴 Die KOMMENDEN Drehungen stehen NICHT in `ziehungen` — und zwar nie.
  // Eine Ziehung entsteht erst, wenn der Spieler den Spieltag getippt hat
  // („kein Rad ohne Tipp", die 5.0-Invariante); für einen künftigen Spieltag
  // ist das per Definition noch nicht der Fall. Der Screen fragte trotzdem
  // `meine.filter(z => z.spieltag > jetzt)` ab und bekam immer eine leere
  // Liste — der Hinweis „die nächste steht an Spieltag X an" war unerreichbar.
  //
  // Die Antwort steht im PLAN, nicht in der Ziehung: `drehradPlan` ist rein
  // aus (Regelwerk, Runden-Id, Spieltage) bestimmt und braucht keinen Tipp.
  // Deshalb entsteht hier auch keine zweite Wahrheit — der Plan sagt WANN
  // gedreht werden KANN, die Ziehung sagt, WAS herauskam.
  const geplant = (aktiv && user)
    ? (drehradPlan({ spieltage, drehrad: cfg, seed: roundId, userIds: [user.id] })
      .proSpieler?.[user.id] ?? [])
    : [];
  const kommend = jetzt == null ? [] : geplant.filter((t) => t > jetzt);

  return (
    <div style={{
      minHeight: "100vh", background: C.ink, color: C.text,
      fontFamily: SCHRIFT,
      padding: "28px 16px", display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <BackLink href="/hub" label="Tippspiel" />
        <h1 style={{ fontSize: "0.75rem", letterSpacing: 2, color: C.muted, textTransform: "uppercase", margin: "18px 0 6px" }}>
          Dein Glücksrad
        </h1>

        {matches == null && <div style={{ fontFamily: MONO, fontSize: "0.8125rem", color: C.muted }}>lädt …</div>}

        {matches != null && !aktiv && (
          <Kasten>
            In dieser Runde gibt es kein Glücksrad. Der Admin kann es in der
            Spielerstellung anlegen — Felder, Größen und Belohnungen schreibt er selbst.
          </Kasten>
        )}

        {matches != null && aktiv && (
          <>
            <p style={{ fontSize: "0.8125rem", color: C.muted, margin: "0 0 14px", lineHeight: 1.5 }}>
              {beschreibeDrehrad(cfg, achse.length || 34)}
            </p>

            {/* ⚠️ Kein Knopf „drehen". Der Ausgang steht fest, sobald der
                Spieltag da ist — ein Knopf würde behaupten, der Spieler
                entscheide den Zeitpunkt. Die Drehung ist nur die Anzeige. */}
            <Gluecksrad felder={felder} anteile={anteile} ergebnisId={letzte ? letzte.feldId : null} />

            {letzte && (
              <div style={{
                background: C.surface, border: `1px solid ${C.akzent}44`, borderRadius: RUND.karte,
                padding: "12px 15px", marginTop: 12,
              }}>
                <div style={{ fontSize: "0.6875rem", color: C.akzent, textTransform: "uppercase", letterSpacing: 1 }}>
                  Spieltag {letzte.spieltag}
                </div>
                <div style={{ fontSize: "0.9375rem", fontWeight: 700, marginTop: 4 }}>
                  {feldVon.get(letzte.feldId)?.label || "—"}
                </div>
                <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 4, lineHeight: 1.45 }}>
                  {belohnungsText(gutschriftVon.get(`${letzte.spieltag}`)?.belohnung
                    ?? feldVon.get(letzte.feldId)?.belohnung)}
                </div>
              </div>
            )}

            {!letzte && (
              <Kasten>
                {kommend.length
                  ? `Für dich ist noch keine Drehung gefallen — die nächste ist für Spieltag ${kommend[0]} vorgesehen. Sie fällt nur, wenn du diesen Spieltag tippst.`
                  : "Für dich ist in dieser Runde keine Drehung vorgesehen. Woran das liegt, steht oben: "
                    + "wer drehen darf und wie oft, entscheidet der Admin — und ohne Tipp gibt es keine Drehung."}
              </Kasten>
            )}

            {/* Alle bisherigen Drehungen — nachvollziehbar, nicht nur die letzte. */}
            {gefallen.length > 1 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: "0.8125rem", fontWeight: 700, marginBottom: 6 }}>Bisher</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[...gefallen].reverse().map((z) => (
                    <div key={z.spieltag} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10,
                      background: C.surface, border: `1px solid ${C.line}`, borderRadius: RUND.karte, padding: "8px 12px",
                    }}>
                      <span style={{ fontFamily: MONO, fontSize: "0.6875rem", color: C.muted }}>ST {z.spieltag}</span>
                      <span style={{ fontSize: "0.8125rem", flex: 1 }}>{feldVon.get(z.feldId)?.label || "—"}</span>
                      <span style={{ fontSize: "0.75rem", color: C.muted }}>
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
              <p style={{ fontSize: "0.6875rem", color: C.muted, marginTop: 12, lineHeight: 1.45 }}>
                Der Saison-Deckel dieser Runde ist erreicht: {gedeckelt.length}{" "}
                {gedeckelt.length === 1 ? "Gewinn wurde" : "Gewinne wurden"} deshalb gekürzt.
              </p>
            )}

            {kommend.length > 0 && (
              <p style={{ fontSize: "0.6875rem", color: C.muted, marginTop: 12, lineHeight: 1.45 }}>
                Nächste Drehung an Spieltag {kommend[0]} — vorausgesetzt, du tippst
                ihn. Was dabei herauskommt, steht erst fest, wenn der Spieltag da ist.
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
  // 🔴 Die Rücksetzung braucht ihren eigenen Satz. Der Sammel-Rückfall darunter
  // würde „Rücksetzung." ausgeben — ein Wort, das dem Spieler nicht sagt, was er
  // gerade gewonnen hat. Ton nach `docs/tonfall.md`.
  if (belohnung.typ === "ereignis") {
    // ⚠️ Der Name des Ereignisses, nicht das Wort „Ereignis" — sonst weiss
    // niemand, was gerade passiert ist.
    const name = EREIGNIS[belohnung.key]?.label ?? "Ein Ereignis";
    if (kurz) return name;
    return belohnung.trifft === "runde"
      ? `${name} — und zwar fuer alle. Du hast es ausgeloest.`
      : `${name} trifft dich.`;
  }
  if (belohnung.typ === "ruecksetzung") {
    if (belohnung.ziel === "cooldown") {
      return kurz ? "Joker frei" : "Alle Abklingzeiten weg — deine Joker sind sofort wieder scharf.";
    }
    if (belohnung.ziel === "budget") {
      return kurz ? "Konto neu" : "Narren-Konto auf Anfang. Was du bisher ausgegeben hast, ist vergeben.";
    }
  }
  return kurz ? label : `${label}.`;
}

function Kasten({ children }) {
  return (
    <div style={{
      background: C.ink2, border: `1px solid ${C.line}`, borderRadius: RUND.karte,
      padding: "14px 16px", fontSize: "0.8125rem", color: C.muted, lineHeight: 1.5, marginTop: 12,
    }}>{children}</div>
  );
}
