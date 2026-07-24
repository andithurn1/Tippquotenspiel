// Web-App-Manifest (Next.js Metadata-Route) → macht die App auf dem Handy
// „zum Homescreen hinzufügbar" und im Standalone-Modus lauffähig.
export default function manifest() {
  return {
    name: "Tippquotenspiel",
    short_name: "Tippquoten",
    description:
      "Quoten-gewichtetes Tippspiel unter Freunden — mutige Tipps über echte Quoten statt fester Punkte.",
    start_url: "/",
    display: "standalone",
    background_color: "#0B0E1F",
    theme_color: "#0B0E1F",
    lang: "de",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
