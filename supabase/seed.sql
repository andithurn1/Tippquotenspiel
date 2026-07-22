-- ============================================================
--  Tippquotenspiel — Demo-Seed
--  Nach schema.sql ausführen. Snapshot/Ergebnis/Regelwerk stammen
--  1:1 aus der Engine (createMockOddsSource, DEFAULT_RULES), damit
--  DB und App exakt dieselben Zahlen verwenden.
-- ============================================================

-- Demo-Match JOR-ESP (real 5:1)
insert into public.matches (id, home, away, kickoff, matchday, snapshot, result)
values (
  'JOR-ESP', 'Jordanien', 'Spanien',
  '2026-06-20T18:45:00Z', 14,
  '{"matchId":"JOR-ESP","home":"Jordanien","away":"Spanien","kickoff":"2026-06-20T18:45:00Z","frozenAt":"2026-06-20T18:00:00Z","winner":{"home":9,"draw":6.5,"away":1.28},"margin":{"home":[0,7,14,28,70,180],"away":[0,2.6,4,7,15,38]},"correctScore":[[11,6.5,6,8,15,34],[9,7.5,8.5,13,26,60],[15,12,16,26,55,130],[30,21,34,60,140,320],[70,41,80,150,340,700],[160,96,180,340,750,1500]],"teamGoals":{"home":[2.1,3,6,11,24,55],"away":[4.5,3,3.4,5.5,10,22]},"players":{"home":{"Al-Naimat":{"anytime":3.2,"double":11},"Olwan":{"anytime":4.1,"double":15},"Al-Tamari":{"anytime":3.6,"double":13},"Al-Rashdan":{"anytime":5.5,"double":21},"Haddad":{"anytime":7,"double":30}},"away":{"Yamal":{"anytime":1.9,"double":5.5},"Oyarzabal":{"anytime":2.6,"double":8},"Merino":{"anytime":3.4,"double":12},"Williams":{"anytime":3,"double":10},"Olmo":{"anytime":3.8,"double":14}}},"startingXI":["Al-Naimat","Olwan","Yamal","Oyarzabal","Merino","Williams"]}'::jsonb,
  '{"home":5,"away":1,"playerGoals":{"Al-Naimat":2,"Yamal":1}}'::jsonb
)
on conflict (id) do update
  set snapshot = excluded.snapshot,
      result   = excluded.result,
      kickoff  = excluded.kickoff;

-- Gemeinsame Runde „Freundeskreis" mit Standard-Regelwerk. admin_id bleibt
-- null (Gemeinschaftsrunde); neue Nutzer treten ihr nach dem Login automatisch
-- bei (round_members). Feste Id, damit App und DB dieselbe Runde meinen.
insert into public.rounds (id, name, admin_id, rules, join_code)
values (
  '00000000-0000-0000-0000-000000000001', 'Freundeskreis', null,
  '{"name":"Standard","k":0.7,"m":0.5,"minPayout":1,"winnerFloor":true,"wrongPenalty":0,"combo":{"tendenz":1.15,"abstand":1.5,"exakt":2.3},"displayScale":15,"perGameCap":null,"markets":{"result":true,"goals":{"enabled":true,"picksPerTeam":2,"allowDouble":true,"allowBackups":true}},"oddsMode":"snapshot"}'::jsonb, 'DEMO'
)
on conflict (id) do update
  set rules = excluded.rules,
      name  = excluded.name;
