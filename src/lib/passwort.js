// ============================================================
//  PASSWÖRTER — die Regeln, UI-frei und prüfbar
//
//  🔴 Andis Ansage vom 29.08.2026, und sie ist eine Bedienungs-Ansage, keine
//  Sicherheits-Ansage:
//
//    „Aber wieso nicht über Passwort, finde das mit den Emails manchmal
//     umständlich und benutzerunfreundlich immer die App schliessen zu müssen
//     wenn man das Handy auch das Passwort und Benutzernamen merken lassen
//     kann."
//
//  Er hat recht, und der Grund steht schon in `AuthProvider.jsx`: der
//  Magic-Link kostet JEDES MAL einen App-Wechsel, und auf dem
//  Home-Bildschirm-iPhone scheitert er sogar bauartbedingt. Ein Passwort kann
//  der Passwortmanager des Geräts merken — ein Magic-Link nicht.
//
//  ⚠️ **Der Magic-Link bleibt trotzdem.** Er ist der erste Weg hinein (man hat
//  ja noch kein Passwort) und der Weg zurück, wenn das Passwort weg ist. Beides
//  nebeneinander ist keine Doppelung, sondern die Arbeitsteilung: Passwort für
//  den Alltag, Mail für den Ausnahmefall.
//
//  ── Warum LÄNGE und nicht Sonderzeichen ──
//  🔴 Die Regel „mindestens ein Großbuchstabe, eine Zahl und ein Sonderzeichen"
//  ist gut gemeint und macht Passwörter im Schnitt SCHLECHTER: sie führt zu
//  `Passwort1!` — kurz, vorhersagbar, und für den Menschen schwer zu merken.
//  Länge ist der Faktor, der wirklich zählt. Deshalb hier: acht Zeichen als
//  Untergrenze, keine erzwungene Zusammensetzung, dafür eine kurze Sperrliste
//  gegen das offensichtlich Geratene.
//
//  ⚠️ **72 Bytes sind eine HARTE Grenze, keine Bequemlichkeit.** Supabase
//  hasht mit bcrypt, und bcrypt schneidet nach 72 Bytes ab — ohne Fehler. Wer
//  ein längeres Passwort setzt, meldet sich später mit den ersten 72 Bytes an
//  und merkt nie, dass der Rest nie zählte. Umlaute brauchen zwei Bytes,
//  Emoji vier: „ä" ist also nicht ein Zeichen, sondern zwei. Deshalb wird in
//  BYTES gemessen, nicht in Zeichen.
// ============================================================

export const PASSWORT_MIN = 8;
export const PASSWORT_MAX_BYTES = 72;

// Nur das offensichtlich Geratene. Eine lange Liste gehört nicht ins Frontend
// — sie wäre groß, veraltet schnell und wiegt in falscher Sicherheit. Das ist
// eine Stolperschwelle gegen „passwort123", kein Schutz gegen einen Angreifer.
const ZU_NAH = [
  "passwort", "password", "12345678", "123456789", "qwertz", "qwerty",
  "fussball", "football", "tippspiel", "quotentippspiel", "letmein",
  "willkommen", "welcome", "admin123", "geheim",
];

const bytes = (s) => new TextEncoder().encode(String(s ?? "")).length;

