"""Scheduling helpers: availability, overlaps, available slots."""

from __future__ import annotations

import datetime as dt
from django.utils import timezone

from .models import BlockedSlot, Consultation, ExpertAvailability


def _combine_local(d: dt.date, t: dt.time) -> dt.datetime:
    naive = dt.datetime.combine(d, t)
    if timezone.is_naive(naive):
        return timezone.make_aware(naive, timezone.get_current_timezone())
    return naive


def consultation_end(c: Consultation) -> dt.datetime:
    return c.scheduled_at + dt.timedelta(minutes=c.duration)


def intervals_overlap(
    a_start: dt.datetime,
    a_end: dt.datetime,
    b_start: dt.datetime,
    b_end: dt.datetime,
) -> bool:
    return a_start < b_end and b_start < a_end


def expert_consultation_intervals(
    expert_id, exclude_consultation_id=None
):
    qs = Consultation.objects.filter(expert_id=expert_id).exclude(
        status__in=("annulee", "reportee")
    )
    if exclude_consultation_id:
        qs = qs.exclude(pk=exclude_consultation_id)
    for c in qs.iterator():
        yield c.scheduled_at, consultation_end(c)


def expert_blocked_intervals(expert_id):
    for b in BlockedSlot.objects.filter(expert_id=expert_id).iterator():
        yield b.start_at, b.end_at


def slot_conflicts_expert(
    expert_id,
    start: dt.datetime,
    end: dt.datetime,
    exclude_consultation_id=None,
) -> bool:
    for cs, ce in expert_consultation_intervals(
        expert_id, exclude_consultation_id=exclude_consultation_id
    ):
        if intervals_overlap(start, end, cs, ce):
            return True
    for bs, be in expert_blocked_intervals(expert_id):
        if intervals_overlap(start, end, bs, be):
            return True
    return False


def scheduled_within_availability(expert_id: int, start: dt.datetime, end: dt.datetime) -> bool:
    """True if [start, end] fits entirely inside at least one active availability window (same calendar day segments)."""
    if start >= end:
        return False
    local_date = timezone.localdate(start)
    wd = local_date.weekday()
    if wd > 5:
        return False
    windows = ExpertAvailability.objects.filter(
        expert_id=expert_id, weekday=wd, is_active=True
    )
    if not windows.exists():
        return False
    day_start = timezone.localtime(start).replace(hour=0, minute=0, second=0, microsecond=0)
    for w in windows:
        w_start = _combine_local(local_date, w.start_time)
        w_end = _combine_local(local_date, w.end_time)
        if w_end <= w_start:
            continue
        if start >= w_start and end <= w_end:
            return True
    return False


def generate_available_slots(
    expert_id,
    date_from: dt.date,
    date_to: dt.date,
    duration_minutes: int,
    slot_step_minutes: int = 15,
) -> list[dict]:
    """Return [{\"start\": iso, \"end\": iso}, ...] excluding consultations and blocked slots."""
    out: list[dict] = []
    if date_from > date_to or duration_minutes <= 0:
        return out

    step = dt.timedelta(minutes=slot_step_minutes)
    duration = dt.timedelta(minutes=duration_minutes)
    day = date_from
    while day <= date_to:
        wd = day.weekday()
        if wd > 5:
            day += dt.timedelta(days=1)
            continue
        windows = ExpertAvailability.objects.filter(
            expert_id=expert_id, weekday=wd, is_active=True
        )
        for w in windows:
            cursor = _combine_local(day, w.start_time)
            window_end = _combine_local(day, w.end_time)
            while cursor + duration <= window_end:
                slot_start = cursor
                slot_end = cursor + duration
                if not slot_conflicts_expert(expert_id, slot_start, slot_end):
                    out.append(
                        {
                            "start": slot_start.isoformat(),
                            "end": slot_end.isoformat(),
                        }
                    )
                cursor += step
        day += dt.timedelta(days=1)
    return out
