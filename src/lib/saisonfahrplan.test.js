import { describe, it, expect } from "vitest";
import { fahrplan, aktuellerRundenSpieltag, beschreibeFahrplan } from "@/lib/saisonfahrplan";
import { DEFAULT_RULES, sanitizeRules } from "@/lib/engine";
import { zeitachse } from "@/lib/zeitachse";
import { alleMatches } from "@/lib/ligen";
import { filterMatchesByTeams } from "@/lib/roundStatus";
import { LIGEN } from "@/lib/ligen";

const KATALOG = alleMatches().map((m) => ({
  id: m.matchId, home: m.home, away: m.away, kickoff: m.kickoff,
  matchday: m.matchday, snapshot: m.snapshot, result: m.result,
  wettbewerb: m.wettbewerb, phase: m.phase,
}));
const BL_TEAMS = Object.keys(LIGEN.find((l) => l.key === "bl").ratings);
const MATCHES = filterMatchesByTeams(KATALOG, BL_TEAMS);

const regeln = (extra = {}) => sanitizeRules({
  ...DEFAULT_RULES,
  joker: {
    enabled: true, modus: "einzel", faktor: 1.5,
    verteilung: { modus: "gleich", frequenz: 4, sichtbarkeit: "offen" },
  },
  ...extra,
});

const bauen = (rules, opt = {}) => fahrplan({
  matches: MATCHES, rules, roundId: "r1", userId: "u1", userIds: ["u1", "u2"], ...opt,
});

describe("Saison-Fahrplan", () => {
  it("eine Zeile je Runden-Spieltag, in der Reihenfolge der Achse", () => {
    const rules = regeln();
    const achse = zeitachse(MATCHES, rules.zeitachse);
    const zeilen = bauen(rules);
    expect(zeilen).toHaveLength(achse.length);
    expect(zeilen.map((z) => z.nummer)).toEqual(achse.map((e) => e.nummer));
  });

  it("die Joker-Marken decken sich mit dem Plan — nicht mehr, nicht weniger", () => {
    const rules = regeln();
    const zeilen = bauen(rules);
    const marken = zeilen.filter((z) => z.joker).length;
    // `frequenz: 4` über die Achse → `kontingent(spieltage, 4)`.
    const achse = zeitachse(MATCHES, rules.zeitachse);
    expect(marken).toBe(Math.max(1, Math.round(achse.length / 4)));
  });

  // 🔴 Die Einstellung, die dieser Screen am leichtesten kaputtmachen könnte.
  it("verdeckt heißt verdeckt: kommende Joker-Spieltage werden NICHT verraten", () => {
    const offen = bauen(regeln());
    const verdeckt = bauen(regeln({
      joker: {
        enabled: true, modus: "einzel", faktor: 1.5,
        verteilung: { modus: "gleich", frequenz: 4, sichtbarkeit: "verdeckt" },
      },
    }));
    const jetztTag = aktuellerRundenSpieltag(zeitachse(MATCHES, DEFAULT_RULES.zeitachse), MATCHES);
    // Offen: es gibt Marken in der Zukunft. Verdeckt: keine einzige.
    expect(offen.some((z) => z.joker && z.nummer > jetztTag)).toBe(true);
    expect(verdeckt.some((z) => z.joker && z.nummer > jetztTag)).toBe(false);
  });

  // 🔴 **Die Zusage ist seit dem 29.08.2026 STÄRKER geworden, nicht schwächer.**
  // Vorher füllte die Achse Pausen zu leeren Spieltagen auf, und dieser Test
  // sicherte ab, dass wenigstens kein Joker darauf fällt. Inzwischen gibt es
  // leere Spieltage gar nicht mehr (Andi, 29.08.2026) — geprüft wird deshalb
  // direkt das Stärkere.
  //
  // ⚠️ Die alte Fassung verlangte ausdrücklich, dass es leere Zeilen GIBT
  // („sonst prüft dieser Test nichts"). Das war als Schutz vor einem leeren
  // Test gedacht und ist genau die Zeile, die beim Umbau umfiel. Der Schutz
  // bleibt — er hängt jetzt nur an etwas, das nicht verschwinden kann.
  it("es gibt gar keinen Spieltag ohne Spiele — und also auch keinen Joker darauf", () => {
    const zeilen = bauen(regeln());
    expect(zeilen.length, "ohne Zeilen prüft dieser Test nichts").toBeGreaterThan(5);
    expect(zeilen.filter((z) => z.spiele === 0)).toEqual([]);
    for (const z of zeilen) if (z.spiele === 0) expect(z.joker).toBe(false);
  });

  it("Saison-Wetten mit Fenster bekommen eine Marke zum Öffnen und zum Schließen", () => {
    const rules = regeln({
      saison: {
        enabled: true, gewicht: 1,
        wetten: [{ key: "torschuetzenkoenig", punkte: 400, abSpieltag: 5, bisSpieltag: 12 }],
      },
    });
    const zeilen = bauen(rules);
    const marken = zeilen.flatMap((z) => z.saison.map((s) => ({ ...s, tag: z.nummer })));
    expect(marken.filter((m) => m.was === "oeffnet")).toHaveLength(1);
    expect(marken.filter((m) => m.was === "schliesst")).toHaveLength(1);
    // Und in der richtigen Reihenfolge.
    const auf = marken.find((m) => m.was === "oeffnet").tag;
    const zu = marken.find((m) => m.was === "schliesst").tag;
    expect(zu).toBeGreaterThan(auf);
  });

  it("eine Wette OHNE Fenster bekommt keine Marke — sie gehört vor die Saison", () => {
    const rules = regeln({
      saison: { enabled: true, gewicht: 1, wetten: [{ key: "meister", punkte: 300 }] },
    });
    expect(bauen(rules).every((z) => z.saison.length === 0)).toBe(true);
  });

  it("ohne Joker und ohne Saison bleibt der Fahrplan ein reiner Spielplan", () => {
    const zeilen = bauen(sanitizeRules(DEFAULT_RULES));
    expect(zeilen.length).toBeGreaterThan(0);
    for (const z of zeilen) {
      expect(z.joker).toBe(false);
      expect(z.rad).toBe(false);
      expect(z.saison).toEqual([]);
    }
  });
});

