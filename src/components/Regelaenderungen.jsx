"use client";

import { useEffect, useState } from "react";
import { getStore } from "@/lib/store";
import { useAuth } from "@/components/AuthProvider";
import { useCurrentRound } from "@/components/RoundProvider";
import BackLink from "@/components/BackLink";
import { DEFAULT_RULES, sanitizeRules, RULE_LIMITS } from "@/lib/engine";
import { ASPEKTE, ASPEKT_KEYS } from "@/lib/presetMerge";
import { TEILBIBLIOTHEKEN } from "@/lib/teilbibliothek";
import { zeitachse, rundenSpieltagVon } from "@/lib/zeitachse";
import { naechstesOffenesSpiel } from "@/lib/muenzstand";
import {
  darfBeantragen, darfStimmen, zaehleAus, wirktAb,
  verstoesstGegenVerfassung, beschreibeMitbestimmung,
} from "@/lib/regelAbstimmung";
import { C, MONO } from "@/lib/theme";

// ── Schritt 4: Anträge stellen und darüber abstimmen ────────
// design/abstimmung-verfassung.md Abschnitt 7.
//
// 🔴 Ein Antrag IST ein Teilbibliotheks-Eintrag (Spec Abschnitt 4): die Felder
// genau eines Aspekts. Deshalb wird hier auch KEIN zweiter Regel-Editor
// gebaut — man wählt einen Bereich und daraus einen kuratierten Eintrag.
// Das ist nicht nur weniger Arbeit, es ist die Regel: zur Abstimmung steht ein
// ganzer Aspekt, nie ein Einzelfeld, und die Einträge sind bereits vermessen.
// Wer freier bauen will, macht das in der Spielerstellung und teilt einen
// Teil-Code — derselbe Weg, kein zweiter.
//
// ⚠️ Diese Ansicht STELLT und ZÄHLT nur. Ein angenommener Antrag ändert das
// Regelwerk hier NICHT — das ist Schritt 5 der Spec und berührt die
// Snapshot-Kante („nie rückwirkend"), deshalb ausdrücklich getrennt.
export default function Regelaenderungen() {
  const { user } = useAuth();
  const { roundId } = useCurrentRound();
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [matches, setMatches] = useState(null);
  const [mitglieder, setMitglieder] = useState([]);
  const [antraege, setAntraege] = useState([]);
  const [busy, setBusy] = useState(null);
  const [gewaehlterAspekt, setGewaehlterAspekt] = useState(null);
  const [meldung, setMeldung] = useState(null);

  const laden = async () => {
    const [round, ms, leute, liste] = await Promise.all([
      getStore().getRound(roundId), getStore().listMatches(),
      getStore().listMembers(roundId), getStore().listAntraege({ roundId }),
    ]);
    setRules(sanitizeRules(round?.rules ?? DEFAULT_RULES));
    setMatches(ms);
    setMitglieder(leute ?? []);
    setAntraege(liste ?? []);
  };

  useEffect(() => { laden().catch(() => {}); /* eslint-disable-next-line */ }, [roundId]);

  const a = rules.regelAbstimmung;
  const aktiv = a?.enabled === true;

  // Der aktuelle RUNDEN-Spieltag — in dieser Einheit rechnet das ganze Modul
  // (`gestelltAm`, `dauer`, `sperrfrist`). Ohne verwertbaren Stand wird nichts
  // geraten: dann fehlt `gestelltAm`, und `wirktAb` sagt das auch.
  const achse = zeitachse(matches ?? [], rules.zeitachse);
  const naechstes = naechstesOffenesSpiel(matches ?? [], new Date());
  const aktuellerSpieltag = naechstes ? rundenSpieltagVon(achse, naechstes) : null;

  // Die Mitglieder in der Form, die `zaehleAus` erwartet. „aktiv" kennt diese
  // Ansicht (noch) nicht — sie bräuchte die Tipps der letzten Spieltage; bis
  // dahin gilt jeder als aktiv, was NIEMANDEN ausschließt und damit die
  // harmlose Richtung ist.
  const leute = mitglieder.map((m) => ({
    userId: m.user_id ?? m.userId ?? m.id,
    istAdmin: (m.role ?? m.rolle) === "admin",
  }));

  const stellen = async (aspekt, eintrag) => {
    if (!user) return;
    const pruef = darfBeantragen(aspekt, rules, user.id, {
      istAdmin: leute.find((l) => l.userId === user.id)?.istAdmin === true,
      aktuellerSpieltag,
      letzteEntscheidungen: antraege
        .filter((x) => x.status !== "offen")
        .map((x) => ({ aspekt: x.aspekt, entschiedenAm: x.laeuft_bis ?? x.laeuftBis })),
    });
    if (!pruef.erlaubt) { setMeldung(pruef.grund); return; }

    // Auch ein erlaubter Bereich kann Werte tragen, die die Verfassung
    // ausschließt — das muss VOR dem Abschicken gesagt werden, mit den
    // betroffenen Feldern, nicht erst bei der Auszählung.
    const verstoesse = verstoesstGegenVerfassung(eintrag.werte, rules.verfassung, aspekt, RULE_LIMITS);
    if (verstoesse.length) { setMeldung(verstoesse.map((v) => v.grund).join(" ")); return; }

    setBusy(`neu-${eintrag.key}`);
    try {
      await getStore().createAntrag({
        roundId, userId: user.id, aspekt, werte: eintrag.werte,
        gestelltAm: aktuellerSpieltag,
        // Die Frist wird beim Anlegen EINGEFROREN — eine später geänderte
        // Dauer darf eine laufende Abstimmung nicht verschieben.
        laeuftBis: aktuellerSpieltag != null ? aktuellerSpieltag + a.dauer : null,
      });
      setMeldung(null);
      setGewaehlterAspekt(null);
      await laden();
    } finally { setBusy(null); }
  };

  const stimmen = async (antragId, ja) => {
    if (!user) return;
    const pruef = darfStimmen(user.id, rules, {});
    if (!pruef.erlaubt) { setMeldung(pruef.grund); return; }
    setBusy(antragId);
    try {
      await getStore().saveAntragStimme({ antragId, userId: user.id, ja });
      await laden();
    } finally { setBusy(null); }
  };

  return (
    <div style={{
      minHeight: "100vh", background: C.ink, color: C.text,
      fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
      padding: "28px 16px", display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <BackLink href="/hub" label="Tippspiel" />
        <h1 style={{ fontSize: 12, letterSpacing: 2, color: C.muted, textTransform: "uppercase", margin: "18px 0 6px" }}>
          Regeländerungen
        </h1>
        <p style={{ fontSize: 12.5, color: C.muted, margin: "0 0 16px", lineHeight: 1.5 }}>
          {beschreibeMitbestimmung(rules, { mitglieder: leute.length || null, aspektKeys: ASPEKT_KEYS })}
        </p>

        {matches == null && <div style={{ fontFamily: MONO, fontSize: 13, color: C.muted }}>lädt …</div>}

        {matches != null && !aktiv && (
          <Kasten>
            In dieser Runde wird nicht über Regeln abgestimmt. Der Admin kann das in der
            Spielerstellung einschalten — dort steht auch, welche Bereiche zur Wahl stünden.
          </Kasten>
        )}

        {meldung && (
          <div style={{
            background: `${C.gold}12`, border: `1px solid ${C.gold}33`, borderRadius: 12,
            padding: "10px 12px", marginBottom: 12, fontSize: 12, color: C.muted, lineHeight: 1.45,
          }}>{meldung}</div>
        )}

        {matches != null && aktiv && (
          <>
            {/* ── Laufende und entschiedene Anträge ── */}
            {antraege.length === 0 && (
              <Kasten>Noch kein Antrag gestellt. Unten kannst du einen einbringen.</Kasten>
            )}

            {antraege.map((antrag) => {
              const aus = zaehleAus(antrag, leute, a);
              const gestellt = antrag.gestellt_am ?? antrag.gestelltAm ?? null;
              const frist = antrag.laeuft_bis ?? antrag.laeuftBis ?? null;
              const laeuft = antrag.status === "offen"
                && (frist == null || aktuellerSpieltag == null || aktuellerSpieltag <= frist);
              // ⚠️ Verdeckt heißt verdeckt, solange die Abstimmung läuft —
              // sonst wäre die Einstellung eine Behauptung. Am Ende wird
              // gezeigt, sonst könnte niemand das Ergebnis nachvollziehen.
              const zeigeStand = a.sichtbarkeit === "offen" || !laeuft;
              // 🔴 `zuletztGeoeffnet` ist der AKTUELLE Spieltag, nicht der
              // davor. Ein Spieltag wird zum Tippen GEÖFFNET, bevor er
              // angepfiffen wird — auf dem laufenden liegen also bereits
              // abgegebene Tipps. Mit `aktuellerSpieltag - 1` hätte ein
              // Beschluss genau dort greifen können und eine schon getippte
              // Wertung nachträglich geändert. Genau das schließt Abschnitt 1
              // der Spec aus.
              // Ob der Spieltag wirklich schon offen ist, weiß diese Ansicht
              // nicht sicher — und deshalb wird in die HARMLOSE Richtung
              // gerundet: einen Spieltag zu spät zu wirken kostet eine Woche,
              // einen zu früh bricht die Kante.
              const wirkung = wirktAb(
                { gestelltAm: gestellt, laeuftBis: frist }, a,
                { zuletztGeoeffnet: aktuellerSpieltag },
              );
              const aspektDef = ASPEKTE.find((x) => x.key === antrag.aspekt);
              const meine = (antrag.stimmen ?? []).find((s) => s.userId === user?.id);

              return (
                <div key={antrag.id} style={{
                  background: C.surface, border: `1px solid ${laeuft ? C.gold + "44" : C.line}`,
                  borderRadius: 14, padding: "13px 15px", marginBottom: 10,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{aspektDef?.label ?? antrag.aspekt}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 1.45 }}>
                    {aspektDef?.hint}
                  </div>

                  <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8, lineHeight: 1.45 }}>
                    {laeuft
                      ? (frist != null ? `Läuft noch bis Spieltag ${frist}.` : "Läuft.")
                      : `Abgeschlossen: ${aus.angenommen ? "angenommen" : "abgelehnt"}.`}
                    {" "}
                    {wirkung.rundenSpieltag != null
                      ? `Wirksam ab Spieltag ${wirkung.rundenSpieltag}.`
                      : wirkung.grund}
                  </div>

                  {zeigeStand ? (
                    <div style={{ fontFamily: MONO, fontSize: 12, marginTop: 8, color: C.text }}>
                      {aus.ja} dafür · {aus.nein} dagegen ·{" "}
                      <span style={{ color: C.muted }}>{aus.abgegeben} von {aus.berechtigte}</span>
                      {aus.grund && (
                        <div style={{ fontFamily: "inherit", fontSize: 11.5, color: C.muted, marginTop: 4, lineHeight: 1.45 }}>
                          {aus.grund}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8, lineHeight: 1.45 }}>
                      Die Stimmen sind verdeckt und werden erst am Ende gezeigt —
                      bisher {aus.abgegeben} von {aus.berechtigte} abgegeben.
                    </div>
                  )}

                  {laeuft && (
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      {[{ ja: true, label: "Dafür" }, { ja: false, label: "Dagegen" }].map((b) => {
                        const an = meine?.ja === b.ja;
                        return (
                          <button key={b.label} disabled={busy === antrag.id}
                            onClick={() => stimmen(antrag.id, b.ja)} style={{
                              flex: 1, cursor: busy === antrag.id ? "default" : "pointer",
                              fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, padding: "9px 6px",
                              borderRadius: 11,
                              background: an ? `${C.gold}22` : C.surface2, color: an ? C.gold : C.muted,
                              border: `1px solid ${an ? C.gold + "66" : C.line}`,
                            }}>{b.label}</button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* ── Neuen Antrag stellen ── */}
            <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 16, paddingTop: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Änderung vorschlagen</div>
              <p style={{ fontSize: 11, color: C.muted, margin: "4px 0 10px", lineHeight: 1.45 }}>
                Zur Wahl steht immer ein ganzer Bereich, nie ein einzelner Regler — sonst
                käme eine Kombination heraus, die niemand entworfen hat. Wähle einen
                Bereich und daraus eine der geprüften Voreinstellungen.
              </p>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {ASPEKTE.map((asp) => {
                  const pruef = darfBeantragen(asp.key, rules, user?.id, {
                    istAdmin: leute.find((l) => l.userId === user?.id)?.istAdmin === true,
                    aktuellerSpieltag,
                  });
                  const an = gewaehlterAspekt === asp.key;
                  return (
                    <button key={asp.key} disabled={!pruef.erlaubt}
                      title={pruef.erlaubt ? asp.hint : pruef.grund}
                      onClick={() => { setMeldung(null); setGewaehlterAspekt(an ? null : asp.key); }}
                      style={{
                        flex: "1 1 120px", cursor: pruef.erlaubt ? "pointer" : "default",
                        fontFamily: "inherit", fontSize: 12, fontWeight: 700, padding: "8px",
                        borderRadius: 11, textAlign: "left",
                        background: an ? `${C.gold}22` : C.surface,
                        color: an ? C.gold : pruef.erlaubt ? C.muted : "rgba(138,144,180,0.4)",
                        border: `1px solid ${an ? C.gold + "66" : C.line}`,
                        textDecoration: pruef.erlaubt ? "none" : "line-through",
                      }}>{asp.label}</button>
                  );
                })}
              </div>

              {gewaehlterAspekt && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                  {(TEILBIBLIOTHEKEN.find((b) => b.aspekt === gewaehlterAspekt)?.eintraege ?? []).map((e) => (
                    <button key={e.key} disabled={busy === `neu-${e.key}`}
                      onClick={() => stellen(gewaehlterAspekt, e)} style={{
                        textAlign: "left", cursor: "pointer", fontFamily: "inherit", color: C.text,
                        background: C.surface, border: `1px solid ${C.line}`,
                        borderRadius: 12, padding: "9px 12px",
                      }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700 }}>{e.label}</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>{e.desc}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <p style={{ fontSize: 10.5, color: C.muted, marginTop: 14, lineHeight: 1.45 }}>
              Ein angenommener Antrag wird hier noch nicht automatisch übernommen — das
              ist der nächste Schritt. Ein Beschluss wirkt nie rückwirkend: ein bereits
              abgegebener Tipp wird immer so gewertet, wie er beim Abgeben gezählt hätte.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Kasten({ children }) {
  return (
    <div style={{
      background: C.ink2, border: `1px solid ${C.line}`, borderRadius: 14,
      padding: "14px 16px", fontSize: 13, color: C.muted, lineHeight: 1.5, marginBottom: 12,
    }}>{children}</div>
  );
}
