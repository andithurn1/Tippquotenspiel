import { describe, it, expect } from "vitest";
import {
  VEREINSFARBEN, farbenFuer, paarungFarben, helligkeit, kontrastfarbe, abdeckung,
  kontrast, lesbarAuf, LESBAR_AB, NAME_AB,
} from "./vereinsfarben";
import { LIGEN, vereineVon } from "./ligen";

const HEX = /^#[0-9A-Fa-f]{6}$/;

describe("Die Farbtabelle", () => {
  it("jeder Eintrag hat ein bis drei gültige Hex-Farben", () => {
    for (const [verein, farben] of Object.entries(VEREINSFARBEN)) {
      expect(Array.isArray(farben), verein).toBe(true);
      expect(farben.length, verein).toBeGreaterThanOrEqual(1);
      // Andi: „auch meinetwegen mit bis zu 3 Farben."
      expect(farben.length, verein).toBeLessThanOrEqual(3);
      for (const f of farben) expect(f, `${verein}: ${f}`).toMatch(HEX);
    }
  });

  it("keine Farbe steht zweimal im selben Verein", () => {
    for (const [verein, farben] of Object.entries(VEREINSFARBEN)) {
      const klein = farben.map((f) => f.toUpperCase());
      expect(new Set(klein).size, verein).toBe(klein.length);
    }
  });

  // 🔴 Die wichtigste Prüfung hier. Vereinsfarben sind für LESBARKEIT nicht
  // gemacht — Weiß, Gelb und sehr dunkles Blau kommen alle vor. Wer sie
  // ungeprüft als Kartengrund nimmt, produziert unlesbare Karten.
  //
  // ⚠️ Gemessen wird das echte Kontrastverhältnis, nicht eine Differenz von
  // Helligkeiten. Der erste Entwurf hat letzteres getan und Bayern-Rot für zu
  // dunkel gehalten — die Zahl war bequem, aber falsch.
  it("🔴 zu jeder Grundfarbe gibt es eine lesbare Textfarbe", () => {
    for (const [verein, farben] of Object.entries(VEREINSFARBEN)) {
      const grund = farben[0];
      const text = kontrastfarbe(grund);
      const v = kontrast(grund, text);
      expect(v, `${verein}: ${grund} + ${text} = ${v.toFixed(2)}:1`).toBeGreaterThanOrEqual(LESBAR_AB);
    }
  });

  it("Gelb bekommt dunklen Text, dunkles Blau hellen", () => {
    expect(kontrastfarbe("#FDE100")).toBe("#111111");   // Dortmund
    expect(kontrastfarbe("#FFFFFF")).toBe("#111111");
    expect(kontrastfarbe("#004D9D")).toBe("#FFFFFF");   // Schalke
    expect(kontrastfarbe("#111111")).toBe("#FFFFFF");
  });

  it("unsinnige Eingaben stürzen nicht ab", () => {
    expect(helligkeit(null)).toBe(0.5);
    expect(helligkeit("blau")).toBe(0.5);
    expect(kontrastfarbe(undefined)).toBeTruthy();
  });
});

describe("Nachschlagen", () => {
  it("findet einen bekannten Verein", () => {
    expect(farbenFuer("Borussia Dortmund")).toEqual(["#FDE100", "#111111"]);
  });

  // ⚠️ `null` und keine Ersatzfarbe: der Aufrufer soll auf das GEWÄHLTE
  // Schema zurückfallen, und das kennt nur er.
  it("gibt für Unbekanntes `null` statt einer Ersatzfarbe", () => {
    expect(farbenFuer("FC Gibtsnicht")).toBeNull();
    expect(farbenFuer("")).toBeNull();
    expect(farbenFuer(null)).toBeNull();
  });

  it("verträgt Leerzeichen am Rand", () => {
    expect(farbenFuer("  Borussia Dortmund  ")).toBeTruthy();
  });
});

describe("Eine Paarung einfärben", () => {
  it("liefert beide Seiten samt Textfarbe und Verlauf", () => {
    const p = paarungFarben("Borussia Dortmund", "FC Bayern München");
    expect(p.heim.grund).toBe("#FDE100");
    expect(p.heim.text).toBe("#111111");
    expect(p.gast.grund).toBe("#DC052D");
    expect(p.gast.text).toBe("#FFFFFF");
    expect(p.verlauf).toEqual(["#FDE100", "#DC052D"]);
  });

  // 🔴 Halb gefärbt wäre schlechter als gar nicht: es sähe aus, als gehöre die
  // Farbe zur RUNDE und nicht zur PAARUNG.
  it("🔴 gibt `null`, sobald EINE Seite fehlt", () => {
    expect(paarungFarben("Borussia Dortmund", "FC Gibtsnicht")).toBeNull();
    expect(paarungFarben("FC Gibtsnicht", "Borussia Dortmund")).toBeNull();
  });

  it("kommt mit nur zwei Farben aus, wenn es keine dritte gibt", () => {
    const p = paarungFarben("Borussia Dortmund", "FC Schalke 04");
    expect(p.heim.dritte).toBeNull();
    expect(p.heim.zier).toBe("#111111");
  });
});

