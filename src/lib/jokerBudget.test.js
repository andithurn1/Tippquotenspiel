import { describe, it, expect } from "vitest";
import {
  BUDGET_LIMITS, DEFAULT_BUDGET,
  sanitizeBudget, budgetVerlauf, kontoVerlauf, preisFuer, kannBezahlen, konflikte,
  einsaetzeAllerArten,
} from "./jokerBudget";

// ── Quellen — einzeln und kombiniert ───────────────────────

describe("budgetVerlauf — Quellen einzeln", () => {
  it("startkapital: einmalig an Spieltag 1, danach unverändert", () => {
    const { proSpieler } = budgetVerlauf({
      quellen: [{ typ: "startkapital", betrag: 20 }],
      takt: "saison", verfall: "deckel", maxAnsparen: 100,
      spieltage: 3, userIds: ["a"],
    });
    expect(proSpieler.a.map((v) => v.kontostand)).toEqual([20, 20, 20]);
  });

  it("gleich: derselbe Betrag am Periodenstart", () => {
    const { proSpieler } = budgetVerlauf({
      quellen: [{ typ: "gleich", betrag: 10 }],
      takt: "saison", verfall: "deckel", maxAnsparen: 100,
      spieltage: 3, userIds: ["a"],
    });
    expect(proSpieler.a.map((v) => v.kontostand)).toEqual([10, 10, 10]);
  });

  it("leistung: zahlt genau am Spieltag des ausgelösten Ereignisses", () => {
    const { proSpieler } = budgetVerlauf({
      quellen: [{ typ: "leistung", proEreignis: 5, ausgeloest: [{ userId: "a", spieltag: 2, anzahl: 2 }] }],
      verfall: "nie", spieltage: 3, userIds: ["a"],
    });
    expect(proSpieler.a.map((v) => v.kontostand)).toEqual([0, 10, 10]);
  });

  it("rueckstand: wer hinten liegt, bekommt mehr", () => {
    const stand = [{ matchday: 1, board: [{ userId: "a", total: 0 }, { userId: "b", total: 20 }] }];
    const { proSpieler } = budgetVerlauf({
      quellen: [{ typ: "rueckstand", proPunktRueckstand: 0.5, deckel: 0 }],
      takt: "saison", verfall: "deckel", maxAnsparen: 100,
      spieltage: 2, stand, userIds: ["a", "b"],
    });
    expect(proSpieler.a.map((v) => v.kontostand)).toEqual([10, 10]);
    expect(proSpieler.b.map((v) => v.kontostand)).toEqual([0, 0]);
  });

  it("platzierung: nach Rang, Führender bekommt den vollen Betrag", () => {
    const stand = [{ matchday: 1, board: [{ userId: "a", total: 0 }, { userId: "b", total: 20 }] }];
    const { proSpieler } = budgetVerlauf({
      quellen: [{ typ: "platzierung", betrag: 10, kurve: "linear" }],
      takt: "saison", verfall: "deckel", maxAnsparen: 100,
      spieltage: 2, stand, userIds: ["a", "b"],
    });
    expect(proSpieler.a.map((v) => v.kontostand)).toEqual([5, 5]);
    expect(proSpieler.b.map((v) => v.kontostand)).toEqual([10, 10]);
  });
});

describe("budgetVerlauf — Quellen kombiniert (sie addieren sich)", () => {
  it("startkapital + gleich addieren sich am Spieltag 1", () => {
    const { proSpieler } = budgetVerlauf({
      quellen: [{ typ: "startkapital", betrag: 20 }, { typ: "gleich", betrag: 10 }],
      takt: "saison", verfall: "deckel", maxAnsparen: 100,
      spieltage: 2, userIds: ["a"],
    });
    expect(proSpieler.a.map((v) => v.kontostand)).toEqual([30, 30]);
  });

  it("rueckstand + platzierung addieren sich", () => {
    const stand = [{ matchday: 1, board: [{ userId: "a", total: 0 }, { userId: "b", total: 20 }] }];
    const { proSpieler } = budgetVerlauf({
      quellen: [
        { typ: "rueckstand", proPunktRueckstand: 0.5, deckel: 0 },
        { typ: "platzierung", betrag: 10, kurve: "linear" },
      ],
      takt: "saison", verfall: "deckel", maxAnsparen: 100,
      spieltage: 1, stand, userIds: ["a", "b"],
    });
    // a: rueckstand 10 + platzierung 5 = 15. b: rueckstand 0 + platzierung 10 = 10.
    expect(proSpieler.a[0].kontostand).toBe(15);
    expect(proSpieler.b[0].kontostand).toBe(10);
  });
});

