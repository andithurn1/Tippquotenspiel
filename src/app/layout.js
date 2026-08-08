import AuthProvider from "@/components/AuthProvider";
import PrefsProvider from "@/components/PrefsProvider";
import RoundProvider from "@/components/RoundProvider";
import ThemeProvider from "@/components/ThemeProvider";
import NotifyRunner from "@/components/NotifyRunner";
import Zwischenabrechnung from "@/components/Zwischenabrechnung";
import Platzkulisse from "@/components/Platzkulisse";

export const metadata = {
  title: "Tippquotenspiel",
  description:
    "Quoten-gewichtetes Tippspiel unter Freunden — mutige Tipps über echte Quoten statt fester Punkte.",
  applicationName: "Tippquotenspiel",
  appleWebApp: {
    capable: true,
    title: "Tippquoten",
    statusBarStyle: "black-translucent",
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
      </body>
    </html>
  );
}