// ============================================================
//  🔴 DIE UMGEKEHRTE FRAGE
//
//  `kontrastfarbe` beantwortet „welcher Text steht auf der Vereinsfarbe".
//  `lesbarAuf` beantwortet „steht die Vereinsfarbe selbst lesbar auf dem
//  dunklen Kartengrund". Das wird ständig verwechselt, und der Fehler fällt
//  nicht auf: die Karte sieht nur irgendwie stumpf aus.
// ============================================================
describe("Die Vereinsfarbe als Text auf dunklem Grund", () => {
  const INK = "#0B0D12";

  it("nimmt die erste Farbe, wenn sie hell genug ist", () => {
    // Dortmund-Gelb ist auf Schwarz das Beste, was es gibt.
    expect(lesbarAuf(["#FDE100", "#111111"], INK)).toBe("#FDE100");
  });

  it("🔴 überspringt eine Farbe, die auf dunklem Grund verschwindet", () => {
    // Newcastle ist Schwarz-Weiß. Schwarz auf Schwarz ist keine Farbgebung.
    expect(lesbarAuf(["#111111", "#FFFFFF"], INK)).toBe("#FFFFFF");
  });

  it("behält gesättigtes Rot, statt auf Weiß auszuweichen", () => {
    // 🔴 Der Fall, an dem die alte lineare Rechnung gescheitert ist: sie hielt
    // Bayern-Rot für zu dunkel und hätte die Karte weiß gefärbt — also genau
    // die Wiedererkennung weggerechnet, um die es hier geht.
    expect(lesbarAuf(["#DC052D", "#FFFFFF", "#0066B2"], INK)).toBe("#DC052D");
  });

  it("hellt NICHT auf, wenn keine Vereinsfarbe reicht — sondern lehnt ab", () => {
    // Atalanta: Dunkelblau und Schwarz. Auf dunklem Grund fällt beides durch.
    // 🔴 Früher kam hier ein gemischtes Grau heraus. Das war lesbar und
    // trotzdem falsch: ein erfundener Farbton zeigt keinen Verein an.
    expect(lesbarAuf(["#1D2D5C", "#111111"], INK)).toBeNull();
  });

  it("🔴 lehnt auch Real Madrid auf hellem Grund ab, statt Grau zu erfinden", () => {
    // Weiß und Gold auf Weiß — beides unlesbar. Das gemischte #888888 sah aus
    // wie ein ausgegrauter Knopf.
    expect(lesbarAuf(["#FFFFFF", "#FEBE10"], "#FFFFFF")).toBeNull();
  });

  it("gibt für gar keine Farben `null`", () => {
    expect(lesbarAuf([], INK)).toBeNull();
  });

  // ⚠️ Die eigentliche Zusicherung: was herauskommt, ist ENTWEDER eine echte
  // Farbe DIESES Vereins ODER nichts. Nie etwas Drittes.
  it("🔴 liefert für jeden Verein entweder eine seiner eigenen Farben oder `null`", () => {
    for (const grund of ["#0B0D12", "#FFFFFF"]) {
      for (const [verein, farben] of Object.entries(VEREINSFARBEN)) {
        const f = lesbarAuf(farben, grund);
        if (f === null) continue;
        expect(farben, `${verein} auf ${grund}: ${f}`).toContain(f);
        expect(kontrast(f, grund), `${verein}: ${f}`).toBeGreaterThanOrEqual(NAME_AB);
      }
    }
  });

  it("kontrast ist symmetrisch und kennt seine Grenzen", () => {
    expect(kontrast("#000000", "#FFFFFF")).toBeCloseTo(21, 1);
    expect(kontrast("#FFFFFF", "#000000")).toBeCloseTo(21, 1);
    expect(kontrast("#123456", "#123456")).toBeCloseTo(1, 5);
  });
});

// ============================================================
//  🔴 DIE ABDECKUNG — eine Zahl statt eines Gefühls
//
//  Die Tabelle ist von Hand gepflegt und deckt nicht alle 143 Vereine des
//  Katalogs ab. Das ist in Ordnung — ungedeckte Paarungen fallen sauber auf
//  das gewählte Schema zurück. Nicht in Ordnung wäre, es nicht zu WISSEN.
//
//  ⚠️ Der Test verlangt keine Vollständigkeit, er hält die Zahl fest und lässt
//  sie nur STEIGEN. Dieselbe Sperrklinke wie bei `npm run stufen`.
// ============================================================
describe("Abdeckung des Katalogs", () => {
  const alle = [...new Set(LIGEN.flatMap((l) => vereineVon(l.key)))];

  it("die Schlüssel passen zu echten Vereinsnamen — Tippfehler fallen sonst nie auf", () => {
    const bekannt = new Set(alle);
    // ⚠️ Ein Schlüssel, den es im Katalog nicht gibt, ist entweder ein
    // Tippfehler oder ein Verein, der nicht mehr mitspielt. Beides gehört
    // gesehen: die Karte bliebe sonst still ungefärbt.
    const verwaist = Object.keys(VEREINSFARBEN).filter((v) => !bekannt.has(v));
    expect(
      verwaist.length,
      "Diese Farbeinträge passen auf keinen Verein im Katalog:\n" + verwaist.join("\n"),
    ).toBeLessThanOrEqual(2);   // „Arsenal" steht doppelt (mit und ohne „FC")
  });

  it("die Bundesliga ist vollständig", () => {
    const b = abdeckung(vereineVon("bl"));
    expect(b.ohne, `ohne Farben: ${b.ohne.join(", ")}`).toEqual([]);
  });

  it("die 2. Bundesliga ist vollständig", () => {
    const b = abdeckung(vereineVon("bl2"));
    expect(b.ohne, `ohne Farben: ${b.ohne.join(", ")}`).toEqual([]);
  });

  it("⚠️ und über den ganzen Katalog steht die Zahl fest und darf nur steigen", () => {
    const a = abdeckung(alle);
    // Beim Anlegen am 29.08.2026 gemessen. Wer Vereine ergänzt, hebt die Zahl.
    expect(a.mitFarben).toBeGreaterThanOrEqual(60);
    expect(a.gesamt).toBeGreaterThan(100);
  });
});
