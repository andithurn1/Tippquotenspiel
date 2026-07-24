import { describe, it, expect } from "vitest";
import {
  AVATARS, DEFAULT_AVATAR, NAME_LIMITS,
  getAvatar, avatarColor, sanitizeAvatar, sanitizeDisplayName,
  isUploadedAvatar, uploadedAvatarUrl, UPLOAD_PREFIX,
} from "./avatars";

describe("Avatar-Katalog", () => {
  it("hat eindeutige ids und überall eine gültige Farbe", () => {
    const ids = AVATARS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of AVATARS) {
      expect(a.emoji).toBeTruthy();
      expect(a.label).toBeTruthy();
      expect(avatarColor(a.id)).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("getAvatar fällt bei Unbekanntem auf den Standard zurück", () => {
    expect(getAvatar("gibts-nicht").id).toBe(DEFAULT_AVATAR);
    expect(getAvatar(undefined).id).toBe(DEFAULT_AVATAR);
    expect(getAvatar(AVATARS[3].id).id).toBe(AVATARS[3].id);
  });
});

describe("sanitizeAvatar", () => {
  it("lässt bekannte ids durch, ersetzt alles andere", () => {
    expect(sanitizeAvatar("fan-pokal")).toBe("fan-pokal");
    expect(sanitizeAvatar("<script>")).toBe(DEFAULT_AVATAR);
    expect(sanitizeAvatar(null)).toBe(DEFAULT_AVATAR);
  });

  it("blockt Uploads, solange sie nicht freigeschaltet sind", () => {
    const hoch = UPLOAD_PREFIX + "https://example.com/ich.jpg";
    expect(sanitizeAvatar(hoch)).toBe(DEFAULT_AVATAR);              // Standard: aus
    expect(sanitizeAvatar(hoch, { allowUploads: true })).toBe(hoch); // bewusst erlaubt
  });

  it("erkennt Upload-Werte und liest die Adresse heraus", () => {
    expect(isUploadedAvatar("fan-bier")).toBe(false);
    expect(uploadedAvatarUrl(UPLOAD_PREFIX + "https://x/y.png")).toBe("https://x/y.png");
    expect(uploadedAvatarUrl("fan-bier")).toBeNull();
  });
});

describe("sanitizeDisplayName", () => {
  it("behält normale Namen inklusive Leerzeichen und Bindestrich", () => {
    expect(sanitizeDisplayName("Anna Meier")).toBe("Anna Meier");
    expect(sanitizeDisplayName("Klaus-Peter")).toBe("Klaus-Peter");
  });

  it("trimmt, zieht Mehrfach-Leerzeichen zusammen und entfernt Steuerzeichen", () => {
    expect(sanitizeDisplayName("  Anna   Meier  ")).toBe("Anna Meier");
    const mitSteuerzeichen = "An" + String.fromCharCode(0) + "na" + String.fromCharCode(31);
    expect(sanitizeDisplayName(mitSteuerzeichen)).toBe("Anna");
  });

  it("kürzt auf die Maximallänge", () => {
    const lang = "A".repeat(60);
    expect(sanitizeDisplayName(lang)).toHaveLength(NAME_LIMITS.max);
  });

  it("gibt null zurück, wenn zu kurz oder kein Text", () => {
    expect(sanitizeDisplayName("")).toBeNull();
    expect(sanitizeDisplayName("   ")).toBeNull();
    expect(sanitizeDisplayName("A")).toBeNull();
    expect(sanitizeDisplayName(42)).toBeNull();
  });
});
