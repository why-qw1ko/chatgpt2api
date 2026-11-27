from __future__ import annotations

import hashlib
import threading
import time

from utils.log import logger

PUBLIC_BUSY_MESSAGE = "当前人数较多，请稍后再试"
PROBE_URL = "https://chatgpt.com"
PROBE_CACHE_TTL_SECS = 20.0
PROBE_TIMEOUT_SECS = 8.0

_lock = threading.Lock()
_last_ok_at: dict[str, float] = {}
_last_fail_at: dict[str, float] = {}


class GenerationUnavailableError(RuntimeError):
    """Raised when upstream is unreachable through the current egress."""

    code = "upstream_connection_failed"


def _egress_key(profile: object) -> str:
    proxy_url = str(getattr(profile, "proxy_url", "") or "")
    skip_ssl_verify = bool(getattr(profile, "skip_ssl_verify", False))
    return hashlib.sha256(f"{proxy_url}|{skip_ssl_verify}".encode()).hexdigest()


def _probe_chatgpt_reachable(profile: object) -> bool:
    session = None
    try:
        from curl_cffi.requests import Session

        session_kwargs: dict[str, object] = {
            "impersonate": "edge101",
            "verify": not bool(getattr(profile, "skip_ssl_verify", False)),
        }
        proxy_url = str(getattr(profile, "proxy_url", "") or "")
        if proxy_url:
            session_kwargs["proxy"] = proxy_url
        session = Session(**session_kwargs)
        response = session.get(
            PROBE_URL,
            headers={"user-agent": "Mozilla/5.0 (chatgpt2api network probe)"},
            timeout=PROBE_TIMEOUT_SECS,
        )
        return int(response.status_code) < 500
    except Exception as exc:
        logger.warning({
            "event": "generation_network_probe_failed",
            "error_type": type(exc).__name__,
        })
        return False
    finally:
        if session is not None:
            session.close()


def ensure_generation_network(profile: object, *, force: bool = False) -> None:
    """Block generation when the selected egress cannot reach chatgpt.com.

    Public error text is intentionally generic so callers do not leak proxy details.
    """
    key = _egress_key(profile)
    now = time.monotonic()
    with _lock:
        last_ok_at = _last_ok_at.get(key)
        last_fail_at = _last_fail_at.get(key)
        if not force and last_ok_at is not None and now - last_ok_at < PROBE_CACHE_TTL_SECS:
            return
        if not force and last_fail_at is not None and now - last_fail_at < 3.0:
            raise GenerationUnavailableError(PUBLIC_BUSY_MESSAGE)

    ok = _probe_chatgpt_reachable(profile)
    with _lock:
        if ok:
            _last_ok_at[key] = time.monotonic()
            _last_fail_at.pop(key, None)
            return
        _last_ok_at.pop(key, None)
        _last_fail_at[key] = time.monotonic()
    logger.info({"event": "generation_network_blocked", "target": PROBE_URL})
    raise GenerationUnavailableError(PUBLIC_BUSY_MESSAGE)


def public_unavailable_message() -> str:
    return PUBLIC_BUSY_MESSAGE
