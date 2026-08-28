// ============================================================
//  WORTE-DURCHGANG — steht Werkstatt-Sprache in einem Spielertext?
//
//  Aufruf:  npm run worte
//
//  🔴 Der Befund, aus dem dieser Durchgang entstanden ist (28.08.2026):
//  `docs/tonfall.md` hielt nach dem ersten Ton-Durchgang fest, die gefährliche
//  Sorte Fehler sei **nicht Steifheit, sondern Werkstatt-Sprache** — „ein Wort,
//  das im Team eine Bedeutung hat und draußen keine" — und schloss mit dem
//  Satz: *„Danach sucht kein Muster; das findet nur, wer liest."*
//
//  ⚠️ **Der Satz war zu bescheiden.** Genau danach lässt sich suchen, wenn man
//  die Wörter aufschreibt statt sie zu erraten. Der zweite Durchgang fand über
//  eine schlichte Wortliste drei Stellen, die beim Lesen durchgerutscht waren —
//  darunter eine, die zusätzlich **sachlich falsch** geworden war („das volle
//  erzeugte Raster" stand an der Stufe 8, seit es die Stufe 9 gibt).
//
//  ── Was dieser Durchgang KANN und was nicht ──
//
//  ✅ Er findet ein VERZEICHNETES Wort in einem Spielertext.
//  ⛔ Er urteilt NICHT über den Ton. Ob ein Satz zu bemüht klingt, sieht nur
//     ein Mensch — dafür stehen die vier Probefragen in `docs/tonfall.md`.
//
//  🔴 **Und die eigentliche Arbeit steckt in den zwei Listen unten.** Eine
//  Wortliste ohne Gegenliste meldet die halbe Spielsprache: „Joker", „Deckel",
//  „Faktor" und „Modifikator" SIND unsere Wörter für die Spieler, sie stehen so
//  in `design/vokabular.md` und auf der Oberfläche. Wer sie hier einträgt,
//  bekommt 20 Funde und schaltet den Durchgang danach ab.
//  Deshalb trägt jeder Eintrag beider Listen einen Satz, warum er dort steht.
// ============================================================
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// ── Die Felder, in denen Nutzertext steht ───────────────────
// ⚠️ Bewusst eine Liste benannter Felder und nicht „jede Zeichenkette": die
// erste Messung am 27.08.2026 zählte so 4 609 Treffer, davon war der größte
// Teil Schlüssel, Testdaten und Kommentar. Echte Nutzertexte sind rund 950.
const FELDER = [
  "desc", "text", "label", "hinweis", "help", "titel", "untertitel",
  "beheben", "grund", "frage", "antwort", "kurz", "lang", "satz",
  "warnung", "placeholder",
];

// ── Werkstatt-Wörter: drinnen eine Bedeutung, draußen keine ──
// Der Satz sagt, WARUM das Wort einen Spieler stehen lässt.
const WERKSTATT = {
  "Token": "Steht in keiner Mail und auf keinem Knopf — der Spieler sieht einen Link.",
  "Snapshot": "Unser Wort für das gespeicherte Quoten-Bild. Er sieht nur die Quote.",
  "Payload": "Reines Technikwort.",
  "Endpoint": "Reines Technikwort.",
  "Fallback": "Sagt nicht, was stattdessen passiert.",
  "Default": "Auf Deutsch: Vorgabe. Das versteht jeder.",
  "Cutoff": "Kein Regler heißt so. Wer den Rat liest, sucht vergeblich.",
  "Property": "Reines Technikwort.",
  "Instanz": "Reines Technikwort.",
  "persistiert": "Reines Technikwort. Gemeint ist: bleibt gespeichert.",
  "serialisiert": "Reines Technikwort.",
  "gemappt": "Reines Technikwort.",
  "Sanitize": "Unser Wort für das Bereinigen des Regelwerks.",
  "sanitize": "Unser Wort für das Bereinigen des Regelwerks.",
  "Store": "Unser Wort für die Datenschicht.",
  "Engine": "Unser Wort für die Wertungs-Datei.",
  "Preset": "Auf der Oberfläche heißt es Vorlage.",
  "Zuschnitt": "Unser Wort dafür, welche Spiele zur Runde gehören.",
  "erzeugte": "Verrät die Werkstatt: der Spieler sieht nicht, dass etwas erzeugt wird.",
};

