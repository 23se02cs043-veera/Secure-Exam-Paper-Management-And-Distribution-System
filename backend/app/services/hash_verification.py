"""SHA-256 hash verification service."""
import hashlib
import hmac
import os


def compute_sha256(file_path: str) -> str:
    """Compute SHA-256 hash of a file using chunked reading. Returns hex string."""
    sha256 = hashlib.sha256()
    with open(file_path, 'rb') as f:
        while True:
            chunk = f.read(8192)
            if not chunk:
                break
            sha256.update(chunk)
    return sha256.hexdigest()


def compute_sha256_bytes(data: bytes) -> str:
    """Compute SHA-256 of raw bytes. Returns hex string."""
    return hashlib.sha256(data).hexdigest()


def verify_file_hash(file_path: str, expected_hash: str) -> bool:
    """
    Verify file integrity using constant-time comparison.
    Returns True if hashes match.
    """
    if not os.path.exists(file_path):
        return False
    actual_hash = compute_sha256(file_path)
    return hmac.compare_digest(actual_hash.lower(), expected_hash.lower())


def compute_hmac(data: bytes, key: bytes) -> str:
    """Compute HMAC-SHA256. Returns hex string."""
    return hmac.new(key, data, hashlib.sha256).hexdigest()


def generate_file_integrity_report(file_path: str) -> dict:
    """Return dict with multiple hash algorithms and file size."""
    if not os.path.exists(file_path):
        return {'error': 'File not found'}

    sha256_h = hashlib.sha256()
    sha1_h = hashlib.sha1()
    md5_h = hashlib.md5()
    size = 0

    with open(file_path, 'rb') as f:
        while True:
            chunk = f.read(8192)
            if not chunk:
                break
            sha256_h.update(chunk)
            sha1_h.update(chunk)
            md5_h.update(chunk)
            size += len(chunk)

    return {
        'sha256': sha256_h.hexdigest(),
        'sha1': sha1_h.hexdigest(),
        'md5': md5_h.hexdigest(),
        'size_bytes': size,
    }
