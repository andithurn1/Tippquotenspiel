import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { TEAM_STUFEN, teamFaktor, naechsteStufe, gewichteteTeams } from "./teamGewicht";

describe("Die Stufenleiter für Mannschafts-Gewichte", () => {
  it("endet auf 1 — sonst gäbe es keinen Ausgang", () => {
    expect(TEAM_STUFEN.at(-1)).toBe(1);
    expect(new Set(TEAM_STUFEN).size).toBe(TEAM_STUFEN.length);
  });

  it("ein Verein ohne Eintrag steht auf 1", () => {
    expect(teamFaktor({}, "Bayern")).toBe(1);
    expect(teamFaktor({ Bayern: 1.5 }, "Bayern")).toBe(1.5);
    // Unfug im gespeicherten Regelwerk zählt als „nichts eingestellt".
    expect(teamFaktor({ Bayern: 0 }, "Bayern")).toBe(1);
    expect(teamFaktor({ Bayern: "viel" }, "Bayern")).toBe(1);
  });

  it("klickt einmal rundherum und ist danach wieder leer", () => {
    let teams = {};
    for (const stufe of TEAM_STUFEN.slice(0, -1)) {
      teams = naechsteStufe(teams, "Bayern");
      expect(teams.Bayern).toBe(stufe);
    }
    // Letzter Klick: zurück auf normal — und der Eintrag ist WEG, nicht 1.
    teams = naechsteStufe(teams, "Bayern");
    expect("Bayern" in teams).toBe(false);
    expect(teams).toEqual({});
  });

  it("🔴 speichert keine 1 — sonst schleppt jeder Creator-Code Leerlauf mit", () => {
    const teams = naechsteStufe({ Bayern: TEAM_STUFEN.at(-2) }, "Bayern");
    expect(teams.Bayern).toBeUndefined();
  });

  it("lässt die anderen Vereine in Ruhe", () => {
    const vorher = { Bayern: 1.5, Dortmund: 0.5 };
    const nachher = naechsteStufe(vorher, "Bayern");
    expect(nachher.Dortmund).toBe(0.5);
    // Und die Eingabe wird nicht verändert.
    expect(vorher.Bayern).toBe(1.5);
  });

  it("ein unbekannter Wert landet auf der ersten Stufe statt im Nichts", () => {
    expect(naechsteStufe({ Bayern: 1.37 }, "Bayern").Bayern).toBe(TEAM_STUFEN[0]);
  });

  it("zählt die gewichteten Vereine", () => {
    expect(gewichteteTeams({})).toBe(0);
    expect(gewichteteTeams({ a: 2, b: 0.5 })).toBe(2);
    expect(gewichteteTeams(null)).toBe(0);
  });
});

// 🔴 Die Sperrklinke gegen die ZWEITE Leiter — der Grund, warum dieses Modul
// überhaupt existiert. Die Stufen standen als modulprivate Konstante in
// `ModifikatorenSondermenue.jsx`; seit die Sonderregeln je Liga dieselbe
// Einstellung anbieten, gibt es zwei Oberflächen für einen Wert. Schreibt
// jemand die Leiter dort wieder hin, laufen sie auseinander.
describe("Es gibt nur EINE Leiter", () => {
  for (const datei of [
    "src/components/ModifikatorenSondermenue.jsx",
    "src/components/LigaSonderregeln.jsx",
  ]) {
    it(`${datei} führt keine eigene Stufenliste`, () => {
      const text = readFileSync(datei, "utf8");
      expect(
        /const\s+TEAM_STUFEN\s*=/.test(text),
        `${datei} definiert TEAM_STUFEN selbst — die Leiter gehört nach `
        + "src/lib/teamGewicht.js, sonst gibt es zwei.",
      ).toBe(false);
      expect(text, `${datei} sollte aus teamGewicht.js importieren`)
        .toMatch(/from "@\/lib\/teamGewicht"/);
    });
  }
});
