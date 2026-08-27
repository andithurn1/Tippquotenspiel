import { describe, it, expect } from "vitest";
import { drehradZiehungen, withDrehradPunkte, drehradBelohnungen } from "./drehradBoard";
import { auswerten, DEFAULT_DREHRAD, DREHRAD_LIMITS } from "./drehrad";
import { sanitizeRules, DEFAULT_RULES } from "./engine";
import { kontingent } from "./jokerKontingent";

// Die eine Stelle, an der Drehrad-Punkte aufs Leaderboard kommen — für BEIDE
// Stores. Geprüft wird hier NUR, dass die Einstellungen greifen (Vorbild
// saisonBoard.test.js), keine Balance.
//
// Aufbau der Testräder: `frequenz: 1` + `modus: "kontingent"` + `phase:
// "ganze"` macht `drehradPlan` von der Seed-Zufälligkeit UNABHÄNGIG dafür, AN
// WELCHEN Spieltagen gezogen wird — bei einem Kontingent von genau
// `spieltage` Drehungen ist jeder Block genau einen Spieltag breit, und ein
// ein Spieltag breiter Block hat für JEDEN Zufallswert dieselbe „Mitte"
// (`von + floor(r*1)` ist immer `von`). Dadurch zieht in diesen Tests jeder
// Spieler an JEDEM Spieltag von 1 bis `spieltage` — ohne dass ein Testfall auf
// einen geratenen `seeded()`-Wert angewiesen wäre. Zufällig bleibt nur noch,
// WELCHES Feld pro Ziehung fällt (`ziehe`) — und genau das wird geprüft.

// Ein Rad mit GENAU einem Feld über Gewicht 0 (ein „Niete"-Feld mit Gewicht 0
// liegt nur formal mit auf dem Rad): jede Ziehung fällt dadurch zu 100% auf
// das Punkte-Feld — deterministisch, ohne dass der Test den `seeded()`-Wert
// kennen müsste.
const radEinzel = ({ betrag, maxPunkteProSaison = 0 }) => ({
  enabled: true,
  felder: [
    { id: "p", label: "Punkte", gewicht: 5, belohnung: { typ: "punkte", betrag } },
    { id: "n", label: "Niete", gewicht: 0, belohnung: { typ: "nichts" } },
  ],
  sperrfrist: 0,
  frequenz: 1,
  modus: "kontingent",
  phase: "ganze",
  schlussLaenge: 4,
  abSpieltag: null,
  bisSpieltag: null,
  wer: "alle",
  werWert: null,
  maxPunkteProSaison,
});

// Ein Rad mit ZWEI gleich schweren Feldern (50/50) — hier ist tatsächlich
// Zufall im Spiel, gebraucht für die Determinismus-/Verschiedenheits-Tests.
const radZwei = {
  enabled: true,
  felder: [
    { id: "p", label: "Punkte", gewicht: 5, belohnung: { typ: "punkte", betrag: 10 } },
    { id: "n", label: "Niete", gewicht: 5, belohnung: { typ: "nichts" } },
  ],
  sperrfrist: 0,
  frequenz: 1,
  modus: "kontingent",
  phase: "ganze",
  schlussLaenge: 4,
  abSpieltag: null,
  bisSpieltag: null,
  wer: "alle",
  werWert: null,
  maxPunkteProSaison: 0,
};

const BOARD = [
  { userId: "u-a", name: "Anna", total: 100, tips: 2, gewertet: 2, rank: 1 },
  { userId: "u-b", name: "Bert", total: 40, tips: 1, gewertet: 1, rank: 2 },
];

