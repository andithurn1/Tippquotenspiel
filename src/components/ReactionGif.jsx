"use client";

import { useState } from "react";
import { reactionSrc } from "@/lib/reactions";
import { MONO } from "@/lib/theme";

// Zeigt den Reaktions-Clip einer Reaktion (aus reactions.js). Format ist ein
// kurzes, stummes, loopendes MP4 unter public/reactions/<key>.mp4 (kleiner und
// schärfer als GIF, genau das, was Higgsfield als Clip liefert). Solange die
// Datei fehlt (oder nicht lädt), erscheint ein sauberer Emoji-Platzhalter — die
// App wirkt also fertig, auch bevor die echten Clips eingelegt sind. Sobald eine
// Datei da ist, zeigt dieselbe Komponente automatisch das Video.
export default function ReactionGif({ reaction, size = 120 }) {
  const [failed, setFailed] = useState(false);
  if (!reaction) return null;

  return (
    <div style={{
      width: size, height: size, borderRadius: 18, overflow: "hidden",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      background: `${reaction.tone}14`, border: `1px solid ${reaction.tone}44`,
      position: "relative",
    }}>
      {!failed && (
        <video
          src={reactionSrc(reaction.key)}
          autoPlay muted loop playsInline
          onError={() => setFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}
      {failed && (
        <>
          <div style={{ fontSize: size * 0.42, lineHeight: 1 }}>{reaction.emoji}</div>
          <div style={{
            marginTop: 6, fontFamily: MONO, fontSize: 10, letterSpacing: 1,
            color: reaction.tone, textTransform: "uppercase", textAlign: "center", padding: "0 6px",
          }}>{reaction.label}</div>
        </>
      )}
    </div>
  );
}
