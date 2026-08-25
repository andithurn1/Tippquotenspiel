import Regelaenderungen from "@/components/Regelaenderungen";

// ⚠️ Eigene Route neben `/abstimmung`: dort geht es um die Joker-Spieltage
// (voting.js), hier um Änderungen AM REGELWERK. Zwei verschiedene Fragen —
// sie in einen Screen zu legen, wäre genau die Verwechslung, vor der
// design/abstimmung-verfassung.md ganz oben warnt.
export const metadata = { title: "Regeländerungen · QuotenTippspiel" };

export default function RegelnPage() {
  return <Regelaenderungen />;
}
