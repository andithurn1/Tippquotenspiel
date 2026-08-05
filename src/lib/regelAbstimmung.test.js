import { describe, it, expect } from "vitest";
import {
  WAEHLER, MEHRHEITEN, ANTRAGSRECHT, WIRKUNG_AB, STIMM_SICHT,
  ABSTIMMUNG_LIMITS, DEFAULT_VERFASSUNG, DEFAULT_REGEL_ABSTIMMUNG,
  MITBESTIMMUNG_ASPEKT,
  sanitizeVerfassung, sanitizeRegelAbstimmung, effektiveGrenzen,
  aspektAenderbar, darfStimmen, darfBeantragen, zaehleAus, wirktAb,
  verstoesstGegenVerfassung, konflikte, beschreibeMitbestimmung,
} from "./regelAbstimmung";
import { RULE_LIMITS } from "./engine";
import { ASPEKT_KEYS } from "./presetMerge";

// Eine eingeschaltete Abstimmung als Ausgangspunkt — die Vorgabe ist aus, und
// fast jede Prüfung hier setzt sie voraus.
const anRules = (extra = {}, verfassung = undefined) => ({
  regelAbstimmung: { enabled: true, ...extra },
  ...(verfassung ? { verfassung } : {}),
});

const mitglieder = (n, extra = {}) =>
  Array.from({ length: n }, (_, i) => ({ userId: `u${i}`, ...extra }));

const stimmen = (ja, nein) => [
  ...Array.from({ length: ja }, (_, i) => ({ userId: `u${i}`, ja: true })),
  ...Array.from({ length: nein }, (_, i) => ({ userId: `u${ja + i}`, ja: false })),
];

describe("sanitizeVerfassung / sanitizeRegelAbstimmung", () => {
  it("leeres Objekt liefert die Vorgaben", () => {
    expect(sanitizeVerfassung({})).toEqual(DEFAULT_VERFASSUNG);
    expect(sanitizeRegelAbstimmung({})).toEqual(DEFAULT_REGEL_ABSTIMMUNG);
  });

  it("unbekannte Katalogwerte fallen auf die Vorgabe zurück", () => {
    const a = sanitizeRegelAbstimmung({
      wer: "quatsch", mehrheit: "quatsch", antragsrecht: "quatsch",
      wirkungAb: "quatsch", sichtbarkeit: "quatsch",
    });
    expect(a.wer).toBe(DEFAULT_REGEL_ABSTIMMUNG.wer);
    expect(a.mehrheit).toBe(DEFAULT_REGEL_ABSTIMMUNG.mehrheit);
    expect(a.antragsrecht).toBe(DEFAULT_REGEL_ABSTIMMUNG.antragsrecht);
    expect(a.wirkungAb).toBe(DEFAULT_REGEL_ABSTIMMUNG.wirkungAb);
    expect(a.sichtbarkeit).toBe(DEFAULT_REGEL_ABSTIMMUNG.sichtbarkeit);
  });

  it("Zahlen werden geklemmt und ganzzahlige gerundet", () => {
    const a = sanitizeRegelAbstimmung({ quorum: 5, dauer: 99, sperrfrist: -3, wirkungVorlauf: 2.6 });
    expect(a.quorum).toBe(ABSTIMMUNG_LIMITS.quorum.max);
    expect(a.dauer).toBe(ABSTIMMUNG_LIMITS.dauer.max);
    expect(a.sperrfrist).toBe(ABSTIMMUNG_LIMITS.sperrfrist.min);
    expect(a.wirkungVorlauf).toBe(3);
  });

  it("Aspekt-Listen werden entdoppelt, Unfug fliegt raus", () => {
    const v = sanitizeVerfassung({ aenderbar: ["naehe", "naehe", 7, "", null, "kombi"] });
    expect(v.aenderbar).toEqual(["naehe", "kombi"]);
  });

  it("ein verdreht eingegebenes Band wird getauscht, nicht verworfen", () => {
    const v = sanitizeVerfassung({ grenzen: { modCap: { min: 3, max: 1.5 } } });
    expect(v.grenzen.modCap).toEqual({ min: 1.5, max: 3 });
  });

  it("ein Band ohne verwertbare Zahlen wird verworfen", () => {
    const v = sanitizeVerfassung({ grenzen: { modCap: { min: "viel", max: 3 }, k: null } });
    expect(v.grenzen).toEqual({});
  });
});

