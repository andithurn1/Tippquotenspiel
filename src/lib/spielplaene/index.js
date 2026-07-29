// ============================================================
//  SPIELPLÄNE — die eine Einstiegsstelle für echte Kalender
//
//  ERZEUGTE DATEI — wird von `npm run import:spielplan` neu geschrieben.
//
//  Warum dieses Zwischenmodul überhaupt existiert: die Ligadateien dürfen die
//  Plan-Dateien nicht direkt importieren. Der Importer braucht die Klublisten
//  AUS den Ligadateien, um den geholten Plan zu prüfen — importierte die
//  Ligadatei ihrerseits eine Plan-Datei, die es beim ersten Lauf noch gar nicht
//  gibt, ließe sich der Import nie starten. Über diesen Index ist die Kette
//  aufgelöst: hier steht nur, was WIRKLICH schon da ist.
//
//  Fehlt ein Wettbewerb hier, fällt seine Liga auf die Circle-Methode zurück
//  (`ligaGenerator.js`) — lieber eine erzeugte Saison als gar keine.
// ============================================================

import bl from "./bl-2026";
import mls from "./mls-2026";

export const SPIELPLAENE = { bl, mls };
