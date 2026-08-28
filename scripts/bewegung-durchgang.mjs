// ============================================================
//  BEWEGUNGS-DURCHGANG — kostet eine Animation Rechenzeit?
//
//  Aufruf:  npm run bewegung
//
//  🔴 Andis Frage vom 25.08.2026: „das verschlechtert doch die Performance
//  der App nicht oder?" — und die ehrliche Antwort ist: es KOMMT DARAUF AN,
//  WAS bewegt wird. Genau das misst dieser Durchgang, damit die Antwort nicht
//  bei jeder neuen Animation neu geraten werden muss.
//
//  ── Die drei Klassen, und der Unterschied ist groß ──
//
//  1. GRATIS (Compositor).  `transform` und `opacity` werden von der
//     Grafikkarte auf einer eigenen Ebene erledigt. Der Hauptthread ist nicht
//     beteiligt — die Animation läuft weiter, während Javascript rechnet.
//
//  2. TEUER (Paint).  `box-shadow`, `background-color`, `color`, `filter`:
//     der Browser muss die Fläche neu MALEN. Auf kleinen Flächen (ein Knopf)
//     unmerklich, auf großen (eine ganze Karte, ein Bildschirm) sichtbar.
//
//  3. RICHTIG TEUER (Layout).  `width`, `height`, `top`, `margin`, `padding`,
//     `font-size`: der Browser muss die Seite NEU AUSMESSEN, und zwar bei
//     JEDEM Einzelbild. Das ist die Sorte Animation, die ein Telefon ruckeln
//     lässt — und die man dem Code nicht ansieht, weil sie genauso aussieht
//     wie die gratis Variante.
//
//  ⚠️ Der Durchgang verbietet Klasse 2 NICHT. Ein Knopf, der beim Drücken
//  seinen Schatten ändert, ist genau die Rückmeldung, die Andi wollte. Er
//  meldet sie nur, damit sie eine Entscheidung bleibt statt einer Gewohnheit.
//  Klasse 3 dagegen ist ein FEHLER — für alles, was sie kann, gibt es einen
//  Weg über `transform`.
//
//  ⚠️ Zweite Prüfung, die genauso wichtig ist: jede Animation muss über die
//  Dauer-Variablen laufen. Nur die werden von `prefers-reduced-motion` auf
//  1ms gesetzt — eine fest eingetragene Dauer läuft trotzdem, und dann hilft
//  die Einstellung am Gerät nicht mehr.
// ============================================================
import { readFileSync } from "node:fs";

const DATEI = "src/app/globals.css";
const css = readFileSync(DATEI, "utf8");

const GRATIS = ["transform", "opacity"];
const PAINT = [
  "box-shadow", "background-color", "background", "color", "border-color",
  "filter", "backdrop-filter", "outline-color", "text-shadow", "background-position",
];
const LAYOUT = [
  "width", "height", "min-width", "min-height", "max-width", "max-height",
  "top", "left", "right", "bottom", "margin", "margin-top", "margin-left",
  "margin-right", "margin-bottom", "padding", "padding-top", "padding-left",
  "padding-right", "padding-bottom", "font-size", "line-height", "border-width",
  "flex-basis", "gap", "grid-template-columns",
];

const klasse = (prop) =>
  GRATIS.includes(prop) ? "gratis"
  : LAYOUT.includes(prop) ? "layout"
  : PAINT.includes(prop) ? "paint"
  : "sonstige";

