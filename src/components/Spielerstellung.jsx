"use client";

import { useState, useMemo, useEffect } from "react";
import {
  DEFAULT_RULES, RULE_LIMITS,
  encodePreset, decodePreset, sanitizeRules,
} from "@/lib/engine";
import { PRESETS } from "@/lib/presets";
import { recommendedDisplayScale } from "@/lib/rulePreview";
import { isPremium } from "@/lib/premium";
import { TEAM_RATINGS } from "@/lib/bundesligaData";
import { getStore } from "@/lib/store";
import { useAuth } from "@/components/AuthProvider";
import { useCurrentRound } from "@/components/RoundProvider";
import BackLink from "@/components/BackLink";
import RegelVorschau from "@/components/RegelVorschau";
import PresetRating from "@/components/PresetRating";
import BalanceAmpel from "@/components/BalanceAmpel";

const ALL_TEAMS = Object.keys(TEAM_RATINGS);

// Ranking-Pool aus zwei verständlichen Reglern erzeugen: höchstes Gewicht und
// Anzahl der Stufen. Dazwischen gleichmäßig bis 1 herunter — so ist der Pool
// immer gültig (absteigend, ohne Dubletten), ohne dass der Admin einzelne
// Faktoren von Hand pflegen muss.
function buildWeightPool(max, anzahl) {
  const arr = [];
  for (let i = 0; i < anzahl; i++) {
    arr.push(+(max - ((max - 1) * i) / (anzahl - 1)).toFixed(1));
  }
  return [...new Set(arr)].sort((a, b) => b - a);
}

// ── Design-Tokens (gleich wie die anderen Screens) ──────────
const C = {
  ink: "#0B0E1F", ink2: "#12172E", surface: "#1A2040", surface2: "#232A50",
  line: "rgba(255,255,255,0.09)", text: "#EDEEF6", muted: "#8A90B4",
  gold: "#F5C451", coral: "#FF5470", mint: "#54E0A0",
};
const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

