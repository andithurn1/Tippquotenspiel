"use client";

import { useState, useEffect, useMemo } from "react";
import { getStore } from "@/lib/store";
import { wettenStatus } from "@/lib/saisonFenster";
import { useAuth } from "@/components/AuthProvider";
import { useCurrentRound } from "@/components/RoundProvider";
import BackLink from "@/components/BackLink";
import { WETT_TYP, wettenId, wettenLabel, istAuswertbar } from "@/lib/saisonwetten";
import { C, MONO } from "@/lib/theme";

// Saison-Wetten abgeben: die Langzeit-Tipps (Meister, Torschützenkönig …), die
// der Admin ins Regelwerk gelegt hat. Je Wette ein Auswahlfeld — Team- oder
// Torschützen-Liste, aus den Match-Snapshots. Nach Saisonstart (erster Anpfiff)
// gesperrt, genau wie die Quoten-Snapshots beim Spieltags-Tippen.
export default function SaisonTipps() {
  const { user } = useAuth();
  const { roundId } = useCurrentRound();
  const [saison, setSaison] = useState(null);   // rules.saison
  const [matches, setMatches] = useState([]);
  const [tipps, setTipps] = useState({});       // { wettenId: wert }
  const [saveState, setSaveState] = useState({}); // { wettenId: "saved" | "error" }

  useEffect(() => {
    let live = true;
    // 🔴 NUR die Spiele DIESER Runde — und zwar über `listRoundMatches`, nicht
    // über `listMatches` mit eigenem Filter. Der Katalog enthält alle
    // Wettbewerbe, und sie starten Wochen auseinander: gemessen am 05.08.2026
    // hat die MLS am 31.07. angefangen, die Bundesliga fängt am 28.08. an.
    // Ungefiltert war `gestartet` in einer reinen Bundesliga-Runde deshalb
    // schon jetzt `true`, und ALLE fensterlosen Saison-Wetten waren drei
    // Wochen vor dem ersten Spieltag eingefroren. Auch `aktuellerSpieltag`
    // betraf es: ganzer Katalog `{mls: 1}`, die Runde selbst steht bei 0.
    //
    // ⚠️ Der Filter lag hier nachgebaut — richtig gerechnet, aber an einer
    // zweiten Stelle. Die Regel hat EINE Stelle (Runden-Schicht, Frage 1).
    Promise.all([getStore().getRound(roundId), getStore().listRoundMatches(roundId)]).then(([round, ms]) => {
      if (!live) return;
      setSaison(round?.rules?.saison ?? { enabled: false, wetten: [] });
      setMatches(ms);
    });
    return () => { live = false; };
  }, [roundId]);

  useEffect(() => {
    let live = true;
    if (!user) return;
    getStore().listSeasonTips({ roundId, userId: user.id }).then((rows) => {
      if (live) setTipps(Object.fromEntries(rows.map((r) => [r.wetten_id, r.wert])));
    });
    return () => { live = false; };
  }, [roundId, user]);

  // Auswahllisten aus den Match-Daten: Teams und Torschützen (stabile Kader).
  const teams = useMemo(
    () => [...new Set(matches.flatMap((m) => [m.home, m.away]).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [matches],
  );
  const spieler = useMemo(() => {
    const s = new Set();
    for (const m of matches) {
      for (const p of Object.keys(m.snapshot?.players?.home ?? {})) s.add(p);
      for (const p of Object.keys(m.snapshot?.players?.away ?? {})) s.add(p);
    }
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [matches]);

  // Saisonstart und Spieltags-Stand kommen aus EINER Funktion (`saisonLage` in
  // wettbewerbe.js) — die Begründungen stehen dort. Kurz: gerechnet wird über
  // die Spiele DIESER Runde, das Demo-Länderspiel und fremde Wettbewerbe
  // zählen nicht mit.
  // 🔴 DIESELBE Funktion, die auch der Store vor dem Speichern fragt
  // (`saisonFenster.js`). Vorher stand die Fallunterscheidung hier — und im
  // Store gar nicht: das Fenster war ein `disabled`-Attribut, jede Wette kam
  // zu jeder Zeit durch. Zwei Formulierungen derselben Regel wären der nächste
  // Schritt in dieselbe Falle.
  const statusVon = (w) => wettenStatus({ wette: w, matches });

  const setzeTipp = async (id, wert) => {
    setTipps((t) => ({ ...t, [id]: wert }));
    if (!user || !wert) return;
    try {
      await getStore().saveSeasonTip({ roundId, userId: user.id, wettenId: id, wert });
      setSaveState((s) => ({ ...s, [id]: "saved" }));
      setTimeout(() => setSaveState((s) => ({ ...s, [id]: undefined })), 1400);
    } catch {
      setSaveState((s) => ({ ...s, [id]: "error" }));
    }
  };

  const wetten = saison?.wetten ?? [];

  return (
    <div style={{
      minHeight: "100vh", background: C.ink, color: C.text,
      fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
      padding: "28px 16px", display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <BackLink href="/hub" label="Tippspiel" />
      <div style={{ width: "100%", maxWidth: 440 }}>
        <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: 2, color: C.muted, textTransform: "uppercase" }}>
          Saison-Wetten
        </span>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: "8px 0 6px" }}>Deine Langzeit-Tipps</h1>
        <p style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5, marginTop: 0 }}>
          Einmal vor der Saison getippt, am Ende abgerechnet — läuft nebenbei zu den Spieltagen.
        </p>

        {saison && !saison.enabled && (
          <div style={{ fontSize: 13, color: C.muted, marginTop: 16 }}>
            Diese Runde hat keine Saison-Wetten aktiviert.
          </div>
        )}

        {!user && saison?.enabled && (
          <div style={{ fontSize: 12.5, color: C.gold, marginTop: 16 }}>
            Zum Abgeben bitte zuerst einloggen.
          </div>
        )}

        {saison?.enabled && gestartet && (
          <div style={{
            fontSize: 12, color: C.muted, background: C.surface, border: `1px solid ${C.line}`,
            borderRadius: 10, padding: "8px 12px", margin: "14px 0", lineHeight: 1.5,
          }}>
            🔒 Die Saison läuft — Wetten ohne eigenes Zeitfenster sind eingefroren.
            Wetten mit Fenster öffnen sich später von selbst.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
          {wetten.map((wette) => {
            const typ = WETT_TYP[wette.key];
            if (!typ) return null;
            const id = wettenId(wette);
            const optionen = typ.antwort === "spieler" ? spieler : teams;
            const auswertbar = istAuswertbar(wette.key);
            const state = saveState[id];
            const status = statusVon(wette);
            return (
              <div key={id} style={{
                background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: "14px 16px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{wettenLabel(wette)}</span>
                  <span style={{ fontFamily: MONO, fontSize: 11.5, color: C.gold, whiteSpace: "nowrap" }}>{wette.punkte} Pkt.</span>
                </div>
                {typ.hint && <div style={{ fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 1.4 }}>{typ.hint}</div>}
                {/* Zustand IMMER benennen: „gesperrt" allein lässt den Spieler
                    rätseln, ob er etwas verpasst hat oder noch warten muss. */}
                {status.zustand !== "immer" && (
                  <div style={{
                    fontSize: 11, marginTop: 6,
                    color: status.offen ? C.mint : status.zustand === "noch-zu" ? C.sky : C.muted,
                  }}>
                    {status.offen ? "🟢 " : status.zustand === "noch-zu" ? "🕘 " : "🔒 "}{status.text}
                  </div>
                )}
                {!auswertbar && (
                  <div style={{ fontSize: 11, color: C.coral, marginTop: 6 }}>
                    Noch nicht auswertbar (fehlende Statistik) — zählt nicht.
                  </div>
                )}
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                  <select
                    value={tipps[id] ?? ""}
                    disabled={!status.offen || !user || !auswertbar}
                    onChange={(e) => setzeTipp(id, e.target.value)}
                    style={{
                      flex: 1, background: C.ink2, color: tipps[id] ? C.text : C.muted,
                      border: `1px solid ${C.line}`, borderRadius: 10, padding: "9px 10px",
                      fontSize: 13.5, fontFamily: "inherit", outline: "none",
                    }}
                  >
                    <option value="" style={{ color: "#000" }}>
                      {typ.antwort === "spieler" ? "– Spieler wählen –" : "– Team wählen –"}
                    </option>
                    {optionen.map((o) => (
                      <option key={o} value={o} style={{ color: "#000" }}>{o}</option>
                    ))}
                  </select>
                  <span style={{ fontFamily: MONO, fontSize: 11, width: 20, textAlign: "center",
                    color: state === "saved" ? C.mint : state === "error" ? C.coral : "transparent" }}>
                    {state === "saved" ? "✓" : state === "error" ? "!" : "·"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {saison?.enabled && wetten.length === 0 && (
          <div style={{ fontSize: 13, color: C.muted, marginTop: 16 }}>
            Der Admin hat noch keine Wetten zusammengestellt.
          </div>
        )}
      </div>
    </div>
  );
}
