// ============================================================
//  BEREIT-DURCHGANG — „kann sich außer mir überhaupt jemand anmelden?"
//
//  Aufruf:  npm run bereit
//
//  🔴 Wozu das gut ist. `CLAUDE.md` nennt genau EINEN echten Blocker für den
//  Testbetrieb der Hinrunde: den eigenen Mailversand. Ohne ihn kann sich außer
//  Andi niemand anmelden, und ohne Anmeldung gibt es keinen Test mit Freunden.
//  Daran hängen aber mehrere Dinge, die einzeln in Ordnung aussehen und
//  zusammen trotzdem nicht funktionieren: Env-Variablen, Schema, Policies,
//  Spielplan, Absender.
//
//  ⚠️ Bisher ließ sich das nur EINZELN prüfen, verteilt über Supabase-Konsole,
//  Netlify-Oberfläche und Brevo. Wer dabei einen Punkt übersieht, merkt es
//  erst, wenn ein Freund schreibt „bei mir kommt keine Mail". Dieser Durchgang
//  fragt alles an einer Stelle und sagt, was zu tun ist — Schritt für Schritt,
//  nicht als Fehlerliste.
//
//  ── Was er NICHT kann, und das gehört gesagt ──
//  Er kann keine Mail verschicken. Ob die Zustellung an eine FREMDE Adresse
//  klappt, ist der eigentliche Beweis (O2) und bleibt ein Handgriff von Hand.
//  Der Durchgang sagt am Ende, wie er geht.
//
//  ⚠️ Es werden NIE Schlüssel ausgegeben. Von jedem Wert stehen höchstens die
//  ersten und letzten Zeichen da — genug, um zwei Schlüssel auseinanderzu-
//  halten, zu wenig, um einen zu benutzen. Ein Durchgang, dessen Ausgabe man
//  nicht in einen Chat kopieren darf, wird nicht benutzt.
// ============================================================

import { existsSync, readFileSync } from "node:fs";

const zeile = (s = "─") => s.repeat(72);
const OK = "✅", FEHLT = "⛔", WARN = "⚠️ ", FRAGE = "❓";

// ── Env aus `.env.local` nachladen ──────────────────────────
// Next.js liest die Datei selbst, ein nacktes `node` nicht. Ohne diesen
// Schritt meldete der Durchgang „keine Variablen gesetzt", während die App
// einwandfrei läuft — der schlimmste Fall für ein Prüfwerkzeug.
// ⚠️ Bewusst ohne Zusatzpaket: die Datei ist ein Dutzend Zeilen `NAME=wert`.
function ladeEnv() {
  const gefunden = [];
  for (const datei of [".env.local", ".env"]) {
    if (!existsSync(datei)) continue;
    gefunden.push(datei);
    for (const roh of readFileSync(datei, "utf8").split("\n")) {
      const z = roh.trim();
      if (!z || z.startsWith("#")) continue;
      const i = z.indexOf("=");
      if (i < 1) continue;
      const name = z.slice(0, i).trim();
      let wert = z.slice(i + 1).trim();
      // Anführungszeichen abziehen, falls jemand welche gesetzt hat.
      if ((wert.startsWith('"') && wert.endsWith('"')) || (wert.startsWith("'") && wert.endsWith("'"))) {
        wert = wert.slice(1, -1);
      }
      // Bereits gesetzte Prozess-Variablen gewinnen — dieselbe Reihenfolge
      // wie bei Next.js.
      if (process.env[name] === undefined) process.env[name] = wert;
    }
  }
  return gefunden;
}

// Nie den ganzen Wert. „sb_publishable_abc…xyz" reicht zum Wiedererkennen.
const maske = (v) => {
  if (!v) return "—";
  if (v.length <= 12) return "•".repeat(v.length);
  return `${v.slice(0, 6)}…${v.slice(-4)}  (${v.length} Zeichen)`;
};

const dateien = ladeEnv();

const URL_ = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
const ANON = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "").trim();
const DIENST = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "").trim();
const QUOTEN = (process.env.ODDS_API_KEY ?? "").trim();
const API_BASIS = (process.env.NEXT_PUBLIC_API_BASIS ?? "").trim();

