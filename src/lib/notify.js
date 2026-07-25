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

export const KANAELE = ["neuerSpieltag", "erinnerung"];

export const KANAL_META = {
  neuerSpieltag: {
    title: "Neuer Spieltag tippbar",
    hint: "Einmal, sobald die Spiele eines neuen Spieltags offen sind.",
  },
  erinnerung: {
    title: "Erinnerung vor Anpfiff",
    hint: "Nur für Spiele, die du noch NICHT getippt hast — sonst nie.",
  },
};

// Vorwarnzeiten in Stunden. Mehrere gleichzeitig sind erlaubt („24 h und 2 h").
export const VORLAUF_OPTIONEN = [24, 12, 6, 3, 1];

export const DEFAULT_NOTIFY = {
  enabled: false,              // erst nach bewusster Zustimmung
  neuerSpieltag: true,
  erinnerung: true,
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
  if (p.neuerSpieltag) {
    const proSpieltag = new Map();
    for (const m of matches) {
      const md = m.matchday ?? 0;
      if (!proSpieltag.has(md)) proSpieltag.set(md, []);
      proSpieltag.get(md).push(m);
    }
    for (const [md, liste] of proSpieltag) {
      if (!md) continue;
      const offen = liste.filter((m) => new Date(m.kickoff).getTime() > jetzt);
      if (offen.length !== liste.length) continue;      // schon angepfiffen → kein „neu"
      const getippt = liste.some((m) => meine.has(m.id ?? m.matchId));
      if (getippt) continue;                             // schon dran gewesen
      const key = `spieltag:${md}`;
      if (schon.has(key)) continue;
      out.push({
        art: "neuerSpieltag", key, matchday: md,
        titel: `Spieltag ${md} ist offen`,
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
  if (!teile.length) return "Nichts ausgewählt — es kommt nichts an.";
  return `${teile.join(" · ")} · höchstens ${p.maxProTag} am Tag · Ruhe ${p.ruhezeit.von}–${p.ruhezeit.bis} Uhr.`;
}
