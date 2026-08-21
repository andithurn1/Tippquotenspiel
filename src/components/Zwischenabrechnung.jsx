"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { C, MONO, SCHRIFT } from "@/lib/theme";
import { getStore } from "@/lib/store";
import { useAuth } from "@/components/AuthProvider";
import { useCurrentRound } from "@/components/RoundProvider";
import { usePrefs } from "@/components/PrefsProvider";
import { vergleichFuer } from "@/lib/prefs";
import { neueAbrechnungen, zusammenfassung, gesehenBis } from "@/lib/zwischenabrechnung";

// ============================================================
//  „Das ist passiert, seit du zuletzt da warst"
//
//  🔴 Warum das im LAYOUT hängt und nicht auf der Abrechnungs-Seite: eine
//  Nachricht, die man nur sieht, wenn man ohnehin nachschaut, ist keine
//  Nachricht. Dieselbe Begründung wie bei `NotifyRunner` — sie darf nicht
//  davon abhängen, auf welchem Screen man gerade steht.
//
//  ⚠️ **Abstellbar, und zwar wirklich.** `prefs.zwischenabrechnung: "aus"`
//  heißt: nie wieder. Etwas, das sich beim Öffnen vor alles legt, braucht
//  diesen Schalter — und einen sichtbaren Weg dorthin, sonst sucht man ihn im
//  Menü, während einen die Einblendung anschaut. Deshalb steht der Hinweis
//  samt Link IN der Einblendung.
//
//  ── Die Marke „bis hierhin gesehen" ──
//  Liegt im localStorage, wie die aktive Runde und die Anzeige-Stufen. Beim
//  ALLERERSTEN Start gibt es keine Marke — dann wird nichts gezeigt und die
//  Marke auf jetzt gesetzt. Sonst bekäme jemand beim ersten Öffnen die halbe
//  Saison als „Neuigkeiten" (siehe `neueAbrechnungen`, `seit = null`).
// ============================================================

const KEY = "tqs.abrechnung.gesehen.v1";

const lies = () => {
  try { return Number(localStorage.getItem(KEY)) || null; } catch { return null; }
};
const schreib = (t) => {
  try { localStorage.setItem(KEY, String(t)); } catch { /* ignorieren */ }
};