// ── Verfall ─────────────────────────────────────────────────

describe("budgetVerlauf — verfall", () => {
  it("nie: sammelt unbegrenzt", () => {
    const { proSpieler } = budgetVerlauf({
      quellen: [{ typ: "gleich", betrag: 10 }],
      takt: "spieltag", verfall: "nie", spieltage: 3, userIds: ["a"],
    });
    expect(proSpieler.a.map((v) => v.kontostand)).toEqual([10, 20, 30]);
  });

  it("periode: verfällt am Ende jedes Takts", () => {
    const { proSpieler } = budgetVerlauf({
      quellen: [{ typ: "gleich", betrag: 10 }],
      takt: "spieltag", verfall: "periode", spieltage: 3, userIds: ["a"],
    });
    expect(proSpieler.a.map((v) => v.kontostand)).toEqual([10, 10, 10]);
  });

  it("deckel mit maxAnsparen: Sammeln erlaubt bis zur Obergrenze", () => {
    const { proSpieler } = budgetVerlauf({
      quellen: [{ typ: "gleich", betrag: 10 }],
      takt: "spieltag", verfall: "deckel", maxAnsparen: 25, spieltage: 4, userIds: ["a"],
    });
    expect(proSpieler.a.map((v) => v.kontostand)).toEqual([10, 20, 25, 25]);
  });
});

// ── Preisdynamik ────────────────────────────────────────────

describe("preisFuer", () => {
  it("preisModus steigend: der dritte Einsatz kostet nachweislich mehr als der erste", () => {
    const budget = { preise: { "joker.einzel": 10 }, preisModus: "steigend", steigerung: 1.5 };
    const erster = preisFuer("joker.einzel", budget, { bisherInPeriode: 0 });
    const zweiter = preisFuer("joker.einzel", budget, { bisherInPeriode: 1 });
    const dritter = preisFuer("joker.einzel", budget, { bisherInPeriode: 2 });
    expect(erster).toBe(10);
    expect(zweiter).toBe(15);
    expect(dritter).toBe(22.5);
    expect(dritter).toBeGreaterThan(erster);
  });

  it("preisModus knappheit wirkt über spielerInPeriode", () => {
    const budget = { preise: { "duell.klau": 8 }, preisModus: "knappheit", steigerung: 2 };
    const wenige = preisFuer("duell.klau", budget, { spielerInPeriode: 0 });
    const viele = preisFuer("duell.klau", budget, { spielerInPeriode: 2 });
    expect(wenige).toBe(8);
    expect(viele).toBe(32);
    expect(viele).toBeGreaterThan(wenige);
  });
});

// ── Zahlungsfähigkeit ───────────────────────────────────────

describe("kannBezahlen", () => {
  it("lehnt einen Einsatz ohne Deckung ab", () => {
    expect(kannBezahlen(5, 10)).toBe(false);
  });

  it("ein Kontostand wird nie negativ — reicht der Betrag exakt, ist es erlaubt", () => {
    expect(kannBezahlen(10, 10)).toBe(true);
    expect(kannBezahlen(0, 0)).toBe(true);
  });
});

// ── Ohne Stand ──────────────────────────────────────────────

describe("rueckstand/platzierung ohne stand", () => {
  it("liefern 0", () => {
    const { proSpieler } = budgetVerlauf({
      quellen: [
        { typ: "rueckstand", proPunktRueckstand: 1, deckel: 0 },
        { typ: "platzierung", betrag: 10 },
      ],
      takt: "saison", verfall: "deckel", maxAnsparen: 100,
      spieltage: 2, stand: null, userIds: ["a"],
    });
    expect(proSpieler.a.map((v) => v.kontostand)).toEqual([0, 0]);
  });
});

