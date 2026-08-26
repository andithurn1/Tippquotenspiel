# Die native App — Stand, Handgriffe, was noch fehlt

> Angelegt am 26.08.2026, als die Android-Hülle dazukam.
> Vorgeschichte: `design/roadmap.md`, Abschnitt „Native App".

---

## Was seit heute steht

Die App ist **keine Idee mehr, sondern ein Ordner**: `android/`. Darin liegt
ein vollständiges Android-Projekt, das die gebaute Oberfläche als eigene App
anzeigt — mit eigenem Symbol im App-Menü, ohne Adresszeile, ohne Browser.

| | |
|---|---|
| Technik | Capacitor 8.5.0 |
| App-ID | `de.quotentippspiel.app` |
| App-Name | QuotenTippspiel |
| Web-Ordner | `out/` (der statische Export) |
| Plattform | Android. iOS braucht einen Mac — später. |

🔴 **Die App-ID ist jetzt noch frei änderbar, nach dem ersten Hochladen in den
Play Store NIE WIEDER.** Sie ist dort der Schlüssel des Eintrags; eine andere
ID ist eine andere App, mit null Installationen und null Bewertungen. Wer sie
ändern will, tut es JETZT — in `capacitor.config.json`, danach einmal
`npx cap add android` neu.

---

## Die drei Kommandos

| Kommando | Wofür |
|---|---|
| `npm run dev` | **Der Alltag.** Ändert sich durch die App nichts. Browser, sofortiges Nachladen, wie bisher. |
| `npm run app:sync` | Baut `out/` und schiebt es in den Android-Ordner. Nur nötig, wenn du es auf einem echten Handy sehen willst. |
| `npm run app:oeffnen` | Öffnet den Android-Ordner in Android Studio. |

⚠️ `npm run build` (für Netlify) bleibt unverändert und ist von alldem
unberührt. Die beiden Builds stehen nebeneinander, siehe `next.config.mjs`.

---

## Die App aufs eigene Handy bringen — Schritt für Schritt

**Einmalig einzurichten:**

1. Öffne https://developer.android.com/studio im Browser.
2. Klicke auf den großen Knopf „Download Android Studio".
3. Setze den Haken bei den Bedingungen und lade die Datei herunter (rund 1 GB).
4. Starte die heruntergeladene Datei und klicke im Installationsfenster immer „Next", zuletzt „Install".
5. Starte Android Studio nach der Installation.
6. Beim ersten Start fragt ein Assistent nach Einstellungen — wähle „Standard" und klicke „Next", dann „Finish".
7. Warte, bis der Assistent fertig geladen hat (etwa 5 bis 15 Minuten). Danach siehst du das Startfenster „Welcome to Android Studio".

**Jedes Mal, wenn du den aktuellen Stand sehen willst:**

8. Öffne die Eingabeaufforderung im Projektordner `C:\Dev\Tippquotenspiel`.
9. Tippe `npm run app:sync` und drücke Enter.
10. Warte, bis unten `Sync finished` steht (etwa 1 Minute).
11. Tippe `npm run app:oeffnen` und drücke Enter. Android Studio öffnet sich mit dem Projekt.
12. Beim allerersten Öffnen lädt Android Studio unten rechts „Gradle sync" — das dauert 5 bis 20 Minuten und passiert nur einmal.

**Das Handy anschließen:**

13. Öffne am Handy „Einstellungen".
14. Tippe auf „Über das Telefon".
15. Tippe sieben Mal hintereinander auf „Buildnummer". Es erscheint „Du bist jetzt ein Entwickler".
16. Gehe zurück und öffne „System" → „Entwickleroptionen".
17. Schalte „USB-Debugging" ein und bestätige die Nachfrage mit „OK".
18. Verbinde das Handy per USB-Kabel mit dem Rechner.
19. Am Handy erscheint „USB-Debugging zulassen?" — tippe auf „Zulassen".

**Starten:**

