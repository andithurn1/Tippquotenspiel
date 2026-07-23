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
create table if not exists public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  display_name text not null,
  created_at   timestamptz not null default now()
);

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
  created_at timestamptz not null default now()
);

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

create index if not exists tips_round_match_idx on public.tips (round_id, match_id);
create index if not exists round_members_user_idx on public.round_members (user_id);

-- Falls die rounds-Tabelle aus einer früheren Schema-Version noch
-- admin_id NOT NULL hat: für die Gemeinschaftsrunde nullable machen.
alter table public.rounds alter column admin_id drop not null;


-- ============================================================
--  Profil automatisch anlegen, sobald sich jemand registriert
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
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
alter table public.matches       enable row level security;
alter table public.rounds        enable row level security;
alter table public.round_members enable row level security;
alter table public.tips          enable row level security;

-- Profile: jeder Eingeloggte darf lesen; eigenes Profil schreiben.
drop policy if exists "profiles_read"        on public.profiles;
drop policy if exists "profiles_insert_self" on public.profiles;
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_read"        on public.profiles for select to authenticated using (true);
create policy "profiles_insert_self" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_self" on public.profiles for update to authenticated using (id = auth.uid());

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
