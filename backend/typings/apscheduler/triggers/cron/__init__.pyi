"""Type stub for apscheduler.triggers.cron (APScheduler 3.x)."""

from datetime import tzinfo
from typing import Any

class CronTrigger:
    def __init__(
        self,
        year: int | str | None = ...,
        month: int | str | None = ...,
        day: int | str | None = ...,
        week: int | str | None = ...,
        day_of_week: int | str | None = ...,
        hour: int | str | None = ...,
        minute: int | str | None = ...,
        second: int | str | None = ...,
        start_date: Any = ...,
        end_date: Any = ...,
        timezone: tzinfo | str | None = ...,
        jitter: int | None = ...,
    ) -> None: ...
    @classmethod
    def from_crontab(
        cls, expr: str, timezone: tzinfo | str | None = ...
    ) -> CronTrigger: ...
