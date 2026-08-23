import { describe, it, expect } from "vitest";
import {
  ARTEN, SORTIERUNGEN, eintraege, verbreitung, bewerteAlle, kennzahlen,
  suche, sortiere, beschreibeTreffer, STANDARD_KENNZAHLEN,
} from "@/lib/bibliothek";
import { DEFAULT_RULES } from "@/lib/engine";
import { CHARAKTERE } from "@/lib/charaktere";
import { PRESETS } from "@/lib/presets";
import { TEILBIBLIOTHEKEN } from "@/lib/teilbibliothek";

const LISTE = eintraege();
const BEWERTUNGEN = bewerteAlle(LISTE);

describe("Die Bibliothek sammelt ein", () => {
  it("führt Charaktere, Presets und Bausteine in EINER Liste", () => {
    const bausteine = TEILBIBLIOTHEKEN.reduce((s, b) => s + b.eintraege.length, 0);
    expect(LISTE.length).toBe(CHARAKTERE.length + PRESETS.length + bausteine);
    for (const art of ARTEN) {
      expect(LISTE.some((e) => e.art === art.key), `keine Einträge der Art ${art.key}`).toBe(true);
    }
  });

  it("gibt jedem Eintrag eine eindeutige id", () => {
    const ids = LISTE.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("nimmt geladene Codes mit anderem Urheber auf", () => {
    const mit = eintraege([{ id: "abc", label: "Von Marc", rules: DEFAULT_RULES }]);
    expect(mit.length).toBe(LISTE.length + 1);
    const neu = mit.find((e) => e.label === "Von Marc");
    expect(neu.urheber).toBe("geladen");
    // 🔴 Über einen fremden Code wissen wir nichts — er darf keine Verbreitung
    // behaupten, nur weil seine Werte zufällig der Vorgabe gleichen.
    expect(verbreitung(neu)).toBe(null);
  });
});

describe("Die Verbreitung ist gerechnet, nicht erfunden", () => {
  it("zählt echte Treffer unter den Runden-Ideen", () => {
    // Die Wertung des Standard-Presets steckt in mehreren Charakteren.
    const standard = LISTE.find((e) => e.id === "preset:standard");
    const v = verbreitung(standard);
    expect(v.gesamt).toBe(CHARAKTERE.length);
    expect(v.von).toBeGreaterThan(0);
  });

  it("sagt bei einer Runden-Idee gar nichts", () => {
    // Eine Idee ist die oberste Ebene — „in 2 von 5 Ideen enthalten" wäre für
    // sie sinnlos, und eine erfundene Zahl schlimmer als keine.
    for (const e of LISTE.filter((x) => x.art === "charakter")) {
      expect(verbreitung(e)).toBe(null);
    }
  });

  it("bleibt innerhalb der Grenzen", () => {
    for (const e of LISTE) {
      const v = verbreitung(e);
      if (!v) continue;
      expect(v.von).toBeGreaterThanOrEqual(0);
      expect(v.von).toBeLessThanOrEqual(v.gesamt);
    }
  });
});

describe("Die Bewertung misst wirklich etwas", () => {
  // 🔴 Der Pflichttest dieser Datei. Die erste Fassung maß nur die
  // Underdog-Neigung — 64 von 69 Einträgen bekamen dasselbe Icon, weil
  // `underdogLean` ein Verhältnis ist und `k`/`m` beide Seiten gleich
  // skalieren. Ein Merkmal, das fast alle gleich beschreibt, ist Deko.
  it("unterscheidet Mild von Streng", () => {
    const mild = BEWERTUNGEN.get("baustein:naehe:mild");
    const streng = BEWERTUNGEN.get("baustein:naehe:streng");
    expect(mild.wirkungen.map((w) => w.achse)).toContain("schaerfe");
    expect(streng.wirkungen.map((w) => w.achse)).toContain("schaerfe");
    // Und zwar in entgegengesetzte Richtung.
    expect(mild.kennzahlen.schaerfe).toBeLessThan(streng.kennzahlen.schaerfe);
    expect(mild.wirkungen.find((w) => w.achse === "schaerfe").icon)
      .not.toBe(streng.wirkungen.find((w) => w.achse === "schaerfe").icon);
  });

  // 🔴 Der zweite gemessene Befund: die vier Kombi-Einträge waren auf allen
  // Wertungs-Achsen identisch, weil die Spielart-Vorschau OHNE Torschützen
  // tippt — und genau darauf wirken sie. Deshalb die vierte Achse.
  it("sieht die Kombi-Einträge, die nur auf Torschützen wirken", () => {
    const flach = BEWERTUNGEN.get("baustein:kombi:flach");
    const exakt = BEWERTUNGEN.get("baustein:kombi:exaktEntscheidet");
    expect(flach.kennzahlen.schuetzen).toBeLessThan(exakt.kennzahlen.schuetzen);
    expect(flach.wirkungen.map((w) => w.achse)).toContain("schuetzen");
    expect(exakt.wirkungen.map((w) => w.achse)).toContain("schuetzen");
  });

  it("behauptet nichts über Bausteine außerhalb der Wertung", () => {
    // Joker-, Ereignis- und Anzeige-Bausteine bewegen keine Wertungsachse. Sie
    // bekommen deshalb KEIN Icon — lieber schweigen als eine Messung
    // vortäuschen, die es nicht gibt.
    const joker = LISTE.filter((e) => e.aspekt === "joker");
    expect(joker.length).toBeGreaterThan(1);
    for (const e of joker) expect(BEWERTUNGEN.get(e.id).wirkungen).toEqual([]);
  });

  it("vergleicht innerhalb der Gruppe, nicht mit dem Standard", () => {
    // Gegen den Standard gemessen zeigte „Mild" NICHTS an — es liegt mit
    // Schärfe 56 nah genug an der Vorgabe (59). Die Frage in der Bibliothek
    // ist aber nicht „anders als die Vorgabe?", sondern „welcher von DIESEN
    // vieren?". Innerhalb seiner Gruppe ist Mild der nachsichtigste, und genau
    // das muss dranstehen.
    const mild = BEWERTUNGEN.get("baustein:naehe:mild");
    expect(Math.abs(mild.kennzahlen.schaerfe - STANDARD_KENNZAHLEN.schaerfe)).toBeLessThan(6);
    expect(mild.wirkungen.map((w) => w.achse)).toContain("schaerfe");
  });

  it("gibt jeder Wertungs-Gruppe mindestens ein Icon", () => {
    for (const aspekt of ["naehe", "kombi", "underdog"]) {
      const gruppe = LISTE.filter((e) => e.aspekt === aspekt);
      const icons = gruppe.reduce((s, e) => s + BEWERTUNGEN.get(e.id).wirkungen.length, 0);
      expect(icons, `${aspekt} ohne jede Aussage`).toBeGreaterThan(0);
    }
  });

  it("zählt den Aufwand in Blättern, nicht in Schlüsseln", () => {
    // `combo: { tendenz, abstand, exakt }` sind DREI Einstellwerte.
    const b = BEWERTUNGEN.get("baustein:kombi:gestuft");
    expect(b.aufwand.desc).toMatch(/^3 Einstellwerte$/);
  });

  it("misst gegen dieselben Standard-Zahlen, die die Oberfläche zeigt", () => {
    expect(kennzahlen(DEFAULT_RULES)).toEqual(STANDARD_KENNZAHLEN);
  });
});

describe("Die Suche", () => {
  it("findet auch ohne Umlaute", () => {
    // Auf dem Handy tippt niemand Umlaute in ein Suchfeld — das ist die Regel,
    // nicht die Ausnahme.
    expect(suche(LISTE, "gemutlich").map((e) => e.label)).toContain("Gemütlich");
    expect(suche(LISTE, "NÄHE").length).toBeGreaterThan(0);
  });

  it("verlangt ALLE Wörter, nicht irgendeines", () => {
    const beide = suche(LISTE, "joker verdienen");
    const nurJoker = suche(LISTE, "joker");
    expect(beide.length).toBeLessThanOrEqual(nurJoker.length);
    // Gegenprobe: „joker" allein findet mehr als die Schnittmenge — sonst
    // wäre der Test auch grün, wenn die Suche gar nichts fände.
    expect(nurJoker.length).toBeGreaterThan(0);
  });

  it("gibt bei leerer Eingabe alles zurück", () => {
    expect(suche(LISTE, "").length).toBe(LISTE.length);
    expect(suche(LISTE, "   ").length).toBe(LISTE.length);
  });

  it("beschreibt den Treffer-Stand", () => {
    expect(beschreibeTreffer(69, 69, "")).toBe("69 Einträge");
    expect(beschreibeTreffer(0, 69, "xyz")).toMatch(/Nichts gefunden/);
    expect(beschreibeTreffer(3, 69, "joker")).toBe("3 von 69 Einträgen");
  });
});

describe("Die Sortierung", () => {
  it("stellt bei Relevanz die fertigen Runden-Ideen nach vorn", () => {
    const s = sortiere(LISTE, "relevanz");
    expect(s[0].art).toBe("charakter");
    const ersterBaustein = s.findIndex((e) => e.art === "baustein");
    const letzterCharakter = s.map((e) => e.art).lastIndexOf("charakter");
    expect(letzterCharakter).toBeLessThan(ersterBaustein);
  });

  it("stellt bei Verbreitung das Verbreitetste nach vorn", () => {
    const s = sortiere(LISTE, "verbreitung");
    const anteil = (e) => { const v = verbreitung(e); return v ? v.von / v.gesamt : -1; };
    for (let i = 1; i < s.length; i++) {
      expect(anteil(s[i - 1])).toBeGreaterThanOrEqual(anteil(s[i]));
    }
  });

  it("lässt die Eingabeliste in Ruhe", () => {
    const vorher = LISTE.map((e) => e.id);
    sortiere(LISTE, "name");
    expect(LISTE.map((e) => e.id)).toEqual(vorher);
  });

  it("kennt jede angebotene Sortierung", () => {
    for (const s of SORTIERUNGEN) {
      expect(sortiere(LISTE, s.key).length).toBe(LISTE.length);
    }
  });
});
