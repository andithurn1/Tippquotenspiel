// ============================================================
//  QUOTEN — die eine Einstiegsstelle für echte Marktquoten
//
//  ERZEUGTE DATEI — wird von `npm run odds:holen` neu geschrieben.
//
//  Dieselbe Auflösung wie bei `spielplaene/index.js`: die Ligadateien dürfen
//  die Quoten-Dateien nicht direkt importieren, weil der Abruf seinerseits die
//  Klublisten AUS den Ligadateien braucht. Hier steht nur, was wirklich da ist.
//
//  Fehlt ein Wettbewerb, bleiben seine Quoten erzeugt (Poisson-Modell in
//  `oddsGenerator.js`). Das ist der Normalfall für alles, was weiter als ein
//  paar Tage in der Zukunft liegt — kein Buchmacher bepreist eine ganze Saison.
// ============================================================

import bl from "./bl";
import mls from "./mls";

export const QUOTEN = { bl, mls };
