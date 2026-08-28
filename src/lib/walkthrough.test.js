import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  WALKTHROUGH_KAPITEL, SCHRITTE, KAPITEL_ANZAHL, schrittAn, weiter, zurueck,
  kapitelUeberspringen, kapitelAnfang, fortschritt,
} from "./walkthrough";
import { BELOHNUNGS_TYPEN, HAEUFIGKEITEN, AUSSCHLUSS_REICHWEITEN, EREIGNIS_TRIFFT } from "./drehrad";

// ============================================================
//  Der geführte Rundgang (RF5)
//
//  Zwei Sorten Prüfung stehen hier, und die zweite ist die wichtigere:
//   • dass die Navigation stimmt (durchklicken, zurück, Kapitel überspringen)
//   • 🔴 dass die INHALTE nicht von der Wirklichkeit abweichen — die
//     Pfeil-Ziele müssen es auf dem Screen geben, und jede Rad-Funktion muss
//     vorkommen. Ein Tutorial, das etwas Falsches erklärt, ist schlimmer als
//     keines: es kostet Vertrauen, das man einmal ausgibt.
// ============================================================

const SCREEN = readFileSync("src/components/Spielerstellung.jsx", "utf8");

describe("Aufbau", () => {
  it("es gibt Kapitel und Schritte — sonst prüft hier nichts etwas", () => {
    expect(KAPITEL_ANZAHL).toBeGreaterThan(4);
    expect(SCHRITTE.length).toBeGreaterThan(15);
  });

  it("jeder Schlüssel kommt nur einmal vor", () => {
    const k = WALKTHROUGH_KAPITEL.map((x) => x.key);
    expect(new Set(k).size).toBe(k.length);
    const s = SCHRITTE.map((x) => x.key);
    expect(new Set(s).size).toBe(s.length);
  });

  it("jeder Schritt trägt Titel und Text", () => {
    for (const s of SCHRITTE) {
      expect(s.titel?.length, s.key).toBeGreaterThan(8);
      expect(s.text?.length, s.key).toBeGreaterThan(40);
    }
  });

  // 🔴 Andi ausdrücklich: „direkt am Anfang wird man darüber aufgeklärt" —
  // dass man den Rundgang gar nicht braucht, wenn man einen guten Code hat.
  // Das ist keine Kosmetik, sondern sein eigentlicher Punkt: ein Code von
  // jemandem, der sich das überlegt hat, ist der schnellere Weg als jeder
  // Regler. Steht das nicht am Anfang, liest es niemand.
  it("🔴 das ERSTE Kapitel handelt vom Ausweg über einen Code", () => {
    const erstes = WALKTHROUGH_KAPITEL[0];
    const text = erstes.schritte.map((s) => `${s.titel} ${s.text}`).join(" ").toLowerCase();
    expect(text).toMatch(/code/);
    expect(text).toMatch(/teil-?code|stückweise|stueckweise/);
    // Und der Hinweis, dass man aussteigen darf.
    expect(text).toMatch(/überspringen|brauchst du (das )?nicht|musst das hier nicht/);
  });
});

describe("Die Pfeile zeigen auf Elemente, die es gibt", () => {
  it("jedes `ziel` kommt als id in Spielerstellung.jsx vor", () => {
    const fehlend = [...new Set(SCHRITTE.map((s) => s.ziel).filter(Boolean))]
      .filter((id) => !SCREEN.includes(`id="${id}"`));
    expect(
      fehlend,
      "Diese Rundgang-Ziele gibt es auf dem Screen nicht (mehr) — der Pfeil "
      + "zeigte ins Leere:\n" + fehlend.join("\n"),
    ).toEqual([]);
  });

  it("mindestens die Hälfte der Schritte zeigt auf etwas", () => {
    // Sonst wäre es kein Rundgang, sondern ein Textheft — und Andis Bild war
    // ausdrücklich das Tutorial eines Aufbauspiels.
    const mitZiel = SCHRITTE.filter((s) => s.ziel).length;
    expect(mitZiel).toBeGreaterThan(4);
  });
});

