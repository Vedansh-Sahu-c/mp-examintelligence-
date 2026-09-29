"""
Storage service — abstract interface so Supabase Storage can replace local disk later.
"""
import os
import hashlib
from pathlib import Path
from typing import Protocol

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


class StorageBackend(Protocol):
    def save(self, file_bytes: bytes, filename: str) -> str: ...
    def get_path(self, path: str) -> str: ...


class LocalStorage:
    """Saves files to /uploads on the local filesystem."""

    def save(self, file_bytes: bytes, filename: str) -> str:
        dest = UPLOAD_DIR / filename
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(file_bytes)
        return str(dest)

    def get_path(self, path: str) -> str:
        return path


# Default storage instance
storage = LocalStorage()


def content_hash(data: bytes) -> str:
    """SHA-256 hex digest of raw bytes — used as cache key."""
    return hashlib.sha256(data).hexdigest()
