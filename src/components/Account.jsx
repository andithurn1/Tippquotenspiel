"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { C, MONO, SCHRIFT, RUND } from "@/lib/theme";
import { TAPZIEL } from "@/lib/tapziel";
import BackLink from "@/components/BackLink";
import { AvatarKreis } from "@/components/Profil";
import GeburtsdatumWahl from "@/components/GeburtsdatumWahl";
import Feinheiten from "@/components/Feinheiten";
import AnzeigeVorschau from "@/components/AnzeigeVorschau";
import { useAuth } from "@/components/AuthProvider";
import { useTheme } from "@/components/ThemeProvider";
import { usePrefs } from "@/components/PrefsProvider";
import { useRueckmeldung } from "@/components/Rueckmeldung";
import { getStore } from "@/lib/store";
import { beschreibeGeburtsdatum } from "@/lib/geburtsdatum";
import { BEWEGUNG_STUFEN, BEWEGUNG_LABEL, BEWEGUNG_HINWEIS, LEVEL_LABEL } from "@/lib/prefs";

// ============================================================
//  ACCOUNT ANPASSEN — EIN Einstieg (Andi, KT8, 25.08.2026)
//
//  Wörtlich: „das mit fanfarben und farbschema kommt dann auch in den
//  Unterpunkt Account anpassen mit Benutzernamen wechsel".
//
//  🔴 Vorher lag dasselbe auf FÜNF Seiten: /profil (Name + Sinnbild),
//  /farben (Vereinsfarben), /einstellungen (Anzeige-Stufen),
//  /benachrichtigungen und /konto (Abo, Daten) — verstreut über das
//  Hauptmenü und eine Fußzeile. Wer seinen Namen ändern UND die
//  Vereinsfarben setzen wollte, klickte sich durch zwei Menüpunkte, die
//  nebeneinander gar nicht auftauchten. Und /profil war aus dem Hauptmenü
//  überhaupt nicht erreichbar.
//
//  ── Andis Prinzip, wörtlich, und es baut diese Seite ──
//  „erstmal nur das einstellbar machen und aufzeigen was überhaupt geht,
//   und dann in nem weiteren fenster detaillierter"
//
//  Deshalb: jede Zeile nennt den BEREICH und den JETZIGEN Stand — was
//  eingestellt ist, sieht man, ohne zu klicken. Das Detail liegt hinter dem
//  Klick, in seinem eigenen Fenster. Die Seiten selbst bleiben, wie sie sind;
//  hier entsteht nur der Einstieg, der bisher fehlte.
//
//  ⚠️ NICHTS wird hier nachgerechnet. Jede Zeile zeigt den Wert, den ihr
//  eigenes Fenster auch zeigt — gelesen aus derselben Quelle (Provider bzw.
//  Store). Sonst stünde in der Übersicht „3 Farben" und im Fenster zwei.
// ============================================================

function Zeile({ href, titel, stand, farbe, kinder = null }) {
  const inhalt = (
    <>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "1rem", fontWeight: 700 }}>{titel}</div>
        {/* Der jetzige Stand — das ist der „aufzeigen was geht"-Teil. */}
        <div style={{ fontSize: "0.8125rem", color: C.muted, marginTop: 2, lineHeight: 1.4 }}>
          {stand}
        </div>
      </div>
      {kinder}
      {href && <span aria-hidden style={{ color: C.muted, fontSize: "1.25rem", marginLeft: 8 }}>›</span>}
    </>
  );

  const stil = {
    ...TAPZIEL, display: "flex", alignItems: "center", gap: 12,
    width: "100%", textAlign: "left", textDecoration: "none",
    background: C.surface, color: C.text,
    border: `1px solid ${C.line}`, borderLeft: `3px solid ${farbe}`,
    borderRadius: RUND.karte, padding: "13px 14px", marginTop: 8,
    fontFamily: "inherit", cursor: href ? "pointer" : "default",
  };

  return href
    ? <Link className="tqs-aktion" href={href} style={stil}>{inhalt}</Link>
    : <div style={stil}>{inhalt}</div>;
}

