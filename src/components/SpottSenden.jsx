"use client";

import { useState, useEffect } from "react";
import { getStore } from "@/lib/store";
import { useAuth } from "@/components/AuthProvider";
import { useCurrentRound } from "@/components/RoundProvider";
import BackLink from "@/components/BackLink";
import ReactionGif from "@/components/ReactionGif";
import { C, MONO, SCHRIFT, RUND } from "@/lib/theme";
import { RANK_REACTIONS } from "@/lib/reactions";
import { relationBetween, tauntsFor, buildTaunt, tauntTargets, darfSenden } from "@/lib/taunts";
import { TAPZIEL } from "@/lib/tapziel";

// ── Spott-GIF an einen Mitspieler ───────────────────────────
// Bewusst OHNE eigene Tabelle: der fertige Spott geht über die Teilen-Funktion
// des Geräts raus (WhatsApp & Co.) — dorthin, wo der Freundeskreis ohnehin
// schreibt. Die Spam-Bremse (ein Spott je Ziel und Spieltag) merkt sich der
// Browser lokal; sie ist Anstands-Regel, keine Sicherheitsgrenze.
const VERLAUF_KEY = "tqs.spott.v1";

export default function SpottSenden() {
  const { user } = useAuth();
  const { roundId } = useCurrentRound();
  const [board, setBoard] = useState(null);
  const [roundName, setRoundName] = useState(null);
  const [zielId, setZielId] = useState(null);
  const [spruchKey, setSpruchKey] = useState(null);
  const [verlauf, setVerlauf] = useState([]);
  const [status, setStatus] = useState("");

  // Spieltag für die Spam-Bremse: der zuletzt gewertete. MIT Wettbewerb — sonst
  // blockierte ein Spott am Bundesliga-Spieltag 1 auch den am CL-Spieltag 1.
  const [spieltag, setSpieltag] = useState({ matchday: 0, wettbewerb: null });

  useEffect(() => {
    try { setVerlauf(JSON.parse(localStorage.getItem(VERLAUF_KEY) || "[]")); } catch {}
  }, []);

  useEffect(() => {
    let live = true;
    if (!roundId) return;
    Promise.all([getStore().getLeaderboard(roundId), getStore().getRound(roundId)])
      .then(([b, r]) => { if (!live) return; setBoard(b); setRoundName(r?.name ?? null); })
      .catch(() => { if (live) setBoard([]); });
    getStore().getLeaderboardHistory?.(roundId)
      .then((h) => {
        if (!live || !h?.length) return;
        const letzter = h[h.length - 1];
        setSpieltag({ matchday: letzter.matchday ?? 0, wettbewerb: letzter.wettbewerb ?? null });
      })
      .catch(() => {});
    return () => { live = false; };
  }, [roundId]);

  const me = board?.find((b) => b.userId === user?.id) ?? null;
  const ziele = tauntTargets(board ?? [], user?.id);
  const ziel = ziele.find((z) => z.userId === zielId) ?? null;
  const relation = relationBetween(me, ziel);
  const sprueche = relation ? tauntsFor(relation) : [];
  const spruch = sprueche.find((s) => s.key === spruchKey) ?? sprueche[0] ?? null;
  const spott = ziel && spruch
    ? buildTaunt({ taunt: spruch, fromName: me?.name ?? user?.name, toName: ziel.name, roundName })
    : null;
  const blockiert = ziel ? !darfSenden(verlauf, { toId: ziel.userId, ...spieltag }) : false;

  const merken = () => {
    const next = [...verlauf, { toId: ziel.userId, ...spieltag, ts: Date.now() }];
    setVerlauf(next);
    try { localStorage.setItem(VERLAUF_KEY, JSON.stringify(next)); } catch {}
  };

  const senden = async () => {
    if (!spott || blockiert) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Quotentipprunde", text: spott.shareText });
        merken(); setStatus("✓ Rausgeschickt.");
      } else {
        await navigator.clipboard.writeText(spott.shareText);
        merken(); setStatus("✓ Kopiert — jetzt einfach einfügen.");
      }
    } catch {
      setStatus(""); // Abbruch durch den Nutzer ist kein Fehler
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: C.ink, color: C.text,
      fontFamily: SCHRIFT,
      padding: "28px 16px", display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <BackLink href="/hub" label="Tippspiel" />
      <div style={{
        width: "100%", maxWidth: 400, borderRadius: RUND.schirm,
        background: `radial-gradient(120% 80% at 50% -10%, ${C.ink2} 0%, ${C.ink} 60%)`,
        border: `1px solid ${C.line}`, boxShadow: "0 30px 80px -30px rgba(0,0,0,0.8)",
        padding: "26px 22px 24px",
      }}>
        <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: 2, color: C.muted, textTransform: "uppercase" }}>
          Spott verschicken
        </span>
        <div style={{ marginTop: 6, fontSize: 20, fontWeight: 700 }}>Wen willst du ärgern?</div>
        <p style={{ fontSize: 13, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
          Such dir ein Opfer, nimm einen Spruch — der Rest geht über deinen
          üblichen Chat raus. Einer pro Mitspieler und Spieltag, mehr wäre albern.
        </p>

        {board == null && <Hint>Tabelle lädt …</Hint>}
        {board?.length > 0 && ziele.length === 0 && <Hint>Noch keine Mitspieler in dieser Runde.</Hint>}
        {board?.length === 0 && <Hint>Noch keine gewerteten Tipps — erst spielen, dann lästern.</Hint>}

        {/* Ziel wählen */}
        {ziele.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
            {ziele.map((z) => {
              const aktiv = z.userId === zielId;
              return (
                <button key={z.userId} onClick={() => { setZielId(z.userId); setSpruchKey(null); setStatus(""); }} style={{
                  display: "flex", alignItems: "center", gap: 10, cursor: "pointer", textAlign: "left",
                  background: aktiv ? `${C.akzent}14` : C.surface,
                  border: `1px solid ${aktiv ? C.akzent + "55" : C.line}`,
                  ...TAPZIEL, borderRadius: RUND.karte, padding: "10px 12px", color: C.text, fontFamily: "inherit",
                }}>
                  <span style={{ fontFamily: MONO, fontSize: 12, color: C.muted, width: 18 }}>{z.rank}</span>
                  <span style={{ flex: 1, fontSize: 15, fontWeight: aktiv ? 700 : 400 }}>{z.name}</span>
                  <span style={{ fontFamily: MONO, fontSize: 12, color: C.muted }}>{z.total}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Spruch wählen + Vorschau */}
        {ziel && (
          <>
            <div style={{ height: 1, background: C.line, margin: "20px 0" }} />
            <div style={{ fontSize: 13, fontWeight: 700 }}>
              {relation === "ueberholt" && "Du liegst vorn — genieß es."}
              {relation === "hinterher" && "Du liegst hinten — Frechheit siegt."}
              {relation === "gleichauf" && "Punktgleich — Duell-Modus."}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              {sprueche.map((s) => {
                const aktiv = s.key === (spruch?.key ?? null);
                return (
                  <button key={s.key} onClick={() => { setSpruchKey(s.key); setStatus(""); }} style={{
                    cursor: "pointer", fontFamily: "inherit", fontSize: 12,
                    background: aktiv ? `${C.akzent}18` : C.surface, color: aktiv ? C.akzent : C.muted,
                    border: `1px solid ${aktiv ? C.akzent + "66" : C.line}`,
                    borderRadius: RUND.pille, padding: "6px 11px",
                  }}>{s.emoji} {s.label}</button>
                );
              })}
            </div>

            {spott && (
              <div style={{
                marginTop: 14, background: C.ink2, border: `1px solid ${C.line}`,
                borderRadius: RUND.karte, padding: "14px", display: "flex", gap: 12, alignItems: "center",
              }}>
                <ReactionGif reaction={RANK_REACTIONS[spott.reaction] ?? RANK_REACTIONS.mittelfeld} size={84} />
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, flex: 1, minWidth: 0 }}>{spott.text}</p>
              </div>
            )}

            <button onClick={senden} disabled={blockiert} style={{
              width: "100%", marginTop: 16, cursor: blockiert ? "default" : "pointer",
              background: blockiert ? C.surface : C.akzent, color: blockiert ? C.muted : C.ink,
              fontWeight: 700, fontSize: 15, border: `1px solid ${blockiert ? C.line : C.akzent}`,
              borderRadius: RUND.karte, padding: "13px 0", fontFamily: "inherit",
            }}>
              {blockiert ? `${ziel.name} hat diesen Spieltag genug` : "Spott verschicken"}
            </button>
            {status && <div style={{ fontSize: 13, color: C.mint, marginTop: 8, textAlign: "center" }}>{status}</div>}
            <p style={{ fontSize: 11, color: C.muted, marginTop: 10, lineHeight: 1.5, textAlign: "center" }}>
              Geht über deine normale Teilen-Funktion raus — wir speichern keinen Spott.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Hint({ children }) {
  return <div style={{ fontSize: 13, color: C.muted, fontFamily: MONO, padding: "10px 0" }}>{children}</div>;
}
