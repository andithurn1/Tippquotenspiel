// ============================================================
//  DIE GEMEINSAME SCHLUSSZEILE DER ABNAHMEN
//
//  🔴 Der Befund, der diese Datei nötig macht (27.08.2026): von 13 Abnahmen
//  setzten **9 keinen Rückgabewert**. Sie fanden etwas, schrieben es hin — und
//  beendeten sich mit 0. Für ein Auge macht das keinen Unterschied; für alles
//  andere schon: kein `&&` bricht ab, keine CI schlägt an, und ein Durchgang,
//  der still 0 zurückgibt, ist ein Durchgang, den man vergisst.
//
//  ⚠️ Dazu kam das Zweite: es gab **kein Kommando, das alle laufen lässt**.
//  CLAUDE.md verlangt „wer eine Mechanik ergänzt, geht sie ALLE durch" — in
//  der Praxis tippt man drei und vergisst vier.
//
//  ── Was hier festgelegt wird ──
//  Jeder Durchgang endet mit EINER maschinenlesbaren Zeile:
//
//      ABNAHME <name>: ok
//      ABNAHME <name>: 3 Funde
//      ABNAHME <name>: Bericht
//
//  Der Sammel-Lauf (`npm run abnahmen`) liest genau diese Zeile. Sie steht
//  bewusst NACH dem Fließtext: der Mensch liest oben, die Maschine unten.
//
//  ⚠️ **„Bericht" ist kein Schummel-Ausweg.** Er ist für Durchgänge, die
//  Auskunft geben statt zu urteilen — `bereit` sagt Andi, was ER tun muss,
//  `balance` ist stillgelegt (CLAUDE.md). Wer eine echte Prüfung als Bericht
//  ausgibt, baut sich einen grünen Haken, der nichts bedeutet.
// ============================================================

export function melde(name, funde = 0, { bericht = false } = {}) {
  if (bericht) {
    console.log(`ABNAHME ${name}: Bericht`);
    return;
  }
  const n = Number(funde) || 0;
  console.log(`ABNAHME ${name}: ${n === 0 ? "ok" : `${n} Funde`}`);
  // 🔴 Der Rückgabewert, der neun Durchgängen gefehlt hat. `process.exitCode`
  // statt `process.exit()`: der Puffer der Ausgabe wird sonst abgeschnitten,
  // und man sieht die Funde nicht mehr, die man gerade gemeldet hat.
  if (n > 0) process.exitCode = 1;
}
