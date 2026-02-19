"""Type stub for apscheduler.schedulers.background (APScheduler 3.x)."""

from typing import Any

class BackgroundScheduler:
    def __init__(self, **kwargs: Any) -> None: ...
    def add_job(
        self,
        func: Any,
        trigger: Any = ...,
        **kwargs: Any,
    ) -> Any: ...
    def start(self, paused: bool = ...) -> None: ...
    def shutdown(self, wait: bool = ...) -> None: ...