describe("withDrehradPunkte", () => {
  it("lässt das Board unverändert (dieselbe Referenz), wenn das Rad aus ist", () => {
    const aus = { drehrad: { enabled: false } };
    expect(withDrehradPunkte({ board: BOARD, rules: aus, rundenId: "r1" })).toBe(BOARD);
  });

  it("drehradZiehungen ist deterministisch: zweimal aufgerufen dasselbe Ergebnis", () => {
    const rules = { drehrad: radZwei };
    const args = { rules, rundenId: "runde-det", userIds: ["u1", "u2"], spieltage: 6 };
    const erste = drehradZiehungen(args);
    const zweite = drehradZiehungen(args);
    expect(zweite).toEqual(erste);
  });

  it("eine andere rundenId liefert andere Ziehungen", () => {
    const rules = { drehrad: radZwei };
    const a = drehradZiehungen({ rules, rundenId: "runde-a", userIds: ["u1", "u2"], spieltage: 10 });
    const b = drehradZiehungen({ rules, rundenId: "runde-b", userIds: ["u1", "u2"], spieltage: 10 });
    expect(b).not.toEqual(a);
  });

  it("ein Punkte-Feld erhöht den total des Spielers; drehrad steht als eigenes Feld daran", () => {
    const rules = { drehrad: radEinzel({ betrag: 10 }) }; // maxPunkteProSaison: 0 = kein Deckel
    const board = [{ userId: "u-a", name: "Anna", total: 50, tips: 1, gewertet: 1, rank: 1 }];
    const result = withDrehradPunkte({ board, rules, rundenId: "r-vier", spieltage: 3 });
    // 3 Spieltage, jede Ziehung 100% Punkte-Feld zu 10 → 30 zusätzliche Punkte.
    expect(result[0].drehrad).toBe(30);
    expect(result[0].total).toBe(80);
  });

  it("maxPunkteProSaison deckelt tatsächlich: mit niedrigem Deckel bekommt derselbe Spieler messbar weniger als ohne Deckel", () => {
    const board = [{ userId: "u-a", name: "Anna", total: 0, tips: 1, gewertet: 1, rank: 1 }];
    const ohneDeckel = withDrehradPunkte({
      board, rundenId: "r-deckel", spieltage: 6,
      rules: { drehrad: radEinzel({ betrag: 10, maxPunkteProSaison: 0 }) },
    });
    const mitDeckel = withDrehradPunkte({
      board, rundenId: "r-deckel", spieltage: 6,
      rules: { drehrad: radEinzel({ betrag: 10, maxPunkteProSaison: 15 }) },
    });
    expect(ohneDeckel[0].drehrad).toBe(60); // 6 × 10, ungedeckelt
    expect(mitDeckel[0].drehrad).toBe(15);
    expect(mitDeckel[0].drehrad).toBeLessThan(ohneDeckel[0].drehrad);
  });

  it("maxPunkteProSaison: 0 heißt KEIN Deckel, nicht „keine Punkte“", () => {
    const board = [{ userId: "u-a", name: "Anna", total: 0, tips: 1, gewertet: 1, rank: 1 }];
    const result = withDrehradPunkte({
      board, rundenId: "r-null", spieltage: 4,
      rules: { drehrad: radEinzel({ betrag: 5, maxPunkteProSaison: 0 }) },
    });
    expect(result[0].drehrad).toBe(20); // 4 × 5 — voll ausgezahlt, nicht 0
  });

  it("vergibt die Rangfolge neu, wenn die Rad-Punkte jemanden überholen lassen", () => {
    const rundenId = "runde-overtake";
    const spieltage = 6;
    const userIds = ["u-a", "u-b"];
    const rules = { drehrad: radZwei };

    // Die tatsächlichen (deterministischen) Rad-Punkte vorab ermitteln — mit
    // DENSELBEN Funktionen, die withDrehradPunkte unten auch aufruft. So
    // beruht der Test auf dem echten Ergebnis, nicht auf einer geratenen Zahl.
    const ziehungen = drehradZiehungen({ rules, rundenId, userIds, spieltage });
    const { gutschriften } = auswerten(rules.drehrad, ziehungen);
    const summe = (id) => gutschriften
      .filter((g) => g.userId === id && g.belohnung.typ === "punkte")
      .reduce((s, g) => s + g.belohnung.betrag, 0);
    const earnedA = summe("u-a");
    const earnedB = summe("u-b");
    expect(earnedA).not.toBe(earnedB); // Voraussetzung, sonst kann niemand überholen

    const [hinten, vorne] = earnedA > earnedB ? ["u-a", "u-b"] : ["u-b", "u-a"];
    const earnedHinten = earnedA > earnedB ? earnedA : earnedB;
    const earnedVorne = earnedA > earnedB ? earnedB : earnedA;
    const diff = earnedHinten - earnedVorne; // > 0

    // "vorne" führt VOR der Ziehung um genau `diff - 1`; "hinten" gewinnt am
    // Rad `diff` mehr Punkte als "vorne" — reicht exakt zum Überholen um 1.
    const board = [
      { userId: vorne, name: vorne, total: 100, tips: 1, gewertet: 1, rank: 1 },
      { userId: hinten, name: hinten, total: 100 - diff + 1, tips: 1, gewertet: 1, rank: 2 },
    ];
    const result = withDrehradPunkte({ board, rules, rundenId, spieltage });
    const ergHinten = result.find((e) => e.userId === hinten);
    expect(ergHinten.rank).toBe(1);
  });

  it("Gegenprobe (kontaktstellen.md Abschnitt 5): eine Einstellung auf Anschlag liefert ein messbar anderes Ergebnis als die Vorgabe", () => {
    const board = [{ userId: "u-a", name: "Anna", total: 0, tips: 1, gewertet: 1, rank: 1 }];
    const vorgabe = withDrehradPunkte({
      board, rundenId: "r-anschlag", spieltage: 6,
      rules: { drehrad: radEinzel({ betrag: 15, maxPunkteProSaison: DEFAULT_DREHRAD.maxPunkteProSaison }) },
    });
    const anschlag = withDrehradPunkte({
      board, rundenId: "r-anschlag", spieltage: 6,
      rules: { drehrad: radEinzel({ betrag: 15, maxPunkteProSaison: DREHRAD_LIMITS.maxPunkteProSaison.max }) },
    });
    expect(vorgabe[0].drehrad).toBe(DEFAULT_DREHRAD.maxPunkteProSaison); // 20, gedeckelt
    expect(anschlag[0].drehrad).toBe(90); // 6 × 15, am Anschlag nicht gedeckelt
    expect(anschlag[0].drehrad).not.toBe(vorgabe[0].drehrad);
  });

  // ── Nachtrag (2026-08-04): `kontext` macht `wer`/`werWert` und die
  // 5.0-Invariante scharf ──

  it("ohne kontext bleibt das Verhalten unverändert (Regressionsschutz)", () => {
    const rules = { drehrad: radZwei };
    const args = { rules, rundenId: "runde-regress", userIds: ["u1", "u2"], spieltage: 6 };
    const ohneKontext = drehradZiehungen(args);

    // Ein `kontext`, der niemanden einschränkt (`wer: "alle"`, jeder hat an
    // jedem Spieltag getippt) MUSS zum selben Ergebnis führen wie GAR KEIN
    // `kontext` — genau das ist die Garantie aus dem Nachtrag: ohne `kontext`
    // ändert sich nichts am bestehenden Verhalten.
    const alleTage = Array.from({ length: 6 }, (_, i) => i + 1);
    const tipps = args.userIds.flatMap((userId) =>
      alleTage.map((matchday) => ({ userId, matchday, matchId: `m-${matchday}` })));
    const mitOffenemKontext = drehradZiehungen({
      ...args,
      kontext: { board: [], tipps, adminFreigaben: [], letzteEinsaetze: [] },
    });

    expect(mitOffenemKontext).toEqual(ohneKontext);
  });

  it("wer: „abPlatz“ mit werWert schließt die vorderen Plätze messbar aus", () => {
    // `wer`/`werWert` kommen vom Rad selbst (`rules.drehrad.wer`), nicht aus
    // `rules.jokerBasis` — siehe Kopfkommentar `drehradBasis()` in
    // drehradBoard.js.
    const rad = { ...radZwei, wer: "abPlatz", werWert: 2 }; // nur ab Platz 2 abwärts
    const rules = { drehrad: rad };
    const spieltage = 4;
    const userIds = ["u-lead", "u-mid", "u-low"];
    const board = [
      { userId: "u-lead", total: 100 },
      { userId: "u-mid", total: 60 },
      { userId: "u-low", total: 10 },
    ];
    // Alle drei tippen an jedem Spieltag — die 5.0-Invariante soll hier nicht
    // mit hineinspielen, es geht nur um `wer`.
    const tipps = userIds.flatMap((userId) =>
      Array.from({ length: spieltage }, (_, i) => ({ userId, matchday: i + 1, matchId: `m-${i + 1}` })));
    const kontext = { board, tipps, adminFreigaben: [], letzteEinsaetze: [] };

    const ziehungen = drehradZiehungen({ rules, rundenId: "runde-abplatz", userIds, spieltage, kontext });
    const zaehlung = (id) => ziehungen.filter((z) => z.userId === id).length;

    expect(zaehlung("u-lead")).toBe(0); // Platz 1 — ausgeschlossen ab Platz 2
    expect(zaehlung("u-mid")).toBe(spieltage);
    expect(zaehlung("u-low")).toBe(spieltage);
  });

  it("die 5.0-Invariante greift: wer einen Spieltag nicht getippt hat, dreht dort nicht", () => {
    const rules = { drehrad: radZwei }; // wer: "alle" — hier geht es nur um hatGetippt
    const spieltage = 4;
    const userIds = ["u-a"];
    const board = [{ userId: "u-a", total: 0 }];
    // Spieltag 2 bewusst ausgelassen — an dem Tag wurde nicht getippt.
    const tipps = [1, 3, 4].map((matchday) => ({ userId: "u-a", matchday, matchId: `m-${matchday}` }));
    const kontext = { board, tipps, adminFreigaben: [], letzteEinsaetze: [] };

    const ziehungen = drehradZiehungen({ rules, rundenId: "runde-hatgetippt", userIds, spieltage, kontext });
    const spieltageGezogen = ziehungen.map((z) => z.spieltag).sort((a, b) => a - b);

    expect(spieltageGezogen).toEqual([1, 3, 4]); // Spieltag 2 fehlt — nicht getippt, nicht gezogen
  });
});

