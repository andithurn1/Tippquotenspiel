import { VORBELEGUNGEN as _VORBELEGUNGEN, DEFAULT_VORBELEGUNG } from "./vorbelegung";

// ── Persönliche Anzeige-Einstellungen (pro Nutzer/Browser) ──
// UNABHÄNGIG vom Regelwerk der Runde: das Regelwerk bestimmt die Fairness/
// Punkte (Admin), DIESE Einstellung nur, wie viel vom „Hintergrund" jeder
// selbst sehen will. Drei Stufen je Anzeige.

export const LEVELS = ["voll", "dezent", "aus"];
export const LEVEL_LABEL = { voll: "Voll", dezent: "Dezent", aus: "Aus" };

// App-Start: Standard ist das Hauptmenü (Runde wählen, erstellen, beitreten, …);
// wer will, kann optional direkt in die aktive Tipprunde springen.
export const START_SCREENS = ["menu", "hub"];
export const START_SCREEN_LABEL = { menu: "Hauptmenü", hub: "Aktive Tipprunde" };

// ── Vergleichs-Mitspieler ("Freunde") ───────────────────────
// 🔴 Bewusst eine PERSÖNLICHE Einstellung und keine Regel der Runde: mit wem
// ich mich vergleichen will, geht den Admin nichts an, und zwei Spieler
// derselben Runde dürfen verschiedene Leute im Blick haben. Sie liegt deshalb
// hier bei den Anzeige-Stufen und nicht in `rules`.
//
// ⚠️ Je RUNDE getrennt (`{ [roundId]: [userId, …] }`). Wer in drei Runden
// spielt, hat dort verschiedene Mitspieler — eine flache Liste träfe in der
// zweiten Runde niemanden und stünde stumm da.
//
// Die Obergrenze ist kein Geschmack: vier Spalten nebeneinander sind auf einem
// Telefon nicht mehr lesbar, und die Einblendung nach Spielende soll man in
// zwei Sekunden erfassen.
export const MAX_VERGLEICH = 3;

// ── Bewegung: wie viel Schmuck soll laufen? (Andi, 25.08.2026) ──
// Wörtlich: „kann man auch in den account einstellungen verfügbar machen,
// dass jeder individuell solche performanceteuren sachen ausstellen kann,
// wenn man mit der performance unzufrieden ist, aber im normalfall sollts
// schon klappen".
//
// 🔴 Genau in dieser Reihenfolge gebaut: „voll" ist die Vorgabe, weil die
// Messung sie trägt (`npm run bewegung`: 12 gratis, 4 Paint, 0 Layout). Die
// Einstellung ist ein VENTIL für das alte Telefon, keine Entschuldigung
// dafür, teure Bewegung einzubauen.
//
//   voll     — alles. Vorgabe.
//   sparsam  — nur Compositor-Bewegung (transform/opacity). Weg fallen die
//              Paint-Sachen (Leuchten, Schatten-Übergänge) und laufende
//              Bilder: GIFs stehen still, statt Bild für Bild dekodiert zu
//              werden. ⚠️ Das ist der Punkt, an dem die Reaktions-GIFs
//              (`reactions.js`) später hängen — ein GIF kostet mehr als jede
//              CSS-Animation in dieser App, weil der Browser jedes Einzelbild
//              neu dekodiert.
//   aus      — dasselbe wie „Bewegung reduzieren" am Gerät.
//
// ⚠️ NICHT umgekehrt wirksam: wer am GERÄT „Bewegung reduzieren" eingestellt
// hat, bekommt sie auch bei „voll" nicht zurück. Diese Einstellung kann nur
// WENIGER erlauben, nie mehr — eine App, die eine Bedienungshilfe des
// Betriebssystems überstimmt, ist kaputt, nicht flexibel.
export const BEWEGUNG_STUFEN = ["voll", "sparsam", "aus"];
export const BEWEGUNG_LABEL = {
  voll: "Voll",
  sparsam: "Sparsam",
  aus: "Aus",
};
export const BEWEGUNG_HINWEIS = {
  voll: "Übergänge, Leuchten und laufende Bilder. Die Vorgabe.",
  sparsam: "Nur Ein- und Ausblenden. Kein Leuchten, Bilder stehen still.",
  aus: "Keine Bewegung. Alles ist sofort da.",
};

