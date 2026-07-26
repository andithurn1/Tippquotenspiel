// ============================================================
//  PUSH-KANAL — die austauschbare Zustell-Schicht
//
//  `notify.js` sagt, WAS fällig ist. `zustellung.js` sagt, was davon rausgeht.
//  Diese Datei bringt es auf den Bildschirm — und ist die EINE Stelle, die
//  dafür getauscht wird, genau wie `getStore()` und die Quoten-Quelle
//  (Architektur-Regel 2).
//
//  ── Stufe 1: System-Benachrichtigung des Geräts (das hier) ──
//  Läuft ohne Server, ohne Schlüssel, ohne zusätzliche Tabelle. Grenze, die man
//  kennen muss: sie erreicht den Nutzer nur, solange die App im Browser LÄUFT
//  (Tab offen oder im Hintergrund). Für ein Tippspiel deckt das den Hauptfall
//  ab — man hat die App am Spieltag ohnehin offen.
//
//  ── Stufe 2: echtes Web-Push (später) ──
//  Erreicht den Nutzer auch bei geschlossener App, braucht aber VAPID-Schlüssel
//  (Server-Env), eine Tabelle für die Subscriptions und eine Versand-Route.
//  Das ist eine Betriebs- und Schema-Entscheidung, keine UI-Frage — deshalb
//  hängt es hier als zweiter Kanal daneben, statt Stufe 1 zu ersetzen.
//  `waehleKanal()` ist der Punkt, an dem das entschieden wird.
//
//  Alles hier ist browser-abhängig und deshalb defensiv geschrieben: auf dem
//  Server (SSR) und in älteren Browsern gibt es weder `Notification` noch
//  Service Worker. Kein Aufruf darf deswegen werfen — eine fehlgeschlagene
//  Benachrichtigung darf nie den Screen mitreißen.
// ============================================================

export const SW_PFAD = "/sw.js";

// Zustände, die die Oberfläche unterscheiden MUSS. „Geht nicht" und „du hast
// nein gesagt" sind für den Nutzer zwei völlig verschiedene Nachrichten — beim
// einen kann er etwas tun, beim anderen nicht.
export const STATUS = {
  nichtUnterstuetzt: "nichtUnterstuetzt",
  offen: "offen",           // noch nie gefragt
  erlaubt: "erlaubt",
  verweigert: "verweigert",
};

export const STATUS_TEXT = {
  nichtUnterstuetzt: "Dieses Gerät kann keine Benachrichtigungen anzeigen.",
  offen: "Noch nicht erlaubt — beim Einschalten fragt dich das Gerät.",
  erlaubt: "Dieses Gerät zeigt Benachrichtigungen an.",
  verweigert: "Dein Gerät blockiert Benachrichtigungen — das lässt sich nur in den Systemeinstellungen ändern.",
};

const hatNotification = () => typeof window !== "undefined" && typeof Notification !== "undefined";

export function kanalStatus() {
  if (!hatNotification()) return STATUS.nichtUnterstuetzt;
  const p = Notification.permission;
  return p === "granted" ? STATUS.erlaubt : p === "denied" ? STATUS.verweigert : STATUS.offen;
}

// Erlaubnis erfragen. Gibt den NEUEN Status zurück, damit der Aufrufer nicht
// selbst nachsehen muss. Nie werfen — ein blockierter Dialog ist ein normaler
// Ausgang, kein Fehler.
export async function erlaubnisAnfragen() {
  if (!hatNotification()) return STATUS.nichtUnterstuetzt;
  if (Notification.permission !== "default") return kanalStatus();
  try {
    await Notification.requestPermission();
  } catch {}
  return kanalStatus();
}

// Service Worker registrieren. Nötig, weil mobile Browser (allen voran iOS und
// Android-Chrome) `new Notification(...)` NICHT mehr erlauben — dort geht es
// ausschließlich über `registration.showNotification()`. Auf dem Desktop ist es
// der Weg zum Klick-Verhalten (App fokussieren statt neuem Tab).
export async function registriereWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register(SW_PFAD);
  } catch {
    return null;
  }
}

// Eine Meldung anzeigen. `eintrag` ist ein Element aus dueNotifications().
// Rückgabe: true, wenn sie tatsächlich rausging — nur dann darf der Aufrufer
// sie als zugestellt verbuchen, sonst verschwände sie stillschweigend.
export async function zeige(eintrag, { url = "/" } = {}) {
  if (kanalStatus() !== STATUS.erlaubt || !eintrag?.titel) return false;
  const optionen = {
    body: eintrag.text ?? "",
    // `tag` = derselbe stabile Schlüssel wie in der Buchführung: das Gerät
    // ersetzt damit eine gleichartige Meldung, statt sie zu stapeln.
    tag: eintrag.key,
    data: { url, key: eintrag.key, art: eintrag.art ?? null },
    icon: "/icon-192.png",
    badge: "/icon-192.png",
  };
  try {
    const reg = typeof navigator !== "undefined" && navigator.serviceWorker
      ? await navigator.serviceWorker.getRegistration()
      : null;
    if (reg?.showNotification) {
      await reg.showNotification(eintrag.titel, optionen);
      return true;
    }
    // Fallback für Desktop-Browser ohne registrierten Worker.
    new Notification(eintrag.titel, optionen);
    return true;
  } catch {
    return false;
  }
}

// Der Kanal als Objekt — dieselbe Bauart wie `getStore()`. Wer später Web-Push
// ergänzt, gibt hier eine andere Implementierung mit derselben Schnittstelle
// zurück; `notify.js` und die Screens merken davon nichts.
export function waehleKanal() {
  return {
    name: "system",
    status: kanalStatus,
    erlaubnisAnfragen,
    registriereWorker,
    zeige,
  };
}