describe("effektiveGrenzen — die Verfassung kann nur VERENGEN", () => {
  it("ein weiteres Band wird auf die harte Grenze beschnitten", () => {
    // Von Hand: RULE_LIMITS.modCap ist { min: 1, max: 4 }. Ein Verfassungsband
    // von 0 bis 99 darf davon nichts aufmachen.
    expect(RULE_LIMITS.modCap.min).toBe(1);
    expect(RULE_LIMITS.modCap.max).toBe(4);
    const v = sanitizeVerfassung({ grenzen: { modCap: { min: 0, max: 99 } } });
    expect(effektiveGrenzen("modCap", v, RULE_LIMITS)).toEqual({ min: 1, max: 4 });
  });

  it("ein engeres Band gilt", () => {
    const v = sanitizeVerfassung({ grenzen: { modCap: { min: 1.5, max: 2 } } });
    expect(effektiveGrenzen("modCap", v, RULE_LIMITS)).toEqual({ min: 1.5, max: 2 });
  });

  it("nur eine Seite verengt — die andere bleibt hart", () => {
    const v = sanitizeVerfassung({ grenzen: { modCap: { min: 0, max: 2 } } });
    expect(effektiveGrenzen("modCap", v, RULE_LIMITS)).toEqual({ min: 1, max: 2 });
  });

  it("verschachtelte Pfade werden gefunden", () => {
    const v = sanitizeVerfassung({ grenzen: { "joker.faktor": { min: 1.2, max: 1.4 } } });
    expect(effektiveGrenzen("joker.faktor", v, RULE_LIMITS)).toEqual({ min: 1.2, max: 1.4 });
  });

  it("ohne harte Grenze wird nichts geraten", () => {
    const v = sanitizeVerfassung({ grenzen: { "gibts.nicht": { min: 0, max: 1 } } });
    expect(effektiveGrenzen("gibts.nicht", v, RULE_LIMITS)).toBeNull();
    expect(effektiveGrenzen("modCap", v, null)).toBeNull();
  });
});

describe("aspektAenderbar", () => {
  it("ohne Verfassung ist alles änderbar", () => {
    expect(aspektAenderbar("naehe", { enabled: false }).erlaubt).toBe(true);
  });

  it("leere Freigabeliste erlaubt alles außer dem Festgeschriebenen", () => {
    const v = { enabled: true, gesperrt: ["naehe"] };
    expect(aspektAenderbar("kombi", v).erlaubt).toBe(true);
    expect(aspektAenderbar("naehe", v).erlaubt).toBe(false);
  });

  it("eine gesetzte Freigabeliste wirkt als Positivliste", () => {
    const v = { enabled: true, aenderbar: ["kombi"] };
    expect(aspektAenderbar("kombi", v).erlaubt).toBe(true);
    expect(aspektAenderbar("naehe", v).erlaubt).toBe(false);
  });

  it("festgeschrieben schlägt freigegeben", () => {
    const v = { enabled: true, aenderbar: ["naehe"], gesperrt: ["naehe"] };
    expect(aspektAenderbar("naehe", v).erlaubt).toBe(false);
  });

  it("die Mitbestimmung selbst ist IMMER gesperrt — auch wenn jemand sie freigibt", () => {
    const v = { enabled: true, aenderbar: [MITBESTIMMUNG_ASPEKT] };
    expect(aspektAenderbar(MITBESTIMMUNG_ASPEKT, v).erlaubt).toBe(false);
    // Und auch ganz ohne Verfassung.
    expect(aspektAenderbar(MITBESTIMMUNG_ASPEKT, { enabled: false }).erlaubt).toBe(false);
  });

  it("jede Ablehnung nennt einen Grund", () => {
    const v = { enabled: true, gesperrt: ["naehe"] };
    expect(aspektAenderbar("naehe", v).grund.length).toBeGreaterThan(10);
  });
});

