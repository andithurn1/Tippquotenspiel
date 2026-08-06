// ── Supabase-Store: dieselbe Schnittstelle wie der Mock, aber gegen
//    die echte Datenbank. Aktiv, sobald NEXT_PUBLIC_SUPABASE_* gesetzt
//    sind (siehe store.js). Scoring bleibt in der Engine — hier werden
//    nur Rohdaten geladen/geschrieben.

import { DEFAULT_RULES, scoreLeaderboard, scoreLeaderboardHistory, sanitizeRules, brauchtVerlauf } from "./engine";
// Beschlossene Regeländerungen wirken ab IHREM Spieltag (Schritt 5 von
// design/abstimmung-verfassung.md) — dieselbe Anbindung wie im Mock-Store.
import { regelnFuerSpieltag } from "./beschluss";
import { zeitachse, rundenSpieltagVon, bespielteSpieltage } from "./zeitachse";
import { getSupabaseBrowserClient } from "./supabaseClient";
import { generateJoinCode } from "./joinCode";
import { sanitizeDisplayName, sanitizeAvatar } from "./avatars";
import { isPremium, applyEntitlements } from "./premium";
import { withSaisonPunkte } from "./saisonBoard";
import { filterMatchesByTeams } from "./roundStatus";
import { ersatzEintraege } from "./versaeumnisBoard";
import { withDrehradPunkte, drehradZiehungen, drehradBelohnungen } from "./drehradBoard";
import { DEFAULT_WETTBEWERB, wettbewerbVon } from "./wettbewerbe";
import { einsaetzeAusTipps } from "./duellJoker";
import { punkteJeSpieltag } from "./spieltagsPunkte";
import { darfSaisonTippen } from "./saisonFenster";
import { tippStatus, spieltagStarts } from "./tippfenster";

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
function beschlussLage({ rules, antraege, members, matches, achse = null, adminId = null }) {
  return regelnFuerSpieltag({
    rules,
    antraege,
    mitglieder: (members ?? []).map((m) => ({ userId: m.user_id, istAdmin: m.user_id === adminId })),
    achse: achse ?? zeitachse(matches ?? [], rules?.zeitachse),
  });
}

