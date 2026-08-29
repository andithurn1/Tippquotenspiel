// ============================================================
//  VEREINSFARBEN — die Tippabgabe in den Farben der Paarung
//
//  🔴 Andis Ansage vom 29.08.2026, direkt nach der Logo-Lizenzfrage:
//
//    „ok ansonsten könnten wir vorübergehend … das jeweilige Farbschema der
//     einzelnen Wischfenster für die Tippabgabe nach den jeweiligen
//     Vereinsfarben anpassen bzw. entsprechende Details und Verzierungen so
//     einblenden, wie bspw. bei Dortmund halt gelb schwarz oder Bayern weiss
//     rot, auch meinetwegen mit bis zu 3 Farben. Nur die restlichen
//     Übersichten sollen in dem gewählten Farbschema angezeigt werden."
//
//  🔴 **Das ist die rechtlich saubere Hälfte der Wiedererkennung.** Ein Wappen
//  ist Marke und gehört dem Verein (siehe `design/symbole.md`); eine Farbfolge
//  ist es nicht. Gelb-Schwarz sagt jedem in Deutschland, worum es geht — ohne
//  dass irgendwer irgendetwas lizenzieren müsste.
//
//  ⚠️ **Diese Werte sind ERKENNUNGSFARBEN, keine Markenfarben.** Sie sind
//  bewusst angenähert und nicht aus einem Styleguide abgeschrieben: es geht
//  darum, dass man die Paarung erkennt, nicht darum, den Farbton eines Vereins
//  zu behaupten.
//
//  ── ⚠️ Die Grenze, die Andi selbst gezogen hat ──
//  **NUR die Wischfenster der Tippabgabe.** Alles andere bleibt im gewählten
//  Farbschema. Das ist keine Sparsamkeit, sondern der Unterschied zwischen
//  Würze und Chaos: eine Rangliste, in der jede Zeile anders leuchtet, ist
//  nicht mehr lesbar — und die Anzeige-Stufen der Nutzer wären ausgehebelt.
//
//  ── 🔴 Und die Falle, an der so etwas fast immer scheitert ──
//  Vereinsfarben sind für LESBARKEIT nicht gemacht. Weiß auf Weiß (Real
//  Madrid), Gelb auf Weiß (Dortmund auswärts), Blau auf Schwarz — wer die
//  Farben ungeprüft als Hintergrund nimmt, produziert unlesbare Karten. Jede
//  Farbe hier hat deshalb eine berechnete Textfarbe, und `paarungFarben` gibt
//  sie mit.
// ============================================================