// 🔴 `design/kontaktstellen.md` führte als offene Teil-Wirkung: Rad-Felder mit
// Joker-, Narren- oder Modifikator-Belohnung werden gezogen, wirken sich aber
// nicht aus. Nach dem Baukasten-Grundsatz ist das nicht erlaubt — „eine
// Einstellung, die ins Leere läuft, ist kein Baukastenteil".
describe("drehradBelohnungen — was das Rad AUSSER Punkten auszahlt", () => {
  const radRules = (felder) => sanitizeRules({
    ...DEFAULT_RULES,
    joker: { enabled: true, modus: "einzel", faktor: 1.5 },
    drehrad: { enabled: true, frequenz: 5, phase: "ganze", felder },
  });

  it("Joker kommen in DERSELBEN Gutschrift-Form wie erspielte Ereignisse", () => {
    const rules = radRules([
      { id: "f1", label: "Nichts", gewicht: 1, belohnung: { typ: "nichts" } },
      { id: "f2", label: "Ein Joker", gewicht: 9, belohnung: { typ: "joker", art: "joker.einzel", anzahl: 1 } },
    ]);
    const b = drehradBelohnungen({ rules, rundenId: "r1", userIds: ["u1"], spieltage: 42 });
    expect(b.joker.length).toBeGreaterThan(0);
    for (const g of b.joker) {
      // Genau die Form, die `kontingent` erwartet — kein zweiter Topf.
      expect(g).toHaveProperty("userId");
      expect(g).toHaveProperty("matchday");
      expect(g.belohnung).toBeGreaterThan(0);
    }
    // Und sie landen wirklich im Vorrat.
    const k = kontingent({
      plan: { modus: "frei" }, gutschriften: b.joker, tipps: [], userId: "u1", bisSpieltag: 42,
    });
    expect(k.erspielt.gesamt).toBe(b.joker.reduce((s, g) => s + g.belohnung, 0));
  });

  it("Narren kommen als fester Betrag, nicht als Ereignis-Anzahl", () => {
    const rules = radRules([
      { id: "f1", label: "Nichts", gewicht: 1, belohnung: { typ: "nichts" } },
      { id: "f2", label: "30 Narren", gewicht: 9, belohnung: { typ: "budget", betrag: 30 } },
    ]);
    const b = drehradBelohnungen({ rules, rundenId: "r1", userIds: ["u1"], spieltage: 42 });
    expect(b.narren.length).toBeGreaterThan(0);
    // Der Betrag steht so auf dem Feld — er wird NICHT durch eine Rate
    // geschickt (siehe Kopfkommentar von `kontoVerlauf`s `zusatz`).
    for (const g of b.narren) expect(g.betrag).toBe(30);
  });

  it("Modifikatoren werden gemeldet, nicht still verschluckt", () => {
    const rules = radRules([
      { id: "f1", label: "Nichts", gewicht: 1, belohnung: { typ: "nichts" } },
      { id: "f2", label: "Doppelt", gewicht: 9, belohnung: { typ: "modifikator", faktor: 1.5, spieltage: 1 } },
    ]);
    const b = drehradBelohnungen({ rules, rundenId: "r1", userIds: ["u1"], spieltage: 42 });
    // Noch nicht verrechnet (das ist der Wertungs-Pfad), aber ausgewiesen —
    // wer sie baut, findet sie hier.
    expect(b.modifikatoren.length).toBeGreaterThan(0);
    expect(b.modifikatoren[0].faktor).toBe(1.5);
  });

  it("ohne Rad kommt nichts", () => {
    const aus = sanitizeRules({ ...DEFAULT_RULES, drehrad: { enabled: false } });
    expect(drehradBelohnungen({ rules: aus, rundenId: "r1", userIds: ["u1"] }))
      .toEqual({ joker: [], narren: [], modifikatoren: [], ruecksetzungen: [] });
  });

  // 🔴 Der Grund, warum ein AUFRUFER ohne `kontext` ein Anzeige-Fehler ist.
  // `Tippabgabe.jsx` hat die Rad-Belohnungen bis 05.08.2026 ohne Kontext und
  // mit der festen 34 gerechnet und dem Spieler damit Joker und Narren
  // angezeigt, die das Leaderboard nie vergeben hat. Gemessen an einem
  // Spieler, der genau EINEN Runden-Spieltag getippt hatte: 270 Narren auf
  // dem Bildschirm gegen 30 in der Wertung.
  //
  // Ohne Kontext bleibt das Verhalten bewusst unverändert (kein stiller
  // Regelwechsel für Aufrufer, die keinen liefern können) — dieser Test hält
  // deshalb den UNTERSCHIED fest, nicht ein Verbot.
  it("ohne kontext zahlt das Rad an JEDEM geplanten Spieltag, mit kontext nur an getippten", () => {
    const rules = radRules([
      { id: "f1", label: "30 Narren", gewicht: 1, belohnung: { typ: "budget", betrag: 30 } },
    ]);
    const basis = { rules, rundenId: "r1", userIds: ["u1"], spieltage: 42 };
    const ohne = drehradBelohnungen(basis);
    const mit = drehradBelohnungen({
      ...basis,
      kontext: {
        board: [{ userId: "u1", total: 0, rank: 1 }],
        // Getippt wurde genau ein Spieltag.
        tipps: [{ userId: "u1", matchId: "m1", matchday: 5 }],
        adminFreigaben: [], letzteEinsaetze: [],
      },
    });
    const summe = (x) => x.narren.reduce((s, g) => s + g.betrag, 0);
    expect(summe(ohne)).toBeGreaterThan(summe(mit));
    // Und zwar genau die Spieltage, an denen wirklich getippt wurde.
    expect(mit.narren.every((g) => g.spieltag === 5)).toBe(true);
  });
});

