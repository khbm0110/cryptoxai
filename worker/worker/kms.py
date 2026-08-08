"""
Must stay byte-for-byte compatible with lib/crypto/kms.ts on the Next.js side.
Blob layout: iv(12 bytes) || tag(16 bytes) || ciphertext.
Postgres `bytea` values arrive from a direct DB connection as raw bytes/memoryview
here (unlike the Next.js app, which goes through PostgREST and sees hex strings) —
this module still exposes pg_bytea_to_bytes for the rare case a value arrives as
the "\\x..." text form (e.g. if read via a text-mode driver).
"""
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from .config import Config


def _master_key() -> bytes:
    key_hex = Config.BINANCE_KEYS_MASTER_KEY
    if len(key_hex) != 64:
        raise ValueError("BINANCE_KEYS_MASTER_KEY must be a 64-char hex string (32 bytes)")
    return bytes.fromhex(key_hex)


def decrypt_secret(blob: bytes) -> str:
    iv, tag, ciphertext = blob[:12], blob[12:28], blob[28:]
    aesgcm = AESGCM(_master_key())
    # cryptography's AESGCM expects ciphertext+tag concatenated, unlike Node's
    # separate getAuthTag() — reassemble here to match Node's stored layout.
    plaintext = aesgcm.decrypt(iv, ciphertext + tag, None)
    return plaintext.decode("utf-8")


def pg_bytea_to_bytes(value) -> bytes:
    """Normalizes a value read from a `bytea` column to raw bytes, whether the
    driver handed back a memoryview/bytes (psycopg default) or a "\\x..." hex
    string (text-mode fallback)."""
    if isinstance(value, (bytes, bytearray, memoryview)):
        return bytes(value)
    if isinstance(value, str):
        hex_str = value[2:] if value.startswith("\\x") else value
        return bytes.fromhex(hex_str)
    raise TypeError(f"Unexpected bytea value type: {type(value)}")
