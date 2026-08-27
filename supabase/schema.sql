-- ============================================================
--  Tippquotenspiel — Supabase-Schema (MVP)
--  Im Supabase-Dashboard unter SQL Editor einmal ausführen.
--  Idempotent: kann gefahrlos erneut ausgeführt werden.
--  Modelliert: Nutzer-Profile, Matches (mit Snapshot-Quoten +
--  Ergebnis), Runden (Regelwerk + Beitritts-Code), Mitglieder,
--  Tipps. Scoring passiert NICHT in der DB, sondern in der
--  Engine (src/lib/engine.js) — die DB hält nur Rohdaten.
-- ============================================================

-- ── Profile (1:1 zu auth.users) ─────────────────────────────
-- avatar = id aus dem Katalog in src/lib/avatars.js (z. B. "fan-schal").
-- Bewusst ein Text-Feld statt einer Bild-Referenz: hochgeladene Fotos sind
-- eine eigene Baustelle (Moderation, Rechte, Speicher). Ein späterer Upload
-- wird als "url:<adresse>" abgelegt — dafür muss die Spalte nicht wandern.
-- premium_until = Zeitpunkt, bis zu dem Premium gilt (null = kein Premium).
-- Bewusst ein Datum statt eines Boolean: Abos passen später ohne Schema-Umbau
-- hinein. Solange es keinen Bezahlweg gibt, setzt man das Feld von Hand:
--   update public.profiles set premium_until = now() + interval '1 year'
--   where id = '<user-uuid>';
-- Schreiben darf das NUR service_role (siehe RLS unten) — sonst könnte sich
-- jeder selbst Premium eintragen.
create table if not exists public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  display_name  text not null,
  avatar        text,
  premium_until timestamptz,
  created_at    timestamptz not null default now()
);

-- Für Bestands-Datenbanken aus einer früheren Schema-Version (idempotent).
alter table public.profiles add column if not exists avatar text;
alter table public.profiles add column if not exists premium_until timestamptz;

