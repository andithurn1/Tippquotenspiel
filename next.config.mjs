/** @type {import('next').NextConfig} */

// ============================================================
//  ZWEI BUILDS AUS EINEM CODE (26.08.2026)
//
//  🔴 Der Grund ist die native App. Capacitor braucht einen STATISCHEN Export
//  (`out/`), und `output: "export"` verträgt keine API-Routen: gemessen bricht
//  der Build mit „export const dynamic … not configured on route /api/odds" ab.
//
//  ⚠️ Die Routen können auch nicht einfach `force-static` bekommen — sie
//  BRAUCHEN einen Server. Alle vier arbeiten mit dem `service_role`-Key bzw.
//  dem Quoten-Schlüssel, und der darf nie ins Frontend (Architektur-Regel 2).
//
//  Also zwei Builds aus demselben Code:
//    `npm run build`      → Netlify, mit API-Routen (unverändert)
//    `npm run build:app`  → `out/` für Capacitor, ohne API-Routen
//
//  Die App ruft die Routen dann über `NEXT_PUBLIC_API_BASIS` auf der
//  Netlify-Adresse — siehe `src/lib/apiBasis.js`.
// ============================================================
const appBuild = process.env.TQS_APP_BUILD === "1";

const nextConfig = appBuild
  ? {
    output: "export",
    // ⚠️ Ohne das versucht der Export den Bild-Optimierer aufzurufen, den es
    // in einer statischen Ausgabe nicht gibt.
    images: { unoptimized: true },
    // Erzeugt `/tippen/index.html` statt `/tippen.html` — im Container wird
    // aus dem Dateisystem geladen, und Ordner mit `index.html` finden sich
    // ohne Server-Regeln.
    trailingSlash: true,
  }
  : {};

export default nextConfig;
