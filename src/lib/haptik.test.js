import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { MUSTER, musterFuer, istMoeglich, istEingeschaltet, spuere } from "@/lib/haptik";

// 🔴 Diese Tests prüfen keine Rechnung, sondern ein VERSPRECHEN: dass die
// Haptik unter keinen Umständen etwas kaputt macht. Sie ist Beiwerk — genau
// wie der Meldungs-Streifen, an dem sie hängt —, und Beiwerk, das den
// Speichern-Vorgang mitreisst, ist schlimmer als gar keins.

const alterNavigator = globalThis.navigator;
const altesDocument = globalThis.document;

function setzeNavigator(vibrate) {
  Object.defineProperty(globalThis, "navigator", {
    value: vibrate === undefined ? {} : { vibrate },
    configurable: true, writable: true,
  });
}

function setzeAttribut(wert) {
  Object.defineProperty(globalThis, "document", {
    value: {
      documentElement: {
        getAttribute: (name) => (name === "data-haptik" ? wert : null),
      },
    },
    configurable: true, writable: true,
  });
}

afterEach(() => {
  Object.defineProperty(globalThis, "navigator", { value: alterNavigator, configurable: true, writable: true });
  Object.defineProperty(globalThis, "document", { value: altesDocument, configurable: true, writable: true });
});

describe("Muster", () => {
  it("jede Art der Rückmeldung hat eins", () => {
    // Die drei Arten stehen in `Rueckmeldung.jsx`. Kommt dort eine vierte
    // dazu, fällt sie hier NICHT durch — sie bekommt `info`. Das ist Absicht:
    // eine neue Art soll unauffällig sein, nicht kaputt.
    for (const art of ["gespeichert", "fehler", "info"]) {
      expect(MUSTER[art], art).toBeDefined();
      expect(musterFuer(art)).toBe(MUSTER[art]);
    }
    expect(musterFuer("gibtsnicht")).toBe(MUSTER.info);
    expect(musterFuer(undefined)).toBe(MUSTER.info);
  });

  it("ein Fehler ist länger und doppelt — ein Erfolg ein einzelner Tick", () => {
    // Nicht Geschmack, sondern dieselbe Aussage wie die Standzeit im Streifen:
    // „gespeichert" darf man verpassen, „nicht gespeichert" nicht.
    expect(MUSTER.gespeichert.length).toBe(1);
    expect(MUSTER.fehler.length).toBeGreaterThan(1);
    const summe = (a) => a.reduce((x, y) => x + y, 0);
    expect(summe(MUSTER.fehler)).toBeGreaterThan(summe(MUSTER.gespeichert));
  });

  it("keine Dauer ist so lang, dass sie in den nächsten Screen läuft", () => {
    for (const [art, m] of Object.entries(MUSTER)) {
      for (const dauer of m) expect(dauer, art).toBeLessThanOrEqual(100);
    }
  });
});

describe("istMoeglich", () => {
  it("ohne `navigator.vibrate` — also auf jedem iPhone — ist es false", () => {
    setzeNavigator(undefined);
    expect(istMoeglich()).toBe(false);
  });

  it("mit der Schnittstelle ist es true", () => {
    setzeNavigator(() => true);
    expect(istMoeglich()).toBe(true);
  });
});

describe("istEingeschaltet — die Vorgabe ist das FEHLEN des Attributs", () => {
  it("ohne Attribut: an", () => {
    setzeAttribut(null);
    expect(istEingeschaltet()).toBe(true);
  });

  it("nur `aus` schaltet ab", () => {
    setzeAttribut("aus");
    expect(istEingeschaltet()).toBe(false);
    setzeAttribut("an");
    expect(istEingeschaltet()).toBe(true);
  });
});

describe("spuere", () => {
  beforeEach(() => setzeAttribut(null));

  it("löst mit dem Muster der Art aus", () => {
    const vibrate = vi.fn(() => true);
    setzeNavigator(vibrate);
    expect(spuere("fehler")).toBe(true);
    expect(vibrate).toHaveBeenCalledWith(MUSTER.fehler);
  });

  it("tut nichts, wenn die Einstellung aus ist", () => {
    const vibrate = vi.fn(() => true);
    setzeNavigator(vibrate);
    setzeAttribut("aus");
    expect(spuere("gespeichert")).toBe(false);
    expect(vibrate).not.toHaveBeenCalled();
  });

  it("`an: true` überstimmt die Einstellung — dafür ist die Probe da", () => {
    const vibrate = vi.fn(() => true);
    setzeNavigator(vibrate);
    setzeAttribut("aus");
    expect(spuere("gespeichert", { an: true })).toBe(true);
    expect(vibrate).toHaveBeenCalledOnce();
  });

  it("tut nichts und wirft nicht, wenn das Gerät nicht kann", () => {
    setzeNavigator(undefined);
    expect(() => spuere("gespeichert")).not.toThrow();
    expect(spuere("gespeichert")).toBe(false);
  });

  // 🔴 Der wichtigste Test der Datei. Browser lehnen `vibrate` ab, wenn es
  // nicht aus einer echten Berührung kommt — manche mit einem geworfenen
  // Fehler. Ohne das `try/catch` risse die Bestätigung den Speichern-Vorgang
  // mit, der sie ausgelöst hat.
  it("ein werfendes `vibrate` reisst nichts mit", () => {
    setzeNavigator(() => { throw new Error("NotAllowedError"); });
    expect(() => spuere("fehler")).not.toThrow();
    expect(spuere("fehler")).toBe(false);
  });

  it("meldet false, wenn der Browser die Bitte ablehnt", () => {
    setzeNavigator(() => false);
    expect(spuere("info")).toBe(false);
  });
});
