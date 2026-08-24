"use client";

import { useEffect, useState } from "react";
import { getStore } from "@/lib/store";
import { useAuth } from "@/components/AuthProvider";
import BackLink from "@/components/BackLink";
import {
  AVATARS, DEFAULT_AVATAR, NAME_LIMITS,
  getAvatar, avatarColor, sanitizeDisplayName,
} from "@/lib/avatars";
import { isPremium, PREMIUM_FEATURES } from "@/lib/premium";
import { C, SCHRIFT, RUND } from "@/lib/theme";


// Avatar-Kreis — eine Stelle, damit Profil, Leaderboard & Co. gleich aussehen.
export function AvatarKreis({ id, size = 44 }) {
  const a = getAvatar(id);
  const farbe = avatarColor(id);
  return (
    <span aria-label={a.label} title={a.label} style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `${farbe}26`, border: `1px solid ${farbe}88`,
      fontSize: Math.round(size * 0.5), lineHeight: 1,
    }}>{a.emoji}</span>
  );
}

export default function Profil() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR);
  const [status, setStatus] = useState("laden");   // laden | bereit | speichern | ok | fehler
  const [geladen, setGeladen] = useState(false);
  const [premium, setPremium] = useState(false);

  useEffect(() => {
    if (!user) { setStatus("bereit"); return; }
    let live = true;
    getStore().getProfile(user.id)
      .then((p) => {
        if (!live) return;
        setName(p?.display_name ?? user.name ?? "");
        setAvatar(p?.avatar ?? DEFAULT_AVATAR);
        setPremium(isPremium(p));
        setGeladen(true);
        setStatus("bereit");
      })
      .catch(() => { if (live) setStatus("bereit"); });
    return () => { live = false; };
  }, [user]);

  const nameOk = sanitizeDisplayName(name) !== null;

  const speichern = async () => {
    if (!user || !nameOk) return;
    setStatus("speichern");
    try {
      await getStore().updateProfile(user.id, { displayName: name, avatar });
      setStatus("ok");
      setTimeout(() => setStatus("bereit"), 1600);
    } catch {
      setStatus("fehler");
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: C.ink, color: C.text,
      fontFamily: SCHRIFT,
      padding: "28px 16px", display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <div style={{ width: "100%", maxWidth: 520 }}>
        <BackLink href="/menu" label="Menü" />

        <h1 style={{ fontSize: "0.75rem", letterSpacing: 2, color: C.muted, textTransform: "uppercase", margin: "18px 0 14px" }}>
          Profil
        </h1>

        {!user ? (
          <p style={{ fontSize: "0.8125rem", color: C.akzent, lineHeight: 1.5 }}>
            Bitte zuerst auf der Startseite einloggen — dein Profil hängt an deinem Konto.
          </p>
        ) : (
          <>
            {/* Vorschau, so wie andere dich sehen */}
            <div style={{
              display: "flex", alignItems: "center", gap: 14,
              background: C.ink2, border: `1px solid ${C.line}`, borderRadius: RUND.karte, padding: "14px 16px",
            }}>
              <AvatarKreis id={avatar} size={52} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "0.9375rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {sanitizeDisplayName(name) ?? "—"}
                </div>
                <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 2 }}>
                  So sehen dich deine Mitspieler
                </div>
              </div>
              {premium && (
                <span style={{
                  marginLeft: "auto", fontSize: "0.6875rem", letterSpacing: 1, textTransform: "uppercase",
                  color: C.akzent, border: `1px solid ${C.akzent}55`, borderRadius: RUND.pille, padding: "3px 9px",
                }}>Premium</span>
              )}
            </div>

            {/* Status der Berechtigung — zeigt, was Premium in Runden freischaltet */}
            <div style={{
              marginTop: 12, background: premium ? `${C.mint}10` : C.ink2,
              border: `1px solid ${premium ? C.mint + "33" : C.line}`,
              borderRadius: RUND.karte, padding: "12px 15px",
            }}>
              <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: premium ? C.mint : C.text }}>
                {premium ? "✓ Premium aktiv" : "Premium nicht aktiv"}
              </div>
              <p style={{ fontSize: "0.75rem", color: C.muted, margin: "6px 0 0", lineHeight: 1.5 }}>
                {premium
                  ? "In Runden, die du als Admin anlegst, stehen die Zusatzfunktionen bereit."
                  : "Legst du eine Runde als Admin an, sind diese Funktionen gesperrt:"}
              </p>
              {!premium && (
                <ul style={{ margin: "7px 0 0", paddingLeft: 18, fontSize: "0.75rem", color: C.muted, lineHeight: 1.6 }}>
                  {PREMIUM_FEATURES.map((f) => (
                    <li key={f.key}><strong style={{ color: C.text }}>{f.label}</strong> — {f.desc}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Anzeigename */}
            <div style={{ marginTop: 20 }}>
              <label htmlFor="anzeigename" style={{ fontSize: "0.6875rem", letterSpacing: 1, color: C.muted, textTransform: "uppercase" }}>
                Anzeigename
              </label>
              <input id="anzeigename" value={name} onChange={(e) => setName(e.target.value)}
                maxLength={NAME_LIMITS.max + 10} placeholder="Wie sollen dich alle nennen?"
                style={{
                  width: "100%", marginTop: 7, boxSizing: "border-box",
                  background: C.surface, color: C.text, fontFamily: "inherit", fontSize: "0.9375rem",
                  border: `1px solid ${nameOk || name === "" ? C.line : C.coral}`,
                  borderRadius: RUND.karte, padding: "11px 13px", outline: "none",
                }} />
              <div style={{ fontSize: "0.6875rem", color: nameOk || name === "" ? C.muted : C.coral, marginTop: 6 }}>
                {nameOk || name === ""
                  ? `${NAME_LIMITS.min}–${NAME_LIMITS.max} Zeichen.`
                  : `Mindestens ${NAME_LIMITS.min} Zeichen.`}
              </div>
            </div>

            {/* Avatar-Auswahl */}
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: "0.6875rem", letterSpacing: 1, color: C.muted, textTransform: "uppercase" }}>
                Avatar
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {AVATARS.map((a) => {
                  const on = a.id === avatar;
                  return (
                    <button key={a.id} onClick={() => setAvatar(a.id)} title={a.label}
                      aria-pressed={on} style={{
                        cursor: "pointer", padding: 4, borderRadius: "50%", background: "transparent",
                        border: `2px solid ${on ? C.akzent : "transparent"}`, lineHeight: 0,
                      }}>
                      <AvatarKreis id={a.id} size={44} />
                    </button>
                  );
                })}
              </div>
              <p style={{ fontSize: "0.6875rem", color: C.muted, marginTop: 10, lineHeight: 1.45 }}>
                Eigene Fotos sind noch nicht freigeschaltet — das braucht erst eine
                Melde- und Prüfmöglichkeit (Auflage der App-Stores für Nutzerbilder).
              </p>
            </div>

            <button onClick={speichern} disabled={!nameOk || status === "speichern" || !geladen} style={{
              marginTop: 22, width: "100%",
              cursor: !nameOk || status === "speichern" ? "default" : "pointer",
              background: status === "ok" ? C.mint : C.akzent, color: C.ink,
              fontWeight: 700, fontSize: "0.9375rem", fontFamily: "inherit",
              border: "none", borderRadius: RUND.karte, padding: "13px 0",
              opacity: !nameOk || status === "speichern" ? 0.6 : 1,
            }}>
              {status === "speichern" ? "wird gespeichert …" : status === "ok" ? "✓ gespeichert" : "Profil speichern"}
            </button>
            {status === "fehler" && (
              <div style={{ fontSize: "0.75rem", color: C.coral, marginTop: 8 }}>
                Speichern fehlgeschlagen — bitte nochmal versuchen.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
