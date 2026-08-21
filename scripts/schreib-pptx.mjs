// ============================================================
//  .pptx SCHREIBEN — Folien in ANDIS Datei füllen
//
//  🔴 Andi am 21.08.2026: „kannst nicht du erstmal ne PowerPoint für den Rest
//  bauen so wie mein System und ich muss dann nur noch anpassen?"
//
//  ⚠️ Bewusst KEINE neue Präsentation von Grund auf. Andis Datei bringt Thema,
//  Layouts, Folienmaß (19,1 × 33,9 cm) und — entscheidend — auf jeder leeren
//  Folie bereits den senkrechten TRENNSTRICH mit. Eine selbst gebaute Datei
//  hätte davon nichts und sähe fremd aus; er müsste sie erst wieder an sein
//  System angleichen, also genau das Gegenteil seiner Bitte.
//
//  Gefüllt werden deshalb nur die leeren Folien 3 ff., indem Formen vor
//  `</p:spTree>` eingefügt werden. Folie 1 und 2 bleiben unangetastet.
//
//  ⚠️ Geschrieben wird in eine NEUE Datei. Andis Original zu überschreiben
//  wäre unumkehrbar — und wenn mein Aufbau danebenliegt, hätte er seine
//  eigenen zwei Folien mit verloren.
// ============================================================
import { readFileSync, writeFileSync } from "node:fs";
import { inflateRawSync, deflateRawSync } from "node:zlib";

const CM = 360000;

// ── ZIP lesen (wie in lies-pptx.mjs) und schreiben ──────────
const CRC_TAB = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TAB[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

export function leseZip(pfad) {
  const buf = readFileSync(pfad);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("Kein ZIP.");
  const anzahl = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const dateien = [];
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
    const lNameLen = buf.readUInt16LE(lokal + 26);
    const lExtraLen = buf.readUInt16LE(lokal + 28);
    const start = lokal + 30 + lNameLen + lExtraLen;
    const rohDaten = buf.subarray(start, start + (methode === 0 ? entpackt : gepackt));
    dateien.push({ name, daten: methode === 0 ? Buffer.from(rohDaten) : inflateRawSync(rohDaten) });
    p += 46 + nameLen + extraLen + kommLen;
  }
  return dateien;
}

export function schreibeZip(pfad, dateienRoh) {
  // 🔴 `[Content_Types].xml` MUSS der erste Eintrag sein — das verlangt die
  // OPC-Spezifikation, auf der Office aufsetzt. .NET und mein eigener Leser
  // stören sich nicht daran, PowerPoint schon: es meldete nur „konnte die
  // Datei nicht öffnen", ohne zu sagen, warum (21.08.2026).
  //
  // ⚠️ Die Falle dabei: `leseZip` liefert die Reihenfolge des ZENTRALEN
  // VERZEICHNISSES, und die weicht von der physischen Reihenfolge ab. In Andis
  // Original steht dort `ppt/presentation.xml` vorn — wer sie einfach
  // übernimmt, schreibt eine Datei, die kein Office mehr öffnet.
  const dateien = [...dateienRoh].sort((a, b) =>
    (a.name === "[Content_Types].xml" ? -1 : 0) - (b.name === "[Content_Types].xml" ? -1 : 0));
  const lokale = [];
  const verzeichnis = [];
  let versatz = 0;
  for (const { name, daten } of dateien) {
    const nameBuf = Buffer.from(name, "utf8");
    const gepackt = deflateRawSync(daten, { level: 6 });
    const crc = crc32(daten);
    const kopf = Buffer.alloc(30);
    kopf.writeUInt32LE(0x04034b50, 0);
    kopf.writeUInt16LE(20, 4);
    kopf.writeUInt16LE(8, 8);           // Methode 8 = deflate
    kopf.writeUInt32LE(crc, 14);
    kopf.writeUInt32LE(gepackt.length, 18);
    kopf.writeUInt32LE(daten.length, 22);
    kopf.writeUInt16LE(nameBuf.length, 26);
    lokale.push(kopf, nameBuf, gepackt);

    const e = Buffer.alloc(46);
    e.writeUInt32LE(0x02014b50, 0);
    e.writeUInt16LE(20, 4);
    e.writeUInt16LE(20, 6);
    e.writeUInt16LE(8, 10);
    e.writeUInt32LE(crc, 16);
    e.writeUInt32LE(gepackt.length, 20);
    e.writeUInt32LE(daten.length, 24);
    e.writeUInt16LE(nameBuf.length, 28);
    e.writeUInt32LE(versatz, 42);
    verzeichnis.push(e, nameBuf);
    versatz += 30 + nameBuf.length + gepackt.length;
  }
  const vz = Buffer.concat(verzeichnis);
  const ende = Buffer.alloc(22);
  ende.writeUInt32LE(0x06054b50, 0);
  ende.writeUInt16LE(dateien.length, 8);
  ende.writeUInt16LE(dateien.length, 10);
  ende.writeUInt32LE(vz.length, 12);
  ende.writeUInt32LE(versatz, 16);
  writeFileSync(pfad, Buffer.concat([Buffer.concat(lokale), vz, ende]));
}


