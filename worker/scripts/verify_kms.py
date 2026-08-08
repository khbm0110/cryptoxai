"""
Run this before starting the worker (or as a pre-deploy step on Render):

    python3 -m scripts.verify_kms

Encrypts a known value using the same AES-256-GCM scheme as the Next.js app's
kms.ts, then decrypts it with THIS process's configured master key. If they
don't match — usually because BINANCE_KEYS_MASTER_KEY differs between the two
services — every real user's key decryption would fail too, but confusingly,
one user at a time, in production. Catching it here fails fast and clearly.
"""
import os
import sys

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from worker.kms import decrypt_secret, pg_bytea_to_bytes

TEST_PLAINTEXT = "kms-self-test-value"


def _self_encrypt(master_key_hex: str) -> bytes:
    """Mirrors kms.ts's encryptSecret exactly: iv(12) || tag(16) || ciphertext."""
    key = bytes.fromhex(master_key_hex)
    iv = os.urandom(12)
    aesgcm = AESGCM(key)
    ct_and_tag = aesgcm.encrypt(iv, TEST_PLAINTEXT.encode("utf-8"), None)
    ciphertext, tag = ct_and_tag[:-16], ct_and_tag[-16:]
    return iv + tag + ciphertext


def main() -> int:
    master_key_hex = os.environ.get("BINANCE_KEYS_MASTER_KEY")
    if not master_key_hex or len(master_key_hex) != 64:
        print("FAIL: BINANCE_KEYS_MASTER_KEY is missing or not a 64-char hex string.", file=sys.stderr)
        return 1

    try:
        blob = _self_encrypt(master_key_hex)
        result = decrypt_secret(pg_bytea_to_bytes(blob))
    except Exception as e:
        print(f"FAIL: KMS self-test raised an exception: {e}", file=sys.stderr)
        return 1

    if result != TEST_PLAINTEXT:
        print("FAIL: KMS self-test round-trip produced the wrong plaintext.", file=sys.stderr)
        return 1

    print("OK: KMS self-test passed — this worker's master key is internally consistent.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
