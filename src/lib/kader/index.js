// ============================================================
//  KADER — die eine Einstiegsstelle für die abgeleiteten Zuordnungen
//
//  ERZEUGTE DATEI — wird von `npm run odds:holen -- <liga> --schuetzen`
//  mitgeschrieben.
//
//  Dieselbe Auflösung wie bei `spielplaene/` und `quoten/`: die Ligadateien
//  dürfen die Kader-Dateien nicht direkt importieren, weil der Abruf seinerseits
//  die Klublisten aus den Ligadateien braucht.
//
//  Fehlt ein Wettbewerb hier, bleiben seine Torschützen erfunden — der
//  Normalfall, solange die Zuordnung noch nicht steht.
// ============================================================

import { ZUORDNUNG as mls } from "./mls";

export const KADER = { mls };
