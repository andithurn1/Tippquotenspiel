// Web-App-Manifest (Next.js Metadata-Route) → macht die App auf dem Handy
// „zum Homescreen hinzufügbar" und im Standalone-Modus lauffähig.
// 🔴 `force-static` (26.08.2026): Next.js macht aus dieser Datei die Route
// `/manifest.webmanifest`, und eine Route ohne diese Zeile bricht den
// statischen Export ab — gemessen beim ersten `npm run build:app`.
//
// ⚠️ Für den Web-Build ändert sich dadurch NICHTS: das Manifest hängt von
// keiner Anfrage ab, es ist für jeden Besucher dasselbe. Die Zeile schreibt
// nur auf, was ohnehin gilt.
export const dynamic = "force-static";

export default function manifest() {
  return {
    name: "QuotenTippspiel",
    short_name: "QuotenTipp",
    description:
      "Quoten-gewichtetes Tippspiel unter Freunden — mutige Tipps über echte Quoten statt fester Punkte.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#FFFFFF",
    lang: "de",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
