"use client";

import { useEffect, useRef } from "react";
import { getStore } from "@/lib/store";
import { useAuth } from "@/components/AuthProvider";
import { useCurrentRound } from "@/components/RoundProvider";
import { filterMatchesByTeams } from "@/lib/roundStatus";
import { sanitizeNotify, dueNotifications, DEFAULT_NOTIFY } from "@/lib/notify";
import { zustellbar, merkeZustellung, pruneZustellungen } from "@/lib/zustellung";
import { waehleKanal, STATUS } from "@/lib/pushKanal";

// ── Der Auslöser für Benachrichtigungen ─────────────────────
// `notify.js` weiß, WAS fällig wäre, `zustellung.js`, was rausgehen darf, und
// `pushKanal.js`, wie man es anzeigt. Es fehlte das Stück, das regelmäßig
// nachsieht — ohne das wäre die ganze Kette toter Code (derselbe Fehler wie bei
// `openMatchday`, das nie jemand aufrief).
//
// Rendert nichts. Hängt im Layout, damit es auf JEDER Seite läuft: eine
// Erinnerung „dein Spiel beginnt in einer Stunde" darf nicht davon abhängen,
// auf welchem Screen man gerade steht.
//
// ⚠️ Grenze, die bewusst so ist: das läuft nur, solange die App geöffnet ist.
// Zustellung bei geschlossener App wäre echtes Web-Push (Stufe 2) und braucht
// Server-Schlüssel — siehe pushKanal.js.

const PREFS_KEY = "tqs.notify.v1";
const GESEHEN_KEY = "tqs.notify.gesehen.v1";
const INTERVALL_MS = 5 * 60 * 1000;

const lies = (key, fallback) => {
  try {
    const roh = localStorage.getItem(key);
    return roh ? JSON.parse(roh) : fallback;
  } catch { return fallback; }
};

export default function NotifyRunner() {
  const { user } = useAuth();
  const { roundId } = useCurrentRound();
  // Verhindert, dass zwei Durchläufe (Intervall + Sichtbarkeitswechsel)
  // gleichzeitig laufen und dieselbe Meldung doppelt zustellen.
  const laeuft = useRef(false);

  useEffect(() => {
    if (!user || !roundId) return;
    let aktiv = true;

    const durchlauf = async () => {
      if (!aktiv || laeuft.current) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;

      const prefs = sanitizeNotify(lies(PREFS_KEY, DEFAULT_NOTIFY));
      if (!prefs.enabled) return;                      // aus = gar nichts laden
      const kanal = waehleKanal();
      if (kanal.status() !== STATUS.erlaubt) return;   // ohne Erlaubnis nichts holen

      laeuft.current = true;
      try {
        const [round, alle, tips] = await Promise.all([
          getStore().getRound(roundId),
          getStore().listMatches(),
          getStore().listTips({ roundId }),
        ]);
        // Nur die Spiele DIESER Runde — sonst erinnert eine Bundesliga-Runde
        // an Spiele der Serie A, die gar nicht dazugehören.
        const matches = filterMatchesByTeams(alle, round?.team_filter);

        const gesehen = pruneZustellungen(lies(GESEHEN_KEY, []));
        const faellig = dueNotifications({ matches, tips, userId: user.id, prefs, gesehen });
        const raus = zustellbar({ faellig, gesehen, prefs });
        if (!raus.length) return;

        let stand = gesehen;
        for (const eintrag of raus) {
          // Erst zustellen, dann verbuchen: was nicht angezeigt wurde, darf
          // nicht als erledigt gelten, sonst verschwindet die Meldung für immer.
          const angezeigt = await kanal.zeige(eintrag, {
            url: eintrag.matchId ? `/tippen/${eintrag.matchId}` : "/tippen",
          });
          if (angezeigt) stand = merkeZustellung(stand, eintrag, Date.now());
        }
        if (stand !== gesehen) {
          try { localStorage.setItem(GESEHEN_KEY, JSON.stringify(stand)); } catch {}
        }
      } catch {
        // Eine fehlgeschlagene Benachrichtigung darf die App nie mitreißen.
      } finally {
        laeuft.current = false;
      }
    };

    // Beim Öffnen einmal sofort, danach im Takt — und immer, wenn der Nutzer
    // zur App zurückkehrt (der Timer steht in Hintergrund-Tabs oft still).
    durchlauf();
    const timer = setInterval(durchlauf, INTERVALL_MS);
    const beiSichtbar = () => { if (document.visibilityState === "visible") durchlauf(); };
    document.addEventListener("visibilitychange", beiSichtbar);
    return () => {
      aktiv = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", beiSichtbar);
    };
  }, [user, roundId]);

  return null;
}
