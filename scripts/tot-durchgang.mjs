// ============================================================
//  TOT-DURCHGANG — welche gebaute Funktion ruft niemand auf?
//
//  Aufruf:  npm run tot
//
//  🔴 Am 06.08.2026 sind VIER Mechaniken aufgefallen, die fertig gebaut,
//  getestet und über die Oberfläche einstellbar waren — und von niemandem
//  aufgerufen wurden:
//
//    `autoTip.js`   (Versäumnis)        · importiert waren nur die Regler-LABELS
//    `spieltagsPunkte` bei `auswerten()` · kein Aufrufer gab sie mit
//    `alleEintraege` bei `auswerten()`   · dito, mit umgekehrtem Vorzeichen
//    `auswahl.js`   (die ganze WEN-Achse) · achtzehn Modi, null Aufrufer
//
//  Alle vier sind beim HINSEHEN gefunden worden, nicht durch eine Prüfung.
//  Kein Test konnte sie sehen: sie waren ja alle grün — die Funktion rechnete
//  richtig, sie wurde nur nie gefragt.
//
//  Diese Messung sucht danach mechanisch: ein Export, den außerhalb seiner
//  eigenen Datei und ihrer Tests niemand nennt, ist ein Verdacht.
//
//  ⚠️ „Unbenutzt" ist ein BEFUND, kein Fehler — dieselbe Haltung wie bei
//  `greift`. Manches ist bewusst nur für Tests da, manches ist eine
//  vorbereitete Schnittstelle. Deshalb gilt dieselbe Regel wie bei `stufen`:
//  entweder es hat einen Aufrufer, oder es steht mit einem BEGRÜNDUNGSSATZ in
//  `GEDULDET`. Stillschweigend herumliegen darf nichts.
//
//  ⚠️ Textsuche, keine Typanalyse. Sie kann einen Export übersehen, der nur
//  dynamisch angesprochen wird — dafür braucht sie kein Werkzeug und läuft in
//  einer Sekunde. Ein Verdacht, den man in zehn Sekunden prüft, ist mehr wert
//  als eine perfekte Analyse, die niemand startet.
// ============================================================
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Was darf ohne Aufrufer dastehen — mit Satz, warum.
const GEDULDET = {
  createSupabaseStore:
    "Wird über `getStore()` in store.js ausgewählt, nicht direkt importiert.",
  createMockStore:
    "Dito — die eine Stelle, an der Mock gegen Supabase getauscht wird.",

  // ── Am 26.08.2026 geprüft und stehen gelassen ─────────
  // 🔴 Premium als Belohnung (M8). Die RECHNUNG steht und ist gemessen; was
  // fehlt, ist eine Entscheidung von Andi — und zwar eine, die man nicht
  // erraten kann.
  empfehlungsStand:
    "Rechnet den Stand einer Werbe-Belohnung aus (M8): wie viele geworbene "
    + "Mitspieler sind aktiv? ⏳ Kein Screen, weil zwei Fragen offen sind, die "
    + "Andi beantworten muss: was „für ne gewisse Zeit aktiv“ heißt (die "
    + "Vorgabe „3 Spieltage“ ist ein VORSCHLAG von mir, keine Ansage von ihm), "
    + "und ob die Belohnung überhaupt vor M7 kommt. Ein Screen, der eine "
    + "geratene Schwelle anzeigt, verspricht etwas Falsches.",
  beschreibeEmpfehlung:
    "Der Satz dazu — dieselbe Begründung. Beide sind gemessen (an der "
    + "Demo-Runde durchgerechnet) und warten nur auf die Zahl.",

  // ── Am 25.08.2026 geprüft und stehen gelassen ─────────
  //
  // 🔴 Der Durchgang an diesem Tag hat NICHT sortiert, sondern entschieden:
  // was eine zweite Antwort auf eine schon beantwortete Frage war, ist
  // gelöscht (13 Exporte — sieben Quoten-Quellen, fünf Derby-Sucher,
  // `getCurrentUser`), der Rest steht hier mit Grund. Die Trennlinie war
  // jedes Mal dieselbe Frage: *könnte ein Aufrufer dieser Funktion etwas
  // anderes bekommen als der Weg, den die App schon geht?* Wo ja: weg.
  //
  // ── Prüf-Umkehrungen: existieren, damit ein Test etwas ZEIGEN kann ──
  istWiderspruechlich:
    "Zusicherung für die Anzeige: Sieger-Boden und Favoriten-Reinfall können "
    + "nie zugleich auftreten. Steht so schon im Kommentar der Funktion — sie "
    + "ist für den Test gebaut, nicht für einen Screen. Ein Aufrufer in der "
    + "Oberfläche wäre sogar falsch: die Liste soll nie widersprüchlich SEIN, "
    + "nicht sich dafür entschuldigen.",
  segmentUnterZeiger:
    "Die Umkehrung von `zielWinkel` — gebraucht nicht zum Zeichnen, sondern "
    + "zum Beweisen, dass das Rad auf das GEZOGENE Feld zeigt und nicht auf "
    + "den Nachbarn. Ohne sie ließe sich ein vertauschtes Vorzeichen erst am "
    + "Widerspruch zwischen Bild und Auszahlung bemerken.",

  // ── Andockpunkte: die Gegenseite gibt es noch nicht ──
  matchDrama:
    "Braucht eine Spiel-Timeline (Tore mit Minute), die keine Quelle heute "
    + "liefert; `MATCH_DRAMA` ist deshalb leer. Beides steht so im Kopf von "
    + "`reactions.js`. ⚠️ NICHT löschen: die Datei ist genau darum so gebaut, "
    + "dass ein neues Szenario eine Regel plus eine GIF-Datei ist und kein "
    + "UI-Umbau.",
  uploadedAvatarUrl:
    "Eigenes Bild statt eines der 16 Sinnbilder. Der Upload-Weg (Storage-"
    + "Bucket, Zuschnitt, Moderation) ist nicht gebaut — die Funktion allein "
    + "reicht dafür nicht, sie bildet nur den Pfad.",
  getSupabaseServiceClient:
    "Der service_role-Zugang. Absichtlich ohne Aufrufer: er darf NUR "
    + "serverseitig laufen (Architektur-Regel 2), und die erste API-Route, "
    + "die ihn braucht, gibt es noch nicht. ⚠️ Ein Aufrufer im Frontend wäre "
    + "kein Aufräumen, sondern ein Schlüssel im Browser.",

  // ── Stillgelegt per Entscheidung ──
  printBalanceReport:
    "⛔ Balance ist Endphase (CLAUDE.md, Andi mehrfach). Die Datei bleibt, wie "
    + "sie ist — kein Anschließen, kein Nachrüsten.",
  isLocked:
    "Seit der Entscheidung gegen jede Bezahlschranke (M1, 25.08.2026) eine "
    + "Durchreiche, die immer `false` sagt. Steht mit Begründung im Kopf von "
    + "`premium.js`; sie bleibt, damit ein späteres Premium-Merkmal eine "
    + "Stelle hat statt einer neuen.",

  // ── Ein Satz für eine Oberfläche, die noch nicht platziert ist ──
  // ⚠️ Diese fünf sind KEINE Doppelungen — nachgesehen, nicht angenommen:
  // jeder zugehörige Screen zeigt heute etwas anderes (Kacheln statt Satz,
  // Auswahl statt Zusammenfassung), keiner baut den Satz selbst nach. Sie
  // warten auf eine Stelle, und Stellen entscheidet die Masterdatei.
  beschreibeAufwand:
    "Einzeiler-Form der Angaben, die `AufwandPanel` als Kacheln zeigt — "
    + "gedacht für Listen und Karten, wo kein Panel hinpasst.",
  beschreibeMix:
    "Zusammenfassung „was kommt am Ende woher“ für die Bestätigung. "
    + "`PresetMischen` zeigt die AUSWAHL (beide Seiten als Knöpfe), nicht das "
    + "Ergebnis — zwei verschiedene Sätze, keiner doppelt.",
  beschreibeTeilCode:
    "„Aspekt, N abweichende Felder“ — was ein Teil-Code mitbringt, BEVOR man "
    + "ihn anwendet. `TeilCodeFeld` prüft heute nur, ob der Code zum Aspekt "
    + "passt.",
  beschreibeKombination:
    "Ein Satz zu einer Joker-Kombination samt Neigung, Dichte und Schärfe.",
  bildeCode:
    "Die Hin-Richtung zu `zerlegeCode`. Kein Aufrufer, weil Codes heute "
    + "entstehen, wo beide Teile ohnehin danebenstehen. ⚠️ Sie bleibt als "
    + "Gegenstück: wer das Schema ändert, ändert es an einer Stelle.",
  ersatzStand:
    "„2 von 3 Ersatz-Tipps verbraucht“ — die Zahl, die ein Spieler sucht. Das "
    + "Ranking zeigt heute nur, was die Kulanz GEBRACHT hat (`ersatz`, "
    + "`ersatzPunkte` aus der Wertung), nicht, was davon noch übrig ist. "
    + "Fehlende Anzeige, keine zweite Wahrheit.",

  // ── Ein ganzes Modul ohne Anschluss ──
  // 🔴 Langtext samt Schichtentabelle steht ganz oben in `design/roadmap.md`.
  teamLeaderboard:
    "Der Mannschafts-Modus hängt vollständig in der Luft: `sanitizeRules` "
    + "liefert für `teams` `undefined`, den Regelblock gibt es im Regelwerk "
    + "gar nicht. Die WERTUNG ist fertig und getestet (die Wertungsart "
    + "„bester“ am 25.08.2026 nachgebaut, sie fiel vorher still auf „summe“ "
    + "durch). Was fehlt, ist Regelblock, Store-Mitgliedschaft, Oberfläche "
    + "und Rangliste — alles Platzierung, und die wartet auf die Masterdatei.",
  beschreibeTeams:
    "Dito — der Satz zum Modus, den es in der Oberfläche noch nicht gibt.",

  quotenQuelle:
    "🔴 DIE austauschbare Quoten-Quelle des Katalogs (Architektur-Regel 2) "
    + "— gleiche Schnittstelle wie `createMockOddsSource()`, aber über ALLE "
    + "Wettbewerbe. Vorbereitet, nicht angeschlossen: der Mock-Store trägt die "
    + "Snapshots heute schon am Match, gebraucht wird sie beim Umstieg auf die "
    + "echte API. ⚠️ Sie ersetzt SIEBEN Fabriken (eine je Liga), die alle "
    + "denselben Einzeiler waren und alle in dieser Liste standen — und von "
    + "denen keine eine Runde bedienen konnte, die Wettbewerbe mischt.",

  // ── Am 24.08.2026 geprüft und stehen gelassen ─────────────
  vergissBesuch:
    "Stellt den Erstkontakt (G5) wieder auf „noch nie da gewesen“. Bewusst "
    + "NICHT an einen Knopf in der App gehängt: „Begrüßung nochmal zeigen“ ist "
    + "eine Einstellung, die niemand sucht und die den Screen belastet. Sie "
    + "steht für die Entwicklung und die Musterseite — und ohne sie ließe sich "
    + "der erste Start nur durch Löschen der Seitendaten wiederholen.",

  // ── Am 06.08.2026 geprüft und stehen gelassen ─────────────
  catchupLeaderboard:
    "Bequemer Weg zum Endstand mit Anschluss-Bonus. Der Store nimmt statt "
    + "dessen den letzten Eintrag von `scoreLeaderboardHistory` — beide "
    + "rechnen über `applyCatchup`, es gibt also keine zweite Wahrheit. "
    + "⚠️ Gehört Account 2; vor dem Löschen im Kanal abstimmen.",
  istFreigeschaltet:
    "🔴 ZWEITE FORMULIERUNG derselben Regel wie `freigabeStatus` (das den "
    + "Zustand samt Begründungssatz liefert und überall benutzt wird). Steht "
    + "auf der Abrissliste, sobald Account 2 den Kanal-Eintrag vom 06.08. "
    + "gelesen hat — solange zwei Fassungen dastehen, können sie auseinander"
    + "laufen.",
  tippbareSpiele:
    "Bequemer Weg zu „was ist JETZT tippbar\". Die Spielwahl baut ihre Liste "
    + "selbst, weil sie zusätzlich nach Regelwerk je Spiel gruppiert. Beide "
    + "gehen über `tippStatus`, also eine Rechnung.",

  // ── Am 23.08.2026 geprüft und stehen gelassen ─────────────
  // 🔴 Die beiden Hälften EINER Definition: „geht dieser Tipp auf der Stufe X
  // auf?" — einmal als Wahrscheinlichkeit VORHER (aus dem Quoten-Raster),
  // einmal als Tatsache NACHHER (gegen das echte Ergebnis). Innerhalb von
  // `fremdjoker.js` ruft `fremdEinsaetze` beide auf; diese Textsuche sieht
  // Aufrufe in derselben Datei bauartbedingt nicht.
  // ⚠️ Sie bleiben EXPORTIERT, weil genau daran ihr Test hängt: laufen die
  // zwei Fassungen auseinander, gewinnt eine Gegenwette, die nach der Wertung
  // verloren ist. Ein internes `passt()` verbindet sie im Code, der Test
  // verbindet sie in der Aussage.
  trefferWahrscheinlichkeit:
    "Vorher-Hälfte der Gegenwetten-Definition. Wird in `fremdjoker.js` selbst "
    + "von `fremdEinsaetze`/`gegenwetteVorschau` benutzt — dieselbe Datei, "
    + "also für diese Suche unsichtbar. Der Export trägt den Test, der sie an "
    + "`tippGetroffen` bindet.",
  tippGetroffen:
    "Nachher-Hälfte derselben Definition. Dito — von `fremdEinsaetze` in "
    + "derselben Datei aufgerufen.",

  // ── Am 07.08.2026 geprüft und stehen gelassen ─────────────
  // Beide werden INNERHALB von `balanceSim.js` aufgerufen (`simulateBalance`
  // benutzt sie) — dieselbe Datei sieht diese Textsuche bauartbedingt nicht.
  // Exportiert sind sie, weil der Test die Lücken-Logik einzeln prüfen muss:
  // sie über `simulateBalance` zu messen hieße, ein ganzes Monte-Carlo laufen
  // zu lassen, um eine Fallunterscheidung zu prüfen.
  unvermesseneEbenen:
    "Wird in `simulateBalance` (dieselbe Datei) aufgerufen; der Export ist für "
    + "den Test der Lücken-Logik da.",
  ampelMitLuecken:
    "Dito — legt über `bewerten()`, was die Messung selbst nicht abdeckt.",

  // Beide werden in `neueAbrechnungen` (dieselbe Datei) benutzt. Exportiert,
  // weil „wann ist ein Spiel vorbei" die Kernregel dieser Datei ist und einen
  // eigenen Testfall verdient — über `neueAbrechnungen` gemessen bräuchte es
  // dafür jedes Mal eine ganze Eintragsliste.
  abrechnungsZeit:
    "Wird in `neueAbrechnungen` (dieselbe Datei) aufgerufen; der Export ist für "
    + "den Test der Zeit-Regel da.",
  SPIELDAUER_MIN:
    "Dito — der Test hält fest, dass die Spanne großzügig bleibt (zu spät ist "
    + "harmlos, zu früh zeigt ein Ergebnis, das es noch nicht gibt).",
};