const schritte = [];   // was Andi tun muss, in der Reihenfolge

console.log(`\n${zeile("═")}`);
console.log("  BEREIT-DURCHGANG  ·  kann sich außer dir jemand anmelden?");
console.log(zeile("═"));

// ════════════════════════════════════════════════════════════
//  1 — Die Variablen
// ════════════════════════════════════════════════════════════
console.log(`\n${zeile()}\n  1 · VARIABLEN\n${zeile()}`);
console.log(dateien.length
  ? `  gelesen aus: ${dateien.join(", ")}`
  : `  ${WARN}keine \`.env.local\` gefunden — es zählt nur, was in der Umgebung steht`);

// ── Sieht das überhaupt nach einer Adresse aus? ─────────────
// 🔴 Der Fund vom 26.08.2026, und er ist die Sorte, die jedem passiert: Andi
// hat den PUBLISHABLE KEY in die URL-Zeile geschrieben. In der Supabase-Konsole
// liegen Adresse und Schlüssel direkt untereinander, beides ist ein langer
// Text zum Kopieren, und die App meldet danach nur „Failed to fetch".
//
// ⚠️ Und es hing eine zweite Sache daran: die URL steht unmaskiert da (sie ist
// kein Geheimnis, und der häufigste Fehler ist ein Tippfehler darin — eine
// maskierte URL kann man nicht gegenlesen). Steht dort aber ein SCHLÜSSEL,
// wurde er dadurch vollständig ausgegeben. Deshalb entscheidet nicht mehr das
// FELD, ob maskiert wird, sondern der INHALT.
const istAdresse = (v) => /^https?:\/\//i.test(v);
const pflicht = [
  ["NEXT_PUBLIC_SUPABASE_URL", URL_, "ohne sie läuft die App auf dem Mock: Daten sind beim Neuladen weg", istAdresse(URL_)],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", ANON, "der öffentliche Schlüssel; ohne ihn kommt kein Screen an Daten"],
];
const kuer = [
  ["SUPABASE_SERVICE_ROLE_KEY", DIENST, "nur serverseitig — Konto löschen und Spieltag öffnen brauchen ihn"],
  ["ODDS_API_KEY", QUOTEN, "echte Quoten; ohne ihn bleibt die Mock-Quelle"],
  ["NEXT_PUBLIC_API_BASIS", API_BASIS, "nur für den App-Build (`npm run build:app`), im Web leer richtig", true],
];

for (const [name, wert, wozu, offen] of pflicht) {
  console.log(`\n  ${wert ? OK : FEHLT} ${name}`);
  console.log(`     ${wert ? (offen ? wert : maske(wert)) : "NICHT GESETZT"} · ${wozu}`);
  // ⚠️ Der Rat richtet sich danach, WO gerade geprüft wird. Am 26.08.2026
  // meldete der Durchgang „setzen — in Netlify", obwohl er gerade auf Andis
  // Rechner lief und die `.env.local` sogar schon gelesen hatte. Ein Hinweis,
  // der auf den falschen Ort zeigt, kostet einen ganzen Anlauf.
  if (!wert) {
    schritte.push(dateien.length
      ? `${name} in \`${dateien[0]}\` ergänzen — die Datei gibt es schon, es fehlt nur diese Zeile. (Für die LIVE-Seite zusätzlich in Netlify unter „Site configuration → Environment variables".)`
      : `${name} setzen — lokal in einer Datei \`.env.local\` im Projektordner, für die Live-Seite in Netlify unter „Site configuration → Environment variables".`);
  }
}
for (const [name, wert, wozu, offen] of kuer) {
  console.log(`\n  ${wert ? OK : WARN}${wert ? " " : ""}${name}`);
  console.log(`     ${wert ? (offen ? wert : maske(wert)) : "nicht gesetzt"} · ${wozu}`);
}

