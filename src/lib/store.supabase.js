// ── Supabase-Store: dieselbe Schnittstelle wie der Mock, aber gegen
//    die echte Datenbank. Aktiv, sobald NEXT_PUBLIC_SUPABASE_* gesetzt
//    sind (siehe store.js). Scoring bleibt in der Engine — hier werden
//    nur Rohdaten geladen/geschrieben.

import { DEFAULT_RULES, scoreLeaderboard, scoreLeaderboardHistory, sanitizeRules, brauchtVerlauf } from "./engine";
import { apiPfad } from "./apiBasis";
// Beschlossene Regeländerungen wirken ab IHREM Spieltag (Schritt 5 von
// design/abstimmung-verfassung.md) — dieselbe Anbindung wie im Mock-Store.
import { regelnFuerSpieltag } from "./beschluss";
import { zeitachse, rundenSpieltagVon, bespielteSpieltage } from "./zeitachse";
// 🔴 Die Position im Verlauf — siehe die Begründung dort.
import { verlaufPositionen } from "./spieltag";
import { getSupabaseBrowserClient } from "./supabaseClient";
import { generateJoinCode } from "./joinCode";
import { sanitizeDisplayName, sanitizeAvatar } from "./avatars";
import { sanitizeGeburtsdatum } from "./geburtsdatum";
import { isPremium, applyEntitlements } from "./premium";
import { withSaisonPunkte } from "./saisonBoard";
import { scoreSaison } from "./saisonwetten";
import { rundenSpiele as rundenSpieleVon, rundenAuswahl } from "./roundStatus";
import { grobeVorauswahl } from "./spielauswahl";
import { ersatzEintraege } from "./versaeumnisBoard";
import { withDrehradPunkte, drehradZiehungen, drehradBelohnungen } from "./drehradBoard";
import { DEFAULT_WETTBEWERB, wettbewerbVon } from "./wettbewerbe";
// 🔴 `fremdEinsaetze` statt der rohen Grundform (23.08.2026): dieselbe Liste,
// aber zusätzlich mit dem, was eine GEGENWETTE braucht — die Wahrscheinlichkeit
// des getroffenen Tipps und sein Ausgang. Beides entsteht aus Quoten-
// Schnappschuss und Ergebnis, die `duellJoker.js` nicht lesen darf
// (Importzyklus, siehe Kopf von `fremdjoker.js`). Wer hier auf die alte
// Funktion zurückgeht, bekommt Einsätze ohne `p` — und die Gegenwette
// verpufft still, ohne dass irgendetwas fehlschlägt.
import { fremdEinsaetze, familieAn } from "./fremdjoker";
import { punkteJeSpieltag } from "./spieltagsPunkte";
import { darfSaisonTippen } from "./saisonFenster";
import { tippStatus, spieltagStarts } from "./tippfenster";
import { pruefeDuellEinsatz } from "./duellPruefung";

// Dieselbe Spanne, die alle anderen Aufrufer von `spieltage`-Parametern im
// Projekt verwenden (Tippabgabe.jsx, Drehrad.jsx, JokerVerteilung.jsx,
// LimitKlassen.jsx) — eine feste Saison-Länge, kein echter Spielplan-Bezug.
const SPIELTAGE = 34;

// Match-Zeile (DB) → Store-Form
const mapMatch = (m) => m && ({
  id: m.id, home: m.home, away: m.away, kickoff: m.kickoff,
  matchday: m.matchday, snapshot: m.snapshot, result: m.result,
  wettbewerb: m.wettbewerb, phase: m.phase,
});

// Ein Tipp → der Roh-Eintrag, aus dem die Engine rechnet. EINE Stelle, weil
// Leaderboard, Verlauf und Rekorde exakt dieselben Felder brauchen — vorher
// stand die Abbildung dreimal da (und einmal davon abweichend).
// `wettbewerb` und `kickoff` gehören dazu: ohne den Wettbewerb verschmelzen im
// Verlauf die fünf „Spieltag 1" zu einem Punkt, ohne den Anpfiff kann die
// Engine die Spieltage mehrerer Wettbewerbe nicht chronologisch einsortieren.
const eintragVon = (t, nameOf, matchOf) => {
  const m = matchOf(t.match_id);
  return {
    userId: t.user_id, name: nameOf(t.user_id),
    tip: t.tip, snapshot: t.snapshot,
    result: m?.result ?? null,
    // 🔴 Muss mit dem Mock übereinstimmen, sonst rechnet live etwas anderes
    // als in der Entwicklung — dieselbe Zeile steht in `store.mock.js`. Ohne
    // `matchId` lässt sich „ich war der Einzige" nicht gruppieren, und die
    // Alleinstellung bewegt keinen Punkt.
    matchId: t.match_id,
    matchday: m?.matchday ?? null,
    wettbewerb: m ? wettbewerbVon(m) : null,
    kickoff: m?.kickoff ?? null,
  };
};

// Beschluss-Lage einer Runde: `regelnFuer` je Spieltag und das Regelwerk am
// Saisonende. EINE Stelle für beide Leaderboard-Wege, sonst rechnet der
// Verlauf mit anderen Regeln als der Endstand.
// ⚠️ `adminId` kommt aus `rounds.admin_id` — `round_members` hat KEINE
// `role`-Spalte (siehe schema.sql). Eine erste Fassung fragte `m.role`; das
// war immer falsch, ohne dass etwas fehlschlug.
function beschlussLage({ rules, antraege, members, matches, achse = null, adminId = null, ausuebungen = [] }) {
  return regelnFuerSpieltag({
    rules,
    antraege,
    // Ausgeübte Rechte (Weg B): sie legen für EINEN Spieltag etwas auf das
    // Regelwerk — deshalb hier und nicht in `rounds.rules`.
    ausuebungen,
    mitglieder: (members ?? []).map((m) => ({ userId: m.user_id, istAdmin: m.user_id === adminId })),
    achse: achse ?? zeitachse(matches ?? [], rules?.zeitachse),
  });
}