// [Grundfarbe, Zweitfarbe, optional Dritte] — höchstens drei, wie Andi sagt.
//
// ⚠️ Die Schlüssel müssen EXAKT den Namen aus `ligen.js` entsprechen. Ein
// Tippfehler fällt nicht auf: die Karte bleibt einfach im Standard-Schema.
// Genau dagegen misst `vereinsfarben.test.js` die Abdeckung.
export const VEREINSFARBEN = {
  // ── Bundesliga ──
  "1. FC Köln": ["#FFFFFF", "#E2001A"],
  "1. FC Union Berlin": ["#D4021D", "#FFFFFF", "#EAB300"],
  "1. FSV Mainz 05": ["#C3141E", "#FFFFFF", "#111111"],
  "Bayer 04 Leverkusen": ["#E32219", "#111111"],
  "Borussia Dortmund": ["#FDE100", "#111111"],
  "Borussia Mönchengladbach": ["#FFFFFF", "#111111", "#00A650"],
  "Eintracht Frankfurt": ["#E1000F", "#111111", "#FFFFFF"],
  "FC Augsburg": ["#BA3733", "#FFFFFF", "#0B6B3A"],
  "FC Bayern München": ["#DC052D", "#FFFFFF", "#0066B2"],
  "FC Schalke 04": ["#004D9D", "#FFFFFF"],
  "Hamburger SV": ["#0A57A4", "#FFFFFF", "#111111"],
  "RB Leipzig": ["#FFFFFF", "#DD0741", "#001F47"],
  "SC Freiburg": ["#E3000F", "#FFFFFF", "#111111"],
  "SC Paderborn 07": ["#004E9E", "#111111"],
  "SV Elversberg": ["#111111", "#FFFFFF"],
  "SV Werder Bremen": ["#1D9053", "#FFFFFF"],
  "TSG Hoffenheim": ["#1961B5", "#FFFFFF"],
  "VfB Stuttgart": ["#FFFFFF", "#E32219"],

  // ── 2. Bundesliga ──
  "1. FC Heidenheim 1846": ["#E30613", "#003A80", "#FFFFFF"],
  "1. FC Kaiserslautern": ["#E2001A", "#FFFFFF"],
  "1. FC Magdeburg": ["#0A57A4", "#FFFFFF"],
  "1. FC Nürnberg": ["#AD1220", "#111111"],
  "DSC Arminia Bielefeld": ["#004E9E", "#FFFFFF", "#111111"],
  "Dynamo Dresden": ["#F7D117", "#111111"],
  "Eintracht Braunschweig": ["#004E9E", "#F2C200"],
  "Energie Cottbus": ["#D2001E", "#FFFFFF"],
  "FC St. Pauli": ["#5B3A21", "#FFFFFF"],
  "Hannover 96": ["#E30613", "#111111", "#FFFFFF"],
  "Hertha BSC": ["#005CA9", "#FFFFFF"],
  "Holstein Kiel": ["#0A3A82", "#FFFFFF", "#D2001E"],
  "Karlsruher SC": ["#0A57A4", "#FFFFFF"],
  "SpVgg Greuther Fürth": ["#00874A", "#FFFFFF"],
  "SV Darmstadt 98": ["#0A57A4", "#FFFFFF"],
  "VfL Bochum": ["#005CA9", "#FFFFFF"],
  "VfL Osnabrück": ["#5B2A86", "#FFFFFF"],
  "VfL Wolfsburg": ["#1E7B34", "#FFFFFF"],

  // ── Premier League (die, bei denen die Farbfolge eindeutig ist) ──
  "FC Arsenal": ["#EF0107", "#FFFFFF"],
  "FC Chelsea": ["#034694", "#FFFFFF"],
  "FC Everton": ["#003399", "#FFFFFF"],
  "FC Liverpool": ["#C8102E", "#FFFFFF"],
  "Manchester City": ["#6CABDD", "#FFFFFF", "#1C2C5B"],
  "Manchester United": ["#DA291C", "#111111", "#FBE122"],
  "Newcastle United": ["#111111", "#FFFFFF"],
  "Tottenham Hotspur": ["#FFFFFF", "#132257"],
  "Aston Villa": ["#670E36", "#95BFE5"],
  "Leeds United": ["#FFFFFF", "#1D428A", "#FFCD00"],
  "Nottingham Forest": ["#DD0000", "#FFFFFF"],
  "Brighton & Hove Albion": ["#0057B8", "#FFFFFF"],
  "Crystal Palace": ["#1B458F", "#C4122E"],
  "FC Fulham": ["#FFFFFF", "#111111"],

  // ── La Liga ──
  "Real Madrid": ["#FFFFFF", "#FEBE10"],
  "FC Barcelona": ["#A50044", "#004D98", "#EDBB00"],
  "Atlético Madrid": ["#CB3524", "#FFFFFF", "#1A2B5C"],
  "Athletic Bilbao": ["#EE2523", "#FFFFFF"],
  "FC Sevilla": ["#FFFFFF", "#D00027"],
  "FC Valencia": ["#FFFFFF", "#F18E00", "#111111"],
  "Real Betis": ["#00954C", "#FFFFFF"],
  "Real Sociedad": ["#0A4B9B", "#FFFFFF"],
  "Celta Vigo": ["#8AC3EE", "#FFFFFF"],
  "CA Osasuna": ["#0A346F", "#D91A21"],

  // ── Serie A ──
  "Juventus Turin": ["#FFFFFF", "#111111"],
  "AC Mailand": ["#FB090B", "#111111"],
  "Inter Mailand": ["#0068A8", "#111111"],
  "SSC Neapel": ["#12A0D7", "#FFFFFF"],
  "AS Rom": ["#8E1F2F", "#F0BC42"],
  "Lazio Rom": ["#87D8F7", "#FFFFFF"],
  "Atalanta Bergamo": ["#1D2D5C", "#111111"],
  "AC Florenz": ["#59309E", "#FFFFFF"],
  "Bologna FC": ["#A21C26", "#1A2F5B"],
  "FC Turin": ["#8B1A1A", "#FFFFFF"],

  // ── Champions League, soweit nicht schon oben ──
  "Ajax Amsterdam": ["#FFFFFF", "#D2122E"],
  "AS Monaco": ["#E63946", "#FFFFFF"],
  "Benfica Lissabon": ["#E00000", "#FFFFFF"],
  "FC Porto": ["#00428C", "#FFFFFF"],
  "Sporting Lissabon": ["#008057", "#FFFFFF"],
  "Paris Saint-Germain": ["#004170", "#DA291C", "#FFFFFF"],
  "Galatasaray": ["#A90432", "#FBB800"],
  "Celtic Glasgow": ["#018749", "#FFFFFF"],
  "PSV Eindhoven": ["#EE2223", "#FFFFFF"],
  "Feyenoord Rotterdam": ["#FFFFFF", "#E30613"],
  "FC Brügge": ["#1B458F", "#111111"],
  "Olympique Marseille": ["#FFFFFF", "#2FAEE0"],
  "Roter Stern Belgrad": ["#E30613", "#FFFFFF"],
};

