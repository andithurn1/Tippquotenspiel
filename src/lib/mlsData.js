// ============================================================
//  MLS — die Liga OHNE Simulation
//
//  Alle anderen Wettbewerbe im Katalog haben einen erzeugten Spielplan und
//  erzeugte Quoten. Hier ist beides ECHT:
//    • der Spielplan kommt aus dem `/events`-Endpunkt der Quoten-API
//      (`npm run import:spielplan -- mls`, kostenlos),
//    • die Quoten aus dem Markt (`npm run odds:holen -- mls --raster`).
//
//  ── Warum MLS überhaupt drin ist ──
//  Sie spielt, während die europäischen Ligen Sommerpause haben. Damit ist sie
//  die EINZIGE Liga, an der sich die ganze Kette schon jetzt mit echten Daten
//  prüfen lässt — inklusive der Torschützen-Quoten, die für die Bundesliga erst
//  wenige Tage vor Anpfiff gestellt werden. Ohne sie müsste jeder Test bis Ende
//  August warten, und dann ist es für Korrekturen zu spät.
//
//  ⚠️ **Die Ratings sind bewusst alle 1,00 — das ist keine Faulheit.**
//  Bei den europäischen Ligen sind sie grobe Einschätzungen der Team-Stärke und
//  speisen die erzeugten Quoten. Für die MLS brauchen wir das nicht: die Quoten
//  kommen aus dem Markt, und der weiß besser, wie stark ein Klub ist, als jede
//  Schätzung von uns. Neutrale Werte sagen genau das aus — wir behaupten hier
//  nichts. Sie greifen nur als Rückfall, wenn für ein Spiel keine Marktquote
//  vorliegt; dann ist ein neutrales Spiel ehrlicher als ein erfundenes Gefälle.
//  (`simulateResult` zieht das Ergebnis ohnehin aus den Tor-Erwartungen des
//  Snapshots, also aus den echten Quoten.)
//
//  Der Spielplan reicht nur ~2–3 Wochen in die Zukunft, weil die API nicht
//  weiter listet. Das ist für eine Test-Liga richtig so.
// ============================================================

import { baueLiga, alsQuotenQuelle } from "./ligaGenerator";
import { SPIELPLAENE } from "./spielplaene";
import { QUOTEN } from "./quoten";

// 30 Klubs, aus der Quoten-API übernommen — dieselbe Schreibweise, die auch die
// Quoten tragen. Dadurch braucht die MLS keine Einträge in `KLUB_ALIASE`.
export const MLS_TEAM_RATINGS = {
  "Atlanta United FC":       { code: "AUF", attack: 1.00, defense: 1.00 },
  "Austin FC":               { code: "AFX", attack: 1.00, defense: 1.00 },
  "CF Montreal":             { code: "CMX", attack: 1.00, defense: 1.00 },
  "Charlotte FC":            { code: "CFX", attack: 1.00, defense: 1.00 },
  "Chicago Fire":            { code: "CF1", attack: 1.00, defense: 1.00 },
  "Colorado Rapids":         { code: "CRX", attack: 1.00, defense: 1.00 },
  "Columbus Crew SC":        { code: "CCS", attack: 1.00, defense: 1.00 },
  "D.C. United":             { code: "DUX", attack: 1.00, defense: 1.00 },
  "FC Cincinnati":           { code: "FCX", attack: 1.00, defense: 1.00 },
  "FC Dallas":               { code: "FDX", attack: 1.00, defense: 1.00 },
  "Houston Dynamo":          { code: "HDX", attack: 1.00, defense: 1.00 },
  "Inter Miami CF":          { code: "IMC", attack: 1.00, defense: 1.00 },
  "LA Galaxy":               { code: "LGX", attack: 1.00, defense: 1.00 },
  "Los Angeles FC":          { code: "LAF", attack: 1.00, defense: 1.00 },
  "Minnesota United FC":     { code: "MUF", attack: 1.00, defense: 1.00 },
  "Nashville SC":            { code: "NSX", attack: 1.00, defense: 1.00 },
  "New England Revolution":  { code: "NER", attack: 1.00, defense: 1.00 },
  "New York City FC":        { code: "NYC", attack: 1.00, defense: 1.00 },
  "New York Red Bulls":      { code: "NYR", attack: 1.00, defense: 1.00 },
  "Orlando City SC":         { code: "OCS", attack: 1.00, defense: 1.00 },
  "Philadelphia Union":      { code: "PUX", attack: 1.00, defense: 1.00 },
  "Portland Timbers":        { code: "PTX", attack: 1.00, defense: 1.00 },
  "Real Salt Lake":          { code: "RSL", attack: 1.00, defense: 1.00 },
  "San Diego FC":            { code: "SDF", attack: 1.00, defense: 1.00 },
  "San Jose Earthquakes":    { code: "SJE", attack: 1.00, defense: 1.00 },
  "Seattle Sounders FC":     { code: "SSF", attack: 1.00, defense: 1.00 },
  "Sporting Kansas City":    { code: "SKC", attack: 1.00, defense: 1.00 },
  "St. Louis City SC":       { code: "SLC", attack: 1.00, defense: 1.00 },
  "Toronto FC":              { code: "TFX", attack: 1.00, defense: 1.00 },
  "Vancouver Whitecaps FC":  { code: "VWF", attack: 1.00, defense: 1.00 },
};

// Rivalitäten, die in den USA wirklich so heißen. Reine Daten wie überall —
// die Engine liest nur `snap.derby`.
export const MLS_DERBYS = [
  { a: "LA Galaxy", b: "Los Angeles FC", label: "El Tráfico" },
  { a: "Portland Timbers", b: "Seattle Sounders FC", label: "Cascadia-Derby" },
  { a: "Seattle Sounders FC", b: "Vancouver Whitecaps FC", label: "Cascadia-Derby" },
  { a: "Portland Timbers", b: "Vancouver Whitecaps FC", label: "Cascadia-Derby" },
  { a: "New York City FC", b: "New York Red Bulls", label: "Hudson River Derby" },
  { a: "Toronto FC", b: "CF Montreal", label: "Canadian Classique" },
  { a: "D.C. United", b: "New York Red Bulls", label: "Atlantic Cup" },
  { a: "Orlando City SC", b: "Inter Miami CF", label: "Florida-Derby" },
];

let _cache = null;
export function getMlsMatches() {
  if (!_cache) {
    // Ohne Spielplan-Datei gibt es KEINE MLS-Spiele — anders als bei den
    // europäischen Ligen fällt sie NICHT auf die Circle-Methode zurück. Ein
    // erfundener MLS-Spielplan wäre wertlos: der ganze Zweck dieser Liga ist,
    // dass an ihr nichts erfunden ist.
    const plan = SPIELPLAENE.mls;
    _cache = plan
      ? baueLiga({
        wettbewerb: "mls", idPrefix: "mls26", ratings: MLS_TEAM_RATINGS,
        derbys: MLS_DERBYS, namensPool: null,
        spielplan: plan, quoten: QUOTEN.mls ?? null,
      })
      : [];
  }
  return _cache;
}

export function createMlsOddsSource() {
  return alsQuotenQuelle(getMlsMatches());
}