// ── 1. Keyframes: welche Eigenschaften stehen darin? ────────
const keyframes = [];
const kfRe = /@keyframes\s+([\w-]+)\s*\{/g;
let m;
while ((m = kfRe.exec(css))) {
  // Bis zur schließenden Klammer des Blocks (Keyframes haben eine Ebene mehr).
  let tiefe = 1, i = kfRe.lastIndex;
  while (i < css.length && tiefe > 0) {
    if (css[i] === "{") tiefe++;
    else if (css[i] === "}") tiefe--;
    i++;
  }
  const koerper = css.slice(kfRe.lastIndex, i - 1);
  // 🔴 NICHT `/^\s*([a-z-]+)\s*:/gm` — der erste Bau stand genau so da und
  // hat bei der Probe NICHTS gefunden: `from { height: 0; margin-top: 20px; }`
  // in EINER Zeile hat nur einen Zeilenanfang, also griff der Anker `^` nur
  // einmal. Die vorhandenen Keyframes sind zufällig alle mehrzeilig — der
  // Wächter sah deshalb grün aus, obwohl er blind war.
  //
  // Jetzt: die inneren Blöcke (`from {…}`, `50% {…}`) einzeln aufmachen und
  // an `;` zerlegen. Unabhängig von der Formatierung.
  const props = new Set();
  for (const block of koerper.matchAll(/\{([^{}]*)\}/g)) {
    for (const zeile of block[1].split(";")) {
      const t = /^\s*([a-z-]+)\s*:/.exec(zeile);
      if (t) props.add(t[1]);
    }
  }
  keyframes.push({ name: m[1], props: [...props] });
}

// ── 2. transition-Deklarationen ─────────────────────────────
const transitions = [];
for (const t of css.matchAll(/transition:\s*([^;]+);/g)) {
  const props = t[1]
    .split(",")
    .map((teil) => teil.trim().split(/\s+/)[0])
    .filter((p) => p && p !== "all" && p !== "none");
  const alle = /(^|,)\s*all\s/.test(t[1] + " ");
  transitions.push({ props, alle, text: t[1].replace(/\s+/g, " ").trim().slice(0, 60) });
}

// ── 3. Dauern ohne Variable ─────────────────────────────────
// `animation:` und `transition:` mit einer fest eingetragenen Zeit.
//
// ⚠️ MIT AUSNAHME, und die war der erste Fund dieses Durchgangs — an ihm
// selbst: eine DAUERSCHLEIFE (`infinite`) darf keine Variablen-Dauer haben.
// Auf 1ms gesetzt würde ein Lade-Puls nicht ruhig, sondern zum Flackern. Für
// die steht deshalb ein ausdrückliches `animation: none` im
// `prefers-reduced-motion`-Block — und genau das muss der Durchgang erkennen,
// sonst meldet er zwei Fehlalarme und man gewöhnt sich das Wegsehen an.
//
// Ein Wächter, der falsch meldet, ist schlimmer als keiner: nach dem dritten
// Fehlalarm liest ihn niemand mehr.
const reduziertBlock = (() => {
  const i = css.indexOf("@media (prefers-reduced-motion: reduce)");
  if (i < 0) return "";
  let tiefe = 0, j = css.indexOf("{", i), start = j;
  do {
    if (css[j] === "{") tiefe++;
    else if (css[j] === "}") tiefe--;
    j++;
  } while (j < css.length && tiefe > 0);
  return css.slice(start, j);
})();
// Welche Animationsnamen werden dort ausdrücklich abgeschaltet? Gesucht wird
// der Regelblock mit `animation: none` und dann sein Selektor.
// ⚠️ Kommentare vorher raus: `/* … */` vor einem Selektor landet sonst mit im
// Treffer, und `.tqs-skelett::after` wurde deshalb nicht wiedererkannt —
// derselbe Fehlalarm, den dieser Block eigentlich verhindern soll.
const ohneKommentare = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "");
const abgeschaltet = new Set();
for (const r of ohneKommentare(reduziertBlock).matchAll(/([^{}]+)\{[^{}]*animation:\s*none[^{}]*\}/g)) {
  // Nur die letzte Zeile: davor kann der Rest der vorigen Regel stehen.
  abgeschaltet.add(r[1].trim().split("\n").at(-1).trim());
}

