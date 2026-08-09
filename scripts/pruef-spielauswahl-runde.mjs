import { createMockStore } from "../src/lib/store.mock.js";
import { DEFAULT_RULES, sanitizeRules } from "../src/lib/engine.js";
import { filterSpiele } from "../src/lib/spielauswahl.js";

const faelle = [
  ["nur Bundesliga",        { wettbewerbe: ["bl"] }],
  ["nur CL ab Achtelfinale",{ wettbewerbe: ["cl"], phasen: ["achtelfinale","viertelfinale","halbfinale","finale"] }],
  ["nur Spieltag 30-34",    { spieltagVon: 30, spieltagBis: 34 }],
  ["Abstiegskampf BL",      { jeWettbewerb: { bl: { spieltagVon: 30, zonen: [{ von: 14, bis: 18 }] } } }],
];

for (const [name, spiele] of faelle) {
  const rules = sanitizeRules({ ...DEFAULT_RULES, spiele });
  const st = createMockStore();
  const rnd = await st.createRound({ name, adminId: "u-0", rules });
  const inRunde = await st.listRoundMatches(rnd.id);
  const alle = await st.listMatches();
  const nachRegel = filterSpiele(alle, rules.spiele);
  console.log(`${name.padEnd(26)} Regelwerk sagt ${String(nachRegel.length).padStart(5)} · Runde liefert ${String(inRunde.length).padStart(5)} · ${nachRegel.length === inRunde.length ? "gleich" : "⚠️ ABWEICHUNG"}`);
}
