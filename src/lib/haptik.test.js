import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// 🔴 Diese Tests prüfen keine Rechnung, sondern ein VERSPRECHEN: dass die
// Haptik unter keinen Umständen etwas kaputt macht. Sie ist Beiwerk — genau
// wie der Meldungs-Streifen, an dem sie hängt —, und Beiwerk, das den
// Speichern-Vorgang mitreisst, ist schlimmer als gar keins.
//
// ⚠️ Die beiden Wege werden GETRENNT geprüft. Bis zum 26.08.2026 gab es nur
// den Browser-Weg; wer den nativen dazubaut und nur den alten Test laufen
// lässt, misst genau die Hälfte.

const H = vi.hoisted(() => ({ nativ: false, aufrufe: [], wirft: false, lehntAb: false }));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => H.nativ },
}));

// Nur die AUFRUFE werden ersetzt — die Kataloge (`ImpactStyle`,
// `NotificationType`) kommen echt aus dem Plugin. Sonst prüfte der Test seine
// eigenen erfundenen Werte gegen sich selbst.
vi.mock("@capacitor/haptics", async (echtes) => {
  const echt = await echtes();
  const merke = (art) => (o) => {
    if (H.wirft) throw new Error("Plugin not implemented");
    H.aufrufe.push([art, o.type ?? o.style]);
    return H.lehntAb ? Promise.reject(new Error("nicht verfügbar")) : Promise.resolve();
  };
  return { ...echt, Haptics: { notification: merke("notification"), impact: merke("impact") } };
});

const { MUSTER, NATIV, musterFuer, nativFuer, istNativ, istMoeglich, istEingeschaltet, spuere } =
  await import("@/lib/haptik");
const { ImpactStyle, NotificationType } = await import("@capacitor/haptics");

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
    value: { documentElement: { getAttribute: (n) => (n === "data-haptik" ? wert : null) } },
    configurable: true, writable: true,
  });
}

beforeEach(() => {
  H.nativ = false; H.aufrufe = []; H.wirft = false; H.lehntAb = false;
  setzeAttribut(null);
});

afterEach(() => {
  Object.defineProperty(globalThis, "navigator", { value: alterNavigator, configurable: true, writable: true });
  Object.defineProperty(globalThis, "document", { value: altesDocument, configurable: true, writable: true });
});

describe("Die zwei Wege", () => {
  it("jede Art der Rückmeldung hat BEIDE Fassungen", () => {
    // Die drei Arten stehen in `Rueckmeldung.jsx`. Kommt dort eine vierte
    // dazu, fällt sie hier NICHT durch — sie bekommt `info`. Das ist Absicht:
    // eine neue Art soll unauffällig sein, nicht kaputt.
    for (const art of ["gespeichert", "fehler", "info"]) {
      expect(MUSTER[art], art).toBeDefined();
      expect(NATIV[art], art).toBeDefined();
      expect(musterFuer(art)).toBe(MUSTER[art]);
      expect(nativFuer(art)).toBe(NATIV[art]);
    }
    expect(musterFuer("gibtsnicht")).toBe(MUSTER.info);
    expect(nativFuer("gibtsnicht")).toBe(NATIV.info);
  });

  it("die native Fassung sagt die BEDEUTUNG, nicht die Dauer", () => {
    // 🔴 Genau darin liegt der Unterschied zur Vibration-API: dort schaltet
    // man einen Motor für N Millisekunden ein, hier sagt man dem System, was
    // gemeint ist. Wie es sich anfühlt, entscheidet das Gerät.
    expect(NATIV.gespeichert).toEqual({ art: "notification", wert: NotificationType.Success });
    expect(NATIV.fehler).toEqual({ art: "notification", wert: NotificationType.Error });
    // `info` ist ein Impact und keine Notification: „etwas hat sich bewegt"
    // ist nicht dieselbe Frage wie „ist es gut ausgegangen?".
    expect(NATIV.info).toEqual({ art: "impact", wert: ImpactStyle.Light });
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
  it("im Browser ohne `navigator.vibrate` — also auf jedem iPhone — false", () => {
    setzeNavigator(undefined);
    expect(istNativ()).toBe(false);
    expect(istMoeglich()).toBe(false);
  });

  it("im Browser mit der Schnittstelle — also auf Android — true", () => {
    setzeNavigator(() => true);
    expect(istMoeglich()).toBe(true);
  });

  it("🔴 NATIV immer true, auch ohne `navigator.vibrate`", () => {
    // Das ist der ganze Punkt des Umbaus: in der App geht der Weg über das
    // Betriebssystem, und das kann es auf jedem Telefon — auch auf dem, wo
    // der Browser es nicht kann.
    H.nativ = true;
    setzeNavigator(undefined);
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

describe("spuere — im Browser", () => {
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

describe("spuere — in der App", () => {
  beforeEach(() => { H.nativ = true; setzeNavigator(undefined); });

  it("geht über das Betriebssystem, nicht über die Vibration-API", () => {
    const vibrate = vi.fn(() => true);
    setzeNavigator(vibrate);
    expect(spuere("gespeichert")).toBe(true);
    expect(H.aufrufe).toEqual([["notification", NotificationType.Success]]);
    // ⚠️ Und zwar AUSSCHLIESSLICH: zweimal spüren für einen Klick wäre
    // schlimmer als gar nicht.
    expect(vibrate).not.toHaveBeenCalled();
  });

  it("jede Art landet beim richtigen Baustein", () => {
    spuere("fehler");
    spuere("info");
    expect(H.aufrufe).toEqual([
      ["notification", NotificationType.Error],
      ["impact", ImpactStyle.Light],
    ]);
  });

  it("die Einstellung gilt auch hier", () => {
    setzeAttribut("aus");
    expect(spuere("gespeichert")).toBe(false);
    expect(H.aufrufe).toEqual([]);
  });

  it("ein werfendes Plugin reisst nichts mit", () => {
    H.wirft = true;
    expect(() => spuere("gespeichert")).not.toThrow();
    expect(spuere("gespeichert")).toBe(false);
  });

  // 🔴 Dieselbe Falle wie das werfende `vibrate`, nur eine Ebene später: der
  // native Weg ist ASYNCHRON. Ein abgelehntes Promise, das niemand fängt, ist
  // in Node ein harter Abbruch und im Browser eine rote Konsole — beides für
  // eine Bestätigung, die niemand gebraucht hätte.
  it("ein abgelehntes Promise wird verschluckt", async () => {
    H.lehntAb = true;
    expect(spuere("fehler")).toBe(true);
    // Ein Tick warten, damit die Ablehnung wirklich durchläuft.
    await new Promise((r) => setTimeout(r, 0));
    expect(H.aufrufe).toEqual([["notification", NotificationType.Error]]);
  });
});
