import { describe, it, expect } from "vitest";
import {
  WER, SICHT, VERFALL, WIDERRUF,
  BASIS_LIMITS, DEFAULT_BASIS,
  sanitizeBasis, sanitizeJokerBasisKarte, basisFuer,
  darfEinsetzen, erfuelltBedingung, darfWiderrufen,
  beschreibeBasis, konflikte,
} from "./jokerBasis";

// ── Kataloge ────────────────────────────────────────────────

describe("Kataloge", () => {
  it("jeder Katalog-Eintrag hat key, label und desc", () => {
    for (const liste of [WER, SICHT, VERFALL, WIDERRUF]) {
      for (const e of liste) expect(e.key && e.label && e.desc).toBeTruthy();
      expect(new Set(liste.map((e) => e.key)).size).toBe(liste.length);
    }
  });
});

describe("sanitizeBasis", () => {
  it("ohne Angaben ist die Vorgabe DEFAULT_BASIS", () => {
    expect(sanitizeBasis()).toEqual(DEFAULT_BASIS);
    expect(sanitizeBasis({})).toEqual(DEFAULT_BASIS);
  });

  it("Unsinn fällt auf die Vorgabe zurück", () => {
    const r = sanitizeBasis({ wer: "quatsch", sicht: "quatsch", verfall: "quatsch", widerruf: "quatsch" });
    expect(r.wer).toBe(DEFAULT_BASIS.wer);
    expect(r.sicht).toBe(DEFAULT_BASIS.sicht);
    expect(r.verfall).toBe(DEFAULT_BASIS.verfall);
    expect(r.widerruf).toBe(DEFAULT_BASIS.widerruf);
  });

  it("werWert bleibt null, solange wer keinen Wert braucht", () => {
    expect(sanitizeBasis({ wer: "alle", werWert: 5 }).werWert).toBeNull();
    expect(sanitizeBasis({ wer: "adminFreigabe", werWert: 5 }).werWert).toBeNull();
    expect(sanitizeBasis({ wer: "abPlatz", werWert: 5 }).werWert).toBe(5);
    expect(sanitizeBasis({ wer: "abRueckstand", werWert: 30 }).werWert).toBe(30);
  });

  it("Zahlen werden auf BASIS_LIMITS beschnitten", () => {
    const r = sanitizeBasis({ wer: "abPlatz", werWert: 9999, widerrufStunden: 9999, stapeln: 9999 });
    // `wer: "abPlatz"` (Zeile darüber) -> es gilt der Tabellenplatz-Bereich.
    // Seit K2 gibt es KEIN gemeinsames `werWert`-Limit mehr, sondern zwei
    // Bereiche je `wer` — siehe design/joker-grundform.md Abschnitt 4.
    expect(r.werWert).toBe(BASIS_LIMITS.abPlatz.max);
    expect(r.widerrufStunden).toBe(BASIS_LIMITS.widerrufStunden.max);
    expect(r.stapeln).toBe(BASIS_LIMITS.stapeln.max);
  });
});

// ── Pflichttest 1 ───────────────────────────────────────────