// 🔴 Die dritte Variante desselben Fehlers, am 26.08.2026 gemessen: der Wert
// trägt den VARIABLENNAMEN nochmal in sich —
// `NEXT_PUBLIC_SUPABASE_URL=NEXT_PUBLIC_SUPABASE_URL=https://…`. Das passiert,
// wenn man eine fertige `NAME=wert`-Zeile hinter ein schon vorhandenes `=`
// setzt, und es ist in einer Textdatei ohne Farben praktisch unsichtbar.
//
// ⚠️ Diese Prüfung läuft über ALLE gelesenen Variablen, nicht nur über die
// Supabase-Adresse: der Griff ist unabhängig davon, welche Zeile gerade
// bearbeitet wird.
// ⚠️ Gemerkt, weil es die Folge-Meldungen unterdrückt: eine Namensdopplung
// erklärt AUCH, warum die Adresse nicht mit `https://` anfängt. Beide Befunde
// nebeneinander sind zwei Meldungen für eine Ursache — und die Folge stünde
// obendrein zuerst da. Ein Durchgang, der dreimal dasselbe sagt, wird beim
// dritten Mal überblättert.
let namensDopplung = false;
for (const [name] of [...pflicht, ...kuer]) {
  const w = process.env[name] ?? "";
  if (!w.startsWith(`${name}=`)) continue;
  namensDopplung = true;
  const knapp = w.slice(name.length + 1);
  console.log(`\n  ${FEHLT} ${name} trägt den eigenen Namen im Wert.`);
  console.log("     Da steht `NAME=NAME=wert` statt `NAME=wert` — eine fertige Zeile");
  console.log("     ist hinter ein schon vorhandenes `=` geraten. Richtig ist nur:");
  console.log(`       ${name}=${istAdresse(knapp) ? knapp : maske(knapp)}`);
  schritte.unshift(`In \`${dateien[0] ?? ".env.local"}\` das doppelte \`${name}=\` entfernen — der Wert fängt direkt hinter dem ERSTEN Gleichheitszeichen an.`);
}

// ⚠️ Und der zweite Griff daneben, direkt danach passiert: die Adresse MIT
// Pfad kopiert (`https://…supabase.co/rest/v1/`). Genau die steht in der
// Konsole zum Kopieren bereit, ist aber nicht die, die hier hingehört —
// `supabase-js` hängt `/rest/v1` selbst an und fragt dann `/rest/v1/rest/v1/…`.
//
// 🔴 Bewusst nur MELDEN, nicht stillschweigend abschneiden: der Durchgang soll
// sagen, was die APP tun wird, nicht was er selbst reparieren kann. Repariert
// er es nur für sich, meldet er grün und die App bleibt kaputt — genau die
// zweite Wahrheit, gegen die das halbe Repo geschrieben ist.
if (!namensDopplung && istAdresse(URL_) && /\/rest\/v1\/?$/i.test(URL_)) {
  const knapp = URL_.replace(/\/rest\/v1\/?$/i, "");
  console.log(`\n  ${FEHLT} NEXT_PUBLIC_SUPABASE_URL trägt einen Pfad zu viel.`);
  console.log("     `/rest/v1` gehört NICHT dazu — die App hängt es selbst an und");
  console.log("     fragt sonst `/rest/v1/rest/v1/…`. Richtig ist nur:");
  console.log(`       ${knapp}`);
  schritte.unshift(`NEXT_PUBLIC_SUPABASE_URL auf \`${knapp}\` kürzen — ohne \`/rest/v1\` am Ende.`);
}

