import { describe, it, expect } from "vitest";
import {
  TOP_16, TOP_BL, TOP_PL, TOP_PD, TOP_SA, ZUSCHNITT, BL_ABSTIEGSKAMPF,
  creatorRegeln, privatRegeln,
  CREATOR_ROUND_ID, PRIVAT_ROUND_ID,
} from "./testrunden";
import { vereineVon, alleMatches } from "./ligen";
import { filterSpiele } from "./spielauswahl";
import { vereineAusToepfen, vereineAusLigen } from "./lostoepfe";
import { pruefe } from "./reglerWarnung";
import { greiftNicht } from "./greiftNicht";
import { createMockStore } from "./store.mock";

// ============================================================
//  ANDIS ZWEI TEST-RUNDEN (27.08.2026)
//
//  🔴 Was hier wirklich schiefgehen kann, ist NICHT die Rechnung, sondern ein
//  TIPPFEHLER IN EINEM VEREINSNAMEN. Der Filter vergleicht Zeichenketten: aus
//  „Atletico Madrid" statt „Atlético Madrid" wird kein Fehler, sondern ein
//  Verein, der still fehlt -- und die Runde ist um 35 Spiele kleiner, ohne
//  dass irgendwo etwas rot wird.
//
//  ⚠️ Deshalb steht der Namens-Test ganz oben und prueft JEDEN Namen gegen den
//  echten Katalog.
// ============================================================

describe("Die Vereine gibt es wirklich", () => {
  const gegen = [[TOP_BL, "bl"], [TOP_PL, "pl"], [TOP_PD, "pd"], [TOP_SA, "sa"]];

  it("🔴 jeder Name steht so im Katalog", () => {
    for (const [liste, liga] of gegen) {
      const katalog = new Set(vereineVon(liga));
      const fehlend = liste.filter((v) => !katalog.has(v));
      expect(
        fehlend,
        `Diese Namen gibt es in ${liga.toUpperCase()} nicht -- der Filter waehlt sie still nicht aus:\n${fehlend.join("\n")}`,
      ).toEqual([]);
    }
  });

  it("vier je Liga, sechzehn insgesamt, keine Doppelten", () => {
    for (const [liste] of gegen) expect(liste).toHaveLength(4);
    expect(TOP_16).toHaveLength(16);
    expect(new Set(TOP_16).size).toBe(16);
  });
});