export default function Account() {
  const { user } = useAuth();
  const { fanColors } = useTheme();
  const { prefs, setPref } = usePrefs();
  const melder = useRueckmeldung();

  const [profil, setProfil] = useState(null);
  const [gerade, setGerade] = useState(false);

  useEffect(() => {
    let lebt = true;
    if (!user?.id) return;
    getStore().getProfile(user.id)
      .then((p) => { if (lebt) setProfil(p); })
      .catch(() => {});
    return () => { lebt = false; };
  }, [user?.id]);

  const speichereGeburtstag = async (datum) => {
    try {
      const neu = await getStore().updateProfile(user.id, { geburtsdatum: datum });
      setProfil(neu);
      setGerade(true);
      melder.gespeichert(datum ? "Geburtsdatum gespeichert" : "Angabe entfernt");
      setTimeout(() => setGerade(false), 2500);
    } catch {
      melder.fehler("Konnte nicht gespeichert werden");
    }
  };

  // Die Anzeige-Stufen, die es WIRKLICH gibt (`DEFAULT_PREFS`). Weichen alle
  // drei nicht von „voll" ab, ist das die kürzere Aussage als eine Aufzählung.
  const stufen = [
    ["Abrechnung", prefs?.abrechnung],
    ["Vorschau", prefs?.vorschau],
    ["Zwischenstand", prefs?.zwischenabrechnung],
  ];
  const abweichend = stufen.filter(([, v]) => v && v !== "voll");
  const anzeigeStand = abweichend.length === 0
    ? "Alles sichtbar — Abrechnung, Vorschau, Zwischenstand"
    : abweichend.map(([name, v]) => `${name}: ${LEVEL_LABEL[v] ?? v}`).join(" · ");

  const farbStand = fanColors.length
    ? `${fanColors.length} Farbe${fanColors.length === 1 ? "" : "n"} gewählt`
    : "Noch keine Vereinsfarben — Standard-Gold";

  return (
    <div style={{
      minHeight: "100vh", background: C.ink, color: C.text, fontFamily: SCHRIFT,
      padding: "28px 16px", display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <BackLink href="/menu" label="Menü" />
      <div className="tqs-fenster" style={{
        width: "100%", maxWidth: "var(--tqs-schirm-breite)", borderRadius: RUND.schirm,
        background: `radial-gradient(120% 80% at 50% -10%, ${C.ink2} 0%, ${C.ink} 60%)`,
        border: `1px solid ${C.line}`, boxShadow: "0 30px 80px -30px rgba(0,0,0,0.8)",
        padding: "26px 22px 24px",
      }}>
        <span style={{ fontFamily: MONO, fontSize: "0.75rem", letterSpacing: 2, color: C.muted, textTransform: "uppercase" }}>
          Account anpassen
        </span>
        <div style={{ marginTop: 6, fontSize: "1.25rem", fontWeight: 700 }}>
          {profil?.display_name || user?.name || "Dein Konto"}
        </div>
        {/* NOMINALSTIL, kein Erklärsatz (Andi, 07.08.2026). */}
        <p style={{ fontSize: "0.8125rem", color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
          Name, Sinnbild, Vereinsfarben, Anzeige und Benachrichtigungen — an
          einer Stelle. Jede Zeile zeigt den jetzigen Stand, das Feine steht
          dahinter.
        </p>

        <Zeile href="/profil" titel="Name & Sinnbild" farbe={C.akzent}
          stand={profil?.display_name
            ? `${profil.display_name} · einzigartig in der Runde`
            : "Noch kein eigener Name gewählt"}
          kinder={<AvatarKreis id={profil?.avatar} size={34} />} />

        <Zeile href="/farben" titel="Fanfarben" farbe={C.fan1} stand={farbStand}
          kinder={fanColors.length ? (
            <span style={{ display: "flex", gap: 4 }}>
              {fanColors.map((f) => (
                <span key={f} style={{ width: 16, height: 16, borderRadius: RUND.pille, background: f, border: `1px solid ${C.line}` }} />
              ))}
            </span>
          ) : null} />

        {/* 🔴 Andis Ort für die Abzeichen (29.08.2026): „Eingliederung dann
            bei meinem Account und Fanfarben". Beides ist „das bin ich", im
            Gegensatz zu „so spielt meine Runde" — deshalb steht der Schrank
            direkt hinter den Fanfarben und nicht bei den Runden-Einstellungen. */}
        <Zeile href="/schrank" titel="Trophäenschrank" farbe={C.mint}
          stand="Abzeichen über alle deine Runden — ohne Punkte, zum Herzeigen" />

        {/* ⚠️ Hier stand kurz „Vorschau: voll · Stufe 1" — `prefs.stufe` gibt
            es GAR NICHT, der `?? 1`-Rückfall hat eine erfundene Zahl in die
            Übersicht geschrieben. Genau die Sorte zweite Wahrheit, vor der
            die Runden-Schicht warnt, nur harmloser aussehend. Jetzt stehen
            die drei Stufen da, die es wirklich gibt. */}
        <Zeile href="/einstellungen" titel="Meine Anzeige" farbe={C.violet}
          stand={anzeigeStand} />

        <Zeile href="/benachrichtigungen" titel="Benachrichtigungen" farbe={C.sky}
          stand="Neuer Spieltag, Erinnerung vor Anpfiff — je einzeln" />

        <Zeile href="/konto" titel="Konto & Daten" farbe={C.mint}
          stand={user?.email ? `Angemeldet als ${user.email}` : "Abmelden, Daten herunterladen, löschen"} />

        {/* ── Bewegung (Andi, 25.08.2026) ──
            „dass jeder individuell solche performanceteuren sachen ausstellen
             kann, wenn man mit der performance unzufrieden ist, aber im
             normalfall sollts schon klappen"

            🔴 Steht bewusst HINTER einem Klick und nicht als erste Zeile: die
            Vorgabe trägt, gemessen (`npm run bewegung`: 0 Animationen, die
            ein neues Ausmessen auslösen). Wer hier landet, sucht das Ventil —
            wer es nicht sucht, soll nicht erst überlegen müssen, ob seine App
            vielleicht zu langsam ist. */}
        <div style={{ marginTop: 18 }}>
          <Feinheiten
            titel="Bewegung"
            zusammenfassung={BEWEGUNG_LABEL[prefs?.bewegung ?? "voll"]}
            abweichend={(prefs?.bewegung ?? "voll") !== "voll"}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {BEWEGUNG_STUFEN.map((stufe) => {
                const an = (prefs?.bewegung ?? "voll") === stufe;
                return (
                  <button key={stufe} className="tqs-aktion"
                    onClick={() => setPref("bewegung", stufe)}
                    style={{
                      ...TAPZIEL, display: "block", width: "100%", textAlign: "left",
                      background: an ? `${C.akzent}1F` : C.surface,
                      color: C.text, cursor: "pointer", fontFamily: "inherit",
                      border: `1px solid ${an ? C.akzent : C.line}`,
                      borderRadius: RUND.karte, padding: "10px 13px",
                    }}>
                    <div style={{ fontSize: "0.9375rem", fontWeight: an ? 700 : 600, color: an ? C.akzent : C.text }}>
                      {BEWEGUNG_LABEL[stufe]}
                      {stufe === "voll" && (
                        <span style={{ fontSize: "0.6875rem", color: C.muted, fontWeight: 400, marginLeft: 8 }}>
                          empfohlen
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 2, lineHeight: 1.4 }}>
                      {BEWEGUNG_HINWEIS[stufe]}
                    </div>
                  </button>
                );
              })}
            </div>
            {/* 🔴 Vorschau der gewählten Stufe — an DIESER Kiste, nicht am
                Dokument. Sonst müsste man eine Stufe einschalten, um zu
                sehen, wie sie aussieht (Andi, 25.08.2026). */}
            <AnzeigeVorschau art="bewegung" stufe={prefs?.bewegung ?? "voll"} />
            <p style={{ fontSize: "0.75rem", color: C.muted, marginTop: 10, lineHeight: 1.5 }}>
              Gemessen kostet die Bewegung hier nichts: keine Animation zwingt
              das Gerät, die Seite neu auszumessen. Auf einem alten Telefon
              hilft <b style={{ color: C.text }}>Sparsam</b> trotzdem — dort
              stehen auch bewegte Bilder still.
              {" "}⚠️ Wer am Gerät „Bewegung reduzieren" eingeschaltet hat,
              behält das — diese Einstellung kann nur weniger erlauben.
            </p>
          </Feinheiten>
        </div>

        {/* 🔴 Das Geburtsdatum steht hier DIREKT statt hinter einem Klick —
            es hat kein eigenes Fenster verdient (drei Auswahlfelder), und es
            gehört sichtbar neben den Namen: es ist der Grund, warum bei
            einem vergebenen Namen „Andi95" vorgeschlagen werden kann.
            Andis Regel „gängigstes oben, Feinheiten hinter einem Klick" —
            und das hier ist die Feinheit, nicht das Gängigste. */}
        <div style={{ marginTop: 18 }}>
          <Feinheiten
            titel="Geburtsdatum"
            zusammenfassung={beschreibeGeburtsdatum(profil?.geburtsdatum, new Date())}
            abweichend={Boolean(profil?.geburtsdatum)}
          >
            <GeburtsdatumWahl
              wert={profil?.geburtsdatum}
              gespeichert={gerade}
              onChange={speichereGeburtstag}
            />
          </Feinheiten>
        </div>
      </div>
    </div>
  );
}
