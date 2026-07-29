// ============================================================
//  QUOTEN — die eine Einstiegsstelle für echte Marktquoten
//
//  ERZEUGTE DATEI — wird von `npm run odds:holen` neu geschrieben.
//  Abgelesen aus dem Verzeichnis: hier steht, was WIRKLICH da liegt.
//
//  Dieselbe Auflösung wie bei `spielplaene/index.js`: die Ligadateien dürfen
//  die Quoten-Dateien nicht direkt importieren, weil der Abruf seinerseits die
//  Klublisten AUS den Ligadateien braucht.
//
//  Fehlt ein Wettbewerb, bleiben seine Quoten erzeugt (Poisson-Modell in
//  `oddsGenerator.js`). Das ist der Normalfall für alles, was weiter als ein
//  paar Tage in der Zukunft liegt — kein Buchmacher bepreist eine ganze Saison.
// ============================================================

import bl from "./bl";
import mls from "./mls";
import pd from "./pd";
import pl from "./pl";
import sa from "./sa";

export const QUOTEN = { bl, mls, pd, pl, sa };
