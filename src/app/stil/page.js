import Stilmuster from "@/components/Stilmuster";

// Musterseite — hängt bewusst an keiner Navigation. Sie ist das gemeinsame
// Vokabular für Gestaltungsfragen, kein Teil des Spiels. Erreichbar über /stil.
export const metadata = { title: "Musterseite · QuotenTippspiel" };

export default function StilPage() {
  return <Stilmuster />;
}
