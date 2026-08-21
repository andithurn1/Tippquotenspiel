// ============================================================
//  .pptx LESEN — Andis Struktur-Folien, MIT Anordnung
//
//  🔴 Andi am 21.08.2026: „ich habe auch versucht, die Klicks bzw. die sich
//  öffnenden Fenster rechts von dem Trennstrich angeordnet."
//
//  ⚠️ Genau deshalb reicht der reine Text NICHT. Bei einer Folie, auf der die
//  ANORDNUNG die Aussage trägt, ist eine Textliste die halbe Information: „was
//  steht drauf" ohne „was gehört zu was". Dieses Skript liest deshalb zu jedem
//  Kasten seine Lage und sortiert nach Spalte, dann nach Höhe.
//
//  Aufbau wie beim .docx-Leser: ein ZIP mit XML darin, Text in `<a:t>`, die
//  Lage in `<a:off x= y=>` (EMU, 914400 pro Zoll). Kein npm-Paket.
//
//  Aufruf:  node scripts/lies-pptx.mjs <datei.pptx> [--roh]
// ============================================================
import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";

const datei = process.argv[2];
const roh = process.argv.includes("--roh");
if (!datei) {
  console.error("Aufruf: node scripts/lies-pptx.mjs <datei.pptx> [--roh]");
  process.exit(1);
}

// ── ZIP-Verzeichnis lesen (identisch zu lies-docx.mjs) ──────
function zipEintraege(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("Kein ZIP — das ist keine .pptx.");
  const anzahl = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = new Map();
  for (let n = 0; n < anzahl; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const methode = buf.readUInt16LE(p + 10);
    const gepackt = buf.readUInt32LE(p + 20);
    const entpackt = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const kommLen = buf.readUInt16LE(p + 32);
    const lokal = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen).replace(/\\/g, "/");
    out.set(name, () => {
      // Eigene Längen im lokalen Kopf — siehe Kommentar in lies-docx.mjs.
      const lNameLen = buf.readUInt16LE(lokal + 26);
      const lExtraLen = buf.readUInt16LE(lokal + 28);
      const start = lokal + 30 + lNameLen + lExtraLen;
      const daten = buf.subarray(start, start + (methode === 0 ? entpackt : gepackt));
      return (methode === 0 ? daten : inflateRawSync(daten)).toString("utf8");
    });
    p += 46 + nameLen + extraLen + kommLen;
  }
  return out;
}

const entschaerfe = (t) => t
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

const EMU_PRO_CM = 360000;

// ── Ein Kasten (Form) je `<p:sp>` ───────────────────────────
function formen(xml) {
  const out = [];
  for (const m of xml.matchAll(/<p:sp>[\s\S]*?<\/p:sp>/g)) {
    const block = m[0];
    // Absatzweise, damit mehrzeilige Kästen ihre Zeilen behalten.
    const zeilen = [];
    for (const abs of block.split(/<a:p[ >]/).slice(1)) {
      const t = [...abs.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)]
        .map((x) => entschaerfe(x[1])).join("").trim();
      if (t) zeilen.push(t);
    }
    if (!zeilen.length) continue;
    const off = block.match(/<a:off x="(-?\d+)" y="(-?\d+)"\/>/);
    const ext = block.match(/<a:ext cx="(\d+)" cy="(\d+)"\/>/);
    out.push({
      text: zeilen,
      x: off ? Number(off[1]) : 0,
      y: off ? Number(off[2]) : 0,
      w: ext ? Number(ext[1]) : 0,
      h: ext ? Number(ext[2]) : 0,
    });
  }
  return out;
}

// ── Linien und Pfeile (`<p:cxnSp>`) ─────────────────────────
// Ein senkrechter Strich ist bei Andi die TRENNLINIE — er entscheidet, was
// „links" und was „rechts" heißt. Ihn zu ignorieren hieße, die Gliederung der
// Folie zu verlieren.
function verbinder(xml) {
  const out = [];
  for (const m of xml.matchAll(/<p:cxnSp>[\s\S]*?<\/p:cxnSp>/g)) {
    const off = m[0].match(/<a:off x="(-?\d+)" y="(-?\d+)"\/>/);
    const ext = m[0].match(/<a:ext cx="(\d+)" cy="(\d+)"\/>/);
    if (!off || !ext) continue;
    const w = Number(ext[1]), h = Number(ext[2]);
    out.push({
      x: Number(off[1]), y: Number(off[2]), w, h,
      senkrecht: h > w * 3,
      waagerecht: w > h * 3,
    });
  }
  return out;
}

const eintraege = zipEintraege(readFileSync(datei));
const folienNamen = [...eintraege.keys()]
  .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

// Folienbreite aus der Präsentation, sonst 16:9 in EMU.
let breite = 12192000;
if (eintraege.has("ppt/presentation.xml")) {
  const m = eintraege.get("ppt/presentation.xml")().match(/sldSz cx="(\d+)"/);
  if (m) breite = Number(m[1]);
}

console.log(`${folienNamen.length} Folien · Breite ${(breite / EMU_PRO_CM).toFixed(1)} cm\n`);

for (const name of folienNamen) {
  const xml = eintraege.get(name)();
  const kaesten = formen(xml);
  const striche = verbinder(xml);
  const nr = name.match(/\d+/)[0];

  // Die Trennlinie: der senkrechte Strich am weitesten links, sonst die Mitte.
  const senkrecht = striche.filter((s) => s.senkrecht).sort((a, b) => a.x - b.x);
  const trenner = senkrecht.length ? senkrecht[0].x : null;
  const grenze = trenner ?? breite / 2;

  console.log(`${"═".repeat(74)}`);
  console.log(`FOLIE ${nr}${trenner !== null
    ? `  · Trennlinie bei ${(trenner / EMU_PRO_CM).toFixed(1)} cm`
    : "  · keine Trennlinie gefunden"}`);
  console.log("═".repeat(74));

  const links = kaesten.filter((k) => k.x + k.w / 2 < grenze).sort((a, b) => a.y - b.y || a.x - b.x);
  const rechts = kaesten.filter((k) => k.x + k.w / 2 >= grenze).sort((a, b) => a.y - b.y || a.x - b.x);

  const zeige = (titel, liste) => {
    if (!liste.length) return;
    console.log(`\n── ${titel} ──`);
    for (const k of liste) {
      const pos = roh
        ? `[${(k.x / EMU_PRO_CM).toFixed(1)}/${(k.y / EMU_PRO_CM).toFixed(1)} cm] `
        : `${(k.y / EMU_PRO_CM).toFixed(1).padStart(5)} cm  `;
      console.log(pos + k.text.join(" ⏎ "));
    }
  };

  zeige(trenner !== null ? "LINKS vom Strich" : "linke Hälfte", links);
  zeige(trenner !== null ? "RECHTS vom Strich" : "rechte Hälfte", rechts);

  const pfeile = striche.filter((s) => s.waagerecht);
  if (pfeile.length) console.log(`\n(${pfeile.length} waagerechte Verbindung(en) — vermutlich Klick-Pfeile)`);
  console.log("");
}