export default function Zwischenabrechnung() {
  const { user } = useAuth();
  const { roundId } = useCurrentRound();
  const { prefs, ready } = usePrefs();
  const [liste, setListe] = useState([]);
  const [offen, setOffen] = useState(false);

  const aus = prefs.zwischenabrechnung === "aus";

  useEffect(() => {
    // ⚠️ Erst laufen, wenn die Prefs geladen sind: sonst baut die Einblendung
    // einmal auf, obwohl der Nutzer sie abgestellt hat, und blitzt kurz auf.
    if (!ready || aus || !user?.id || !roundId) return;
    let abgebrochen = false;

    (async () => {
      const seit = lies();
      // Erster Start: nichts erzählen, nur die Marke setzen.
      if (seit == null) { schreib(Date.now()); return; }
      try {
        const [entries, round] = await Promise.all([
          getStore().getRoundEntries(roundId),
          getStore().getRound(roundId),
        ]);
        if (abgebrochen) return;
        const neu = neueAbrechnungen({
          eintraege: entries.filter((e) => e.userId === user.id),
          seit, rules: round?.rules,
          // Die bis zu drei Mitspieler, die dieser Nutzer FÜR DIESE RUNDE im
          // Blick haben will (persönliche Einstellung, siehe `prefs.js`).
          alleEintraege: entries, vergleich: vergleichFuer(prefs, roundId),
        });
        if (neu.length) { setListe(neu); setOffen(true); }
      } catch { /* Ohne Daten keine Einblendung — sie ist Beiwerk, kein Muss. */ }
    })();

    return () => { abgebrochen = true; };
  }, [ready, aus, user?.id, roundId, prefs.vergleich]);

  const summe = useMemo(() => zusammenfassung(liste), [liste]);

  if (!offen || !liste.length) return null;

  const weiter = () => {
    schreib(gesehenBis(liste, lies()));
    setOffen(false);
  };

  const dezent = prefs.zwischenabrechnung === "dezent";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Was passiert ist, seit du zuletzt da warst"
      style={{
        // Heller Vorhang statt dunklem: auf weißem Grund wirkt ein dunkler
        // Abdunkler wie ein Fremdkörper aus dem alten Theme.
        position: "fixed", inset: 0, zIndex: 60, background: "rgba(17,20,28,0.35)",
        backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, fontFamily: SCHRIFT,
      }}>
      <div style={{
        background: C.ink2, border: `1px solid ${C.line}`, borderRadius: 18,
        width: "100%", maxWidth: 460, maxHeight: "86vh", display: "flex", flexDirection: "column",
        boxShadow: "0 24px 60px rgba(17,20,28,0.18)",
      }}>
        <div style={{ padding: "16px 18px 10px" }}>
          <div style={{
            fontFamily: MONO, fontSize: 9.5, letterSpacing: 1.2, color: C.muted,
            textTransform: "uppercase",
          }}>Seit du zuletzt da warst</div>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.text, marginTop: 4 }}>
            {summe.anzahl === 1 ? "Ein Spiel ist durch" : `${summe.anzahl} Spiele sind durch`}
          </div>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3, lineHeight: 1.5 }}>
            Das hat dir <strong style={{ color: C.mint }}>{summe.punkte} Punkte</strong> gebracht
            {summe.exakte > 0 && (
              <> — davon {summe.exakte === 1 ? "ein Volltreffer" : `${summe.exakte} Volltreffer`}</>
            )}.
          </div>
        </div>

        {/* Die Einzelspiele — bei „dezent" bleibt es bei der Summe oben.
            Der Unterschied ist keine Sparversion, sondern eine echte Wahl:
            manche wollen die Spannung, bis sie selbst nachsehen. */}
        {!dezent && (
          <div style={{ overflowY: "auto", padding: "0 18px", flex: 1 }}>
            {liste.map((s) => (
              <div key={s.matchId ?? `${s.wettbewerb}-${s.matchday}-${s.kickoff}`} style={{
                padding: "9px 0", borderTop: `1px solid ${C.line}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {s.home} – {s.away}
                    </div>
                    <div style={{ fontSize: 10.5, color: C.muted, marginTop: 2 }}>
                      dein Tipp {s.tip.home}:{s.tip.away} · Ergebnis {s.result.home}:{s.result.away}
                      {s.exakt && <span style={{ color: C.akzent }}> · exakt</span>}
                    </div>
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: s.punkte > 0 ? C.mint : C.muted }}>
                    {s.punkte}
                  </div>
                </div>

                {/* 🔴 Der Vergleich mit den gewählten Mitspielern. Eingerückt
                    und kleiner, weil die eigene Zeile die Nachricht ist und
                    der Vergleich der Zusatz — stünde beides gleich groß da,
                    müsste man erst suchen, welche Zeile die eigene ist.
                    ⚠️ Wer dieses Spiel nicht getippt hat, steht hier gar
                    nicht: „nicht getippt" und „null Punkte" sind zwei
                    verschiedene Aussagen (siehe `neueAbrechnungen`). */}
                {s.andere?.length > 0 && (
                  <div style={{ marginTop: 6, paddingLeft: 10, borderLeft: `2px solid ${C.line}` }}>
                    {s.andere.map((a) => (
                      <div key={a.userId} style={{
                        display: "flex", alignItems: "center", gap: 8, marginTop: 3,
                        fontSize: 10.5, color: C.muted,
                      }}>
                        <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {a.name} · {a.tip.home}:{a.tip.away}
                          {a.exakt && <span style={{ color: C.akzent }}> · exakt</span>}
                        </span>
                        <span style={{
                          fontFamily: MONO, fontWeight: 700,
                          // Besser als ich? Dann darf man das auch sehen.
                          color: a.punkte > s.punkte ? C.coral : C.muted,
                        }}>{a.punkte}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ padding: "12px 18px 16px", borderTop: `1px solid ${C.line}` }}>
          {/* 🔴 Das große Feld: ein Weg raus, nicht drei. Wer die Einblendung
              wegklickt, hat sie gesehen — mehr will sie nicht. */}
          <button type="button" onClick={weiter} style={{
            width: "100%", padding: "13px 16px", borderRadius: 12, border: "none",
            background: C.mint, color: C.ink, fontSize: 14.5, fontWeight: 800,
            cursor: "pointer", fontFamily: "inherit",
          }}>Weiter</button>

          {/* ⚠️ Der Hinweis gehört HIERHER und nicht ins Menü: wer die
              Einblendung nicht will, sucht den Schalter genau jetzt — nicht
              beim nächsten Mal. */}
          <div style={{ fontSize: 10.5, color: C.muted, marginTop: 9, textAlign: "center", lineHeight: 1.5 }}>
            Regle deine Einstellungen und Benachrichtigungen{" "}
            <Link href="/einstellungen" onClick={weiter} style={{ color: C.akzent, textDecoration: "none", fontWeight: 700 }}>
              hier
            </Link>.
          </div>
        </div>
      </div>
    </div>
  );
}
