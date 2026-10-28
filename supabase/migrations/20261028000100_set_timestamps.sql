-- When each set was completed, for the rest timer and the rest taken between sets.
-- Sets logged before this migration get their workout's start time, so they are never empty. Their rest
-- times are unknown, and the app hides any rest shown as zero.

alter table public.workout_sets add column if not exists completed_at timestamptz;

update public.workout_sets s
set completed_at = w.started_at
from public.workout_sessions w
where s.session_id = w.id and s.completed_at is null;

alter table public.workout_sets alter column completed_at set default now();
alter table public.workout_sets alter column completed_at set not null;
