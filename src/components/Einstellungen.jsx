"use client";

import { useEffect, useMemo, useState } from "react";
import { createMockOddsSource, scoreTip, toDisplay, projectTip, sanitizeRules, DEFAULT_RULES } from "@/lib/engine";
import { usePrefs } from "@/components/PrefsProvider";
import { getStore } from "@/lib/store";
import { useCurrentRound } from "@/components/RoundProvider";
import {
  PREF_META, LEVELS, LEVEL_LABEL, START_SCREENS, START_SCREEN_LABEL,
  RASTER_WEITEN, RASTER_WEITE_LABEL, RASTER_WEITE_HINWEIS,
  HAPTIK_STUFEN, HAPTIK_LABEL, HAPTIK_HINWEIS,
  VORBELEGUNGEN, VORBELEGUNG_LABEL, VORBELEGUNG_HINWEIS,
  MAX_VERGLEICH, toggleVergleich, vergleichFuer,
} from "@/lib/prefs";
import { MEHRFACH_MODI } from "@/lib/mehrfachTipp";
import { istMoeglich, spuere } from "@/lib/haptik";
import { useAuth } from "@/components/AuthProvider";
import BackLink from "@/components/BackLink";
import { C, MONO, SCHRIFT, RUND } from "@/lib/theme";
import { TAPZIEL } from "@/lib/tapziel";
import AnzeigeVorschau from "@/components/AnzeigeVorschau";


// Beispiel-Begegnung für die Live-Vorschau (dieselbe Engine wie überall).
const odds = createMockOddsSource();
const SNAP = odds.getSnapshot("JOR-ESP");
const RESULT = odds.getResult("JOR-ESP");
const DEMO_TIP = { home: 4, away: 1, goals: { home: ["Al-Naimat", "Al-Naimat"], away: ["Yamal", ""] } };

