// ============================================================
//  .docx LESEN — Andis Word-Entwürfe als Text
//
//  🔴 Warum das hier steht (20.08.2026): Andi baut den Aufbau der Screens in
//  Word. Der naheliegende Weg wäre PDF — der geht NICHT: auf diesem Rechner
//  fehlt der Renderer, und ein exportiertes PDF ist innen häufig nur ein
//  Haufen Bitmaps ohne Textebene (steht in CLAUDE.md bei den Werkzeug-Fallen,
//  am Canva-Logo durchexerziert).
//
//  Eine .docx dagegen ist ein ZIP mit XML darin. Überschriften, Absätze,
//  Listen und TABELLEN kommen sauber heraus — und Tabellen sind genau das,
//  was „Blöcke und Text" braucht.
//
//  ⚠️ Was NICHT herauskommt: gezeichnete Formen und Textfelder. Wer Kästen
//  malt, bekommt leere Stellen. Deshalb: Blöcke als TABELLENZEILEN anlegen,
//  nicht als Rechtecke.
//
//  ⚠️ Bewusst OHNE PowerShell und ohne npm-Paket. Der erste Anlauf rief
//  `System.IO.Compression` über die PowerShell auf — daran sind die
//  Anführungszeichen gescheitert, gleich zweimal. Ein ZIP-Verzeichnis von Hand
//  zu lesen sind dreißig Zeilen und hat keine Zitier-Ebene dazwischen.
//
//  Aufruf:  node scripts/lies-docx.mjs <datei.docx>
// ============================================================
import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";

const datei = process.argv[2];
if (!datei) {
  console.error("Aufruf: node scripts/lies-docx.mjs <datei.docx>");
  process.exit(1);
}

// ── Eine einzelne Datei aus dem ZIP holen ───────────────────────────────
// Gesucht wird über das zentrale Verzeichnis am Dateiende, nicht durch
// Durchsuchen des Rohtextes: nur dort stehen die Namen zuverlässig.
function ausZip(buf, gesucht) {
  // Ende des zentralen Verzeichnisses (EOCD) rückwärts suchen. Der Kommentar
  // am Dateiende darf bis 65535 Bytes lang sein — daher der Suchbereich.
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("Kein ZIP — das ist keine .docx.");

  const anzahl = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);

  for (let n = 0; n < anzahl; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const methode = buf.readUInt16LE(p + 10);
    const gepackt = buf.readUInt32LE(p + 20);
    const roh = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const kommLen = buf.readUInt16LE(p + 32);
    const lokal = buf.readUInt32LE(p + 42);
    // Rückstriche zulassen: manche Packer schreiben Windows-Trenner.
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen).replace(/\\/g, "/");

    if (name === gesucht) {
      // Im lokalen Kopf stehen EIGENE Längen für Name und Extra — die weichen
      // regelmäßig von denen im Verzeichnis ab. Wer die aus dem Verzeichnis
      // nimmt, landet mitten im Datenstrom.
      const lNameLen = buf.readUInt16LE(lokal + 26);
      const lExtraLen = buf.readUInt16LE(lokal + 28);
      const start = lokal + 30 + lNameLen + lExtraLen;
      const daten = buf.subarray(start, start + (methode === 0 ? roh : gepackt));
      return methode === 0 ? daten : inflateRawSync(daten);
    }
    p += 46 + nameLen + extraLen + kommLen;
  }
  throw new Error(`"${gesucht}" fehlt — ist das wirklich eine .docx?`);
}

const xml = ausZip(readFileSync(datei), "word/document.xml").toString("utf8");

// 🔴 Word legt Textfelder ZWEIMAL ab: einmal in <mc:Choice> (die moderne
// Form) und einmal in <mc:Fallback> für alte Word-Versionen. Ohne diesen
// Schnitt kommt jeder Kasten doppelt heraus — genau das passierte bei Andis
// erstem Entwurf am 20.08.2026, jede Zeile stand zweimal da.
const bereinigt = xml.replace(/<mc:Fallback>[\s\S]*?<\/mc:Fallback>/g, "");

