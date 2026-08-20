// ============================================================
//  .docx SCHREIBEN — Gegenstück zu `lies-docx.mjs`
//
//  🔴 Warum selbst gebaut (21.08.2026): Andi arbeitet in Word, nicht in
//  Markdown. Ein Dokument „für ihn" muss also als .docx herauskommen, sonst
//  liegt es in einem Format, das er nicht bequem bearbeiten kann — und
//  Bearbeiten ist der Zweck: er soll hineinschreiben, streichen, umstellen.
//
//  Kein npm-Paket, aus demselben Grund wie beim Leser: eine .docx ist ein ZIP
//  mit XML darin, und der Schreiber dafür sind hundert Zeilen. Eine
//  Abhängigkeit, die bei jedem `npm install` mitkommt, wäre teurer.
//
//  ⚠️ Die Einträge werden UNKOMPRIMIERT abgelegt (Methode 0). Word akzeptiert
//  das; es spart die Deflate-Kopfrechnerei, und die Dokumente sind klein
//  genug, dass die Größe egal ist.
//
//  ⚠️ CRC32 muss stimmen, sonst hält Word die Datei für beschädigt und bietet
//  nur noch „Wiederherstellen" an. Das ist der einzige Teil, bei dem ein
//  Rechenfehler nicht auffällt, bis der Nutzer die Datei öffnet.
// ============================================================
import { writeFileSync } from "node:fs";

// ── CRC32 ───────────────────────────────────────────────────
const CRC_TAB = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TAB[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ── ZIP (nur „stored") ──────────────────────────────────────
function zip(dateien) {
  const lokale = [];
  const verzeichnis = [];
  let versatz = 0;

  for (const { name, daten } of dateien) {
    const nameBuf = Buffer.from(name, "utf8");
    const crc = crc32(daten);

    const kopf = Buffer.alloc(30);
    kopf.writeUInt32LE(0x04034b50, 0);
    kopf.writeUInt16LE(20, 4);          // benötigte Fassung
    kopf.writeUInt16LE(0, 6);           // Merker
    kopf.writeUInt16LE(0, 8);           // Methode 0 = unkomprimiert
    kopf.writeUInt32LE(crc, 14);
    kopf.writeUInt32LE(daten.length, 18);
    kopf.writeUInt32LE(daten.length, 22);
    kopf.writeUInt16LE(nameBuf.length, 26);
    lokale.push(kopf, nameBuf, daten);

    const eintrag = Buffer.alloc(46);
    eintrag.writeUInt32LE(0x02014b50, 0);
    eintrag.writeUInt16LE(20, 4);
    eintrag.writeUInt16LE(20, 6);
    eintrag.writeUInt16LE(0, 10);
    eintrag.writeUInt32LE(crc, 16);
    eintrag.writeUInt32LE(daten.length, 20);
    eintrag.writeUInt32LE(daten.length, 24);
    eintrag.writeUInt16LE(nameBuf.length, 28);
    eintrag.writeUInt32LE(versatz, 42);
    verzeichnis.push(eintrag, nameBuf);

    versatz += 30 + nameBuf.length + daten.length;
  }

  const vzBuf = Buffer.concat(verzeichnis);
  const ende = Buffer.alloc(22);
  ende.writeUInt32LE(0x06054b50, 0);
  ende.writeUInt16LE(dateien.length, 8);
  ende.writeUInt16LE(dateien.length, 10);
  ende.writeUInt32LE(vzBuf.length, 12);
  ende.writeUInt32LE(versatz, 16);

  return Buffer.concat([Buffer.concat(lokale), vzBuf, ende]);
}

// ── XML-Bausteine ───────────────────────────────────────────
const esc = (t) => String(t ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Fettdruck über **…** — bewusst nur das eine Zeichen, damit die Vorlagen
// lesbar bleiben und der Schreiber kein halber Markdown-Übersetzer wird.
function laeufe(text) {
  return String(text ?? "").split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((teil) => {
    const fett = teil.startsWith("**") && teil.endsWith("**");
    const roh = fett ? teil.slice(2, -2) : teil;
    return `<w:r>${fett ? "<w:rPr><w:b/></w:rPr>" : ""}`
      + `<w:t xml:space="preserve">${esc(roh)}</w:t></w:r>`;
  }).join("");
}

export const h1 = (t) => `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr>${laeufe(t)}</w:p>`;
export const h2 = (t) => `<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr>${laeufe(t)}</w:p>`;
export const h3 = (t) => `<w:p><w:pPr><w:pStyle w:val="Heading3"/></w:pPr>${laeufe(t)}</w:p>`;
export const p = (t = "") => `<w:p>${laeufe(t)}</w:p>`;
export const punkt = (t) => `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/>`
  + `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>${laeufe(t)}</w:p>`;

// Tabelle. `breiten` in Zwanzigstel-Punkten (1 cm ≈ 567).
export function tabelle(zeilen, breiten) {
  const zelle = (inhalt, w, kopf) =>
    `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>`
    + (kopf ? `<w:shd w:val="clear" w:fill="EFEFEF"/>` : "")
    + `</w:tcPr><w:p>${kopf ? `<w:pPr><w:rPr><w:b/></w:rPr></w:pPr>` : ""}`
    + laeufe(kopf ? `**${inhalt}**` : inhalt) + `</w:p></w:tc>`;
  const zeile = (spalten, kopf) =>
    `<w:tr>${spalten.map((c, i) => zelle(c, breiten[i], kopf)).join("")}</w:tr>`;
  return `<w:tbl><w:tblPr><w:tblStyle w:val="Raster"/>`
    + `<w:tblW w:w="0" w:type="auto"/>`
    + `<w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"]
      .map((s) => `<w:${s} w:val="single" w:sz="4" w:color="BFBFBF"/>`).join("")}`
    + `</w:tblBorders></w:tblPr>`
    + zeile(zeilen[0], true)
    + zeilen.slice(1).map((z) => zeile(z, false)).join("")
    + `</w:tbl>${p("")}`;
}

// ── Die Datei zusammensetzen ────────────────────────────────
const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="21"/></w:rPr></w:rPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:outlineLvl w:val="0"/><w:spacing w:before="360" w:after="120"/></w:pPr><w:rPr><w:b/><w:sz w:val="34"/><w:color w:val="1F3864"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:pPr><w:outlineLvl w:val="1"/><w:spacing w:before="280" w:after="100"/></w:pPr><w:rPr><w:b/><w:sz w:val="27"/><w:color w:val="2E5496"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:pPr><w:outlineLvl w:val="2"/><w:spacing w:before="220" w:after="80"/></w:pPr><w:rPr><w:b/><w:sz w:val="23"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:pPr><w:ind w:left="360"/></w:pPr></w:style>
</w:styles>`;

const NUMMERN = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:pPr><w:ind w:left="360" w:hanging="220"/></w:pPr></w:lvl></w:abstractNum>
<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
</w:numbering>`;

export function schreibeDocx(pfad, koerper) {
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
${koerper.join("\n")}
<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr>
</w:body></w:document>`;

  const b = (s) => Buffer.from(s, "utf8");
  writeFileSync(pfad, zip([
    { name: "[Content_Types].xml", daten: b(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>`) },
    { name: "_rels/.rels", daten: b(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`) },
    { name: "word/_rels/document.xml.rels", daten: b(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/></Relationships>`) },
    { name: "word/document.xml", daten: b(doc) },
    { name: "word/styles.xml", daten: b(STYLES) },
    { name: "word/numbering.xml", daten: b(NUMMERN) },
  ]));
}