describe("basisFuer", () => {
  it("1. legt standard und Art-Abweichung korrekt übereinander; eine Art ohne Eintrag bekommt exakt standard", () => {
    const rules = {
      jokerBasis: {
        standard: { wer: "alle", sicht: "sofort" },
        "duell.klau": { wer: "abRueckstand", werWert: 15 },
      },
    };
    const standard = basisFuer("joker.einzel", rules); // keine Abweichung hinterlegt
    expect(standard).toEqual(sanitizeBasis({ wer: "alle", sicht: "sofort" }));

    const klau = basisFuer("duell.klau", rules);
    expect(klau.wer).toBe("abRueckstand");
    expect(klau.werWert).toBe(15);
    // nicht überschriebene Felder kommen unverändert vom standard.
    expect(klau.sicht).toBe("sofort");
  });

  it("ganz ohne rules.jokerBasis ist jede Art DEFAULT_BASIS", () => {
    expect(basisFuer("duell.klau", {})).toEqual(DEFAULT_BASIS);
    expect(basisFuer("duell.klau", undefined)).toEqual(DEFAULT_BASIS);
  });

  // ── K2-Regression (Abnahme 31.07., design/joker-grundform.md Abschnitt 4) ──
  // Genau der Fall, der den gemeinsamen Bereich überhaupt nötig schien: `wer`
  // stammt aus dem standard, `werWert` aus einer isolierten Art-Abweichung —
  // beide sind erst NACH dem Merge sicher bekannt, deshalb wird ERST hier
  // beschnitten (nicht schon in der sparsen Abweichung).
  it("K2-Regression: beschneidet werWert je nach effektivem wer — 50 bei abPlatz, 500 bei abRueckstand", () => {
    const rulesPlatz = {
      jokerBasis: {
        standard: { wer: "abPlatz" },
        "duell.klau": { werWert: 9999 },
      },
    };
    expect(basisFuer("duell.klau", rulesPlatz).wer).toBe("abPlatz");
    expect(basisFuer("duell.klau", rulesPlatz).werWert).toBeLessThanOrEqual(50);
    expect(basisFuer("duell.klau", rulesPlatz).werWert).toBe(50);

    const rulesRueckstand = {
      jokerBasis: {
        standard: { wer: "abRueckstand" },
        "duell.klau": { werWert: 9999 },
      },
    };
    expect(basisFuer("duell.klau", rulesRueckstand).wer).toBe("abRueckstand");
    expect(basisFuer("duell.klau", rulesRueckstand).werWert).toBeLessThanOrEqual(500);
    expect(basisFuer("duell.klau", rulesRueckstand).werWert).toBe(500);
  });
});

// ── Pflichttest 2 ───────────────────────────────────────────

describe("darfEinsetzen — alle vier wer-Werte", () => {
  const board = [
    { userId: "c", total: 100 },
    { userId: "b", total: 50 },
    { userId: "a", total: 20 },
    { userId: "d", total: 5 },
  ];

  it("2a. alle: immer erlaubt", () => {
    const basis = sanitizeBasis({ wer: "alle" });
    expect(darfEinsetzen(basis, "d", { board })).toEqual({ erlaubt: true, grund: null });
  });

  it("2b. abPlatz: nur ab dem eingestellten Tabellenplatz abwärts", () => {
    const basis = sanitizeBasis({ wer: "abPlatz", werWert: 3 }); // Platz 3 oder schlechter
    expect(darfEinsetzen(basis, "a", { board }).erlaubt).toBe(true);  // Platz 3
    expect(darfEinsetzen(basis, "d", { board }).erlaubt).toBe(true);  // Platz 4
    expect(darfEinsetzen(basis, "b", { board }).erlaubt).toBe(false); // Platz 2
    expect(darfEinsetzen(basis, "c", { board }).erlaubt).toBe(false); // Platz 1
  });

  it("2c. abRueckstand: nur wer mindestens werWert Punkte hinter Platz 1 liegt", () => {
    const basis = sanitizeBasis({ wer: "abRueckstand", werWert: 60 });
    expect(darfEinsetzen(basis, "d", { board }).erlaubt).toBe(true);  // 95 Rückstand
    expect(darfEinsetzen(basis, "b", { board }).erlaubt).toBe(false); // 50 Rückstand
    expect(darfEinsetzen(basis, "c", { board }).erlaubt).toBe(false); // 0 Rückstand (führt selbst)
  });

  it("2d. adminFreigabe: ohne Freigabe nicht erlaubt, mit Freigabe erlaubt", () => {
    const basis = sanitizeBasis({ wer: "adminFreigabe" });
    const ohneFreigabe = darfEinsetzen(basis, "a", { board, aktuellerSpieltag: 5, adminFreigaben: [] });
    expect(ohneFreigabe.erlaubt).toBe(false);
    expect(ohneFreigabe.grund).toBeTruthy();

    const mitFreigabe = darfEinsetzen(basis, "a", {
      board, aktuellerSpieltag: 5, adminFreigaben: [{ userId: "a", spieltag: 5 }],
    });
    expect(mitFreigabe.erlaubt).toBe(true);

    // Freigabe für einen ANDEREN Spieltag zählt nicht.
    const falscherTag = darfEinsetzen(basis, "a", {
      board, aktuellerSpieltag: 6, adminFreigaben: [{ userId: "a", spieltag: 5 }],
    });
    expect(falscherTag.erlaubt).toBe(false);
  });
});