const festeDauern = [];
for (const a of css.matchAll(/(animation|transition):\s*([^;]+);/g)) {
  const wert = a[2];
  if (/var\(--tqs-dauer/.test(wert) || !/\d+(ms|s)\b/.test(wert)) continue;
  // Zu welchem Selektor gehört diese Deklaration? Der letzte `{` davor.
  const davor = ohneKommentare(css.slice(0, a.index));
  const selektor = (davor.slice(davor.lastIndexOf("}") + 1).split("{")[0] || "")
    .trim().split("\n").at(-1).trim();
  const istSchleife = /\binfinite\b/.test(wert);
  const gedeckt = [...abgeschaltet].some((sel) => sel === selektor);
  if (istSchleife && gedeckt) continue;   // ausdrücklich abgeschaltet — in Ordnung
  festeDauern.push({
    art: a[1],
    text: wert.replace(/\s+/g, " ").trim().slice(0, 70),
    selektor,
    grund: istSchleife
      ? "Dauerschleife OHNE `animation: none` im reduced-motion-Block"
      : "feste Dauer statt `var(--tqs-dauer*)`",
  });
}

// ── Auswertung ──────────────────────────────────────────────
const zaehler = { gratis: 0, paint: 0, layout: 0, sonstige: 0 };
const layoutFunde = [];
const paintFunde = [];

for (const kf of keyframes) {
  for (const p of kf.props) {
    const k = klasse(p);
    zaehler[k]++;
    if (k === "layout") layoutFunde.push(`@keyframes ${kf.name} → ${p}`);
    if (k === "paint") paintFunde.push(`@keyframes ${kf.name} → ${p}`);
  }
}
for (const tr of transitions) {
  for (const p of tr.props) {
    const k = klasse(p);
    zaehler[k]++;
    if (k === "layout") layoutFunde.push(`transition → ${p}  (${tr.text})`);
    if (k === "paint") paintFunde.push(`transition → ${p}`);
  }
}

const trennlinie = "=".repeat(88);
console.log(`\n${trennlinie}`);
console.log("  BEWEGUNGS-DURCHGANG — was kostet die Bewegung in dieser App?");
console.log(`  ${DATEI} · ${keyframes.length} Keyframes · ${transitions.length} Übergänge`);
console.log(trennlinie);

console.log(`
  gratis (Compositor: transform/opacity) : ${zaehler.gratis}
  Paint  (neu malen, kleine Flächen ok)  : ${zaehler.paint}
  LAYOUT (neu ausmessen — vermeiden)     : ${zaehler.layout}
  sonstige (nicht eingeordnet)           : ${zaehler.sonstige}`);

let fehler = 0;

if (layoutFunde.length) {
  fehler++;
  console.log(`\n  🔴 ${layoutFunde.length} ANIMATION(EN) LÖSEN NEUES AUSMESSEN AUS`);
  console.log("     Das ist die Sorte, die auf dem Telefon ruckelt — und man sieht");
  console.log("     es dem Code nicht an. Für alles davon gibt es einen Weg über");
  console.log("     `transform` (scale statt width, translate statt top/left).");
  for (const f of layoutFunde) console.log(`     · ${f}`);
} else {
  console.log("\n  ✅ Keine Animation löst neues Ausmessen aus.");
}

const ALLES_ERLAUBT = new Set(["tqs-aktion"]);
const allTransitions = transitions.filter((t) => t.alle);
if (allTransitions.length) {
  console.log(`\n  ⚠️  ${allTransitions.length}× \`transition: all\` — bewegt auch, was niemand bewegen wollte.`);
  for (const t of allTransitions) console.log(`     · ${t.text}`);
}

if (festeDauern.length) {
  fehler++;
  console.log(`\n  🔴 ${festeDauern.length} DAUER(N) OHNE VARIABLE`);
  console.log("     `prefers-reduced-motion` setzt NUR die `--tqs-dauer*`-Variablen");
  console.log("     auf 1ms. Eine fest eingetragene Zeit läuft trotzdem — wer am");
  console.log("     Gerät „Bewegung reduzieren\" eingeschaltet hat, bekommt sie");
  console.log("     trotzdem zu sehen. Ausnahme: eine Dauerschleife (`infinite`)");
  console.log("     darf eine feste Zeit haben, wenn sie im reduced-motion-Block");
  console.log("     ausdrücklich mit `animation: none` abgeschaltet wird.");
  for (const f of festeDauern) console.log(`     · ${f.selektor || "?"} — ${f.grund}\n       ${f.art}: ${f.text}`);
} else {
  console.log("  ✅ Jede Dauer läuft über eine Variable — „Bewegung reduzieren\" greift überall.");
}

if (paintFunde.length) {
  console.log(`\n  ℹ️  ${paintFunde.length}× Paint — erlaubt, aber eine Entscheidung:`);
  for (const f of [...new Set(paintFunde)].slice(0, 12)) console.log(`     · ${f}`);
  console.log("     Auf einem Knopf unmerklich. Auf einer bildschirmfüllenden");
  console.log("     Fläche sichtbar — dort lieber eine Ebene mit `opacity` darüber.");
}

console.log(`\n${trennlinie}\n`);

// ── Die Schlusszeile für den Sammel-Lauf ────────────────────
// ⚠️ Der Import steht hier unten und nicht oben: ESM hebt ihn ohnehin, und
// ein Einfügen weiter oben zerreißt mehrzeilige Import-Blöcke.
import { melde } from "./abnahme.mjs";
// ⚠️ Hier stand ein `process.exit(fehler ? 1 : 0)` — es schnitt die
// Schlusszeile ab, BEVOR sie geschrieben war. `melde` setzt stattdessen
// `process.exitCode`; der Rückgabewert bleibt derselbe, die Ausgabe kommt
// vollständig an. Genau dafür gibt es die Unterscheidung.
melde("bewegung", fehler ? Math.max(1, layoutFunde.length + festeDauern.length) : 0);