describe("Der Zuschnitt trifft, was er treffen soll", () => {
  const alle = alleMatches();
  const spiele = filterSpiele(alle, creatorRegeln().spiele);

  it("🔴 die Runde ist nicht leer und nicht der ganze Katalog", () => {
    // Gemessen 27.08.2026: 669 von 1942. Beides waere ein Fehler -- 0 hiesse
    // „Filter trifft nichts", 1942 hiesse „Filter greift nicht".
    // Gemessen 27.08.2026: 629 von 1942 (mit der CL-Lostopf-Regel).
    // Gemessen 27.08.2026 abends: 665 -- die 2. Liga traegt seit der
    // Korrektur am Aufstiegskampf 36 Spiele bei statt null.
    expect(spiele.length).toBeGreaterThan(400);
    expect(spiele.length).toBeLessThan(900);
  });

  it("nur die gewaehlten Wettbewerbe", () => {
    const drin = new Set(spiele.map((m) => m.wettbewerb));
    for (const w of drin) expect(ZUSCHNITT.wettbewerbe).toContain(w);
  });

  it("in jedem LIGA-Spiel steht mindestens einer der Sechzehn", () => {
    // ⚠️ `teamModus: "einer"` -- gemessen: „nur untereinander" waeren 70 Spiele
    // in einer ganzen Saison. Das ist kein Tippspiel, das ist ein Turnier.
    // 🔴 ZWEI Wettbewerbe sind ausgenommen, und beide aus demselben Grund:
    // sie tragen eine eigene ABWEICHUNG in `jeWettbewerb` und folgen damit
    // nicht der runden-weiten Vereinsliste.
    //   • CL   -- die Lostopf-Regel (ein Topf-2-Verein im Achtelfinale
    //                gehoert dazu, auch wenn er keiner der Sechzehn ist).
    //   • BL2  -- der Aufstiegskampf ueber die letzten vier Spieltage. Dort
    //                steht `teams: []`, weil die Top-16 nicht in der 2. Liga
    //                spielen; genau deshalb darf hier keiner von ihnen stehen.
    const top = new Set(TOP_16);
    const eigeneRegel = new Set(Object.keys(creatorRegeln().spiele.jeWettbewerb ?? {}));
    const ohne = spiele
      .filter((m) => m.wettbewerb !== "cl" && !eigeneRegel.has(m.wettbewerb))
      .filter((m) => !top.has(m.home) && !top.has(m.away));
    expect(ohne.map((m) => `${m.home}-${m.away}`)).toEqual([]);
  });

  it("🔴 die Champions League folgt der LOSTOPF-Regel, nicht der Vereinsliste", () => {
    // Andi, 27.08.2026: „nur die von Lostopf 1 und sonst noch deutsche
    // Mannschaften von CL statt alle!, sowie alle Finalsspiele mit Beteiligung
    // von Mannschaften der Lostoepfe 1 + 2".
    // Gemessen: 85 von 159 -- vorher waren es 125 ueber die Vereinsliste.
    const cl = spiele.filter((m) => m.wettbewerb === "cl");
    expect(cl).toHaveLength(85);
  });

  it("alle K.-o.-Spiele der CL sind dabei", () => {
    const ko = spiele.filter((m) => m.wettbewerb === "cl" && m.phase && m.phase !== "liga");
    // 8 + 4 + 2 + 1 = 15
    expect(ko).toHaveLength(15);
  });

  it("⚠️ ein CL-Spiel OHNE Topf-1- oder deutsche Beteiligung faellt in der Ligaphase raus", () => {
    const drin = new Set([...vereineAusToepfen("cl", [1]), ...vereineAusLigen("cl", ["bl"])]);
    const liga = spiele.filter((m) => m.wettbewerb === "cl" && m.phase === "liga");
    for (const m of liga) {
      expect(drin.has(m.home) || drin.has(m.away), `${m.home}-${m.away}`).toBe(true);
    }
  });

  it("🔴 die 2. Bundesliga traegt die letzten vier Spieltage bei", () => {
    // 🔴 Der Befund, an dem diese Fassung entstanden ist -- und er ist der
    // Grund, warum hier eine Korrektur steht statt der ersten Idee: von 1942
    // Spielen tragen 0 einen Tabellenplatz. `tabellenPlatz` entsteht erst beim
    // OEFFNEN eines Spieltags (`spieltagOeffnen.js`).
    //
    // ⚠️ Die erste Fassung schnitt den Aufstiegskampf ueber die Tabellenzone
    // 1-6 zu und waehlte damit NULL Spiele aus: die 2. Liga stand in der
    // Wettbewerbs-Liste, ohne ein einziges Spiel beizutragen. Jetzt sind es
    // schlicht die letzten vier Spieltage -- und die SIND der Aufstiegskampf.
    //
    // ⚠️ Der Test haelt beides fest: dass es die Tabellenplaetze im rohen
    // Katalog wirklich nicht gibt (sonst waere die Korrektur unnoetig gewesen)
    // und dass die Liga jetzt etwas beitraegt.
    const mitPlatz = alle.filter((m) => m.snapshot?.tabellenPlatz);
    expect(mitPlatz).toHaveLength(0);

    const bl2 = spiele.filter((m) => m.wettbewerb === "bl2");
    expect(bl2.length, "die 2. Liga traegt nichts bei").toBeGreaterThan(0);
    expect(creatorRegeln().spiele.jeWettbewerb.bl2.spieltagVon).toBe(31);
    expect(creatorRegeln().spiele.jeWettbewerb.bl2.zonen).toBeUndefined();
    for (const m of bl2) {
      expect(m.matchday, `${m.home}-${m.away}`).toBeGreaterThanOrEqual(31);
    }
  });

  it("die Abstiegskampf-Fassung liegt bereit, falls Andi sie will", () => {
    // ⚠️ „Top-4 der Bundesliga" UND „Abstiegskampf" gehen in DERSELBEN Liga
    // nicht zusammen: alle Einschraenkungen wirken UND-verknuepft, und die
    // Top-4 stehen nicht auf Platz 14-18.
    expect(BL_ABSTIEGSKAMPF.zonen).toEqual([{ von: 14, bis: 18 }]);
    expect(BL_ABSTIEGSKAMPF.spieltagVon).toBe(31);
    expect(BL_ABSTIEGSKAMPF.teams).toEqual([]);
  });
});