// 🔴 Steht in der URL-Zeile in Wahrheit ein Schlüssel? Das ist kein
// theoretischer Fall — siehe den Kommentar oben. Ohne diese Prüfung meldet der
// Durchgang brav „✅ gesetzt", scheitert zwei Abschnitte später an einem
// Netzwerkfehler und lässt den Leser die Ursache suchen.
if (!namensDopplung && URL_ && !istAdresse(URL_)) {
  console.log(`\n  ${FEHLT} NEXT_PUBLIC_SUPABASE_URL ist keine Adresse.`);
  console.log("     Dort steht etwas, das nicht mit `https://` anfängt —");
  console.log(`     ${/^sb_(publishable|secret)_|^eyJ/.test(URL_) ? "das sieht nach einem SCHLÜSSEL aus." : "vermutlich ein Tippfehler."}`);
  console.log("     Die Adresse steht in Supabase unter „Project Settings → Data API“");
  console.log("     ganz oben als „Project URL“ und sieht so aus:");
  console.log("       https://abcdefghijklmnop.supabase.co");
  schritte.unshift("NEXT_PUBLIC_SUPABASE_URL berichtigen — dort gehört die „Project URL“ hin (beginnt mit https://), nicht ein Schlüssel.");
}

// 🔴 Der Fund, der sonst niemandem auffällt: ein Dienst-Schlüssel mit
// `NEXT_PUBLIC_` davor landet im Browser-Bundle. Architektur-Regel 2.
for (const name of Object.keys(process.env)) {
  if (!name.startsWith("NEXT_PUBLIC_")) continue;
  const w = process.env[name] ?? "";
  if (/service_role|^sb_secret_/i.test(w) || /SERVICE_ROLE|SECRET_KEY/.test(name)) {
    console.log(`\n  ${FEHLT} ${name} sieht nach einem GEHEIMEN Schlüssel aus.`);
    console.log("     Alles mit `NEXT_PUBLIC_` wird in die Seite hineingebaut und ist");
    console.log("     für jeden Besucher lesbar. Umbenennen und den Schlüssel neu erzeugen.");
    schritte.unshift(`${name} entfernen und den Schlüssel in Supabase NEU ERZEUGEN — er war öffentlich.`);
  }
}

// ════════════════════════════════════════════════════════════
//  2 — Die Datenbank
// ════════════════════════════════════════════════════════════
console.log(`\n${zeile()}\n  2 · DATENBANK\n${zeile()}`);

const TABELLEN = [
  "profiles", "profile_privat", "rounds", "round_members", "matches", "tips",
  "votes", "season_tips", "presets", "rule_proposals", "rule_proposal_votes",
  "admin_freigaben",
];

async function frage(tabelle, schluessel) {
  const antwort = await fetch(`${URL_}/rest/v1/${tabelle}?select=*&limit=1`, {
    headers: { apikey: schluessel, Authorization: `Bearer ${schluessel}` },
  });
  let leib = null;
  try { leib = await antwort.json(); } catch { /* leerer Körper ist in Ordnung */ }
  return { status: antwort.status, leib };
}