describe("darfStimmen", () => {
  it("ohne eingeschaltete Abstimmung darf niemand", () => {
    expect(darfStimmen("u1", { regelAbstimmung: { enabled: false } }).erlaubt).toBe(false);
  });

  it("„alle“ lässt auch Inaktive mitstimmen", () => {
    expect(darfStimmen("u1", anRules({ wer: "alle" }), { aktiv: false }).erlaubt).toBe(true);
  });

  it("„nur wer mitspielt“ schließt Inaktive aus", () => {
    const r = anRules({ wer: "nurAktive" });
    expect(darfStimmen("u1", r, { aktiv: false }).erlaubt).toBe(false);
    expect(darfStimmen("u1", r, { aktiv: true }).erlaubt).toBe(true);
  });

  it("„Alle, Admin mit Veto“ schließt niemanden aus", () => {
    const r = anRules({ wer: "adminPlusAlle" });
    expect(darfStimmen("u1", r, { istAdmin: false }).erlaubt).toBe(true);
    expect(darfStimmen("u1", r, { istAdmin: true }).erlaubt).toBe(true);
  });
});

describe("darfBeantragen", () => {
  it("ohne eingeschaltete Abstimmung nicht", () => {
    expect(darfBeantragen("naehe", { regelAbstimmung: { enabled: false } }, "u1").erlaubt).toBe(false);
  });

  it("ohne Bereich nicht", () => {
    expect(darfBeantragen("", anRules(), "u1").erlaubt).toBe(false);
  });

  it("ein festgeschriebener Bereich nicht — mit dem Grund aus der Verfassung", () => {
    const r = anRules({}, { enabled: true, gesperrt: ["naehe"] });
    const p = darfBeantragen("naehe", r, "u1");
    expect(p.erlaubt).toBe(false);
    expect(p.grund).toBe(aspektAenderbar("naehe", r.verfassung).grund);
  });

  it("„nur der Admin“ hält andere ab", () => {
    const r = anRules({ antragsrecht: "nurAdmin" });
    expect(darfBeantragen("naehe", r, "u1", { istAdmin: false }).erlaubt).toBe(false);
    expect(darfBeantragen("naehe", r, "u1", { istAdmin: true }).erlaubt).toBe(true);
  });

  it("„nur wer mitspielt“ hält Inaktive ab", () => {
    const r = anRules({ antragsrecht: "nurAktive" });
    expect(darfBeantragen("naehe", r, "u1", { aktiv: false }).erlaubt).toBe(false);
  });

  it("die Sperrfrist greift und nennt die verbleibenden Spieltage", () => {
    const r = anRules({ sperrfrist: 4 });
    const kontext = { aktuellerSpieltag: 8, letzteEntscheidungen: [{ aspekt: "naehe", entschiedenAm: 6 }] };
    const p = darfBeantragen("naehe", r, "u1", kontext);
    expect(p.erlaubt).toBe(false);
    // Von Hand: frei ab 6 + 4 = 10, aktuell 8 -> noch 2 Spieltage.
    expect(p.grund).toContain("2 Spieltage");
    // Ein anderer Bereich ist davon unberührt.
    expect(darfBeantragen("kombi", r, "u1", kontext).erlaubt).toBe(true);
    // Und nach Ablauf geht es wieder.
    expect(darfBeantragen("naehe", r, "u1", { ...kontext, aktuellerSpieltag: 10 }).erlaubt).toBe(true);
  });

  it("ohne bekannten Spieltag wird die Sperrfrist NICHT geraten", () => {
    const r = anRules({ sperrfrist: 4 });
    const p = darfBeantragen("naehe", r, "u1", {
      letzteEntscheidungen: [{ aspekt: "naehe", entschiedenAm: 6 }],
    });
    expect(p.erlaubt).toBe(true);
  });
});