export default function Spielerstellung() {
  const { user } = useAuth();
  const { setRoundId } = useCurrentRound();
  // Start aus dem Standard-Preset (nicht aus DEFAULT_RULES): DEFAULT_RULES ist
  // der technische Fallback ohne Balance-Dämpfung — als Startwert für einen
  // Admin wäre das eine unausgewogene Runde.
  const [rules, setRules] = useState(() => sanitizeRules(PRESETS[0].rules));
  const [presetKey, setPresetKey] = useState("standard");
  const [teamFilterOn, setTeamFilterOn] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [imp, setImp] = useState("");
  const [impErr, setImpErr] = useState("");
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(null);
  const [createErr, setCreateErr] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);
  const [shortCode, setShortCode] = useState(null);   // veröffentlichter Kurzcode
  const [publishing, setPublishing] = useState(false);
  const [shortCopied, setShortCopied] = useState(false);

  // Jede Regeländerung macht einen zuvor erzeugten Kurzcode ungültig (er zeigt
  // sonst auf ein altes Regelwerk).
  const touched = () => { setPresetKey(null); setShortCode(null); };
  const applyPreset = (preset) => {
    setPresetKey(preset.key); setShortCode(null);
    setRules({ ...sanitizeRules(preset.rules), name: preset.label });
  };
  const patch = (p) => { touched(); setRules((r) => ({ ...r, ...p })); };
  const patchCombo = (p) => { touched(); setRules((r) => ({ ...r, combo: { ...r.combo, ...p } })); };
  const patchMarkets = (p) => { touched(); setRules((r) => ({ ...r, markets: { ...r.markets, ...p } })); };
  const patchGoals = (p) => { touched(); setRules((r) => ({ ...r, markets: { ...r.markets, goals: { ...r.markets.goals, ...p } } })); };
  const patchJoker = (p) => { touched(); setRules((r) => ({ ...r, joker: { ...r.joker, ...p } })); };

  // Empfohlene Anzeige-Skalierung — hängt am Regelwerk inkl. Joker-Faktor.
  const empfohleneSkala = useMemo(() => recommendedDisplayScale(rules), [rules]);

  // Premium des Admins: schaltet die Gewichtung frei. Die Anzeige hier ist
  // nur Komfort — durchgesetzt wird beim Anlegen im Store (applyEntitlements).
  const [premium, setPremium] = useState(false);
  useEffect(() => {
    if (!user) { setPremium(false); return; }
    let live = true;
    getStore().getProfile(user.id)
      .then((p) => { if (live) setPremium(isPremium(p)); })
      .catch(() => {});
    return () => { live = false; };
  }, [user]);

  const code = useMemo(() => encodePreset(rules), [rules]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { /* Clipboard nicht verfügbar — Nutzer kann den Code markieren */ }
  };

  // Lädt entweder einen langen Text-Creator-Code (TS1-…) oder einen kurzen
  // Content-Creator-Code (server-gespeichertes Preset).
  const load = async () => {
    const val = imp.trim();
    setImpErr("");
    if (val.startsWith("TS1-")) {
      try { setPresetKey(null); setRules(sanitizeRules(decodePreset(val))); setImp(""); }
      catch { setImpErr("Kein gültiger Creator-Code (TS1-…)"); }
      return;
    }
    try {
      const preset = await getStore().getPresetByCode(val);
      if (!preset) { setImpErr("Kein Regelwerk unter diesem Code gefunden."); return; }
      setPresetKey(null);
      setRules({ ...sanitizeRules(preset.rules), name: preset.name || sanitizeRules(preset.rules).name });
      setImp("");
    } catch { setImpErr("Konnte den Code nicht laden. Später erneut versuchen."); }
  };

  // Veröffentlicht das aktuelle Regelwerk unter einem kurzen, teilbaren Code.
  const publish = async () => {
    if (!user) { setImpErr("Zum Erstellen eines Kurzcodes bitte einloggen."); return; }
    setPublishing(true);
    try {
      const p = await getStore().publishPreset({ name: rules.name, rules, creatorId: user.id });
      setShortCode(p.code);
    } catch { setImpErr("Kurzcode konnte nicht erstellt werden. Später erneut versuchen."); }
    finally { setPublishing(false); }
  };

  const copyShort = async () => {
    if (!shortCode) return;
    try { await navigator.clipboard.writeText(shortCode); setShortCopied(true); setTimeout(() => setShortCopied(false), 1500); }
    catch { /* Nutzer kann den Code markieren */ }
  };

  const toggleTeam = (team) =>
    setSelectedTeams((prev) => prev.includes(team) ? prev.filter((t) => t !== team) : [...prev, team]);

  const teamFilterInvalid = teamFilterOn && selectedTeams.length < 2;

  const createRound = async () => {
    if (!user) { setCreateErr("Bitte zuerst einloggen (Startseite)."); return; }
    if (teamFilterInvalid) { setCreateErr("Bitte mindestens 2 Teams auswählen (oder Team-Auswahl ausschalten)."); return; }
    setCreating(true); setCreateErr("");
    try {
      const round = await getStore().createRound({
        name: rules.name, adminId: user.id, adminName: user.name, rules,
        teamFilter: teamFilterOn ? selectedTeams : null,
      });
      setCreated(round);
      setRoundId(round.id);
    } catch {
      setCreateErr("Runde konnte nicht angelegt werden. Später erneut versuchen.");
    } finally {
      setCreating(false);
    }
  };

  const copyJoinCode = async () => {
    if (!created) return;
    try { await navigator.clipboard.writeText(created.join_code); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 1500); }
    catch { /* Nutzer kann den Code markieren */ }
  };

  const L = RULE_LIMITS;
  const g = rules.markets.goals;
  const j = rules.joker;

  return (
    <div style={{
      minHeight: "100vh", background: C.ink, color: C.text,
      fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
      padding: "28px 16px", display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <BackLink href="/menu" label="Menü" />
      <div style={{
        width: "100%", maxWidth: 400, position: "relative",
        borderRadius: 26, overflow: "hidden",
        background: `radial-gradient(120% 80% at 50% -10%, ${C.ink2} 0%, ${C.ink} 60%)`,
        border: `1px solid ${C.line}`, boxShadow: "0 30px 80px -30px rgba(0,0,0,0.8)",
      }}>
        <div style={{
          position: "absolute", top: -90, left: "50%", transform: "translateX(-50%)",
          width: 320, height: 200, pointerEvents: "none",
          background: `radial-gradient(circle, ${C.mint}22 0%, transparent 70%)`,
        }} />

        <div style={{ position: "relative", padding: "26px 22px 24px" }}>
          {/* Kopf */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: 2, color: C.muted, textTransform: "uppercase" }}>
              Spiel erstellen
            </span>
            <button onClick={() => { setRules(DEFAULT_RULES); setPresetKey("standard"); }} style={{
              fontFamily: MONO, fontSize: 11, color: C.muted, cursor: "pointer",
              background: C.surface, border: `1px solid ${C.line}`, borderRadius: 999, padding: "4px 10px",
            }}>zurücksetzen</button>
          </div>
          <div style={{ marginTop: 6, fontSize: 18, fontWeight: 700 }}>Regelwerk einstellen</div>
          <p style={{ fontSize: 12.5, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
            Du als Admin legst fest, wie mutig belohnt wird. Teile das fertige Regelwerk
            per Creator-Code — alle Mitspieler bekommen exakt dieselben Regeln.
          </p>

          {/* Presets: Startpunkt, danach bleibt alles frei einstellbar */}
          <SectionTitle>Presets</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 4 }}>
            {PRESETS.map((p) => {
              const active = presetKey === p.key;
              return (
                <button key={p.key} onClick={() => applyPreset(p)} style={{
                  textAlign: "left", cursor: "pointer", fontFamily: "inherit",
                  background: active ? `${C.gold}14` : C.surface,
                  border: `1px solid ${active ? C.gold + "66" : C.line}`,
                  borderRadius: 14, padding: "12px 14px", color: C.text,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>
                      {p.label}
                      {/* Ohne Premium greift der Joker-Anteil nicht — das gehört
                          sichtbar an den Preset, nicht erst in eine Fehlermeldung. */}
                      {p.premium && !premium && (
                        <span style={{ fontSize: 12, color: C.gold, marginLeft: 6 }} title="Premium-Funktion">🔒</span>
                      )}
                    </span>
                    {active && (
                      <span style={{
                        fontFamily: MONO, fontSize: 10, color: C.gold, border: `1px solid ${C.gold}55`,
                        borderRadius: 999, padding: "2px 8px", textTransform: "uppercase", letterSpacing: 1,
                      }}>gewählt</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 1.4 }}>{p.desc}</div>
                </button>
              );
            })}
          </div>
          <p style={{ fontSize: 11, color: C.muted, marginTop: 6, lineHeight: 1.4 }}>
            Nur ein Startpunkt — alle Regler unten bleiben danach frei einstellbar.
          </p>

          {/* Name */}
          <Field label="Modus-Name">
            <input value={rules.name} maxLength={40} onChange={(e) => patch({ name: e.target.value })}
              placeholder="z. B. Hardcore-Runde" style={{
                width: "100%", boxSizing: "border-box", background: C.surface, color: C.text,
                border: `1px solid ${C.line}`, borderRadius: 12, padding: "10px 12px",
                fontSize: 14, fontFamily: "inherit", outline: "none",
              }} />
          </Field>

          {/* Live-Vorschau über typische Spielarten */}
          <RegelVorschau rules={rules} />

          {/* Balance-Ampel: eine Aussage, ob die Runde noch ein Tippspiel bleibt */}
          <BalanceAmpel rules={rules} />

          {/* Reale Verteilung + Underdog-Neigung des Regelwerks */}
          <PresetRating rules={rules} />

          {/* Schärfe */}
          <SectionTitle>Schärfe der Nähe-Belohnung</SectionTitle>
          <Slider label="Ergebnis-Nähe (k)" value={rules.k} {...L.k} onChange={(v) => patch({ k: v })}
            hint="Höher = die Belohnung fällt mit jedem Tor Abstand steiler ab (Underdog-Regler)." />
          <Slider label="Team-Tore-Nähe (m)" value={rules.m} {...L.m} onChange={(v) => patch({ m: v })}
            hint="Steilheit der siegerunabhängigen Team-Tore-Nähe." />

          {/* Underdog-Boost & Favoriten-Malus (teilen sich die Quoten-Ramp) */}
          <SectionTitle>Underdog-Boost & Favoriten-Malus</SectionTitle>
          <p style={{ fontSize: 11.5, color: C.muted, marginTop: -6, marginBottom: 10, lineHeight: 1.4 }}>
            Belohne das Vorhersagen von Überraschungen — und/oder bestrafe, wer stur auf den
            Favoriten setzt, wenn der patzt. Beide wirken nur bei echten Außenseiter-Siegen
            und werden über dieselbe Sieger-Quote skaliert.
          </p>
          <Slider label="Underdog-Boost (×)" value={rules.underdogBoost} {...L.underdogBoost}
            onChange={(v) => patch({ underdogBoost: v })} fmt={(x) => "×" + x.toFixed(1)}
            hint="1,0 = aus. Höher = korrekt getippte Außenseiter-Siege zahlen zusätzlich mehr." />
          <Slider label="Favoriten-Reinfall-Malus" value={rules.favFlopPenalty} {...L.favFlopPenalty}
            onChange={(v) => patch({ favFlopPenalty: v })} fmt={(x) => x === 0 ? "aus" : "−" + x}
            hint="Abzug, wenn du den Favoriten getippt hast und der real verliert. Gedeckelt bei 0 (kein tiefes Minus)." />
          {(rules.underdogBoost > 1 || rules.favFlopPenalty > 0) && (
            <>
              <Slider label="Wirkt ab Sieger-Quote" value={rules.underdogRampStart} {...L.underdogRampStart}
                onChange={(v) => patch({ underdogRampStart: v })} fmt={(x) => x.toFixed(1)}
                hint="Unterhalb dieser Quote gilt der Sieger nicht als Außenseiter — kein Boost, kein Malus." />
              <Slider label="Volle Wirkung ab Sieger-Quote" value={rules.underdogRampEnd} {...L.underdogRampEnd}
                onChange={(v) => patch({ underdogRampEnd: v })} fmt={(x) => x.toFixed(1)}
                hint="Dazwischen fließender Übergang statt hartem Cutoff." />
            </>
          )}

          {/* Kombi-Multiplikatoren */}
          <SectionTitle>Kombi-Multiplikatoren (Tore × Ebene)</SectionTitle>
          <Slider label="bei richtiger Tendenz" value={rules.combo.tendenz} {...L.combo.tendenz}
            onChange={(v) => patchCombo({ tendenz: v })} fmt={(x) => "×" + x.toFixed(2)} />
          <Slider label="bei richtigem Abstand" value={rules.combo.abstand} {...L.combo.abstand}
            onChange={(v) => patchCombo({ abstand: v })} fmt={(x) => "×" + x.toFixed(2)} />
          <Slider label="bei exaktem Ergebnis" value={rules.combo.exakt} {...L.combo.exakt}
            onChange={(v) => patchCombo({ exakt: v })} fmt={(x) => "×" + x.toFixed(1)} />

          {/* Skala & Cutoffs */}
          <SectionTitle>Anzeige & Cutoffs</SectionTitle>
          <Slider label="Punkte-Skalierung" value={rules.displayScale} {...L.displayScale}
            onChange={(v) => patch({ displayScale: v })} fmt={(x) => "×" + x}
            hint="Nur Optik: macht schöne hohe Zahlen. Fairness & Ranking bleiben unberührt." />
          {rules.displayScale !== empfohleneSkala && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
              background: `${C.gold}12`, border: `1px solid ${C.gold}33`, borderRadius: 12,
              padding: "9px 12px", marginBottom: 10,
            }}>
              <span style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.4 }}>
                Empfohlen: <strong style={{ color: C.gold }}>×{empfohleneSkala}</strong> — hält
                exakte Tipps bei angenehmen Werten{j.enabled ? " (Gewichtung eingerechnet)" : ""}.
              </span>
              <button onClick={() => patch({ displayScale: empfohleneSkala })} style={{
                cursor: "pointer", fontSize: 12, fontFamily: "inherit", fontWeight: 700,
                background: C.surface2, color: C.gold, border: `1px solid ${C.gold}44`,
                borderRadius: 10, padding: "7px 12px", whiteSpace: "nowrap",
              }}>übernehmen</button>
            </div>
          )}
          <Slider label="Mindest-Auszahlung (Cutoff)" value={rules.minPayout} {...L.minPayout}
            onChange={(v) => patch({ minPayout: v })} fmt={(x) => x.toFixed(1)}
            hint="Nähe-Boni unter diesem Wert zählen nicht." />

          {/* Deckel */}
          <Toggle label="Harter Punkte-Deckel pro Spiel"
            on={rules.perGameCap != null}
            onChange={(on) => patch({ perGameCap: on ? 1000 : null })} />
          {rules.perGameCap != null && (
            <Slider label="Deckel" value={rules.perGameCap} {...L.perGameCap}
              onChange={(v) => patch({ perGameCap: v })} fmt={(x) => String(x)} />
          )}

          {/* Strafe */}
          <SectionTitle>Sieger-Boden & Strafe</SectionTitle>
          <Toggle label="Sieger-Boden (richtiger Sieger zahlt mind. Quote−1)"
            on={rules.winnerFloor} onChange={(on) => patch({ winnerFloor: on })} />
          <Slider label="Strafe bei komplett falsch" value={rules.wrongPenalty} {...L.wrongPenalty}
            onChange={(v) => patch({ wrongPenalty: v })} fmt={(x) => x === 0 ? "aus" : x.toFixed(1)}
            hint="0 = keine Strafe. Negativ = Minuspunkte, wenn weder Sieger noch Nähe stimmen." />

          {/* Märkte */}
          <SectionTitle>Märkte</SectionTitle>
          <Toggle label="Ergebnis-Tipp" on={rules.markets.result}
            onChange={(on) => patchMarkets({ result: on })} />
          <Toggle label="Torschützen-Tipp" on={g.enabled}
            onChange={(on) => patchGoals({ enabled: on })} />
          {g.enabled && (
            <div style={{ paddingLeft: 12, borderLeft: `1px solid ${C.line}`, marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
                <span style={{ fontSize: 13, color: C.muted }}>Picks pro Team</span>
                <Stepper value={g.picksPerTeam} min={L.picksPerTeam.min} max={L.picksPerTeam.max}
                  onStep={(d) => patchGoals({ picksPerTeam: Math.min(L.picksPerTeam.max, Math.max(L.picksPerTeam.min, g.picksPerTeam + d)) })} />
              </div>
              <Toggle label="Doppelpack erlaubt" on={g.allowDouble}
                onChange={(on) => patchGoals({ allowDouble: on })} />
              <Toggle label="Backup-Schützen erlaubt" on={g.allowBackups}
                onChange={(on) => patchGoals({ allowBackups: on })} />
            </div>
          )}

          {/* Joker / Gewichtung */}
          <SectionTitle>Joker &amp; Gewichtung</SectionTitle>
          <p style={{ fontSize: 11.5, color: C.muted, marginTop: -6, marginBottom: 10, lineHeight: 1.4 }}>
            Lässt Tipper einzelne Spiele höher gewichten. Der Faktor greift auf die
            fertige Wertung — Ergebnis <em>und</em> Torschützen zusammen — und wirkt in
            beide Richtungen: ein gewichtetes Spiel, das danebengeht, tut auch mehr weh.
          </p>
          {!premium ? (
            <div style={{
              background: `${C.gold}12`, border: `1px solid ${C.gold}44`,
              borderRadius: 14, padding: "13px 15px", marginBottom: 8,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.gold }}>
                🔒 Premium-Funktion
              </div>
              <p style={{ fontSize: 11.5, color: C.muted, margin: "7px 0 0", lineHeight: 1.5 }}>
                Es genügt, wenn <strong>du als Admin</strong> Premium hast — die ganze
                Runde kann dann gewichten. Alle anderen Regler bleiben frei nutzbar.
              </p>
            </div>
          ) : (
            <Toggle label="Gewichtung erlauben" on={j.enabled}
              onChange={(on) => patchJoker({ enabled: on })} />
          )}

          {premium && j.enabled && (
            <div style={{ paddingLeft: 12, borderLeft: `1px solid ${C.line}`, marginBottom: 8 }}>
              <Field label="Modus">
                <div style={{ display: "flex", gap: 6 }}>
                  {[
                    { key: "einzel", label: "Ein Joker", hint: "Ein Spiel pro Spieltag" },
                    { key: "ranking", label: "Rangliste", hint: "Alle Spiele ranken" },
                  ].map((m) => {
                    const on = j.modus === m.key;
                    return (
                      <button key={m.key} onClick={() => patchJoker({ modus: m.key })} style={{
                        cursor: "pointer", fontSize: 12, fontFamily: "inherit", padding: "8px 12px",
                        borderRadius: 10, flex: 1, textAlign: "left",
                        background: on ? `${C.gold}22` : C.surface, color: on ? C.gold : C.muted,
                        border: `1px solid ${on ? C.gold + "66" : C.line}`,
                      }}>
                        <div style={{ fontWeight: 700 }}>{m.label}</div>
                        <div style={{ fontSize: 10.5, opacity: 0.8, marginTop: 2 }}>{m.hint}</div>
                      </button>
                    );
                  })}
                </div>
              </Field>

              {/* Im Ranking-Modus ist der Pool die Wahrheit — sonst zeigte der
                  Regler einen anderen Wert als die Stufen darunter. */}
              <Slider label={j.modus === "ranking" ? "Höchstes Gewicht" : "Joker-Faktor"}
                value={j.modus === "ranking" ? j.faktoren[0] : j.faktor} {...L.joker.faktor}
                onChange={(v) => patchJoker(j.modus === "ranking"
                  ? { faktor: v, faktoren: buildWeightPool(v, j.faktoren.length) }
                  : { faktor: v })}
                fmt={(x) => "×" + x.toFixed(1)}
                hint={j.modus === "ranking"
                  ? "Das stärkste Gewicht der Rangliste. Die übrigen Stufen liegen gleichmäßig darunter."
                  : "Womit das markierte Spiel multipliziert wird."} />

              {j.modus === "ranking" && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
                    <span style={{ fontSize: 13, color: C.muted }}>Stufen</span>
                    <Stepper value={j.faktoren.length} min={L.joker.anzahlFaktoren.min} max={L.joker.anzahlFaktoren.max}
                      onStep={(d) => {
                        const n = Math.min(L.joker.anzahlFaktoren.max, Math.max(L.joker.anzahlFaktoren.min, j.faktoren.length + d));
                        patchJoker({ faktoren: buildWeightPool(j.faktor, n) });
                      }} />
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {j.faktoren.map((f) => (
                      <span key={f} style={{
                        fontSize: 12, fontFamily: MONO, padding: "5px 10px", borderRadius: 999,
                        background: f > 1 ? `${C.gold}18` : C.surface,
                        color: f > 1 ? C.gold : C.muted,
                        border: `1px solid ${f > 1 ? C.gold + "44" : C.line}`,
                      }}>×{f.toFixed(1)}</span>
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: C.muted, marginBottom: 8, lineHeight: 1.4 }}>
                    Jedes Gewicht darf pro Spieltag nur <strong>einmal</strong> vergeben werden —
                    alle haben denselben Pool, die Verteilung ist die Kunst. Übrige Spiele zählen ×1,0.
                  </p>
                </>
              )}

              {/* Gemeinsame Abstimmung, an welchen Spieltagen es einen Joker gibt */}
              <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 6, paddingTop: 10 }}>
                <Toggle label="Spieltage gemeinsam abstimmen" on={j.abstimmung === true}
                  onChange={(on) => patchJoker({ abstimmung: on })} />
                <p style={{ fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>
                  {j.abstimmung
                    ? "Die Runde stimmt ab: Joker gibt es nur an Spieltagen mit Mehrheit."
                    : "Aus = Joker an jedem Spieltag. An = die Runde entscheidet per Mehrheit, welche Spieltage einen Joker bekommen."}
                </p>
              </div>
            </div>
          )}

          {/* Teams */}
          <SectionTitle>Teams</SectionTitle>
          <p style={{ fontSize: 11.5, color: C.muted, marginTop: -6, marginBottom: 10, lineHeight: 1.4 }}>
            Standardmäßig zählen alle Bundesliga-Spiele. Willst du dich auf bestimmte Teams
            beschränken (z. B. weniger Aufwand mit Torschützen, oder ihr wollt nur eure
            Lieblingsklubs plus Nachbarschaftsduelle), wählt hier mindestens 2 Teams —
            ein Spiel zählt für diese Runde, sobald mindestens eine Seite dabei ist.
          </p>
          <Toggle label="Auf bestimmte Teams beschränken" on={teamFilterOn}
            onChange={(on) => setTeamFilterOn(on)} />
          {teamFilterOn && (
            <div style={{ marginTop: 8, marginBottom: 8 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {ALL_TEAMS.map((team) => {
                  const on = selectedTeams.includes(team);
                  return (
                    <button key={team} onClick={() => toggleTeam(team)} style={{
                      cursor: "pointer", fontSize: 12, fontFamily: "inherit", padding: "6px 10px", borderRadius: 999,
                      background: on ? `${C.mint}22` : C.surface, color: on ? C.mint : C.muted,
                      border: `1px solid ${on ? C.mint + "66" : C.line}`,
                    }}>{team}</button>
                  );
                })}
              </div>
              <div style={{ fontSize: 11, color: teamFilterInvalid ? C.coral : C.muted, marginTop: 8 }}>
                {selectedTeams.length} von mindestens 2 Teams ausgewählt
                {teamFilterInvalid && " — bitte noch mindestens ein weiteres Team wählen"}.
              </div>
            </div>
          )}

          {/* Runde erstellen */}
          <SectionTitle>Runde erstellen</SectionTitle>
          {!created ? (
            <>
              <p style={{ fontSize: 12.5, color: C.muted, marginTop: -4, marginBottom: 10, lineHeight: 1.5 }}>
                Legt mit diesem Regelwerk eine echte Runde an. Du wirst Admin,
                bekommst einen Beitritts-Code zum Teilen, und diese Runde wird
                deine aktive Runde zum Tippen.
              </p>
              {!user && (
                <p style={{ fontSize: 12, color: C.gold, marginBottom: 10 }}>
                  Bitte zuerst auf der Startseite einloggen.
                </p>
              )}
              <button onClick={createRound} disabled={creating || !user || teamFilterInvalid} style={{
                width: "100%", cursor: creating || !user || teamFilterInvalid ? "default" : "pointer",
                background: C.mint, color: C.ink, fontWeight: 700, fontSize: 14,
                border: "none", borderRadius: 14, padding: "13px 0", opacity: creating || !user || teamFilterInvalid ? 0.6 : 1,
              }}>
                {creating ? "wird angelegt …" : "Runde jetzt erstellen"}
              </button>
              {createErr && <div style={{ fontSize: 12, color: C.coral, marginTop: 6 }}>{createErr}</div>}
            </>
          ) : (
            <div style={{ background: `${C.mint}12`, border: `1px solid ${C.mint}44`, borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.mint }}>✓ „{created.name}" ist angelegt — deine aktive Runde</div>
              <div style={{ marginTop: 10, fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>Beitritts-Code</div>
              <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: C.gold, marginTop: 4, letterSpacing: 3 }}>{created.join_code}</div>
              <button onClick={copyJoinCode} style={{
                marginTop: 10, width: "100%", cursor: "pointer",
                background: codeCopied ? C.mint : C.surface2, color: codeCopied ? C.ink : C.text, fontWeight: 700, fontSize: 13,
                border: `1px solid ${C.line}`, borderRadius: 12, padding: "10px 0",
              }}>{codeCopied ? "✓ kopiert" : "Code kopieren"}</button>
              <p style={{ fontSize: 11, color: C.muted, marginTop: 8, lineHeight: 1.4 }}>
                Freunde geben diesen Code unter „Runde beitreten" ein.
              </p>
            </div>
          )}

          {/* Creator-Code */}
          <SectionTitle>Creator-Code</SectionTitle>
          <div style={{
            background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12,
            padding: "10px 12px", fontFamily: MONO, fontSize: 12, color: C.gold,
            wordBreak: "break-all", lineHeight: 1.5,
          }}>{code}</div>
          <button onClick={copy} style={{
            marginTop: 10, width: "100%", cursor: "pointer",
            background: copied ? C.mint : C.gold, color: C.ink, fontWeight: 700, fontSize: 14,
            border: "none", borderRadius: 14, padding: "13px 0", transition: "background .2s",
          }}>{copied ? "✓ kopiert" : "Langen Code kopieren & teilen"}</button>

          {/* Kurzcode (Content-Creator) */}
          <div style={{ marginTop: 14, background: C.ink2, border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ fontSize: 12.5, fontWeight: 700 }}>Kurzcode statt langem Code</div>
            <p style={{ fontSize: 11, color: C.muted, margin: "4px 0 10px", lineHeight: 1.4 }}>
              Speichert dein Regelwerk unter einem kurzen, merkbaren Code — perfekt zum
              Teilen (z. B. von Content-Creatorn). Andere laden ihn unten einfach ein.
            </p>
            {!shortCode ? (
              <button onClick={publish} disabled={publishing || !user} style={{
                width: "100%", cursor: publishing || !user ? "default" : "pointer",
                background: C.surface2, color: user ? C.text : C.muted, fontWeight: 700, fontSize: 13,
                border: `1px solid ${C.line}`, borderRadius: 12, padding: "11px 0", opacity: publishing || !user ? 0.6 : 1,
              }}>{publishing ? "wird erstellt …" : user ? "Kurzcode erstellen & teilen" : "Zum Erstellen einloggen"}</button>
            ) : (
              <div>
                <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 700, color: C.gold, letterSpacing: 3, textAlign: "center" }}>{shortCode}</div>
                <button onClick={copyShort} style={{
                  marginTop: 8, width: "100%", cursor: "pointer",
                  background: shortCopied ? C.mint : C.surface2, color: shortCopied ? C.ink : C.text, fontWeight: 700, fontSize: 13,
                  border: `1px solid ${C.line}`, borderRadius: 12, padding: "10px 0",
                }}>{shortCopied ? "✓ kopiert" : "Kurzcode kopieren"}</button>
              </div>
            )}
          </div>

          {/* Import: langer ODER kurzer Code */}
          <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
            <input value={imp} onChange={(e) => { setImp(e.target.value); setImpErr(""); }}
              placeholder="Code laden (TS1-… oder Kurzcode)" style={{
                flex: 1, minWidth: 0, background: C.ink2, color: C.text, border: `1px solid ${C.line}`,
                borderRadius: 12, padding: "10px 12px", fontSize: 13, fontFamily: MONO, outline: "none",
              }} />
            <button onClick={load} disabled={!imp.trim()} style={{
              cursor: imp.trim() ? "pointer" : "default", background: C.surface2,
              color: imp.trim() ? C.text : C.muted, border: `1px solid ${C.line}`,
              borderRadius: 12, padding: "0 16px", fontSize: 13, fontWeight: 600,
            }}>Laden</button>
          </div>
          {impErr && <div style={{ fontSize: 12, color: C.coral, marginTop: 6 }}>{impErr}</div>}
        </div>
      </div>
    </div>
  );
}