const LIB = "src/lib";
const SUCHORTE = ["src", "scripts", "supabase"];

// Alle `export`-Namen einer Datei. Bewusst grob: benannte Funktionen,
// Konstanten und Klassen. `export default` hat keinen Namen und fällt weg.
function exporteVon(text) {
  const namen = new Set();
  for (const m of text.matchAll(/^export\s+(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z0-9_$]+)/gm)) {
    namen.add(m[1]);
  }
  // `export { a, b as c }` — der EXPORTIERTE Name zählt.
  for (const m of text.matchAll(/^export\s*\{([^}]*)\}/gm)) {
    for (const teil of m[1].split(",")) {
      const name = teil.includes(" as ") ? teil.split(" as ")[1] : teil;
      const sauber = name.trim();
      if (sauber && sauber !== "default") namen.add(sauber);
    }
  }
  return namen;
}

function dateien(ordner) {
  const out = [];
  for (const eintrag of readdirSync(ordner, { withFileTypes: true })) {
    const pfad = join(ordner, eintrag.name);
    if (eintrag.isDirectory()) out.push(...dateien(pfad));
    else if (/\.(js|jsx|mjs)$/.test(eintrag.name)) out.push(pfad);
  }
  return out;
}

const alleDateien = SUCHORTE.flatMap((o) => {
  try { return dateien(o); } catch { return []; }
});
const inhalt = new Map(alleDateien.map((f) => [f, readFileSync(f, "utf8")]));