describe("zaehleAus", () => {
  const abst = (extra = {}) => sanitizeRegelAbstimmung({ enabled: true, quorum: 0, ...extra });

  it("einfache Mehrheit: mehr Ja als Nein genügt", () => {
    const r = zaehleAus({ stimmen: stimmen(3, 2) }, mitglieder(6), abst());
    expect(r.ja).toBe(3);
    expect(r.nein).toBe(2);
    expect(r.angenommen).toBe(true);
    expect(r.grund).toBeNull();
  });

  it("Gleichstand ist keine Mehrheit", () => {
    const r = zaehleAus({ stimmen: stimmen(2, 2) }, mitglieder(6), abst());
    expect(r.angenommen).toBe(false);
    expect(r.grund).toContain("2 dafür");
  });

  it("Zweidrittel: knapp darüber und knapp darunter", () => {
    // Von Hand: 4 von 6 sind genau zwei Drittel -> reicht. 3 von 5 nicht.
    const drueber = zaehleAus({ stimmen: stimmen(4, 2) }, mitglieder(6), abst({ mehrheit: "zweidrittel" }));
    expect(drueber.angenommen).toBe(true);
    const drunter = zaehleAus({ stimmen: stimmen(3, 2) }, mitglieder(6), abst({ mehrheit: "zweidrittel" }));
    expect(drunter.angenommen).toBe(false);
    expect(drunter.grund).toContain("Zwei Drittel");
  });

  it("einstimmig scheitert an einer einzigen Gegenstimme", () => {
    const a = abst({ mehrheit: "einstimmig" });
    expect(zaehleAus({ stimmen: stimmen(5, 0) }, mitglieder(6), a).angenommen).toBe(true);
    const eine = zaehleAus({ stimmen: stimmen(5, 1) }, mitglieder(6), a);
    expect(eine.angenommen).toBe(false);
    expect(eine.grund).toContain("Gegenstimme");
  });

  it("gar keine Stimme ist nie einstimmig", () => {
    const r = zaehleAus({ stimmen: [] }, mitglieder(6), abst({ mehrheit: "einstimmig" }));
    expect(r.angenommen).toBe(false);
  });

  it("ein verfehltes Quorum kippt auch eine klare Mehrheit", () => {
    const r = zaehleAus({ stimmen: stimmen(3, 0) }, mitglieder(12), abst({ quorum: 0.5 }));
    // Von Hand: 3 von 12 = 25 % Beteiligung, gefordert 50 %.
    expect(r.beteiligung).toBeCloseTo(0.25, 10);
    expect(r.quorumErreicht).toBe(false);
    expect(r.angenommen).toBe(false);
    expect(r.grund).toContain("3 von 12");
  });

  it("ein genau erreichtes Quorum scheitert nicht am Gleitkomma", () => {
    // 1 von 3 = 0.3333333333333333, gefordert genau ein Drittel. Ohne
    // Toleranz wäre das „verfehlt", obwohl es exakt aufgeht.
    const r = zaehleAus({ stimmen: stimmen(1, 0) }, mitglieder(3), abst({ quorum: 1 / 3 }));
    expect(r.quorumErreicht).toBe(true);
    expect(r.angenommen).toBe(true);
  });

  it("dieselbe Person zählt nur einmal — die letzte Stimme gilt", () => {
    const r = zaehleAus(
      { stimmen: [{ userId: "u0", ja: true }, { userId: "u0", ja: false }] },
      mitglieder(4), abst(),
    );
    expect(r.abgegeben).toBe(1);
    expect(r.ja).toBe(0);
    expect(r.nein).toBe(1);
  });

  it("eine Fremdstimme zählt nicht mit", () => {
    const r = zaehleAus({ stimmen: [{ userId: "fremd", ja: true }] }, mitglieder(4), abst());
    expect(r.abgegeben).toBe(0);
    expect(r.berechtigte).toBe(4);
  });

  it("Inaktive zählen bei „nur wer mitspielt“ weder als Stimme noch als Berechtigte", () => {
    const leute = [...mitglieder(2, { aktiv: true }), { userId: "schlaefer", aktiv: false }];
    const r = zaehleAus(
      { stimmen: [{ userId: "u0", ja: true }, { userId: "schlaefer", ja: false }] },
      leute, abst({ wer: "nurAktive", quorum: 0.5 }),
    );
    expect(r.berechtigte).toBe(2);
    expect(r.abgegeben).toBe(1);
    expect(r.nein).toBe(0);
    expect(r.angenommen).toBe(true);
  });

  it("das Veto greift nur, wenn es erlaubt ist", () => {
    const antrag = { stimmen: stimmen(5, 0), veto: true };
    expect(zaehleAus(antrag, mitglieder(6), abst({ vetoAdmin: false })).angenommen).toBe(true);
    const mitVeto = zaehleAus(antrag, mitglieder(6), abst({ vetoAdmin: true }));
    expect(mitVeto.angenommen).toBe(false);
    expect(mitVeto.grund).toContain("Veto");
  });

  it("ohne Mitglieder gibt es keine Division durch null", () => {
    const r = zaehleAus({ stimmen: [] }, [], abst({ quorum: 0.5 }));
    expect(r.beteiligung).toBe(0);
    expect(r.angenommen).toBe(false);
  });
});

