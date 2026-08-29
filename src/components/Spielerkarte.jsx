"use client";
// ============================================================
//  SPIELERKARTE — das Profil eines Mitspielers
//
//  Andi, 29.08.2026: „in den einzelnen Ranglisten je Tipprunde soll das Profil
//  des anderen angezeigt werden, wo man eben auch Trophäenschrank plus
//  Beschreibung einsehen kann"
//
//  Und der Zuschnitt dazu (KP3): „es reicht bei jedem Profil der Benutzername
//  samt nen kleinen Beschreibungstext über sich … und evtl. iwelche Abzeichen".
//
//  ── 🔴 Was hier NICHT steht, und warum das die eigentliche Arbeit ist ──
//  Kein Geburtsdatum, keine E-Mail, kein echter Name, keine Punktzahl aus
//  fremden Runden. **Was gar nicht angezeigt wird, kann auch nicht ausgelesen
//  werden** — der Zuschnitt löst die Datenfrage an der Wurzel, statt sie mit
//  Berechtigungen zu verwalten. `profile_privat` wird hier nicht einmal
//  gefragt.
//
//  ── ⚠️ Die Abzeichen kommen aus den GEMEINSAMEN Runden ──
//  Andis Zuschnitt ist „je Konto". Lesen kann ein Besucher aber nur die
//  Runden, in denen er selbst Mitglied ist — alles andere wäre ein Blick in
//  fremde Runden. Angezeigt wird deshalb, was aus den gemeinsamen Runden
//  folgt, und die Karte sagt das auch dazu.
//
//  🔴 Sie behauptet nicht, vollständig zu sein. Eine Zahl, die je nach
//  Betrachter etwas anderes bedeutet und so tut, als wäre sie absolut, ist
//  schlimmer als eine kleinere Zahl mit einem ehrlichen Satz daneben.
// ============================================================
import { useEffect, useMemo, useState } from "react";
import { C, MONO, SCHRIFT, RUND } from "@/lib/theme";
import { TAPZIEL } from "@/lib/tapziel";
import BackLink from "@/components/BackLink";
import { AvatarKreis } from "@/components/Profil";
import { useAuth } from "@/components/AuthProvider";
import { getStore } from "@/lib/store";
import { DEFAULT_RULES } from "@/lib/engine";
import { nachGruppen, bildPfad, scheinDeckkraft } from "@/lib/abzeichen";
import { bilanzAus, bilanzZusammen, bilanzAusUmfeld } from "@/lib/abzeichenBilanz";
import { MELDE_GRUENDE, NOTIZ_MAX, schonGemeldet } from "@/lib/meldung";

const SCHEIBE = 52;

function Scheibe({ a }) {
  const s = a.stufe;
  const bild = bildPfad(a.key);
  const [bildDa, setBildDa] = useState(false);
  return (
    <div style={{ position: "relative", width: SCHEIBE, height: SCHEIBE }} title={`${a.label} — ${s?.label ?? ""}`}>
      {s && (
        <div aria-hidden style={{
          position: "absolute", inset: -6, borderRadius: "50%", pointerEvents: "none",
          background: `radial-gradient(circle, ${s.schein}${scheinDeckkraft(s)} 0%, ${s.schein}33 58%, transparent 74%)`,
        }} />
      )}
      <div style={{
        position: "relative", width: SCHEIBE, height: SCHEIBE, borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: C.surface, border: `2px solid ${s ? s.rand : C.line}`, overflow: "hidden",
      }}>
        <span aria-hidden style={{
          fontFamily: MONO, fontSize: "1.125rem", fontWeight: 700, color: s ? s.rand : C.muted,
        }}>{a.label.slice(0, 1)}</span>
        {bild && (
          <img src={bild} alt="" width={SCHEIBE} height={SCHEIBE}
            onLoad={() => setBildDa(true)}
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%",
              objectFit: "cover", opacity: bildDa ? 1 : 0,
            }} />
        )}
      </div>
    </div>
  );
}

