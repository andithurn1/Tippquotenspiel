import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createMockStore } from "./store.mock";
import { DEMO_ROUND_ID, DEMO_JOIN_CODE } from "./constants";

// ============================================================
//  DER BEITRITTS-CODE IST WIEDER EINE SCHRANKE (LV4, 27.08.2026)
//
//  🔴 Der Befund: `join_code` steht als SPALTE in `rounds`, und `rounds_read`
//  galt `for select to authenticated using (true)`. Jeder Angemeldete konnte
//  damit alle Runden samt Beitritts-Code lesen -- und jeder Runde beitreten.
//
//  ⚠️ Und der Schema-Kommentar behauptete das Gegenteil: „der Code selbst ist
//  die Zugangsschranke, nicht die Sichtbarkeit." Das ist die gefaehrliche
//  Sorte Fehler: sie klingt nach einer Entscheidung und ist eine Luecke.
//
//  Postgres-RLS filtert ZEILEN, nicht Spalten. Deshalb drei Teile:
//    1. Spalten-Recht entziehen -- und zwar RICHTIG (siehe Test unten).
//    2. Beitritt ueber eine Server-Route, die den Code nie herausgibt.
//    3. Eine Funktion mit erhoehten Rechten, damit der ADMIN seinen eigenen
//       Code weiterhin sieht. Ohne sie waere die Luecke zu und die Runde auch.
// ============================================================

const SCHEMA = readFileSync("supabase/schema.sql", "utf8");
const ROUTE = readFileSync("src/app/api/beitreten/route.js", "utf8");

describe("Das Schema macht die Spalte wirklich zu", () => {
  it("🔴 entzieht das TABELLENWEITE Recht und gibt die Spalten einzeln", () => {
    // ⚠️ Der Fehler, der hier fast passiert waere: ein blosses
    // `revoke select (join_code)` ist WIRKUNGSLOS, solange die Rolle ein
    // tabellenweites `select` hat -- und Supabase gibt genau das. Man haette
    // eine Zeile gehabt, die nach Schutz aussieht und keiner ist.
    expect(SCHEMA).toMatch(/revoke select on public\.rounds from authenticated, anon;/);
    expect(SCHEMA).toMatch(/grant select \([^)]*\)\s*\n?\s*on public\.rounds to authenticated, anon;/);
  });

  it("und `join_code` steht NICHT in der erlaubten Liste", () => {
    const erlaubt = /grant select \(([^)]*)\)\s*\n?\s*on public\.rounds/.exec(SCHEMA)?.[1] ?? "";
    expect(erlaubt).not.toContain("join_code");
    // Gegenprobe: die Liste ist nicht leer, sondern nennt die echten Spalten.
    for (const spalte of ["id", "name", "admin_id", "rules"]) {
      expect(erlaubt, `Spalte ${spalte} fehlt -- sie waere live ploetzlich leer`).toContain(spalte);
    }
  });

  it("der Admin kommt ueber eine geprueft-eigene Funktion an seinen Code", () => {
    // 🔴 Ohne sie koennte niemand mehr einladen.
    expect(SCHEMA).toMatch(/create or replace function public\.runden_code/);
    expect(SCHEMA).toMatch(/security definer/);
    // ⚠️ Die Pruefung IN der Funktion ist die ganze Sicherheit -- sie laeuft
    // mit erhoehten Rechten und umgeht RLS.
    expect(SCHEMA).toMatch(/r\.admin_id = auth\.uid\(\)/);
    // ⚠️ Ohne festen `search_path` liesse sich eine andere `rounds`-Tabelle
    // unterschieben.
    expect(SCHEMA).toMatch(/set search_path = public/);
    expect(SCHEMA).toMatch(/revoke all on function public\.runden_code\(uuid\) from public, anon;/);
  });
});