// ============================================================
//  🔴 DIE SPERRKLINKE: „grade das Drehrad mit allen funktionen muss gut
//  erklärt werden" (Andi, 29.08.2026)
//
//  Wer ein neues Rad-Feld baut, bekommt hier einen roten Test, bis er es auch
//  erklärt. Genau dafür liest `walkthrough.js` die Kataloge aus `drehrad.js`,
//  statt sie abzuschreiben.
// ============================================================
describe("Das Drehrad ist vollständig erklärt", () => {
  const radKapitel = WALKTHROUGH_KAPITEL.find((k) => k.key === "drehrad");
  const alleTexte = (radKapitel?.schritte ?? [])
    .map((s) => `${s.titel} ${s.text} ${(s.liste ?? []).map((e) => `${e.label} ${e.desc}`).join(" ")}`)
    .join(" ");

  it("es gibt ein Drehrad-Kapitel mit mehreren Schritten", () => {
    expect(radKapitel).toBeTruthy();
    expect(radKapitel.schritte.length).toBeGreaterThan(5);
  });

  // 🔴 **Diese vier Tests prüfen die ABLEITUNG, nicht das Vorkommen — und der
  // Unterschied ist der ganze Punkt.**
  //
  // Die erste Fassung fragte „kommt jedes Label irgendwo im Kapitel vor?".
  // Das war ein Test, der NIE rot werden konnte: der Rundgang baut seine
  // Listen aus denselben Katalogen, also enthält er jedes neue Feld
  // automatisch. Bei der Gegenprobe (ein erfundener Typ `Testfeld` in
  // `drehrad.js`) blieb er grün — er hat nichts bewiesen.
  //
  // ✅ Was wirklich schützt, ist die Ableitung selbst. Schreibt jemand die
  // Liste später von Hand ab — die naheliegende „Verbesserung", weil man dann
  // eigene Texte formulieren kann —, dann läuft sie ab dem nächsten neuen
  // Rad-Feld auseinander. Genau das fangen diese Tests: sie vergleichen die
  // Liste im Schritt mit dem Katalog, Eintrag für Eintrag.
  const listeVon = (key) => radKapitel.schritte.find((s) => s.key === key)?.liste ?? [];

  it("🔴 die Belohnungs-Typen sind aus `drehrad.js` ABGELEITET, nicht abgeschrieben", () => {
    expect(listeVon("rad-felder").map((e) => e.label)).toEqual(BELOHNUNGS_TYPEN.map((t) => t.label));
    expect(listeVon("rad-felder").map((e) => e.desc)).toEqual(BELOHNUNGS_TYPEN.map((t) => t.desc));
  });

  it("beide Wege für die Häufigkeit, ebenfalls abgeleitet", () => {
    expect(listeVon("rad-haeufigkeit").map((e) => e.label)).toEqual(HAEUFIGKEITEN.map((h) => h.label));
  });

  it("die Ausschluss-Reichweiten, ebenfalls abgeleitet", () => {
    expect(listeVon("rad-sperren").map((e) => e.label)).toEqual(AUSSCHLUSS_REICHWEITEN.map((a) => a.label));
  });

  it("und wen ein gezogenes Ereignis trifft, ebenfalls abgeleitet", () => {
    expect(listeVon("rad-ereignis").map((e) => e.label)).toEqual(EREIGNIS_TRIFFT.map((e) => e.label));
  });

  it("⚠️ und die Listen sind nicht leer — sonst wäre die Ableitung wertlos", () => {
    for (const key of ["rad-felder", "rad-haeufigkeit", "rad-sperren", "rad-ereignis"]) {
      expect(listeVon(key).length, key).toBeGreaterThan(1);
      for (const e of listeVon(key)) {
        expect(e.label?.length, key).toBeGreaterThan(2);
        expect(e.desc?.length, key).toBeGreaterThan(20);
      }
    }
  });

  it("die übrigen Stellschrauben werden benannt", () => {
    // Kein Katalog im Code, deshalb hier namentlich. Alle vier sind
    // Einstellungen, ohne die ein Rad unbrauchbar oder unfair wird.
    for (const wort of [/wahrscheinlichkeit|prozent/i, /sperrfrist/i, /deckel|obergrenze/i, /kontingent/i]) {
      expect(alleTexte, `im Drehrad-Kapitel fehlt: ${wort}`).toMatch(wort);
    }
  });
});

describe("Navigation", () => {
  it("weiter läuft bis zum Ende und meldet dann `null`", () => {
    let i = 0;
    for (let n = 0; n < SCHRITTE.length - 1; n++) i = weiter(i);
    expect(i).toBe(SCHRITTE.length - 1);
    expect(weiter(i)).toBeNull();
  });

  it("zurück bleibt bei 0 stehen statt negativ zu werden", () => {
    expect(zurueck(0)).toBe(0);
    expect(zurueck(3)).toBe(2);
  });

  it("🔴 Kapitel überspringen landet im NÄCHSTEN Kapitel, nicht im nächsten Schritt", () => {
    const erstesKapitel = SCHRITTE[0].kapitel;
    const ziel = kapitelUeberspringen(0);
    expect(ziel).not.toBeNull();
    expect(schrittAn(ziel).kapitel).not.toBe(erstesKapitel);
    // Und zwar am ANFANG des nächsten, nicht irgendwo mittendrin.
    expect(schrittAn(ziel).imKapitel).toBe(1);
  });

  it("aus jedem Schritt eines Kapitels führt das Überspringen an dieselbe Stelle", () => {
    for (const k of WALKTHROUGH_KAPITEL.slice(0, -1)) {
      const von = SCHRITTE.map((s, i) => [s, i]).filter(([s]) => s.kapitel === k.key);
      const ziele = new Set(von.map(([, i]) => kapitelUeberspringen(i)));
      expect(ziele.size, k.key).toBe(1);
    }
  });

  it("im letzten Kapitel gibt es nichts mehr zu überspringen", () => {
    expect(kapitelUeberspringen(SCHRITTE.length - 1)).toBeNull();
  });

  it("kapitelAnfang findet jedes Kapitel", () => {
    for (const k of WALKTHROUGH_KAPITEL) {
      const i = kapitelAnfang(k.key);
      expect(i, k.key).not.toBeNull();
      expect(schrittAn(i).kapitel).toBe(k.key);
      expect(schrittAn(i).imKapitel).toBe(1);
    }
    expect(kapitelAnfang("gibtesnicht")).toBeNull();
  });

  it("der Fortschritt zählt richtig und läuft nicht über", () => {
    const f = fortschritt(0);
    expect(f.schritt).toBe(1);
    expect(f.schritte).toBe(SCHRITTE.length);
    expect(f.kapitelNr).toBe(1);
    expect(f.anteil).toBeGreaterThan(0);
    expect(fortschritt(SCHRITTE.length - 1).anteil).toBe(1);
    expect(fortschritt(SCHRITTE.length)).toBeNull();
  });
});
