// Die Stilebene (Tokens, Zustände, Bewegung). Sie ändert von sich aus NICHTS
// am Aussehen — eine Komponente muss eine Klasse nehmen, damit etwas passiert.
// Begründung dafür steht im Kopf der Datei.
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import { RueckmeldungProvider } from "@/components/Rueckmeldung";
import PrefsProvider from "@/components/PrefsProvider";
import RoundProvider from "@/components/RoundProvider";
import ThemeProvider from "@/components/ThemeProvider";
import NotifyRunner from "@/components/NotifyRunner";
import Zwischenabrechnung from "@/components/Zwischenabrechnung";
import Platzkulisse from "@/components/Platzkulisse";

export const metadata = {
  title: "QuotenTippspiel",
  description:
    "Quoten-gewichtetes Tippspiel unter Freunden — mutige Tipps über echte Quoten statt fester Punkte.",
  applicationName: "QuotenTippspiel",
  appleWebApp: {
    capable: true,
    title: "QuotenTipp",
    // 🔴 `default` statt `black-translucent` (09.08.2026, Andi gemeldet:
    // „auf dem Homebildschirm ist die Schrift unsichtbar").
    //
    // Ein Überbleibsel des Theme-Wechsels vom 07.08.: `black-translucent`
    // heißt, dass die Seite UNTER die Statusleiste läuft und iOS deren
    // Inhalt — Uhrzeit, Akku, Empfang — in WEISS zeichnet. Das war richtig,
    // solange die App dunkel war. Auf dem jetzt weißen Hintergrund ist es
    // weiß auf weiß.
    //
    // ⚠️ Nicht am Wort „black" hängenbleiben: es beschreibt nicht die Farbe
    // der Leiste, sondern die erwartete Helligkeit des INHALTS darunter.
    // `default` legt die Leiste über die Seite und zeichnet sie dunkel —
    // das Richtige für eine helle App. Wer das Theme je zurückdreht, dreht
    // diese Zeile mit.
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport = {
  themeColor: "#FFFFFF",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body style={{ margin: 0, background: "#FFFFFF", minHeight: "100vh" }}>
        {/* 🔴 GANZ AUSSEN, und das ist der Punkt: `AuthProvider` selbst muss
            melden können („Angemeldet als …"). Läge die Rückmeldung weiter
            innen, wäre ausgerechnet der Vorgang stumm, den Andi als Beispiel
            genannt hat. */}
        <RueckmeldungProvider>
        <AuthProvider>
          <RoundProvider>
            <PrefsProvider>
              <ThemeProvider>
                {/* Rendert nichts — sieht nur regelmäßig nach, ob eine
                    Benachrichtigung fällig ist. Gehört ins Layout, weil eine
                    Erinnerung nicht davon abhängen darf, auf welchem Screen
                    man gerade steht. */}
                {/* Fußball-Andeutung am Rand — reine Dekoration, ganz hinten
                    und nicht anklickbar. Begründung in der Datei. */}
                <Platzkulisse />
                <NotifyRunner />
                {/* Meldet sich beim Öffnen, wenn Spiele fertig geworden sind,
                    auf die man getippt hat — aus demselben Grund hier und
                    nicht auf der Abrechnungs-Seite: eine Nachricht, die man
                    nur sieht, wenn man ohnehin nachschaut, ist keine.
                    Abstellbar über `prefs.zwischenabrechnung`. */}
                <Zwischenabrechnung />
                {children}
              </ThemeProvider>
            </PrefsProvider>
          </RoundProvider>
        </AuthProvider>
        </RueckmeldungProvider>
      </body>
    </html>
  );
}