describe("wirktAb", () => {
  const a = (extra = {}) => sanitizeRegelAbstimmung({ enabled: true, dauer: 3, ...extra });

  it("Vorgabe: der erste Spieltag nach dem Ende der Abstimmung", () => {
    // Von Hand: gestellt an 5, Dauer 3 -> Ende 8 -> wirkt ab 9.
    expect(wirktAb({ gestelltAm: 5 }, a()).rundenSpieltag).toBe(9);
  });

  it("mit Vorlauf entsprechend später", () => {
    // Ende 8 + Vorlauf 2 -> 10.
    expect(wirktAb({ gestelltAm: 5 }, a({ wirkungAb: "vorlauf", wirkungVorlauf: 2 })).rundenSpieltag).toBe(10);
  });

  // 🔴 Die harte Kante aus Abschnitt 1 der Spec. Ohne die Anhebung käme hier
  // Spieltag 9 heraus, obwohl 14 schon geöffnet ist — ein bereits abgegebener
  // Tipp würde nachträglich anders bewertet.
  it("ein bereits geöffneter Spieltag wird nie betroffen", () => {
    const r = wirktAb({ gestelltAm: 5 }, a(), { zuletztGeoeffnet: 14 });
    expect(r.rundenSpieltag).toBe(15);
    expect(r.rundenSpieltag).toBeGreaterThan(14);
  });

  // 🔴 Die Frist gehört eingefroren: ändert der Admin die Dauer, während eine
  // Abstimmung läuft, darf sich deren Ende nicht mitten im Verfahren
  // verschieben. Dieselbe Kante wie beim Quoten-Snapshot.
  it("eine eingefrorene Frist schlägt die aktuelle Dauer", () => {
    // gestellt an 5, gespeicherte Frist bis 8 — die Runde stellt danach auf
    // Dauer 10 um. Ohne das Einfrieren käme 16 heraus statt 9.
    const antrag = { gestelltAm: 5, laeuftBis: 8 };
    expect(wirktAb(antrag, a({ dauer: 10 })).rundenSpieltag).toBe(9);
    // Ohne gespeicherte Frist gilt die aktuelle Dauer.
    expect(wirktAb({ gestelltAm: 5 }, a({ dauer: 10 })).rundenSpieltag).toBe(16);
  });

  it("jenseits des Saisonendes gibt es kein Ergebnis, sondern einen Satz", () => {
    const r = wirktAb({ gestelltAm: 33 }, a(), { spieltage: 34 });
    expect(r.rundenSpieltag).toBeNull();
    expect(r.grund).toContain("Saison");
  });

  it("ohne Zeitpunkt des Antrags wird nichts geraten", () => {
    const r = wirktAb({}, a());
    expect(r.rundenSpieltag).toBeNull();
    expect(r.grund.length).toBeGreaterThan(10);
  });
});