// ── Regressionstest F1 ──────────────────────────────────────
// standAmTag darf nicht auf einen Stand aus der ZUKUNFT zurückfallen.

describe("Regression F1 — standAmTag ohne Zukunftswissen", () => {
  it("stand beginnt erst bei Spieltag 3 -> an Spieltag 1 und 2 gibt es 0 Rückstands-Budget", () => {
    const stand = [{ matchday: 3, board: [{ userId: "a", total: 100 }, { userId: "b", total: 0 }] }];
    const { proSpieler } = budgetVerlauf({
      quellen: [{ typ: "rueckstand", proPunktRueckstand: 1, deckel: 0 }],
      takt: "spieltag", verfall: "nie", spieltage: 4, stand, userIds: ["a", "b"],
    });
    // b liegt ab Spieltag 3 zurück (a führt 100:0) — vorher gibt es dafür
    // keinen Beleg, also 0 statt des vollen (späteren) Rückstandsbetrags.
    expect(proSpieler.b[0].kontostand).toBe(0); // Spieltag 1
    expect(proSpieler.b[1].kontostand).toBe(0); // Spieltag 2
    expect(proSpieler.b[2].kontostand).toBe(100); // Spieltag 3 — jetzt gibt es einen Stand
    expect(proSpieler.a.map((v) => v.kontostand)).toEqual([0, 0, 0, 0]);
  });
});

// ── Regressionstest F2 ──────────────────────────────────────
// budgetVerlauf darf ohne stand nicht leer bleiben, wenn userIds übergeben wird.

describe("Regression F2 — userIds als expliziter Parameter", () => {
  it("nur Quelle gleich, kein stand, aber userIds -> beide bekommen ihr Budget", () => {
    const { proSpieler } = budgetVerlauf({
      quellen: [{ typ: "gleich", betrag: 10 }],
      takt: "saison", verfall: "deckel", maxAnsparen: 100,
      spieltage: 2, userIds: ["a", "b"],
    });
    expect(Object.keys(proSpieler).sort()).toEqual(["a", "b"]);
    expect(proSpieler.a.map((v) => v.kontostand)).toEqual([10, 10]);
    expect(proSpieler.b.map((v) => v.kontostand)).toEqual([10, 10]);
  });

  it("userIds wird mit den aus stand/ausgeloest abgeleiteten Ids vereinigt, nicht ersetzt", () => {
    const stand = [{ matchday: 1, board: [{ userId: "c", total: 0 }] }];
    const { proSpieler } = budgetVerlauf({
      quellen: [{ typ: "gleich", betrag: 10 }],
      takt: "saison", spieltage: 1, stand, userIds: ["a"],
    });
    expect(Object.keys(proSpieler).sort()).toEqual(["a", "c"]);
  });
});

// ── sanitizeBudget ──────────────────────────────────────────

describe("sanitizeBudget", () => {
  it("beschneidet Zahlen auf BUDGET_LIMITS", () => {
    const r = sanitizeBudget({ quellen: [{ typ: "gleich", betrag: 9999 }], maxAnsparen: 999999 });
    expect(r.quellen[0].betrag).toBe(BUDGET_LIMITS.betrag.max);
    expect(r.maxAnsparen).toBe(BUDGET_LIMITS.maxAnsparen.max);
  });

  it("wirft unbekannte Quellen-Typen raus", () => {
    const r = sanitizeBudget({ quellen: [{ typ: "gleich", betrag: 10 }, { typ: "quatsch", betrag: 5 }] });
    expect(r.quellen.length).toBe(1);
    expect(r.quellen[0].typ).toBe("gleich");
  });

  it("ohne Angaben ist die Vorgabe DEFAULT_BUDGET (bis auf enabled/quellen-Normalisierung)", () => {
    const r = sanitizeBudget();
    expect(r.takt).toBe(DEFAULT_BUDGET.takt);
    expect(r.verfall).toBe(DEFAULT_BUDGET.verfall);
    expect(r.preisModus).toBe(DEFAULT_BUDGET.preisModus);
  });
});

// ── Konflikte ───────────────────────────────────────────────

