"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Hauptmenu from "@/components/Hauptmenu";
import { usePrefs } from "@/components/PrefsProvider";

// App-Start: Standard ist das Hauptmenü (hier direkt gerendert, kein Redirect-
// Flackern für den Standardfall). Wer in den Einstellungen "Aktive Tipprunde"
// als Start gewählt hat, wird nach dem Laden der Prefs einmalig ins Runden-Hub
// weitergeleitet.
export default function RootPage() {
  const router = useRouter();
  const { prefs, ready } = usePrefs();

  useEffect(() => {
    if (ready && prefs.startScreen === "hub") router.replace("/hub");
  }, [ready, prefs.startScreen, router]);

  return <Hauptmenu />;
}
