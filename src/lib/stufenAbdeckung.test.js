import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  abdeckung, luecken, ueberholteBegruendungen, NUR_PROFI, regelFelder,
  blattFelder, fehlendeOberflaeche, OHNE_OBERFLAECHE,
} from "@/lib/stufenAbdeckung";

// 🔴 Diese Tests prüfen keine Rechnung, sondern eine Hausregel: kommt ein
// Admin an jede Einstellung heran, ohne in die Profi-Ansicht zu gehen — und
// wenn nicht, steht dann WENIGSTENS eine Begründung da?
//
// Der Anlass: `rules.ereignisse` war gebaut, wirksam und überall richtig
// angezeigt — und trotzdem unfertig, weil kein Charakter und kein einfacher
// Regler sie je erwähnte. Weder `npm run greift` noch `npm run anzeige` können
// das sehen; beide fragen etwas anderes.

// Der Stand bei Einführung der Messung (06.08.2026) war 1. Die Zahl steht hier
// als SPERRKLINKE: sie darf sinken, aber nicht steigen. Ein neuer Regelblock,
// der nur in der Profi-Ansicht landet, lässt diesen Test auffallen — genau das
// war bei `ereignisse` monatelang niemandem aufgefallen.
//
// 🔴 Seit dem 26.08.2026 steht sie auf 0, und damit ist die Klinke von jetzt an
// scharf: JEDE Lücke ist ab hier ein Befund, nicht mehr „die bekannte".
const LUECKEN_BEI_EINFUEHRUNG = 0;

describe("Stufen-Abdeckung", () => {
  it("jedes Regel-Feld taucht genau einmal auf", () => {
    const a = abdeckung();
    expect(a.map((x) => x.feld).sort()).toEqual(regelFelder().sort());
    expect(new Set(a.map((x) => x.feld)).size).toBe(a.length);
  });

  it("die Zahl der Lücken wächst NICHT", () => {
    const offen = luecken();
    expect(offen.length).toBeLessThanOrEqual(LUECKEN_BEI_EINFUEHRUNG);
  });

  it("es gibt keine Lücke mehr", () => {
    // 🔴 Hier stand bis zum 26.08.2026 das Gegenteil: `wettbewerbe` sei „bewusst
    // vertagt", weil die Gewichte in den Gewichtungs-Durchgang am Ende gehören
    // (Nutzer-Reihenfolge Punkt 4) und eigene Stufen dafür „Balance-Arbeit an
    // der falschen Stelle" wären.
    //
    // ⛔ Die Begründung hält Andis Ansage vom selben Tag nicht stand: *„Balance
    // ist kein zulässiges Gegenargument gegen einen Umbau"* (CLAUDE.md,
    // 21.08.2026). Genau dieser Eintrag war der beschriebene Rückfall — Balance
    // als EINWAND, der Bauarbeit blockiert, statt sie zu ordnen.
    //
    // ⚠️ Und die Trennung, die dabei übersehen wurde: Punkt 1 derselben
    // Reihenfolge lautet „Baukasten vollständig — jede Einstellung in allen drei
    // Stufen, und sie greift", und der ist JETZT dran. Punkt 4 stimmt die ZAHLEN
    // ab, nicht die Erreichbarkeit. Der Wert, den die Stufe heute setzt, ist
    // dabei nicht einmal erfunden: „eine Liga ~20 % höher" ist Andis eigenes
    // Beispiel aus Punkt 4.
    //
    // Der Test hält jetzt die andere Richtung fest: keine Lücke mehr, und die
    // nächste ist eine neue.
    expect(luecken()).toEqual([]);
  });

  it("keine Begründung ist überholt", () => {
    // Ein Feld, das inzwischen auf Stufe 1/2 erreichbar ist, darf keinen
    // `NUR_PROFI`-Eintrag mehr haben — sonst steht dort eine Behauptung, die
    // das Gegenteil beschreibt, und beim nächsten Durchgang glaubt sie jemand.
    expect(ueberholteBegruendungen()).toEqual([]);
  });

  it("jede Begründung ist ein SATZ, kein Platzhalter", () => {
    for (const [feld, text] of Object.entries(NUR_PROFI)) {
      expect(typeof text, feld).toBe("string");
      // Kurz genug zum Hinschreiben, lang genug zum Vertreten.
      expect(text.length, feld).toBeGreaterThan(60);
    }
  });

  it("jedes begründete Feld existiert überhaupt", () => {
    // Ein Eintrag für ein Feld, das es nicht mehr gibt, verdeckt die Zählung:
    // die Liste sähe gepflegt aus und deckte nichts ab.
    for (const feld of Object.keys(NUR_PROFI)) {
      expect(regelFelder(), feld).toContain(feld);
    }
  });

  it("die Ereignisse sind auf allen drei Stufen erreichbar — der Anlass der Messung", () => {
    const e = abdeckung().find((a) => a.feld === "ereignisse");
    expect(e.stufe1).toBe(true);
    expect(e.stufe2).toBe(true);
  });
});

