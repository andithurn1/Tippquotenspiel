# Tippspiel — Fußball-MVP (Übergabe-Paket)

Quoten-gewichtetes Tippspiel unter Freunden. Belohnt mutige Tipps über echte
Quoten statt fester Punkte. Kein Echtgeld — Ehre + kleines Wichtelgeschenk.
Ziel: gesunder, spielerischer Ersatz zum Echtgeld-Wetten.

**Launch-Fenster:** vor Bundesliga-Start (28.08.2026).

---

## Projekt-Setup (Next.js + React)

```bash
npm install     # Abhängigkeiten
npm run dev     # Entwicklung → http://localhost:3000
npm test        # Engine-Tests (Vitest)
npm run build   # Produktions-Build
```

- `src/lib/engine.js` — das „Gehirn": reine Logik, kein UI. **Die eine Quelle
  für alle Screens** (von `engine.test.js` abgesichert).
- `src/components/Tippabgabe.jsx` — Tipp abgeben (Ergebnis + Tore je Team), friert Snapshot-Quote ein.
- `src/components/Abrechnung.jsx` — animiertes Öffnungsfenster: Spieltag-Abrechnung mit Punkte-Zähler.
- `src/components/AuszahlungsExplorer.jsx` — zeigt für jeden möglichen Endstand die Auszahlung (Heat-Grid).
- `src/app/` — Routen: `/` (Übersicht), `/tippen`, `/abrechnung`, `/explorer`.

✅ **Bau-Schritt 1 erledigt:** Alle Screens rechnen über `engine.js`, die
Logik-Kopien sind entfernt. Quoten kommen aus `createMockOddsSource()` —
diese eine Stelle wird später gegen die echte API getauscht.

---

## MVP-Umfang (die ~9 Wochen bis Launch)

**Drin — nur Fußball, nur Core:**
- Ergebnis-Tipp (leitet Sieger, Abstand, Nähe automatisch ab)
- Anytime-Torschütze + Doppelpack (gleicher Spieler 2×), „keiner" erlaubt
- Snapshot-Quoten (eine Quote für alle, gilt bis Anpfiff)
- Scoring: `max(Ebenen)` + Kombi-Multiplikator, siegerunabhängige Team-Tore-Nähe
- Punkte-Skalierung (Faktor, schöne hohe Zahlen), Ranking (echte / fair verschoben)
- Spielerstellung: Admin stellt Regelwerk ein, teilt es per Creator-Code
- Backend: Nutzer, Tipps, Leaderboard (einfach)
- Quoten-Anbindung: erst Mock, dann ein günstiger/Gratis-Test-Key

**Bewusst NACH dem Launch (Expansion):**
- Ecken (gesamt & pro Team), Schüsse aufs Tor — als admin-schaltbare Märkte
- Ballbesitz — Sonderfall: keine Buchmacher-Quote → synthetische Hausquote
- Andere Sportarten (z. B. Basketball „20+ Punkte") + internationale Ligen
- 24-h-Durchschnittsquote als Alternative zum Snapshot

---

## Architektur-Prinzipien (nicht brechen)

1. **Logik vs. UI trennen.** `engine.js` bleibt UI-frei. Screens sind nur „Haut".
2. **Quoten-Quelle ist austauschbar.** Mock → echte API = eine Stelle im Code.
   API-Key NIE ins Frontend — gehört auf einen Server.
3. **Märkte sportart-neutral modellieren.** Ein Markt = `{ sportart, typ,
   ankerQuote, auswertungs-statistik }`. Dann rutscht Basketball etc. später
   ohne Engine-Umbau rein. (Wichtigste kostenlose Zukunftssicherung.)
4. **Anker immer auf der Quote des REALEN Ergebnisses.** Nie auf dem getippten
   → macht die Nähe-Belohnung unfarmbar.

---

## Datenanbieter-Plan (kommerzielles Gleis)

- **Entwicklung:** Mock (0 €) → dann günstig testen. API-Football (Statistik,
  Aufstellungen, Tor-Events) + Gratis-Odds-Tier. Ziel: 0–40 €/Monat, kündbar.
- **Launch/Skalierung:** Enterprise-Rahmenvertrag erst bei Erlös. Für multi-sport
  + international + EU-Buchmacher: LSports (EU) oder OpticOdds.
- **Prüfen vor Vertrag:** Lizenz zum Anzeigen der Quoten in einer Endkunden-App;
  „Ecken pro Team" & „Doppelpack" sind dünnere Märkte (nicht bei jedem Anbieter).

---

## Offene strategische Weichen (vor Skalierung klären)

- **Glücksspiel-Abgrenzung** — entscheidet über App-Store-Zulassung. Kein Echtgeld,
  kein Cash-out, keine eskalierenden Einsätze. Werbung NIE Glücksspielwerbung.
- **Rechtsform** — kommerziell gewählt (Gewinn gehört dir; Präventions-Fördertöpfe
  entfallen dafür). Games-Förderung des Bundes möglich, aber Glücksspiel ist dort
  ausgeschlossen → saubere Positionierung nötig.
- **Store-Konten:** Apple ~99 $/Jahr, Google ~25 $ einmalig.

---

## Nächste Schritte in der Bau-Umgebung (Claude Code)

1. ~~Projekt anlegen, mit GitHub verbinden.~~ ✅
2. ~~Dateien importieren.~~ ✅
3. ~~Screens an `engine.js` anschließen.~~ ✅ (+ Next.js-Setup, Engine-Tests, `CLAUDE.md`)
4. ~~Spielerstellungs-Screen bauen (Regler + Creator-Code).~~ ✅ (`/erstellen`, `sanitizeRules`)
5. Einfaches Backend (Nutzer / Tipps / Leaderboard) — Plan: Supabase.
6. Ganz zuletzt: echte Quoten-API mit Test-Key (Key nur serverseitig).
