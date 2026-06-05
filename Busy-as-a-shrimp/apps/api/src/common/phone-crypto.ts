import * as crypto from "crypto";

const IV_LENGTH = 12;

function resolvePhoneCryptoKey() {
  const secret =
    process.env.PHONE_ENCRYPTION_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    "busy-as-a-shrimp-phone-fallback";

  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptPhone(phone: string): string {
  const normalized = phone.trim();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", resolvePhoneCryptoKey(), iv);
  const encrypted = Buffer.concat([cipher.update(normalized, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv, tag, encrypted].map((segment) => segment.toString("base64url")).join(".");
}

export function decryptPhone(phoneEncrypted: string | null | undefined): string | null {
  if (!phoneEncrypted) {
    return null;
  }

  const [ivEncoded, tagEncoded, encryptedEncoded] = phoneEncrypted.split(".");
  if (!ivEncoded || !tagEncoded || !encryptedEncoded) {
    return null;
  }

  try {
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      resolvePhoneCryptoKey(),
      Buffer.from(ivEncoded, "base64url")
    );
    decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedEncoded, "base64url")),
      decipher.final()
    ]);

    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}
