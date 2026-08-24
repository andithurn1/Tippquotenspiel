"use client";

// ============================================================
//  SEITENÜBERGANG — jede Route kommt herein, statt zu erscheinen
//
//  🔴 Andi am 24.08.2026: „flüssige (kleine animationen) bspw bei neuem
//  fenster laden". Die FENSTER hatten das seit G4 (`.tqs-fenster`), die
//  SEITEN nicht: ein Wechsel von /menu nach /tippen war ein harter Schnitt.
//
//  ⚠️ **Warum `template.js` und nicht `layout.js`:** ein Layout bleibt beim
//  Navigieren STEHEN und wird nicht neu aufgebaut — genau dafür ist es da.
//  Ein Template wird bei jeder Navigation neu erzeugt, und nur deshalb läuft
//  die Animation überhaupt jedes Mal an. Dieselbe Klasse in `layout.js`
//  spielte genau einmal, beim ersten Laden, und danach nie wieder.
//
//  ⚠️ Bewusst DIESELBE Klasse wie beim Nachladen von Inhalt (`.tqs-auf`,
//  320 ms, Deckkraft + 4 px Versatz) und nicht eine eigene, kräftigere:
//  ein Seitenwechsel passiert Dutzende Male je Sitzung. Alles, was beim
//  ersten Mal beeindruckt, ist beim zehnten Wartezeit.
//
//  `prefers-reduced-motion` gilt automatisch mit — die Dauer steht dort auf
//  1 ms, der Zustand bleibt, die Bewegung fällt weg.
//
//  ⚠️ KEIN zusätzliches Element im Baum: das `<div>` hier ist der Träger der
//  Klasse und sonst nichts. Es bekommt ausdrücklich kein Styling, sonst
//  bräche es die Seiten, die selbst `minHeight: 100vh` setzen.
// ============================================================

export default function Template({ children }) {
  return <div className="tqs-auf">{children}</div>;
}