// ── Wie weit reicht das Ergebnis-Raster? (Andi, 25.08.2026) ──
// „können wir die option zu 1 einstellbar machen? vllt auch im account unter
//  den ganzen persönlichen anzeigemöglichkeiten einstellbar"
//
// 🔴 Eine ANZEIGE-Einstellung, keine Regel der Runde: wie weit ich das Raster
// sehen will, geht den Admin nichts an, und zwei Spieler derselben Runde
// dürfen es verschieden halten. Deshalb hier bei den Stufen und nicht in
// `rules` — dieselbe Trennung wie bei den Vergleichs-Mitspielern oben.
//
//   raster — nur so weit, wie die Quotenquelle reicht. Vorgabe.
//   voll   — bis zur Grenze des Steppers (0…9).
//
// ⚠️ Warum „raster" die Vorgabe bleibt, obwohl „voll" mehr zeigt: außerhalb
// des Rasters schreibt `randquoten.js` fort, und fortgeschriebene Zellen
// laufen alle in denselben Deckel. Gemessen an FC Bayern – VfB Stuttgart
// stehen im vollen 9×9 **48 von 81 Zellen** auf demselben Höchstwert. Als
// Orientierung ist so ein Raster wertlos — auch wenn jede einzelne Zahl
// stimmt. Wer es einschaltet, weiß dann, wonach er sucht.
export const RASTER_WEITEN = ["raster", "voll"];
export const RASTER_WEITE_LABEL = {
  raster: "So weit die Quoten reichen",
  voll: "Volles Raster bis 9:9",
};
export const RASTER_WEITE_HINWEIS = {
  raster: "Nur Endstände, für die es eine echte Quote gibt. Die Vorgabe.",
  voll: "Auch seltene Endstände wie 6:0. Deren Quote wird geschätzt, und die höchsten laufen alle in denselben Deckel.",
};

// ── Haptik: das kurze Spüren, wenn etwas durchgegangen ist ──
// Gehört in dieselbe Familie wie `bewegung` — eine persönliche Einstellung,
// die den Admin nichts angeht. Sie hängt aber ausdrücklich NICHT an ihm:
// Bewegung ist das Auge, Haptik ist die Hand. Wer Animationen abschaltet, weil
// ihm das Telefon zu langsam ist, will deshalb nicht auf die Bestätigung im
// Daumen verzichten. Zwei Sinne, zwei Schalter.
//
// 🔴 „an" ist die Vorgabe, weil das Spüren die Rückmeldung TRÄGT, nicht
// schmückt: der Meldungs-Streifen steht unten und ist beim Tippen genau der
// Bereich, den der eigene Daumen verdeckt.
//
// ⚠️ Auf einem iPhone passiert heute trotzdem nichts — `navigator.vibrate`
// gibt es dort nicht. Der Grund und der Handgriff stehen in `haptik.js`;
// die Einstellungs-Seite sagt es an Ort und Stelle, statt einen Schalter zu
// zeigen, der ins Leere greift.
export const HAPTIK_STUFEN = ["an", "aus"];
export const HAPTIK_LABEL = { an: "An", aus: "Aus" };
export const HAPTIK_HINWEIS = {
  an: "Ein kurzer Stoß, wenn etwas gespeichert ist — ein doppelter, wenn nicht. Die Vorgabe.",
  aus: "Kein Spüren. Die Meldung steht weiterhin da.",
};

// ── Womit die Tippabgabe startet? (Andi, 26.08.2026) ──
// „dass bei jeder tippabgabe als option zur verfügung steht immer die
//  Ergebnisse als bereits eingestellte Auswahl zu haben die am
//  Wahrscheinlichsten ist … Also bei bayern st. pauli beginnt nicht bei 0:0
//  sondern direkt bei 3:1"
//
// 🔴 Wieder eine PERSÖNLICHE Einstellung und keine Regel der Runde —
// dieselbe Trennung wie bei `rasterWeite` darüber. Der Startwert des Steppers
// ändert nichts an Punkten oder Fairness; er spart Klicks.
//
// Katalog, Texte und die Rechnung stehen in `vorbelegung.js` — hier nur der
// Anschluss, damit die Stufe wie jede andere über `sanitizePrefs` läuft.
//
// ⚠️ `fest` bleibt die Vorgabe: ein vorgeschlagener Endstand ist ein
// Vorschlag, und wer schnell tippt, nimmt ihn. Andi hat „als option" gesagt.
export { VORBELEGUNGEN, VORBELEGUNG_LABEL, VORBELEGUNG_HINWEIS } from "./vorbelegung";