const HEX = /^#([0-9a-f]{6})$/i;

// ── Lesbarkeit ──────────────────────────────────────────────
//
// 🔴 Hier steht die RICHTIGE Rechnung und nicht die bequeme. Der erste Entwurf
// hat die Kanäle einfach gewichtet gemittelt — das unterschätzt gesättigte
// Farben systematisch, und genau die kommen bei Vereinen ständig vor. Bayern-
// Rot landete damit bei „viel zu dunkel für Text", obwohl es auf Schwarz
// bestens lesbar ist. Die Gamma-Korrektur ist drei Zeilen mehr und macht den
// Unterschied zwischen einer Zahl, der man glauben kann, und einer, die man
// nachjustiert, bis es passt.

// Relative Helligkeit nach sRGB — mit Gamma-Korrektur, wie es sich gehört.
export function helligkeit(hex) {
  const m = HEX.exec(String(hex ?? ""));
  if (!m) return 0.5;
  const n = parseInt(m[1], 16);
  const kanal = (k) => {
    const v = k / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * kanal((n >> 16) & 255)
    + 0.7152 * kanal((n >> 8) & 255)
    + 0.0722 * kanal(n & 255);
}

// Das Kontrastverhältnis zweier Farben: 1 heißt gleich, 21 ist Schwarz auf
// Weiß. ⚠️ Diese eine Funktion beantwortet ALLE Lesbarkeitsfragen in dieser
// Datei — es gibt bewusst keine zweite Schwelle irgendwo sonst.
export function kontrast(a, b) {
  const x = helligkeit(a), y = helligkeit(b);
  const hell = Math.max(x, y), dunkel = Math.min(x, y);
  return (hell + 0.05) / (dunkel + 0.05);
}

// Welche Textfarbe steht auf diesem Grund? Nicht über eine geratene Schwelle,
// sondern über die Frage, welche der beiden es tatsächlich besser kann.
export function kontrastfarbe(hex) {
  return kontrast(hex, "#111111") >= kontrast(hex, "#FFFFFF") ? "#111111" : "#FFFFFF";
}

// ⚠️ ZWEI Schwellen, weil es zwei verschiedene Fragen sind — eine einzige
// wäre für die eine zu streng und für die andere zu lasch gewesen.
//
// `LESBAR_AB` gilt für Text AUF einer Vereinsfarbe. Dort kann auch Kleines
// stehen, also die volle Anforderung mit etwas Reserve nach unten.
//
// `NAME_AB` gilt für die Vereinsfarbe ALS Text: das ist ausschließlich der
// Vereinsname, groß und fett. Für großen Text verlangt die Norm 3 — mehr zu
// fordern hieße, gesättigtes Rot und Dunkelgrün grundsätzlich zu verbieten
// und damit genau die Wiedererkennung wegzurechnen, um die es hier geht.
export const LESBAR_AB = 4;
export const NAME_AB = 3;
// 🔴 Die UMGEKEHRTE Frage zu `kontrastfarbe` — und sie wird ständig
// verwechselt. Dort steht Text AUF der Vereinsfarbe. Hier steht die
// Vereinsfarbe SELBST als Text auf dem Kartengrund. Newcastles Schwarz wäre
// auf dunklem Grund unsichtbar, Dortmunds Gelb dagegen perfekt.
//
// ⚠️ Es wird ausschließlich UNTER den Farben des Vereins gewählt.
//
// 🔴 Und wenn KEINE davon reicht, kommt `null` zurück statt einer erfundenen
// Farbe. Der erste Entwurf hat in dem Fall gemischt — und lieferte für Real
// Madrid auf hellem Grund ein #888888. Das war zwar lesbar, sah aber aus wie
// ausgegraut und hatte mit dem Verein nichts mehr zu tun. Eine erfundene
// Farbe ist keine Wiedererkennung, sondern nur Farbe. Der Aufrufer lässt den
// Namen dann in der normalen Textfarbe stehen; die Wiedererkennung trägt
// ohnehin das Farbband, das die ECHTEN Farben zeigt.
export function lesbarAuf(farben, grund = "#0B0D12") {
  const liste = (Array.isArray(farben) ? farben : [farben]).filter(Boolean);
  // Der Reihe nach — die erste Farbe ist die des Vereins, nicht irgendeine.
  return liste.find((f) => kontrast(f, grund) >= NAME_AB) ?? null;
}

// Die Farben eines Vereins, oder `null`. ⚠️ `null` und nicht eine
// Ersatzfarbe: der Aufrufer soll auf das GEWÄHLTE Schema zurückfallen, und
// das kennt nur er.
export function farbenFuer(verein) {
  const f = VEREINSFARBEN[String(verein ?? "").trim()];
  return Array.isArray(f) && f.length ? f : null;
}

// Alles, was eine Wischkarte braucht — in EINEM Aufruf, damit die Karte nicht
// selbst rechnet.
//
// ⚠️ Fehlt einer der beiden Vereine, kommt `null` zurück. Eine halb gefärbte
// Karte wäre schlechter als eine ungefärbte: sie sähe aus, als gehöre die
// Farbe zur Runde und nicht zur Paarung.
//
// ⚠️ `grund` ist der Kartenhintergrund des GEWÄHLTEN Schemas. Er wird
// hereingereicht und nicht angenommen — sonst wäre die Lesbarkeit in einem
// hellen Schema still falsch.
export function paarungFarben(heim, gast, grund = "#0B0D12") {
  const h = farbenFuer(heim);
  const g = farbenFuer(gast);
  if (!h || !g) return null;
  const seite = (f) => ({
    grund: f[0],
    text: kontrastfarbe(f[0]),          // Text AUF der Vereinsfarbe
    aufDunkel: lesbarAuf(f, grund),     // die Vereinsfarbe ALS Text
    zier: f[1] ?? f[0],
    dritte: f[2] ?? null,
    alle: [...f],                       // bis zu drei, für das Farbband
  });
  return {
    heim: seite(h),
    gast: seite(g),
    // Für den Verlauf über die ganze Karte: von der Heim- zur Gastfarbe.
    verlauf: [h[0], g[0]],
  };
}

// Wie weit reicht die Tabelle? Für die Abnahme und für die Anzeige einer
// ehrlichen Zahl statt eines Gefühls.
export function abdeckung(vereine = []) {
  const liste = [...new Set(vereine.filter(Boolean))];
  const drin = liste.filter((v) => farbenFuer(v));
  return { gesamt: liste.length, mitFarben: drin.length, ohne: liste.filter((v) => !farbenFuer(v)) };
}