// ── Pflichttest 3 — der wichtigste Test ─────────────────────

describe("erfuelltBedingung — minQuote misst die Spiel-Quote, nicht die getippte", () => {
  it("3. ein Snapshot, bei dem Spiel-Quote und (fiktive) getippte Quote auseinanderfallen, beweist: die Spiel-Quote zählt", () => {
    // Das Spiel ist hochgradig einseitig: Heim ist krasser Favorit (1.2),
    // Gast der krasse Außenseiter (9.0) — die Außenseiter-Siegquote DES
    // SPIELS ist 9.0. Ein Tipp auf den Favoriten hätte nur eine Quote von
    // 1.2 — würde die Funktion (fälschlich) diese Quote der „gewählten
    // Seite" statt der SPIEL-Quote lesen, läge sie unter minQuote und die
    // Bedingung wäre NICHT erfüllt. Die Funktion nimmt aber gar keinen Tipp
    // entgegen — sie kann sich gar nicht vertippen.
    const basis = sanitizeBasis({ bedingung: { minQuote: 5 } });
    const snap = { winner: { home: 1.2, draw: 4.0, away: 9.0 } };
    const r = erfuelltBedingung(basis, snap);
    expect(r.erlaubt).toBe(true);

    // Umgekehrte Anordnung (Heim ist der Außenseiter): dieselbe Prüfung
    // funktioniert unabhängig davon, auf welcher Seite der Außenseiter steht.
    const snap2 = { winner: { home: 9.0, draw: 4.0, away: 1.2 } };
    expect(erfuelltBedingung(basis, snap2).erlaubt).toBe(true);

    // Ein ausgeglichenes Spiel (beide Seiten nahe 2.0) erfüllt minQuote
    // dagegen NICHT — die Außenseiter-Quote liegt unter 5.
    const ausgeglichen = { winner: { home: 1.9, draw: 3.6, away: 2.0 } };
    expect(erfuelltBedingung(basis, ausgeglichen).erlaubt).toBe(false);
  });
});

// ── Pflichttest 4 ───────────────────────────────────────────

describe("erfuelltBedingung — maxQuote", () => {
  it("4. schließt Favoritenspiele aus (zu hohe Außenseiter-Quote)", () => {
    const basis = sanitizeBasis({ bedingung: { maxQuote: 5 } });
    const lopsided = { winner: { home: 1.05, draw: 8.0, away: 15.0 } }; // Außenseiter-Quote 15
    expect(erfuelltBedingung(basis, lopsided).erlaubt).toBe(false);

    const ausgeglichen = { winner: { home: 1.9, draw: 3.6, away: 2.0 } }; // Außenseiter-Quote 2.0
    expect(erfuelltBedingung(basis, ausgeglichen).erlaubt).toBe(true);
  });
});

// ── Pflichttest 5 ───────────────────────────────────────────

