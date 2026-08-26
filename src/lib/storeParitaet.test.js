import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createMockStore } from "@/lib/store.mock";

// ============================================================
//  MOCK ↔ SUPABASE: haben beide Stores dieselben Methoden?
//
//  🔴 Der Anlass, und er ist strukturell, nicht hypothetisch: ALLE Tests
//  dieses Projekts laufen gegen den MOCK. `store.supabase.js` hat keinen
//  einzigen — er lässt sich ohne echte Datenbank nicht sinnvoll ausführen.
//  Die beiden werden also VON HAND synchron gehalten, und niemand merkt es,
//  wenn eine Methode nur im Mock landet: Tests grün, Build grün, und live
//  fliegt ein `store.xyz is not a function` in einem Screen.
//
//  ⚠️ Dieser Test ersetzt keinen Integrationstest gegen die echte DB — er
//  prüft die OBERFLÄCHE, nicht das Verhalten. Das ist trotzdem der Fund, der
//  am teuersten wäre: eine fehlende Methode fällt erst dem ersten echten
//  Mitspieler auf, und der Testbetrieb der Hinrunde ist genau dafür da.
//
//  Gelesen wird der QUELLTEXT von `store.supabase.js`, nicht das Objekt:
//  `createSupabaseStore()` wirft ohne Env-Variablen.
// ============================================================

// Absichtlich nur im Mock — mit Grund, sonst hat der Test keinen Wert.
const NUR_MOCK = {
  seedTip:
    "Legt einen Tipp ohne Anpfiff-Prüfung an. Testwerkzeug: die Wertung "
    + "braucht Tipps aus der Vergangenheit, `saveTip` verweigert die zu Recht. "
    + "In der DB wäre das eine Hintertür an der Policy vorbei.",
  seedSeasonTip:
    "Dito für Saison-Wetten — dieselbe Begründung, dasselbe Risiko.",
};

const quelltext = readFileSync("src/lib/store.supabase.js", "utf8");
// Methoden des zurückgegebenen Objektliterals: „  name(" bzw. „  async name(".
const supabaseMethoden = new Set(
  [...quelltext.matchAll(/^\s{2,4}(?:async\s+)?([a-zA-Z_$][\w$]*)\s*\(/gm)].map((m) => m[1]),
);
const mockMethoden = Object.entries(createMockStore())
  .filter(([, v]) => typeof v === "function")
  .map(([k]) => k);

describe("Store-Parität Mock ↔ Supabase", () => {
  it("jede Mock-Methode gibt es auch im Supabase-Store — oder sie steht in NUR_MOCK", () => {
    const fehlen = mockMethoden.filter((k) => !supabaseMethoden.has(k) && !NUR_MOCK[k]);
    expect(fehlen, `Nur im Mock, ohne Begründung: ${fehlen.join(", ")}`).toEqual([]);
  });

  it("NUR_MOCK führt nichts auf, das es im Supabase-Store längst gibt", () => {
    // Sonst verrottet die Ausnahmeliste und deckt echte Lücken zu.
    const ueberholt = Object.keys(NUR_MOCK).filter((k) => supabaseMethoden.has(k));
    expect(ueberholt, `Ausnahme überflüssig: ${ueberholt.join(", ")}`).toEqual([]);
  });

  it("NUR_MOCK führt nichts auf, das der Mock gar nicht mehr hat", () => {
    const verwaist = Object.keys(NUR_MOCK).filter((k) => !mockMethoden.includes(k));
    expect(verwaist, `Ausnahme zeigt ins Leere: ${verwaist.join(", ")}`).toEqual([]);
  });

  it("jede Ausnahme trägt einen Begründungssatz", () => {
    for (const [k, grund] of Object.entries(NUR_MOCK)) {
      expect(typeof grund, k).toBe("string");
      expect(grund.length, k).toBeGreaterThan(40);
    }
  });

  // Grobe Plausibilität: findet der Quelltext-Scan überhaupt etwas?
  it("der Quelltext-Scan liest den Supabase-Store wirklich aus", () => {
    expect(supabaseMethoden.size).toBeGreaterThan(30);
    for (const pflicht of ["saveTip", "getLeaderboard", "createRound", "joinRound"]) {
      expect(supabaseMethoden, pflicht).toContain(pflicht);
    }
  });
});

// ============================================================
//  ZWEITE EBENE: haben die Methoden auch DIESELBEN PARAMETER?
//
//  🔴 Der Test oben vergleicht NAMEN. Das fängt die fehlende Methode, aber
//  nicht den Fall, der live teurer ist: dieselbe Methode auf beiden Seiten,
//  nur nimmt die eine ein Feld entgegen, das die andere still wegwirft.
//
//  ⚠️ Warum das kein erfundenes Risiko ist: `saveTip` bekommt `snapshot`
//  übergeben — die eingefrorenen Quoten. Fiele das Feld auf der Supabase-Seite
//  aus der Destrukturierung, würde jeder Tipp OHNE seine Quoten gespeichert.
//  Die App liefe weiter, kein Test schlüge an, und auffallen würde es beim
//  ersten abgerechneten Spieltag des Testbetriebs.
//
//  ⚠️ Gemessen, bevor dieser Test gebaut wurde: 39 Methoden verglichen, 2
//  Unterschiede — beide erklärbar. Eine Prüfung, die dreißig Treffer meldet,
//  wird beim dritten Mal überblättert; diese hier meldet zwei, und beide
//  stehen unten mit Grund.
//
//  Gelesen wird auf beiden Seiten der QUELLTEXT der Parameterliste: beim Mock
//  über `fn.toString()`, bei Supabase über die Datei (der Store lässt sich
//  ohne Env-Variablen nicht erzeugen).
// ============================================================

// Felder, die es NUR im Mock gibt — mit Grund. Schlüssel: „methode.feld".
const NUR_MOCK_PARAM = {
  "joinRound.name":
    "Der Mock hat keine Profil-Tabelle und muss den Anzeigenamen übergeben "
    + "bekommen. Live kommt er aus dem Join auf `profiles` (`listMembers`), "
    + "also wäre der Parameter dort eine zweite Wahrheit über denselben Namen.",
  "createRound.adminName":
    "Dieselbe Sache beim Anlegen: der Mock schreibt den Namen des Admins in "
    + "seine Mitgliederliste, live steht er in `profiles` und wird von dort "
    + "gelesen. Ein übergebener Name könnte vom echten abweichen.",
};

// Parameterliste ab der öffnenden Klammer, Klammern zählend — ein simples
// `match` bräche bei `({ a = { b: 1 } })`.
function paramText(text, ab) {
  let tiefe = 0, i = ab;
  for (; i < text.length; i++) {
    const c = text[i];
    if (c === "(") tiefe++;
    else if (c === ")") { tiefe--; if (tiefe === 0) break; }
  }
  return text.slice(ab + 1, i);
}

const felderVon = (p) => {
  const t = p.match(/\{([^}]*)\}/)?.[1] ?? "";
  return t.split(",").map((s) => s.split(/[:=]/)[0].trim()).filter(Boolean).sort();
};