// 🔴 Die Modi kommen AUS `mehrfachTipp.js` und werden hier nicht noch einmal
// aufgeschrieben. Zwei Listen derselben Möglichkeiten laufen irgendwann
// auseinander, und dann nimmt die Einstellung einen Wert an, den die Logik
// nicht kennt.
import { MEHRFACH_MODI, DEFAULT_MEHRFACH } from "./mehrfachTipp";

// Ob der Schalter in der Tippabgabe überhaupt auftaucht. Andi, 29.08.2026:
// „den Schalter kann man im Anzeigehauptmenü auch entfernen".
const MEHRFACH_SCHALTER = ["an", "aus"];
export const DEFAULT_PREFS = {
  abrechnung: "voll", vorschau: "voll", zwischenabrechnung: "voll",
  startScreen: "menu", vergleich: {}, bewegung: "voll", rasterWeite: "raster",
  haptik: "an", vorbelegung: DEFAULT_VORBELEGUNG,
  mehrfachTipp: DEFAULT_MEHRFACH, mehrfachSchalter: "an",
};

// Nur intern: `sanitizePrefs`, `toggleVergleich` und `vergleichFuer` benutzen
// sie: von außen geht der Weg über die drei.
function sanitizeVergleich(v) {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const out = {};
  for (const [roundId, liste] of Object.entries(v)) {
    if (!roundId || !Array.isArray(liste)) continue;
    const ids = [...new Set(liste.filter((x) => typeof x === "string" && x))].slice(0, MAX_VERGLEICH);
    if (ids.length) out[roundId] = ids;
  }
  return out;
}

// An- und Abwählen. Ist die Grenze erreicht, passiert NICHTS — der Aufrufer
// zeigt die Grenze an, statt still den ältesten Eintrag zu verdrängen. Ein
// Häkchen, das ein anderes wegnimmt, ohne es zu sagen, ist die Sorte
// Oberfläche, bei der man zweimal klickt und beim dritten Mal aufgibt.
export function toggleVergleich(vergleich, roundId, userId) {
  const alle = sanitizeVergleich(vergleich);
  const jetzt = alle[roundId] ?? [];
  const drin = jetzt.includes(userId);
  if (!drin && jetzt.length >= MAX_VERGLEICH) return alle;
  const naechste = drin ? jetzt.filter((x) => x !== userId) : [...jetzt, userId];
  const out = { ...alle };
  if (naechste.length) out[roundId] = naechste;
  else delete out[roundId];
  return out;
}

// Die gewählten Mitspieler EINER Runde — immer ein Array, nie `undefined`.
export const vergleichFuer = (prefs, roundId) =>
  (sanitizeVergleich(prefs?.vergleich)[roundId] ?? []);