describe("konflikte", () => {
  it("verfall nie + hoher gleich-Betrag wird gemeldet", () => {
    const rules = { budget: { enabled: true, quellen: [{ typ: "gleich", betrag: 300 }], verfall: "nie" } };
    const k = konflikte(rules);
    const treffer = k.find((x) => x.key === "budget-nie-schluss-salve");
    expect(treffer).toBeTruthy();
    expect(treffer.korrigieren).toBe(true);
  });

  it("verfall deckel mit demselben Betrag löst die Meldung nicht aus", () => {
    const rules = { budget: { enabled: true, quellen: [{ typ: "gleich", betrag: 300 }], verfall: "deckel" } };
    const k = konflikte(rules);
    expect(k.find((x) => x.key === "budget-nie-schluss-salve")).toBeUndefined();
  });
});

// ── kontoVerlauf — der echte Kontostand (Zufluss minus Käufe) ────────────
// design/kontaktstellen.md Abschnitt 5 Punkt 2.

describe("kontoVerlauf", () => {
  it("ohne Käufe stimmt der Kontostand mit budgetVerlauf überein", () => {
    const rules = {
      joker: { modus: "ranking" },
      budget: { enabled: true, quellen: [{ typ: "gleich", betrag: 10 }], takt: "spieltag", verfall: "nie" },
    };
    const zufluss = budgetVerlauf({
      quellen: [{ typ: "gleich", betrag: 10 }], takt: "spieltag", verfall: "nie",
      spieltage: 3, userIds: ["a"],
    });
    const konto = kontoVerlauf({ rules, tipps: [], spieltage: 3, userIds: ["a"] });
    expect(konto.proSpieler.a.map((v) => v.kontostand)).toEqual(zufluss.proSpieler.a.map((v) => v.kontostand));
    expect(konto.proSpieler.a.every((v) => v.ausgaben === 0)).toBe(true);
  });

  it("ein Kauf senkt den Kontostand ab genau dem Spieltag des Kaufs — vorher unverändert", () => {
    const rules = {
      joker: { modus: "ranking" },
      budget: {
        enabled: true, quellen: [{ typ: "gleich", betrag: 10 }], takt: "spieltag", verfall: "nie",
        preise: { "joker.ranking": 5 }, preisModus: "fix",
      },
    };
    // Gewicht 2 an Spieltag 2 ist ein Kauf (Modus "ranking": gewicht !== 1).
    const tipps = [{ userId: "a", matchday: 2, gewicht: 2 }];
    const { proSpieler } = kontoVerlauf({ rules, tipps, spieltage: 3, userIds: ["a"] });
    // Zufluss wäre [10, 20, 30] — Spieltag 1 bleibt unangetastet, ab
    // Spieltag 2 fehlen die 5 Narren des Kaufs.
    expect(proSpieler.a[0].kontostand).toBe(10);
    expect(proSpieler.a[1].kontostand).toBe(15);
    expect(proSpieler.a[2].kontostand).toBe(25);
  });

  it("zwei Käufe desselben Spielers summieren sich", () => {
    const rules = {
      joker: { modus: "ranking" },
      budget: {
        enabled: true, quellen: [{ typ: "gleich", betrag: 10 }], takt: "spieltag", verfall: "nie",
        preise: { "joker.ranking": 5 }, preisModus: "fix",
      },
    };
    const tipps = [
      { userId: "a", matchday: 1, gewicht: 2 },
      { userId: "a", matchday: 2, gewicht: 3 },
    ];
    const { proSpieler } = kontoVerlauf({ rules, tipps, spieltage: 3, userIds: ["a"] });
    expect(proSpieler.a[0].kontostand).toBe(5);   // 10 - 5
    expect(proSpieler.a[1].kontostand).toBe(10);  // 20 - (5+5)
    expect(proSpieler.a[2].kontostand).toBe(20);  // 30 - (5+5)
  });

  it("der Kontostand geht nie unter 0", () => {
    const rules = {
      joker: { modus: "ranking" },
      budget: {
        enabled: true, quellen: [{ typ: "gleich", betrag: 1 }], takt: "spieltag", verfall: "nie",
        preise: { "joker.ranking": 100 }, preisModus: "fix",
      },
    };
    const tipps = [{ userId: "a", matchday: 1, gewicht: 2 }];
    const { proSpieler } = kontoVerlauf({ rules, tipps, spieltage: 3, userIds: ["a"] });
    expect(proSpieler.a.every((v) => v.kontostand >= 0)).toBe(true);
    expect(proSpieler.a.map((v) => v.kontostand)).toEqual([0, 0, 0]);
  });

  // Gegenprobe nach design/kontaktstellen.md Abschnitt 5: `stand` (echte
  // Leaderboard-Historie, `getStore().getLeaderboardHistory`) muss bei den
  // Budget-Quellen "rueckstand"/"platzierung" ein messbar HÖHERES Ergebnis
  // liefern als ohne — sonst wäre diese Quelle trotz `kontoVerlauf` eine tote
  // Kontaktstelle (ein zu niedriger Kontostand wäre schlimmer als keiner,
  // design/waehrungen.md Abschnitt 4).
  it("'rueckstand'-Quelle MIT stand liefert einen höheren Zufluss als ohne stand", () => {
    const rules = {
      joker: { modus: "ranking" },
      budget: {
        enabled: true, quellen: [{ typ: "rueckstand", proPunktRueckstand: 0.5, deckel: 0 }],
        takt: "saison", verfall: "deckel", maxAnsparen: 100,
      },
    };
    // Zusätzliches `wettbewerb`-Feld wie bei `getStore().getLeaderboardHistory` —
    // darf `kontoVerlauf`/`budgetVerlauf` nicht stören.
    const stand = [{ wettbewerb: "bl", matchday: 1, board: [{ userId: "a", total: 0 }, { userId: "b", total: 20 }] }];

    const ohneStand = kontoVerlauf({ rules, tipps: [], spieltage: 2, userIds: ["a", "b"] });
    const mitStand = kontoVerlauf({ rules, tipps: [], spieltage: 2, stand, userIds: ["a", "b"] });

    expect(ohneStand.proSpieler.a.map((v) => v.kontostand)).toEqual([0, 0]);
    expect(mitStand.proSpieler.a[0].kontostand).toBe(10);
    expect(mitStand.proSpieler.a[0].kontostand).toBeGreaterThan(ohneStand.proSpieler.a[0].kontostand);
  });

  // 🔴 Zwei Währungen (design/waehrungen.md Abschnitt 1): im Modus "einsatz"
  // ist `tip.gewicht` ein Münz-Einsatz, kein Narren-Kauf. Derselbe Tipp darf
  // im Modus "einsatz" deshalb keine Narren kosten — sonst zöge man
  // demselben Spieler zweimal etwas ab, in zwei verschiedenen Währungen.
  it("Modus 'einsatz' kostet KEINE Narren — identischer Tipp, nur in 'ranking' entstehen Ausgaben", () => {
    const budget = {
      enabled: true, quellen: [{ typ: "gleich", betrag: 10 }], takt: "spieltag", verfall: "nie",
      preise: { "joker.ranking": 5, "joker.einzel": 5 }, preisModus: "fix",
    };
    const tipps = [{ userId: "a", matchday: 1, gewicht: 2 }];

    const ranking = kontoVerlauf({
      rules: { joker: { modus: "ranking" }, budget }, tipps, spieltage: 2, userIds: ["a"],
    });
    const einsatz = kontoVerlauf({
      rules: { joker: { modus: "einsatz" }, budget }, tipps, spieltage: 2, userIds: ["a"],
    });

    expect(ranking.proSpieler.a[0].ausgaben).toBeGreaterThan(0);
    expect(einsatz.proSpieler.a.every((v) => v.ausgaben === 0)).toBe(true);
    // Im Modus "einsatz" bleibt der Kontostand der reine Zufluss.
    expect(einsatz.proSpieler.a.map((v) => v.kontostand)).toEqual([10, 20]);
  });

  it("preisModus 'steigend' macht den ZWEITEN Kauf teurer als den ersten", () => {
    const rules = {
      joker: { modus: "ranking" },
      budget: {
        enabled: true, quellen: [{ typ: "gleich", betrag: 100 }], takt: "alleNSpieltage", n: 10, verfall: "nie",
        preise: { "joker.ranking": 10 }, preisModus: "steigend", steigerung: 2,
      },
    };
    // Beide Käufe fallen in dieselbe Periode (alleNSpieltage, n=10, Spieltage 1-5).
    const tipps = [
      { userId: "a", matchday: 1, gewicht: 2 },
      { userId: "a", matchday: 3, gewicht: 2 },
    ];
    const { proSpieler } = kontoVerlauf({ rules, tipps, spieltage: 5, userIds: ["a"] });
    const ersterPreis = proSpieler.a[0].ausgaben;
    const zweiterPreis = proSpieler.a[2].ausgaben;
    expect(ersterPreis).toBe(10);
    expect(zweiterPreis).toBe(20);
    expect(zweiterPreis).toBeGreaterThan(ersterPreis);
  });

  // Gegenprobe nach design/kontaktstellen.md Abschnitt 5: eine Einstellung
  // auf Anschlag (hier: der maximale Preis, BUDGET_LIMITS.preis.max) muss ein
  // messbar anderes Ergebnis liefern als die Vorgabe — sonst wäre diese
  // Kontaktstelle nur scheinbar verkabelt.
  it("Preis auf Anschlag (BUDGET_LIMITS.preis.max) liefert ein messbar anderes Ergebnis als die Vorgabe", () => {
    const basis = {
      enabled: true, quellen: [{ typ: "gleich", betrag: 250 }], takt: "saison", verfall: "nie",
      preisModus: "fix",
    };
    const tipps = [{ userId: "a", matchday: 1, gewicht: 2 }];

    const vorgabe = kontoVerlauf({
      rules: { joker: { modus: "ranking" }, budget: { ...basis, preise: { "joker.ranking": 5 } } },
      tipps, spieltage: 1, userIds: ["a"],
    });
    const anschlag = kontoVerlauf({
      rules: {
        joker: { modus: "ranking" },
        budget: { ...basis, preise: { "joker.ranking": BUDGET_LIMITS.preis.max } },
      },
      tipps, spieltage: 1, userIds: ["a"],
    });

    expect(vorgabe.proSpieler.a[0].kontostand).toBe(245);
    expect(anschlag.proSpieler.a[0].kontostand).toBe(250 - BUDGET_LIMITS.preis.max);
    expect(anschlag.proSpieler.a[0].kontostand).not.toBe(vorgabe.proSpieler.a[0].kontostand);
  });
});

