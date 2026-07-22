import AuthProvider from "@/components/AuthProvider";
import PrefsProvider from "@/components/PrefsProvider";
import RoundProvider from "@/components/RoundProvider";

export const metadata = {
  title: "Tippquotenspiel",
  description:
    "Quoten-gewichtetes Tippspiel unter Freunden — mutige Tipps über echte Quoten statt fester Punkte.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body style={{ margin: 0, background: "#0B0E1F", minHeight: "100vh" }}>
        <AuthProvider>
          <RoundProvider>
            <PrefsProvider>{children}</PrefsProvider>
          </RoundProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