describe("Die Regeln, die Andi genannt hat", () => {
  it("Champions League mit Faktor 1,2", () => {
    for (const r of [creatorRegeln(), privatRegeln()]) {
      expect(r.wettbewerbe.enabled).toBe(true);
      // ⚠️ `aufschlaege` ist der AUFSCHLAG, nicht der Faktor: 0,2 ergibt x1,2.
      expect(r.wettbewerbe.aufschlaege.cl).toBeCloseTo(0.2, 5);
    }
  });

  it("Derby-Regel -- und sie hat im Katalog auch etwas zu treffen", () => {
    for (const r of [creatorRegeln(), privatRegeln()]) {
      expect(r.teamMods.derbyFaktor).toBeCloseTo(1.2, 5);
    }
    // 🔴 Die Gegenprobe: eine Derby-Regel ohne Derbys waere ein Regler ins
    // Leere. Gemessen 84 Spiele mit Label, deutsche darunter.
    const mitDerby = alleMatches().filter((m) => m.snapshot?.derby);
    expect(mitDerby.length).toBeGreaterThan(50);
    const deutsch = mitDerby.filter((m) => /Derby/.test(String(m.snapshot.derby)));
    expect(deutsch.length).toBeGreaterThan(20);
  });
});

describe("Die zwei Listen unterscheiden sich in dem, worauf es ankommt", () => {
  const gross = creatorRegeln();
  const klein = privatRegeln();

  it("🔴 die grosse Runde hat KEINE Fremdjoker", () => {
    // Andis Vorgabe -- und sein eigener Grund: bei vielen Mitspielern wird es
    // unuebersichtlich, wer wen blockiert.
    expect(gross.duell.enabled).toBe(false);
    expect(gross.eingriffe.enabled).toBe(false);
  });

  it("die kleine Runde hat sie -- und dosiert", () => {
    expect(klein.duell.enabled).toBe(true);
    expect(klein.eingriffe.enabled).toBe(true);
    // ⚠️ Wer oefter getroffen wird, spielt gegen die Mitspieler statt gegen
    // die Quoten. Zwei Einsaetze in der Saison, hoechstens einer je Spieltag.
    expect(klein.duell.anzahl).toBeLessThanOrEqual(3);
    expect(klein.duell.proSpieltag).toBe(1);
  });

  it("die grosse Runde stimmt nicht ab -- 1000 Leute stimmen nicht ab", () => {
    expect(gross.regelAbstimmung.enabled).toBe(false);
    expect(klein.regelAbstimmung.enabled).toBe(true);
  });

  it("beide Raeder laufen, aber verschieden oft", () => {
    expect(gross.drehrad.enabled).toBe(true);
    expect(klein.drehrad.enabled).toBe(true);
    // Gross: drei Termine in der Saison. Jede Drehung ist dort 1000
    // Gutschriften -- haeufiger waere kein Ereignis mehr, sondern ein
    // Grundeinkommen.
    expect(gross.drehrad.haeufigkeit).toBe("gesamt");
    expect(gross.drehrad.gesamtProSaison).toBeLessThanOrEqual(4);
    expect(klein.drehrad.haeufigkeit).toBe("frequenz");
  });

  it("beide Raeder haben Regelbeziehungen, nicht nur Felder", () => {
    // 🔴 Sonst waere das Rad eine Liste und kein Baukasten.
    for (const r of [gross, klein]) {
      expect(r.drehrad.ausschluesse.length).toBeGreaterThan(0);
      for (const x of r.drehrad.ausschluesse) {
        const ids = r.drehrad.felder.map((f) => f.id);
        expect(ids, "ein Ausschluss zeigt ins Leere").toContain(x.a);
        expect(ids).toContain(x.b);
      }
    }
  });

  it("beide haben Ereignisse, und jedes traegt eine Wirkung", () => {
    for (const r of [gross, klein]) {
      expect(r.ereignisse.enabled).toBe(true);
      expect(r.ereignisse.aktive.length).toBeGreaterThanOrEqual(2);
      for (const a of r.ereignisse.aktive) expect(a.wirkung?.typ, a.key).toBeTruthy();
    }
  });
});