export default function Einstellungen() {
  const { prefs, setPref } = usePrefs();
  const { user } = useAuth();
  // 🔴 Auch die Vorschau rechnet mit dem Regelwerk DER RUNDE. Sie zeigt, wie
  // die eigene Abrechnung gleich aussehen wird — mit `DEFAULT_RULES` standen
  // dort Punktzahlen, die es in dieser Runde nicht gibt.
  const { roundId } = useCurrentRound();
  const [rules, setRules] = useState(DEFAULT_RULES);
  useEffect(() => {
    let live = true;
    getStore().getRound(roundId)
      .then((r) => { if (live) setRules(sanitizeRules(r?.rules ?? DEFAULT_RULES)); })
      .catch(() => {});
    return () => { live = false; };
  }, [roundId]);

  // Die Mitspieler DIESER Runde — für die Vergleichs-Auswahl. Ohne sie wäre
  // die Einstellung eine Liste von Nutzer-Ids, und niemand weiß, wer „u-kemal"
  // ist.
  const [mitglieder, setMitglieder] = useState([]);
  useEffect(() => {
    let live = true;
    getStore().listMembers(roundId)
      .then((m) => { if (live) setMitglieder(m ?? []); })
      .catch(() => {});
    return () => { live = false; };
  }, [roundId]);

  const gewaehlteFreunde = vergleichFuer(prefs, roundId);

  // ⚠️ Erst NACH dem Mounten fragen: serverseitig gibt es kein `navigator`,
  // und ein Text, der beim ersten Rendern anders ausfällt als beim zweiten,
  // ist ein Hydrations-Fehler. Anfangswert `true` heißt: es steht erst nichts
  // Entmutigendes da, und wenn das Gerät wirklich nicht kann, sagt es das
  // einen Wimpernschlag später.
  const [kannSpueren, setKannSpueren] = useState(true);
  useEffect(() => { setKannSpueren(istMoeglich()); }, []);

  // ⛔ `ME`, `PROJ` und `ABR` standen hier bis zum 25.08.2026 — sie speisten
  // zwei NACHGEZEICHNETE Vorschauen (`AbrechnungPreview`, `VorschauPreview`).
  // Die Zahlen darin waren echt, die FORM war nachgebaut: die Vorschau zeigte
  // eine Chip-Reihe, wo der echte Screen eine Nachbarschaftsliste zeigt. Genau
  // die zweite Wahrheit, die Andis Frage meint („wie das dann praktisch
  // später aussehen wird“) — sie sieht am Tag des Baus richtig aus und
  // weicht danach still ab, weil niemand daran denkt, sie nachzuziehen.
  // Jetzt rendert `AnzeigeVorschau` die ECHTEN Bauteile.

  return (
    <div style={{
      minHeight: "100vh", background: C.ink, color: C.text,
      fontFamily: SCHRIFT,
      padding: "28px 16px", display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <BackLink href="/menu" label="Menü" />
      <div style={{
        width: "100%", maxWidth: "var(--tqs-schirm-breite)", position: "relative",
        borderRadius: RUND.schirm, overflow: "hidden",
        background: `radial-gradient(120% 80% at 50% -10%, ${C.ink2} 0%, ${C.ink} 60%)`,
        border: `1px solid ${C.line}`, boxShadow: "0 30px 80px -30px rgba(0,0,0,0.8)",
      }}>
        <div style={{ position: "relative", padding: "26px 22px 24px" }}>
          <span style={{ fontFamily: MONO, fontSize: "0.75rem", letterSpacing: 2, color: C.muted, textTransform: "uppercase" }}>
            Meine Anzeige
          </span>
          <div style={{ marginTop: 6, fontSize: "1.25rem", fontWeight: 700 }}>Wie viel Hintergrund willst du sehen?</div>
          <p style={{ fontSize: "0.8125rem", color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
            Nur für dich — ändert nichts an den Punkten, nur daran, wie viel Mathematik
            und Vorschau dir angezeigt wird. Jeder Mitspieler stellt das selbst ein.
          </p>

          <PrefSection meta={PREF_META.abrechnung} value={prefs.abrechnung} onChange={(v) => setPref("abrechnung", v)} art="abrechnung" />

          <div style={{ height: 1, background: C.line, margin: "22px 0" }} />

          <PrefSection meta={PREF_META.vorschau} value={prefs.vorschau} onChange={(v) => setPref("vorschau", v)} art="vorschau" />

          <div style={{ height: 1, background: C.line, margin: "22px 0" }} />

          {/* 🔴 Die Einblendung nach Spielende. Sie legt sich beim Öffnen vor
              alles — der Schalter dafür MUSS hier stehen, und der Hinweis in
              der Einblendung verlinkt genau hierher. */}
          <PrefSection meta={PREF_META.zwischenabrechnung} value={prefs.zwischenabrechnung}
            onChange={(v) => setPref("zwischenabrechnung", v)} art="zwischenabrechnung" />

          <div style={{ height: 1, background: C.line, margin: "22px 0" }} />

          {/* 🔴 Andi, 29.08.2026: „wenn man in mehreren Tipprunden gleichzeitig
              drin ist, dass bei den Spielen wo sie sich überschneiden diese
              Tippabgaben für alle Tipprunden eingetragen werden … den Schalter
              kann man im Anzeigehauptmenü auch entfernen bzw diese Einstellung
              auch abändern, sodass jede Tipprunde einzeln betippt wird auch
              wenns die gleichen Spiele sind".

              ⚠️ Zwei Einstellungen, weil es zwei Fragen sind: WAS soll
              standardmäßig passieren, und will ich darüber überhaupt gefragt
              werden. Sie hängen NICHT voneinander ab — wer „einzeln" bevorzugt
              und den Schalter behält, kann im Einzelfall trotzdem verteilen.

              ⚠️ Kein `art`: eine Vorschau gibt es hier bewusst nicht. Was
              passiert, hängt an den anderen Runden des Nutzers, und die kennt
              ein Vorschau-Bauteil nicht. Eine erfundene Beispielrunde wäre
              schlechter als keine. */}
          <PrefSection meta={PREF_META.mehrfachTipp} value={prefs.mehrfachTipp}
            onChange={(v) => setPref("mehrfachTipp", v)}
            stufen={MEHRFACH_MODI} labels={{ alle: "Für alle", einzeln: "Einzeln" }} />

          <PrefSection meta={PREF_META.mehrfachSchalter} value={prefs.mehrfachSchalter}
            onChange={(v) => setPref("mehrfachSchalter", v)}
            stufen={["an", "aus"]} labels={{ an: "Anzeigen", aus: "Ausblenden" }} />

          {/* 🔴 Mit wem vergleiche ich mich? Eine PERSÖNLICHE Wahl und keine
              Regel der Runde — der Admin hat damit nichts zu tun, und zwei
              Spieler derselben Runde dürfen verschiedene Leute im Blick haben.
              Steht direkt unter der Einblendung, weil sie dort auftaucht. */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: C.text }}>
              Vergleich mit Mitspielern
            </div>
            <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
              Bis zu {MAX_VERGLEICH} aus dieser Runde. Ihre Tipps und Punkte stehen dann neben
              deinen — auch in der Einblendung nach dem Spiel. Nur für dich sichtbar.
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {mitglieder
                .filter((m) => m.user_id !== user?.id)
                .map((m) => {
                  const gewaehlt = gewaehlteFreunde.includes(m.user_id);
                  // ⚠️ Voll heißt GESPERRT, nicht „verdrängt den ersten". Ein
                  // Häkchen, das still ein anderes wegnimmt, ist die Sorte
                  // Oberfläche, bei der man beim dritten Klick aufgibt.
                  const voll = !gewaehlt && gewaehlteFreunde.length >= MAX_VERGLEICH;
                  return (
                    <button key={m.user_id} type="button" disabled={voll}
                      // ⚠️ Funktionale Form: `toggleVergleich(prefs.vergleich, …)`
                      // rechnet gegen den Stand VOM RENDERN — drei Klicks
                      // hintereinander speicherten dann nur den letzten
                      // (im Browser gemessen). Siehe `PrefsProvider`.
                      onClick={() => setPref("vergleich", (v) => toggleVergleich(v, roundId, m.user_id))}
                      title={voll ? `Höchstens ${MAX_VERGLEICH} — erst einen abwählen.` : undefined}
                      style={{
                        border: `1px solid ${gewaehlt ? C.akzent : C.line}`, borderRadius: RUND.pille,
                        background: gewaehlt ? `${C.akzent}1a` : "transparent",
                        color: gewaehlt ? C.akzent : (voll ? C.ghost : C.text),
                        cursor: voll ? "not-allowed" : "pointer",
                        ...TAPZIEL, padding: "5px 11px", fontSize: "0.75rem", fontWeight: gewaehlt ? 700 : 500,
                      }}>
                      {gewaehlt ? "✓ " : ""}{m.name ?? m.user_id}
                    </button>
                  );
                })}
            </div>
            <div style={{ fontSize: "0.6875rem", color: C.muted, marginTop: 7 }}>
              {gewaehlteFreunde.length === 0
                ? "Niemand ausgewählt — es stehen nur deine eigenen Zahlen da."
                : `${gewaehlteFreunde.length} von ${MAX_VERGLEICH} ausgewählt.`}
            </div>
          </div>

          <div style={{ height: 1, background: C.line, margin: "22px 0" }} />

          {/* 🔴 Andi, 25.08.2026: „können wir die option zu 1 einstellbar
              machen? vllt auch im account unter den ganzen persönlichen
              anzeigemöglichkeiten einstellbar" — also hier, bei den
              Anzeige-Stufen, und nicht im Regelwerk der Runde. Wie weit ich
              das Raster sehen will, geht den Admin nichts an. */}
          <div>
            <div style={{ fontSize: "0.9375rem", fontWeight: 700 }}>Ergebnis-Raster</div>
            <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
              Wie weit die Tabelle reicht, in der jedes Ergebnis mit seinen
              Punkten steht.
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
              {RASTER_WEITEN.map((w) => (
                <button key={w} className="tqs-aktion" onClick={() => setPref("rasterWeite", w)} style={{
                  ...TAPZIEL, flex: 1, cursor: "pointer", fontSize: "0.8125rem", fontWeight: 700,
                  padding: "9px 8px", borderRadius: RUND.karte, lineHeight: 1.3,
                  background: prefs.rasterWeite === w ? C.akzent : C.surface,
                  color: prefs.rasterWeite === w ? C.ink : C.muted,
                  border: `1px solid ${prefs.rasterWeite === w ? C.akzent : C.line}`, fontFamily: "inherit",
                }}>{RASTER_WEITE_LABEL[w]}</button>
              ))}
            </div>
            <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
              {RASTER_WEITE_HINWEIS[prefs.rasterWeite ?? "raster"]}
            </div>
            <AnzeigeVorschau art="rasterWeite" stufe={prefs.rasterWeite ?? "raster"} />
          </div>

          <div style={{ height: 1, background: C.line, margin: "22px 0" }} />

          {/* 🔴 Andi, 26.08.2026: „dass bei jeder tippabgabe als option zur
              verfügung steht immer die Ergebnisse als bereits eingestellte
              Auswahl zu haben die am Wahrscheinlichsten ist … Also bei bayern
              st. pauli beginnt nicht bei 0:0 sondern direkt bei 3:1" — also
              hier bei den Anzeige-Stufen, denn womit MEIN Stepper anfängt,
              geht den Admin nichts an. */}
          <div>
            <div style={{ fontSize: "0.9375rem", fontWeight: 700 }}>Tipp-Start</div>
            <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
              Welcher Endstand beim Öffnen eines Spiels schon eingestellt ist.
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
              {VORBELEGUNGEN.map((v) => (
                <button key={v} className="tqs-aktion" onClick={() => setPref("vorbelegung", v)} style={{
                  ...TAPZIEL, flex: 1, cursor: "pointer", fontSize: "0.8125rem", fontWeight: 700,
                  padding: "9px 8px", borderRadius: RUND.karte, lineHeight: 1.3,
                  background: prefs.vorbelegung === v ? C.akzent : C.surface,
                  color: prefs.vorbelegung === v ? C.ink : C.muted,
                  border: `1px solid ${prefs.vorbelegung === v ? C.akzent : C.line}`, fontFamily: "inherit",
                }}>{VORBELEGUNG_LABEL[v]}</button>
              ))}
            </div>
            <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
              {VORBELEGUNG_HINWEIS[prefs.vorbelegung ?? "fest"]}
            </div>
            <AnzeigeVorschau art="vorbelegung" stufe={prefs.vorbelegung ?? "fest"} />
          </div>

          <div style={{ height: 1, background: C.line, margin: "22px 0" }} />

          {/* 🔴 Haptik — UX10 („was ‚professionell' noch fehlt") stand seit dem
              24.08.2026 mit dem Vermerk „braucht Capacitor" offen. Seit dem
              26.08.2026 steht die Hülle, also ist der Punkt dran.
              Ausdrücklich NEBEN der Bewegung und nicht darin: Bewegung ist das
              Auge, Haptik ist die Hand. */}
          <div>
            <div style={{ fontSize: "0.9375rem", fontWeight: 700 }}>Spüren</div>
            <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
              Ob das Telefon kurz stößt, wenn etwas gespeichert ist.
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
              {HAPTIK_STUFEN.map((h) => (
                <button key={h} className="tqs-aktion" onClick={() => setPref("haptik", h)} style={{
                  ...TAPZIEL, flex: 1, cursor: "pointer", fontSize: "0.8125rem", fontWeight: 700,
                  padding: "9px 8px", borderRadius: RUND.karte, lineHeight: 1.3,
                  background: prefs.haptik === h ? C.akzent : C.surface,
                  color: prefs.haptik === h ? C.ink : C.muted,
                  border: `1px solid ${prefs.haptik === h ? C.akzent : C.line}`, fontFamily: "inherit",
                }}>{HAPTIK_LABEL[h]}</button>
              ))}
            </div>
            <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
              {HAPTIK_HINWEIS[prefs.haptik ?? "an"]}
            </div>

            {/* 🔴 Die Vorschau zu einer Einstellung, die man nicht SEHEN kann,
                ist eine Probe. Andi am 25.08.2026: „können wir bei den
                anzeigeeinstellungen beim account auch jeweils eine vorschau
                erstellen wie das dann praktisch später aussehen wird" — bei
                den anderen Stufen rendert `AnzeigeVorschau` das echte Bauteil,
                hier ist das echte Bauteil ein Stoß im Daumen. */}
            {kannSpueren ? (
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                {["gespeichert", "fehler"].map((art) => (
                  <button key={art} className="tqs-aktion"
                    onClick={() => spuere(art, { an: true })}
                    disabled={prefs.haptik === "aus"}
                    style={{
                      ...TAPZIEL, flex: 1, cursor: prefs.haptik === "aus" ? "not-allowed" : "pointer",
                      fontSize: "0.75rem", fontWeight: 600, padding: "8px", borderRadius: RUND.karte,
                      background: "transparent", color: prefs.haptik === "aus" ? C.ghost : C.text,
                      border: `1px dashed ${C.line}`, fontFamily: "inherit", opacity: prefs.haptik === "aus" ? 0.5 : 1,
                    }}>
                    {art === "gespeichert" ? "Probe: gespeichert" : "Probe: Fehler"}
                  </button>
                ))}
              </div>
            ) : (
              // ⚠️ Kein stiller Knopf, der ins Leere greift. Wer hier nichts
              // spürt, soll wissen, dass es am Browser liegt und nicht an ihm
              // — und dass es in der App anders ist.
              <div style={{ fontSize: "0.75rem", color: C.ghost, marginTop: 10, lineHeight: 1.5 }}>
                In diesem Browser geht es nicht — Safari auf dem iPhone kennt
                die Schnittstelle nicht. Die Einstellung bleibt trotzdem
                stehen: <strong style={{ color: C.muted }}>in der App
                funktioniert sie</strong>, dort läuft das Spüren über das
                Betriebssystem statt über den Browser.
              </div>
            )}
          </div>

          <div style={{ height: 1, background: C.line, margin: "22px 0" }} />

          <div>
            <div style={{ fontSize: "0.9375rem", fontWeight: 700 }}>App-Start</div>
            <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
              Was du siehst, sobald du die App öffnest.
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
              {START_SCREENS.map((s) => (
                <button key={s} onClick={() => setPref("startScreen", s)} style={{
                  ...TAPZIEL, flex: 1, cursor: "pointer", fontSize: "0.8125rem", fontWeight: 700, padding: "9px 0", borderRadius: RUND.karte,
                  background: prefs.startScreen === s ? C.akzent : C.surface, color: prefs.startScreen === s ? C.ink : C.muted,
                  border: `1px solid ${prefs.startScreen === s ? C.akzent : C.line}`, fontFamily: "inherit",
                }}>{START_SCREEN_LABEL[s]}</button>
              ))}
            </div>
            <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
              {prefs.startScreen === "hub"
                ? "Direkt rein ins Tippen: Tipp abgeben, Ranking & Co. deiner aktiven Runde."
                : "Erst die Übersicht: eigene Tippspiele, erstellen, beitreten, Einstellungen."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ⚠️ `stufen` und `labels` sind Parameter mit Vorgabe, damit hier KEINE
// zweite, fast gleiche Fassung entsteht. Die neuen Einstellungen (Mehrfach-
// Tipp) haben eigene Stufen — „alle/einzeln" statt „voll/dezent/aus" —,
// sonst aber denselben Aufbau. Zwei Komponenten dafür wären zwei Stellen,
// an denen man künftig dasselbe ändern muss.
function PrefSection({ meta, value, onChange, art = null, stufen = LEVELS, labels = LEVEL_LABEL }) {
  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ fontSize: "0.9375rem", fontWeight: 700 }}>{meta.title}</div>
      <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 4, lineHeight: 1.5 }}>{meta.hint}</div>
      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        {stufen.map((lv) => (
          <button key={lv} onClick={() => onChange(lv)} style={{
            ...TAPZIEL, flex: 1, cursor: "pointer", fontSize: "0.8125rem", fontWeight: 700, padding: "9px 0", borderRadius: RUND.karte,
            background: value === lv ? C.akzent : C.surface, color: value === lv ? C.ink : C.muted,
            border: `1px solid ${value === lv ? C.akzent : C.line}`, fontFamily: "inherit",
          }}>{labels[lv] ?? lv}</button>
        ))}
      </div>
      <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 8, lineHeight: 1.5 }}>{meta.levels[value]}</div>
      {/* 🔴 Andi, 25.08.2026: „auch jeweils eine vorschau erstellen wie das
          dann praktisch später aussehen wird". Aus den ECHTEN Bauteilen —
          Begründung im Kopf von `AnzeigeVorschau.jsx`. */}
      {art && <AnzeigeVorschau art={art} stufe={value} />}
    </div>
  );
}
