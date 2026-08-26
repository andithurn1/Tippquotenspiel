import { describe, it, expect } from "vitest";
import { raenge, ueberholungen } from "@/lib/ueberholung";

const brett = (...paare) => ({
  wettbewerb: "bl", matchday: 3,
  board: paare.map(([userId, total]) => ({ userId, name: userId.toUpperCase(), total })),
});

describe("Ränge aus einem Board", () => {
  it("sortiert nach Punkten, höchster ist Rang 1", () => {
    const r = raenge(brett(["a", 100], ["b", 300], ["c", 200]).board);
    expect(r.get("b").rang).toBe(1);
    expect(r.get("c").rang).toBe(2);
    expect(r.get("a").rang).toBe(3);
  });

  // ⚠️ Sonst „überholt" jemand, der nur alphabetisch anders einsortiert wurde.
  it("Gleichstand teilt sich den Rang", () => {
    const r = raenge(brett(["a", 200], ["b", 200], ["c", 100]).board);
    expect(r.get("a").rang).toBe(1);
    expect(r.get("b").rang).toBe(1);
    expect(r.get("c").rang).toBe(3);   // zwei belegen Platz 1
  });

  it("kommt mit leer und Unsinn klar", () => {
    expect(raenge().size).toBe(0);
    expect(raenge([null, { total: 5 }]).size).toBe(0);
  });
});

describe("Überholungen", () => {
  it("meldet, wer von hinten an mir vorbeigezogen ist", () => {
    const verlauf = [
      brett(["ich", 200], ["kemal", 100], ["anna", 50]),
      brett(["kemal", 400], ["ich", 300], ["anna", 50]),
    ];
    const out = ueberholungen(verlauf, "ich");
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ vonUserId: "kemal", rang: 2, vorherRang: 1 });
  });

  it("meldet nichts, wenn ich meinen Rang halte oder verbessere", () => {
    const gehalten = [brett(["ich", 200], ["kemal", 100]), brett(["ich", 500], ["kemal", 300])];
    expect(ueberholungen(gehalten, "ich")).toEqual([]);
    const besser = [brett(["kemal", 200], ["ich", 100]), brett(["ich", 500], ["kemal", 300])];
    expect(ueberholungen(besser, "ich")).toEqual([]);
  });

  // 🔴 Wer schon vor mir stand und dort bleibt, hat mich nicht überholt.
  it("meldet nicht, wer ohnehin schon vorne war", () => {
    const verlauf = [
      brett(["kemal", 500], ["ich", 200], ["anna", 100]),
      brett(["kemal", 900], ["anna", 400], ["ich", 300]),
    ];
    const out = ueberholungen(verlauf, "ich");
    expect(out.map((x) => x.vonUserId)).toEqual(["anna"]);
  });

  // ⚠️ Sonst käme die Meldung bei jedem Remis-Spieltag.
  it("Gleichstand ist kein Überholen", () => {
    const verlauf = [brett(["ich", 200], ["kemal", 100]), brett(["ich", 300], ["kemal", 300])];
    expect(ueberholungen(verlauf, "ich")).toEqual([]);
  });

  it("wer neu dazukommt, hat niemanden überholt", () => {
    const verlauf = [brett(["ich", 200]), brett(["neu", 500], ["ich", 200])];
    expect(ueberholungen(verlauf, "ich")).toEqual([]);
  });

  it("mehrere auf einmal, der Vorderste zuerst", () => {
    const verlauf = [
      brett(["ich", 300], ["a", 200], ["b", 100], ["c", 50]),
      brett(["b", 900], ["a", 800], ["ich", 300], ["c", 50]),
    ];
    const out = ueberholungen(verlauf, "ich");
    expect(out.map((x) => x.vonUserId)).toEqual(["b", "a"]);
  });

  it("ohne zwei Spieltage gibt es keinen Vergleich", () => {
    expect(ueberholungen([brett(["ich", 100])], "ich")).toEqual([]);
    expect(ueberholungen([], "ich")).toEqual([]);
    expect(ueberholungen(null, "ich")).toEqual([]);
  });

  it("ohne Nutzer oder ohne eigene Zeile: nichts", () => {
    const verlauf = [brett(["a", 100]), brett(["a", 200])];
    expect(ueberholungen(verlauf, null)).toEqual([]);
    expect(ueberholungen(verlauf, "ich")).toEqual([]);
  });
});