function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 1,
      marginTop: 22, marginBottom: 12, paddingBottom: 6, borderBottom: `1px solid ${C.line}`,
    }}>{children}</div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}

function Slider({ label, hint, value, min, max, step, onChange, fmt }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ fontSize: 13 }}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: 13, color: C.gold }}>{fmt ? fmt(value) : value.toFixed(2)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(+e.target.value)}
        style={{ width: "100%", accentColor: C.gold, cursor: "pointer" }} />
      {hint && <div style={{ fontSize: 11, color: C.muted, marginTop: 4, lineHeight: 1.4 }}>{hint}</div>}
    </div>
  );
}

function Toggle({ label, on, onChange }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%",
      textAlign: "left", gap: 12, marginBottom: 8, cursor: "pointer", color: C.text,
      background: C.surface, border: `1px solid ${on ? C.mint + "55" : C.line}`,
      borderRadius: 12, padding: "10px 14px", fontSize: 13, fontFamily: "inherit",
    }}>
      <span>{label}</span>
      <span style={{
        flexShrink: 0, width: 38, height: 22, borderRadius: 999,
        background: on ? C.mint : C.surface2, position: "relative", transition: "background .2s",
      }}>
        <span style={{
          position: "absolute", top: 2, left: on ? 18 : 2, width: 18, height: 18,
          borderRadius: 999, background: "#fff", transition: "left .2s",
        }} />
      </span>
    </button>
  );
}

function Stepper({ value, min, max, onStep }) {
  const b = (dis) => ({
    width: 30, height: 30, borderRadius: 8, cursor: dis ? "default" : "pointer",
    background: C.surface2, color: dis ? C.muted : C.text, border: `1px solid ${C.line}`,
    fontSize: 18, lineHeight: 1,
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button onClick={() => onStep(-1)} disabled={value <= min} style={b(value <= min)}>−</button>
      <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 18, color: C.gold, width: 18, textAlign: "center" }}>{value}</span>
      <button onClick={() => onStep(1)} disabled={value >= max} style={b(value >= max)}>+</button>
    </div>
  );
}
