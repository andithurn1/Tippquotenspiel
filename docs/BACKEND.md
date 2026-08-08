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

**Runden erstellen & beitreten:** Jede Runde hat einen `join_code` (6-stellig,
generiert in `src/lib/joinCode.js`, kein O/0/I/1 zur Verwechslungsgefahr).
`rounds` ist für alle Eingeloggten lesbar (RLS `using (true)`) — das ist
bewusst so: der Beitritt per Code muss die Runde finden können, BEVOR man
Mitglied ist. Der Code selbst ist die Zugangsschranke (er steht nicht öffentlich,
nur wer ihn von einem Mitspieler bekommt, kann beitreten), nicht die
Sichtbarkeit der (unsensiblen) Rundendaten. `round_members` erlaubt SELECT für
alle Mitglieder derselben Runde — sonst würde das Leaderboard nach dem Beitritt
nur die eigene Zeile zeigen.

⚠️ **Falls dein Supabase-Projekt schon vor diesem Feature eingerichtet wurde:**
`schema.sql` im SQL Editor **erneut komplett ausführen** — es ist idempotent
(kann gefahrlos mehrfach laufen) und bringt die beiden oben genannten
RLS-Policies auf den aktuellen Stand. Ohne den Re-Run würde „Runde beitreten"
in der Live-DB keine fremde Runde finden.

### Nach einem Re-Run: nicht nur auf die Tabellen schauen

Die Tabellen entstehen in der MITTE der Datei, die RLS-Policies am ENDE. Eine
vorhandene Tabelle beweist also nicht, dass die Ausführung durchgelaufen ist —
und eine fehlende Policy meldet keinen Fehler, sie liefert live einfach keine
Zeilen. Das ist der stille Fall, den man sonst erst im Betrieb bemerkt.
Deshalb nach jedem Re-Run beides prüfen:

```sql
-- 1) Sind die Tabellen da?
select table_name from information_schema.tables
where table_schema = 'public';

-- 2) Und die Policies? (Beispiel für die zwei jüngsten Tabellen)
select tablename, policyname from pg_policies
where schemaname = 'public'
  and tablename in ('rule_proposals', 'rule_proposal_votes');
```

**Stand 05.08.2026:** ausgeführt, `rule_proposals` und `rule_proposal_votes`
(Regel-Abstimmung, `design/abstimmung-verfassung.md`) sind angelegt.

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

## Deployment (Vercel)

1. **Projekt importieren:** [vercel.com](https://vercel.com) → *Add New… → Project* →
   das GitHub-Repo auswählen. Next.js wird automatisch erkannt (kein Config nötig).
2. **Env-Variablen setzen** (im Vercel-Projekt → *Settings → Environment Variables*):
   `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_ANON_KEY` aus Supabase
   *Settings → API*. (`service_role` erst, wenn ein serverseitiger Job dazukommt.)
3. **Deployen** → Vercel gibt dir eine URL. Jeder Branch/PR bekommt automatisch eine
   Preview-URL; für eine stabile Produktions-URL den Branch nach `main` mergen
   (oder in Vercel den Production-Branch auf den Feature-Branch setzen).
4. **WICHTIG — Auth-Redirect erlauben:** Supabase → *Authentication → URL
   Configuration* → *Site URL* auf die Vercel-URL setzen und dieselbe URL unter
   *Redirect URLs* eintragen. Sonst führt der Magic-Link-Login ins Leere.

Ohne gesetzte Env-Variablen läuft auch das Deployment im Demo-Modus (Mock) —
die App ist also nie „kaputt", sie zeigt dann nur lokale Demo-Daten.

## Was noch offen ist

- **UI an den Store hängen:** Die Screens zeigen aktuell noch Mock-Werte (in den
  Komponenten als solche kommentiert). Sobald die DB steht, holen sie Daten über
  `getStore()` statt aus den Hardcode-Arrays — inkl. Login-Flow (`supabase.auth`).
- **Ergebnis-/Quoten-Job:** Ergebnisse landen serverseitig in `matches.result`
  (Roadmap Punkt 6: echte Quoten-API, Key nur serverseitig).

## Anmeldung auf dem Handy: Code statt Link (07.08.2026)

🔴 **Der Magic-Link funktioniert in der App auf dem Home-Bildschirm nicht** —
und das ist kein Fehler im Code, sondern wie iOS es baut: eine zum
Home-Bildschirm hinzugefügte Web-App bekommt einen EIGENEN Speicher, getrennt
von Safari. Die Mail-App öffnet den Link in Safari, dort ist man danach
angemeldet — die App-Kachel bleibt abgemeldet.

Deshalb gibt es beide Wege: den Link (bequem am Rechner) und ein Feld in der
App (`verifyCode` in `AuthProvider`, Eingabefeld in `AuthBar`). Damit verlässt
man die App nie.

### 🔴 Was in dieses Feld gehört — und warum nicht der Code (geprüft 08.08.2026)

Das Feld nimmt **zweierlei**: sechs Ziffern, oder den **kopierten Link** aus
der Mail. Welches, entscheidet `leseAnmeldung` (`src/lib/anmeldung.js`).

**Der Code ist derzeit nicht zu haben, und das ist keine vergessene
Einstellung.** Um ihn in die Mail zu bekommen, müsste unter Authentication →
Emails → „Magic Link" `{{ .Token }}` im Text stehen — und **Supabase lässt die
Vorlagen auf dem Gratis-Tarif nicht bearbeiten**: über dem Formular steht
„Set up custom SMTP to edit templates". Die Anleitung, die hier früher stand,
war damit undurchführbar.

**Der Link tut es genauso**, weil derselbe Token darin steckt:

```
https://<projekt>.supabase.co/auth/v1/verify
  ?token=pkce_abc123…&type=magiclink&redirect_to=https://…
```

`verifyOtp({ token_hash, type })` nimmt ihn entgegen. In der App: Link in der
Mail **gedrückt halten → „Link kopieren"** → einsetzen.
⚠️ Nicht antippen — der Link gilt einmal, und ein Antippen öffnet Safari statt
der App.

⚠️ Drei Dinge, die `leseAnmeldung` deshalb kann und die niemand wegkürzen
sollte: `type` wird aus dem Link ÜBERNOMMEN (`magiclink` vs. `signup` — mit dem
falschen Typ lehnt `verifyOtp` einen gültigen Token ab), `token` UND
`token_hash` werden gelesen (die Schreibweise hängt an der Supabase-Version),
und angehängte Klammern/Umbrüche der Mail-Programme fliegen weg.

### 📧 Eigener SMTP-Versand — LAUNCH-Blocker

Der eingebaute Mailversand von Supabase ist für die Entwicklung gedacht und
mengenbegrenzt. Vor der ersten Runde mit echten Mitspielern: Rate Limits im
Dashboard nachsehen und testen, ob eine Mail an eine Adresse **außerhalb des
Supabase-Teams** ankommt. Details in `design/roadmap.md`.
Mit eigenem SMTP werden die Vorlagen bearbeitbar — dann kann der sechsstellige
Code doch noch in die Mail, das Eingabefeld kann ihn längst.