const entschaerfe = (t) => t
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

// ── Textfelder nach ihrer LAGE sortieren ────────────────────────────────
// 🔴 Ein frei gesetztes Textfeld steht im XML dort, wo es EINGEFÜGT wurde —
// nicht dort, wo es auf der Seite liegt. Wer das ignoriert, liest einen
// Bildschirmentwurf in der Reihenfolge, in der Andi die Kästen gemalt hat.
// Genau das passierte beim ersten Entwurf: die Variantenwahl stand unten,
// obwohl sie oben auf dem Bildschirm liegt.
//
// `wp:positionV` trägt den Abstand von oben in EMU (914400 pro Zoll). Danach
// wird sortiert; der Wert wird mit ausgegeben, damit man einer krummen
// Reihenfolge ansieht, dass sie krumm ist.
function textfelder(quelle) {
  const kaesten = [];
  for (const m of quelle.matchAll(/<wp:anchor[\s\S]*?<\/wp:anchor>/g)) {
    const block = m[0];
    const y = block.match(/<wp:positionV[^>]*>[\s\S]*?<wp:posOffset>(-?\d+)</);
    const text = [...block.matchAll(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/g)]
      .map((t) => entschaerfe(t[1])).join("").trim();
    if (text) kaesten.push({ y: y ? Number(y[1]) : 0, text });
  }
  return kaesten.sort((a, b) => a.y - b.y);
}

// ── Absätze einzeln einsammeln ──────────────────────────────────────────
// Absatzweise statt am Stück: sonst klebt das ganze Dokument zu einer Zeile
// zusammen und die Gliederung — genau das Interessante — wäre weg.
const kaesten = textfelder(bereinigt);
// Was in einem Textfeld steckt, darf im Fließtext-Durchgang nicht nochmal
// auftauchen — sonst steht wieder alles doppelt da.
const ohneKaesten = bereinigt.replace(/<wp:anchor[\s\S]*?<\/wp:anchor>/g, "");

const zeilen = [];
let inTabelle = false;
for (const stueck of ohneKaesten.split(/(?=<w:p[ >]|<w:tbl[ >]|<\/w:tbl>)/)) {
  if (/^<w:tbl[ >]/.test(stueck)) inTabelle = true;
  if (stueck.startsWith("</w:tbl>")) { inTabelle = false; zeilen.push(""); }
  if (!/^<w:p[ >]/.test(stueck)) continue;

  const text = [...stueck.matchAll(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/g)]
    .map((m) => entschaerfe(m[1])).join("").trim();
  if (!text) continue;

  // ⚠️ Das Muster braucht `(?: [^>]*)?` — `<w:t[^>]*>` passt sonst auch auf
  // `<w:txbxContent>`, und dann landet roher XML-Salat im Text.
  // „Heading1" im englischen Word, „Überschrift1" im deutschen. Das Ü kommt je
  // nach Fassung anders kodiert an — deshalb wird nur der Rest geprüft.
  const ueberschrift = /w:pStyle w:val="(Heading|[^"]*berschrift)/.test(stueck);
  const liste = /<w:numPr[ >]/.test(stueck);

  if (ueberschrift) zeilen.push("", `## ${text}`);
  else if (inTabelle) zeilen.push(`  | ${text}`);
  else if (liste) zeilen.push(`  - ${text}`);
  else zeilen.push(text);
}

const fliess = zeilen.join("\n").replace(/\n{3,}/g, "\n\n").trim();
if (fliess) console.log(fliess);

if (kaesten.length) {
  console.log(`\n── ${kaesten.length} Textfelder, von oben nach unten ──`);
  for (const k of kaesten) {
    const cm = (k.y / 360000).toFixed(1).padStart(5);
    console.log(`${cm} cm  ${k.text}`);
  }
}
