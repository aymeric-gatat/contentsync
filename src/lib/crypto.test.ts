import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decrypt, encrypt } from "@/lib/crypto";

const key = randomBytes(32);

describe("crypto", () => {
  it("déchiffre ce qu'il a chiffré, avec un IV différent à chaque fois", () => {
    const a = encrypt("sk-ant-secret-é", key);
    expect(decrypt(a, key)).toBe("sk-ant-secret-é");
    expect(encrypt("sk-ant-secret-é", key)).not.toBe(a);
    expect(a).not.toContain("secret");
  });

  it("refuse une valeur altérée ou une autre clé", () => {
    const stored = encrypt("sk-ant-secret", key);
    const [v, iv, tag] = stored.split(":");
    const tampered = [v, iv, tag, Buffer.from("autre-contenu").toString("base64")].join(":");
    expect(() => decrypt(tampered, key)).toThrow();
    expect(() => decrypt(stored, randomBytes(32))).toThrow();
    expect(() => decrypt("pas-chiffre", key)).toThrow("Format chiffré inconnu");
  });
});