describe("verstoesstGegenVerfassung", () => {
  const v = sanitizeVerfassung({ enabled: true, grenzen: { modCap: { min: 1, max: 2 } } });

  it("ein gesperrter Bereich wird als Ganzes gemeldet", () => {
    const gesperrt = sanitizeVerfassung({ enabled: true, gesperrt: ["naehe"] });
    const funde = verstoesstGegenVerfassung({ k: 1.3 }, gesperrt, "naehe", RULE_LIMITS);
    expect(funde).toHaveLength(1);
    expect(funde[0].feld).toBeNull();
    expect(funde[0].grund.length).toBeGreaterThan(10);
  });

  it("ein Wert außerhalb des verengten Bands wird MIT Feldnamen gemeldet", () => {
    const funde = verstoesstGegenVerfassung({ modCap: 3 }, v, "modifikatoren", RULE_LIMITS);
    expect(funde).toHaveLength(1);
    expect(funde[0].feld).toBe("modCap");
    expect(funde[0].wert).toBe(3);
    expect(funde[0].erlaubt).toEqual({ min: 1, max: 2 });
  });

  // 🔴 Aus einer eigenen Messung, nicht aus einem grünen Test: ein zu weit
  // gefasstes Verfassungs-Band wird auf die harte Grenze beschnitten. Dann
  // kommt die Schranke NICHT von der Verfassung — und wer dort danach sucht,
  // sucht vergebens. Der Satz muss die richtige Quelle nennen.
  it("nennt die richtige Quelle der Grenze", () => {
    const weit = sanitizeVerfassung({ enabled: true, grenzen: { "joker.faktor": { min: 0, max: 10 } } });
    const vomRegelwerk = verstoesstGegenVerfassung({ joker: { faktor: 5 } }, weit, "modifikatoren", RULE_LIMITS);
    expect(vomRegelwerk).toHaveLength(1);
    expect(vomRegelwerk[0].erlaubt).toEqual({ min: RULE_LIMITS.joker.faktor.min, max: RULE_LIMITS.joker.faktor.max });
    expect(vomRegelwerk[0].grund).toContain("Das Regelwerk");
    expect(vomRegelwerk[0].grund).not.toContain("Verfassung");

    const eng = sanitizeVerfassung({ enabled: true, grenzen: { "joker.faktor": { min: 1, max: 1.3 } } });
    const vonVerfassung = verstoesstGegenVerfassung({ joker: { faktor: 1.8 } }, eng, "modifikatoren", RULE_LIMITS);
    expect(vonVerfassung[0].grund).toContain("Verfassung");
  });

  it("ein Wert innerhalb des Bands wird nicht gemeldet", () => {
    expect(verstoesstGegenVerfassung({ modCap: 1.8 }, v, "modifikatoren", RULE_LIMITS)).toEqual([]);
  });

  it("ein Feld ohne Verfassungs-Band wird hier nicht geprüft", () => {
    // `k` liegt weit außerhalb seiner harten Grenze — das prüft sanitizeRules,
    // nicht diese Funktion (sonst zwei Stellen mit derselben Prüfung).
    expect(verstoesstGegenVerfassung({ k: 99 }, v, "naehe", RULE_LIMITS)).toEqual([]);
  });

  it("verschachtelte Pfade werden gefunden", () => {
    const vj = sanitizeVerfassung({ enabled: true, grenzen: { "joker.faktor": { min: 1, max: 1.3 } } });
    const funde = verstoesstGegenVerfassung({ joker: { faktor: 1.8 } }, vj, "modifikatoren", RULE_LIMITS);
    expect(funde).toHaveLength(1);
    expect(funde[0].feld).toBe("joker.faktor");
  });
});

