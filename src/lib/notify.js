// ============================================================
//  BENACHRICHTIGUNGEN — Erinnerung statt Dauerbeschallung
//
//  Leitgedanke: Eine Tippspiel-App darf genau ZWEI Dinge melden, und beide
//  nur, weil man sonst etwas VERPASST:
//    1) „Neuer Spieltag ist tippbar."
//    2) „Dein Spiel beginnt in X Stunden — du hast noch nicht getippt."
//  Kein „xy hat getippt", kein Marketing, keine Streak-Erpressung.
//
//  Alles ist einzeln abschaltbar, die Vorwarnzeit frei wählbar, und es gibt
//  eine RUHEZEIT (nachts kommt nichts). Standard ist bewusst zurückhaltend.
//
//  Dieses Modul entscheidet NUR, WAS wann fällig wäre — reine Funktionen,
//  kein Versand, kein I/O. Der eigentliche Kanal (Web-Push, Mail, System-
//  Benachrichtigung) hängt sich später an `dueNotifications()`; dadurch ist
//  die Zustellung austauschbar wie die Quoten-Quelle.
// ============================================================

import { wettbewerbLabel, DEFAULT_WETTBEWERB } from "./wettbewerbe";

// 🔴 ZP5 (Andi, 25.08.2026): „wir machen noch ein Untermenü wo jeder
// Benachrichtigungstyp einzeln an und abgewählt werden kann."
//
// Bis heute gab es ZWEI Arten. Der Vorbehalt im Auftragsbuch war richtig —
// ein Untermenü mit zwei Zeilen ist keines — und er sagte auch, wann er
// entfällt: „sobald mehr dazukommen, und die kommen". Sie sind jetzt da, und
// zwar genau die drei, die beim Testbetrieb mit Freunden zählen:
//
//   geblockt   — jemand hat mir ein Spiel gesperrt (Fremdjoker, KT7). Ohne
//                Hinweis merkt man es erst beim Tippen, und dann ist die Zeit
//                vielleicht schon um.
//   abgerechnet — ein Spieltag ist fertig gewertet.
//   ueberholt  — jemand ist in der Rangliste an mir vorbeigezogen.
//
// ⚠️ Die Reihenfolge hier ist die ANZEIGE-Reihenfolge im Untermenü: was am
// dringendsten ist, steht oben. „Überholt" ist Unterhaltung und steht unten —
// und ist als einziges standardmäßig AUS (siehe `DEFAULT_NOTIFY`).
export const KANAELE = ["neuerSpieltag", "erinnerung", "geblockt", "abgerechnet", "ueberholt"];

export const KANAL_META = {
  neuerSpieltag: {
    title: "Neuer Spieltag tippbar",
    hint: "Einmal, sobald die Spiele eines neuen Spieltags offen sind.",
  },
  erinnerung: {
    title: "Erinnerung vor Anpfiff",
    hint: "Nur für Spiele, die du noch NICHT getippt hast — sonst nie.",
  },
  geblockt: {
    title: "Jemand hat dir ein Spiel gesperrt",
    hint: "Sofort, wenn ein Mitspieler einen Fremdjoker auf dich setzt. Sonst merkst du es erst beim Tippen.",
  },
  abgerechnet: {
    title: "Spieltag abgerechnet",
    hint: "Einmal, wenn alle Spiele eines Spieltags gewertet sind.",
  },
  ueberholt: {
    title: "Jemand ist an dir vorbei",
    hint: "Wenn dich ein Mitspieler in der Rangliste überholt. Standardmäßig aus.",
  },
};

// Vorwarnzeiten in Stunden. Mehrere gleichzeitig sind erlaubt („24 h und 2 h").
export const VORLAUF_OPTIONEN = [24, 12, 6, 3, 1];

