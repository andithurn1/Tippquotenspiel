// ============================================================
//  WOHIN GEHEN DIE EIGENEN API-AUFRUFE? (26.08.2026)
//
//  🔴 Der Anlass ist die native App. Im Browser ist der Ursprung
//  `https://…netlify.app`, und `fetch("/api/…")` trifft die eigene Seite. In
//  einem Capacitor-Container ist der Ursprung `capacitor://localhost` — die
//  gleiche Zeile zeigt dann ins Nichts, und zwar ohne Fehlermeldung, die
//  darauf hinweist: man bekommt einen Netzwerkfehler und sucht ihn im Backend.
//
//  ⚠️ Die vier API-Routen können NICHT in die App wandern. Sie brauchen den
//  `service_role`-Key bzw. den Quoten-Schlüssel, und der darf nie ins
//  Frontend (Architektur-Regel 2). Sie bleiben, wo sie sind; die App ruft sie
//  über HTTPS. Das ist keine Notlösung, sondern die richtige Aufteilung.
//
//  Im Web bleibt `NEXT_PUBLIC_API_BASIS` LEER — dann ist `apiPfad("/api/x")`
//  wieder genau `/api/x`, und es ändert sich nichts. Erst der App-Build setzt
//  die Variable auf die Live-Adresse.
// ============================================================

// Ohne abschließenden Schrägstrich, damit `basis + pfad` nie „//" ergibt.
const ROH = (process.env.NEXT_PUBLIC_API_BASIS ?? "").trim();
export const API_BASIS = ROH.replace(/\/+$/, "");

// ⚠️ Nimmt NUR eigene Pfade. Eine vollständige Adresse bleibt unangetastet —
// sonst entstünde beim Durchreichen einer fremden URL ein Doppel-Präfix.
export function apiPfad(pfad) {
  const p = String(pfad ?? "");
  if (/^https?:\/\//i.test(p)) return p;
  if (!API_BASIS) return p;
  return API_BASIS + (p.startsWith("/") ? p : `/${p}`);
}
