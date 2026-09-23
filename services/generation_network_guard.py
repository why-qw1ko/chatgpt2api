from __future__ import annotations

import threading
import time

from utils.log import logger

PUBLIC_BUSY_MESSAGE = "当前人数较多，请稍后再试"
PROBE_URL = "https://chatgpt.com"
PROBE_CACHE_TTL_SECS = 20.0
PROBE_TIMEOUT_SECS = 8.0

_lock = threading.Lock()
_last_ok_at = 0.0
_last_fail_at = 0.0


class GenerationUnavailableError(RuntimeError):
    """Raised when upstream is unreachable through the current egress."""


def _probe_direct() -> bool:
    try:
        from curl_cffi.requests import Session

        session = Session(impersonate="edge101")
        response = session.get(
            "https://chatgpt.com/",
            headers={"user-agent": "Mozilla/5.0 (chatgpt2api network probe)"},
            timeout=PROBE_TIMEOUT_SECS,
        )
        return int(response.status_code) < 500
    except Exception as exc:
        logger.warning({
            "event": "generation_direct_probe_failed",
            "error_type": type(exc).__name__,
            "error": str(exc),
        })
        return False


def _probe_chatgpt_reachable() -> bool:
    try:
        from services.proxy_service import proxy_settings, test_proxy

        profile = proxy_settings.get_profile(upstream=True)
        has_proxy = bool(getattr(profile, "proxy_url", "") or "")
        if not has_proxy:
            return _probe_direct()
        result = test_proxy(PROBE_URL, timeout=PROBE_TIMEOUT_SECS)
        return bool(result.get("ok"))
    except Exception as exc:
        logger.warning({
            "event": "generation_network_probe_failed",
            "error_type": type(exc).__name__,
            "error": str(exc),
        })
        return False


def ensure_generation_network(*, force: bool = False) -> None:
    """Block generation when the current egress cannot reach chatgpt.com.

    Public error text is intentionally generic so callers do not leak proxy details.
    """
    global _last_ok_at, _last_fail_at
    now = time.monotonic()
    with _lock:
        if not force and _last_ok_at and now - _last_ok_at < PROBE_CACHE_TTL_SECS:
            return
        if not force and _last_fail_at and now - _last_fail_at < 3.0:
            raise GenerationUnavailableError(PUBLIC_BUSY_MESSAGE)

    ok = _probe_chatgpt_reachable()
    with _lock:
        if ok:
            _last_ok_at = time.monotonic()
            _last_fail_at = 0.0
            return
        _last_fail_at = time.monotonic()
    logger.info({"event": "generation_network_blocked", "target": PROBE_URL})
    raise GenerationUnavailableError(PUBLIC_BUSY_MESSAGE)


def public_unavailable_message() -> str:
    return PUBLIC_BUSY_MESSAGE
