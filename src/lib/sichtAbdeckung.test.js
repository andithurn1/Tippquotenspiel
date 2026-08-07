import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { regelFelder } from "@/lib/stufenAbdeckung";
import {
  SPUREN, OHNE_ANZEIGE, ANZEIGE_LIBS,
  adminScreens, ohneSpielerAnzeige, ueberholteBegruendungen,
} from "@/lib/sichtAbdeckung";

const quellen = {};
for (const d of readdirSync("src/components")) {
  if (d.endsWith(".jsx")) quellen[d] = readFileSync(join("src/components", d), "utf8");
}
for (const d of ANZEIGE_LIBS) quellen[d] = readFileSync(join("src/lib", d), "utf8");

describe("Die Admin-Ableitung", () => {
  // 🔴 Der Kontrollwert, ohne den die ganze Messung wertlos ist: bliebe kein
  // Spieler-Screen übrig, meldete sie ALLES als Lücke — und niemand würde die
  // Liste noch ernst nehmen.
  it("lässt Spieler-Screens übrig", () => {
    const admin = adminScreens(quellen);
    const spieler = Object.keys(quellen).filter((d) => !admin.has(d));
    expect(spieler.length).toBeGreaterThan(10);
    expect(admin.size).toBeGreaterThan(5);
  });

  // 🔴 Der Fehler des ersten Anlaufs: über den nackten NAMEN gesucht galten
  // `Tippabgabe` und `Ranking` als Admin-Screens, weil die Spielerstellung sie
  // in KOMMENTAREN erwähnt. Ausgerechnet die größten Spieler-Screens fielen
  // aus der Messung.
  it("zählt nur ECHTE Imports, keine Erwähnungen im Kommentar", () => {
    const admin = adminScreens(quellen);
    for (const screen of ["Tippabgabe.jsx", "Ranking.jsx", "Abrechnung.jsx"]) {
      expect(admin.has(screen)).toBe(false);
    }
    // Gegenprobe: die Bausteine der Spielerstellung MÜSSEN drin sein, sonst
    // zählt jede Einstellung als „angezeigt", nur weil man sie einstellen kann.
    expect(admin.has("Spielerstellung.jsx")).toBe(true);
    expect(admin.has("Ereignisse.jsx")).toBe(true);
  });

  it("erkennt eine Erwähnung im Kommentar nicht als Import", () => {
    const gebaut = {
      "Spielerstellung.jsx": "// siehe Tippabgabe.jsx\nimport X from '@/components/Ereignisse';",
      "Tippabgabe.jsx": "", "Ereignisse.jsx": "",
    };
    const admin = adminScreens(gebaut);
    expect(admin.has("Ereignisse.jsx")).toBe(true);
    expect(admin.has("Tippabgabe.jsx")).toBe(false);
  });
});

describe("Jeder Regel-Block hat eine Spur oder eine Begründung", () => {
  it("die Kataloge kennen nur echte Regel-Blöcke", () => {
    const felder = new Set(regelFelder());
    for (const k of Object.keys(SPUREN)) expect(felder.has(k)).toBe(true);
    for (const k of Object.keys(OHNE_ANZEIGE)) {
      if (k === "name") continue;   // der Runden-Name ist kein Block
      expect(felder.has(k)).toBe(true);
    }
  });

  // ⚠️ Der umgekehrte Fehler: eine Begründung, die nicht mehr stimmt. Wer einen
  // Block nachträglich anzeigt und den Eintrag stehen lässt, hinterlässt eine
  // Behauptung, die das Gegenteil beschreibt.
  it("keine Begründung ist überholt", () => {
    expect(ueberholteBegruendungen(quellen)).toEqual([]);
  });

  // 🔴 Kein „alles grün"-Test. Diese Zeile hält den STAND fest: zwei Blöcke
  // sind dem Spieler bis heute unsichtbar. Wird eine Anzeige gebaut, schlägt
  // sie an — und dann gehört die Zahl heruntergesetzt, nicht der Test
  // gelöscht.
  it("hält den bekannten Stand fest: 2 Blöcke ohne Spieler-Anzeige", () => {
    const fehlend = ohneSpielerAnzeige(quellen);
    expect(fehlend.sort()).toEqual(["tippEinfluss", "wrongPenalty"]);
  });
});