const module = readdirSync(LIB)
  .filter((f) => f.endsWith(".js") && !f.endsWith(".test.js"))
  .map((f) => join(LIB, f));

const befunde = [];
const nurTest = [];
let geprueft = 0;

for (const datei of module) {
  const text = inhalt.get(datei) ?? readFileSync(datei, "utf8");
  const eigenerTest = datei.replace(/\.js$/, ".test.js");

  for (const name of exporteVon(text)) {
    geprueft++;
    if (GEDULDET[name]) continue;
    // Wortgrenze, damit `band` nicht in `bandbreite` trifft.
    const muster = new RegExp(`\\b${name.replace(/\$/g, "\\$")}\\b`);
    const fremde = [];
    let auchTest = false;
    for (const [f, t] of inhalt) {
      if (f === datei) continue;
      if (!muster.test(t)) continue;
      if (f === eigenerTest) { auchTest = true; continue; }
      // Andere Testdateien zählen als „nur Test" — sie beweisen nicht, dass
      // die Funktion im Spiel etwas tut.
      if (f.endsWith(".test.js")) { auchTest = true; continue; }
      fremde.push(f);
    }
    if (fremde.length) continue;
    // 🔴 Der Unterschied, der die Liste erst brauchbar macht: wird der Name in
    // seiner EIGENEN Datei noch gebraucht? Dann ist er kein toter Code,
    // sondern nur ein unnötiger Export — ärgerlich, aber harmlos. Ohne diese
    // Trennung standen `passtSpiel`, `mischAnteil` und `muenzPerioden` in der
    // scharfen Gruppe, obwohl sie alle drei laufen.
    //
    // Gezählt wird OHNE die Export-Zeile selbst; ein Vorkommen bedeutet also
    // wirklich eine Verwendung.
    const ohneExport = text.replace(new RegExp(`^export\\s.*\\b${name}\\b.*$`, "gm"), "");
    const intern = (ohneExport.match(new RegExp(`\\b${name}\\b`, "g")) ?? []).length > 0;
    (auchTest ? nurTest : befunde).push({ name, datei, intern });
  }
}

