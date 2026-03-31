-- Add spaced repetition fields to study_progress
alter table public.study_progress
  add column if not exists is_weak boolean default false not null,
  add column if not exists review_interval integer default 1 not null,
  add column if not exists next_review_at timestamptz default now() not null,
  add column if not exists last_reviewed_at timestamptz;

-- Index for efficient "due today" queries
create index if not exists study_progress_next_review_idx
  on public.study_progress(user_id, next_review_at asc);

-- Index for weak cards queries
create index if not exists study_progress_weak_idx
  on public.study_progress(user_id, is_weak)
  where is_weak = true;

-- Atomic upsert function with spaced repetition logic.
-- Interval schedule: 1 → 2 → 4 → 7 → 14 → 30 days (capped at 30).
-- Correct answer: advance to next interval.
-- Incorrect answer: reset to 1 day, mark as weak.
-- Auto-mark weak when accuracy < 70% (using scored attempts only).
-- Heal weak when correct AND accuracy >= 70%.
create or replace function public.upsert_study_progress(
  p_user_id uuid,
  p_flashcard_id uuid,
  p_correct boolean
)
returns void as $$
begin
  insert into public.study_progress (
    user_id, flashcard_id,
    times_seen, times_correct, times_incorrect,
    last_studied_at, last_reviewed_at,
    review_interval, next_review_at, is_weak
  )
  values (
    p_user_id, p_flashcard_id,
    1,
    case when p_correct then 1 else 0 end,
    case when p_correct then 0 else 1 end,
    now(), now(),
    case when p_correct then 2 else 1 end,
    case when p_correct then now() + interval '2 days' else now() + interval '1 day' end,
    not p_correct
  )
  on conflict (user_id, flashcard_id) do update set
    times_seen = study_progress.times_seen + 1,
    times_correct = study_progress.times_correct + case when p_correct then 1 else 0 end,
    times_incorrect = study_progress.times_incorrect + case when p_correct then 0 else 1 end,
    last_studied_at = now(),
    last_reviewed_at = now(),

    -- Interval: correct advances, incorrect resets to 1
    review_interval = case
      when p_correct then least(
        case study_progress.review_interval
          when 1 then 2
          when 2 then 4
          when 4 then 7
          when 7 then 14
          when 14 then 30
          else 30
        end, 30)
      else 1
    end,

    -- Next review date: uses the pre-update interval (both SET clauses
    -- see the same pre-update row, so interval and date stay in sync).
    next_review_at = case
      when p_correct then now() + (
        case study_progress.review_interval
          when 1 then interval '2 days'
          when 2 then interval '4 days'
          when 4 then interval '7 days'
          when 7 then interval '14 days'
          when 14 then interval '30 days'
          else interval '30 days'
        end)
      else now() + interval '1 day'
    end,

    -- Weak flag logic:
    -- 1. Incorrect → always mark weak
    -- 2. Correct but accuracy still < 70% → stay weak
    -- 3. Correct and accuracy >= 70% → heal (clear weak)
    -- Accuracy uses scored attempts only (correct + incorrect), NOT times_seen.
    is_weak = case
      when not p_correct then true
      else (
        -- After this answer, what's the new accuracy?
        (study_progress.times_correct + 1)::numeric /
        nullif(study_progress.times_correct + study_progress.times_incorrect + 1, 0)
      ) < 0.7
    end;
end;
$$ language plpgsql security definer;