const supabaseParams = new Map();
for (const m of quelltext.matchAll(/^\s{2,4}(?:async\s+)?([a-zA-Z_$][\w$]*)\s*\(/gm)) {
  supabaseParams.set(m[1], paramText(quelltext, m.index + m[0].length - 1));
}

// Alle Unterschiede EINMAL berechnen — die Tests darunter lesen nur noch.
const unterschiede = [];
const mockStore = createMockStore();
for (const [name, fn] of Object.entries(mockStore)) {
  if (typeof fn !== "function") continue;
  const sb = supabaseParams.get(name);
  if (sb === undefined) continue;                 // fehlende Methode: Test oben
  const mp = paramText(fn.toString(), fn.toString().indexOf("("));
  const mf = felderVon(mp), sf = felderVon(sb);
  for (const feld of mf) if (!sf.includes(feld)) unterschiede.push({ name, feld, seite: "mock" });
  for (const feld of sf) if (!mf.includes(feld)) unterschiede.push({ name, feld, seite: "supabase" });
}

describe("Store-Parität: die Parameter", () => {
  it("der Scan liest auf beiden Seiten wirklich Parameter aus", () => {
    // 🔴 Ohne diese Zeile wäre ein kaputtes Muster ein GRÜNER Test: zwei leere
    // Mengen sind immer deckungsgleich.
    expect(supabaseParams.size).toBeGreaterThan(30);
    expect(felderVon(supabaseParams.get("saveTip") ?? "")).toContain("snapshot");
  });

  it("kein Feld fällt auf einer Seite still weg", () => {
    const offen = unterschiede
      .filter((u) => !NUR_MOCK_PARAM[`${u.name}.${u.feld}`])
      .map((u) => `${u.name}.${u.feld} (nur ${u.seite})`);
    expect(
      offen,
      "Diese Felder gibt es nur auf einer Seite. Live heißt das: der Aufrufer "
      + "übergibt sie, und der Store wirft sie weg — ohne Fehler.\n" + offen.join("\n")
    ).toEqual([]);
  });

  it("jede Ausnahme trägt einen Begründungssatz", () => {
    for (const [k, grund] of Object.entries(NUR_MOCK_PARAM)) {
      expect(typeof grund, k).toBe("string");
      expect(grund.length, k).toBeGreaterThan(60);
    }
  });

  it("keine Ausnahme ist überholt", () => {
    // Dieselbe Gegenprobe wie bei `NUR_MOCK`: eine Begründung, die einen
    // Zustand beschreibt, den es nicht mehr gibt, wird beim nächsten Durchgang
    // geglaubt.
    const bekannt = new Set(unterschiede.map((u) => `${u.name}.${u.feld}`));
    const ueberholt = Object.keys(NUR_MOCK_PARAM).filter((k) => !bekannt.has(k));
    expect(ueberholt, `Ausnahme zeigt ins Leere: ${ueberholt.join(", ")}`).toEqual([]);
  });
});

// ============================================================
//  WERDEN GLEICHZEITIGE ABFRAGEN ZUSAMMENGELEGT?
//
//  🔴 Gemessen am 26.08.2026 an einem PRODUKTIONS-Build (also kein
//  StrictMode-Artefakt), gegen einen Supabase-Nachbau:
//
//      /hub      18 Anfragen · den ganzen Spielplan-Katalog DREIMAL
//      /tippen   11 Anfragen · dreimal
//      /ranking  15 Anfragen · zweimal
//
//  Der Katalog ist **3,15 MB roh** (1942 Spiele à 1,7 KB, praktisch
//  vollständig der Quoten-Snapshot). Dreimal sind 9,4 MB für EINEN Screen.
//  Auf einem Handy im Mobilfunknetz ist das der Unterschied zwischen „geht
//  auf" und „hakt" — und der Testbetrieb findet auf Handys statt.
//
//  Die Ursache ist keine Schleife, sondern Gleichzeitigkeit: mehrere
//  Komponenten laden unabhängig voneinander und starten zur selben Zeit.
//
//  Nach dem Umbau: 9 · 6 · 9 Anfragen, der Katalog jeweils EINMAL.
//
//  ⚠️ Ein echter Laufzeit-Test bräuchte einen Supabase-Client;
//  `createSupabaseStore()` wirft ohne Env-Variablen. Diese Prüfung liest
//  deshalb den Quelltext — dieselbe Bauart wie `rueckmeldungUhr.test.js`.
//  Sie sichert nicht das Verhalten, sondern die STELLE, an der es entsteht.
// ============================================================
describe("Gleichzeitige Abfragen werden zusammengelegt", () => {
  // Reine Lese-Methoden, die im Messlauf mehrfach parallel aufliefen.
  const ZUSAMMENGELEGT = ["getRound", "listTips", "listMembers", "listVotes", "listSeasonTips"];

  it("der Spielplan-Katalog wird nicht bei jedem Aufruf neu geholt", () => {
    const abschnitt = quelltext.slice(quelltext.indexOf("async listMatches()"));
    expect(
      abschnitt.slice(0, 900),
      "`listMatches()` holt den Katalog wieder ungebremst. Das sind 3,15 MB je "
      + "Aufruf, und der Hub rief ihn dreimal."
    ).toContain("katalog");
  });

  it("ein gescheiterter Katalog-Versuch setzt sich nicht fest", () => {
    // Ohne das `katalog = null` im Fehlerfall scheitert eine Minute lang JEDER
    // weitere Aufruf mit, ohne es je wieder zu versuchen.
    const abschnitt = quelltext.slice(quelltext.indexOf("async listMatches()"), quelltext.indexOf("async openMatchday"));
    expect(abschnitt).toMatch(/catch[\s\S]*katalog = null/);
  });

  it("das Öffnen eines Spieltags verwirft den Katalog", () => {
    // Dabei wird das Big Game eingefroren — an dieser Zahl hängen Punkte.
    const abschnitt = quelltext.slice(quelltext.indexOf("async openMatchday"));
    expect(abschnitt.slice(0, 1200)).toContain("katalog = null");
  });

  it("die mehrfach parallel gerufenen Lese-Methoden gehen über `einmal`", () => {
    const ohne = ZUSAMMENGELEGT.filter((name) => {
      const ab = quelltext.indexOf(`async ${name}(`);
      if (ab < 0) return true;
      return !quelltext.slice(ab, ab + 700).includes("einmal(");
    });
    expect(
      ohne,
      "Diese Methoden liefen im Messlauf mehrfach gleichzeitig und sind nicht "
      + "mehr zusammengelegt:\n" + ohne.join("\n")
    ).toEqual([]);
  });

  it("`einmal` ist ein Zusammenlegen und KEIN Cache", () => {
    // 🔴 Der Unterschied entscheidet, ob das erlaubt ist: das Versprechen wird
    // gelöscht, sobald es fertig ist. Ein späterer Aufruf holt frische Daten.
    // Ohne das `finally` wäre es ein Cache ohne Frist — und das Regelwerk
    // einer Runde ändert sich.
    const ab = quelltext.indexOf("const einmal =");
    expect(ab, "`einmal` gibt es nicht mehr").toBeGreaterThan(-1);
    expect(quelltext.slice(ab, ab + 400)).toMatch(/finally\(\(\) => imFlug\.delete/);
  });
});
