import { createHash } from "node:crypto";

/** Boşlukları normalize edip SHA-256 üretir; biçim farkları sahte "değişti" sinyali vermesin. */
export function computeHash(text: string): string {
  return createHash("sha256").update(text.trim().replace(/\s+/g, " "), "utf8").digest("hex");
}
