import { describe, it, expect } from "vitest";
import { QUOTEN } from "@/lib/quoten";
import { alleMatches } from "@/lib/ligen";

// ============================================================
//  Kommen die geholten Quoten auch WIRKLICH im Katalog an?
//
//  Am 29.07. lagen `quoten/pl.js`, `pd.js` und `sa.js` korrekt auf der Platte
//  — und der Katalog benutzte sie trotzdem nicht. Zwei Lücken auf einmal:
//  `quoten/index.js` behauptete in seinem Kopf, erzeugt zu werden, wurde aber
//  von nichts geschrieben; und die drei Ligadateien reichten `quoten` gar nicht
//  an `baueLiga` durch. Beides schlug NICHT fehl, es passierte nur nichts.
//
//  Ein bezahlter Abruf, der wirkungslos verpufft, ist die teuerste Art von
//  stillem Fehler. Diese Tests schlagen an, sobald eine Liga dazukommt und
//  jemand die Verdrahtung vergisst.
// ============================================================

const katalog = alleMatches();

describe("Echte Quoten landen im Katalog", () => {
  it("es gibt überhaupt Quoten-Dateien", () => {
    expect(Object.keys(QUOTEN).length).toBeGreaterThan(0);
  });

  for (const [key, spiele] of Object.entries(QUOTEN)) {
    describe(`${key}`, () => {
      const ausLiga = katalog.filter((m) => m.wettbewerb === key);

      it("der Wettbewerb existiert im Katalog", () => {
        expect(ausLiga.length).toBeGreaterThan(0);
      });

      // Klubnamen müssen übersetzt sein (`klubnamen.js`), sonst hängen die
      // Quoten am falschen oder an gar keinem Spiel.
      it("die Paarungen der Quoten kommen im Katalog vor", () => {
        if (!spiele.length) return;
        const paare = new Set(ausLiga.map((m) => `${m.home}|${m.away}`));
        const treffer = spiele.filter((s) => paare.has(`${s.home}|${s.away}`));
        expect(treffer.length).toBe(spiele.length);
      });

      // Der eigentliche Punkt: die Verdrahtung in der Ligadatei. Ohne
      // `quoten: QUOTEN.<key>` in `baueLiga` passieren die Daten den Katalog
      // spurlos.
      it("die Snapshots sind daraufhin auch als api markiert", () => {
        if (!spiele.length) return;
        const api = ausLiga.filter((m) => m.snapshot?.quelle === "api");
        expect(api.length).toBe(spiele.length);
      });

      // Seit dem Torschnitt aus dem Markt: wo eine Über/Unter-Linie geholt
      // wurde, muss sie auch benutzt werden.
      it("ein geholter Torschnitt wird auch verwendet", () => {
        const mitTotal = spiele.filter((s) => s.total > 0);
        if (!mitTotal.length) return;
        const gemessen = ausLiga.filter((m) => m.snapshot?.torschnittQuelle === "totals");
        expect(gemessen.length).toBe(mitTotal.length);
      });

      // Die echten 1X2-Quoten dürfen unterwegs nicht verändert werden — sie
      // sind Marktpreis, keine Schätzung.
      it("die 1X2-Quoten bleiben exakt die des Marktes", () => {
        for (const s of spiele) {
          const m = ausLiga.find((x) => x.home === s.home && x.away === s.away);
          if (!m) continue;
          expect(m.snapshot.winner.home).toBeCloseTo(Number(s.odds.home), 5);
          expect(m.snapshot.winner.draw).toBeCloseTo(Number(s.odds.draw), 5);
          expect(m.snapshot.winner.away).toBeCloseTo(Number(s.odds.away), 5);
        }
      });
    });
  }
});
