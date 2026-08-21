"use client";

import { useEffect, useState } from "react";
import { getStore } from "@/lib/store";
import { useAuth } from "@/components/AuthProvider";
import { useCurrentRound } from "@/components/RoundProvider";
import BackLink from "@/components/BackLink";
import { DEFAULT_RULES, sanitizeRules } from "@/lib/engine";
import { zeitachse, rundenSpieltagVon, achsenLabel } from "@/lib/zeitachse";
import { naechstesOffenesSpiel } from "@/lib/muenzstand";
import { basisFuer, WER } from "@/lib/jokerBasis";
import { C, MONO, SCHRIFT } from "@/lib/theme";

// ── Admin-Freigaben (design/kontaktstellen.md, letzte Teil-Wirkung) ──
//
// `jokerBasis.wer: "adminFreigabe"` heißt: einsetzen darf nur, wen der Admin
// für diesen Spieltag freigegeben hat. Die Einstellung war über die
// Profi-Oberfläche wählbar — und ohne jede Wirkung, weil es keinen Ort gab,
// an dem eine Freigabe entsteht. `darfEinsetzen` lehnte konsequent ab.
//
// 🔴 Diese Ansicht ist deshalb kein Komfort, sondern der Teil, ohne den die
// Einstellung nicht existiert. Genau davor warnt der Baukasten-Grundsatz:
// „eine Einstellung, die ins Leere läuft, ist kein Baukastenteil."
//
// ⚠️ Gearbeitet wird in RUNDEN-Spieltagen. `darfEinsetzen` vergleicht die
// Freigabe mit `kontext.aktuellerSpieltag`, und der zählt rundenweit — der
// Liga-Spieltag wäre in einer Runde über fünf Wettbewerbe mehrdeutig
// („Spieltag 5" gibt es dort fünfmal).
//
// ⚠️ Wer schreiben darf, entscheidet die DATENBANK (RLS an `rounds.admin_id`),
// nicht dieser Screen. Die Sperre hier ist Höflichkeit, nicht Sicherheit —
// sonst hinge sie am Client.
const FENSTER = 6;   // so viele Spieltage im Blick: der aktuelle und die nächsten