if (!URL_ || !ANON) {
  console.log(`\n  ${FEHLT} übersprungen — ohne URL und Schlüssel ist nichts zu fragen.`);
} else {
  let erreichbar = true;
  try {
    const probe = await fetch(`${URL_}/rest/v1/`, { headers: { apikey: ANON } });
    console.log(`\n  ${probe.ok || probe.status === 404 ? OK : WARN} erreichbar · HTTP ${probe.status} · ${URL_}`);
    if (probe.status === 401) {
      erreichbar = false;
      console.log(`  ${FEHLT} Der Schlüssel wird abgelehnt. URL und Schlüssel gehören zu verschiedenen Projekten?`);
      schritte.push("Anon-/Publishable-Key aus DEMSELBEN Supabase-Projekt kopieren wie die URL.");
    }
  } catch (e) {
    erreichbar = false;
    console.log(`\n  ${FEHLT} nicht erreichbar: ${e.message}`);
    schritte.push("Supabase-URL prüfen — sie sieht so aus: https://<projekt>.supabase.co");
  }

  if (erreichbar) {
    const fehlend = [], gesperrt = [], da = [];
    for (const t of TABELLEN) {
      try {
        const { status, leib } = await frage(t, ANON);
        // 🔴 Der Unterschied, auf dem dieser ganze Abschnitt beruht:
        // PGRST205 heißt „Tabelle gibt es nicht", 401/403 heißt „gibt es, du
        // darfst nur nicht". Das zweite ist bei RLS der NORMALFALL und kein
        // Fehler — wer beides gleich behandelt, meldet ein gesundes Schema als
        // kaputt.
        if (leib?.code === "PGRST205" || status === 404) fehlend.push(t);
        else if (status === 401 || status === 403) gesperrt.push(t);
        else da.push(t);
      } catch {
        fehlend.push(`${t} (Anfrage fehlgeschlagen)`);
      }
    }
    console.log(`\n  ${fehlend.length ? FEHLT : OK} Tabellen: ${da.length + gesperrt.length} von ${TABELLEN.length} vorhanden`);
    if (da.length) console.log(`     lesbar:   ${da.join(", ")}`);
    if (gesperrt.length) {
      console.log(`     geschützt: ${gesperrt.join(", ")}`);
      console.log("     (Row Level Security greift — ohne Anmeldung richtig so)");
    }
    if (fehlend.length) {
      console.log(`     ${FEHLT} FEHLT:    ${fehlend.join(", ")}`);
      schritte.push("`supabase/schema.sql` im SQL-Editor KOMPLETT ausführen — die Datei ist idempotent, mehrfach ausführen schadet nicht.");
    }

    // Spielplan: ohne Spiele gibt es nichts zu tippen.
    try {
      const antwort = await fetch(`${URL_}/rest/v1/matches?select=id&limit=1`, {
        headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, Prefer: "count=exact" },
      });
      const bereich = antwort.headers.get("content-range");     // z. B. "0-0/1943"
      const anzahl = bereich?.includes("/") ? bereich.split("/")[1] : null;
      if (anzahl && anzahl !== "*") {
        const n = Number(anzahl);
        console.log(`\n  ${n > 0 ? OK : FEHLT} Spiele im Katalog: ${n}`);
        if (n === 0) schritte.push("`supabase/seed.sql` ausführen — ohne Spiele gibt es nichts zu tippen.");
      } else {
        console.log(`\n  ${FRAGE} Zahl der Spiele nicht ablesbar (HTTP ${antwort.status}) — vermutlich schützt RLS die Tabelle.`);
      }
    } catch { /* schon oben gemeldet */ }
  }
}

// ════════════════════════════════════════════════════════════
//  3 — Anmeldung und Mailversand
// ════════════════════════════════════════════════════════════
console.log(`\n${zeile()}\n  3 · ANMELDUNG\n${zeile()}`);
console.log(`
  ${FRAGE} Diesen Teil kann der Durchgang NICHT prüfen, und das ist keine Lücke,
     sondern der Punkt: ob eine Mail bei einem FREMDEN ankommt, weiß man erst,
     wenn eine angekommen ist. Der eingebaute Versand von Supabase lässt genau
     das nicht zu („Email address not authorized").

  So führst du den Beweis:

     1. Öffne die App im Browser.
     2. Gib eine Adresse ein, die NICHT dir gehört — die eines Freundes.
     3. Klicke auf „Link schicken".
     4. Frag den Freund, ob die Mail angekommen ist. Auch im Spam nachsehen.
     5. Kommt sie an: O2 in \`design/auftraege.md\` auf ✅ setzen, mit Datum.

  ${WARN}Bekannt und in Kauf genommen: DKIM steht auf „Standard" (signiert wird
     mit Brevos Domain) und DMARC warnt vor der Freemail-Absenderadresse.
     Ein Teil der Post landet dadurch im Spam. Beides verschwindet erst mit
     einer eigenen Domain.
`);

// ════════════════════════════════════════════════════════════
//  Was zu tun ist
// ════════════════════════════════════════════════════════════
console.log(`${zeile("═")}`);
if (!schritte.length) {
  console.log("  ✅ Nichts offen, was von hier aus zu sehen wäre.");
  console.log("     Es fehlt nur noch der Zustellungs-Beweis aus Abschnitt 3.");
} else {
  console.log(`  ${schritte.length} SCHRITT(E) OFFEN — in dieser Reihenfolge:`);
  console.log(zeile("═"));
  schritte.forEach((s, i) => console.log(`\n  ${i + 1}. ${s}`));
}
console.log(`\n${zeile("═")}\n`);