// ── Teil 2: hat die Profi-Ansicht das Feld überhaupt? ───────
// 🔴 Die Lücke in Teil 1, und sie hat einen echten Fund durchgelassen:
// `tippfenster` steht mit Begründung in `NUR_PROFI`, galt also als „erreichbar
// in Stufe 3" — nachgesehen hatte das niemand. Der ANKER („öffnet der Spieltag
// als Block?") war im Regelwerk, im Creator-Code, in `sanitizeRules` und in
// KEINER Oberfläche. Der Nachbar-Knopf löschte ihn zusätzlich beim Klicken.
//
// ⚠️ Gemessen auf BLATT-Ebene. Über den Block gerechnet wäre `tippfenster`
// „vorhanden" gewesen, weil `vorlaufStunden` vorkommt — genau der blinde Fleck.

const KOMPONENTEN = (function lies(ordner) {
  return readdirSync(ordner, { withFileTypes: true }).flatMap((e) => {
    const p = join(ordner, e.name);
    return e.isDirectory() ? lies(p) : (/\.(jsx|js)$/.test(e.name) ? [readFileSync(p, "utf8")] : []);
  });
})("src/components").join("\n");

// Stand bei Einführung waren es ACHT — alle acht gehörten zum Duell-Joker, der
// überhaupt keine Einstell-Oberfläche hatte. Sie sind noch am selben Tag
// gebaut worden (`DuellJoker.jsx`), deshalb steht die Sperrklinke jetzt auf 0.
// ⚠️ Sie darf sinken, nie steigen: ein neues Regel-Feld ohne Regler fällt
// damit sofort auf.
const OHNE_UI_BEI_EINFUEHRUNG = 0;

describe("Jedes Regel-Feld braucht eine Oberfläche", () => {
  it("die Blatt-Liste ist feiner als die Block-Liste — sonst wäre sie blind", () => {
    // Genau der Unterschied, der `tippfenster.anker` sichtbar macht.
    expect(blattFelder().length).toBeGreaterThan(regelFelder().length);
    expect(blattFelder()).toContain("tippfenster.anker");
  });

  it("die Zahl der Felder ohne Oberfläche wächst NICHT", () => {
    expect(fehlendeOberflaeche(KOMPONENTEN).length).toBeLessThanOrEqual(OHNE_UI_BEI_EINFUEHRUNG);
  });

  it("`tippfenster.anker` hat seit 06.08.2026 eine — der Anlass der Messung", () => {
    expect(fehlendeOberflaeche(KOMPONENTEN)).not.toContain("tippfenster.anker");
  });

  it("jede Begründung in `OHNE_OBERFLAECHE` ist ein Satz und trifft ein echtes Feld", () => {
    const namen = new Set(blattFelder().flatMap((p) => [p, p.split(".").pop()]));
    for (const [feld, text] of Object.entries(OHNE_OBERFLAECHE)) {
      expect(namen, feld).toContain(feld);
      expect(text.length, feld).toBeGreaterThan(60);
    }
  });
});
