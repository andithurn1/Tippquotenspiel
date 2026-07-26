// ── Service Worker: nur für Benachrichtigungen ──────────────
// Bewusst KEIN Offline-Caching. Ein Cache, der Quoten oder Spielstände
// zwischenspeichert, würde alte Zahlen zeigen — bei einem Tippspiel ist das
// schlimmer als eine Fehlermeldung. Dieser Worker existiert aus zwei Gründen:
//
// 1) Mobile Browser erlauben `new Notification(...)` nicht mehr. Meldungen
//    gehen dort nur über `registration.showNotification()`, und das setzt einen
//    registrierten Worker voraus.
// 2) Der Klick auf eine Meldung soll das BEREITS OFFENE Fenster nach vorn
//    holen, statt einen zweiten Tab derselben App zu öffnen.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const ziel = event.notification.data?.url || "/";
  event.waitUntil((async () => {
    const fenster = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of fenster) {
      // Gleiche Herkunft = unsere App. Fokussieren und dorthin navigieren,
      // wo die Meldung hinführt.
      if ("focus" in client) {
        await client.focus();
        if ("navigate" in client && ziel) { try { await client.navigate(ziel); } catch {} }
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(ziel);
  })());
});

// Vorbereitet für Stufe 2 (echtes Web-Push). Ohne Server-Versand kommt hier nie
// ein Ereignis an — der Handler steht trotzdem, damit die spätere Erweiterung
// nur noch Schlüssel und Versand-Route braucht und nicht diese Datei.
self.addEventListener("push", (event) => {
  let daten = {};
  try { daten = event.data ? event.data.json() : {}; } catch {}
  if (!daten.titel) return;
  event.waitUntil(self.registration.showNotification(daten.titel, {
    body: daten.text ?? "",
    tag: daten.key,
    data: { url: daten.url ?? "/", key: daten.key },
    icon: "/icon-192.png",
    badge: "/icon-192.png",
  }));
});
