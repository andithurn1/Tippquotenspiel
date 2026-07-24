// ============================================================
//  AUFHOL-MECHANISMUS — „Anschluss halten"
//
//  Wenn der Abstand zur Spitze zu groß wird, steigen Zurückliegende aus. Diese
//  Regel gibt ihnen je Spieltag Punkte dazu, damit Mitspielen weiter lohnt.
//
//  Warum hier und nicht in scoreTip: Der Bonus hängt nicht an EINEM Spiel,
//  sondern am STAND vor dem jeweiligen Spieltag. Er lässt sich deshalb nur über
//  den kumulativen Verlauf berechnen — und iterativ, weil ein Bonus den Abstand
//  für den nächsten Spieltag verkleinert.
//
//  Reine Berechnung, kein UI, kein I/O.
//
//  ⚠️ Balance: Ein zu starker Ausgleich entwertet gutes Tippen — dann ist die
//  Tabelle beliebig. Deshalb greift der Bonus erst ab einer Schwelle, holt nur
//  einen ANTEIL des Rückstands auf (nie den ganzen) und ist über balanceSim
//  nachmessbar.
// ============================================================

// Wen betrifft es? Bewusst drei verständliche Stufen statt freier Formeln.
export const BETRIFFT = {
  letzter: { key: "letzter", label: "Nur der Letzte", desc: "Nur wer ganz hinten liegt." },
  "unteres-drittel": { key: "unteres-drittel", label: "Unteres Drittel", desc: "Das schwächste Drittel der Runde." },
  "unter-schnitt": { key: "unter-schnitt", label: "Alle unter dem Schnitt", desc: "Jeder unter dem Durchschnitt." },
};

// Voreinstellungen für den einfachen Regler — der Nutzer muss keine Zahlen
// verstehen, kann sie aber aufklappen.
export const STAERKE_STUFEN = [
  { key: "sanft", label: "Sanft", staerke: 0.10, schwelle: 0.30, hint: "Holt ein Zehntel des Rückstands auf, ab 30 % Abstand." },
  { key: "mittel", label: "Mittel", staerke: 0.20, schwelle: 0.20, hint: "Holt ein Fünftel auf, ab 20 % Abstand." },
  { key: "stark", label: "Stark", staerke: 0.35, schwelle: 0.10, hint: "Holt gut ein Drittel auf, schon ab 10 % Abstand." },
];

// Welche Einträge eines Standes sind berechtigt? board ist absteigend sortiert.
function berechtigte(board, betrifft) {
  if (!board.length) return [];
  if (betrifft === "letzter") return board.slice(-1);
  if (betrifft === "unter-schnitt") {
    const schnitt = board.reduce((s, b) => s + b.total, 0) / board.length;
    return board.filter((b) => b.total < schnitt);
  }
  // unteres Drittel (mindestens einer)
  const n = Math.max(1, Math.floor(board.length / 3));
  return board.slice(-n);
}

// Verlauf mit Aufhol-Boni anreichern.
//  history: [{ matchday, board: [{ userId, name, total, rank, … }] }] (kumulativ)
// Rückgabe: gleiche Struktur, `total` enthält den Bonus, zusätzlich `bonus`
// (kumuliert) je Eintrag und neu berechnete Ränge.
export function applyCatchup(history = [], rules) {
  const a = rules?.aufholen;
  if (!a?.enabled || !history.length) return history;

  const staerke = Number.isFinite(a.staerke) ? a.staerke : 0;
  const schwelle = Number.isFinite(a.schwelle) ? a.schwelle : 0;
  if (staerke <= 0) return history;

  const bonusVon = new Map();     // userId → kumulierter Bonus
  let letzterStand = null;        // Stand NACH dem vorigen Spieltag (inkl. Bonus)
  const out = [];

  for (const { matchday, board } of history) {
    // Bonus für DIESEN Spieltag aus dem Stand DAVOR — wer schon vorne liegt,
    // bekommt nichts, und am ersten Spieltag gibt es noch keinen Rückstand.
    if (letzterStand && letzterStand.length > 1) {
      const spitze = letzterStand[0].total;
      if (spitze > 0) {
        for (const e of berechtigte(letzterStand, a.betrifft)) {
          const rueckstand = spitze - e.total;
          // Erst ab der Schwelle (Anteil an der Spitze) greift die Hilfe.
          if (rueckstand <= spitze * schwelle) continue;
          const bonus = rueckstand * staerke;
          bonusVon.set(e.userId, (bonusVon.get(e.userId) ?? 0) + bonus);
        }
      }
    }

    const neu = board
      .map((e) => {
        const bonus = Math.round(bonusVon.get(e.userId) ?? 0);
        return { ...e, bonus, total: e.total + bonus };
      })
      .sort((x, y) => y.total - x.total || x.name.localeCompare(y.name))
      .map((e, i) => ({ ...e, rank: i + 1 }));

    letzterStand = neu;
    out.push({ matchday, board: neu });
  }
  return out;
}

// Endstand mit Aufhol-Boni (letzter Eintrag des angereicherten Verlaufs).
// Gibt null zurück, wenn es keinen Verlauf gibt — der Aufrufer nutzt dann sein
// normales Leaderboard.
export function catchupLeaderboard(history = [], rules) {
  if (!rules?.aufholen?.enabled) return null;
  const angereichert = applyCatchup(history, rules);
  return angereichert.length ? angereichert[angereichert.length - 1].board : null;
}
