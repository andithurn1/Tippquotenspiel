"use client";
// ============================================================
//  TROPHÄENSCHRANK
//
//  Andis Ort: „Eingliederung dann bei meinem Account und Fanfarben" — beides
//  ist „das bin ich", im Gegensatz zu „so spielt meine Runde".
//
//  ── 🔴 Was der Schrank zeigt, und warum auch das Fehlende ──
//  Erspieltes groß, Offenes blass daneben. Ein Schrank, der nur zeigt, was man
//  hat, gibt keinen Grund weiterzuspielen — das ist der eigentliche Antrieb,
//  und deshalb steht bei jedem offenen Abzeichen die Bedingung dabei.
//
//  ── 🔴 Der Schein ist ANDIS Bauweise ──
//  Er liefert EIN rundes Logo je Abzeichen; die Stufe (Holz … Diamant) legt
//  DIESER Screen dahinter. Das spart 180 Bilder. Solange die PNGs fehlen,
//  steht der Anfangsbuchstabe im Kreis — der Schein wirkt trotzdem, und man
//  sieht beim Ablegen sofort, ob es passt.
//
//  ⚠️ **Es wird hier NICHTS gerechnet.** Welche Stufe erreicht ist, sagt
//  `abzeichen.js`; woher die Zahlen kommen, `abzeichenBilanz.js`. Ein Screen,
//  der selbst nachzählt, ist die zweite Wahrheit, vor der die Runden-Schicht
//  in CLAUDE.md warnt.
// ============================================================
import { useEffect, useMemo, useState } from "react";
import { C, MONO, SCHRIFT, RUND } from "@/lib/theme";
import BackLink from "@/components/BackLink";
import { useAuth } from "@/components/AuthProvider";
import { getStore } from "@/lib/store";
import { DEFAULT_RULES } from "@/lib/engine";
import { nachGruppen, STUFEN, bildPfad, scheinDeckkraft } from "@/lib/abzeichen";
import { bilanzAus, bilanzZusammen, bilanzAusUmfeld } from "@/lib/abzeichenBilanz";

// ── Ein Abzeichen als runde Scheibe ─────────────────────────
//
// ⚠️ Die Größe steht an EINER Stelle: erspielt und offen sind gleich groß.
// Das Offene kleiner zu zeichnen wäre bequem und falsch — man soll sehen, was
// man holen kann, nicht ahnen.
const SCHEIBE = 64;

function Scheibe({ a }) {
  const s = a.stufe;
  const bild = bildPfad(a.key);
  // 🔴 UMGEKEHRT gedacht, und zwar nach einer Messung im Browser. Die erste
  // Fassung zeigte das Bild und fiel per `onError` auf den Platzhalter zurück
  // — das Bild scheitert aber, BEVOR React seinen Handler angehängt hat
  // (Hydration), und dann feuert `onError` nie. Sichtbar war ein kaputtes
  // Bildsymbol in jedem der dreißig Kreise.
  //
  // Jetzt liegt der Platzhalter IMMER da, und das Bild deckt ihn erst ab,
  // wenn es wirklich geladen ist. Ein fehlendes Bild kann damit nichts mehr
  // kaputt machen — und genau das ist der Zustand, in dem dieser Screen die
  // nächsten Wochen leben wird, bis Andis PNGs da sind.
  const [bildDa, setBildDa] = useState(false);

  return (
    <div style={{ position: "relative", width: SCHEIBE, height: SCHEIBE, flexShrink: 0 }}>
      {/* 🔴 Der Schein. Er liegt HINTER dem Logo und ragt darüber hinaus —
          deshalb ist er größer als die Scheibe und sitzt negativ versetzt.
          Ohne Stufe gibt es ihn nicht: ein Schein hinter einem Abzeichen, das
          man nicht hat, verspräche etwas Erreichtes. */}
      {s && (
        <div aria-hidden style={{
          position: "absolute", inset: -8, borderRadius: "50%", pointerEvents: "none",
          // ⚠️ Die Deckkraft kommt aus `scheinDeckkraft` und ist NICHT hier
          // festgeschrieben: sie steigt mit dem Rang, sonst wirkt Platin
          // schwächer als Silber (im Browser gemessen).
          background: `radial-gradient(circle, ${s.schein}${scheinDeckkraft(s)} 0%, ${s.schein}33 58%, transparent 74%)`,
        }} />
      )}
      <div style={{
        position: "relative", width: SCHEIBE, height: SCHEIBE, borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: C.surface,
        border: `2px solid ${s ? s.rand : C.line}`,
        overflow: "hidden",
      }}>
        {/* Der Platzhalter. ⚠️ KEINE Deckkraft auf der ganzen Scheibe: die
            erste Fassung dimmte alles auf 0,38, und graue Schrift auf weißem
            Grund war damit unsichtbar. Zurückgenommen wird über die Farbe. */}
        <span aria-hidden style={{
          fontFamily: MONO, fontSize: "1.5rem", fontWeight: 700,
          color: s ? s.rand : C.text, opacity: s ? 1 : 0.5,
        }}>
          {a.label.slice(0, 1)}
        </span>
        {bild && (
          // ⚠️ Bewusst ein rohes `img` und kein `next/image`: die Datei DARF
          // fehlen. `onLoad` ist der einzige Weg, der auch dann stimmt, wenn
          // der Fehler vor der Hydration passiert.
          <img src={bild} alt="" width={SCHEIBE} height={SCHEIBE}
            onLoad={() => setBildDa(true)}
            style={{
              position: "absolute", inset: 0,
              width: "100%", height: "100%", objectFit: "cover",
              opacity: bildDa ? 1 : 0,
            }} />
        )}
      </div>
    </div>
  );
}