-- ============================================================
--  PRIVATE Profildaten (KT9, Andi 25.08.2026)
--
--  🔴 WARUM EINE EIGENE TABELLE und nicht eine Spalte in `profiles`:
--  `profiles` ist fuer JEDEN Eingeloggten lesbar (`profiles_read` weiter
--  unten) — und das MUSS so sein, sonst saehe das Leaderboard die Namen und
--  Sinnbilder der Mitspieler nicht. Postgres kann RLS aber nur pro ZEILE,
--  nicht pro SPALTE: eine Spalte `geburtsdatum` in `profiles` waere damit
--  fuer alle Mitspieler mitlesbar gewesen.
--
--  ⚠️ Beim ersten Bau stand sie genau dort. Im Code sah nichts danach aus —
--  aufgefallen ist es erst beim Nachsehen der Policies.
--
--  Hier gehoert auch alles Weitere hin, was personenbezogen ist und
--  niemanden sonst angeht: die Geschlechtsangabe aus M6 zum Beispiel.
--  Faustregel: braucht es das Leaderboard, gehoert es nach `profiles` —
--  sonst hierher.
--
--  ⛔ Kein Pflichtfeld. Wer nichts angibt, hat keine Zeile oder eine leere,
--  verliert genau eine Sorte Namensvorschlag („Andi95") und sonst nichts.
--  ⚠️ `date`, nicht `timestamptz`: ein Geburtstag hat keine Uhrzeit und keine
--  Zeitzone. Mit timestamptz waere der 27.08. fuer manche der 26.08.
-- ============================================================
create table if not exists public.profile_privat (
  id           uuid primary key references auth.users on delete cascade,
  geburtsdatum date,
  updated_at   timestamptz not null default now()
);


-- Geburtsdatum (KT9, Andi 25.08.2026). ⛔ Bewusst NULLABLE: kein Pflichtfeld.
-- Wer es nicht angibt, verliert genau eine Sorte Namensvorschlag („Andi95")
-- und sonst nichts. Ein Tippspiel unter Freunden, das nach dem Geburtsdatum
-- verlangt, bevor man mitspielen darf, verliert Mitspieler an einer Stelle,
-- an der nichts davon abhaengt.
-- ⚠️ `date`, nicht `timestamptz`: ein Geburtstag hat keine Uhrzeit und keine
-- Zeitzone. Mit timestamptz waere der 27.08. fuer manche der 26.08.
alter table public.profiles add column if not exists geburtsdatum date;

-- ── Matches (das, worauf getippt wird) ──────────────────────
-- snapshot = eingefrorene Quoten (Form der Engine-Quoten-Quelle),
-- result   = null bis angepfiffen/ausgewertet.
create table if not exists public.matches (
  id         text primary key,               -- z. B. "JOR-ESP"
  home       text not null,
  away       text not null,
  kickoff    timestamptz,
  matchday   int,
  snapshot   jsonb not null,
  result     jsonb,
  wettbewerb text not null default 'bl',   -- "bl" | "pl" | "cl" (wettbewerbe.js)
  phase      text not null default 'liga', -- "liga" | "achtelfinale" | … | "finale"
  created_at timestamptz not null default now()
);

-- Mehrere Wettbewerbe: Spalten nachrüsten, falls die Tabelle aus einer
-- früheren Schema-Version stammt. Defaults sorgen dafür, dass Altdaten als
-- Ligaspiele der Bundesliga gelten (wie der Fallback in wettbewerbe.js).
alter table public.matches add column if not exists wettbewerb text not null default 'bl';
alter table public.matches add column if not exists phase      text not null default 'liga';

create index if not exists matches_wettbewerb_idx on public.matches (wettbewerb, matchday);

-- ── Runden (eine Freundes-Runde mit eigenem Regelwerk) ──────
-- rules = per sanitizeRules() gültiges Regelwerk (JSON).
-- admin_id nullable, damit eine geseedete Gemeinschaftsrunde ohne
-- konkreten Admin existieren kann.
-- team_filter = Array von Team-Namen oder null ("alle Teams/Spiele").
-- Filtert NICHT den globalen matches-Katalog, sondern nur, welche Matches
-- dieser Runde beim Tippen angezeigt werden (siehe roundStatus.js).
create table if not exists public.rounds (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  admin_id    uuid references public.profiles(id) on delete set null,
  rules       jsonb not null,
  join_code   text not null unique,           -- kurzer Beitritts-Code
  team_filter jsonb,
  created_at  timestamptz not null default now()
);

-- Falls die rounds-Tabelle aus einer früheren Schema-Version noch keine
-- team_filter-Spalte hat: nachträglich ergänzen (idempotent).
alter table public.rounds add column if not exists team_filter jsonb;

-- 🔴 spiele = die GANZE Spielauswahl, beim Anlegen eingefroren (09.08.2026).
-- `team_filter` konnte nur eine Vereinsliste festhalten; Wettbewerbe, Phasen,
-- Spieltag-Bereich, feste Begegnungsliste und die Liga-Sonderregeln gingen
-- beim Anlegen verloren. Gemessen: eine Runde „nur Bundesliga" umfasste 1943
-- statt 306 Spiele.
--
-- ⚠️ EINGEFROREN und nicht live aus `rules.spiele` gelesen: eine Runde kann
-- ihr Regelwerk per Abstimmung ändern, und ein Beschluss darf nicht
-- rückwirkend ändern, welche Spiele je dazugehört haben — samt der Tipps
-- darauf. Dieselbe Kante wie beim Quoten-Snapshot.
--
-- ⚠️ Bestehende Runden behalten `spiele = null` und laufen weiter über
-- `team_filter` (Rückfall in `rundenSpiele`, roundStatus.js). Nichts an einer
-- laufenden Runde ändert sich dadurch.
alter table public.rounds add column if not exists spiele jsonb;

-- ── Mitglieder einer Runde ──────────────────────────────────
create table if not exists public.round_members (
  round_id  uuid not null references public.rounds(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (round_id, user_id)
);

-- ── Tipps (ein Tipp je Nutzer/Match/Runde) ──────────────────
-- tip      = { home, away, goals:{ home:[], away:[] } }
-- snapshot = zum Tippzeitpunkt eingefrorene Quote (Fairness).
create table if not exists public.tips (
  id         uuid primary key default gen_random_uuid(),
  round_id   uuid not null references public.rounds(id) on delete cascade,
  match_id   text not null references public.matches(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  tip        jsonb not null,
  snapshot   jsonb not null,
  created_at timestamptz not null default now(),
  unique (round_id, match_id, user_id)
);

-- ── Joker-Abstimmung (eine Stimme je Nutzer/Runde/Spieltag) ─
-- ja = true (Joker an diesem Spieltag) / false (dagegen). Die Auswertung
-- (Mehrheit → Joker-Spieltag) passiert in der Engine (voting.js), die DB
-- hält nur die Rohstimmen. unique-Constraint erlaubt das upsert beim Umstimmen.
create table if not exists public.votes (
  round_id   uuid not null references public.rounds(id) on delete cascade,
  matchday   int  not null,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  ja         boolean not null,
  created_at timestamptz not null default now(),
  primary key (round_id, matchday, user_id)
);

create index if not exists votes_round_idx on public.votes (round_id);

-- Mehrere Wettbewerbe: „Spieltag 1" gibt es seit der Champions League zweimal.
-- Ohne den Wettbewerb im Schluessel wuerden Bundesliga- und CL-Stimmen
-- desselben Spieltags zusammenfallen. Nachtraeglich und idempotent:
alter table public.votes add column if not exists wettbewerb text not null default 'bl';
alter table public.votes drop constraint if exists votes_pkey;
alter table public.votes add constraint votes_pkey
  primary key (round_id, wettbewerb, matchday, user_id);

-- ── Saison-Wetten der Spieler ───────────────────────────────
-- Langzeit-Tipps (Meister, Torschützenkönig …). Hängen an KEINEM Match —
-- deshalb eine eigene Tabelle. wetten_id = wettenId() aus saisonwetten.js,
-- wert = getippter Team-/Spielername. Ein Tipp je (Runde, Nutzer, Wette).
create table if not exists public.season_tips (
  round_id   uuid not null references public.rounds(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  wetten_id  text not null,
  wert       text not null,
  created_at timestamptz not null default now(),
  primary key (round_id, user_id, wetten_id)
);

create index if not exists season_tips_round_idx on public.season_tips (round_id);

-- ── Regel-Abstimmung: Anträge und Stimmen ──────────────────
-- ⚠️ NICHT zu verwechseln mit `votes` weiter oben. Dort stimmt die Runde ab,
-- an welchen Spieltagen es einen Joker gibt (voting.js). Hier geht es um
-- Änderungen AM REGELWERK (design/abstimmung-verfassung.md) — eine andere
-- Frage, deshalb eigene Tabellen.
--
-- `aspekt`   = Aspekt-Schlüssel aus presetMerge.ASPEKTE. Zur Abstimmung steht
--              immer ein GANZER Aspekt, nie ein Einzelfeld.
-- `werte`    = die Felder genau dieses Aspekts (wie ein Teilbibliotheks-Eintrag).
-- `gestellt_am` / `laeuft_bis` = RUNDEN-Spieltage, keine Zeitstempel. Die Frist
--              wird beim Anlegen EINGEFROREN: eine später geänderte Dauer darf
--              eine laufende Abstimmung nicht verschieben.
create table if not exists public.rule_proposals (
  id          uuid primary key default gen_random_uuid(),
  round_id    uuid not null references public.rounds(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  aspekt      text not null,
  werte       jsonb not null default '{}'::jsonb,
  gestellt_am int,
  laeuft_bis  int,
  status      text not null default 'offen',
  veto        boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists rule_proposals_round_idx on public.rule_proposals (round_id);

-- Eine Stimme je Nutzer und Antrag — dieselbe Regel wie bei der
-- Joker-Abstimmung, hier über den Primärschlüssel erzwungen.
create table if not exists public.rule_proposal_votes (
  antrag_id  uuid not null references public.rule_proposals(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  ja         boolean not null,
  created_at timestamptz not null default now(),
  primary key (antrag_id, user_id)
);

-- ── Admin-Freigaben ────────────────────────────────────────
-- `jokerBasis.wer: "adminFreigabe"` heißt: einsetzen darf nur, wen der Admin
-- für diesen Spieltag freigegeben hat. Ohne Speicherort lehnte die Prüfung an
-- JEDER Stelle ab — die Einstellung war über die Oberfläche wählbar und ohne
-- jede Wirkung (design/kontaktstellen.md, letzte Teil-Wirkung).
--
-- ⚠️ `matchday` ist der RUNDEN-Spieltag, nicht der Liga-Spieltag: `darfEinsetzen`
-- vergleicht ihn mit `kontext.aktuellerSpieltag`, und der zählt rundenweit.
-- (Dieselbe Verwechslung hat in diesem Projekt schon viermal zugeschlagen.)
create table if not exists public.admin_freigaben (
  round_id   uuid not null references public.rounds(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  matchday   int  not null,
  created_at timestamptz not null default now(),
  primary key (round_id, user_id, matchday)
);

create index if not exists admin_freigaben_round_idx on public.admin_freigaben (round_id);

-- ── Ausgeübte Rechte (Weg B, Andi 27.08.2026) ──────────────
-- Der Spieltagssieger bestimmt etwas für den NÄCHSTEN Spieltag — das Topspiel,
-- oder eine vom Admin vorbereitete Wirkung (`rules.rechte.angebote`).
--
-- 🔴 Warum eine eigene Tabelle und nicht `rounds.rules`: das Regelwerk hat
-- kein Gedächtnis. Eine Wahl, die dort landet, gilt danach für IMMER und
-- rückwirkend auch für Spieltage, an denen es sie noch gar nicht gab —
-- dieselbe Falle wie eine nachträglich veränderte Quote. Deshalb steht der
-- Spieltag in jeder Zeile: eine Ausübung ist eine Aussage über GENAU EINEN
-- Spieltag.
--
--   matchday     Der RUNDEN-Spieltag, für den die Wahl gilt (nicht der, an
--                dem sie getroffen wurde).
--   angebot_key  Zeigt auf `rules.rechte.angebote[].key`.
--   wert         Bei „Topspiel bestimmen" die Match-Id, sonst null.
create table if not exists public.rechte_ausgeuebt (
  round_id    uuid not null references public.rounds(id) on delete cascade,
  matchday    int  not null,
  angebot_key text not null,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  wert        text,
  created_at  timestamptz not null default now(),
  -- Eine Wahl je Spieltag und Angebot. Der Schlüssel enthält BEWUSST nicht
  -- `user_id`: sonst könnten zwei Spieler dasselbe Recht am selben Spieltag
  -- ausüben, und es gäbe zwei Topspiele.
  primary key (round_id, matchday, angebot_key)
);

create index if not exists rechte_ausgeuebt_round_idx on public.rechte_ausgeuebt (round_id);

-- ── Kurzcode-Presets (Content-Creator-Codes) ───────────────
-- Ein geteiltes Regelwerk unter einem kurzen, merkbaren Code — statt des
-- langen Text-Creator-Codes. rules = per sanitizeRules() gültiges Regelwerk.
create table if not exists public.presets (
  code       text primary key,
  name       text not null,
  rules      jsonb not null,
  creator_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Nachgereicht am 24.08.2026, damit die Bibliothek geteilte Regelwerke
-- AUFLISTEN kann und nicht nur per bekanntem Kurzcode einzeln abrufen:
--   beschreibung  Ein Satz des Erstellers - was das Regelwerk ausmacht.
--   aspekt        Bei einem Teil-Code der eine Aspekt (siehe presetMerge.js),
--                 bei einem ganzen Regelwerk null.
--   uebernahmen   Wie oft jemand das Preset uebernommen hat. Die Grundlage
--                 der Sortierung "beliebteste Auswahl".
alter table public.presets add column if not exists beschreibung text;
alter table public.presets add column if not exists aspekt       text;
alter table public.presets add column if not exists uebernahmen  integer not null default 0;

create index if not exists presets_uebernahmen_idx on public.presets (uebernahmen desc);
create index if not exists presets_created_idx     on public.presets (created_at desc);

-- Zaehler-Erhoehung als Funktion, aus zwei Gruenden:
--   1. Lesen-Rechnen-Schreiben verliert gleichzeitige Uebernahmen.
--   2. Ein UPDATE auf ein FREMDES Preset laesst RLS nicht zu - und genau das
--      ist der Normalfall: man uebernimmt ja das Regelwerk eines anderen.
--      `security definer` hebt das fuer GENAU diese eine Spalte auf.
create or replace function public.bump_preset(p_code text)
returns public.presets
language sql
security definer
set search_path = public
as $$
  update public.presets
     set uebernahmen = uebernahmen + 1
   where code = upper(trim(p_code))
  returning *;
$$;

revoke all on function public.bump_preset(text) from public;
grant execute on function public.bump_preset(text) to authenticated;

create index if not exists tips_round_match_idx on public.tips (round_id, match_id);
create index if not exists round_members_user_idx on public.round_members (user_id);

-- Falls die rounds-Tabelle aus einer früheren Schema-Version noch
-- admin_id NOT NULL hat: für die Gemeinschaftsrunde nullable machen.
alter table public.rounds alter column admin_id drop not null;


-- ============================================================
--  Anzeigenamen sind EINDEUTIG (KT10, Andi 25.08.2026)
--  „es gibt einzigartige Benutzernamen und wenn einer schon vergeben ist,
--   wird eben vorgeschlagen welche Zahl vom Geburtsdatum oder sonstiger
--   Nachcode noch frei ist."
--
--  Verglichen wird KLEINGESCHRIEBEN: „Andi" und „andi" sind derselbe Name.
--  ⚠️ Muss zu `namensSchluessel()` in src/lib/benutzername.js passen — laeuft
--  eine Seite anders, sagt die App „frei" und die DB verweigert das Speichern.
--
--  ⚠️ ZUERST entdoppeln, dann sperren. Auf einer Bestands-Datenbank koennen
--  schon zwei gleiche Namen stehen; ohne diesen Schritt scheitert das Anlegen
--  des Index, und damit das ganze Skript — obwohl es idempotent sein soll.
--  Der aelteste Eintrag behaelt den Namen, die spaeteren bekommen eine Zahl.
-- ============================================================
do $$
declare r record; n int; kandidat text;
begin
  for r in
    select id, display_name,
           row_number() over (partition by lower(display_name) order by created_at, id) as platz
    from public.profiles
  loop
    if r.platz > 1 then
      n := r.platz;
      loop
        kandidat := left(r.display_name, greatest(1, 24 - length(n::text))) || n::text;
        exit when not exists (
          select 1 from public.profiles where lower(display_name) = lower(kandidat)
        );
        n := n + 1;
      end loop;
      update public.profiles set display_name = kandidat where id = r.id;
    end if;
  end loop;
end $$;

create unique index if not exists profiles_display_name_key
  on public.profiles (lower(display_name));


-- ============================================================
--  Profil automatisch anlegen, sobald sich jemand registriert
--
--  🔴 DIE STELLE, an der der erste Freundes-Test geknallt waere. Der Name
--  wird aus der Mailadresse abgeleitet — zwei Freunde mit `andi@gmail.com`
--  und `andi@web.de` bekommen daraus BEIDE „andi". Mit dem Index oben waere
--  der zweite `insert` gescheitert, und weil dieser Trigger am
--  `insert on auth.users` haengt, waere damit die REGISTRIERUNG
--  fehlgeschlagen: ein Freund, der sich nicht anmelden kann und keinen Grund
--  sieht. Sperre und Ausweichname gehoeren deshalb zusammen.
--
--  Gesucht wird der naechste freie Name ueber die laufende Zahl am
--  gekuerzten Stamm — also die RUECKFALL-Spielart aus `namensVorschlaege()`,
--  nicht deren ganze Rangfolge. Das ist Absicht: Trikotnummer, Geburtsjahr
--  und Vereinskuerzel sind Vorschlaege fuer einen MENSCHEN, der auswaehlt.
--  Hier waehlt niemand aus, hier muss nur eine Registrierung durchgehen —
--  und der Trigger kennt weder Geburtsjahr noch Lieblingsverein. Der
--  `exception`-Zweig faengt zusaetzlich das Rennen zweier gleichzeitiger
--  Anmeldungen ab, das eine reine Vorab-Pruefung nicht sehen kann.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  basis    text;
  kandidat text;
  n        int := 1;
begin
  basis := coalesce(
    nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
    nullif(split_part(new.email, '@', 1), ''),
    'Spieler');
  basis := left(basis, 24);
  kandidat := basis;

  for i in 1..50 loop
    begin
      insert into public.profiles (id, display_name) values (new.id, kandidat);
      return new;
    exception
      when unique_violation then
        -- Gibt es die ZEILE schon, ist nichts zu tun (Trigger doppelt gefeuert).
        if exists (select 1 from public.profiles where id = new.id) then
          return new;
        end if;
        -- Sonst war der NAME belegt: naechsten Kandidaten bilden.
        n := n + 1;
        kandidat := left(basis, greatest(1, 24 - length(n::text))) || n::text;
    end;
  end loop;

  -- Notnagel nach 50 Versuchen: garantiert eindeutig, weil die id es ist.
  -- ⚠️ Lieber ein haesslicher Name als eine gescheiterte Registrierung.
  insert into public.profiles (id, display_name)
  values (new.id, left(basis, 15) || '-' || substr(replace(new.id::text, '-', ''), 1, 8))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================
--  Row Level Security — nur eingeloggte Nutzer, faire Sicht
-- ============================================================
alter table public.profiles      enable row level security;
alter table public.profile_privat enable row level security;
alter table public.matches       enable row level security;
alter table public.rounds        enable row level security;
alter table public.round_members enable row level security;
alter table public.tips          enable row level security;
alter table public.presets       enable row level security;
alter table public.votes         enable row level security;
alter table public.season_tips   enable row level security;
alter table public.rule_proposals      enable row level security;
alter table public.rule_proposal_votes enable row level security;
alter table public.admin_freigaben     enable row level security;
alter table public.rechte_ausgeuebt    enable row level security;

-- Profile: jeder Eingeloggte darf lesen; eigenes Profil schreiben.
-- 🔴 Private Profildaten: NUR die eigene Zeile, und zwar in jeder Richtung.
-- Kein `using (true)` wie bei `profiles` darunter — das ist der ganze Zweck
-- der Trennung. Wer hier eine Lesepolicy aufweicht, macht sie zunichte.
drop policy if exists "profil_privat_read"   on public.profile_privat;
drop policy if exists "profil_privat_insert" on public.profile_privat;
drop policy if exists "profil_privat_update" on public.profile_privat;
create policy "profil_privat_read"   on public.profile_privat for select to authenticated using (id = auth.uid());
create policy "profil_privat_insert" on public.profile_privat for insert to authenticated with check (id = auth.uid());
create policy "profil_privat_update" on public.profile_privat for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "profiles_read"        on public.profiles;
drop policy if exists "profiles_insert_self" on public.profiles;
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_read"        on public.profiles for select to authenticated using (true);
create policy "profiles_insert_self" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_self" on public.profiles for update to authenticated using (id = auth.uid());

-- WICHTIG: Die Policy oben erlaubt das Ändern des EIGENEN Profils — ohne
-- weitere Einschränkung könnte sich damit jeder selbst `premium_until`
-- setzen. RLS kennt keine Spalten-Einschränkung, deshalb hier zusätzlich
-- Spalten-Rechte: Eingeloggte dürfen nur Name und Avatar schreiben.
-- premium_until bleibt allein service_role vorbehalten (umgeht RLS ohnehin)
-- und wird damit nur serverseitig bzw. von Hand gesetzt.
revoke update on public.profiles from authenticated;
grant  update (display_name, avatar) on public.profiles to authenticated;

-- Matches: für alle Eingeloggten lesbar (Schreiben nur serverseitig
-- via service_role, das RLS umgeht — z. B. Quoten-/Ergebnis-Job).
drop policy if exists "matches_read" on public.matches;
create policy "matches_read" on public.matches for select to authenticated using (true);

-- Runden: für alle Eingeloggten lesbar (Beitritt per Code muss die Runde
-- VOR der Mitgliedschaft finden können — der Code selbst ist die Schranke,
-- nicht die Sichtbarkeit; Regelwerk/Name sind nicht sensibel). Jeder darf
-- eine Runde anlegen und wird dabei automatisch ihr Admin.
drop policy if exists "rounds_read_members" on public.rounds;
drop policy if exists "rounds_read"         on public.rounds;
drop policy if exists "rounds_insert"       on public.rounds;
create policy "rounds_read" on public.rounds for select to authenticated using (true);
create policy "rounds_insert" on public.rounds for insert to authenticated
  with check (admin_id = auth.uid());

-- Presets: für alle Eingeloggten lesbar (der Kurzcode ist die Zugangsschranke,
-- nicht die Sichtbarkeit; ein Regelwerk ist nicht sensibel). Anlegen darf jeder
-- für sich selbst (creator_id = eigene Id).
drop policy if exists "presets_read"   on public.presets;
drop policy if exists "presets_insert" on public.presets;
create policy "presets_read" on public.presets for select to authenticated using (true);
create policy "presets_insert" on public.presets for insert to authenticated
  with check (creator_id = auth.uid());

-- Mitgliedschaft: wer selbst Mitglied einer Runde ist, sieht ALLE Mitglieder
-- dieser Runde (nötig fürs Leaderboard — sonst sähe man nur die eigene
-- Zeile). Sich selbst beitreten lassen bleibt streng auf die eigene Id begrenzt.
drop policy if exists "members_read_self" on public.round_members;
drop policy if exists "members_read_same_round" on public.round_members;
drop policy if exists "members_join_self" on public.round_members;
create policy "members_read_same_round" on public.round_members for select to authenticated
  using (
    exists (select 1 from public.round_members m2
            where m2.round_id = round_members.round_id and m2.user_id = auth.uid())
  );
create policy "members_join_self" on public.round_members for insert to authenticated
  with check (user_id = auth.uid());

-- Tipps: eigene immer sichtbar. Fremde Tipps einer Runde erst, wenn das
-- Match ein Ergebnis hat — verhindert Abschreiben vor Anpfiff.
drop policy if exists "tips_read_own_or_settled" on public.tips;
drop policy if exists "tips_insert_self"         on public.tips;
drop policy if exists "tips_update_own"          on public.tips;
create policy "tips_read_own_or_settled" on public.tips for select to authenticated
  using (
    user_id = auth.uid()
    or (
      exists (select 1 from public.round_members m
              where m.round_id = tips.round_id and m.user_id = auth.uid())
      and exists (select 1 from public.matches mt
                  where mt.id = tips.match_id and mt.result is not null)
    )
  );
create policy "tips_insert_self" on public.tips for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.round_members m
                where m.round_id = tips.round_id and m.user_id = auth.uid())
  );
create policy "tips_update_own" on public.tips for update to authenticated
  using (user_id = auth.uid());

-- Abstimmung: Mitglieder derselben Runde sehen ALLE Stimmen (die Auszählung
-- braucht sie, und wie man abstimmt ist ohnehin ein Gemeinschaftsentscheid).
-- Setzen/Ändern darf jeder nur die eigene Stimme und nur in einer Runde, in
-- der er Mitglied ist.
drop policy if exists "votes_read_same_round" on public.votes;
drop policy if exists "votes_insert_self"     on public.votes;
drop policy if exists "votes_update_self"     on public.votes;
create policy "votes_read_same_round" on public.votes for select to authenticated
  using (
    exists (select 1 from public.round_members m
            where m.round_id = votes.round_id and m.user_id = auth.uid())
  );
create policy "votes_insert_self" on public.votes for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.round_members m
                where m.round_id = votes.round_id and m.user_id = auth.uid())
  );
create policy "votes_update_self" on public.votes for update to authenticated
  using (user_id = auth.uid());

-- Saison-Wetten: sichtbar für Mitglieder derselben Runde (wie das Leaderboard,
-- das sie mit einrechnet). Setzen/Ändern nur die eigene Wette, nur als Mitglied.
drop policy if exists "season_tips_read_same_round" on public.season_tips;
drop policy if exists "season_tips_insert_self"     on public.season_tips;
drop policy if exists "season_tips_update_self"     on public.season_tips;
create policy "season_tips_read_same_round" on public.season_tips for select to authenticated
  using (
    exists (select 1 from public.round_members m
            where m.round_id = season_tips.round_id and m.user_id = auth.uid())
  );
create policy "season_tips_insert_self" on public.season_tips for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.round_members m
                where m.round_id = season_tips.round_id and m.user_id = auth.uid())
  );
create policy "season_tips_update_self" on public.season_tips for update to authenticated
  using (user_id = auth.uid());

-- Regel-Anträge: sichtbar für Mitglieder derselben Runde — eine Abstimmung,
-- die man nicht sehen kann, gibt es nicht. Stellen darf nur, wer Mitglied ist
-- und in eigenem Namen; WER stellen darf (Antragsrecht, Verfassung,
-- Sperrfrist) entscheidet regelAbstimmung.js, nicht die Datenbank — RLS ist
-- die Zugangs-, nicht die Spielregel.
-- ⚠️ `status`/`veto` ändert absichtlich NIEMAND über diese Policies: das ist
-- ein Abschluss und gehört serverseitig (service_role) gesetzt, sonst könnte
-- jedes Mitglied den eigenen Antrag für angenommen erklären.
drop policy if exists "rule_proposals_read_same_round" on public.rule_proposals;
drop policy if exists "rule_proposals_insert_self"     on public.rule_proposals;
create policy "rule_proposals_read_same_round" on public.rule_proposals for select to authenticated
  using (
    exists (select 1 from public.round_members m
            where m.round_id = rule_proposals.round_id and m.user_id = auth.uid())
  );
create policy "rule_proposals_insert_self" on public.rule_proposals for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.round_members m
                where m.round_id = rule_proposals.round_id and m.user_id = auth.uid())
  );

-- Stimmen zu einem Antrag: lesbar für Mitglieder derselben Runde (die
-- VERDECKTE Auszählung ist eine Anzeige-Entscheidung der Oberfläche, keine
-- Zugangsfrage — sonst könnte niemand mehr auszählen). Abgeben und Ändern nur
-- die eigene Stimme, und nur als Mitglied der Runde des Antrags.
drop policy if exists "rule_proposal_votes_read_same_round" on public.rule_proposal_votes;
drop policy if exists "rule_proposal_votes_insert_self"     on public.rule_proposal_votes;
drop policy if exists "rule_proposal_votes_update_self"     on public.rule_proposal_votes;
create policy "rule_proposal_votes_read_same_round" on public.rule_proposal_votes for select to authenticated
  using (
    exists (select 1 from public.rule_proposals p
            join public.round_members m on m.round_id = p.round_id
            where p.id = rule_proposal_votes.antrag_id and m.user_id = auth.uid())
  );
create policy "rule_proposal_votes_insert_self" on public.rule_proposal_votes for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.rule_proposals p
                join public.round_members m on m.round_id = p.round_id
                where p.id = rule_proposal_votes.antrag_id and m.user_id = auth.uid())
  );