export default function AdminFreigaben() {
  const { user } = useAuth();
  const { roundId } = useCurrentRound();
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [adminId, setAdminId] = useState(null);
  const [matches, setMatches] = useState(null);
  const [mitglieder, setMitglieder] = useState([]);
  const [freigaben, setFreigaben] = useState([]);
  const [busy, setBusy] = useState(null);

  const laden = async () => {
    const [round, ms, leute, fg] = await Promise.all([
      getStore().getRound(roundId),
      // ⚠️ Die Spiele DIESER Runde — eine Freigabe gilt für einen Runden-Spieltag,
      // und der zählt über die Spiele der Runde (siehe `listRoundMatches`).
      getStore().listRoundMatches(roundId),
      getStore().listMembers(roundId), getStore().listAdminFreigaben({ roundId }),
    ]);
    setRules(sanitizeRules(round?.rules ?? DEFAULT_RULES));
    setAdminId(round?.admin_id ?? null);
    setMatches(ms);
    setMitglieder(leute ?? []);
    setFreigaben(fg ?? []);
  };

  useEffect(() => { laden().catch(() => {}); /* eslint-disable-next-line */ }, [roundId]);

  const istAdmin = user != null && adminId != null && user.id === adminId;
  const achse = zeitachse(matches ?? [], rules.zeitachse);
  const naechstes = naechstesOffenesSpiel(matches ?? [], new Date());
  const jetzt = naechstes ? rundenSpieltagVon(achse, naechstes) : null;

  // Welche Joker-Arten stehen in dieser Runde überhaupt auf „Admin-Freigabe"?
  // Steht keine darauf, ist der Screen gegenstandslos — und sagt das, statt
  // eine leere Tabelle zu zeigen.
  const artenMitFreigabe = ["joker.einzel", "joker.ranking", "duell.klau", "duell.block", "drehrad"]
    .filter((art) => basisFuer(art, rules)?.wer === "adminFreigabe");

  const spieltage = jetzt == null
    ? []
    : Array.from({ length: FENSTER }, (_, i) => jetzt + i).filter((t) => t <= (achse.length || 34));

  const frei = (userId, spieltag) =>
    freigaben.some((f) => f.userId === userId && f.spieltag === spieltag);

  const umschalten = async (userId, spieltag) => {
    if (!istAdmin) return;
    const key = `${userId}|${spieltag}`;
    setBusy(key);
    try {
      await getStore().setAdminFreigabe({ roundId, userId, matchday: spieltag, an: !frei(userId, spieltag) });
      await laden();
    } finally { setBusy(null); }
  };

  const nameVon = (m) => m.name ?? m.display_name ?? m.user_id ?? m.userId;

  return (
    <div style={{
      minHeight: "100vh", background: C.ink, color: C.text,
      fontFamily: SCHRIFT,
      padding: "28px 16px", display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <div style={{ width: "100%", maxWidth: 560 }}>
        <BackLink href="/hub" label="Tippspiel" />
        <h1 style={{ fontSize: 12, letterSpacing: 2, color: C.muted, textTransform: "uppercase", margin: "18px 0 6px" }}>
          Freigaben
        </h1>
        <p style={{ fontSize: 12.5, color: C.muted, margin: "0 0 14px", lineHeight: 1.5 }}>
          {WER.find((w) => w.key === "adminFreigabe")?.desc
            ?? "Einsetzen darf nur, wer für diesen Spieltag freigegeben ist."}
        </p>

        {matches == null && <div style={{ fontFamily: MONO, fontSize: 13, color: C.muted }}>lädt …</div>}

        {matches != null && artenMitFreigabe.length === 0 && (
          <Kasten>
            In dieser Runde hängt nichts an einer Freigabe. Sie wird gebraucht, sobald
            der Admin in der Profi-Ansicht bei einer Joker-Art „nur nach Freigabe“
            einstellt — bis dahin ändert hier nichts etwas.
          </Kasten>
        )}

        {matches != null && artenMitFreigabe.length > 0 && !istAdmin && (
          <Kasten>
            Freigaben erteilt nur der Admin dieser Runde. Unten siehst du, wofür du
            selbst freigegeben bist.
          </Kasten>
        )}

        {matches != null && artenMitFreigabe.length > 0 && jetzt == null && (
          <Kasten>Kein anstehender Spieltag — es gibt gerade nichts freizugeben.</Kasten>
        )}

        {matches != null && artenMitFreigabe.length > 0 && jetzt != null && (
          <>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, lineHeight: 1.45 }}>
              Betroffen: {artenMitFreigabe.length === 1 ? "eine Joker-Art" : `${artenMitFreigabe.length} Joker-Arten`}.
              {" "}Angezeigt sind der aktuelle und die nächsten Spieltage der Runde —
              nicht die Liga-Spieltage, denn eine Freigabe gilt rundenweit.
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", fontSize: 12.5, minWidth: 360 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "6px 10px 6px 0", color: C.muted, fontWeight: 400 }}>
                      Mitspieler
                    </th>
                    {spieltage.map((t) => (
                      <th key={t} title={achsenLabel(achse[t - 1]) || undefined} style={{
                        padding: "6px 8px", color: t === jetzt ? C.akzent : C.muted,
                        fontFamily: MONO, fontWeight: t === jetzt ? 700 : 400,
                      }}>{t}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mitglieder.map((m) => {
                    const id = m.user_id ?? m.userId ?? m.id;
                    return (
                      <tr key={id}>
                        <td style={{ padding: "6px 10px 6px 0", whiteSpace: "nowrap" }}>{nameVon(m)}</td>
                        {spieltage.map((t) => {
                          const an = frei(id, t);
                          const key = `${id}|${t}`;
                          return (
                            <td key={t} style={{ padding: "4px 4px", textAlign: "center" }}>
                              <button
                                disabled={!istAdmin || busy === key}
                                onClick={() => umschalten(id, t)}
                                title={an ? "Freigegeben — zum Zurücknehmen klicken" : "Nicht freigegeben"}
                                style={{
                                  width: 30, height: 30, borderRadius: 9, cursor: istAdmin ? "pointer" : "default",
                                  fontFamily: "inherit", fontSize: 13,
                                  background: an ? `${C.mint}22` : C.surface,
                                  color: an ? C.mint : "rgba(138,144,180,0.5)",
                                  border: `1px solid ${an ? C.mint + "66" : C.line}`,
                                }}>{an ? "✓" : "·"}</button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p style={{ fontSize: 10.5, color: C.muted, marginTop: 12, lineHeight: 1.45 }}>
              Eine Freigabe gilt für genau diesen Runden-Spieltag und lässt sich jederzeit
              zurücknehmen. Sie erlaubt das Einsetzen — sie erzwingt es nicht.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Kasten({ children }) {
  return (
    <div style={{
      background: C.ink2, border: `1px solid ${C.line}`, borderRadius: 14,
      padding: "14px 16px", fontSize: 13, color: C.muted, lineHeight: 1.5, marginBottom: 12,
    }}>{children}</div>
  );
}