// 🔴 EMU MÜSSEN GANZE ZAHLEN SEIN. `2.2 * 360000` ergibt in JavaScript
// 792000.0000000001, und PowerPoint lehnt die ganze Datei ab — ohne zu sagen,
// warum: „PowerPoint konnte die Datei nicht öffnen." Nichts deutet auf eine
// Nachkommastelle hin.
//
// ⚠️ Gefunden am 21.08.2026 nur durch Vergleich einer laufenden mit einer
// kaputten Fassung. Das XML war wohlgeformt, das ZIP gültig, .NET las beides
// anstandslos — der Unterschied waren zwölf Nachkommastellen. Deshalb geht
// JEDE Koordinate durch `ganz()`, auch wo sie schon ganzzahlig aussieht.
const ganz = (n) => Math.round(Number(n) || 0);

// ── Formen bauen ────────────────────────────────────────────
const esc = (t) => String(t ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Absätze eines Textkörpers. `groesse` in Zehntelpunkten (1200 = 12 pt).
function absaetze(zeilen, groesse, fett) {
  return zeilen.map((z, i) => `<a:p><a:r><a:rPr lang="de-DE" sz="${
    i === 0 ? groesse : Math.round(groesse * 0.82)
  }"${i === 0 && fett ? ' b="1"' : ""} dirty="0"/><a:t>${esc(z)}</a:t></a:r></a:p>`).join("");
}

// Ein Kasten mit Rahmen. `ton`:
//   "normal"  — wie Andis abgerundete Rechtecke (accent4)
//   "auftrag" — ORANGE. Das ist die Verabredung vom 21.08.2026: orange heißt
//               „umsetzen", und deshalb wird hier ausdrücklich accent2 gefüllt
//               statt nur der Stil-Verweis gesetzt — ein Stil-Verweis würde
//               beim Themenwechsel mitwandern, die Bedeutung aber nicht.
export function kasten({ id, x, y, w, h, zeilen, ton = "normal", groesse = 1200 }) {
  const akzent = ton === "auftrag" ? "accent2" : "accent4";
  const fuellung = ton === "auftrag"
    ? `<a:solidFill><a:schemeClr val="accent2"><a:lumMod val="20000"/><a:lumOff val="80000"/></a:schemeClr></a:solidFill>`
    + `<a:ln w="19050"><a:solidFill><a:schemeClr val="accent2"/></a:solidFill></a:ln>`
    : "";
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Kasten ${id}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>`
    + `<p:spPr><a:xfrm><a:off x="${ganz(x)}" y="${ganz(y)}"/><a:ext cx="${ganz(w)}" cy="${ganz(h)}"/></a:xfrm>`
    + `<a:prstGeom prst="roundRect"><a:avLst/></a:prstGeom>${fuellung}</p:spPr>`
    + `<p:style><a:lnRef idx="1"><a:schemeClr val="${akzent}"/></a:lnRef>`
    + `<a:fillRef idx="${ton === "auftrag" ? 0 : 2}"><a:schemeClr val="${akzent}"/></a:fillRef>`
    + `<a:effectRef idx="0"><a:schemeClr val="${akzent}"/></a:effectRef>`
    + `<a:fontRef idx="minor"><a:schemeClr val="dk1"/></a:fontRef></p:style>`
    + `<p:txBody><a:bodyPr wrap="square" lIns="91440" tIns="45720" rIns="91440" bIns="45720" anchor="ctr"><a:normAutofit/></a:bodyPr><a:lstStyle/>`
    + absaetze(zeilen, groesse, true)
    + `</p:txBody></p:sp>`;
}

// Reiner Text ohne Rahmen — für Erklärsätze.
export function text({ id, x, y, w, h, zeilen, groesse = 1100 }) {
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Text ${id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>`
    + `<p:spPr><a:xfrm><a:off x="${ganz(x)}" y="${ganz(y)}"/><a:ext cx="${ganz(w)}" cy="${ganz(h)}"/></a:xfrm>`
    + `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr>`
    + `<p:txBody><a:bodyPr wrap="square" anchor="t"><a:normAutofit/></a:bodyPr><a:lstStyle/>`
    + absaetze(zeilen, groesse, false)
    + `</p:txBody></p:sp>`;
}

// Pfeil — „dieses Element öffnet jenes Fenster".
//
// ⚠️ Er darf SCHRÄG laufen. Ein waagerechter Pfeil trifft auf der anderen
// Seite das, was zufällig auf gleicher Höhe steht — beim ersten Versuch am
// 21.08.2026 war das ein Auftragskasten statt des Fenstertitels. Ziel ist
// `y2`; `flipV` dreht ihn, wenn es nach oben geht.
export function pfeil({ id, x, y, w, y2 = null }) {
  const zielY = y2 === null ? y : y2;
  const hoehe = Math.abs(zielY - y);
  const oben = Math.min(y, zielY);
  const dreh = zielY < y ? ' flipV="1"' : "";
  return `<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="${id}" name="Pfeil ${id}"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr>`
    + `<p:spPr><a:xfrm${dreh}><a:off x="${ganz(x)}" y="${ganz(oben)}"/><a:ext cx="${ganz(w)}" cy="${ganz(hoehe)}"/></a:xfrm>`
    + `<a:prstGeom prst="straightConnector1"><a:avLst/></a:prstGeom>`
    + `<a:ln w="19050"><a:tailEnd type="triangle"/></a:ln></p:spPr>`
    + `<p:style><a:lnRef idx="2"><a:schemeClr val="accent1"/></a:lnRef>`
    + `<a:fillRef idx="0"><a:schemeClr val="accent1"/></a:fillRef>`
    + `<a:effectRef idx="1"><a:schemeClr val="accent1"/></a:effectRef>`
    + `<a:fontRef idx="minor"><a:schemeClr val="tx1"/></a:fontRef></p:style></p:cxnSp>`;
}

export { CM };
