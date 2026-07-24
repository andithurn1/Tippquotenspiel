// ── Rekorde & Auszeichnungen ────────────────────────────────
// Reine Ableitung aus vorhandenen Daten (kein UI, kein I/O): aus dem
// kumulativen Ranking-Verlauf und den ausgewerteten Einzeltipps entstehen die
// „belegten Dinger" — wer führt, wer die meisten Spieltage gewann, wer den
// besten Einzeltipp hatte usw. Nichts wird gespeichert; alles wird live aus
// history (getLeaderboardHistory) und scoredTips (getScoredTips) errechnet und
// ist damit immer konsistent mit dem aktuellen Stand.

// Punkte je Spieltag aus den kumulativen Ständen ableiten. history-Eintrag:
// { matchday, board: [{ userId, name, rank, total }] } — total ist kumulativ.
// Rückgabe je Spieltag: Map userId → { name, delta } (Punkte NUR dieses Spieltags).
export function matchdayDeltas(history = []) {
  const prev = new Map();   // userId → kumulativer Vorstand
  return history.map(({ matchday, board }) => {
    const perUser = new Map();
    for (const b of board) {
      const delta = b.total - (prev.get(b.userId) ?? 0);
      perUser.set(b.userId, { name: b.name, delta });
    }
    for (const b of board) prev.set(b.userId, b.total);
    return { matchday, perUser };
  });
}

// Spieltagssieger je Spieltag: wer an DIESEM Spieltag die meisten Punkte holte
// (delta > 0). Gleichstand → alphabetisch erster (deterministisch). Rückgabe:
// [{ matchday, userId, name, punkte }] — Spieltage ohne Punkte fehlen.
export function matchdayWinners(history = []) {
  const out = [];
  for (const { matchday, perUser } of matchdayDeltas(history)) {
    let best = null;
    for (const [userId, { name, delta }] of perUser) {
      if (delta <= 0) continue;
      if (!best || delta > best.punkte || (delta === best.punkte && name.localeCompare(best.name) < 0)) {
        best = { matchday, userId, name, punkte: delta };
      }
    }
    if (best) out.push(best);
  }
  return out;
}

// Höchsten Zähler je Nutzer bestimmen (mit Namen). tieBreak: kleinerer Name
// gewinnt bei Gleichstand. Gibt { userId, name, value } oder null zurück.
function topBy(counts) {
  let top = null;
  for (const [userId, { name, value }] of counts) {
    if (value <= 0) continue;
    if (!top || value > top.value || (value === top.value && name.localeCompare(top.name) < 0)) {
      top = { userId, name, value };
    }
  }
  return top;
}

// Die Auszeichnungen. history + scoredTips ([{ userId, name, matchday, total, ebene }]).
// Jede Auszeichnung: { key, label, emoji, holder:{userId,name}, value, einheit }
// oder fehlt, wenn es (noch) keine Datengrundlage gibt.
export function computeRecords(history = [], scoredTips = []) {
  const records = [];

  // Aktueller Spitzenreiter (Rang 1 im letzten Stand).
  const letzte = history[history.length - 1];
  const spitze = letzte?.board?.find((b) => b.rank === 1);
  if (spitze && spitze.total > 0) {
    records.push({ key: "spitzenreiter", label: "Spitzenreiter", emoji: "👑",
      holder: { userId: spitze.userId, name: spitze.name }, value: spitze.total, einheit: "Pkt." });
  }

  // Meiste Spieltagssiege.
  const siege = new Map();
  for (const w of matchdayWinners(history)) {
    const cur = siege.get(w.userId) || { name: w.name, value: 0 };
    cur.value += 1; siege.set(w.userId, cur);
  }
  const topSiege = topBy(siege);
  if (topSiege) records.push({ key: "spieltagssiege", label: "Spieltagssiege", emoji: "🏅",
    holder: { userId: topSiege.userId, name: topSiege.name }, value: topSiege.value, einheit: topSiege.value === 1 ? "Sieg" : "Siege" });

  // Größter Rang-Sprung zwischen zwei Spieltagen (Verbesserung).
  let sprung = null;
  for (let i = 1; i < history.length; i++) {
    const vorher = new Map(history[i - 1].board.map((b) => [b.userId, b.rank]));
    for (const b of history[i].board) {
      const alt = vorher.get(b.userId);
      if (alt == null) continue;
      const delta = alt - b.rank;   // positiv = nach oben geklettert
      if (delta > 0 && (!sprung || delta > sprung.value)) {
        sprung = { userId: b.userId, name: b.name, value: delta, matchday: history[i].matchday };
      }
    }
  }
  if (sprung) records.push({ key: "sprung", label: "Größter Rang-Sprung", emoji: "🚀",
    holder: { userId: sprung.userId, name: sprung.name }, value: sprung.value, einheit: sprung.value === 1 ? "Platz" : "Plätze" });

  // Bester Einzeltipp (höchste Punktzahl eines einzelnen Tipps).
  let besterTipp = null;
  const exaktCount = new Map();
  for (const s of scoredTips) {
    if (!besterTipp || s.total > besterTipp.value) besterTipp = { userId: s.userId, name: s.name, value: s.total };
    if (s.ebene === "exakt") {
      const cur = exaktCount.get(s.userId) || { name: s.name, value: 0 };
      cur.value += 1; exaktCount.set(s.userId, cur);
    }
  }
  if (besterTipp && besterTipp.value > 0) records.push({ key: "besterTipp", label: "Bester Einzeltipp", emoji: "🎯",
    holder: { userId: besterTipp.userId, name: besterTipp.name }, value: besterTipp.value, einheit: "Pkt." });

  const topExakt = topBy(exaktCount);
  if (topExakt) records.push({ key: "exakt", label: "Meiste Volltreffer", emoji: "💯",
    holder: { userId: topExakt.userId, name: topExakt.name }, value: topExakt.value, einheit: topExakt.value === 1 ? "Volltreffer" : "Volltreffer" });

  return records;
}
