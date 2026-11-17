"""Environment parsing helpers.

`int(os.getenv(...))` at import time crashes the whole process with an opaque
``ValueError`` when an operator fat-fingers a value such as
``MAX_WS_CONNECTIONS=1e3`` (#280). These helpers log and fall back instead.
"""

import logging
import os

logger = logging.getLogger(__name__)


def env_int(name: str, default: int) -> int:
    """Return ``$name`` as an int, or ``default`` if unset/blank/malformed."""
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    try:
        return int(raw)
    except (TypeError, ValueError):
        logger.warning(
            "Invalid integer for %s=%r; falling back to %s", name, raw, default
        )
        return default