// ============================================================
//  ANMELDUNG — was hat der Nutzer da eingefügt?
//
//  🔴 Der Befund, aus dem diese Datei entstanden ist (08.08.2026, Andis
//  iPhone): Supabase lässt die Mail-Vorlagen auf dem GRATIS-Tarif nicht
//  bearbeiten („Set up custom SMTP to edit templates"). Damit lässt sich
//  `{{ .Token }}` NICHT in die Mail holen, und die Standard-Mail „Your
//  sign-in link" enthält ausschließlich den Link. Das Code-Feld in der App
//  hatte also nichts zum Eintippen.
//
//  ── Warum der Link trotzdem reicht ──
//  In der Bestätigungs-Adresse steckt DERSELBE Token wie im Sechsstelligen,
//  nur als `token`/`token_hash` im Adressteil:
//
//    https://<projekt>.supabase.co/auth/v1/verify
//      ?token=pkce_abc123…&type=magiclink&redirect_to=https://…
//
//  Wer den Link in der Mail lange gedrückt hält und „Kopieren" wählt, hat den
//  Token in der Zwischenablage — ohne die App zu verlassen. `verifyOtp` nimmt
//  ihn als `token_hash` entgegen. Damit funktioniert die Anmeldung in der
//  Home-Bildschirm-App, ohne dass irgendetwas an Supabase geändert werden muss.
//
//  ⚠️ Der Link darf dafür NICHT vorher geöffnet worden sein: er ist einmalig.
//  Kopieren statt antippen.
//
//  ⚠️ `type` wird aus dem Link ÜBERNOMMEN, nicht geraten. Supabase schickt je
//  nach Anlass `magiclink` (bekannte Adresse) oder `signup` (erste Anmeldung);
//  mit dem falschen Typ lehnt `verifyOtp` einen völlig gültigen Token ab.
//
//  Reine Funktionen, UI-frei.
// ============================================================

// Wie viele Zeichen ein eingetippter Zahlencode hat.
export const CODE_LAENGE = 6;

// Zerlegt, was im Eingabefeld steht.
//   { art: "code",  token }                  — sechs Ziffern
//   { art: "link",  token, typ }             — kopierte Adresse aus der Mail
//   { art: "leer" | "unklar" }
export function leseAnmeldung(eingabe) {
  const roh = String(eingabe ?? "").trim();
  if (!roh) return { art: "leer" };

  // Ein reiner Zahlencode: Leerzeichen dürfen drin sein, sonst nur Ziffern.
  const ziffern = roh.replace(/\s/g, "");
  if (/^\d+$/.test(ziffern)) {
    return ziffern.length === CODE_LAENGE
      ? { art: "code", token: ziffern }
      : { art: "unklar", grund: `Ein Code hat ${CODE_LAENGE} Ziffern.` };
  }

  // Alles andere wird als Adresse gelesen. Mail-Programme hängen gern
  // Zeilenumbrüche oder spitze Klammern an — beides vorher weg.
  const sauber = ziffern.replace(/^[<[(]+|[>\])]+$/g, "");
  let url;
  try {
    url = new URL(sauber);
  } catch {
    return { art: "unklar", grund: "Das sieht weder nach Code noch nach Link aus." };
  }

  const p = url.searchParams;
  // `token_hash` ist die neuere Schreibweise, `token` die ältere. Beide
  // annehmen: welche in der Mail steht, hängt an der Supabase-Version, und
  // ein Nutzer kann das nicht wissen.
  const token = p.get("token_hash") || p.get("token");
  if (!token) {
    return { art: "unklar", grund: "In diesem Link steckt kein Anmelde-Token." };
  }
  // `magiclink` und `signup` sind die beiden, die hier ankommen; alles andere
  // reichen wir unverändert durch, statt es auf einen Typ zu zwingen.
  const typ = p.get("type") || "magiclink";
  return { art: "link", token, typ };
}