20. Oben in Android Studio steht ein Auswahlfeld mit Gerätenamen. Wähle dort dein Handy aus.
21. Klicke daneben auf den grünen Pfeil („Run app").
22. Nach ein bis drei Minuten startet QuotenTippspiel auf dem Handy.

⚠️ Ab jetzt reicht für einen neuen Stand: Schritt 9, dann Schritt 21.

---

## Was in der App noch NICHT funktioniert

Ehrlich aufgelistet, weil eine Einschränkung, die niemand kennt, erlitten
statt entschieden wird:

| Was | Warum | Wann |
|---|---|---|
| **Anmelden per Magic-Link** | Der Link aus der Mail öffnet den Browser, nicht die App. Dafür braucht es einen „Deep Link" (Android App Link) und einen Eintrag in Supabase. | Schritt 5 |
| **Eigene API-Aufrufe** (Konto löschen, Spieltag öffnen) | Im Container zeigt `/api/…` ins Nichts. Der Build muss `NEXT_PUBLIC_API_BASIS` auf die Netlify-Adresse setzen — `npm run build:app` warnt am Ende, wenn sie fehlt. | sobald die Live-Adresse feststeht |
| **Push-Benachrichtigungen** | Die fünf Kanäle aus `notify.js` laufen bisher nur, solange die App offen ist. Echtes Push braucht Firebase. | Schritt 6 |
| **Eigenes App-Symbol** | Es steht noch das grüne Capacitor-Standardsymbol drin. | mit dem finalen Design |
| **Startbild (Splash)** | Capacitors Standardbild (480×320, elf Auflösungen unter `android/app/src/main/res/drawable-*`). Es ist also nicht leer — nur fremd. | mit dem finalen Design |
| **Spüren (Haptik) auf dem iPhone** | Die Mechanik steht (`src/lib/haptik.js`, Schalter im Konto), läuft aber über `navigator.vibrate` — die gibt es auf **Android**, auf **iOS nicht**, weder in Safari noch in einer WKWebView. Dort passiert bis dahin nichts, und die Einstellungs-Seite sagt es. | ein Handgriff, siehe unten |
| **iOS** | Braucht einen Mac für den Build. Der Code ist fertig dafür — `capacitor.config.json` trägt den `ios`-Block bereits. | wenn ein Mac da ist |

---

## Was die App am Code ändert: fast nichts

Gemessen am 26.08.2026:

```
Engine + Logik (src/lib)        45 668 Zeilen
Oberfläche (src/components)     22 637 Zeilen
zusammen                        68 305
davon an nativen Nahtstellen       349  →  0,5 %
```

**Während der Entwicklung ändert sich gar nichts.** Der Browser bleibt der
Arbeitsplatz, `npm run dev` bleibt die Schleife, neue Funktionen entstehen in
`src/lib` und `src/components` wie bisher. Der Android-Ordner wird nur
angefasst, wenn eine der sechs Zeilen oben drankommt.

---

## ⚠️ Eine Werkzeug-Falle, bevor sie zuschlägt

Nach einem frischen `git clone` fehlt der Ordner
`android/capacitor-cordova-android-plugins/`. Das ist **Absicht** — er steht in
Capacitors eigener `.gitignore`, weil er erzeugt wird. Android Studio bricht
den Gradle-Sync dann aber mit „project ':capacitor-cordova-android-plugins'
not found" ab, und das liest sich wie ein kaputtes Repo.

**Die Behebung ist ein Kommando:** `npm run app:sync`. Es legt den Ordner an.

Dasselbe gilt für `android/app/src/main/assets/public` (die 4,9 MB Web-Ausgabe)
und für `android/app/src/main/assets/capacitor.config.json` — alle drei sind
Build-Ausgabe, keiner davon gehört ins Repo.

---

## Der eine Handgriff für die Haptik auf dem iPhone

Wenn iOS drankommt, ist es genau eine Datei — `src/lib/haptik.js` ist als die
EINE Stelle gebaut, an der die App etwas spüren lässt (dieselbe Bauart wie
`getStore()` und die Quoten-Quelle).

1. Öffne die Eingabeaufforderung im Projektordner.
2. Tippe `npm install @capacitor/haptics` und drücke Enter.
3. Öffne `src/lib/haptik.js`.
4. Ersetze in `spuere()` den Aufruf `navigator.vibrate(...)` durch
   `Haptics.impact({ style: … })` bzw. `Haptics.notification({ type: … })`.
5. Passe `istMoeglich()` an: nativ ist es immer `true`.
6. Tippe `npm run app:sync` und drücke Enter.

⚠️ Erst ab diesem Schritt braucht die App eine **Store-Prüfung** — ein neues
Capacitor-Plugin ist einer der wenigen Fälle, in denen ein Live Update nicht
reicht (siehe `design/roadmap.md`, „Was kostet es NACH dem Umstieg").