describe("erfuelltBedingung — wettbewerbe/phasen", () => {
  const snap = { winner: { home: 2.0, draw: 3.4, away: 3.6 } };

  it("5a. wettbewerbe filtert, leere Liste heißt alle", () => {
    const basis = sanitizeBasis({ bedingung: { wettbewerbe: ["BL"] } });
    expect(erfuelltBedingung(basis, snap, "BL", null).erlaubt).toBe(true);
    expect(erfuelltBedingung(basis, snap, "CL", null).erlaubt).toBe(false);

    const ohneFilter = sanitizeBasis({});
    expect(erfuelltBedingung(ohneFilter, snap, "CL", null).erlaubt).toBe(true);
  });

  it("5b. phasen filtert, leere Liste heißt alle", () => {
    const basis = sanitizeBasis({ bedingung: { phasen: ["rueckrunde"] } });
    expect(erfuelltBedingung(basis, snap, null, "rueckrunde").erlaubt).toBe(true);
    expect(erfuelltBedingung(basis, snap, null, "hinrunde").erlaubt).toBe(false);

    const ohneFilter = sanitizeBasis({});
    expect(erfuelltBedingung(ohneFilter, snap, null, "hinrunde").erlaubt).toBe(true);
  });
});

// ── Pflichttest 6 ───────────────────────────────────────────

describe("darfWiderrufen — alle drei Werte, inklusive Kante", () => {
  const STD = 3600_000;
  const anpfiff = 1_000_000_000; // beliebiger fester Zeitstempel

  it("6a. bisAnpfiff: erlaubt bis, nicht mehr ab Anpfiff", () => {
    const basis = sanitizeBasis({ widerruf: "bisAnpfiff" });
    expect(darfWiderrufen(basis, anpfiff - 1, anpfiff)).toBe(true);
    expect(darfWiderrufen(basis, anpfiff, anpfiff)).toBe(false);
    expect(darfWiderrufen(basis, anpfiff + 1, anpfiff)).toBe(false);
  });

  it("6b. sofortVerbindlich: nie widerrufbar, auch weit vor Anpfiff nicht", () => {
    const basis = sanitizeBasis({ widerruf: "sofortVerbindlich" });
    expect(darfWiderrufen(basis, anpfiff - 100 * STD, anpfiff)).toBe(false);
  });

  it("6c. bisStunden: genau auf der Kante ist noch erlaubt, danach nicht mehr — und nie nach Anpfiff", () => {
    const basis = sanitizeBasis({ widerruf: "bisStunden", widerrufStunden: 24 });
    const kante = anpfiff - 24 * STD;
    expect(darfWiderrufen(basis, kante, anpfiff)).toBe(true);
    expect(darfWiderrufen(basis, kante + 1, anpfiff)).toBe(false);
    expect(darfWiderrufen(basis, kante - 1, anpfiff)).toBe(true);

    // Selbst bei widerrufStunden: 0 reicht es NIE über den Anpfiff hinaus.
    const basisNull = sanitizeBasis({ widerruf: "bisStunden", widerrufStunden: 0 });
    expect(darfWiderrufen(basisNull, anpfiff, anpfiff)).toBe(false);
    expect(darfWiderrufen(basisNull, anpfiff - 1, anpfiff)).toBe(true);
  });
});

// ── Pflichttest 7 ───────────────────────────────────────────

describe("sanitizeJokerBasisKarte", () => {
  it("7. wirft unbekannte Schlüssel raus und lässt standard plus gültige Arten durch", () => {
    const karte = sanitizeJokerBasisKarte({
      standard: { wer: "abPlatz", werWert: 5 },
      "duell.klau": { wer: "abRueckstand", werWert: 20 },
      "nicht.existent": { wer: "alle" },
    });
    expect(karte.standard.wer).toBe("abPlatz");
    expect(karte.standard.werWert).toBe(5);
    expect(karte["duell.klau"]).toEqual({ wer: "abRueckstand", werWert: 20 });
    // "nicht.existent" enthält einen Punkt — toHaveProperty müsste ihn sonst
    // als Pfad lesen (karte.nicht.existent), deshalb die Array-Form für den
    // LITERALEN Schlüssel.
    expect(karte).not.toHaveProperty(["nicht.existent"]);
  });

  it("ohne Eingabe bleibt nur standard, in voller Form", () => {
    expect(sanitizeJokerBasisKarte()).toEqual({ standard: DEFAULT_BASIS });
    expect(sanitizeJokerBasisKarte({})).toEqual({ standard: DEFAULT_BASIS });
  });

  it("eine leere/nutzlose Abweichung erzeugt keinen Eintrag", () => {
    const karte = sanitizeJokerBasisKarte({ "duell.klau": { unsinn: 1 } });
    expect(karte).not.toHaveProperty(["duell.klau"]);
  });
});