function Eintrag({ a }) {
  const s = a.stufe;
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "12px 0" }}>
      <Scheibe a={a} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.9375rem", fontWeight: 700, color: s ? C.text : C.muted }}>
            {a.label}
          </span>
          {s && (
            <span style={{
              fontFamily: MONO, fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: 1,
              color: s.rand,
            }}>{s.label}</span>
          )}
        </div>
        <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 3, lineHeight: 1.45 }}>
          {a.was}
        </div>

        {/* 🔴 Das eigentliche Antriebsmittel: was noch fehlt. Ohne diese Zeile
            ist der Schrank eine Vitrine; mit ihr ist er eine Liste. */}
        {a.naechste && (
          <div style={{ fontSize: "0.75rem", color: C.akzent, marginTop: 4 }}>
            Noch {a.naechste.fehlt} bis {a.naechste.stufe.label}
          </div>
        )}

        {/* ⚠️ Wann und wo — Andis Zuschnitt „je Konto, mit der Runde
            beschriftet". Steht nur da, wenn es wirklich bekannt ist; ein
            erfundenes Datum wäre schlimmer als keines. */}
        {a.erspielt && (a.am || a.rundenName) && (
          <div style={{ fontSize: "0.6875rem", color: C.muted, marginTop: 3 }}>
            {[a.am, a.rundenName].filter(Boolean).join(" · ")}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Trophaeenschrank() {
  const { user } = useAuth();
  const [bilanz, setBilanz] = useState({});
  const [laedt, setLaedt] = useState(true);

  // ⚠️ Über ALLE Runden des Nutzers, denn der Zuschnitt ist „je Konto".
  // Zusammengefasst wird in `bilanzZusammen` — und zwar dort und nicht hier,
  // weil Serien das Maximum nehmen statt sich zu addieren.
  useEffect(() => {
    let live = true;
    if (!user?.id) { setLaedt(false); return undefined; }
    (async () => {
      const store = getStore();
      const runden = await store.listRoundsForUser(user.id).catch(() => []);
      const teile = [];
      const mitgliederJeRunde = {};
      const stimmen = [];
      for (const r of (runden ?? [])) {
        if (!r?.id) continue;
        const eintraege = await store.getRoundEntries(r.id).catch(() => []);
        // ⚠️ Der Rang-Verlauf kommt aus dem Store und wird NICHT hier
        // nachgebaut: nur `scoreLeaderboardHistory` weiß, wie ein
        // Zwischenstand zustande kommt (Saisonform, Aufholhilfe,
        // Ereignis-Wirkungen, Duelle). Ohne ihn gäbe es Aufholjagd und
        // Letzten Helden nie.
        const verlauf = await store.getLeaderboardHistory(r.id).catch(() => null);
        teile.push(bilanzAus({
          eintraege: eintraege ?? [], userId: user.id, rules: r.rules ?? DEFAULT_RULES,
          verlauf,
        }));
        // ⚠️ Nur für die EIGENEN Runden nachladen. Die Mitgliederzahl fremder
        // Runden beantwortet keine Frage des Schranks, und jeder Aufruf kostet.
        if (r.admin_id === user.id) {
          mitgliederJeRunde[r.id] = await store.listMembers(r.id).catch(() => []);
        }
        const v = await store.listVotes({ roundId: r.id }).catch(() => []);
        for (const s of (v ?? [])) stimmen.push({ ...s, round_id: s.round_id ?? r.id });
      }
      // 🔴 Die Übernahmen stehen an den Presets, nicht an den Runden — ein
      // Code kann übernommen worden sein, ohne dass der Übernehmer je in einer
      // meiner Runden auftaucht. Genau deshalb ist es ein eigener Aufruf.
      const presets = await (store.listPresets?.({ limit: 200 }) ?? Promise.resolve([]))
        .catch(() => []);

      const umfeld = bilanzAusUmfeld({
        userId: user.id, runden: runden ?? [], mitgliederJeRunde, presets: presets ?? [], stimmen,
      });
      if (live) { setBilanz(bilanzZusammen([...teile, umfeld])); setLaedt(false); }
    })();
    return () => { live = false; };
  }, [user?.id]);

  const gruppen = useMemo(() => nachGruppen(bilanz), [bilanz]);
  const erspielt = gruppen.reduce((n, g) => n + g.abzeichen.filter((a) => a.erspielt).length, 0);
  const gesamt = gruppen.reduce((n, g) => n + g.abzeichen.length, 0);

  return (
    <div style={{
      minHeight: "100vh", background: C.ink, color: C.text, fontFamily: SCHRIFT,
      padding: "28px 16px", display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <BackLink href="/account" label="Mein Account" />
      <div style={{ width: "100%", maxWidth: "var(--tqs-schirm-breite)" }}>
        <div style={{ fontFamily: MONO, fontSize: "0.75rem", letterSpacing: 2, color: C.muted, textTransform: "uppercase" }}>
          Trophäenschrank
        </div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: "6px 0 4px" }}>
          {laedt ? "Wird geöffnet …" : `${erspielt} von ${gesamt}`}
        </h1>
        <p style={{ fontSize: "0.8125rem", color: C.muted, lineHeight: 1.5, marginTop: 0 }}>
          Abzeichen sammelst du über alle deine Runden hinweg. Sie bringen keine
          Punkte — sie sind zum Herzeigen.
        </p>

        {/* Die Stufen einmal erklärt. ⚠️ Aus `STUFEN` gelesen und nicht
            abgeschrieben: eine zweite Liste liefe irgendwann anders herum als
            die erste. */}
        <div style={{
          display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
          background: C.surface, border: `1px solid ${C.line}`, borderRadius: RUND.karte,
          padding: "10px 12px", marginTop: 14,
        }}>
          {STUFEN.map((s) => (
            <span key={s.key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span aria-hidden style={{
                width: 12, height: 12, borderRadius: "50%",
                background: s.schein, border: `1px solid ${s.rand}`,
              }} />
              <span style={{ fontSize: "0.6875rem", color: C.muted }}>{s.label}</span>
            </span>
          ))}
        </div>

        {gruppen.map((g) => (
          <section key={g.key} style={{ marginTop: 26 }}>
            <div style={{ fontSize: "1rem", fontWeight: 700 }}>{g.label}</div>
            <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 2 }}>{g.text}</div>
            <div style={{ marginTop: 8, borderTop: `1px solid ${C.line}` }}>
              {g.abzeichen.map((a) => <Eintrag key={a.key} a={a} />)}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
