# Arbeitsweise — Grundsätze im Langtext

**Ausgelagert aus `CLAUDE.md` am 21.08.2026.** Beides sind Grundsätze, die
beim BAUEN gelten — nicht Sätze, die in jeder Antwort präsent sein müssen.
Die Kurzfassungen stehen weiterhin in `CLAUDE.md`.

🔴 **Inhaltlich unverändert** — keine Zeile gestrichen, nur verschoben.

### 🔴 Der Baukasten-Grundsatz (Andi, 02.08.2026)

**Maximale Individualisierung, wenn man sie will — und ein guter Vorschlag,
wenn nicht.** Drei Dinge gelten für JEDE neue Einstellung:

1. **Regler UND Zahleneingabe.** Der Regler ist zum Fühlen, das Feld zum
   Treffen. Wer 1,15 einstellen will, soll es tippen können statt zu zielen.
   Nicht entweder/oder — beides, nebeneinander.
2. **Immer ein empfohlenes Preset dazu.** Jeder Bereich hat unsere kuratierten
   Voreinstellungen, und die sollen später *die bekannten, ausgewogenen* sein,
   auf die man sich beruft. Sie müssen jederzeit abrufbar bleiben, auch nachdem
   jemand alles verstellt hat.
3. **Eine Einstellung, die ins Leere läuft, ist kein Baukastenteil.** Wenn der
   Regler auf Spieltag 12 steht, muss der Joker an Spieltag 12 existieren. Das
   ist keine Balance-Frage, sondern die Mindestanforderung.

⚠️ **Balance ist NICHT unser Job — Vollständigkeit ist es.** Empfehlungen zu
Stärke, Häufigkeit und Kombination kommen später, wenn das Gehäuse steht. Wenn
ein Admin sich eine kaputte Runde bauen will, soll er das dürfen. Was geprüft
wird, ist ob die Einstellung GREIFT, nicht ob sie klug ist.

🔴 **Und deshalb beantwortet `balanceSim.js` die falsche Frage, solange gebaut
wird.** „Gewinnt der Kenner?" ist eine Aussage über EIN Regelwerk — sie gilt
nach der nächsten Mechanik nicht mehr und muss neu gemessen werden. Das ist
Arbeit, die sich selbst auffrisst; sie ist in dieser Sitzung mehrfach gemacht
und mehrfach wertlos geworden. Die Frage, die trägt, ist die andere:
**SIEHT der Simulator die Ebene überhaupt?** Wenn eine neue Mechanik seine
Kennzahlen nicht bewegt, ist sie nicht angeschlossen — das ist ein
Vollständigkeits-Befund und bleibt gültig, egal wie die Runde später
eingestellt wird. Balance-Zahlen erst am Ende, mit Beispielparametern je
Admin-Einstellung (Andi, 05.08.2026).

#### 🔴 Die zweite Hälfte: Tiefe UND Einfachheit (Andi, 05.08.2026)

Der Grundsatz oben wird gern als „möglichst viele Regler" gelesen. **Das ist nur
die halbe Ansage.** Beides gilt gleichzeitig, für JEDE Einstellung:

- **Nach unten offen.** Wer in die Tiefe will, findet jeden Einzelwert.
- **Nach oben verdeckt.** Wer nicht will, sieht ihn nie und bekommt trotzdem
  eine stimmige Runde.

Der Mechanismus dafür ist **gebaut und darf nicht umgangen werden**: die drei
Komplexitätsstufen (`charaktere.js` → Stufe 1, `einfachRegler.js` → Stufe 2,
Profi-Ansicht → Stufe 3). Sie sind eine ANSICHT auf dasselbe `rules`-Objekt,
kein zweites Datenmodell — beim Wechsel geht nichts verloren.

**Für jede neue Einstellung heißt das drei Fragen, in dieser Reihenfolge:**

1. **Kommt sie in Stufe 1 überhaupt vor?** Meist nein — dann muss ein
   Runden-Charakter sie sinnvoll mitsetzen, ohne sie zu zeigen.
