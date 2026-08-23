"use client";

import { C, RUND } from "@/lib/theme";
import { Zahl } from "@/components/Eingaben";
import { ASPEKTE, ASPEKT_KEYS } from "@/lib/presetMerge";
import { TAPZIEL } from "@/lib/tapziel";
import {
  WAEHLER, MEHRHEITEN, ANTRAGSRECHT, WIRKUNG_AB, STIMM_SICHT,
  ABSTIMMUNG_LIMITS, MITBESTIMMUNG_ASPEKT,
  beschreibeMitbestimmung, konflikte, aspektAenderbar,
} from "@/lib/regelAbstimmung";

// ── Stufe 3 für die Mitbestimmung (design/abstimmung-verfassung.md) ──
//
// Zwei Blöcke, die zusammengehören: WIE abgestimmt wird (`regelAbstimmung`)
// und WORÜBER überhaupt (`verfassung`). Beide werden mit EINEM `onChange`
// zurückgemeldet, damit der Aufrufer sie nicht einzeln zusammensetzen muss.
//
// ⚠️ Der Quorum-Regler läuft bewusst NICHT über `reglerSchritt` aus engine.js.
// Der erkennt die Multiplikator-Familie generisch an `step === 0.05`, und das
// Quorum hat zwar diesen Schritt, ist aber ein ANTEIL und kein Modifikator —
// die Regler-Feinheit des Admins darf es nicht anfassen. Gleiche Lage und
// gleiche Behandlung wie `maxAnteilProSpiel` in der Spielerstellung.
//
// ⚠️ Zur Wahl steht immer ein GANZER Aspekt, nie ein Einzelfeld
// (`design/teilbibliotheken.md` 1). Deshalb listet die Verfassung unten die
// Aspekte und keine Regler — wer über einen halben Satz abstimmen lässt,
// bekommt eine Kombination heraus, die niemand entworfen hat.
export default function Mitbestimmung({ rules, mitglieder = null, onChange }) {
  const a = rules.regelAbstimmung;
  const v = rules.verfassung;

  const setzeAbstimmung = (teil) => onChange({ regelAbstimmung: { ...a, ...teil } });
  const setzeVerfassung = (teil) => onChange({ verfassung: { ...v, ...teil } });

  // Die Mitbestimmung selbst steht nie zur Wahl (Spec Abschnitt 6) — sie darf
  // deshalb in dieser Liste gar nicht erst auftauchen.
  const waehlbar = ASPEKTE.filter((x) => x.key !== MITBESTIMMUNG_ASPEKT);
  // Zwei Lesarten der Verfassung, und sie müssen benannt sein: eine Liste, die
  // Tabus aufzählt, ist etwas anderes als eine, die Erlaubnisse aufzählt.
  const positivListe = (v.aenderbar?.length ?? 0) > 0;

  const umschalten = (key) => {
    if (positivListe) {
      const drin = v.aenderbar.includes(key);
      const rest = v.aenderbar.filter((k) => k !== key);
      // 🔴 Der letzte freigegebene Bereich ist ein Sonderfall, und ohne ihn
      // kippt die Bedeutung ins Gegenteil: eine LEERE Freigabeliste heißt
      // „alles außer den festgeschriebenen" (siehe DEFAULT_VERFASSUNG). Wer
      // also den letzten Haken entfernt, bekäme statt „gar nichts abstimmbar"
      // plötzlich „alles abstimmbar" — eine stille Umkehr durch einen Klick.
      // Dieselbe Aussage lässt sich stabil ausdrücken, indem stattdessen alle
      // Bereiche festgeschrieben werden; `konflikte` meldet den Zustand dann
      // auch ordentlich als „es gibt nichts zu beschließen".
      if (drin && rest.length === 0) {
        setzeVerfassung({ aenderbar: [], gesperrt: waehlbar.map((x) => x.key) });
        return;
      }
      setzeVerfassung({ aenderbar: drin ? rest : [...v.aenderbar, key] });
    } else {
      const drin = v.gesperrt.includes(key);
      setzeVerfassung({ gesperrt: drin ? v.gesperrt.filter((k) => k !== key) : [...v.gesperrt, key] });
    }
  };

  const funde = konflikte(rules, ASPEKT_KEYS);

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Mitbestimmung</div>
      <p style={{ fontSize: 11, color: C.muted, margin: "4px 0 10px", lineHeight: 1.45 }}>
        Ob die Runde gemeinsam über Regeländerungen entscheidet — und welchen Rahmen
        die Verfassung dafür setzt. Ein Beschluss wirkt nie rückwirkend: ein bereits
        abgegebener Tipp wird immer so gewertet, wie er beim Abgeben gezählt hätte.
      </p>

      <Toggle label="Über Regeln wird abgestimmt" on={a.enabled === true}
        onChange={(on) => setzeAbstimmung({ enabled: on })} />

      {a.enabled && (
        <>
          <Karten label="Wer stimmt mit ab?" katalog={WAEHLER} wert={a.wer}
            onWaehlen={(k) => setzeAbstimmung({ wer: k })} />
          {a.wer === "nurAktive" && (
            <Zahl label="Als aktiv gilt, wer in den letzten … Spieltagen getippt hat"
              wert={a.aktivSpieltage} limits={ABSTIMMUNG_LIMITS.aktivSpieltage}
              breite={150} marginTop={8}
              onChange={(x) => setzeAbstimmung({ aktivSpieltage: x })} />
          )}

          <Karten label="Wie hoch ist die Hürde?" katalog={MEHRHEITEN} wert={a.mehrheit}
            onWaehlen={(k) => setzeAbstimmung({ mehrheit: k })} />

          {/* Regler UND Zahleneingabe — der Regler zum Fühlen, das Feld zum
              Treffen. Der Regler zeigt Prozent, gespeichert wird der Anteil. */}
          <Field label="Wie viele müssen sich beteiligen?">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="range"
                min={ABSTIMMUNG_LIMITS.quorum.min} max={ABSTIMMUNG_LIMITS.quorum.max}
                step={ABSTIMMUNG_LIMITS.quorum.step} value={a.quorum}
                onChange={(e) => setzeAbstimmung({ quorum: Number(e.target.value) })}
                style={{ flex: 1, accentColor: C.akzent, cursor: "pointer" }} />
              <span style={{ fontSize: 13, color: C.akzent, fontWeight: 700, minWidth: 46, textAlign: "right" }}>
                {Math.round(a.quorum * 100)} %
              </span>
            </div>
          </Field>
          <Zahl label="Beteiligung in Prozent" wert={Math.round(a.quorum * 100)}
            limits={{ min: 0, max: 100, step: 5 }} breite={150}
            onChange={(x) => setzeAbstimmung({ quorum: x / 100 })} />

          <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
            <Zahl label="Ein Antrag läuft … Spieltage" wert={a.dauer} limits={ABSTIMMUNG_LIMITS.dauer}
              breite={150} onChange={(x) => setzeAbstimmung({ dauer: x })} />
            <Zahl label="Danach gesperrt für … Spieltage" wert={a.sperrfrist} limits={ABSTIMMUNG_LIMITS.sperrfrist}
              breite={150} onChange={(x) => setzeAbstimmung({ sperrfrist: x })} />
          </div>

          <Karten label="Ab wann wirkt ein Beschluss?" katalog={WIRKUNG_AB} wert={a.wirkungAb}
            onWaehlen={(k) => setzeAbstimmung({ wirkungAb: k })} />
          {a.wirkungAb === "vorlauf" && (
            <Zahl label="Vorlauf in Spieltagen" wert={a.wirkungVorlauf} limits={ABSTIMMUNG_LIMITS.wirkungVorlauf}
              breite={150} marginTop={8} onChange={(x) => setzeAbstimmung({ wirkungVorlauf: x })} />
          )}

          <Karten label="Wer darf eine Änderung vorschlagen?" katalog={ANTRAGSRECHT} wert={a.antragsrecht}
            onWaehlen={(k) => setzeAbstimmung({ antragsrecht: k })} />
          <Karten label="Sind die Stimmen währenddessen sichtbar?" katalog={STIMM_SICHT} wert={a.sichtbarkeit}
            onWaehlen={(k) => setzeAbstimmung({ sichtbarkeit: k })} />

          <div style={{ marginTop: 10 }}>
            <Toggle label="Der Admin kann einen Beschluss kippen" on={a.vetoAdmin === true}
              onChange={(on) => setzeAbstimmung({ vetoAdmin: on })} />
          </div>

          {/* ── Verfassung ── */}
          <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 14, paddingTop: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Verfassung</div>
            <p style={{ fontSize: 11, color: C.muted, margin: "4px 0 9px", lineHeight: 1.45 }}>
              Der Rahmen, den auch eine Mehrheit nicht bricht. Zur Abstimmung steht
              immer ein ganzer Bereich, nie ein einzelner Regler — sonst käme eine
              Kombination heraus, die niemand entworfen hat.
            </p>

            <Toggle label="Es gibt eine Verfassung" on={v.enabled === true}
              onChange={(on) => setzeVerfassung({ enabled: on })} />

            {v.enabled && (
              <>
                <Field label="Wie ist die Liste zu lesen?">
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {[
                      { key: "sperre", label: "Alles außer den festgeschriebenen", an: !positivListe },
                      { key: "freigabe", label: "Nur die freigegebenen", an: positivListe },
                    ].map((m) => (
                      <button key={m.key} onClick={() => setzeVerfassung(
                        m.key === "sperre" ? { aenderbar: [] } : { aenderbar: waehlbar.map((x) => x.key), gesperrt: [] })
                      } style={{
                        ...TAPZIEL, flex: "1 1 140px", cursor: "pointer", fontFamily: "inherit", padding: "8px",
                        borderRadius: RUND.karte, textAlign: "left", fontSize: 12, fontWeight: 700,
                        background: m.an ? `${C.akzent}22` : C.surface, color: m.an ? C.akzent : C.muted,
                        border: `1px solid ${m.an ? C.akzent + "66" : C.line}`,
                      }}>{m.label}</button>
                    ))}
                  </div>
                </Field>

                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                  {waehlbar.map((asp) => {
                    // ⚠️ Angezeigt wird das ERGEBNIS (`aspektAenderbar`), nicht
                    // die rohe Listen-Zugehörigkeit — sonst zeigte die Liste
                    // „freigegeben" für etwas, das in beiden Listen steht und
                    // in Wahrheit gesperrt ist.
                    const frei = aspektAenderbar(asp.key, v).erlaubt;
                    return (
                      <button key={asp.key} onClick={() => umschalten(asp.key)} style={{
                        textAlign: "left", cursor: "pointer", fontFamily: "inherit", color: C.text,
                        background: C.surface, borderRadius: RUND.karte, padding: "9px 12px",
                        border: `1px solid ${frei ? C.line : C.akzent + "66"}`,
                        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
                      }}>
                        <span>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>{asp.label}</span>
                          <span style={{ display: "block", fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>
                            {asp.hint}
                          </span>
                        </span>
                        <span style={{
                          flexShrink: 0, fontSize: 11, padding: "3px 9px", borderRadius: RUND.pille,
                          color: frei ? C.muted : C.akzent,
                          border: `1px solid ${frei ? C.line : C.akzent + "66"}`,
                        }}>{frei ? "abstimmbar" : "festgeschrieben"}</span>
                      </button>
                    );
                  })}
                </div>
                <p style={{ fontSize: 11, color: C.muted, marginTop: 8, lineHeight: 1.45 }}>
                  Die Mitbestimmung selbst steht bewusst nicht in dieser Liste: über die
                  Verfassung und die Abstimmungsregeln wird nicht abgestimmt, sonst wäre
                  es keine Verfassung.
                </p>
              </>
            )}
          </div>

          {/* Live-Vorschau: was die Einstellungen konkret bedeuten. */}
          <p style={{ fontSize: 11, color: C.muted, marginTop: 12, lineHeight: 1.45 }}>
            {beschreibeMitbestimmung(rules, { mitglieder, aspektKeys: ASPEKT_KEYS })}
          </p>

          {funde.length > 0 && (
            <div style={{
              background: `${C.akzent}12`, border: `1px solid ${C.akzent}33`, borderRadius: RUND.karte,
              padding: "10px 12px", marginTop: 10,
            }}>
              {funde.map((k) => (
                <div key={k.key} style={{ fontSize: 12, color: C.muted, lineHeight: 1.45, marginBottom: 4 }}>
                  {k.text}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Karten({ label, katalog, wert, onWaehlen }) {
  return (
    <Field label={label}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {katalog.map((e) => {
          const an = wert === e.key;
          return (
            <button key={e.key} title={e.desc} onClick={() => onWaehlen(e.key)} style={{
              ...TAPZIEL, flex: "1 1 110px", cursor: "pointer", fontFamily: "inherit", padding: "8px",
              borderRadius: RUND.karte, textAlign: "left",
              background: an ? `${C.akzent}22` : C.surface, color: an ? C.akzent : C.muted,
              border: `1px solid ${an ? C.akzent + "66" : C.line}`,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>{e.label}</div>
            </button>
          );
        })}
      </div>
    </Field>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function Toggle({ label, on, onChange }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%",
      textAlign: "left", gap: 12, marginBottom: 8, cursor: "pointer", color: C.text,
      background: C.surface, border: `1px solid ${on ? C.mint + "55" : C.line}`,
      ...TAPZIEL, borderRadius: RUND.karte, padding: "10px 14px", fontSize: 13, fontFamily: "inherit",
    }}>
      <span>{label}</span>
      <span style={{
        flexShrink: 0, width: 38, height: 22, borderRadius: RUND.pille,
        background: on ? C.mint : C.surface2, position: "relative", transition: "background .2s",
      }}>
        <span style={{
          position: "absolute", top: 2, left: on ? 18 : 2, width: 18, height: 18,
          borderRadius: RUND.pille, background: "#fff", transition: "left .2s",
        }} />
      </span>
    </button>
  );
}