export default function Spielerkarte({ userId }) {
  const { user } = useAuth();
  const [profil, setProfil] = useState(null);
  const [bilanz, setBilanz] = useState({});
  const [runden, setRunden] = useState(0);
  const [laedt, setLaedt] = useState(true);

  // Melden
  const [offen, setOffen] = useState(false);
  const [grund, setGrund] = useState("");
  const [notiz, setNotiz] = useState("");
  const [meldeStand, setMeldeStand] = useState(null);   // null | "ok" | Fehlertext
  const [bereitsGemeldet, setBereitsGemeldet] = useState(false);

  const ichSelbst = Boolean(user?.id) && user.id === userId;

  useEffect(() => {
    let live = true;
    if (!userId) { setLaedt(false); return undefined; }
    (async () => {
      const store = getStore();
      const [p, meine] = await Promise.all([
        store.getProfile(userId).catch(() => null),
        user?.id ? store.listRoundsForUser(user.id).catch(() => []) : Promise.resolve([]),
      ]);

      // 🔴 Nur die GEMEINSAMEN Runden. Die Runden des anderen zu holen wäre
      // ein Blick in fremde Runden — und genau den soll es nicht geben.
      const seine = await store.listRoundsForUser(userId).catch(() => []);
      const seineIds = new Set((seine ?? []).map((r) => r?.id));
      const gemeinsam = (meine ?? []).filter((r) => r?.id && seineIds.has(r.id));

      const teile = [];
      const mitgliederJeRunde = {};
      for (const r of gemeinsam) {
        const eintraege = await store.getRoundEntries(r.id).catch(() => []);
        const verlauf = await store.getLeaderboardHistory(r.id).catch(() => null);
        teile.push(bilanzAus({
          eintraege: eintraege ?? [], userId, rules: r.rules ?? DEFAULT_RULES, verlauf,
        }));
        if (r.admin_id === userId) {
          mitgliederJeRunde[r.id] = await store.listMembers(r.id).catch(() => []);
        }
      }
      const umfeld = bilanzAusUmfeld({
        userId, runden: gemeinsam, mitgliederJeRunde,
      });

      let gemeldet = false;
      if (user?.id && user.id !== userId && store.listMeineMeldungen) {
        const meineMeldungen = await store.listMeineMeldungen(user.id).catch(() => []);
        gemeldet = schonGemeldet(meineMeldungen, user.id, userId);
      }

      if (!live) return;
      setProfil(p);
      setBilanz(bilanzZusammen([...teile, umfeld]));
      setRunden(gemeinsam.length);
      setBereitsGemeldet(gemeldet);
      setLaedt(false);
    })();
    return () => { live = false; };
  }, [userId, user?.id]);

  const gruppen = useMemo(() => nachGruppen(bilanz), [bilanz]);
  const erspielt = gruppen.flatMap((g) => g.abzeichen.filter((a) => a.erspielt));

  const melden = async () => {
    setMeldeStand(null);
    try {
      await getStore().melden({
        melderId: user.id, zielId: userId, art: "beschreibung",
        grund, notiz, textKopie: profil?.beschreibung ?? "",
      });
      setMeldeStand("ok");
      setBereitsGemeldet(true);
      setOffen(false);
    } catch (e) {
      // ⚠️ Der echte Grund, nicht „Fehler". Ein Melder, der nicht weiß, warum
      // es nicht ging, meldet es niemandem — und hält die Funktion für kaputt.
      setMeldeStand(String(e?.message ?? "Melden nicht möglich"));
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: C.ink, color: C.text, fontFamily: SCHRIFT,
      padding: "28px 16px", display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <BackLink href="/ranking" label="Rangliste" />
      <div style={{ width: "100%", maxWidth: "var(--tqs-schirm-breite)" }}>
        {laedt ? (
          <div style={{ color: C.muted, fontSize: "0.875rem" }}>Wird geladen …</div>
        ) : !profil ? (
          <div style={{ color: C.muted, fontSize: "0.875rem" }}>Diesen Spieler gibt es nicht.</div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <AvatarKreis id={profil.avatar} size={56} />
              <div style={{ minWidth: 0 }}>
                <h1 style={{ fontSize: "1.375rem", fontWeight: 800, margin: 0 }}>
                  {profil.display_name}
                </h1>
                <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 2 }}>
                  {runden === 1 ? "Ihr spielt in einer Runde zusammen" : `Ihr spielt in ${runden} Runden zusammen`}
                </div>
              </div>
            </div>

            {/* ── Die Kurzbeschreibung ────────────────────── */}
            {profil.beschreibung ? (
              <p style={{
                marginTop: 16, background: C.surface, border: `1px solid ${C.line}`,
                borderRadius: RUND.karte, padding: "12px 14px",
                fontSize: "0.875rem", lineHeight: 1.55, whiteSpace: "pre-line",
              }}>
                {profil.beschreibung}
              </p>
            ) : (
              <p style={{ marginTop: 16, fontSize: "0.8125rem", color: C.muted }}>
                Hat noch nichts über sich geschrieben.
              </p>
            )}

            {/* 🔴 Melden. ⚠️ NUR bei fremden Profilen und nur, wenn es
                überhaupt einen Text gibt — ein Meldeknopf über einem leeren
                Feld ist eine Einladung zum Unfug. */}
            {!ichSelbst && user?.id && profil.beschreibung && (
              <div style={{ marginTop: 8 }}>
                {!offen ? (
                  <button type="button" onClick={() => setOffen(true)} style={{
                    ...TAPZIEL, background: "transparent", border: "none", cursor: "pointer",
                    color: C.muted, fontSize: "0.75rem", fontFamily: "inherit", padding: "4px 0",
                    textDecoration: "underline",
                  }}>
                    {bereitsGemeldet ? "Meldung ändern" : "Diesen Text melden"}
                  </button>
                ) : (
                  <div style={{
                    background: C.surface, border: `1px solid ${C.line}`,
                    borderRadius: RUND.karte, padding: "12px 14px",
                  }}>
                    <div style={{ fontSize: "0.875rem", fontWeight: 700 }}>Was stimmt nicht?</div>
                    {MELDE_GRUENDE.map((g) => (
                      <label key={g.key} style={{
                        display: "flex", gap: 8, alignItems: "flex-start",
                        marginTop: 8, cursor: "pointer",
                      }}>
                        <input type="radio" name="melde-grund" value={g.key}
                          checked={grund === g.key} onChange={() => setGrund(g.key)}
                          style={{ marginTop: 3, accentColor: C.akzent }} />
                        <span style={{ minWidth: 0 }}>
                          <span style={{ fontSize: "0.8125rem", fontWeight: 700 }}>{g.label}</span>
                          <span style={{ display: "block", fontSize: "0.6875rem", color: C.muted, lineHeight: 1.4 }}>
                            {g.hint}
                          </span>
                        </span>
                      </label>
                    ))}
                    <textarea value={notiz} rows={2} maxLength={NOTIZ_MAX + 20}
                      onChange={(e) => setNotiz(e.target.value)}
                      placeholder="Kurz dazuschreiben — bei „Etwas anderes“ nötig"
                      style={{
                        width: "100%", boxSizing: "border-box", marginTop: 10, resize: "vertical",
                        background: C.ink, color: C.text, fontFamily: "inherit",
                        fontSize: "0.8125rem", padding: "8px 10px",
                        border: `1px solid ${C.line}`, borderRadius: RUND.karte,
                      }} />
                    {/* ⚠️ Was passiert, steht VOR dem Absenden da. Eine Meldung
                        ist nichts, was man aus Versehen abschickt. */}
                    <p style={{ fontSize: "0.6875rem", color: C.muted, marginTop: 8, lineHeight: 1.45 }}>
                      Der Text wird mitgespeichert, wie er jetzt dasteht — sonst
                      ließe sich die Meldung durch eine Änderung entwerten.
                      Der Gemeldete erfährt nicht, wer ihn gemeldet hat.
                    </p>
                    {meldeStand && meldeStand !== "ok" && (
                      <div style={{ fontSize: "0.75rem", color: C.coral, marginTop: 6 }}>{meldeStand}</div>
                    )}
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button type="button" onClick={melden} disabled={!grund} style={{
                        ...TAPZIEL, flex: 1, cursor: grund ? "pointer" : "default",
                        background: grund ? C.coral : C.line, color: C.ink,
                        border: "none", borderRadius: RUND.karte, fontFamily: "inherit",
                        fontSize: "0.8125rem", fontWeight: 700,
                      }}>Melden</button>
                      <button type="button" onClick={() => { setOffen(false); setMeldeStand(null); }} style={{
                        ...TAPZIEL, flex: 1, cursor: "pointer", background: "transparent",
                        color: C.muted, border: `1px solid ${C.line}`, borderRadius: RUND.karte,
                        fontFamily: "inherit", fontSize: "0.8125rem",
                      }}>Abbrechen</button>
                    </div>
                  </div>
                )}
                {meldeStand === "ok" && (
                  <div style={{ fontSize: "0.75rem", color: C.mint, marginTop: 6 }}>
                    Danke — die Meldung ist eingegangen.
                  </div>
                )}
              </div>
            )}

            {/* ── Der Trophäenschrank ─────────────────────── */}
            <div style={{ marginTop: 26 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: "1rem", fontWeight: 700 }}>Trophäenschrank</span>
                <span style={{ fontFamily: MONO, fontSize: "0.8125rem", color: C.muted }}>
                  {erspielt.length}
                </span>
              </div>
              {/* 🔴 Der ehrliche Satz. Was hier steht, folgt aus den Runden, die
                  ihr TEILT — die anderen kann und darf ein Besucher nicht
                  lesen. Eine Zahl, die je nach Betrachter etwas anderes
                  bedeutet und so tut, als wäre sie absolut, ist schlimmer als
                  eine kleinere Zahl mit einem ehrlichen Satz daneben. */}
              <div style={{ fontSize: "0.6875rem", color: C.muted, marginTop: 2, lineHeight: 1.45 }}>
                Aus euren gemeinsamen Runden. Was in anderen Runden erspielt
                wurde, siehst du nicht.
              </div>
              {erspielt.length ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 14 }}>
                  {erspielt.map((a) => (
                    <div key={a.key} style={{ width: SCHEIBE, textAlign: "center" }}>
                      <Scheibe a={a} />
                      <div style={{ fontSize: "0.625rem", color: C.muted, marginTop: 4, lineHeight: 1.2 }}>
                        {a.label}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: "0.8125rem", color: C.muted, marginTop: 12 }}>
                  Noch nichts erspielt — in euren gemeinsamen Runden jedenfalls.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
