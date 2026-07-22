# Backend-Setup (Supabase)

Das Backend ist so gebaut, dass die App **ohne Backend sofort läuft** (In-Memory-Mock)
und der Wechsel auf echtes Supabase **eine einzige Stelle** ist: sobald die
Env-Variablen gesetzt sind, nutzt `getStore()` automatisch den Supabase-Store.

```
kein Env gesetzt   →  src/lib/store.mock.js      (Demo-Daten, Reset pro Start)
Supabase-Env da    →  src/lib/store.supabase.js  (echte DB)
```

Beide erfüllen dieselbe Schnittstelle (`src/lib/store.js`). Das **Scoring bleibt
immer in der Engine** (`src/lib/engine.js` → `scoreLeaderboard`); die Datenbank
hält nur Rohdaten (Tipps, Snapshots, Ergebnisse).

## Datenmodell

| Tabelle          | Zweck                                                        |
|------------------|-------------------------------------------------------------|
| `profiles`       | Anzeigename je Nutzer (1:1 zu `auth.users`)                 |
| `matches`        | Partien mit `snapshot` (Quoten) + `result` (null bis Ende) |
| `rounds`         | Freundes-Runde mit `rules` (Regelwerk) + `join_code`       |
| `round_members`  | wer ist in welcher Runde                                    |
| `tips`           | ein Tipp je Nutzer/Match/Runde, mit eingefrorenem Snapshot |

**Fairness per RLS:** Fremde Tipps einer Runde werden erst sichtbar, wenn das
Match ein `result` hat — vorher sieht jeder nur die eigenen. Kein Abschreiben.

## Einrichtung in 5 Schritten

1. **Projekt anlegen** auf [supabase.com](https://supabase.com) (kostenlose Stufe reicht fürs MVP).
2. **Schema laden:** Dashboard → *SQL Editor* → Inhalt von `supabase/schema.sql`
   einfügen und ausführen. Danach optional `supabase/seed.sql` für das Demo-Match.
3. **Auth aktivieren:** Dashboard → *Authentication* → *Providers* → **Email**
   (Magic Link genügt für einen Freundeskreis).
4. **Keys eintragen:** Dashboard → *Settings* → *API*. `.env.example` nach
   `.env.local` kopieren und `NEXT_PUBLIC_SUPABASE_URL` +
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` setzen. `service_role`-Key nur, wenn ein
   serverseitiger Job (Ergebnis-Eintragung) gebraucht wird — nie mit `NEXT_PUBLIC_`.
5. **Starten:** `npm run dev`. `getStore()` schaltet automatisch auf Supabase um.

## Was noch offen ist

- **UI an den Store hängen:** Die Screens zeigen aktuell noch Mock-Werte (in den
  Komponenten als solche kommentiert). Sobald die DB steht, holen sie Daten über
  `getStore()` statt aus den Hardcode-Arrays — inkl. Login-Flow (`supabase.auth`).
- **Ergebnis-/Quoten-Job:** Ergebnisse landen serverseitig in `matches.result`
  (Roadmap Punkt 6: echte Quoten-API, Key nur serverseitig).