describe("Die Route gibt nichts preis", () => {
  it("🔴 liefert NIE den Code zurueck", () => {
    // Die Antwort enthaelt Id und Name -- sonst nichts.
    expect(ROUTE).toMatch(/Response\.json\(\{ id: runde\.id, name: runde\.name \}\)/);
    expect(ROUTE).not.toMatch(/join_code: /);
  });

  it("glaubt die Nutzer-Id NICHT dem Aufrufer", () => {
    // ⚠️ Sonst tritt man in fremdem Namen bei. Sie kommt aus dem Token.
    expect(ROUTE).toMatch(/auth\.getUser\(\)/);
    expect(ROUTE).toMatch(/user_id: user\.id/);
  });

  it("bremst das Durchprobieren", () => {
    // 🔴 Ein 6-stelliger Code hat rund 2 Milliarden Moeglichkeiten. Im Browser
    // geht man die in Ruhe durch, hier nicht.
    expect(ROUTE).toMatch(/429/);
    expect(ROUTE).toMatch(/VERSUCHE_PRO_MINUTE/);
  });

  it("räumt seinen Zaehler auf, statt nur zu wachsen", () => {
    // ⚠️ Ein Speicher, der nur waechst, ist ein Leck mit Anlauf.
    expect(ROUTE).toMatch(/versuche\.delete/);
  });
});

describe("Der Store: ein Aufruf statt zwei", () => {
  it("`beitretenMitCode` tritt bei und gibt Id + Name -- ohne Code", async () => {
    const store = createMockStore();
    const r = await store.beitretenMitCode({ code: DEMO_JOIN_CODE, userId: "neu-1", name: "Neu" });
    expect(r).toEqual({ id: DEMO_ROUND_ID, name: expect.any(String) });
    expect(r.join_code).toBeUndefined();
    const mitglieder = await store.listMembers(DEMO_ROUND_ID);
    expect(mitglieder.some((m) => m.user_id === "neu-1")).toBe(true);
  });

  it("ein falscher Code gibt `null` -- kein Fehler", async () => {
    // 🔴 „Diesen Code gibt es nicht" und „hat nicht geklappt" sind zwei sehr
    // verschiedene Nachrichten. Als Ausnahme geworfen saehe die erste aus wie
    // die zweite.
    const store = createMockStore();
    expect(await store.beitretenMitCode({ code: "GIBTSNICHT", userId: "u1" })).toBeNull();
  });

  it("liest Klein- und Grossschreibung gleich", async () => {
    const store = createMockStore();
    expect(await store.beitretenMitCode({ code: DEMO_JOIN_CODE.toLowerCase(), userId: "u2" }))
      .toMatchObject({ id: DEMO_ROUND_ID });
  });

  it("der Admin bekommt seinen Code, ein anderer nicht", async () => {
    const store = createMockStore();
    const runde = await store.getRound(DEMO_ROUND_ID);
    expect(await store.getJoinCode(DEMO_ROUND_ID, runde.admin_id)).toBe(DEMO_JOIN_CODE);
    expect(await store.getJoinCode(DEMO_ROUND_ID, "irgendwer")).toBeNull();
    expect(await store.getJoinCode("gibts-nicht")).toBeNull();
  });

  it("eine neu angelegte Runde liefert ihren Code mit", async () => {
    // ⚠️ Der Admin soll ihn sofort weitergeben koennen -- ohne ihn zu LESEN.
    // Er ist bekannt, weil er im Browser erzeugt wurde.
    const store = createMockStore();
    const neu = await store.createRound({ name: "Test", adminId: "a1", rules: {} });
    expect(neu.join_code).toBeTruthy();
    expect(await store.getJoinCode(neu.id, "a1")).toBe(neu.join_code);
  });
});

describe("Der Screen nimmt den neuen Weg", () => {
  const SCREEN = readFileSync("src/components/RundeBeitreten.jsx", "utf8");

  it("ruft `beitretenMitCode` und nicht mehr `getRoundByCode`", () => {
    // 🔴 Der alte Weg LAS die Runde per Code -- genau die Abfrage, die live
    // jeder machen konnte.
    expect(SCREEN).toContain("beitretenMitCode");
    expect(SCREEN).not.toContain("getRoundByCode");
  });
});
