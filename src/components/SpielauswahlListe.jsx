"use client";

// ============================================================
//  SPIELAUSWAHL — die feste Begegnungs-Liste (`spiele.modus = "liste"`)
//
//  Der Filter und das Feld gab es schon, nur die Oberfläche fehlte. Gebraucht
//  wird sie, seit fünf Wettbewerbe im Katalog liegen: alle anderen Dimensionen
//  (Vereine, Zeitraum, Wettbewerbe, Phasen) wirken UND-verknüpft, für eine
//  GEMISCHTE Wunschliste („CL-K.-o. plus meine Bundesliga-Vereine") ist die
//  Liste der vorgesehene Weg.
//
//  ── Warum hier gesucht statt geblättert wird ──
//  1605 Spiele lassen sich nicht als Liste anbieten. Gezeigt wird deshalb ein
//  AUSSCHNITT: Suche über Vereinsnamen, Wettbewerbs-Filter, und nur die
//  nächsten Begegnungen. Die Zahl der ausgeblendeten steht immer dabei —
//  dieselbe Regel wie in der Spielwahl, wo Verschweigen als Fehler wirkte.
//
//  ── Ausgewählte stehen IMMER oben ──
//  Sonst verschwindet ein angehaktes Spiel, sobald man die Suche ändert, und
//  lässt sich nicht mehr abwählen, ohne den Suchbegriff zu rekonstruieren.
//
//  ── Vergangene Spiele sind ausgeblendet ──
//  Eine Runde wird für die Zukunft gebaut. Der Demo-Eintrag JOR-ESP liegt in
//  der Vergangenheit und stünde sonst ganz oben.
// ============================================================

import { useState, useEffect, useMemo } from "react";
import { getStore } from "@/lib/store";
import { AUSWAHL_LIMITS } from "@/lib/spielauswahl";
import { wettbewerbeIn, wettbewerbLabel, phasenLabel, wettbewerbVon, phaseVon } from "@/lib/wettbewerbe";
import { C } from "@/lib/theme";

const MAX_ZEILEN = 30;   // so viel wird auf einmal gezeigt

const zeitpunkt = (iso) => {
  const d = new Date(iso ?? "");
  if (!Number.isFinite(d.getTime())) return "Termin offen";
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })
    + ", " + d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
};