// Was der Nutzer als Fehler zu lesen bekommt. `null` heißt: geht in Ordnung.
//
// ⚠️ Der Ton ist hier bewusst SACHLICH (docs/tonfall.md): wer gerade nicht
// weiterkommt, will wissen warum, nicht angefeuert werden.
export function pruefePasswort(passwort, email = "") {
  const p = String(passwort ?? "");
  if (p.length === 0) return "Bitte ein Passwort eingeben.";
  if (p.trim().length !== p.length) {
    // Führende oder abschließende Leerzeichen sind fast immer ein Versehen
    // beim Einfügen — und sie zählen mit. Später fragt sich jemand, warum
    // dasselbe Passwort nicht mehr passt.
    return "Das Passwort beginnt oder endet mit einem Leerzeichen. Bitte entfernen.";
  }
  if (p.length < PASSWORT_MIN) return `Mindestens ${PASSWORT_MIN} Zeichen.`;
  if (bytes(p) > PASSWORT_MAX_BYTES) {
    return `Höchstens ${PASSWORT_MAX_BYTES} Zeichen (Umlaute zählen doppelt). Sonst wird der Rest stillschweigend abgeschnitten.`;
  }
  const klein = p.toLowerCase();
  if (ZU_NAH.some((x) => klein === x || klein.startsWith(x))) {
    return "Das steht auf jeder Rateliste. Nimm etwas, das nur du kennst.";
  }
  const adresse = String(email ?? "").toLowerCase().trim();
  if (adresse && (klein === adresse || klein === adresse.split("@")[0])) {
    return "Das Passwort darf nicht deine Mailadresse sein.";
  }
  return null;
}

// Wie stark ist es ungefähr? Für den Balken unter dem Feld — eine Hilfe beim
// Tippen, keine Freigabe.
//
// ⚠️ Bewusst grob und aus der LÄNGE plus der Zeichenvielfalt gerechnet, nicht
// aus einer Formel, die Genauigkeit vortäuscht. Ein Balken, der „sehr stark"
// sagt, weil ein Ausrufezeichen drin ist, erzieht zum falschen Passwort.
export function passwortStaerke(passwort) {
  const p = String(passwort ?? "");
  if (!p) return { stufe: 0, wort: "" };
  const arten = [/[a-zäöüß]/, /[A-ZÄÖÜ]/, /[0-9]/, /[^A-Za-zÄÖÜäöüß0-9]/]
    .filter((r) => r.test(p)).length;
  const punkte = Math.min(4, Math.floor(p.length / 5) + (arten - 1));
  if (p.length < PASSWORT_MIN) return { stufe: 1, wort: "zu kurz" };
  if (punkte <= 1) return { stufe: 1, wort: "schwach" };
  if (punkte === 2) return { stufe: 2, wort: "geht so" };
  if (punkte === 3) return { stufe: 3, wort: "gut" };
  return { stufe: 4, wort: "stark" };
}

// ── Fehlermeldungen von Supabase übersetzen ─────────────────
//
// 🔴 Sie kommen auf Englisch und aus der Bibliothek, nicht aus unserem Code.
// Ein Nutzer, der „Invalid login credentials" liest, weiß nicht, ob die
// Adresse oder das Passwort falsch war — und soll es auch nicht wissen.
//
// ⚠️ **Bewusst dieselbe Meldung für „Adresse unbekannt" und „Passwort
// falsch".** Wer die beiden unterscheiden kann, kann durchprobieren, welche
// Adressen überhaupt ein Konto haben. Das ist kein theoretisches Risiko: bei
// einem Tippspiel unter Freunden reicht es, um zu erfahren, wer mitspielt.
export function passwortFehlerText(fehler) {
  const roh = String(fehler?.message ?? fehler ?? "").toLowerCase();
  if (!roh) return "Anmeldung fehlgeschlagen. Bitte später erneut versuchen.";
  if (roh.includes("invalid login credentials")) {
    return "Adresse oder Passwort stimmt nicht.";
  }
  if (roh.includes("email not confirmed")) {
    return "Diese Adresse ist noch nicht bestätigt. Schau in dein Postfach.";
  }
  if (roh.includes("user already registered") || roh.includes("already been registered")) {
    return "Für diese Adresse gibt es schon ein Konto. Melde dich an oder setz das Passwort zurück.";
  }
  if (roh.includes("password should be at least")) return `Mindestens ${PASSWORT_MIN} Zeichen.`;
  if (roh.includes("rate limit") || roh.includes("too many")) {
    return "Zu viele Versuche. Bitte ein paar Minuten warten.";
  }
  return "Anmeldung fehlgeschlagen. Bitte später erneut versuchen.";
}
