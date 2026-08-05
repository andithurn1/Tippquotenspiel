import { describe, it, expect } from "vitest";
import {
  WER, SICHT, VERFALL, WIDERRUF, SYMMETRIE, UMFANG,
  BASIS_LIMITS, DEFAULT_BASIS,
  sanitizeBasis, sanitizeJokerBasisKarte, basisFuer,
  darfEinsetzen, erfuelltBedingung, darfWiderrufen, pruefeJokerEinsatz,
  beschreibeBasis, konflikte, duellBasis,
} from "./jokerBasis";
import { sanitizeRules } from "./engine";

// ── Kataloge ────────────────────────────────────────────────

describe("Kataloge", () => {
  it("jeder Katalog-Eintrag hat key, label und desc", () => {
    for (const liste of [WER, SICHT, VERFALL, WIDERRUF, SYMMETRIE, UMFANG]) {
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

  // ⚠️ 5.0-Anpassung: `darfEinsetzen` lehnt seit der Invariante „kein Joker
  // ohne Tipp" (design/joker-grundform.md Abschnitt 5.0) OHNE
  // `hatGetippt: true` grundsätzlich ab — unabhängig von `wer`. Diese Tests
  // prüfen die WER-Logik, deshalb wird `hatGetippt: true` hier ausdrücklich
  // mitgegeben, damit die Invariante nicht dazwischenfunkt. Die Invariante
  // selbst hat einen eigenen Test-Block weiter unten (Pflichttest 1).
  it("2a. alle: immer erlaubt", () => {
    const basis = sanitizeBasis({ wer: "alle" });
    expect(darfEinsetzen(basis, "d", { board, hatGetippt: true })).toEqual({ erlaubt: true, grund: null });
  });

  it("2b. abPlatz: nur ab dem eingestellten Tabellenplatz abwärts", () => {
    const basis = sanitizeBasis({ wer: "abPlatz", werWert: 3 }); // Platz 3 oder schlechter
    expect(darfEinsetzen(basis, "a", { board, hatGetippt: true }).erlaubt).toBe(true);  // Platz 3
    expect(darfEinsetzen(basis, "d", { board, hatGetippt: true }).erlaubt).toBe(true);  // Platz 4
    expect(darfEinsetzen(basis, "b", { board, hatGetippt: true }).erlaubt).toBe(false); // Platz 2
    expect(darfEinsetzen(basis, "c", { board, hatGetippt: true }).erlaubt).toBe(false); // Platz 1
  });

  it("2c. abRueckstand: nur wer mindestens werWert Punkte hinter Platz 1 liegt", () => {
    const basis = sanitizeBasis({ wer: "abRueckstand", werWert: 60 });
    expect(darfEinsetzen(basis, "d", { board, hatGetippt: true }).erlaubt).toBe(true);  // 95 Rückstand
    expect(darfEinsetzen(basis, "b", { board, hatGetippt: true }).erlaubt).toBe(false); // 50 Rückstand
    expect(darfEinsetzen(basis, "c", { board, hatGetippt: true }).erlaubt).toBe(false); // 0 Rückstand (führt selbst)
  });

  it("2d. adminFreigabe: ohne Freigabe nicht erlaubt, mit Freigabe erlaubt", () => {
    const basis = sanitizeBasis({ wer: "adminFreigabe" });
    const ohneFreigabe = darfEinsetzen(basis, "a", { board, hatGetippt: true, aktuellerSpieltag: 5, adminFreigaben: [] });
    expect(ohneFreigabe.erlaubt).toBe(false);
    expect(ohneFreigabe.grund).toBeTruthy();

    const mitFreigabe = darfEinsetzen(basis, "a", {
      board, hatGetippt: true, aktuellerSpieltag: 5, adminFreigaben: [{ userId: "a", spieltag: 5 }],
    });
    expect(mitFreigabe.erlaubt).toBe(true);

    // Freigabe für einen ANDEREN Spieltag zählt nicht.
    const falscherTag = darfEinsetzen(basis, "a", {
      board, hatGetippt: true, aktuellerSpieltag: 6, adminFreigaben: [{ userId: "a", spieltag: 5 }],
    });
    expect(falscherTag.erlaubt).toBe(false);
  });
});

// ── Pflichttest 1 (5.0) — der wichtigste Test des ganzen Schritts ──────────

describe("darfEinsetzen — 5.0 Invariante: kein Joker ohne Tipp", () => {
  const basis = sanitizeBasis({ wer: "alle" });

  it("1a. hatGetippt: false -> abgelehnt", () => {
    const r = darfEinsetzen(basis, "a", { hatGetippt: false });
    expect(r.erlaubt).toBe(false);
    expect(r.grund).toBeTruthy();
  });

  it("1b. hatGetippt fehlt komplett -> ebenfalls abgelehnt (gilt als NICHT getippt)", () => {
    const r = darfEinsetzen(basis, "a", {});
    expect(r.erlaubt).toBe(false);
    expect(r.grund).toBeTruthy();
    // Auch ganz ohne Kontext-Objekt.
    expect(darfEinsetzen(basis, "a").erlaubt).toBe(false);
  });

  it("1c. hatGetippt: true -> durchgelassen (bei sonst gültiger Basis)", () => {
    expect(darfEinsetzen(basis, "a", { hatGetippt: true })).toEqual({ erlaubt: true, grund: null });
  });

  it("1d. die Invariante geht der wer-Prüfung vor, gilt also auch bei wer: adminFreigabe", () => {
    const adminBasis = sanitizeBasis({ wer: "adminFreigabe" });
    const ohneTipp = darfEinsetzen(adminBasis, "a", {
      hatGetippt: false, aktuellerSpieltag: 5, adminFreigaben: [{ userId: "a", spieltag: 5 }],
    });
    expect(ohneTipp.erlaubt).toBe(false);
  });
});

// ── K1 (Abnahme 31.07., design/drehrad.md Abschnitt 3b (a)) ────────────────
// `nurVollstaendigGetippt` wandert nach jokerBasis.WER — allgemeine Frage,
// kein Rad-Sonderfall. Nicht zu verwechseln mit der 5.0-Invariante oben: die
// verlangt ÜBERHAUPT einen Tipp, dieser Wert verlangt ALLE Spiele.

describe("darfEinsetzen — K1: wer: nurVollstaendigGetippt", () => {
  const basis = sanitizeBasis({ wer: "nurVollstaendigGetippt" });

  it("K1-1a. alleGetippt: true -> erlaubt", () => {
    const r = darfEinsetzen(basis, "a", { hatGetippt: true, alleGetippt: true });
    expect(r).toEqual({ erlaubt: true, grund: null });
  });

  it("K1-1b. alleGetippt: false -> abgelehnt", () => {
    const r = darfEinsetzen(basis, "a", { hatGetippt: true, alleGetippt: false });
    expect(r.erlaubt).toBe(false);
    expect(r.grund).toBeTruthy();
  });

  it("K1-1c. alleGetippt fehlt komplett -> ebenfalls abgelehnt (gilt als NICHT vollständig getippt)", () => {
    const r = darfEinsetzen(basis, "a", { hatGetippt: true });
    expect(r.erlaubt).toBe(false);
    expect(r.grund).toBeTruthy();
  });

  it("K1-2. die 5.0-Invariante schlägt weiterhin durch: hatGetippt: false wird abgelehnt, egal was alleGetippt sagt", () => {
    const r = darfEinsetzen(basis, "a", { hatGetippt: false, alleGetippt: true });
    expect(r.erlaubt).toBe(false);
    // Es ist der 5.0-Grund, nicht der nurVollstaendigGetippt-Grund — die
    // Invariante prüft VOR der wer-Prüfung.
    expect(r.grund).toMatch(/tipp/i);
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

// ── Erweiterung (design/joker-grundform.md Abschnitt 5) ─────────────────
// Pflichttests 2–8 aus der Aufgabenstellung. Pflichttest 1 (5.0-Invariante)
// steht bereits weiter oben, direkt neben den bestehenden wer-Tests.

describe("sanitizeBasis — 5.1 symmetrie", () => {
  it("2. jeder der drei symmetrie-Werte übersteht sanitizeBasis; Unsinn fällt auf beidseitig", () => {
    expect(sanitizeBasis({ symmetrie: "beidseitig" }).symmetrie).toBe("beidseitig");
    expect(sanitizeBasis({ symmetrie: "nurGewinn" }).symmetrie).toBe("nurGewinn");
    expect(sanitizeBasis({ symmetrie: "nurVerlust" }).symmetrie).toBe("nurVerlust");
    expect(sanitizeBasis({ symmetrie: "quatsch" }).symmetrie).toBe("beidseitig");
    expect(sanitizeBasis({}).symmetrie).toBe("beidseitig");
  });
});

describe("sanitizeBasis — 5.2 bestand", () => {
  it("3. bestand: 0 bedeutet unbegrenzt und wird nicht auf 1 hochgezogen", () => {
    expect(sanitizeBasis({ bestand: 0 }).bestand).toBe(0);
    expect(sanitizeBasis({}).bestand).toBe(0); // Vorgabe
    expect(sanitizeBasis({ bestand: 5 }).bestand).toBe(5);
    // Wird trotzdem auf BASIS_LIMITS.bestand beschnitten.
    expect(sanitizeBasis({ bestand: 9999 }).bestand).toBe(BASIS_LIMITS.bestand.max);
    expect(sanitizeBasis({ bestand: -5 }).bestand).toBe(0);
  });
});

describe("sanitizeBasis — 5.3 kasseSichtbar", () => {
  it("4. kasseSichtbar ist nur bei ausdrücklichem false falsch", () => {
    expect(sanitizeBasis({}).kasseSichtbar).toBe(true);
    expect(sanitizeBasis({ kasseSichtbar: true }).kasseSichtbar).toBe(true);
    expect(sanitizeBasis({ kasseSichtbar: undefined }).kasseSichtbar).toBe(true);
    expect(sanitizeBasis({ kasseSichtbar: null }).kasseSichtbar).toBe(true);
    expect(sanitizeBasis({ kasseSichtbar: "quatsch" }).kasseSichtbar).toBe(true);
    expect(sanitizeBasis({ kasseSichtbar: false }).kasseSichtbar).toBe(false);
  });
});

describe("darfEinsetzen — 5.5 Abklingzeit", () => {
  const basis = sanitizeBasis({ wer: "alle", abklingzeit: 3 });

  it("5. Sperre läuft für abklingzeit Spieltage nach dem letzten Einsatz DERSELBEN Art", () => {
    const letzteEinsaetze = [{ jokerArt: "joker.einzel", spieltag: 10 }];

    // Spieltag 12: 12 - 10 = 2 < 3 -> noch gesperrt.
    const gesperrt = darfEinsetzen(basis, "a", {
      hatGetippt: true, aktuellerSpieltag: 12, letzteEinsaetze,
    }, "joker.einzel");
    expect(gesperrt.erlaubt).toBe(false);
    expect(gesperrt.grund).toBeTruthy();

    // Spieltag 13: 13 - 10 = 3 >= 3 -> erlaubt.
    const erlaubt = darfEinsetzen(basis, "a", {
      hatGetippt: true, aktuellerSpieltag: 13, letzteEinsaetze,
    }, "joker.einzel");
    expect(erlaubt.erlaubt).toBe(true);
  });

  it("5b. ein Einsatz einer ANDEREN Art sperrt nicht mit", () => {
    const letzteEinsaetze = [{ jokerArt: "duell.klau", spieltag: 10 }];
    const r = darfEinsetzen(basis, "a", {
      hatGetippt: true, aktuellerSpieltag: 12, letzteEinsaetze,
    }, "joker.einzel");
    expect(r.erlaubt).toBe(true);
  });

  it("6. ohne vierten Parameter jokerArt wird die Abklingzeit NICHT geprüft (Abwärtskompatibilität)", () => {
    const letzteEinsaetze = [{ jokerArt: "joker.einzel", spieltag: 10 }];
    // Spieltag 12 wäre mit Prüfung gesperrt (siehe Test 5) — ohne jokerArt
    // greift die Prüfung gar nicht erst.
    const r = darfEinsetzen(basis, "a", { hatGetippt: true, aktuellerSpieltag: 12, letzteEinsaetze });
    expect(r.erlaubt).toBe(true);
  });
});

describe("sanitizeBasis — 5.4 umfang/spieleProEinsatz/wahl", () => {
  it("7. überstehen sanitizeBasis und fallen bei Unsinn auf die Vorgabe", () => {
    expect(sanitizeBasis({ umfang: "einSpiel" }).umfang).toBe("einSpiel");
    expect(sanitizeBasis({ umfang: "nSpiele" }).umfang).toBe("nSpiele");
    expect(sanitizeBasis({ umfang: "spieltag" }).umfang).toBe("spieltag");
    expect(sanitizeBasis({ umfang: "quatsch" }).umfang).toBe("einSpiel");
    expect(sanitizeBasis({}).umfang).toBe("einSpiel");

    expect(sanitizeBasis({ spieleProEinsatz: 3 }).spieleProEinsatz).toBe(3);
    expect(sanitizeBasis({ spieleProEinsatz: 9999 }).spieleProEinsatz).toBe(BASIS_LIMITS.spieleProEinsatz.max);
    expect(sanitizeBasis({}).spieleProEinsatz).toBe(1);

    expect(sanitizeBasis({ wahl: "bestes" }).wahl).toBe("bestes");
    expect(sanitizeBasis({ wahl: "selbst" }).wahl).toBe("selbst");
    expect(sanitizeBasis({ wahl: "quatsch" }).wahl).toBe("selbst");
    expect(sanitizeBasis({}).wahl).toBe("selbst");
  });
});

describe("basisFuer — 5. neue Felder aus standard plus Art-Abweichung", () => {
  it("8. merged die neuen Felder korrekt", () => {
    const rules = {
      jokerBasis: {
        standard: { symmetrie: "nurGewinn", bestand: 4, kasseSichtbar: false, abklingzeit: 2, umfang: "nSpiele", spieleProEinsatz: 2, wahl: "bestes" },
        "duell.klau": { symmetrie: "nurVerlust", abklingzeit: 5 },
      },
    };
    // Art ohne eigene Abweichung übernimmt exakt den standard.
    const einzel = basisFuer("joker.einzel", rules);
    expect(einzel.symmetrie).toBe("nurGewinn");
    expect(einzel.bestand).toBe(4);
    expect(einzel.kasseSichtbar).toBe(false);
    expect(einzel.abklingzeit).toBe(2);
    expect(einzel.umfang).toBe("nSpiele");
    expect(einzel.spieleProEinsatz).toBe(2);
    expect(einzel.wahl).toBe("bestes");

    // "duell.klau" überschreibt symmetrie und abklingzeit, der Rest kommt
    // unverändert vom standard.
    const klau = basisFuer("duell.klau", rules);
    expect(klau.symmetrie).toBe("nurVerlust");
    expect(klau.abklingzeit).toBe(5);
    expect(klau.bestand).toBe(4);
    expect(klau.kasseSichtbar).toBe(false);
    expect(klau.umfang).toBe("nSpiele");
    expect(klau.spieleProEinsatz).toBe(2);
    expect(klau.wahl).toBe("bestes");
  });
});

// ── Beschreibung ─────────────────────────────────────────────

// ── Verkabelung: pruefeJokerEinsatz ──────────────────────────
// design/kontaktstellen.md Abschnitt 5 Punkt 1.

describe("pruefeJokerEinsatz", () => {
  // Außenseiter-Siegquote dieses Snapshots: 6.0 (Gast).
  const snap = { winner: { home: 1.5, draw: 3.4, away: 6.0 } };

  it("1. Vorgabe-Regelwerk plus hatGetippt: erlaubt", () => {
    const r = pruefeJokerEinsatz({
      rules: {}, jokerArt: "joker.einzel", userId: "a", snap,
      kontext: { hatGetippt: true },
    });
    expect(r).toEqual({ erlaubt: true, grund: null });
  });

  it("2. hatGetippt fehlt: abgelehnt, Grund nennt 'ohne Tipp'", () => {
    const r = pruefeJokerEinsatz({
      rules: {}, jokerArt: "joker.einzel", userId: "a", snap,
      kontext: {},
    });
    expect(r.erlaubt).toBe(false);
    expect(r.grund).toContain("ohne Tipp");
  });

  it("3. bedingung.minQuote oberhalb der Sieger-Quote des Snapshots: abgelehnt", () => {
    const rules = { jokerBasis: { standard: { bedingung: { minQuote: 10 } } } };
    const r = pruefeJokerEinsatz({
      rules, jokerArt: "joker.einzel", userId: "a", snap,
      kontext: { hatGetippt: true },
    });
    expect(r.erlaubt).toBe(false);
  });

  it("4. beide verletzt (kein Tipp UND Quote zu niedrig): der Grund kommt aus darfEinsetzen", () => {
    const rules = { jokerBasis: { standard: { bedingung: { minQuote: 10 } } } };
    const r = pruefeJokerEinsatz({
      rules, jokerArt: "joker.einzel", userId: "a", snap,
      kontext: {}, // kein Tipp
    });
    expect(r.erlaubt).toBe(false);
    expect(r.grund).toContain("ohne Tipp");
  });

  // 5. Gegenprobe nach design/kontaktstellen.md Abschnitt 5: derselbe Aufruf
  // einmal mit Vorgabe-Regelwerk und einmal mit einer Einstellung auf
  // Anschlag muss ein MESSBAR anderes Ergebnis liefern — sonst wäre die
  // Kontaktstelle weiterhin tot, nur unsichtbarer als vorher.
  it("5. Gegenprobe: Vorgabe-Regelwerk vs. Einstellung auf Anschlag liefert messbar anderes Ergebnis", () => {
    const kontext = { hatGetippt: true };
    const vorgabe = pruefeJokerEinsatz({
      rules: {}, jokerArt: "joker.einzel", userId: "a", snap, kontext,
    });
    const anschlag = pruefeJokerEinsatz({
      rules: { jokerBasis: { standard: { bedingung: { minQuote: BASIS_LIMITS.quote.max } } } },
      jokerArt: "joker.einzel", userId: "a", snap, kontext,
    });
    expect(vorgabe.erlaubt).toBe(true);
    expect(anschlag.erlaubt).toBe(false);
  });
});

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

// 🔴 `design/kontaktstellen.md` führte das als „Offene Entscheidung": sind
// „klau" UND „block" erlaubt und tragen verschiedene Abklingzeiten, nahm
// `duellPlan` einfach die von „klau". Das war eine Reihenfolge, keine Regel.
describe("duellBasis — die LÄNGERE Abklingzeit gewinnt", () => {
  const regeln = (typen, klau, block) => sanitizeRules({
    duell: { enabled: true, typen },
    // Die Karte trägt die Art-Abweichungen DIREKT unter dem Art-Schlüssel
    // (siehe `sanitizeJokerBasisKarte`) — kein `arten`-Zwischenobjekt.
    jokerBasis: {
      standard: { abklingzeit: 0 },
      "duell.klau": { abklingzeit: klau },
      "duell.block": { abklingzeit: block },
    },
  });

  it("bei beiden Arten zählt die strengere Einstellung", () => {
    // Nähme man die kürzere, könnte der Spieler die strengere Art häufiger
    // setzen, als ihre eigene Einstellung erlaubt — sie liefe ins Leere.
    expect(duellBasis(regeln(["klau", "block"], 2, 5)).abklingzeit).toBe(5);
    expect(duellBasis(regeln(["klau", "block"], 6, 3)).abklingzeit).toBe(6);
  });

  it("bei nur einer Art gilt genau deren Wert", () => {
    expect(duellBasis(regeln(["klau"], 2, 5)).abklingzeit).toBe(2);
    expect(duellBasis(regeln(["block"], 2, 5)).abklingzeit).toBe(5);
  });

  it("ohne erlaubte Art bleibt es bei der Klau-Basis", () => {
    // Kein Sonderfall-Absturz: `duellPlan` bekommt weiterhin eine Basis.
    expect(duellBasis(regeln([], 2, 5))).toBeTruthy();
  });
});
