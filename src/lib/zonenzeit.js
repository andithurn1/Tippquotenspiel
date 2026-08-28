// ============================================================
//  ZONENZEIT — Wochentag und Tagesbeginn in einer echten Zeitzone
//
//  🔴 Warum es diese Datei gibt, in einem Satz: `new Date(t).getDay()`
//  antwortet in der Zeitzone des RECHNERS. Auf Andis Rechner ist das
//  Europe/Berlin, auf einem Server irgendwo UTC — und ein Spieltag, der „ab
//  Donnerstag" beginnt, begänne dann zwei Stunden zu früh und im Winter eine.
//  Ein Freitagsspiel um 20:30 wäre auf dem Server noch Freitag, ein Samstags-
//  spiel um 00:30 aber schon Freitag. Solche Fehler sieht man nie beim
//  Programmieren und immer im Betrieb.
//
//  ⚠️ Gerechnet wird über `Intl`, nicht über einen festen Stundenversatz:
//  Sommer- und Winterzeit unterscheiden sich, und der Wechsel liegt mitten in
//  der Saison (Ende Oktober, Ende März). Wer „+2 Stunden" fest einträgt,
//  verschiebt die halbe Saison um eine Stunde.
//
//  ⚠️ Diese Rechnung stand schon einmal im Projekt — in `spielplan.js`, für
//  den Spielplan-Import. Sie steht jetzt hier, damit es sie EINMAL gibt;
//  `spielplan.js` holt sie von hier. Zwei Fassungen einer Zeitzonen-Rechnung
//  sind zwei Fassungen, die auseinanderlaufen.
//
//  Reine Funktionen, UI-frei.
// ============================================================

// Die Zeitzone, in der die Runde lebt. Der Spielplan kommt je Liga in ihrer
// eigenen Ortszeit herein (`import-spielplan.mjs`) und wird dort nach UTC
// gerechnet; die RUNDE dagegen hat eine gemeinsame Uhr, und das ist die der
// Mitspieler.
// ⚠️ Fest eingetragen und nicht aus dem Browser gelesen: sonst begänne der
// Spieltag für einen Mitspieler im Urlaub zu einer anderen Stunde als für die
// anderen — und die Runde hätte zwei Wahrheiten darüber, was noch dazugehört.
export const RUNDEN_ZONE = "Europe/Berlin";

export const WOCHENTAGE = [
  { key: "mo", label: "Montag", kurz: "Mo", index: 1 },
  { key: "di", label: "Dienstag", kurz: "Di", index: 2 },
  { key: "mi", label: "Mittwoch", kurz: "Mi", index: 3 },
  { key: "do", label: "Donnerstag", kurz: "Do", index: 4 },
  { key: "fr", label: "Freitag", kurz: "Fr", index: 5 },
  { key: "sa", label: "Samstag", kurz: "Sa", index: 6 },
  { key: "so", label: "Sonntag", kurz: "So", index: 0 },
];

export const wochentagVon = (key) => WOCHENTAGE.find((t) => t.key === key) ?? null;

// Welchen Versatz zu UTC hat diese Zone in DIESEM Moment? Der Standardweg ohne
// Fremdbibliothek: den Zeitpunkt in der Zone formatieren und zurückrechnen.
export function zonenVersatz(ms, zone = RUNDEN_ZONE) {
  const teile = new Intl.DateTimeFormat("en-US", {
    timeZone: zone, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(ms));
  const p = Object.fromEntries(teile.map((t) => [t.type, t.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - ms;
}

// Die Kalenderfelder dieses Zeitpunkts in der Zone — als wären sie UTC.
function felder(ms, zone) {
  return new Date(ms + zonenVersatz(ms, zone));
}

// 0 = Sonntag … 6 = Samstag, gerechnet in der Zone.
export function wochentagIndex(ms, zone = RUNDEN_ZONE) {
  return felder(ms, zone).getUTCDay();
}

// Der Beginn des Kalendertags (00:00 Ortszeit) als UTC-Zeitstempel.
export function tagesBeginn(ms, zone = RUNDEN_ZONE) {
  const f = felder(ms, zone);
  const alsWaereEsUTC = Date.UTC(f.getUTCFullYear(), f.getUTCMonth(), f.getUTCDate());
  // ⚠️ Zweimal rechnen: an der Umstellungsnacht ändert sich der Versatz
  // zwischen dem Zeitpunkt und Mitternacht, und der erste Wert läge eine
  // Stunde daneben. Dieselbe Vorsicht wie beim Spielplan-Import.
  const grob = alsWaereEsUTC - zonenVersatz(alsWaereEsUTC, zone);
  return alsWaereEsUTC - zonenVersatz(grob, zone);
}

// 🔴 Der Kern für die Spieltags-Grenze: der letzte <Wochentag> um 00:00
// Ortszeit, der NICHT nach `ms` liegt.
//
// ⚠️ „Nicht nach" und nicht „vor": fällt `ms` selbst auf Donnerstag 00:00, ist
// das der gesuchte Punkt und nicht der Donnerstag davor. Andernfalls verschöbe
// sich eine Saison, die zufällig genau auf der Grenze beginnt, um eine ganze
// Woche nach hinten.
export function letzterWochentag(ms, tagKey, zone = RUNDEN_ZONE) {
  const tag = wochentagVon(tagKey);
  if (!tag || !Number.isFinite(ms)) return ms;
  let t = tagesBeginn(ms, zone);
  for (let i = 0; i < 7; i++) {
    if (wochentagIndex(t, zone) === tag.index) return t;
    // 🔴 ZWÖLF Stunden zurück, dann wieder auf Mitternacht — und diese Zahl
    // ist der Fund, den der Test gefunden hat.
    //
    // ⚠️ Hier standen erst 26 Stunden, mit der plausiblen Begründung „24 allein
    // reichen nicht, in der Umstellungsnacht hat der Tag 23 oder 25 Stunden".
    // Die Begründung stimmt, die Zahl war trotzdem falsch: von MITTERNACHT aus
    // landet jeder Schritt über 24 Stunden im VORVORTAG. Aus Freitag 00:00
    // wurde Mittwoch 22:00 — der Donnerstag wurde übersprungen, und die Grenze
    // rutschte eine ganze Woche zurück.
    //
    // ✅ 12 Stunden landen immer im Vortag (irgendwann mittags) und nie
    // daneben: keine Zeitumstellung der Welt verschiebt um mehr als zwei
    // Stunden. Danach zieht `tagesBeginn` wieder auf Mitternacht.
    t = tagesBeginn(t - 12 * 3600 * 1000, zone);
  }
  return ms;
}

// 🔴 Der Tag NACH einem Wochentag — für die Spieltags-Grenze.
//
// ⚠️ Andi denkt in ENDEN: „Donnerstag 23:59 ist Spieltag vorbei" (28.08.2026).
// Gerechnet wird trotzdem mit Anfängen, weil ein Fenster einen Beginn braucht.
// Diese Funktion ist die eine Stelle, die zwischen beidem übersetzt — damit
// nicht an fünf Stellen jemand „+1 Tag" rechnet und einer davon danebengreift.
export function tagNach(tagKey) {
  const tag = wochentagVon(tagKey);
  if (!tag) return null;
  return WOCHENTAGE.find((t) => t.index === (tag.index + 1) % 7).key;
}