// ── Sieht technisch aus, IST aber die Spielsprache ──────────
// ⚠️ Diese Liste ist der eigentliche Wert der Datei. Sie hält fest, was NICHT
// gemeldet werden darf — und warum. Ohne sie wandert früher oder später ein
// Spielwort in die Liste darüber, und der Durchgang wird unbrauchbar.
const SPIELSPRACHE = {
  "Joker": "Kernbegriff, steht so in `design/vokabular.md`.",
  "Narren": "Unsere Währung — auf jeder Oberfläche sichtbar.",
  "Modifikator": "Steht als Wort auf dem Glücksrad und in der Abrechnung.",
  "Deckel": "Deutsch, bildlich und überall erklärt: mehr gibt es nicht.",
  "Faktor": "Steht als Zahl daneben (1,2×) — das Wort erklärt sich selbst.",
  "Anker": "Erklärter Begriff der Tippfenster-Einstellung, mit Beispiel daneben.",
  "Raster": "Deutsches Wort für die Schrittweite, immer mit der Zahl daneben.",
  "Pool": "Steht neben der Erklärung „gleicher Vorrat für alle\".",
  "Quote": "Der Kern des ganzen Spiels.",
  "Code": "Der Beitritts-Code — genau das, was der Spieler eintippt.",
};

// ── Dateien, die bewusst nicht mitgemessen werden ───────────
const AUSGENOMMEN = {
  "balanceSim.js":
    "⛔ Balancing ist Endphase (CLAUDE.md) — `balanceSim.js` und die Ampel " +
    "bleiben, wie sie sind. Ihr Werkstatt-Befund steht in `design/roadmap.md`.",
  "route.js":
    "API-Routen melden an den ENTWICKLER, nicht an den Spieler " +
    "(„ODDS_API_KEY serverseitig setzen\").",
};

function* dateien(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (!/node_modules|\.next/.test(p)) yield* dateien(p);
    } else if (/\.(js|jsx)$/.test(e.name) && !/\.test\.js$/.test(e.name)) {
      yield p;
    }
  }
}

const feldRe = new RegExp(`\\b(${FELDER.join("|")})\\s*:\\s*"([^"\\\\]{8,})"`, "g");

const texte = [];
for (const datei of dateien("src")) {
  if (Object.keys(AUSGENOMMEN).some((n) => datei.endsWith(n))) continue;
  const zeilen = readFileSync(datei, "utf8").split("\n");
  zeilen.forEach((z, i) => {
    // Kommentarzeilen raus — dort steht unsere Sprache zu Recht.
    if (/^\s*(\/\/|\*|\/\*)/.test(z)) return;
    let m;
    feldRe.lastIndex = 0;
    while ((m = feldRe.exec(z))) texte.push({ datei, zeile: i + 1, text: m[2] });
  });
}

const funde = [];
for (const t of texte) {
  for (const [wort, grund] of Object.entries(WERKSTATT)) {
    if (SPIELSPRACHE[wort]) continue;
    const re = new RegExp(`\\b${wort}`, wort[0] === wort[0].toLowerCase() ? "" : "i");
    if (re.test(t.text)) funde.push({ ...t, wort, grund });
  }
}

const strich = "=".repeat(88);
console.log(`\n${strich}`);
console.log("  WORTE — steht Werkstatt-Sprache in einem Spielertext?");
console.log(strich);
console.log(`\n  Spielertexte durchsucht: ${texte.length}`);
console.log(`  Verzeichnete Werkstatt-Wörter: ${Object.keys(WERKSTATT).length}`);
console.log(`  Als Spielsprache geschützt: ${Object.keys(SPIELSPRACHE).length}`);
console.log(`  Dateien ausgenommen: ${Object.keys(AUSGENOMMEN).length}`);
for (const [n, g] of Object.entries(AUSGENOMMEN)) console.log(`     ${n} — ${g}`);

if (funde.length === 0) {
  console.log("\n  ✅ Kein verzeichnetes Werkstatt-Wort in einem Spielertext.");
  console.log("  ⚠️ Das heißt NICHT „Ton in Ordnung\" — über den Ton urteilt nur");
  console.log("     ein Mensch (die vier Probefragen in `docs/tonfall.md`).");
} else {
  console.log(`\n  🔴 ${funde.length} Fund${funde.length === 1 ? "" : "e"}\n`);
  for (const f of funde) {
    console.log(`  ${f.datei}:${f.zeile}`);
    console.log(`     „${f.text}"`);
    console.log(`     → „${f.wort}": ${f.grund}\n`);
  }
  console.log("  🔴 Zwei Wege, und nur zwei: das Wort ersetzen — oder es mit einem");
  console.log("     Satz in `SPIELSPRACHE` eintragen, wenn es unser Wort FÜR die");
  console.log("     Spieler ist. Ein dritter Weg wäre das Abschalten der Prüfung.");
}
console.log("");

// ── Die Schlusszeile für den Sammel-Lauf ────────────────────
// ⚠️ Der Import steht unten und nicht oben: ESM hebt ihn ohnehin, und ein
// Einfügen weiter oben zerreißt mehrzeilige Import-Blöcke.
import { melde } from "./abnahme.mjs";
melde("worte", funde.length);