export function createSupabaseStore() {
  const sb = getSupabaseBrowserClient();
  if (!sb) throw new Error("Supabase-Client nicht verfügbar (Env-Variablen fehlen).");

  const orThrow = ({ data, error }) => { if (error) throw error; return data; };

  return {
    // 🔴 Die Spiele DIESER RUNDE — Begründung im Mock-Store.
    async listRoundMatches(roundId) {
      const [round, matches] = await Promise.all([this.getRound(roundId), this.listMatches()]);
      return filterMatchesByTeams(matches, round?.team_filter);
    },

    async listMatches() {
      const data = orThrow(await sb.from("matches").select("*").order("kickoff"));
      return data.map(mapMatch);
    },
    // Spieltag öffnen = Big Game einfrieren. Läuft ueber eine SERVER-Route,
    // nicht hier: `matches` ist per RLS fuer Clients nur lesbar (Schreiben
    // braucht den service_role-Key), und wer oeffnen darf, ist eine
    // Fairness-Frage — die Auswahl haengt am Tabellenstand ZUM ZEITPUNKT des
    // Oeffnens, also darf nur der Admin der Runde ihn bestimmen. Die Route
    // prueft das; hier wird nur das Token mitgereicht.
    // Signatur identisch zum Mock (Andre hat sie dort gefixt): der Wettbewerb
    // gehoert dazu, weil "Spieltag 1" seit der CL zweimal existiert.
    async openMatchday(roundId, matchday, wettbewerb = DEFAULT_WETTBEWERB) {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) throw new Error("Nicht angemeldet.");
      const res = await fetch("/api/matchday/open", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ roundId, matchday, wettbewerb }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Spieltag konnte nicht geoeffnet werden.");
      return json;
    },

    async getMatch(id) {
      const data = orThrow(await sb.from("matches").select("*").eq("id", id).maybeSingle());
      return mapMatch(data);
    },

    async getRound(id) {
      return orThrow(await sb.from("rounds").select("*").eq("id", id).maybeSingle());
    },
    async getRoundByCode(code) {
      return orThrow(await sb.from("rounds").select("*").eq("join_code", code).maybeSingle());
    },
    async listMembers(roundId) {
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
    },

    // ── Profil (Anzeigename + Avatar) ───────────────────────
    async getProfile(userId) {
      const data = orThrow(await sb
        .from("profiles").select("id, display_name, avatar, premium_until").eq("id", userId).maybeSingle());
      return data ? { ...data, avatar: sanitizeAvatar(data.avatar) } : null;
    },
    // Nur übergebene Felder ändern. Gesäubert wird auch hier — die DB-Policy
    // erlaubt zwar nur das eigene Profil, prüft aber keine Inhalte.
    async updateProfile(userId, { displayName, avatar } = {}) {
      const patch = {};
      if (displayName !== undefined) {
        const name = sanitizeDisplayName(displayName);
        if (name) patch.display_name = name;
      }
      if (avatar !== undefined) patch.avatar = sanitizeAvatar(avatar);
      if (!Object.keys(patch).length) return this.getProfile(userId);
      const data = orThrow(await sb
        .from("profiles").update(patch).eq("id", userId).select("id, display_name, avatar").maybeSingle());
      return data ? { ...data, avatar: sanitizeAvatar(data.avatar) } : null;
    },
    async listRoundsForUser(userId) {
      const memberRows = orThrow(await sb.from("round_members").select("round_id").eq("user_id", userId));
      const roundIds = memberRows.map((m) => m.round_id);
      if (!roundIds.length) return [];
      return orThrow(await sb.from("rounds").select("*").in("id", roundIds));
    },

    // Kurzcode-Presets (Content-Creator-Codes).
    async publishPreset({ name, rules, creatorId }) {
      let code = generateJoinCode();
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data, error } = await sb
          .from("presets")
          .insert({ code, name: (name ?? "").trim() || "Regelwerk", rules: sanitizeRules(rules), creator_id: creatorId })
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
          .insert({ name: (name ?? "").trim() || "Neue Runde", admin_id: adminId, rules: wirksameRegeln, join_code: joinCode, team_filter })
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
      let q = sb.from("tips").select("*").eq("round_id", roundId);
      if (matchId) q = q.eq("match_id", matchId);
      return orThrow(await q);
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
      return orThrow(await sb.from("votes").select("*").eq("round_id", roundId));
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
      let q = sb.from("season_tips").select("*").eq("round_id", roundId);
      if (userId) q = q.eq("user_id", userId);
      return orThrow(await q);
    },

    async getLeaderboard(roundId) {
      const { board, rules, kontext, spieltage, nameOf, bespielt } = await this.standVorDemRad(roundId);
      return withDrehradPunkte({ board, rules, rundenId: roundId, spieltage, nameOf, kontext, bespielt });
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
      const freigaben = await this.listAdminFreigaben({ roundId });
      const nameOf = (id) => members.find((m) => m.user_id === id)?.name ?? id;
      const matchOf = (mid) => matches.find((m) => m.id === mid) ?? null;
      const rules = round?.rules ?? DEFAULT_RULES;
      // ⚠️ Über die Spiele DIESER Runde — siehe `listRoundMatches`.
      const rundenSpiele = filterMatchesByTeams(matches, round?.team_filter);
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
      const { regelnFuer, amEnde } = beschlussLage({ rules, antraege, members, matches, achse, adminId: round?.admin_id ?? null });
      let board;
      let verlauf = null;
      // ⚠️ BEIDE fragen: `brauchtVerlauf` liest sonst nur das ANGELEGTE
      // Regelwerk. Beschließt eine Runde den Anschluss-Bonus erst an Spieltag
      // 20, ist er in `round.rules` aus — der Verlauf würde gar nicht gebaut
      // und der Bonus fiele still aus.
      if (brauchtVerlauf(rules) || brauchtVerlauf(amEnde)) {
        // `einsaetzeAusTipps` braucht `matchId` für den Gleichstand-Fall
        // (zwei Duell-Einsätze am selben Spieltag mit identischem Kickoff,
        // z. B. zwei zeitgleich angepfiffene Bundesliga-Spiele) — `entries`
        // (aus `eintragVon`) trägt das Feld nicht, `tips` (roh) schon
        // (`match_id`), deshalb hier separat angereichert statt `entries`
        // selbst zu verändern.
        const einsaetze = einsaetzeAusTipps(tips.map((t) => ({ ...eintragVon(t, nameOf, matchOf), matchId: t.match_id })));
        verlauf = scoreLeaderboardHistory(entries, rules, einsaetze, regelnFuer);
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
        board, rules, kontext, nameOf, matchOf, entries, regelnFuer, verlauf, tips,
        spieltage: achse.length || SPIELTAGE, bespielt: bespielteSpieltage(achse),
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
      if (!rules?.drehrad?.enabled) return { joker: [], narren: [], modifikatoren: [] };
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
      // Über die Spiele DIESER Runde — sonst käme ein anderer Runden-Spieltag
      // heraus als im Leaderboard.
      return beschlussLage({
        rules, antraege, members, adminId: round?.admin_id ?? null,
        matches: filterMatchesByTeams(matches, round?.team_filter),
      });
    },

    // Der Verlauf einer Runde — EINE Stelle, dieselben Eintraege wie das
    // Leaderboard (inklusive der Ersatz-Tipps aus dem Versaeumnis). Vorher baute
    // diese Methode ihre Eintraege selbst, ohne Ersatz-Tipps: zwei Kurven fuer
    // dieselbe Runde, sobald das Versaeumnis eingeschaltet war.
    async getLeaderboardHistory(roundId) {
      const { verlauf, entries, rules, regelnFuer, tips, nameOf, matchOf } = await this.standVorDemRad(roundId);
      if (verlauf) return verlauf;
      // Wie im Zweig oben: `matchId` kommt aus den ROHEN Tipps, `entries` trägt
      // es nicht — ohne das Feld verliert der Duell-Einsatz seinen Gleichstand-
      // Schlüssel (zwei zeitgleich angepfiffene Spiele am selben Spieltag).
      const einsaetze = einsaetzeAusTipps(tips.map((t) => ({ ...eintragVon(t, nameOf, matchOf), matchId: t.match_id })));
      return scoreLeaderboardHistory(entries, rules, einsaetze, regelnFuer);
    },

    // 🔴 Was hat wer an EINEM Spieltag geholt? — Frage 4 der Runden-Schicht.
    // Siehe Mock-Store: ohne diese Liste faellt der Trost-Joker still aus.
    async getSpieltagsPunkte(roundId) {
      return punkteJeSpieltag(await this.getLeaderboardHistory(roundId));
    },

    // 🔴 Wer hat wen getroffen — siehe Mock-Store. Über DENSELBEN Weg wie die
    // Wertung gerechnet; die Beträge hängen am Deckel und an der Reihenfolge.
    async getDuellVorgaenge(roundId) {
      const { entries, rules, regelnFuer, tips, nameOf, matchOf } = await this.standVorDemRad(roundId);
      if (!rules?.duell?.enabled) return [];
      const einsaetze = einsaetzeAusTipps(tips.map((t) => ({ ...eintragVon(t, nameOf, matchOf), matchId: t.match_id })));
      const sammeln = [];
      scoreLeaderboardHistory(entries, rules, einsaetze, regelnFuer, sammeln);
      return sammeln.map((v) => ({ ...v, vonName: nameOf(v.vonUserId), aufName: nameOf(v.aufUserId) }));
    },
  };
}