describe("Die Gegenproben, die CLAUDE.md verlangt", () => {
  it("🔴 `reglerWarnung` schweigt bei BEIDEN", () => {
    // ⚠️ Vor dem Nachziehen der Grundwertung waren es vier bzw. fuenf
    // Warnungen -- alle um dieselbe Sache: ein falscher Tipp kostete nichts,
    // und weit danebenliegende Tipps zahlten noch. Eine Runde, in der Raten
    // sich lohnt, ist keine Tipprunde.
    for (const [name, r] of [["Creator", creatorRegeln()], ["Privat", privatRegeln()]]) {
      const w = pruefe(r);
      expect(w.map((x) => x.titel ?? x.id), `${name}: ${w.length} Warnungen`).toEqual([]);
    }
  });

  it("🔴 `greiftNicht` schweigt bei BEIDEN", () => {
    // ⚠️ Hier stand bis zum Abend des 27.08.2026 die Erwartung, der Bericht
    // melde GENAU einen Fund: die 2. Bundesliga, die keine Spiele beitraegt.
    // Der Fund war echt -- nur war er kein Merkposten, sondern ein Fehler in
    // DIESER Datei. Er ist behoben (siehe den Test zur 2. Liga oben), also hat
    // der Bericht auch nichts mehr zu melden.
    //
    // 🔴 Die Lehre, weil sie groesser ist als der Fall: `greiftNicht` ist ein
    // BERICHT fuer den Admin, kein Test. Er faellt nicht durch, er sagt etwas.
    // Wer seine Meldung in einer Test-Erwartung einfriert, macht aus einem
    // Hinweis einen Sollzustand -- und genau das war hier passiert.
    const alle = alleMatches();
    for (const [name, r, n] of [["Creator", creatorRegeln(), 1000], ["Privat", privatRegeln(), 20]]) {
      const spiele = filterSpiele(alle, r.spiele);
      const funde = greiftNicht(r, { matches: spiele, mitglieder: n });
      expect(funde.map((f) => f.key), `${name}: ${funde.map((f) => f.text).join(" | ")}`).toEqual([]);
    }
  });
});

describe("Beide Runden sind im Store erreichbar", () => {
  it("liegen da und tragen ihren eingefrorenen Zuschnitt", async () => {
    const store = createMockStore();
    for (const id of [CREATOR_ROUND_ID, PRIVAT_ROUND_ID]) {
      const runde = await store.getRound(id);
      expect(runde, id).toBeTruthy();
      // 🔴 `spiele` eingefroren -- ohne das zaehlte die Runde 1942 Spiele
      // statt 669 (der Fund vom 09.08.2026, siehe schema.sql).
      expect(runde.spiele?.teams).toEqual(TOP_16);
      const spiele = await store.listRoundMatches(id);
      expect(spiele.length).toBeGreaterThan(400);
    }
  });
});