create policy "rule_proposal_votes_update_self" on public.rule_proposal_votes for update to authenticated
  using (user_id = auth.uid());

-- Admin-Freigaben: LESEN dürfen alle Mitglieder der Runde (man muss sehen
-- können, ob man freigegeben ist). SCHREIBEN darf ausschließlich der Admin
-- der Runde — sonst gäbe sich jeder selbst frei, und die ganze Einstellung
-- wäre eine Zierde. Deshalb hängt die Policy an `rounds.admin_id`, nicht an
-- einer Rolle am Mitglied: `round_members` hat gar keine.
drop policy if exists "admin_freigaben_read_same_round" on public.admin_freigaben;
drop policy if exists "admin_freigaben_write_admin"     on public.admin_freigaben;
drop policy if exists "admin_freigaben_delete_admin"    on public.admin_freigaben;
create policy "admin_freigaben_read_same_round" on public.admin_freigaben for select to authenticated
  using (
    exists (select 1 from public.round_members m
            where m.round_id = admin_freigaben.round_id and m.user_id = auth.uid())
  );
create policy "admin_freigaben_write_admin" on public.admin_freigaben for insert to authenticated
  with check (
    exists (select 1 from public.rounds r
            where r.id = admin_freigaben.round_id and r.admin_id = auth.uid())
  );
