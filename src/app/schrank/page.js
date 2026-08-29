"use client";
// Der Trophäenschrank. Eigene Seite statt eines Abschnitts in `/account`:
// dreißig Abzeichen in fünf Gruppen sind kein Zeilen-Eintrag, und Andis
// Einordnung („bei meinem Account und Fanfarben") ist ein ORT im Menü, keine
// Vorgabe für die Seitenlänge.
import Trophaeenschrank from "@/components/Trophaeenschrank";

export default function SchrankPage() {
  return <Trophaeenschrank />;
}
