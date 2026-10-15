import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Partagé avec le worker (jetons des réseaux) : pas de "server-only", la clé est passée en paramètre.
// Format stocké : "v1:<iv>:<tag>:<ciphertext>" en base64 — le préfixe permet de changer d'algorithme plus tard.

export function encrypt(plaintext: string, key: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return ["v1", iv, cipher.getAuthTag(), ciphertext].map((p) => (typeof p === "string" ? p : p.toString("base64"))).join(":");
}

/** Lève une erreur si la valeur a été altérée ou chiffrée avec une autre clé. */
export function decrypt(stored: string, key: Buffer) {
  const [version, iv, tag, ciphertext] = stored.split(":");
  if (version !== "v1" || !iv || !tag || !ciphertext) throw new Error("Format chiffré inconnu");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64")), decipher.final()]).toString("utf8");
}