// Texte für den Einstellungs-Screen.
export const PREF_META = {
  // 🔴 Andi, 29.08.2026: „wenn man in mehreren Tipprunden gleichzeitig drin
  // ist, dass bei den Spielen wo sie sich überschneiden diese Tippabgaben für
  // alle Tipprunden eingetragen werden … den Schalter kann man im
  // Anzeigehauptmenü auch entfernen bzw diese Einstellung auch abändern,
  // sodass jede Tipprunde einzeln betippt wird auch wenns die gleichen Spiele
  // sind".
  //
  // ⚠️ ZWEI Einstellungen und nicht eine, weil es zwei verschiedene Fragen
  // sind: WAS soll standardmäßig passieren, und will ich darüber überhaupt
  // gefragt werden. Wer „einzeln" bevorzugt, aber den Schalter behält, kann
  // im Einzelfall trotzdem verteilen — und umgekehrt.
  mehrfachTipp: {
    title: "Mehrere Tipprunden — dasselbe Spiel",
    hint: "Wenn ein Spiel in mehreren deiner Runden läuft: ein Tipp für alle, oder jede Runde für sich.",
    levels: {
      alle: "Ein Tipp zählt in allen Runden, in denen das Spiel läuft und er dort zulässig ist.",
      einzeln: "Jede Runde wird einzeln getippt, auch wenn es dieselben Spiele sind.",
    },
  },
  mehrfachSchalter: {
    title: "Der Schalter in der Tippabgabe",
    hint: "Ob unter dem Tipp ein Schalter steht, mit dem du die Verteilung für DIESES eine Spiel umstellst.",
    levels: {
      an: "Schalter anzeigen — je Spiel entscheidbar.",
      aus: "Kein Schalter. Es gilt still, was oben eingestellt ist.",
    },
  },
  abrechnung: {
    title: "Abrechnung — Punkte-Mathematik",
    hint: "Wie viel von der Berechnung du nach dem Spiel siehst (Sieger-Boden, Nähebonus, Kombi, Distanz-Leiter).",
    levels: {
      voll: "Volle Aufschlüsselung: alle Bausteine, Distanz-Leiter, Kombi.",
      dezent: "Nur Gesamtpunkte, Rang und ein kurzer Grund.",
      aus: "Maximale Spannung: nur Endpunkte und dein Rang.",
    },
  },
  // 🔴 „aus" ist hier keine Sparversion, sondern die eigentliche Zusage: eine
  // Einblendung, die sich beim Öffnen der App vor alles legt, MUSS abstellbar
  // sein. Wer sie nicht will, soll sie nie wieder sehen — und trotzdem
  // jederzeit selbst in die Abrechnung gehen können.
  zwischenabrechnung: {
    title: "Nach dem Spiel — was passiert ist, während du weg warst",
    hint: "Ob sich die App beim Öffnen meldet, sobald Spiele fertig geworden sind, auf die du getippt hast.",
    levels: {
      voll: "Einblendung mit allen Spielen seit deinem letzten Besuch, samt Punkten.",
      dezent: "Einblendung nur mit der Summe — wie viele Spiele, wie viele Punkte.",
      aus: "Keine Einblendung. Die Abrechnung bleibt über das Menü erreichbar.",
    },
  },
  vorschau: {
    title: "Tippen — Vorschau & Aussicht",
    hint: "Ob dir beim Tippen gezeigt wird, was dein Tipp bringen könnte.",
    levels: {
      voll: "Mögliche Punkte + Aufschlüsselung + Risiko-Einstufung.",
      dezent: "Nur mögliche Punkte und Risiko-Label.",
      aus: "Nichts — blind tippen, volle Überraschung.",
    },
  },
};

export function sanitizePrefs(p = {}) {
  const pick = (v, d) => (LEVELS.includes(v) ? v : d);
  const src = p && typeof p === "object" ? p : {};
  return {
    abrechnung: pick(src.abrechnung, DEFAULT_PREFS.abrechnung),
    vorschau: pick(src.vorschau, DEFAULT_PREFS.vorschau),
    zwischenabrechnung: pick(src.zwischenabrechnung, DEFAULT_PREFS.zwischenabrechnung),
    vergleich: sanitizeVergleich(src.vergleich),
    startScreen: START_SCREENS.includes(src.startScreen) ? src.startScreen : DEFAULT_PREFS.startScreen,
    bewegung: BEWEGUNG_STUFEN.includes(src.bewegung) ? src.bewegung : DEFAULT_PREFS.bewegung,
    rasterWeite: RASTER_WEITEN.includes(src.rasterWeite) ? src.rasterWeite : DEFAULT_PREFS.rasterWeite,
    haptik: HAPTIK_STUFEN.includes(src.haptik) ? src.haptik : DEFAULT_PREFS.haptik,
    vorbelegung: _VORBELEGUNGEN.includes(src.vorbelegung) ? src.vorbelegung : DEFAULT_PREFS.vorbelegung,
    mehrfachTipp: MEHRFACH_MODI.includes(src.mehrfachTipp) ? src.mehrfachTipp : DEFAULT_PREFS.mehrfachTipp,
    mehrfachSchalter: MEHRFACH_SCHALTER.includes(src.mehrfachSchalter) ? src.mehrfachSchalter : DEFAULT_PREFS.mehrfachSchalter,
  };
}