create policy "admin_freigaben_delete_admin" on public.admin_freigaben for delete to authenticated
  using (
    exists (select 1 from public.rounds r
            where r.id = admin_freigaben.round_id and r.admin_id = auth.uid())
  );

-- ── Ausgeübte Rechte ──
-- LESEN darf jedes Mitglied der Runde: das Topspiel ist eine Ansage an alle,
-- und wer nicht weiß, welches Spiel mehr zählt, tippt unter anderen
-- Bedingungen als die übrigen.
--
-- 🔴 SCHREIBEN darf nur, wer das Recht auch HÄLT — und das ist der Punkt, an
-- dem diese Tabelle sich von `admin_freigaben` unterscheidet: dort entscheidet
-- eine feste Rolle (`rounds.admin_id`), hier ein ERGEBNIS. Der Sieger eines
-- Spieltags steht nirgends in der Datenbank; er ergibt sich aus der Wertung,
-- und die läuft in der Engine.
--
-- ⚠️ Deshalb prüft die Policy, was sie im SQL prüfen KANN: dass der Schreiber
-- Mitglied dieser Runde ist und für sich selbst schreibt. Dass er auch der
-- Spieltagssieger ist, kann sie NICHT prüfen — das wäre eine Nachbildung der
-- Wertung in SQL, also eine zweite Wahrheit an der teuersten Stelle.
--
-- 🔴 Was diese Lücke schließt und was nicht: der Primärschlüssel
-- `(round_id, matchday, angebot_key)` sorgt dafür, dass es **genau eine**
-- Ausübung je Spieltag gibt — ein Fremder kann also nicht zusätzlich wählen,
-- höchstens ZUERST. Und ein `update` gibt es nicht (keine Policy dafür), also
-- kann niemand eine getroffene Wahl überschreiben.
-- ⚠️ Damit bleibt genau ein Missbrauch möglich: jemand kommt dem Sieger zuvor.
-- Das ist für eine Runde unter Freunden tragbar und steht hier, damit es eine
-- bekannte Grenze ist und keine Überraschung. Wasserdicht wird es erst mit
-- einer Server-Funktion (`security definer`), die den Sieger selbst ausrechnet.
drop policy if exists "rechte_read_same_round"  on public.rechte_ausgeuebt;
drop policy if exists "rechte_write_member"     on public.rechte_ausgeuebt;
create policy "rechte_read_same_round" on public.rechte_ausgeuebt for select to authenticated
  using (
    exists (select 1 from public.round_members m
            where m.round_id = rechte_ausgeuebt.round_id and m.user_id = auth.uid())
  );
create policy "rechte_write_member" on public.rechte_ausgeuebt for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.round_members m
                where m.round_id = rechte_ausgeuebt.round_id and m.user_id = auth.uid())
  );
