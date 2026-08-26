// ============================================================
//  WER IST AN MIR VORBEIGEZOGEN? (ZP5, 26.08.2026)
//
//  Die fünfte Benachrichtigungsart. Sie war die letzte offene, weil sie
//  etwas braucht, was der Store nicht direkt liefert: den eigenen Rang VON
//  VORHIN.
//
//  🔴 Die naheliegende Lösung wäre eine Marke im localStorage gewesen — „mein
//  Rang beim letzten Blick". Die ist FALSCH, und zwar aus zwei Gründen, die
//  beide erst im Betrieb auffallen:
//
//   1. Sie hängt am GERÄT. Wer auf dem Telefon nachsieht und dann am Rechner,
//      bekommt die Meldung zweimal oder gar nicht.
//   2. Sie hängt am HINSEHEN. Wer eine Woche nicht in die App schaut, wird
//      beim Öffnen mit Meldungen über Spieltage überschüttet, die längst
//      vorbei sind — oder bekommt gar nichts, weil nur der letzte Stand zählt.
//
//  Der Verlauf beantwortet die Frage OHNE gespeicherten Zustand: er trägt je
//  Spieltag eine vollständige Rangliste. „Vorbeigezogen" heißt dann schlicht:
//  im vorletzten Board stand ich vor jemandem, im letzten dahinter. Das ist
//  auf jedem Gerät dieselbe Antwort und unabhängig davon, wann man hinsieht.
//
//  ⚠️ Es ist eine Aussage über den letzten SPIELTAG, nicht über den letzten
//  Besuch. Genau deshalb kommt sie höchstens einmal je Spieltag — und ist als
//  einzige Art standardmäßig AUS (Begründung in `notify.js`).
//
//  Reine Funktionen, UI-frei, store-frei.
// ============================================================

// Rang je Nutzer aus einem Board. Gleichstand teilt sich den Rang — sonst
// „überholte" jemand, der nur alphabetisch anders einsortiert wurde.
export function raenge(board = []) {
  const sortiert = [...(board ?? [])]
    .filter((z) => z && z.userId != null)
    .sort((a, b) => (b.total ?? 0) - (a.total ?? 0));
  const out = new Map();
  let rang = 0, gesehen = 0, letzte = null;
  for (const z of sortiert) {
    gesehen += 1;
    const punkte = z.total ?? 0;
    if (letzte === null || punkte !== letzte) { rang = gesehen; letzte = punkte; }
    out.set(z.userId, { rang, name: z.name ?? z.userId, total: punkte });
  }
  return out;
}

// Wer stand vorher hinter mir und steht jetzt davor?
//
// `verlauf`: [{ wettbewerb, matchday, board: [{ userId, name, total }] }]
//            — aus `getLeaderboardHistory(roundId)`.
//
// ⚠️ Gleichstand zählt NICHT als Überholen: wer punktgleich neben mir steht,
// ist nicht an mir vorbei. Sonst käme die Meldung bei jedem Remis-Spieltag.
export function ueberholungen(verlauf = [], userId) {
  const liste = Array.isArray(verlauf) ? verlauf.filter((v) => Array.isArray(v?.board)) : [];
  if (liste.length < 2 || !userId) return [];

  const jetzt = raenge(liste[liste.length - 1].board);
  const vorher = raenge(liste[liste.length - 2].board);
  const meinJetzt = jetzt.get(userId);
  const meinVorher = vorher.get(userId);
  if (!meinJetzt || !meinVorher) return [];
  // Rang verbessert oder gehalten? Dann hat mich niemand überholt.
  if (meinJetzt.rang <= meinVorher.rang) return [];

  const out = [];
  for (const [id, nun] of jetzt) {
    if (id === userId) continue;
    const davor = vorher.get(id);
    if (!davor) continue;                       // neu dabei — kein Überholen
    if (davor.rang <= meinVorher.rang) continue; // stand schon vor mir
    if (nun.rang >= meinJetzt.rang) continue;    // steht immer noch hinter mir
    out.push({
      vonUserId: id, name: nun.name,
      rang: meinJetzt.rang,
      vorherRang: meinVorher.rang,
      wettbewerb: liste[liste.length - 1].wettbewerb ?? null,
      matchday: liste[liste.length - 1].matchday ?? null,
    });
  }
  // Wer am weitesten vorgerückt ist, steht vorn.
  return out.sort((a, b) => (jetzt.get(a.vonUserId)?.rang ?? 99) - (jetzt.get(b.vonUserId)?.rang ?? 99));
}