// ── einsaetzeAllerArten (design/kontaktstellen.md Abschnitt 5 Punkt 5) ──

describe("einsaetzeAllerArten", () => {
  it("Modus 'einzel': tip.joker === true wird als joker.einzel-Einsatz erfasst", () => {
    const tipps = [{ userId: "a", matchday: 3, joker: true }];
    const r = einsaetzeAllerArten(tipps, { joker: { modus: "einzel" } });
    expect(r).toEqual([{ spieltag: 3, jokerArt: "joker.einzel", vonUserId: "a", aufUserId: null }]);
  });

  it("Modus 'ranking': tip.gewicht !== 1 wird als joker.ranking-Einsatz erfasst", () => {
    const tipps = [{ userId: "a", matchday: 4, gewicht: 2 }];
    const r = einsaetzeAllerArten(tipps, { joker: { modus: "ranking" } });
    expect(r).toEqual([{ spieltag: 4, jokerArt: "joker.ranking", vonUserId: "a", aufUserId: null }]);
  });

  it("Modus 'ranking': gewicht === 1 (neutral) ist KEIN Einsatz", () => {
    const tipps = [{ userId: "a", matchday: 4, gewicht: 1 }];
    expect(einsaetzeAllerArten(tipps, { joker: { modus: "ranking" } })).toEqual([]);
  });

  it("Modus 'einsatz' erzeugt KEINEN Joker-Einsatz — dort ist gewicht ein Münz-Einsatz", () => {
    const tipps = [{ userId: "a", matchday: 4, gewicht: 5, joker: true }];
    expect(einsaetzeAllerArten(tipps, { joker: { modus: "einsatz" } })).toEqual([]);
  });

  it("Duelle kommen mit, unabhängig vom Joker-Modus — 'klau' wird zu jokerArt 'duell.klau'", () => {
    const tipps = [
      { userId: "a", matchday: 6, kickoff: "2026-01-01T10:00:00Z", tip: { duell: { auf: "b", typ: "klau" } } },
    ];
    const r = einsaetzeAllerArten(tipps, { joker: { modus: "einsatz" } });
    expect(r).toEqual([{ spieltag: 6, jokerArt: "duell.klau", vonUserId: "a", aufUserId: "b" }]);
  });

  it("Duell-Typ 'block' wird auf jokerArt 'duell.block' übersetzt", () => {
    const tipps = [
      { userId: "a", matchday: 6, kickoff: "2026-01-01T10:00:00Z", tip: { duell: { auf: "b", typ: "block" } } },
    ];
    expect(einsaetzeAllerArten(tipps, {})[0].jokerArt).toBe("duell.block");
  });

  it("Ergebnis ist chronologisch nach Spieltag sortiert, Joker- und Duell-Einsätze gemischt", () => {
    const tipps = [
      { userId: "a", matchday: 10, joker: true },
      { userId: "b", matchday: 2, kickoff: "2026-01-01T10:00:00Z", tip: { duell: { auf: "a", typ: "klau" } } },
      { userId: "a", matchday: 5, joker: true },
    ];
    const r = einsaetzeAllerArten(tipps, { joker: { modus: "einzel" } });
    expect(r.map((e) => e.spieltag)).toEqual([2, 5, 10]);
  });
});

