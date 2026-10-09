"""AES-256-GCM, AES-256-CBC, and ChaCha20-Poly1305 encryption services."""
import os
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM, ChaCha20Poly1305
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import padding


class EncryptionError(Exception):
    pass


class DecryptionError(Exception):
    pass


# ─────────────────────────────────────────────
# AES-256-GCM
# ─────────────────────────────────────────────

def encrypt_aes256gcm(data: bytes, key: bytes = None) -> tuple:
    """
    Encrypt data using AES-256-GCM.
    Returns: (ciphertext: bytes, key_hex: str, nonce_hex: str)
    """
    if key is None:
        key = os.urandom(32)  # 256-bit key
    nonce = os.urandom(12)   # 96-bit nonce (recommended for GCM)
    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(nonce, data, None)  # ciphertext includes 16-byte GCM tag
    return ciphertext, key.hex(), nonce.hex()


def decrypt_aes256gcm(ciphertext: bytes, key_hex: str, nonce_hex: str) -> bytes:
    """
    Decrypt AES-256-GCM ciphertext.
    Raises DecryptionError on integrity failure.
    """
    try:
        key = bytes.fromhex(key_hex)
        nonce = bytes.fromhex(nonce_hex)
        aesgcm = AESGCM(key)
        return aesgcm.decrypt(nonce, ciphertext, None)
    except Exception as e:
        raise DecryptionError(f"AES-256-GCM decryption failed: {e}") from e


# ─────────────────────────────────────────────
# AES-256-CBC
# ─────────────────────────────────────────────

def encrypt_aes256cbc(data: bytes, key: bytes = None) -> tuple:
    """
    Encrypt using AES-256-CBC with PKCS7 padding.
    Returns: (ciphertext: bytes, key_hex: str, iv_hex: str)
    """
    if key is None:
        key = os.urandom(32)
    iv = os.urandom(16)
    padder = padding.PKCS7(128).padder()
    padded = padder.update(data) + padder.finalize()
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    ciphertext = encryptor.update(padded) + encryptor.finalize()
    return ciphertext, key.hex(), iv.hex()


def decrypt_aes256cbc(ciphertext: bytes, key_hex: str, iv_hex: str) -> bytes:
    """Decrypt AES-256-CBC with PKCS7 unpadding."""
    try:
        key = bytes.fromhex(key_hex)
        iv = bytes.fromhex(iv_hex)
        cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
        decryptor = cipher.decryptor()
        padded = decryptor.update(ciphertext) + decryptor.finalize()
        unpadder = padding.PKCS7(128).unpadder()
        return unpadder.update(padded) + unpadder.finalize()
    except Exception as e:
        raise DecryptionError(f"AES-256-CBC decryption failed: {e}") from e


# ─────────────────────────────────────────────
# ChaCha20-Poly1305
# ─────────────────────────────────────────────

def encrypt_chacha20(data: bytes, key: bytes = None) -> tuple:
    """
    Encrypt using ChaCha20-Poly1305.
    Returns: (ciphertext: bytes, key_hex: str, nonce_hex: str)
    """
    if key is None:
        key = os.urandom(32)
    nonce = os.urandom(12)
    chacha = ChaCha20Poly1305(key)
    ciphertext = chacha.encrypt(nonce, data, None)
    return ciphertext, key.hex(), nonce.hex()


def decrypt_chacha20(ciphertext: bytes, key_hex: str, nonce_hex: str) -> bytes:
    """Decrypt ChaCha20-Poly1305."""
    try:
        key = bytes.fromhex(key_hex)
        nonce = bytes.fromhex(nonce_hex)
        chacha = ChaCha20Poly1305(key)
        return chacha.decrypt(nonce, ciphertext, None)
    except Exception as e:
        raise DecryptionError(f"ChaCha20-Poly1305 decryption failed: {e}") from e


# ─────────────────────────────────────────────
# File-level encryption
# ─────────────────────────────────────────────

def encrypt_file(file_path: str, encryption_type: str = 'aes256gcm') -> dict:
    """
    Read a file, encrypt it, save encrypted version, return metadata.
    Returns dict with: encrypted_path, key_hex, nonce_hex, encryption_type, original_size
    """
    with open(file_path, 'rb') as f:
        data = f.read()

    original_size = len(data)
    encrypted_path = file_path + '.enc'

    if encryption_type == 'aes256gcm':
        ciphertext, key_hex, nonce_hex = encrypt_aes256gcm(data)
    elif encryption_type == 'aes256cbc':
        ciphertext, key_hex, nonce_hex = encrypt_aes256cbc(data)
    elif encryption_type == 'chacha20':
        ciphertext, key_hex, nonce_hex = encrypt_chacha20(data)
    else:
        raise EncryptionError(f"Unsupported encryption type: {encryption_type}")

    with open(encrypted_path, 'wb') as f:
        f.write(ciphertext)

    return {
        'encrypted_path': encrypted_path,
        'key_hex': key_hex,
        'nonce_hex': nonce_hex,
        'encryption_type': encryption_type,
        'original_size': original_size,
        'encrypted_size': len(ciphertext),
    }


def decrypt_file_to_bytes(encrypted_path: str, key_hex: str, nonce_hex: str,
                           encryption_type: str = 'aes256gcm') -> bytes:
    """Read encrypted file and decrypt to bytes."""
    with open(encrypted_path, 'rb') as f:
        ciphertext = f.read()

    if encryption_type == 'aes256gcm':
        return decrypt_aes256gcm(ciphertext, key_hex, nonce_hex)
    elif encryption_type == 'aes256cbc':
        return decrypt_aes256cbc(ciphertext, key_hex, nonce_hex)
    elif encryption_type == 'chacha20':
        return decrypt_chacha20(ciphertext, key_hex, nonce_hex)
    else:
        raise DecryptionError(f"Unsupported encryption type: {encryption_type}")