describe("aktuellerRundenSpieltag", () => {
  const achse = zeitachse(MATCHES, DEFAULT_RULES.zeitachse);

  it("vor dem ersten Anpfiff steht die Saison auf Spieltag 1", () => {
    const frueh = new Date("2020-01-01").getTime();
    expect(aktuellerRundenSpieltag(achse, MATCHES, frueh)).toBe(1);
  });

  it("nach dem letzten Spiel auf dem letzten Spieltag", () => {
    const spaet = new Date("2099-01-01").getTime();
    expect(aktuellerRundenSpieltag(achse, MATCHES, spaet)).toBe(achse.length);
  });

  // ⚠️ Bewusst NICHT „das nächste offene Spiel": in der Länderspielpause gibt
  // es tagelang keines, und der Fahrplan stünde auf einem längst gelaufenen
  // Spieltag.
  // 🔴 **Umgeschrieben am 29.08.2026, und die alte Fassung widersprach dieser
  // Überschrift.** Sie suchte einen LEEREN Runden-Spieltag und erwartete DESSEN
  // Nummer — also gerade nicht „den zuletzt begonnenen". Seit leere Fenster gar
  // nicht mehr als Spieltag geführt werden (Andis Entscheidung, siehe
  // `zeitachse.js`), fällt eine Pause INNERHALB des letzten bespielten
  // Spieltags, und die Überschrift ist auch das, was gemessen wird.
  it("in einer Pause bleibt er auf dem zuletzt BEGONNENEN Spieltag", () => {
    // Die größte Lücke zwischen zwei aufeinanderfolgenden Spieltagen — das ist
    // die Pause, ohne sie an einem Datum festzunageln.
    let vorher = null, luecke = 0;
    for (let i = 0; i < achse.length - 1; i++) {
      const a = achse[i].spiele.at(-1), b = achse[i + 1].spiele[0];
      if (!a || !b) continue;
      const d = new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime();
      if (d > luecke) { luecke = d; vorher = achse[i]; }
    }
    expect(vorher, "es muss überhaupt eine Lücke geben, sonst prüft der Test nichts").toBeDefined();
    expect(luecke).toBeGreaterThan(8 * 24 * 36e5 / 10);   // mehr als acht Tage
    const mitten = new Date(vorher.spiele.at(-1).kickoff).getTime() + luecke / 2;
    expect(aktuellerRundenSpieltag(achse, MATCHES, mitten)).toBe(vorher.nummer);
  });

  it("ohne Achse gibt es keinen Spieltag", () => {
    expect(aktuellerRundenSpieltag([], [], Date.now())).toBeNull();
  });
});

describe("beschreibeFahrplan", () => {
  it("nennt Stand und Länge, nicht nur eine Vokabel", () => {
    const zeilen = bauen(regeln());
    const text = beschreibeFahrplan(zeilen, 5);
    expect(text).toContain("Spieltag 5 von");
    expect(text).toMatch(/tippbar|nichts tippbar/);
  });

  it("ohne Spielplan sagt er das, statt eine leere Zahl zu zeigen", () => {
    expect(beschreibeFahrplan([], null)).toContain("noch keinen Spielplan");
  });
});
