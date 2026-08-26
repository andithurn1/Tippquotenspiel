"use client";

import { useEffect, useRef } from "react";
import { getStore } from "@/lib/store";
import { useAuth } from "@/components/AuthProvider";
import { useCurrentRound } from "@/components/RoundProvider";
import { sanitizeNotify, dueNotifications, DEFAULT_NOTIFY } from "@/lib/notify";
import { fertigeSpieltage } from "@/lib/zwischenabrechnung";
import { ueberholungen } from "@/lib/ueberholung";
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
// 🔴 DIESELBE Marke, die die Zwischenabrechnungs-Einblendung führt
// (`Zwischenabrechnung.jsx`) — mitgelesen, nicht ein zweites Mal geführt.
// Zwei Marken für „bis hierhin gesehen" liefen unweigerlich auseinander, und
// dann meldet die eine Seite etwas, das die andere längst gezeigt hat.
// ⚠️ Nur LESEN: geschrieben wird sie dort, wo der Nutzer die Einblendung
// wegklickt. Eine Benachrichtigung ist kein „gesehen".
const ABRECHNUNG_KEY = "tqs.abrechnung.gesehen.v1";
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
        // 🔴 `listRoundMatches`, nicht `listMatches` + eigener Filter. Beide
        // liefern heute dasselbe — der Store rechnet exakt diesen Ausdruck.
        // Genau das ist der Punkt: die Regel „welche Spiele gehören zur Runde"
        // hat EINE Stelle (Runden-Schicht, Frage 1). Wächst sie dort, wächst
        // sie hier mit; nachgebaut bliebe sie still auf dem alten Stand.
        // 🔴 ZP5 (25.08.2026): die drei neuen Arten brauchen Angaben, die
        // `notify.js` nicht selbst holen darf — sie ist store-frei. Geholt
        // wird hier, wo die Runden-Frage schon beantwortet ist.
        //
        // ⚠️ NUR was der Nutzer eingeschaltet hat: wer „Sperren" abwählt,
        // soll dafür auch keine Abfrage auslösen. Sonst kostet eine
        // abgeschaltete Meldung trotzdem eine Runde zur Datenbank.
        const [matches, tips, eingriffe, eintraege, verlauf] = await Promise.all([
          getStore().listRoundMatches(roundId),
          getStore().listTips({ roundId }),
          prefs.geblockt
            ? (getStore().getFremdEingriffe?.(roundId) ?? Promise.resolve([]))
            : Promise.resolve([]),
          prefs.abgerechnet
            ? (getStore().getRoundEntries?.(roundId) ?? Promise.resolve([]))
            : Promise.resolve([]),
          prefs.ueberholt
            ? (getStore().getLeaderboardHistory?.(roundId) ?? Promise.resolve([]))
            : Promise.resolve([]),
        ]);

        const gesehen = pruneZustellungen(lies(GESEHEN_KEY, []));
        const faellig = dueNotifications({
          matches, tips, userId: user.id, prefs, gesehen,
          eingriffe,
          // 🔴 „Spieltag abgerechnet" braucht den Vergleich mit dem STAND VON
          // VORHIN. Genau die Marke hält die Zwischenabrechnungs-Einblendung
          // schon (`tqs.abrechnung.gesehen.v1`) — hier wird sie MITGELESEN,
          // nicht ein zweites Mal geführt. Zwei Marken für „bis hierhin
          // gesehen" liefen unweigerlich auseinander, und dann meldet die eine
          // Seite etwas, das die andere längst gezeigt hat.
          //
          // ⚠️ Nur die EIGENEN Einträge zählen: `getRoundEntries` liefert die
          // der ganzen Runde.
          abrechnungen: prefs.abgerechnet
            ? fertigeSpieltage({
              eintraege: (eintraege ?? []).filter((x) => x.userId === user.id),
              // ⚠️ Die Marke ist eine nackte Zahl, kein JSON — `lies` würde
              // sie zwar parsen, aber ein leerer Wert ergäbe `null` statt 0.
              seit: (() => { try { return Number(localStorage.getItem(ABRECHNUNG_KEY)) || null; } catch { return null; } })(),
            })
            : [],
          // 🔴 Der eigene Rang von vorhin steht im VERLAUF — es braucht keine
          // gespeicherte Marke. Eine Marke im localStorage hinge am Gerät und
          // am Hinsehen; der Verlauf gibt auf jedem Gerät dieselbe Antwort.
          // Begründung ausgeschrieben im Kopf von `ueberholung.js`.
          ueberholungen: prefs.ueberholt ? ueberholungen(verlauf, user.id) : [],
        });
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
