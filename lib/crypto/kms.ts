import crypto from 'crypto';

// Scaffold-level encryption using an env-provided 32-byte master key.
// In production, replace this with AWS KMS / HashiCorp Vault envelope encryption —
// this file exists so the interface (encrypt/decrypt) stays the same when you swap it.
const ALGO = 'aes-256-gcm';

function getMasterKey(): Buffer {
  const key = process.env.BINANCE_KEYS_MASTER_KEY;
  if (!key || key.length !== 64) {
    throw new Error('BINANCE_KEYS_MASTER_KEY must be a 64-char hex string (32 bytes)');
  }
  return Buffer.from(key, 'hex');
}

export function encryptSecret(plaintext: string): Buffer {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getMasterKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // store as iv(12) + tag(16) + ciphertext, all in one blob
  return Buffer.concat([iv, tag, ciphertext]);
}

export function decryptSecret(blob: Buffer): string {
  const iv = blob.subarray(0, 12);
  const tag = blob.subarray(12, 28);
  const ciphertext = blob.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, getMasterKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