export function createSupabaseStore() {
  const sb = getSupabaseBrowserClient();
  if (!sb) throw new Error("Supabase-Client nicht verfügbar (Env-Variablen fehlen).");

  const orThrow = ({ data, error }) => { if (error) throw error; return data; };

  // ── Zwischenspeicher für den Spielplan-Katalog ──────────────
  // Begründung steht bei `listMatches()`. Die Variablen liegen HIER und nicht
  // im Modul: `createSupabaseStore()` kann mehrfach aufgerufen werden (Tests,
  // SSR), und ein modulweiter Cache überlebte den Store, zu dem er gehört.
  const KATALOG_FRIST_MS = 60_000;
  // 🔴 Seit dem 27.08.2026 je VORAUSWAHL ein eigener Eintrag, nicht mehr eine
  // einzige Variable: eine Bundesliga-Runde holt 306 Spiele statt 1942, und
  // zwei Runden mit verschiedenen Wettbewerben dürfen sich ihre Listen nicht
  // gegenseitig überschreiben. Schlüssel ist die Wettbewerbs-Liste, sortiert —
  // sonst gälten `["bl","pl"]` und `["pl","bl"]` als zwei verschiedene Fragen.
  const kataloge = new Map();   // Schlüssel → { versprechen, zeit }

  // ── Gleichzeitige, gleiche Anfragen zusammenlegen ───────────
  // 🔴 Gemessen am 26.08.2026: der Hub fragte VIERMAL dieselbe Runde ab, das
  // Ranking dreimal — weil mehrere Komponenten unabhängig voneinander laden
  // und alle zur selben Zeit starten.
  //
  // ⚠️ Das ist ausdrücklich KEIN Cache: das Versprechen wird gelöscht, sobald
  // es fertig ist. Ein späterer Aufruf holt frische Daten. Zusammengelegt
  // werden nur Anfragen, die sich ohnehin überlappen — an der Aktualität
  // ändert sich dadurch nichts, und deshalb darf es auch für Daten gelten,
  // die sich ändern (das Regelwerk einer Runde tut das).
  const imFlug = new Map();
  const einmal = (schluessel, hol) => {
    const laufend = imFlug.get(schluessel);
    if (laufend) return laufend;
    const p = hol().finally(() => imFlug.delete(schluessel));
    imFlug.set(schluessel, p);
    return p;
  };

  return {
    // 🔴 Die Spiele DIESER RUNDE — Begründung im Mock-Store.
    // ⚠️ ZWEI Schritte statt einem `Promise.all`, und das ist Absicht: die
    // grobe Vorauswahl steht erst fest, wenn das Regelwerk der Runde da ist.
    // Der Katalog-Abruf wartet dadurch auf die Runde — das kostet einen
    // Rundlauf und spart bei einer Liga-Runde 84 % der Übertragung.
    async listRoundMatches(roundId) {
      const round = await this.getRound(roundId);
      const matches = await this.listMatches(grobeVorauswahl(round?.rules?.spiele));
      return rundenSpieleVon(matches, round);
    },

    // ── Der Spielplan-Katalog, EINMAL je Fenster ────────────
    //
    // 🔴 Gemessen am 26.08.2026 gegen einen Produktions-Build (kein
    // StrictMode-Artefakt): der Hub löste **18** Datenbank-Abfragen aus,
    // darunter **dreimal** den ganzen Katalog. `/tippen` ebenfalls dreimal,
    // `/ranking` zweimal.
    //
    //     1942 Spiele · 3,15 MB roh · davon 1,7 KB je Spiel, praktisch
    //     vollständig der Quoten-Snapshot
    //
    // Drei Abfragen sind **9,4 MB roh** für EINEN Screen. Auf einem Handy im
    // Mobilfunknetz ist das der Unterschied zwischen „geht auf" und „hakt" —
    // und der Testbetrieb findet auf Handys statt.
    //
    // ── Warum ein Versprechen zwischengespeichert wird und kein Ergebnis ──
    // 🔴 Die drei Abfragen laufen GLEICHZEITIG: mehrere Komponenten rufen
    // unabhängig voneinander `listRoundMatches()`, das intern hier landet. Wenn
    // die zweite kommt, ist die erste noch unterwegs — ein Ergebnis-Cache wäre
    // dann noch leer und würde nichts sparen. Gespeichert wird deshalb das
    // laufende Versprechen; die Nachzügler hängen sich an dieselbe Anfrage.
    //
    // ⚠️ Kurze Frist statt „für immer": Ergebnisse und Quoten-Snapshots werden
    // von den Hintergrund-Läufen fortgeschrieben. Eine Sitzung dauert Stunden,
    // eine Minute reicht gegen den Ansturm beim Screen-Wechsel.
    //
    // ⚠️ Eine KOPIE der Liste zurückgeben: der Cache hält dasselbe Array, und
    // ein Aufrufer, der es sortiert, sortierte sonst allen anderen den Katalog
    // um. 1942 Zeiger zu kopieren kostet nichts gegen 3 MB Übertragung.
    // `grob` = das Ergebnis von `grobeVorauswahl(rules.spiele)` oder `null`
    // für „alles". ⚠️ Es ist KEIN Filter im Sinne der Wertung: die eigentliche
    // Auswahl trifft weiterhin `rundenSpieleVon`. Warum das eine Obermenge
    // bleibt und wie es bewiesen wird, steht bei `grobeVorauswahl`.
    async listMatches(grob = null) {
      const liste = grob?.wettbewerbe ?? null;
      const schluessel = liste ? [...liste].sort().join(",") : "*";
      const jetzt = Date.now();
      const da = kataloge.get(schluessel);
      if (da && jetzt - da.zeit < KATALOG_FRIST_MS) return [...(await da.versprechen)];

      const versprechen = (async () => {
        let q = sb.from("matches").select("*");
        // 🔴 `or` und nicht `in`: ein Spiel OHNE Wettbewerb muss durchkommen,
        // genau wie in `passtSpiel` („sonst fielen Altdaten still aus der
        // Runde"). Ein reines `in` wäre in der Datenbank strenger als im
        // Browser — und dann fehlten Spiele, die niemand vermisst, weil sie
        // nie ankommen.
        if (liste?.length) q = q.or(`wettbewerb.is.null,wettbewerb.in.(${liste.join(",")})`);
        const data = orThrow(await q.order("kickoff"));
        return data.map(mapMatch);
      })();
      kataloge.set(schluessel, { versprechen, zeit: jetzt });
      try {
        return [...(await versprechen)];
      } catch (e) {
        // Ein gescheiterter Versuch darf sich nicht festsetzen — sonst
        // scheitert jeder weitere Aufruf eine Minute lang mit, ohne es je
        // wieder zu versuchen.
        kataloge.delete(schluessel);
        throw e;
      }
    },
    // Spieltag öffnen = Big Game einfrieren. Läuft ueber eine SERVER-Route,
    // nicht hier: `matches` ist per RLS fuer Clients nur lesbar (Schreiben
    // braucht den service_role-Key), und wer oeffnen darf, ist eine
    // Fairness-Frage — die Auswahl haengt am Tabellenstand ZUM ZEITPUNKT des
    // Oeffnens, also darf nur der Admin der Runde ihn bestimmen. Die Route
    // prueft das; hier wird nur das Token mitgereicht.
    // Signatur identisch zum Mock (Andre hat sie dort gefixt): der Wettbewerb
    // gehoert dazu, weil "Spieltag 1" seit der CL zweimal existiert.
    // ⚠️ Wer hier durchkommt, hat den Katalog VERÄNDERT (das Big Game wird
    // eingefroren). Der Zwischenspeicher muss danach fallen, sonst zeigt der
    // Screen bis zu eine Minute lang den Stand von vorher — und genau an
    // dieser Zahl hängen Punkte.
    async openMatchday(roundId, matchday, wettbewerb = DEFAULT_WETTBEWERB) {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) throw new Error("Nicht angemeldet.");
      const res = await fetch(apiPfad("/api/matchday/open"), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ roundId, matchday, wettbewerb }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Spieltag konnte nicht geoeffnet werden.");
      kataloge.clear();        // siehe Kommentar über dieser Methode
      return json;
    },

    async getMatch(id) {
      const data = orThrow(await sb.from("matches").select("*").eq("id", id).maybeSingle());
      return mapMatch(data);
    },

    async getRound(id) {
      // Zusammengelegt, nicht zwischengespeichert — siehe `einmal` oben.
      return einmal(`round:${id}`, async () =>
        orThrow(await sb.from("rounds").select("*").eq("id", id).maybeSingle()));
    },
    async getRoundByCode(code) {
      return orThrow(await sb.from("rounds").select("*").eq("join_code", code).maybeSingle());
    },
    async listMembers(roundId) {
      return einmal(`members:${roundId}`, async () => {
        // Join auf profiles für Anzeigename + Avatar
        const data = orThrow(await sb
          .from("round_members")
          .select("round_id, user_id, profiles(display_name, avatar)")
          .eq("round_id", roundId));
        return data.map((m) => ({
          round_id: m.round_id, user_id: m.user_id,
          name: m.profiles?.display_name ?? m.user_id,
          avatar: sanitizeAvatar(m.profiles?.avatar),
        }));
      });
    },

    // ── Profil (Anzeigename + Avatar) ───────────────────────
    async getProfile(userId) {
      const data = orThrow(await sb
        .from("profiles").select("id, display_name, avatar, premium_until").eq("id", userId).maybeSingle());
      if (!data) return null;
      // ⚠️ Zweite Abfrage statt eines Joins: `profile_privat` gibt per RLS nur
      // die EIGENE Zeile heraus. Fuer einen fremden Nutzer kommt hier nichts
      // zurueck — und genau das ist gewollt, kein Fehler.
      const privat = orThrow(await sb
        .from("profile_privat").select("geburtsdatum").eq("id", userId).maybeSingle());
      return {
        ...data,
        avatar: sanitizeAvatar(data.avatar),
        geburtsdatum: privat?.geburtsdatum ?? null,
      };
    },
    // 🔴 Ist dieser Anzeigename noch frei? (KT10, Andi 25.08.2026)
    // Gegenstück zum Mock. ⚠️ `ilike` statt `eq`, weil der Eindeutigkeits-
    // Index in `schema.sql` auf `lower(display_name)` liegt — mit `eq` sagte
    // die App „frei" und die Datenbank verweigerte danach das Speichern.
    // `ausserUserId` = der eigene Nutzer, sonst meldet das Feld den eigenen
    // unveränderten Namen als vergeben.
    async nameFrei({ name, ausserUserId = null } = {}) {
      const sauber = String(name ?? "").replace(/\s+/g, " ").trim();
      if (!sauber) return false;
      let q = sb.from("profiles").select("id").ilike("display_name", sauber);
      if (ausserUserId) q = q.neq("id", ausserUserId);
      const data = orThrow(await q.limit(1));
      return (data ?? []).length === 0;
    },

    // Nur übergebene Felder ändern. Gesäubert wird auch hier — die DB-Policy
    // erlaubt zwar nur das eigene Profil, prüft aber keine Inhalte.
    async updateProfile(userId, { displayName, avatar, geburtsdatum } = {}) {
      const patch = {};
      if (displayName !== undefined) {
        const name = sanitizeDisplayName(displayName);
        if (name) patch.display_name = name;
      }
      if (avatar !== undefined) patch.avatar = sanitizeAvatar(avatar);
      // ⛔ Kein Pflichtfeld (KT9): `null` muss durchgehen, damit sich eine
      // einmal gemachte Angabe wieder entfernen laesst.
      // 🔴 Das Geburtsdatum liegt in `profile_privat`, NICHT in `profiles` —
      // letztere ist fuer alle Eingeloggten lesbar (Leaderboard braucht Name
      // und Sinnbild), und Postgres kann RLS nur pro Zeile, nicht pro Spalte.
      if (geburtsdatum !== undefined) {
        orThrow(await sb.from("profile_privat").upsert({
          id: userId,
          geburtsdatum: sanitizeGeburtsdatum(geburtsdatum),
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" }));
      }
      if (!Object.keys(patch).length) return this.getProfile(userId);
      const data = orThrow(await sb
        .from("profiles").update(patch).eq("id", userId)
        .select("id, display_name, avatar").maybeSingle());
      return data ? { ...data, avatar: sanitizeAvatar(data.avatar) } : null;
    },
    async listRoundsForUser(userId) {
      const memberRows = orThrow(await sb.from("round_members").select("round_id").eq("user_id", userId));
      const roundIds = memberRows.map((m) => m.round_id);
      if (!roundIds.length) return [];
      return orThrow(await sb.from("rounds").select("*").in("id", roundIds));
    },

    // Kurzcode-Presets (Content-Creator-Codes).
    async publishPreset({ name, rules, creatorId, beschreibung, aspekt }) {
      let code = generateJoinCode();
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data, error } = await sb
          .from("presets")
          .insert({
            code, name: (name ?? "").trim() || "Regelwerk",
            beschreibung: (beschreibung ?? "").trim() || null,
            aspekt: aspekt ?? null,
            rules: sanitizeRules(rules), creator_id: creatorId,
          })
          .select()
          .single();
        if (!error) return data;
        if (error.code !== "23505") throw error;   // nur bei Code-Kollision neu würfeln
        code = generateJoinCode();
      }
      throw new Error("Konnte keinen eindeutigen Kurzcode erzeugen.");
    },
    async getPresetByCode(code) {
      return orThrow(await sb.from("presets").select("*").eq("code", (code ?? "").trim().toUpperCase()).maybeSingle());
    },

    // Die geteilten Regelwerke als LISTE — Gegenstück zu `listPresets` im
    // Mock. Dieselbe Sortier-Sprache, damit die Bibliothek nicht wissen muss,
    // auf welchem Store sie gerade läuft.
    async listPresets({ sortierung = "beliebt", text = "", limit = 60 } = {}) {
      let q = sb.from("presets").select("*");
      const t = (text ?? "").trim();
      if (t) {
        // `or` mit ilike: Name, Beschreibung oder Code. Kommas im Suchtext
        // würden den Filter-Ausdruck zerlegen, deshalb fliegen sie raus.
        const sicher = t.replace(/[,()]/g, " ");
        q = q.or(`name.ilike.%${sicher}%,beschreibung.ilike.%${sicher}%,code.ilike.%${sicher}%`);
      }
      if (sortierung === "name") q = q.order("name", { ascending: true });
      else if (sortierung === "neu") q = q.order("created_at", { ascending: false });
      else q = q.order("uebernahmen", { ascending: false }).order("name", { ascending: true });
      return orThrow(await q.limit(Math.max(1, limit)));
    },

    // ⚠️ Läuft über eine SQL-Funktion (`bump_preset` in `schema.sql`), NICHT
    // über Lesen-Rechnen-Schreiben. Zwei Übernahmen im selben Moment würden
    // sonst als eine gezählt — und RLS lässt ein UPDATE auf ein fremdes
    // Preset ohnehin nicht zu.
    async merkePresetNutzung(code) {
      const c = (code ?? "").trim().toUpperCase();
      if (!c) return null;
      const { data, error } = await sb.rpc("bump_preset", { p_code: c });
      if (error) {
        // Die Zählung ist Beiwerk. Wer ein Preset übernimmt, soll deshalb
        // nicht scheitern — der Code ist ja gültig, nur der Zähler klemmt.
        if (typeof console !== "undefined") console.warn("[store] bump_preset:", error.message);
        return null;
      }
      return data ?? null;
    },
    async joinRound({ roundId, userId }) {
      // idempotent: bereits Mitglied → nichts tun
      return orThrow(await sb
        .from("round_members")
        .upsert({ round_id: roundId, user_id: userId }, { onConflict: "round_id,user_id", ignoreDuplicates: true })
        .select());
    },
    async createRound({ name, adminId, rules, teamFilter }) {
      // Kollisionen beim Beitritts-Code sind bei 6 Zeichen extrem selten;
      // der unique-Constraint in der DB schützt zusätzlich (Retry bei 23505).
      let joinCode = generateJoinCode();
      const team_filter = Array.isArray(teamFilter) && teamFilter.length >= 2 ? teamFilter : null;
      // Premium-Durchsetzung: Premium-Bestandteile greifen nur, wenn der ADMIN
      // berechtigt ist. premium_until kann kein Client setzen (Spalten-Rechte
      // im Schema), der Wert ist hier also vertrauenswürdig.
      const admin = await this.getProfile(adminId);
      const wirksameRegeln = applyEntitlements(sanitizeRules(rules), { premium: isPremium(admin) });
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data, error } = await sb
          .from("rounds")
          // `spiele`: die GANZE Spielauswahl, beim Anlegen eingefroren.
          // Begründung im Mock-Store und in `rundenSpiele` (roundStatus.js).
          // ⚠️ Braucht die Spalte `rounds.spiele` aus `schema.sql`.
          .insert({
            name: (name ?? "").trim() || "Neue Runde", admin_id: adminId,
            rules: wirksameRegeln, join_code: joinCode, team_filter,
            spiele: rundenAuswahl({ spiele: wirksameRegeln.spiele, teamFilter }),
          })
          .select()
          .single();
        if (!error) { await this.joinRound({ roundId: data.id, userId: adminId }); return data; }
        if (error.code !== "23505") throw error;
        joinCode = generateJoinCode();
      }
      throw new Error("Konnte keinen eindeutigen Beitritts-Code erzeugen.");
    },

    // 🔴 Geschlossen wird beim Anpfiff — die zentrale Fairness-Regel, und sie
    // stand bis 06.08.2026 NUR in `Tippabgabe.jsx`. Begründung und Messung im
    // Mock-Store; kurz: ein Tipp auf ein zwei Monate altes Spiel wurde
    // angenommen und mit 1440 Punkten gewertet.
    //
    // ⚠️ KEINE Sicherheitsgrenze — der Client schreibt hier direkt in die
    // Tabelle, wer den Aufruf umgeht, kommt durch. Dafür braucht es den
    // Trigger aus dem RLS-Durchgang. Was es verhindert: dass unser eigener
    // Code es falsch macht, und dass die Regel zweimal formuliert wird.
    async saveTip({ roundId, matchId, userId, tip, snapshot }) {
      const [round, rundenSpiele] = await Promise.all([
        this.getRound(roundId), this.listRoundMatches(roundId),
      ]);
      const match = rundenSpiele.find((m) => m.id === matchId) ?? await this.getMatch(matchId);
      const status = tippStatus(match, round?.rules ?? DEFAULT_RULES, Date.now(),
        spieltagStarts(rundenSpiele));
      if (!status.offen) throw new Error(`Dieses Spiel ist nicht tippbar: ${status.text}.`);
      // 🔴 Die Duell-Schutzregeln, dieselbe Lücke eine Ebene tiefer: sie
      // standen bis 07.08.2026 NUR in `Tippabgabe.jsx`, und LIVE schreibt der
      // Client direkt in diese Tabelle. Wer den Aufruf umging, traf jeden,
      // beliebig oft, umsonst. Die Prüfung liegt in `duellPruefung.js` — EINE
      // Fassung für Mock und Supabase, damit die Regel nicht zweimal
      // formuliert wird (die Lehre aus `saisonBoard.js`).
      const duellPruef = await pruefeDuellEinsatz({ store: this, roundId, matchId, userId, tip });
      if (!duellPruef.erlaubt) {
        throw new Error(`Dieser Duell-Einsatz ist nicht möglich: ${duellPruef.grund}`);
      }
      // ein Tipp je (round, match, user) → upsert auf dem Unique-Key
      const data = orThrow(await sb
        .from("tips")
        .upsert(
          { round_id: roundId, match_id: matchId, user_id: userId, tip, snapshot },
          { onConflict: "round_id,match_id,user_id" }
        )
        .select()
        .single());
      return data;
    },
    async listTips({ roundId, matchId }) {
      // Zusammengelegt (siehe `einmal`): der Hub fragte die Tipps dreimal,
      // weil `getLeaderboard` und `getRoundEntries` sie intern nochmal holen.
      return einmal(`tips:${roundId}:${matchId ?? ""}`, async () => {
        let q = sb.from("tips").select("*").eq("round_id", roundId);
        if (matchId) q = q.eq("match_id", matchId);
        return orThrow(await q);
      });
    },

    // ── Joker-Abstimmung ────────────────────────────────────
    // Eine Stimme je Nutzer/Runde/Spieltag (unique-Constraint) → upsert.
    async saveVote({ roundId, matchday, userId, ja, wettbewerb = "bl" }) {
      // onConflict muss dem Primaerschluessel entsprechen — der traegt seit
      // den mehreren Wettbewerben auch `wettbewerb` (siehe schema.sql).
      return orThrow(await sb
        .from("votes")
        .upsert({ round_id: roundId, matchday, wettbewerb, user_id: userId, ja: ja === true },
          { onConflict: "round_id,wettbewerb,matchday,user_id" })
        .select().single());
    },
    async listVotes({ roundId }) {
      return einmal(`votes:${roundId}`, async () =>
        orThrow(await sb.from("votes").select("*").eq("round_id", roundId)));
    },

    // ── Regel-Abstimmung: Anträge und Stimmen ───────────────
    // ⚠️ Nicht `votes` — das ist die Joker-Abstimmung. Hier geht es um
    // Änderungen am Regelwerk (design/abstimmung-verfassung.md), eigene
    // Tabellen `rule_proposals` / `rule_proposal_votes`.
    //
    // `laeuft_bis` wird beim Anlegen EINGEFROREN (siehe Mock-Store und
    // `wirktAb` in regelAbstimmung.js) — eine später geänderte Dauer
    // verschiebt keine laufende Abstimmung.
    async createAntrag({ roundId, userId, aspekt, werte, gestelltAm, laeuftBis }) {
      return orThrow(await sb
        .from("rule_proposals")
        .insert({
          round_id: roundId, user_id: userId, aspekt,
          werte: werte ?? {},
          gestellt_am: gestelltAm ?? null,
          laeuft_bis: laeuftBis ?? null,
        })
        .select().single());
    },

    // Anträge samt Stimmen in EINER Abfrage — `zaehleAus` erwartet
    // `antrag.stimmen`, das soll nicht jeder Screen selbst zusammensetzen.
    async listAntraege({ roundId, status = null }) {
      let q = sb.from("rule_proposals")
        .select("*, rule_proposal_votes(user_id, ja)")
        .eq("round_id", roundId);
      if (status) q = q.eq("status", status);
      const rows = orThrow(await q);
      return (rows ?? []).map((r) => {
        const { rule_proposal_votes: stimmen, ...rest } = r;
        return { ...rest, stimmen: (stimmen ?? []).map((s) => ({ userId: s.user_id, ja: s.ja })) };
      });
    },

    // Eine Stimme je Nutzer und Antrag (unique-Constraint) → upsert.
    async saveAntragStimme({ antragId, userId, ja }) {
      return orThrow(await sb
        .from("rule_proposal_votes")
        .upsert({ antrag_id: antragId, user_id: userId, ja: ja === true },
          { onConflict: "antrag_id,user_id" })
        .select().single());
    },

    // ── Admin-Freigaben ─────────────────────────────────────
    // Schreiben darf laut RLS nur der Admin der Runde — die Prüfung liegt
    // bewusst in der Datenbank und nicht hier, sonst hinge sie am Client.
    async listAdminFreigaben({ roundId }) {
      const rows = orThrow(await sb.from("admin_freigaben")
        .select("user_id, matchday").eq("round_id", roundId));
      return (rows ?? []).map((f) => ({ userId: f.user_id, spieltag: f.matchday }));
    },

    async setAdminFreigabe({ roundId, userId, matchday, an = true }) {
      if (!an) {
        return orThrow(await sb.from("admin_freigaben").delete()
          .eq("round_id", roundId).eq("user_id", userId).eq("matchday", matchday));
      }
      return orThrow(await sb.from("admin_freigaben")
        .upsert({ round_id: roundId, user_id: userId, matchday },
          { onConflict: "round_id,user_id,matchday" })
        .select().single());
    },

    // ── Ausgeübte Rechte (Weg B, Andi 27.08.2026) ───────────
    // 🔴 Kein `upsert` und kein `update`: der Primärschlüssel
    // `(round_id, matchday, angebot_key)` lässt genau EINE Ausübung je
    // Spieltag zu, und es gibt bewusst keine Update-Policy. Eine getroffene
    // Wahl steht damit fest — sonst wäre „das Topspiel ist bestimmt" eine
    // Aussage, die bis zum Anpfiff wackelt.
    // ⚠️ Ein Konflikt ist deshalb KEIN Fehler, sondern die Auskunft „jemand
    // war schneller". Er wird geschluckt und die vorhandene Zeile geliefert.
    async listRechteAusgeuebt({ roundId }) {
      const rows = orThrow(await sb.from("rechte_ausgeuebt")
        .select("matchday, user_id, angebot_key, wert").eq("round_id", roundId));
      return (rows ?? []).map((r) => ({
        spieltag: r.matchday, userId: r.user_id,
        angebotKey: r.angebot_key, wert: r.wert ?? null,
      }));
    },

    async ueberechtAus({ roundId, userId, matchday, angebotKey, wert = null }) {
      const { data, error } = await sb.from("rechte_ausgeuebt")
        .insert({ round_id: roundId, matchday, angebot_key: angebotKey, user_id: userId, wert })
        .select().single();
      // 23505 = unique_violation: jemand war zuerst da. Das ist ein Ergebnis,
      // kein Fehler — die vorhandene Zeile ist die Antwort.
      if (error?.code === "23505") {
        return orThrow(await sb.from("rechte_ausgeuebt")
          .select("*").eq("round_id", roundId).eq("matchday", matchday)
          .eq("angebot_key", angebotKey).single());
      }
      if (error) throw error;
      return data;
    },

    async setAntragStatus({ antragId, status, veto }) {
      const patch = {};
      if (status != null) patch.status = status;
      if (veto != null) patch.veto = veto === true;
      if (!Object.keys(patch).length) return null;
      return orThrow(await sb
        .from("rule_proposals").update(patch).eq("id", antragId).select().single());
    },

    // ── Saison-Wetten abgeben ───────────────────────────────
    // Ein Tipp je (Runde, Nutzer, Wette) → upsert auf dem Unique-Key.
    // 🔴 Das Freischalt-Fenster prüfen, bevor gespeichert wird — siehe
    // Mock-Store. Bis 06.08.2026 war es nur ein `disabled`-Attribut in der
    // Oberfläche.
    // ⚠️ Client-seitig und damit kein Ersatz für einen Trigger (siehe
    // RLS-Durchgang in der Roadmap): wer die Route direkt anspricht, kommt
    // weiterhin durch. Sie sorgt dafür, dass die Regel EINMAL formuliert ist.
    async saveSeasonTip({ roundId, userId, wettenId, wert }) {
      const [round, matches] = await Promise.all([
        this.getRound(roundId), this.listRoundMatches(roundId),
      ]);
      const grund = darfSaisonTippen({ rules: round?.rules ?? DEFAULT_RULES, id: wettenId, matches });
      if (grund) throw new Error(grund);
      return orThrow(await sb
        .from("season_tips")
        .upsert({ round_id: roundId, user_id: userId, wetten_id: wettenId, wert },
          { onConflict: "round_id,user_id,wetten_id" })
        .select().single());
    },
    async listSeasonTips({ roundId, userId }) {
      return einmal(`seasonTips:${roundId}:${userId ?? ""}`, async () => {
        let q = sb.from("season_tips").select("*").eq("round_id", roundId);
        if (userId) q = q.eq("user_id", userId);
        return orThrow(await q);
      });
    },

    async getLeaderboard(roundId) {
      const { board, rules, kontext, spieltage, nameOf, avatarOf, bespielt } = await this.standVorDemRad(roundId);
      const fertig = await withDrehradPunkte({ board, rules, rundenId: roundId, spieltage, nameOf, kontext, bespielt });
      // Siehe Mock: erst NACH der Wertung angehängt, das Sinnbild ist
      // Beschriftung und geht die Rechnung nichts an.
      return (fertig ?? []).map((b) => ({ ...b, avatar: avatarOf(b.userId) }));
    },

    // 🔴 Die Ziehungen, die das Leaderboard tatsächlich verrechnet hat —
    // damit `MeinRad.jsx` sie nicht mit anderen Eingaben nachrechnet.
    // Begründung ausführlich im Mock-Store.
    async getDrehradZiehungen(roundId) {
      const { board, rules, kontext, spieltage, bespielt } = await this.standVorDemRad(roundId);
      if (!rules?.drehrad?.enabled) return { ziehungen: [], spieltage };
      return {
        ziehungen: drehradZiehungen({
          rules, rundenId: roundId, userIds: board.map((e) => e.userId), spieltage, kontext, bespielt,
        }),
        spieltage,
      };
    },

    // Der Stand VOR dem Rad. Eine Stelle für beide Aufrufer — sobald die
    // Rad-Ansicht ihren Kontext selbst baut, baut sie ihn anders.
    async standVorDemRad(roundId) {
      const [round, members, tips, matches, seasonTips] = await Promise.all([
        this.getRound(roundId),
        this.listMembers(roundId),
        this.listTips({ roundId }),
        this.listMatches(),
        this.listSeasonTips({ roundId }),
      ]);
      const antraege = await this.listAntraege({ roundId });
      const ausuebungen = await this.listRechteAusgeuebt({ roundId });
      const freigaben = await this.listAdminFreigaben({ roundId });
      const nameOf = (id) => members.find((m) => m.user_id === id)?.name ?? id;
      // Gegenstück zu `avatarOf` im Mock — `listMembers` liest den Avatar
      // ohnehin schon aus `profiles` mit, er kam nur nie am Leaderboard an.
      const avatarOf = (id) => members.find((m) => m.user_id === id)?.avatar ?? null;
      const matchOf = (mid) => matches.find((m) => m.id === mid) ?? null;
      const rules = round?.rules ?? DEFAULT_RULES;
      // ⚠️ Über die Spiele DIESER Runde — siehe `listRoundMatches`.
      const rundenSpiele = rundenSpieleVon(matches, round);
      // 🔴 Ersatz-Tipps (Versäumnis) in DERSELBEN Eintragsliste — siehe
      // Mock-Store. `autoTipsFor` war bis 06.08.2026 von niemandem aufgerufen.
      const entries = [
        ...tips.map((t) => eintragVon(t, nameOf, matchOf)),
        ...ersatzEintraege({
          matches: rundenSpiele, tips, rules,
          userIds: members.map((m) => m.user_id), nameOf,
        }),
      ];
      // Verlaufsabhängige Regeln (Aufhol-Bonus, Saisonform) über den Verlauf.
      // WELCHE das sind, entscheidet die Engine an einer Stelle — hier stand
      // vorher `rules.aufholen?.enabled`, und mit der Saisonform war das still
      // falsch.
      // Die Zeitachse EINMAL bauen: Beschluss-Lage, Drehrad-Plan und der
      // Runden-Spieltag der Tipps brauchen sie alle drei.
      const achse = zeitachse(rundenSpiele, rules?.zeitachse);
      const { regelnFuer, amEnde } = beschlussLage({
        rules, antraege, members, matches, achse,
        adminId: round?.admin_id ?? null, ausuebungen,
      });
      let board;
      let verlauf = null;
      // ⚠️ BEIDE fragen: `brauchtVerlauf` liest sonst nur das ANGELEGTE
      // Regelwerk. Beschließt eine Runde den Anschluss-Bonus erst an Spieltag
      // 20, ist er in `round.rules` aus — der Verlauf würde gar nicht gebaut
      // und der Bonus fiele still aus.
      if (brauchtVerlauf(rules) || brauchtVerlauf(amEnde)) {
        // `fremdEinsaetze` braucht `matchId` für den Gleichstand-Fall
        // (zwei Duell-Einsätze am selben Spieltag mit identischem Kickoff,
        // z. B. zwei zeitgleich angepfiffene Bundesliga-Spiele) — `entries`
        // (aus `eintragVon`) trägt das Feld nicht, `tips` (roh) schon
        // (`match_id`), deshalb hier separat angereichert statt `entries`
        // selbst zu verändern.
        const einsaetze = fremdEinsaetze(
          tips.map((t) => ({ ...eintragVon(t, nameOf, matchOf), matchId: t.match_id })), rules,
          { rundenSpieltag: verlaufPositionen(entries) });
        verlauf = scoreLeaderboardHistory(entries, rules, einsaetze, regelnFuer, null, roundId, { ausuebungen });
        board = verlauf.length ? verlauf[verlauf.length - 1].board : [];
      } else {
        board = scoreLeaderboard(entries, rules, regelnFuer);
      }
      // Saison-Punkte drauf, inkl. der reinen Saison-Tipper (saisonBoard.js).
      // `seasonTips` ist hier schon auf die Runde gefiltert.
      // 🔴 `rundenSpiele`, nicht `matches` — siehe Mock-Store: über den ganzen
      // Katalog gerechnet ist der „Meister" einer Bundesliga-Runde der FC
      // Barcelona.
      board = withSaisonPunkte({ board, rules, matches: rundenSpiele, seasonTips, nameOf });
      // Drehrad-Punkte drauf (drehradBoard.js) — ERST Saison, DANN Rad: beide
      // sortieren und ranken das Board neu, der jeweils letzte Aufruf gewinnt.
      // Es darf nur EINE Reihenfolge geben, sonst hängt die Rangfolge am
      // Aufrufort statt an der Regel. Saison zuerst, weil Saison-Wetten auch
      // Spieler neu ins Board aufnehmen (reine Saison-Tipper) — das Rad zahlt
      // bewusst NUR an, wer schon im Board steht (siehe drehradBoard.js), muss
      // also NACH dieser Ergänzung laufen, sonst verpasst ein reiner
      // Saison-Tipper seine Rad-Ziehung.
      //
      // `kontext` macht `wer`/`werWert` UND die 5.0-Invariante („kein Rad ohne
      // Tipp") scharf (Nachtrag zu design/kontaktstellen.md, 2026-08-04) —
      // ohne ihn zöge jeder im Board, unabhängig von diesen Einstellungen.
      // `board` ist der bereits fertige (Saison-)Stand von oben — dieselbe
      // Wahl wie in `Tippabgabe.jsx`s `pruefeJokerEinsatz`. `tipps` kommt aus
      // `tips`, das hier schon vorliegt, nur um `matchId`/`matchday` ergänzt.
      // `adminFreigaben`/`letzteEinsaetze` bleiben leer: es gibt noch keinen
      // Speicherort für Admin-Freigaben (siehe Schritt 1) und keine eigene
      // Abklingzeit-Historie fürs Rad — ein am `jokerBasis.standard`
      // gesetzter `abklingzeit`-Wert bliebe dadurch für das Rad wirkungslos.
      //
      // 🔴 `matchday` ist hier der RUNDEN-Spieltag, nicht der Liga-Spieltag —
      // dieselbe Begründung wie im Mock-Store: `drehradPlan` verteilt über
      // Runden-Spieltage, und `kontextFuer` vergleicht direkt damit. Mit dem
      // Liga-Spieltag wären das zwei Skalen, und „kein Rad ohne Tipp" prüfte
      // den falschen Tag.
      const kontext = {
        board,
        tipps: tips.map((t) => {
          const m = matchOf(t.match_id);
          return {
            userId: t.user_id, matchId: t.match_id,
            matchday: m ? rundenSpieltagVon(achse, m) : null,
          };
        }),
        // Aus der Ablage statt einer leeren Liste (siehe Mock-Store).
        adminFreigaben: freigaben,
        letzteEinsaetze: [],
      };
      // ⚠️ Und die LÄNGE ebenso — die feste 34 wäre die Liga-Saison.
      // `entries`, `regelnFuer`, `verlauf` und `tips` reisen mit, damit
      // `getLeaderboardHistory` und `getSpieltagsPunkte` auf DENSELBEN
      // Einträgen rechnen wie das Leaderboard. `verlauf` ist `null`, wenn keine
      // Regel ihn braucht — dann baut ihn der Aufrufer aus `entries` nach.
      return {
        board, rules, kontext, nameOf, avatarOf, matchOf, entries, regelnFuer, verlauf, tips,
        // Mit hinaus, damit `getLeaderboardHistory` und `getDuellVorgaenge` die
        // ausgeübten Rechte nicht ein zweites Mal holen — und vor allem: nicht
        // ohne sie rechnen, während das Leaderboard mit ihnen rechnet.
        ausuebungen,
        spieltage: achse.length || SPIELTAGE, bespielt: bespielteSpieltage(achse),
        // 🔴 Die Position IM VERLAUF, nicht der Liga-Spieltag und auch nicht die
        // Zeitachse — die Begründung steht bei `verlaufPositionen` (spieltag.js).
        // Sie wird aus DENSELBEN `entries` abgeleitet, aus denen der Verlauf
        // entsteht; zwei Ableitungen könnten auseinanderlaufen.
        rundenSpieltag: verlaufPositionen(entries),
      };
    },

    async getRoundEntries(roundId) {
      const [members, tips, matches] = await Promise.all([
        this.listMembers(roundId),
        this.listTips({ roundId }),
        this.listMatches(),
      ]);
      const nameOf = (id) => members.find((m) => m.user_id === id)?.name ?? id;
      const matchOf = (mid) => matches.find((m) => m.id === mid) ?? null;
      return tips.map((t) => ({ ...eintragVon(t, nameOf, matchOf), matchId: t.match_id }));
    },

    // Was das Rad ausser Punkten auszahlt — siehe Mock-Store.
    async getDrehradBelohnungen(roundId) {
      const { board, rules, kontext, spieltage, bespielt } = await this.standVorDemRad(roundId);
      if (!rules?.drehrad?.enabled) return { joker: [], narren: [], modifikatoren: [], ruecksetzungen: [] };
      return drehradBelohnungen({
        rules, rundenId: roundId, userIds: board.map((e) => e.userId), spieltage, kontext, bespielt,
      });
    },

    // Beschluss-Lage als Funktion — siehe Mock-Store, gleiche Begründung.
    async getRegelnFuer(roundId) {
      const [round, members, matches] = await Promise.all([
        this.getRound(roundId), this.listMembers(roundId), this.listMatches(),
      ]);
      const rules = round?.rules ?? DEFAULT_RULES;
      const antraege = await this.listAntraege({ roundId });
      const ausuebungen = await this.listRechteAusgeuebt({ roundId });
      // Über die Spiele DIESER Runde — sonst käme ein anderer Runden-Spieltag
      // heraus als im Leaderboard.
      return beschlussLage({
        rules, antraege, members, adminId: round?.admin_id ?? null,
        matches: rundenSpieleVon(matches, round), ausuebungen,
      });
    },

    // Der Verlauf einer Runde — EINE Stelle, dieselben Eintraege wie das
    // Leaderboard (inklusive der Ersatz-Tipps aus dem Versaeumnis). Vorher baute
    // diese Methode ihre Eintraege selbst, ohne Ersatz-Tipps: zwei Kurven fuer
    // dieselbe Runde, sobald das Versaeumnis eingeschaltet war.
    async getLeaderboardHistory(roundId) {
      const { verlauf, entries, rules, regelnFuer, tips, nameOf, matchOf, rundenSpieltag, ausuebungen } = await this.standVorDemRad(roundId);
      if (verlauf) return verlauf;
      // Wie im Zweig oben: `matchId` kommt aus den ROHEN Tipps, `entries` trägt
      // es nicht — ohne das Feld verliert der Duell-Einsatz seinen Gleichstand-
      // Schlüssel (zwei zeitgleich angepfiffene Spiele am selben Spieltag).
      const einsaetze = fremdEinsaetze(tips.map((t) => ({ ...eintragVon(t, nameOf, matchOf), matchId: t.match_id })), rules, { rundenSpieltag });
      return scoreLeaderboardHistory(entries, rules, einsaetze, regelnFuer, null, roundId, { ausuebungen });
    },

    // 🔴 Was hat wer an EINEM Spieltag geholt? — Frage 4 der Runden-Schicht.
    // Siehe Mock-Store: ohne diese Liste faellt der Trost-Joker still aus.
    async getSpieltagsPunkte(roundId) {
      return punkteJeSpieltag(await this.getLeaderboardHistory(roundId));
    },

    // 🔴 Wer hat wen getroffen — siehe Mock-Store. Über DENSELBEN Weg wie die
    // Wertung gerechnet; die Beträge hängen am Deckel und an der Reihenfolge.
    // 🔴 Zwischenstand der eigenen Saison-Wetten — siehe Mock-Store.
    async getSaisonStand(roundId, userId) {
      const [round, matches, seasonTips] = await Promise.all([
        this.getRound(roundId), this.listRoundMatches(roundId),
        this.listSeasonTips({ roundId, userId }),
      ]);
      const rules = round?.rules ?? DEFAULT_RULES;
      if (!rules?.saison?.enabled) return { gesamt: 0, treffer: 0, zeilen: [] };
      const tipps = Object.fromEntries(seasonTips.map((t) => [t.wetten_id, t.wert]));
      return scoreSaison({ matches, tipps, saison: rules.saison });
    },

    // 🔴 JK6 (23.08.2026): welche Fremdjoker liegen JETZT auf dem Tisch — und
    // von wem? Das ist etwas anderes als `getDuellVorgaenge`: dort steht, was
    // eine Überweisung am Ende GEBRACHT hat, hier, was gerade GESETZT ist.
    // Andis Zweck ist das Gespräch vor dem Anpfiff („nimm den Block bei mir
    // raus"), und dafür kommt die Abrechnung zu spät.
    //
    // ⚠️ Der Screen darf das nicht selbst aus den Tipps ableiten
    // (Runden-Schicht, CLAUDE.md): dieselbe Liste, aus der die WERTUNG rechnet,
    // muss die sein, die der Spieler sieht. Sonst steht auf dem Bildschirm ein
    // Block, den die Wertung nie gesehen hat — oder umgekehrt.
    async getFremdEingriffe(roundId) {
      const { rules, tips, nameOf, matchOf, rundenSpieltag } = await this.standVorDemRad(roundId);
      if (!familieAn(rules)) return [];
      return fremdEinsaetze(tips.map((t) => ({ ...eintragVon(t, nameOf, matchOf), matchId: t.match_id })), rules, { rundenSpieltag })
        .map((e) => ({ ...e, vonName: nameOf(e.vonUserId), aufName: nameOf(e.aufUserId) }));
    },

    async getDuellVorgaenge(roundId) {
      const { entries, rules, regelnFuer, tips, nameOf, matchOf, rundenSpieltag, ausuebungen } = await this.standVorDemRad(roundId);
      // 🔴 `familieAn` statt `rules.duell.enabled`: seit dem 23.08.2026 gibt es
      // VIER Fremdjoker, und zwei davon stehen gar nicht in `duell`. Die rohe
      // Abfrage hätte Trittbrettfahrer und Gegenwette aus der Vorgangsliste
      // geworfen — sichtbar erst daran, dass ein Spieler eine Summe sieht, zu
      // der keine Zeile führt.
      if (!familieAn(rules)) return [];
      const einsaetze = fremdEinsaetze(tips.map((t) => ({ ...eintragVon(t, nameOf, matchOf), matchId: t.match_id })), rules, { rundenSpieltag });
      const sammeln = [];
      scoreLeaderboardHistory(entries, rules, einsaetze, regelnFuer, sammeln, roundId, { ausuebungen });
      return sammeln.map((v) => ({ ...v, vonName: nameOf(v.vonUserId), aufName: nameOf(v.aufUserId) }));
    },
  };
}