// 🔴 Direkte Gutschriften (Glücksrad). Ein Rad-Feld nennt einen FESTEN Betrag;
// ihn durch die `leistung`-Quelle zu schicken wäre falsch, weil die eine
// Anzahl mit `proEreignis` multipliziert — es käme eine andere Zahl heraus als
// auf dem Feld steht.
describe("kontoVerlauf — `zusatz`: feste Gutschriften ohne Takt und Verfall", () => {
  const rules = { joker: { modus: "einzel" }, budget: {
    enabled: true, takt: "spieltag", quellen: [{ typ: "gleich", betrag: 2 }], verfall: "nie",
  } };

  it("die Gutschrift kommt oben drauf, in voller Höhe", () => {
    const ohne = kontoVerlauf({ rules, tipps: [], spieltage: 10, userIds: ["a"] });
    const mit = kontoVerlauf({
      rules, tipps: [], spieltage: 10, userIds: ["a"],
      zusatz: [{ userId: "a", spieltag: 4, betrag: 30 }],
    });
    const st = (v, t) => v.proSpieler.a.find((x) => x.matchday === t).kontostand;
    // Von Hand: 2 je Spieltag, ohne Verfall. An ST10 also 20 — plus 30.
    expect(st(ohne, 10)).toBe(20);
    expect(st(mit, 10)).toBe(50);
  });

  it("sie wirkt erst ab IHREM Spieltag, nicht rückwirkend", () => {
    const v = kontoVerlauf({
      rules, tipps: [], spieltage: 10, userIds: ["a"],
      zusatz: [{ userId: "a", spieltag: 4, betrag: 30 }],
    });
    const st = (t) => v.proSpieler.a.find((x) => x.matchday === t).kontostand;
    expect(st(3)).toBe(6);    // 3 × 2, noch ohne Gutschrift
    expect(st(4)).toBe(38);   // 4 × 2 + 30
  });

  it("ein Spieler, den es nur über die Gutschrift gibt, verschwindet nicht", () => {
    const v = kontoVerlauf({
      rules, tipps: [], spieltage: 5, userIds: ["a"],
      zusatz: [{ userId: "fremd", spieltag: 2, betrag: 10 }],
    });
    expect(v.proSpieler.fremd).toBeTruthy();
    expect(v.proSpieler.fremd.find((x) => x.matchday === 2).kontostand).toBe(10);
  });

  it("Unfug wird ignoriert", () => {
    const v = kontoVerlauf({
      rules, tipps: [], spieltage: 5, userIds: ["a"],
      zusatz: [{ userId: "a", spieltag: "x", betrag: 10 }, { userId: "a", spieltag: 2, betrag: -5 }, null],
    });
    expect(v.proSpieler.a.find((x) => x.matchday === 5).kontostand).toBe(10);
  });
});