// ── Pflichttest 8 ───────────────────────────────────────────

describe("konflikte", () => {
  it("8a. meldet die doppelte Absicherung: wer: abRueckstand UND eine Limitierungsklasse auf Rückstand", () => {
    const rules = {
      jokerBasis: { "duell.klau": { wer: "abRueckstand", werWert: 10 } },
      limitKlassen: [
        { id: "k1", label: "Rückstands-Klasse", mitglieder: ["duell.klau"], max: 3, aktivierung: { typ: "abRueckstand", wert: 10 } },
      ],
    };
    const k = konflikte(rules);
    expect(k.some((m) => m.key.startsWith("basis-doppelt-rueckstand"))).toBe(true);
  });

  it("8b. meldet sofortVerbindlich zusammen mit sicht: sofort", () => {
    const rules = { jokerBasis: { standard: { sicht: "sofort", widerruf: "sofortVerbindlich" } } };
    const k = konflikte(rules);
    expect(k.some((m) => m.key.startsWith("basis-sofort-verbindlich"))).toBe(true);
  });

  it("ohne Überschneidung keine Meldung", () => {
    const rules = { jokerBasis: { standard: { wer: "alle", sicht: "nachAnpfiff", widerruf: "bisAnpfiff" } } };
    expect(konflikte(rules)).toEqual([]);
  });

  // ── K1-Regression (Abnahme 31.07., design/joker-grundform.md Abschnitt 4) ──
  // Gemessen: EIN Verstoß im `standard` erzeugte sechs Meldungen, eine je
  // Joker-Art. Jetzt: genau EINE Meldung mit `bereich: "standard"`.
  it("K1-Regression: EIN Verstoß im standard erzeugt GENAU EINE Meldung mit bereich: 'standard'", () => {
    const rules = {
      jokerBasis: { standard: { wer: "alle", sicht: "sofort", widerruf: "sofortVerbindlich" } },
    };
    const k = konflikte(rules);
    expect(k).toHaveLength(1);
    expect(k[0].bereich).toBe("standard");
    expect(k[0].key.startsWith("basis-sofort-verbindlich")).toBe(true);
  });

  it("K1: eine Art-Abweichung erzeugt eine Meldung mit bereich: 'duell.klau', nicht 'standard'", () => {
    // standard bleibt bei den Vorgaben (kein Verstoß dort) — nur "duell.klau"
    // weicht ab und erzeugt für sich den Verstoß.
    const rules = {
      jokerBasis: { "duell.klau": { sicht: "sofort", widerruf: "sofortVerbindlich" } },
    };
    const k = konflikte(rules);
    expect(k).toHaveLength(1);
    expect(k[0].bereich).toBe("duell.klau");
    expect(k[0].key).toBe("basis-sofort-verbindlich-duell.klau");
  });
});

// ── Beschreibung ─────────────────────────────────────────────

describe("beschreibeBasis", () => {
  it("nennt wer, Sicht, Verfall, Widerruf und Stapel-Grenze", () => {
    const basis = sanitizeBasis({ wer: "abPlatz", werWert: 3, sicht: "sofort", verfall: "wandert", widerruf: "bisStunden", widerrufStunden: 12, stapeln: 2 });
    const t = beschreibeBasis(basis);
    expect(t).toContain("Tabellenplatz");
    expect(t).toContain("Sofort");
    expect(t).toContain("Wandert");
    expect(t).toContain("12");
    expect(t).toContain("2");
  });
});
