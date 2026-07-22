// Kurzer, gut lesbarer Beitritts-Code für Runden (kein Verwechslungsrisiko:
// kein O/0, kein I/1). Getrennt von den Creator-Codes (encodePreset/
// decodePreset in engine.js): der Creator-Code transportiert ein Regelwerk
// als Text, dieser Code verweist auf eine konkrete, in der DB laufende Runde.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateJoinCode(length = 6) {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}