2. **Wenn sie in Stufe 2 gehört: unter welchem KLARTEXT-Regler?** Nicht der
   Feldname, sondern die Frage, die ein Spieler stellt („Wie viel soll nebenbei
   passieren?"). Ein Regler in Stufe 2 fasst oft mehrere Profi-Werte zusammen.
3. **In Stufe 3: Regler, Zahlenfeld, Preset und Live-Vorschau** — was der Wert
   konkret bewirkt, in einem Satz.

⚠️ **Eine Einstellung, die nur in Stufe 3 auftaucht und in Stufe 1/2 gar nicht
vorkommt, ist nicht fertig.** Sie zwingt jeden, der sie nutzen will, in die
Profi-Ansicht — genau davor sollen die Stufen schützen. Gehört sie wirklich nur
ins Profi-Gehäuse, ist das ausdrücklich zu BEGRÜNDEN, statt sie stillschweigend
dort abzulegen.

**Die Live-Vorschau ist kein Komfort, sondern die Betreuung.** „50 % Mischung"
sagt niemandem etwas, „ein einzelner Tipp verschiebt eine Quote um 0,24 %"
schon. Dieselbe Rolle haben `anteile()` bei den Wettbewerbs-Gewichten und
`beschreibeSaisonform()` / `beschreibeTippEinfluss()` bei ihren Modulen — dort
abschauen, statt Neues zu erfinden.


### 📋 Anweisungen an Andi IMMER Schritt für Schritt (Andi, 07.08.2026)

**Jede Handlungsanweisung an den Nutzer wird als nummerierte Schrittfolge
geschrieben — nie als Nebensatz im Fließtext.** Andi arbeitet an mehreren
Stellen gleichzeitig (Vercel, Supabase, GitHub, ZWEI Arbeitskopien auf der
Platte, mehrere Branches). Ein Satz wie „führ die Datei im SQL-Editor aus"
setzt voraus, dass er weiß, WELCHE Datei, in WELCHER Version, an WELCHEM Ort —
und genau das ist mehrfach schiefgegangen.

**Zu jeder Anweisung gehören verbindlich:**

1. **Der vollständige Pfad**, nicht der Dateiname: `C:\Dev\Tippquotenspiel\…`
   ⚠️ Es gibt eine ZWEITE, veraltete Arbeitskopie unter
   `C:\Users\andit\OneDrive\Tippprojekt\Tippquotenspiel` — ohne vollen Pfad
   landet er womöglich dort.
2. **Der Branch bzw. Commit**, sobald es über GitHub geht. Der aktuelle Stand
   liegt oft NICHT auf `main`.
3. **Wo genau geklickt wird** — Menüpunkt für Menüpunkt, mit den Namen, die
   auf den Knöpfen stehen.
4. **Eine Gegenprobe zum Schluss**: woran erkennt er, dass es geklappt hat?
   Eine Anweisung ohne Erfolgskontrolle endet damit, dass er nachfragen muss.

**🔴 Der Standard-Weg, eine Datei zu öffnen oder zu kopieren: der BROWSER.**
Andi hat ihn am 07.08.2026 ausdrücklich als Vorgabe gesetzt, nachdem drei
andere Wege zu lang waren.

```
file:///C:/Dev/Tippquotenspiel/<pfad>
```
in die Adresszeile, **Strg+A**, **Strg+C**. Zwei Schritte, fertig.

⛔ **Nicht** anbieten, solange der Browser reicht: Explorer mit Rechtsklick
(„Öffnen mit …", „ausgeblendete Elemente einblenden"), Notepad über
Windows+R, `Get-Content | Set-Clipboard` in PowerShell. Alle drei sind länger
und haben je einen Schritt, an dem es hakt — beim Rechtsklick die Frage, WO
man klickt; bei `Set-Clipboard` die fehlende Ausgabe, die wie ein Fehler
aussieht.

⚠️ Für Befehle bleibt PowerShell natürlich der Weg — es geht hier nur ums
ANSEHEN und KOPIEREN von Dateien.

⚠️ **Wegwerf-Dateien ausdrücklich als solche benennen.**
`supabase/_quoten-update.sql` ist nach dem nächsten Abruf veraltet; wer sie
später noch einmal ausführt, schreibt alte Quoten über neue — ohne
Fehlermeldung. Bei jeder Anweisung dazusagen, ob die Datei bleibt oder weg kann.