export default function SpielauswahlListe({ spiele, onChange }) {
  const [matches, setMatches] = useState(null);
  const [suche, setSuche] = useState("");
  const [wettbewerb, setWettbewerb] = useState(null);

  const an = spiele?.modus === "liste";
  const gewaehlt = useMemo(() => new Set(spiele?.matchIds ?? []), [spiele?.matchIds]);

  useEffect(() => {
    if (!an || matches) return;
    let live = true;
    getStore().listMatches()
      .then((m) => { if (live) setMatches(m ?? []); })
      .catch(() => { if (live) setMatches([]); });
    return () => { live = false; };
  }, [an, matches]);

  const umschalten = (ein) => onChange(ein
    ? { modus: "liste" }
    : { modus: "alle", matchIds: [] });

  const toggle = (id) => {
    const key = String(id);
    const next = gewaehlt.has(key)
      ? (spiele.matchIds ?? []).filter((x) => x !== key)
      : [...(spiele.matchIds ?? []), key];
    onChange({ modus: "liste", matchIds: next.slice(0, AUSWAHL_LIMITS.maxSpiele) });
  };

  const alle = matches ?? [];
  const wettbewerbe = useMemo(() => wettbewerbeIn(alle), [alle]);

  // Die Auswahl selbst — immer sichtbar, unabhängig von Suche und Filter.
  const ausgewaehlt = useMemo(
    () => alle.filter((m) => gewaehlt.has(String(m.id))),
    [alle, gewaehlt],
  );

  const treffer = useMemo(() => {
    const jetzt = Date.now();
    const q = suche.trim().toLowerCase();
    return alle
      .filter((m) => !gewaehlt.has(String(m.id)))
      .filter((m) => new Date(m.kickoff ?? "").getTime() > jetzt)
      .filter((m) => !wettbewerb || wettbewerbVon(m) === wettbewerb)
      .filter((m) => !q || `${m.home} ${m.away}`.toLowerCase().includes(q))
      .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));
  }, [alle, gewaehlt, suche, wettbewerb]);

  const voll = gewaehlt.size >= AUSWAHL_LIMITS.maxSpiele;

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 4 }}>Feste Begegnungs-Liste</div>
      <p style={{ fontSize: 11, color: C.muted, margin: "0 0 8px", lineHeight: 1.45 }}>
        Für ein Turnier oder eine kurze Runde: es zählen genau die Spiele, die du
        hier anhakst. Das ist auch der Weg für eine gemischte Auswahl — die
        anderen Einschränkungen gelten sonst alle gleichzeitig.
      </p>

      <Toggle on={an} onChange={umschalten} />

      {an && (
        <div style={{ marginTop: 10 }}>
          {matches === null ? (
            <div style={{ fontSize: 11, color: C.muted }}>Spiele werden geladen …</div>
          ) : (
            <>
              {/* Die Auswahl zuerst — sie darf nie hinter einem Suchbegriff verschwinden. */}
              <div style={{ fontSize: 11, color: voll ? C.gold : C.muted, marginBottom: 8 }}>
                {gewaehlt.size} von höchstens {AUSWAHL_LIMITS.maxSpiele} Begegnungen gewählt
                {gewaehlt.size === 0 && " — ohne Auswahl zählen wieder alle Spiele"}
                {voll && " — mehr geht nicht"}.
              </div>

              {ausgewaehlt.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                  {ausgewaehlt.map((m) => (
                    <button key={m.id} onClick={() => toggle(m.id)} title="Entfernen" style={{
                      cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, padding: "6px 10px",
                      borderRadius: 999, background: `${C.mint}22`, color: C.mint,
                      border: `1px solid ${C.mint}66`,
                    }}>{m.home} – {m.away} ×</button>
                  ))}
                </div>
              )}

              <input value={suche} onChange={(e) => setSuche(e.target.value)}
                placeholder="Verein suchen …"
                style={{
                  width: "100%", boxSizing: "border-box", fontFamily: "inherit", fontSize: 12.5,
                  padding: "9px 11px", borderRadius: 10, background: C.surface,
                  color: C.text, border: `1px solid ${C.line}`, marginBottom: 8,
                }} />

              {/* ⚠️ `wettbewerbeIn` liefert KATALOG-EINTRÄGE, keine Schlüssel —
                  gefiltert und als Key gebraucht wird aber `w.key`. */}
              {wettbewerbe.length > 1 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  {[null, ...wettbewerbe.map((w) => w.key)].map((key) => {
                    const aktiv = wettbewerb === key;
                    return (
                      <button key={key ?? "alle"} onClick={() => setWettbewerb(key)} style={{
                        cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, padding: "5px 10px",
                        borderRadius: 999, background: aktiv ? `${C.gold}22` : C.surface,
                        color: aktiv ? C.gold : C.muted,
                        border: `1px solid ${aktiv ? C.gold + "66" : C.line}`,
                      }}>{key === null ? "Alle" : wettbewerbLabel(key)}</button>
                    );
                  })}
                </div>
              )}

              <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
                {treffer.slice(0, MAX_ZEILEN).map((m) => (
                  <button key={m.id} onClick={() => toggle(m.id)} disabled={voll} style={{
                    display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center",
                    gap: 8, cursor: voll ? "not-allowed" : "pointer", fontFamily: "inherit",
                    textAlign: "left", padding: "9px 11px", background: "transparent",
                    color: voll ? C.muted : C.text, border: "none",
                    borderBottom: `1px solid ${C.line}`, opacity: voll ? 0.5 : 1,
                  }}>
                    <span style={{ fontSize: 12.5 }}>{m.home} – {m.away}</span>
                    <span style={{ fontSize: 10.5, color: C.muted, whiteSpace: "nowrap" }}>
                      {wettbewerbLabel(wettbewerbVon(m))}
                      {phaseVon(m) !== "liga" && ` · ${phasenLabel(phaseVon(m))}`}
                      {" · "}{zeitpunkt(m.kickoff)}
                    </span>
                  </button>
                ))}
                {treffer.length === 0 && (
                  <div style={{ fontSize: 11.5, color: C.muted, padding: "10px 11px" }}>
                    Keine anstehende Begegnung passt dazu.
                  </div>
                )}
              </div>

              {/* Nie verschweigen, wie viel ausgeblendet ist. */}
              {treffer.length > MAX_ZEILEN && (
                <div style={{ fontSize: 10.5, color: C.muted, marginTop: 6 }}>
                  {treffer.length - MAX_ZEILEN} weitere — Suche verfeinern.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Kleiner eigener Schalter, damit die Datei ohne Zugriff auf die internen
// Bausteine der Spielerstellung auskommt.
function Toggle({ on, onChange }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      display: "flex", alignItems: "center", gap: 9, cursor: "pointer",
      fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, padding: "9px 11px",
      width: "100%", textAlign: "left", borderRadius: 11,
      background: on ? `${C.mint}18` : C.surface, color: on ? C.mint : C.muted,
      border: `1px solid ${on ? C.mint + "55" : C.line}`,
    }}>
      <span style={{
        width: 30, height: 18, borderRadius: 999, flexShrink: 0, position: "relative",
        background: on ? C.mint : C.line, transition: "background .15s",
      }}>
        <span style={{
          position: "absolute", top: 2, left: on ? 14 : 2, width: 14, height: 14,
          borderRadius: 999, background: C.ink, transition: "left .15s",
        }} />
      </span>
      Nur ausgewählte Begegnungen
    </button>
  );
}
