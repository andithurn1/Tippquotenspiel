import { describe, it, expect } from "vitest";
import { leseAnmeldung, CODE_LAENGE } from "@/lib/anmeldung";

// So sieht die Adresse aus, die in der Standard-Mail von Supabase steht.
const LINK = "https://abcdefgh.supabase.co/auth/v1/verify"
  + "?token=pkce_9f8e7d6c5b4a&type=magiclink&redirect_to=https%3A%2F%2Ftippquotenspiel.vercel.app";

describe("leseAnmeldung — Code oder Link", () => {
  it("erkennt den sechsstelligen Code", () => {
    expect(leseAnmeldung("123456")).toEqual({ art: "code", token: "123456" });
    // Wer aus der Mail kopiert, schleppt gern Leerzeichen mit.
    expect(leseAnmeldung(" 123 456 ")).toEqual({ art: "code", token: "123456" });
  });

  it("liest Token UND Typ aus dem Link", () => {
    // 🔴 Der Typ wird ÜBERNOMMEN, nicht geraten: Supabase schickt je nach
    // Anlass `magiclink` oder `signup`, und mit dem falschen Typ lehnt
    // verifyOtp einen völlig gültigen Token ab.
    expect(leseAnmeldung(LINK)).toEqual({
      art: "link", token: "pkce_9f8e7d6c5b4a", typ: "magiclink",
    });
    expect(leseAnmeldung(LINK.replace("magiclink", "signup")).typ).toBe("signup");
  });

  it("nimmt auch die neuere Schreibweise `token_hash`", () => {
    // Welche in der Mail steht, hängt an der Supabase-Version — ein Nutzer
    // kann das nicht wissen, also müssen beide gehen.
    expect(leseAnmeldung(LINK.replace("token=", "token_hash=")).token).toBe("pkce_9f8e7d6c5b4a");
  });

  it("überlebt, was Mail-Programme anhängen", () => {
    expect(leseAnmeldung(`<${LINK}>`).token).toBe("pkce_9f8e7d6c5b4a");
    expect(leseAnmeldung(`\n${LINK}\n`).token).toBe("pkce_9f8e7d6c5b4a");
  });

  it("fehlt der Typ, gilt magiclink", () => {
    expect(leseAnmeldung("https://x.supabase.co/auth/v1/verify?token=abc").typ).toBe("magiclink");
  });

  it("meldet verständlich, was nicht geht", () => {
    expect(leseAnmeldung("").art).toBe("leer");
    expect(leseAnmeldung("   ").art).toBe("leer");
    // Eine zu kurze Zahl ist ein Tippfehler, kein Link — der Hinweis muss das
    // sagen, sonst sucht man am falschen Ende.
    const kurz = leseAnmeldung("1234");
    expect(kurz.art).toBe("unklar");
    expect(kurz.grund).toContain(String(CODE_LAENGE));
    expect(leseAnmeldung("hallo").art).toBe("unklar");
    // Ein Link ohne Anmelde-Kennung ist der gemeinste Fall: er sieht richtig aus.
    //
    // ⚠️ Hier stand bis zum 28.08.2026 `toContain("Token")` — und damit war
    // ausgerechnet das Werkstatt-Wort festgeschrieben, das der Nutzer nicht
    // kennt. Geprüft wird jetzt, was der Text LEISTEN muss: sagen, dass der
    // Link nicht taugt, und sagen, was zu tun ist.
    const ohne = leseAnmeldung("https://tippquotenspiel.vercel.app/");
    expect(ohne.art).toBe("unklar");
    expect(ohne.grund).toMatch(/unvollständig/i);
    expect(ohne.grund, "sagt nicht, was zu tun ist").toMatch(/neuen an/i);
  });
});
