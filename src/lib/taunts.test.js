import { describe, it, expect } from "vitest";
import {
  TAUNTS, RELATIONS, relationBetween, tauntsFor, buildTaunt,
  tauntTargets, darfSenden, MAX_PRO_ZIEL_UND_SPIELTAG,
} from "@/lib/taunts";
import { TIP_SCENARIOS, RANK_REACTIONS } from "@/lib/reactions";

const ich = { userId: "u-du", name: "Du", total: 500, rank: 1 };
const hinten = { userId: "u-b", name: "Bene", total: 300, rank: 2 };
const vorne = { userId: "u-c", name: "Chris", total: 900, rank: 1 };
const gleich = { userId: "u-d", name: "Dani", total: 500, rank: 1 };

describe("Katalog", () => {
  it("jeder Spruch hat eine gültige Konstellation und Platzhalter", () => {
    for (const t of TAUNTS) {
      expect(RELATIONS).toContain(t.relation);
      expect(t.text).toContain("{du}");
      expect(t.key && t.label && t.emoji).toBeTruthy();
    }
  });

  it("Schlüssel sind eindeutig", () => {
    const keys = TAUNTS.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("jeder Spruch verweist auf einen existierenden Reaktions-Clip", () => {
    const bekannt = new Set([
      ...TIP_SCENARIOS.map((s) => s.key),
      ...Object.keys(RANK_REACTIONS),
    ]);
    for (const t of TAUNTS) expect(bekannt).toContain(t.reaction);
  });

  it("für jede Konstellation gibt es mindestens einen Spruch", () => {
    for (const r of RELATIONS) expect(tauntsFor(r).length).toBeGreaterThan(0);
  });
});

describe("relationBetween", () => {
  it("erkennt vorn, hinten und gleichauf", () => {
    expect(relationBetween(ich, hinten)).toBe("ueberholt");
    expect(relationBetween(ich, vorne)).toBe("hinterher");
    expect(relationBetween(ich, gleich)).toBe("gleichauf");
  });

  it("ohne Gegenüber null statt Absturz", () => {
    expect(relationBetween(ich, null)).toBeNull();
    expect(relationBetween(null, hinten)).toBeNull();
  });
});

describe("buildTaunt", () => {
  it("setzt den Namen des Ziels ein und hängt die Signatur an", () => {
    const t = tauntsFor("ueberholt")[0];
    const spott = buildTaunt({ taunt: t, fromName: "Du", toName: "Bene", roundName: "Freundeskreis" });
    expect(spott.text).toContain("Bene");
    expect(spott.text).not.toContain("{du}");
    expect(spott.shareText).toContain("— Du, Freundeskreis");
  });

  it("funktioniert auch ohne Rundenname", () => {
    const spott = buildTaunt({ taunt: tauntsFor("gleichauf")[0], fromName: "Du", toName: "Dani" });
    expect(spott.shareText).toContain("— Du");
  });

  it("fällt auf neutrale Anrede zurück, wenn kein Name da ist", () => {
    const spott = buildTaunt({ taunt: tauntsFor("hinterher")[0] });
    expect(spott.text).toContain("Mitspieler");
  });

  it("ohne Vorlage null", () => {
    expect(buildTaunt({ taunt: null, toName: "X" })).toBeNull();
  });
});

describe("tauntTargets", () => {
  it("listet alle außer mir selbst, nach Rang sortiert", () => {
    const board = [ich, hinten, vorne];
    const ziele = tauntTargets(board, "u-du");
    expect(ziele.map((z) => z.userId)).not.toContain("u-du");
    expect(ziele).toHaveLength(2);
    expect(ziele[0].rank).toBeLessThanOrEqual(ziele[1].rank);
  });

  it("leeres Board ergibt keine Ziele", () => {
    expect(tauntTargets([], "u-du")).toEqual([]);
  });
});

describe("Spam-Bremse", () => {
  it("erlaubt den ersten Spott, blockt den zweiten am selben Spieltag", () => {
    const verlauf = [];
    expect(darfSenden(verlauf, { toId: "u-b", matchday: 3 })).toBe(true);
    verlauf.push({ toId: "u-b", matchday: 3 });
    expect(darfSenden(verlauf, { toId: "u-b", matchday: 3 })).toBe(false);
  });

  it("anderes Ziel oder anderer Spieltag ist wieder frei", () => {
    const verlauf = [{ toId: "u-b", matchday: 3 }];
    expect(darfSenden(verlauf, { toId: "u-c", matchday: 3 })).toBe(true);
    expect(darfSenden(verlauf, { toId: "u-b", matchday: 4 })).toBe(true);
  });

  it("Obergrenze ist bewusst klein", () => {
    expect(MAX_PRO_ZIEL_UND_SPIELTAG).toBeLessThanOrEqual(2);
  });
});
