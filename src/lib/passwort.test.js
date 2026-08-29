import { describe, it, expect } from "vitest";
import {
  PASSWORT_MIN, PASSWORT_MAX_BYTES,
  pruefePasswort, passwortStaerke, passwortFehlerText,
} from "./passwort";

describe("Passwort-Regeln", () => {
  it("ein normales Passwort geht durch", () => {
    expect(pruefePasswort("Regenschirm42", "andi@example.com")).toBeNull();
    expect(pruefePasswort("korrektpferdbatteriedraht")).toBeNull();
  });

  it("zu kurz wird abgelehnt", () => {
    expect(pruefePasswort("kurz")).toMatch(/Mindestens/);
    expect(pruefePasswort("a".repeat(PASSWORT_MIN - 1))).toMatch(/Mindestens/);
    expect(pruefePasswort("a".repeat(PASSWORT_MIN))).toBeNull();
  });

  it("leer wird abgelehnt", () => {
    expect(pruefePasswort("")).toBeTruthy();
    expect(pruefePasswort(null)).toBeTruthy();
    expect(pruefePasswort(undefined)).toBeTruthy();
  });

  // 🔴 Die Grenze, die sonst STILL zuschlägt: bcrypt schneidet nach 72 Bytes
  // ab, ohne einen Fehler zu melden. Wer 80 Zeichen setzt, meldet sich später
  // mit den ersten 72 an und erfährt nie, dass der Rest nie zählte.
  it("🔴 misst in BYTES, nicht in Zeichen — Umlaute zählen doppelt", () => {
    expect(pruefePasswort("a".repeat(PASSWORT_MAX_BYTES))).toBeNull();
    expect(pruefePasswort("a".repeat(PASSWORT_MAX_BYTES + 1))).toMatch(/Höchstens/);
    // 40 Umlaute sind 80 Bytes — als ZEICHEN gezählt wären sie erlaubt.
    expect("ä".repeat(40).length).toBe(40);
    expect(pruefePasswort("ä".repeat(40))).toMatch(/Höchstens/);
  });

  it("Leerzeichen am Rand werden gemeldet statt still mitgezählt", () => {
    expect(pruefePasswort(" Regenschirm42")).toMatch(/Leerzeichen/);
    expect(pruefePasswort("Regenschirm42 ")).toMatch(/Leerzeichen/);
    // Mittendrin ist in Ordnung — eine Wortfolge ist ein gutes Passwort.
    expect(pruefePasswort("drei kleine schweine")).toBeNull();
  });

  it("das offensichtlich Geratene wird abgelehnt", () => {
    expect(pruefePasswort("passwort")).toBeTruthy();
    expect(pruefePasswort("Passwort123")).toBeTruthy();
    expect(pruefePasswort("12345678")).toBeTruthy();
    expect(pruefePasswort("fussball")).toBeTruthy();
  });

  it("das Passwort darf nicht die eigene Adresse sein", () => {
    expect(pruefePasswort("andi@example.com", "andi@example.com")).toBeTruthy();
    expect(pruefePasswort("andi", "andi@example.com")).toBeTruthy();   // auch der Teil davor
  });
});

describe("Stärke-Anzeige", () => {
  it("wächst mit der Länge, nicht mit Sonderzeichen allein", () => {
    const kurzMitZeichen = passwortStaerke("Ab1!xyzq");
    const langOhne = passwortStaerke("korrektpferdbatteriedraht");
    expect(langOhne.stufe).toBeGreaterThanOrEqual(kurzMitZeichen.stufe);
  });

  it("meldet zu kurze Eingaben als solche", () => {
    expect(passwortStaerke("kurz").wort).toBe("zu kurz");
    expect(passwortStaerke("").stufe).toBe(0);
  });

  it("bleibt in den Stufen 0 bis 4", () => {
    for (const p of ["", "a", "abcdefgh", "korrektpferdbatteriedraht", "X9!q".repeat(20)]) {
      const s = passwortStaerke(p);
      expect(s.stufe).toBeGreaterThanOrEqual(0);
      expect(s.stufe).toBeLessThanOrEqual(4);
    }
  });
});

describe("Fehlermeldungen", () => {
  // 🔴 Der wichtigste Test hier: „Adresse unbekannt" und „Passwort falsch"
  // müssen DASSELBE sagen. Wer die beiden unterscheiden kann, kann
  // durchprobieren, welche Adressen ein Konto haben — bei einem Tippspiel
  // unter Freunden reicht das, um zu erfahren, wer mitspielt.
  it("🔴 verrät nicht, ob es die Adresse überhaupt gibt", () => {
    const text = passwortFehlerText({ message: "Invalid login credentials" });
    expect(text).toBe("Adresse oder Passwort stimmt nicht.");
    expect(text).not.toMatch(/unbekannt|existiert|kein Konto/i);
  });

  it("übersetzt die üblichen Fälle", () => {
    expect(passwortFehlerText({ message: "Email not confirmed" })).toMatch(/bestätigt/);
    expect(passwortFehlerText({ message: "User already registered" })).toMatch(/schon ein Konto/);
    expect(passwortFehlerText({ message: "Request rate limit reached" })).toMatch(/Zu viele Versuche/);
  });

  it("fällt bei Unbekanntem auf einen brauchbaren Satz zurück", () => {
    expect(passwortFehlerText(null)).toBeTruthy();
    expect(passwortFehlerText({ message: "irgendwas Neues" })).toMatch(/fehlgeschlagen/);
  });

  it("⚠️ und keine Meldung ist auf Englisch", () => {
    for (const roh of [
      "Invalid login credentials", "Email not confirmed", "User already registered",
      "Request rate limit reached", "etwas ganz anderes", null,
    ]) {
      expect(passwortFehlerText({ message: roh })).not.toMatch(/[a-z] (the|not|is|are) /i);
    }
  });
});
