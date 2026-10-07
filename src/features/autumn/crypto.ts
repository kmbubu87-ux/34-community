import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { requireRosterEncryptionKey } from "../../lib/env";

export function encryptAutumnEntries(value: string, encodedKey = requireRosterEncryptionKey()): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(encodedKey, "base64"), iv);
  cipher.setAAD(Buffer.from("34-community/autumn/2026"));
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}
export function decryptAutumnEntries(value: string, encodedKey = requireRosterEncryptionKey()): string {
  const [version, iv, tag, data] = value.split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("INVALID_AUTUMN_CIPHERTEXT");
  const decipher = createDecipheriv("aes-256-gcm", Buffer.from(encodedKey, "base64"), Buffer.from(iv, "base64url"));
  decipher.setAAD(Buffer.from("34-community/autumn/2026"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}