export const DEFAULT_NOTIFY = {
  enabled: false,              // erst nach bewusster Zustimmung
  neuerSpieltag: true,
  erinnerung: true,
  geblockt: true,          // betrifft die Frist — gehört an
  abgerechnet: true,
  // ⛔ Als einziges AUS: „jemand ist an dir vorbei" kann an einem Spieltag
  // mehrfach kommen und ist reine Unterhaltung. Eine Benachrichtigung, die
  // nur kribbelt, schaltet man nach der dritten ganz ab — und dann sind auch
  // die wichtigen weg.
  ueberholt: false,
  vorlaufStunden: [24, 3],     // einmal am Vortag, einmal kurz davor
  nurUngetippte: true,         // Erinnerungen nur für offene eigene Tipps
  ruhezeit: { von: 22, bis: 8 }, // nachts nichts (Ortszeit des Geräts)
  maxProTag: 3,                // harte Obergrenze gegen Dauerfeuer
};

export const NOTIFY_LIMITS = { maxProTag: { min: 1, max: 10 } };

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
const hour = (v, d) => clamp(Math.round(num(v, d)), 0, 23);

export function sanitizeNotify(partial = {}) {
  const p = partial && typeof partial === "object" ? partial : {};
  const vorlauf = Array.isArray(p.vorlaufStunden)
    ? [...new Set(p.vorlaufStunden.filter((h) => VORLAUF_OPTIONEN.includes(h)))].sort((a, b) => b - a)
    : DEFAULT_NOTIFY.vorlaufStunden;
  return {
    enabled: p.enabled === true,
    neuerSpieltag: p.neuerSpieltag !== false,
    erinnerung: p.erinnerung !== false,
    geblockt: p.geblockt !== false,
    abgerechnet: p.abgerechnet !== false,
    // ⚠️ Umgekehrt geprüft, weil die Vorgabe AUS ist: `!== false` machte aus
    // „nicht gesetzt" ein „an" und der Kanal wäre entgegen der Vorgabe aktiv.
    ueberholt: p.ueberholt === true,
    vorlaufStunden: vorlauf.length ? vorlauf : DEFAULT_NOTIFY.vorlaufStunden,
    nurUngetippte: p.nurUngetippte !== false,
    ruhezeit: {
      von: hour(p.ruhezeit?.von, DEFAULT_NOTIFY.ruhezeit.von),
      bis: hour(p.ruhezeit?.bis, DEFAULT_NOTIFY.ruhezeit.bis),
    },
    maxProTag: clamp(Math.round(num(p.maxProTag, DEFAULT_NOTIFY.maxProTag)), NOTIFY_LIMITS.maxProTag.min, NOTIFY_LIMITS.maxProTag.max),
  };
}

// Liegt dieser Zeitpunkt in der Ruhezeit? Fenster darf über Mitternacht gehen
// (22 → 8 bedeutet 22,23,0,…,7).
export function inRuhezeit(date, ruhezeit = DEFAULT_NOTIFY.ruhezeit) {
  const h = new Date(date).getHours();
  const { von, bis } = ruhezeit;
  if (von === bis) return false;                 // kein Fenster
  return von < bis ? h >= von && h < bis : h >= von || h < bis;
}