// ── Nach RISIKO sortieren, nicht alphabetisch ───────────────
//
// 🔴 Der erste Lauf meldete 85 Einträge in einer Liste. Das ist keine Messung
// mehr, sondern eine Halde — und eine Halde wird beim zweiten Mal überflogen
// und beim dritten ignoriert. Dieselbe Lehre wie bei der Überfüllungs-Warnung
// der Zeitachse: eine Meldung, die den Normalfall trifft, ist keine.
//
// Die vier Funde vom 06.08. hatten eine gemeinsame Eigenschaft: es waren
// FUNKTIONEN in Modulen, die zu einem `rules.*`-Block gehören. Dort heißt „ruft
// niemand auf" nämlich „die Einstellung tut nichts". Bei einer Konstante oder
// einem Label heißt es bloß „ungenutzt".
const REGELMODULE = new Set(
  [...(inhalt.get("src/lib/engine.js") ?? "").matchAll(/from\s+"\.\/([a-zA-Z0-9_]+)"/g)]
    .map((m) => `${m[1]}.js`),
);
const istKonstante = (n) => /^[A-Z0-9_]+$/.test(n);
const rang = (b) => {
  // Intern benutzt = läuft, nur der Export ist überflüssig. Ganz nach hinten.
  if (b.intern) return 3;
  if (istKonstante(b.name)) return 2;
  return REGELMODULE.has(b.datei.replace(/^src\/lib\//, "")) ? 0 : 1;
};

const kurz = (d) => d.replace(/^src\/lib\//, "");
console.log(`\n${"=".repeat(88)}`);
console.log("  TOT-DURCHGANG — welcher Export hat keinen Aufrufer?");
console.log(`  ${module.length} Module · ${geprueft} Exporte geprüft`);
console.log(`${"=".repeat(88)}\n`);

const alleBefunde = [
  ...befunde.map((b) => ({ ...b, wo: "niemand" })),
  ...nurTest.map((b) => ({ ...b, wo: "nur Test" })),
];
const gruppen = [
  ["🔴 FUNKTION IN EINEM REGEL-MODUL — hier heißt „kein Aufrufer\" meist: die Einstellung tut nichts",
    alleBefunde.filter((b) => rang(b) === 0)],
  ["Funktion in einem sonstigen Modul", alleBefunde.filter((b) => rang(b) === 1)],
  ["Konstante oder Katalog — meist harmlos, aber ungenutzt", alleBefunde.filter((b) => rang(b) === 2)],
  ["Wird INTERN benutzt — läuft also, nur der Export ist überflüssig", alleBefunde.filter((b) => rang(b) === 3)],
];

for (const [titel, liste] of gruppen) {
  if (!liste.length) continue;
  console.log(`  ${titel}  (${liste.length})`);
  for (const b of liste.sort((x, y) => x.datei.localeCompare(y.datei) || x.name.localeCompare(y.name))) {
    console.log(`     ${kurz(b.datei).padEnd(24)} ${b.name.padEnd(28)} ${b.wo}`);
  }
  console.log();
}

if (!alleBefunde.length) {
  console.log("  ✅ Jeder Export hat einen Aufrufer außerhalb seiner Tests.");
} else {
  console.log("  🔴 „nur Test\" ist die Sorte, die am 06.08. viermal aufgefallen ist. Ein");
  console.log("     grüner Test beweist, dass die Funktion RICHTIG rechnet — nicht, dass");
  console.log("     sie jemand fragt. Für jeden Eintrag gilt: anschließen, löschen, oder");
  console.log("     mit einem Satz in `GEDULDET` begründen.");
  console.log("  ⚠️ Die erste Gruppe zuerst. Die dritte ist meist Beiwerk (Farbtabellen,");
  console.log("     Label-Kataloge) und darf lange stehen bleiben.");
}
console.log();