describe("beschreibeMitbestimmung — die Live-Vorschau", () => {
  it("sagt bei ausgeschalteter Abstimmung, dass die Regeln feststehen", () => {
    const t = beschreibeMitbestimmung({ regelAbstimmung: { enabled: false } });
    expect(t).toContain("nicht abgestimmt");
  });

  it("rechnet das Quorum in Köpfe um, wenn die Mitgliederzahl bekannt ist", () => {
    const rules = anRules({ quorum: 0.5 });
    // Von Hand: 0,5 von 11 sind 5,5 — abstimmen müssen also 6, nicht 5.
    // Abrunden hieße, ein Quorum durchgehen zu lassen, das nicht erfüllt ist.
    expect(beschreibeMitbestimmung(rules, { mitglieder: 11 })).toContain("6 von 11");
    // Ohne Mitgliederzahl wird nichts geraten, dann bleibt es bei Prozent.
    expect(beschreibeMitbestimmung(rules)).toContain("50 %");
  });

  it("nennt, wie viele Bereiche die Verfassung freigibt", () => {
    const rules = anRules({}, { enabled: true, gesperrt: ["naehe", "kombi"] });
    const t = beschreibeMitbestimmung(rules, { aspektKeys: ASPEKT_KEYS });
    // Ohne die Mitbestimmung selbst, minus die zwei gesperrten.
    const waehlbar = ASPEKT_KEYS.filter((k) => k !== "mitbestimmung").length;
    expect(t).toContain(`${waehlbar - 2} von ${waehlbar}`);
  });

  it("verschweigt das Veto nicht", () => {
    expect(beschreibeMitbestimmung(anRules({ vetoAdmin: true }))).toContain("kippen");
    expect(beschreibeMitbestimmung(anRules({ vetoAdmin: false }))).not.toContain("kippen");
  });
});

describe("konflikte", () => {
  it("ohne eingeschaltete Abstimmung wird nichts gemeldet", () => {
    expect(konflikte({ regelAbstimmung: { enabled: false, sperrfrist: 0 } }, ASPEKT_KEYS)).toEqual([]);
  });

  it("„einstimmig“ ohne volles Quorum wird gemeldet", () => {
    const f = konflikte(anRules({ mehrheit: "einstimmig", quorum: 0.5 }), ASPEKT_KEYS);
    expect(f.some((x) => x.key === "einstimmig-ohne-quorum")).toBe(true);
    const ok = konflikte(anRules({ mehrheit: "einstimmig", quorum: 1 }), ASPEKT_KEYS);
    expect(ok.some((x) => x.key === "einstimmig-ohne-quorum")).toBe(false);
  });

  it("ein Bereich in beiden Listen wird gemeldet", () => {
    const f = konflikte(anRules({}, { enabled: true, aenderbar: ["naehe"], gesperrt: ["naehe"] }), ASPEKT_KEYS);
    expect(f.some((x) => x.key === "aspekt-doppelt-gelistet")).toBe(true);
  });

  it("eine Verfassung, die alles festschreibt, lässt nichts zu beschließen", () => {
    const f = konflikte(anRules({}, { enabled: true, gesperrt: ASPEKT_KEYS }), ASPEKT_KEYS);
    expect(f.some((x) => x.key === "nichts-abstimmbar")).toBe(true);
  });

  it("Vorschlagsrecht und Veto in einer Hand wird gemeldet", () => {
    const f = konflikte(anRules({ antragsrecht: "nurAdmin", vetoAdmin: true }), ASPEKT_KEYS);
    expect(f.some((x) => x.key === "admin-schlaegt-vor-und-kippt")).toBe(true);
  });

  it("fehlende Sperrfrist wird gemeldet", () => {
    const f = konflikte(anRules({ sperrfrist: 0 }), ASPEKT_KEYS);
    expect(f.some((x) => x.key === "keine-sperrfrist")).toBe(true);
  });

  it("ein sauberes Regelwerk meldet nichts", () => {
    expect(konflikte(anRules(), ASPEKT_KEYS)).toEqual([]);
  });
});

