"""Type stub for apscheduler.triggers.interval (APScheduler 3.x)."""

from datetime import tzinfo
from typing import Any

class IntervalTrigger:
    def __init__(
        self,
        weeks: int = ...,
        days: int = ...,
        hours: int = ...,
        minutes: int = ...,
        seconds: int = ...,
        start_date: Any = ...,
        end_date: Any = ...,
        timezone: tzinfo | str | None = ...,
        jitter: int | None = ...,
    ) -> None: ...