// ── Was wäre JETZT fällig? ──────────────────────────────────
// matches: [{ id|matchId, kickoff, matchday }]
// tips:    [{ match_id|matchId, user_id|userId }]
// gesehen: [{ art, key }] — was diesem Nutzer schon zugestellt wurde
//          (verhindert Wiederholungen; Speicherung macht die UI/der Store).
//
// Rückgabe: [{ art, key, titel, text, matchId?, matchday?, stunden? }]
// `key` ist stabil → doppelte Zustellung lässt sich zuverlässig ausschließen.
export function dueNotifications({
  matches = [], tips = [], userId, prefs = DEFAULT_NOTIFY,
  jetzt = Date.now(), gesehen = [],
  // 🔴 Die drei neuen Arten (ZP5) brauchen Angaben, die diese Datei nicht
  // selbst holen darf — sie ist store-frei, und „welche Spiele gehören zur
  // Runde" ist eine Frage der Runden-Schicht. Wer füttert, hat sie beantwortet.
  eingriffe = [],        // aus `getFremdEingriffe(roundId)`
  abrechnungen = [],     // [{ wettbewerb, matchday, punkte }]
  ueberholungen = [],    // [{ name, vonUserId, rang }]
}) {
  const p = sanitizeNotify(prefs);
  if (!p.enabled) return [];
  if (inRuhezeit(jetzt, p.ruhezeit)) return [];

  const schon = new Set(gesehen.map((g) => g.key));
  const meine = new Set(
    tips.filter((t) => (t.user_id ?? t.userId) === userId).map((t) => t.match_id ?? t.matchId)
  );
  const out = [];

  // 1) Neuer Spieltag tippbar: der früheste Anpfiff eines Spieltags liegt in
  //    der Zukunft und der Spieltag ist noch komplett ungetippt.
  //
  //    ⚠️ Gruppiert wird nach WETTBEWERB + Spieltag, nicht nach der nackten
  //    Zahl. „Spieltag 1" gibt es in jeder Liga einmal — ohne den Wettbewerb im
  //    Schlüssel fielen fünf verschiedene Spieltage zu einem zusammen: die
  //    Meldung käme nur einmal, und ein bereits getipptes Bundesligaspiel
  //    unterdrückte den Hinweis auf die Premier League. Derselbe Fehler wie
  //    seinerzeit beim Joker.
  if (p.neuerSpieltag) {
    const proSpieltag = new Map();
    for (const m of matches) {
      const md = m.matchday ?? 0;
      const w = m.wettbewerb ?? DEFAULT_WETTBEWERB;
      const key = `${w}|${md}`;
      if (!proSpieltag.has(key)) proSpieltag.set(key, { wettbewerb: w, matchday: md, liste: [] });
      proSpieltag.get(key).liste.push(m);
    }
    for (const { wettbewerb, matchday: md, liste } of proSpieltag.values()) {
      if (!md) continue;
      const offen = liste.filter((m) => new Date(m.kickoff).getTime() > jetzt);
      if (offen.length !== liste.length) continue;      // schon angepfiffen → kein „neu"
      const getippt = liste.some((m) => meine.has(m.id ?? m.matchId));
      if (getippt) continue;                             // schon dran gewesen
      const key = `spieltag:${wettbewerb}:${md}`;
      if (schon.has(key)) continue;
      // Der Wettbewerb gehört in den Titel, sobald es mehrere gibt — „Spieltag 1
      // ist offen" allein wäre bei fünf Ligen nicht zuzuordnen.
      const label = wettbewerbLabel(wettbewerb);
      out.push({
        art: "neuerSpieltag", key, matchday: md, wettbewerb,
        titel: `${label} · Spieltag ${md} ist offen`,
        text: `${liste.length} Spiele warten auf deinen Tipp.`,
      });
    }
  }

  // 2) Erinnerung vor Anpfiff — nur für NICHT getippte Spiele.
  if (p.erinnerung) {
    for (const m of matches) {
      const id = m.id ?? m.matchId;
      if (p.nurUngetippte && meine.has(id)) continue;
      const restMs = new Date(m.kickoff).getTime() - jetzt;
      if (restMs <= 0) continue;
      const restH = restMs / 3600000;
      // Die kleinste Vorwarnstufe, die gerade erreicht wurde.
      const stufe = p.vorlaufStunden.filter((h) => restH <= h).sort((a, b) => a - b)[0];
      if (stufe == null) continue;
      const key = `erinnerung:${id}:${stufe}`;
      if (schon.has(key)) continue;
      out.push({
        art: "erinnerung", key, matchId: id, matchday: m.matchday ?? null, stunden: stufe,
        titel: `Noch ${stufe} h: ${m.home ?? "Spiel"} – ${m.away ?? ""}`.trim(),
        text: "Du hast für dieses Spiel noch nicht getippt.",
      });
    }
  }

  // 3) Fremdjoker: jemand hat mir ein Spiel gesperrt (KT7).
  //
  // 🔴 Die Meldung betrifft eine FRIST, nicht die Unterhaltung: wer nicht
  // weiß, dass sein Spiel gesperrt ist, versucht kurz vor Anpfiff zu tippen
  // und steht vor einem grauen Knopf. Deshalb steht sie in der Sortierung
  // unten ganz vorn (`stunden: -1`) — sie darf nicht als Erste aus der
  // Tages-Obergrenze fallen.
  //
  // ⚠️ `eingriffe` kommt von AUSSEN herein, nicht aus einem eigenen Aufruf:
  // diese Datei bleibt store-frei, und wer sie füttert, hat die Runden-Frage
  // schon beantwortet (`getFremdEingriffe(roundId)`).
  if (p.geblockt) {
    for (const e of eingriffe) {
      if ((e.aufUserId ?? e.auf_user_id) !== userId) continue;
      const id = e.matchId ?? e.match_id ?? null;
      const key = `geblockt:${id ?? "spieltag"}:${e.vonUserId ?? e.von_user_id ?? "?"}`;
      if (schon.has(key)) continue;
      const spiel = matches.find((m) => (m.id ?? m.matchId) === id);
      out.push({
        art: "geblockt", key, matchId: id, stunden: -1,
        titel: spiel ? `Gesperrt: ${spiel.home} – ${spiel.away}` : "Ein Spiel wurde dir gesperrt",
        text: `${e.vonName ?? "Ein Mitspieler"} hat einen Fremdjoker auf dich gesetzt.`,
      });
    }
  }

  // 4) Spieltag abgerechnet — einmal je Wettbewerb und Spieltag.
  if (p.abgerechnet) {
    for (const a of abrechnungen) {
      const w = a.wettbewerb ?? DEFAULT_WETTBEWERB;
      const md = a.matchday ?? 0;
      if (!md) continue;
      const key = `abgerechnet:${w}:${md}`;
      if (schon.has(key)) continue;
      out.push({
        art: "abgerechnet", key, matchday: md, wettbewerb: w, stunden: 0,
        titel: `${wettbewerbLabel(w)} · Spieltag ${md} ist gewertet`,
        text: Number.isFinite(a.punkte)
          ? `Du hast ${Math.round(a.punkte)} Punkte geholt.`
          : "Die Punkte stehen fest.",
      });
    }
  }

  // 5) Überholt — Unterhaltung, deshalb ganz hinten in der Sortierung.
  if (p.ueberholt) {
    for (const u of ueberholungen) {
      const key = `ueberholt:${u.vonUserId ?? u.name ?? "?"}:${u.rang ?? "?"}`;
      if (schon.has(key)) continue;
      out.push({
        art: "ueberholt", key, stunden: 98,
        titel: `${u.name ?? "Ein Mitspieler"} ist an dir vorbei`,
        text: Number.isFinite(u.rang) ? `Du stehst jetzt auf Rang ${u.rang}.` : "Die Rangliste hat sich geändert.",
      });
    }
  }

  // Tages-Obergrenze: das Dringendste zuerst (kleinste Restzeit), Rest fällt weg.
  out.sort((a, b) => (a.stunden ?? 99) - (b.stunden ?? 99));
  return out.slice(0, p.maxProTag);
}

// Klartext-Zusammenfassung der Einstellung — für die Vorschau im Screen,
// damit man sieht, was man sich einhandelt, BEVOR man zustimmt.
export function summarize(prefs = DEFAULT_NOTIFY) {
  const p = sanitizeNotify(prefs);
  if (!p.enabled) return "Aus — du bekommst gar keine Benachrichtigungen.";
  const teile = [];
  if (p.neuerSpieltag) teile.push("neuer Spieltag");
  if (p.erinnerung) teile.push(`Erinnerung ${p.vorlaufStunden.join(" h / ")} h vorher`);
  if (p.geblockt) teile.push("Sperren");
  if (p.abgerechnet) teile.push("Abrechnung");
  if (p.ueberholt) teile.push("Überholungen");
  if (!teile.length) return "Nichts ausgewählt — es kommt nichts an.";
  return `${teile.join(" · ")} · höchstens ${p.maxProTag} am Tag · Ruhe ${p.ruhezeit.von}–${p.ruhezeit.bis} Uhr.`;
}