// ⚠️ Dieselbe Wächter-Idee wie `uiTexte.test.js`: Kataloge und Gründe werden
// UNGEPRÜFT angezeigt, und genau dort rutschen Bezeichner und Dateinamen
// durch. Hier zusätzlich die `grund`-Sätze, die kein Katalog sind.
describe("Sichtbare Texte", () => {
  const katalogTexte = [WAEHLER, MEHRHEITEN, ANTRAGSRECHT, WIRKUNG_AB, STIMM_SICHT]
    .flatMap((k) => k.flatMap((e) => [e.label, e.desc]));

  const gruende = [
    aspektAenderbar(MITBESTIMMUNG_ASPEKT, {}).grund,
    aspektAenderbar("naehe", { enabled: true, gesperrt: ["naehe"] }).grund,
    aspektAenderbar("naehe", { enabled: true, aenderbar: ["kombi"] }).grund,
    darfStimmen("u1", { regelAbstimmung: { enabled: false } }).grund,
    darfStimmen("u1", anRules({ wer: "nurAktive" }), { aktiv: false }).grund,
    darfBeantragen("naehe", anRules({ antragsrecht: "nurAdmin" }), "u1").grund,
    darfBeantragen("naehe", anRules({ sperrfrist: 4 }), "u1", {
      aktuellerSpieltag: 8, letzteEntscheidungen: [{ aspekt: "naehe", entschiedenAm: 6 }],
    }).grund,
    zaehleAus({ stimmen: stimmen(1, 0) }, mitglieder(12), sanitizeRegelAbstimmung({ enabled: true, quorum: 0.5 })).grund,
    zaehleAus({ stimmen: stimmen(2, 2) }, mitglieder(4), sanitizeRegelAbstimmung({ enabled: true, quorum: 0 })).grund,
    wirktAb({ gestelltAm: 33 }, sanitizeRegelAbstimmung({ enabled: true })).grund,
    wirktAb({}, sanitizeRegelAbstimmung({ enabled: true })).grund,
    ...konflikte(anRules({ mehrheit: "einstimmig", quorum: 0.5, antragsrecht: "nurAdmin", vetoAdmin: true, sperrfrist: 0 }),
      ASPEKT_KEYS).map((k) => k.text),
    ...verstoesstGegenVerfassung({ modCap: 3 },
      sanitizeVerfassung({ enabled: true, grenzen: { modCap: { min: 1, max: 2 } } }),
      "modifikatoren", RULE_LIMITS).map((f) => f.grund),
  ];

  const alle = [...katalogTexte, ...gruende];

  it("es gibt überhaupt welche zu prüfen", () => {
    expect(alle.length).toBeGreaterThan(25);
    for (const t of alle) expect(typeof t).toBe("string");
  });

  it("enthalten keine Dateinamen", () => {
    for (const t of alle) expect(t, t).not.toMatch(/\.(js|jsx|mjs|sql)\b/);
  });

  it("enthalten keine camelCase-Bezeichner", () => {
    for (const t of alle) expect(t, t).not.toMatch(/\b[a-zäöüß]+[A-ZÄÖÜ][a-zA-ZäöüßÄÖÜ]*\b/);
  });

  it("sagen nie „Budget“ — die Oberfläche kennt Narren und Münzen", () => {
    for (const t of alle) expect(t, t).not.toMatch(/Budget/i);
  });

  it("sind nicht leer und nicht abgeschnitten", () => {
    for (const t of alle) {
      expect(t.trim()).not.toBe("");
      expect(t.trim().endsWith("…")).toBe(false);
    }
  });
});
