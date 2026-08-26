import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { KANAELE } from "@/lib/notify";

// ============================================================
//  IST JEDE BENACHRICHTIGUNGSART ANGESCHLOSSEN?
//
//  🔴 Der Anlass steht im Auftragsbuch (ZP5) und ist am 25.08.2026 selbst
//  passiert: erst wurden drei Arten gebaut, dann lagen zwei davon einen Tag
//  lang als Schalter ohne Quelle herum. Sichtbar, umschaltbar — und ohne
//  jede Wirkung. Genau die Sorte Halbfertigkeit, die `npm run tot` und
//  `npm run greift` suchen, nur eine Ebene höher: hier fehlt nicht der
//  Aufrufer einer Funktion, sondern die DATEN einer Einstellung.
//
//  ⚠️ Der Test prüft die NAHT, nicht das Verhalten: kommt jede Art in
//  `dueNotifications` vor, und holt der Runner für jede etwas? Ob das
//  Richtige geholt wird, prüfen die Tests in `notify.test.js`.
//
//  Ein Wächter auf Quelltext-Ebene, wie `storeParitaet` — weil die Alternative
//  (jede Art im Browser durchspielen) niemand regelmäßig macht.
// ============================================================

const notify = readFileSync("src/lib/notify.js", "utf8");
const runner = readFileSync("src/components/NotifyRunner.jsx", "utf8");

// Arten, die absichtlich keine eigene Quelle im Runner brauchen — mit Grund.
const OHNE_QUELLE = {
  neuerSpieltag:
    "Rechnet allein aus `matches` und `tips`, die der Runner ohnehin holt: "
    + "ein Spieltag ist neu, wenn alle seine Spiele noch offen und ungetippt sind.",
  erinnerung:
    "Dito — Restzeit bis zum Anpfiff gegen die eigenen Tipps. Braucht nichts, "
    + "was nicht schon da ist.",
};

describe("Naht zwischen Einstellung und Quelle", () => {
  it("jede Art wird in `dueNotifications` überhaupt abgefragt", () => {
    for (const k of KANAELE) {
      expect(notify.includes(`p.${k}`), `notify.js fragt \`p.${k}\` nie ab`).toBe(true);
    }
  });

  it("jede Art erzeugt eine Meldung mit ihrer eigenen `art`", () => {
    for (const k of KANAELE) {
      expect(notify.includes(`art: "${k}"`), `notify.js erzeugt nie \`art: "${k}"\``).toBe(true);
    }
  });

  // 🔴 Der eigentliche Fund-Wächter: eine Art, die Daten braucht, muss sie
  // im Runner auch bekommen — sonst ist der Schalter Dekoration.
  it("jede Art bekommt im Runner eine Quelle — oder steht in OHNE_QUELLE", () => {
    const fehlen = KANAELE.filter((k) => !OHNE_QUELLE[k] && !runner.includes(`prefs.${k}`));
    expect(fehlen, `Schalter ohne Quelle im Runner: ${fehlen.join(", ")}`).toEqual([]);
  });

  it("OHNE_QUELLE verrottet nicht: keine Ausnahme für eine Art, die es nicht gibt", () => {
    const verwaist = Object.keys(OHNE_QUELLE).filter((k) => !KANAELE.includes(k));
    expect(verwaist, `Ausnahme zeigt ins Leere: ${verwaist.join(", ")}`).toEqual([]);
  });

  it("jede Ausnahme trägt einen Begründungssatz", () => {
    for (const [k, grund] of Object.entries(OHNE_QUELLE)) {
      expect(typeof grund, k).toBe("string");
      expect(grund.length, k).toBeGreaterThan(40);
    }
  });

  // ⚠️ Nur holen, was eingeschaltet ist: wer eine Art abwählt, soll dafür
  // auch keine Abfrage auslösen. Sonst kostet eine abgeschaltete Meldung
  // trotzdem eine Runde zur Datenbank.
  it("der Runner holt nur, was eingeschaltet ist", () => {
    for (const k of KANAELE) {
      if (OHNE_QUELLE[k]) continue;
      const stelle = runner.indexOf(`prefs.${k}`);
      expect(stelle, k).toBeGreaterThan(-1);
      // Im Umfeld muss ein Kurzschluss stehen (`? … : …`).
      expect(runner.slice(stelle, stelle + 200), k).toMatch(/\?/);
    }
  });
});