// 🔴 `design/kontaktstellen.md`, vierte Teil-Wirkung: `letzteEinsaetze` fürs
// Rad war immer leer, ein `abklingzeit`-Wert am `jokerBasis.standard` blieb
// dadurch wirkungslos — obwohl er für echte Joker längst greift. Die eigene
// Dreh-Historie IST diese Historie; sie muss nicht von außen kommen.
describe("Abklingzeit des Rads — die eigene Historie zählt", () => {
  const FELDER = [
    { id: "f1", label: "A", gewicht: 1, belohnung: { typ: "nichts" } },
    { id: "f2", label: "B", gewicht: 1, belohnung: { typ: "punkte", betrag: 10 } },
  ];
  // `frequenz: 1` + `kontingent` heißt: ohne Bremse an JEDEM Spieltag eine
  // Drehung. Was dann noch fehlt, kann nur die Abklingzeit sein.
  const regeln = (abklingzeit) => sanitizeRules({
    ...DEFAULT_RULES,
    drehrad: { enabled: true, frequenz: 1, modus: "kontingent", phase: "ganze", felder: FELDER },
    jokerBasis: { standard: { abklingzeit } },
  });
  // Getippt wird überall, damit „kein Rad ohne Tipp" nicht mitbremst.
  const KONTEXT = {
    board: [{ userId: "u1", total: 0, rank: 1 }],
    tipps: Array.from({ length: 12 }, (_, i) => ({ userId: "u1", matchId: `m${i}`, matchday: i + 1 })),
    adminFreigaben: [], letzteEinsaetze: [],
  };
  const tage = (abklingzeit) => drehradZiehungen({
    rules: regeln(abklingzeit), rundenId: "r1", userIds: ["u1"], spieltage: 12, kontext: KONTEXT,
  }).map((z) => z.spieltag);

  it("ohne Abklingzeit dreht es an jedem Spieltag", () => {
    expect(tage(0)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it("mit Abklingzeit 2 nur noch an jedem zweiten — von Hand nachgezählt", () => {
    expect(tage(2)).toEqual([1, 3, 5, 7, 9, 11]);
  });

  it("mit Abklingzeit 4 an jedem vierten", () => {
    expect(tage(4)).toEqual([1, 5, 9]);
  });

  it("ohne Kontext bleibt alles wie bisher — kein stiller Regelwechsel", () => {
    // Die Abklingzeit hängt an `darfEinsetzen`, und das läuft nur MIT Kontext.
    const ohne = drehradZiehungen({
      rules: regeln(4), rundenId: "r1", userIds: ["u1"], spieltage: 12,
    });
    expect(ohne).toHaveLength(12);
  });
});
