-- Integrity rules the application relies on, plus the built-in exercise library.

-- Built-in exercise names are unique (user_id null). This also makes the seed below idempotent.
create unique index exercises_builtin_name_idx
  on public.exercises (name) where user_id is null;

-- Only one workout can be in progress per user, even if two requests race.
create unique index workout_sessions_one_active_idx
  on public.workout_sessions (user_id) where ended_at is null;

-- Set numbers are unique per exercise within a session.
create unique index workout_sets_number_idx
  on public.workout_sets (session_id, exercise_id, set_number);

-- Built-in exercises. Source of truth for the list: src/lib/exercise-library.ts.
insert into public.exercises (user_id, name, primary_muscle, secondary_muscles, equipment) values
  (null, 'Barbell Bench Press', 'chest', '{front_delts,triceps}'::public.muscle_group[], 'Barbell'),
  (null, 'Incline Dumbbell Press', 'chest', '{front_delts,triceps}'::public.muscle_group[], 'Dumbbell'),
  (null, 'Dumbbell Fly', 'chest', '{front_delts}'::public.muscle_group[], 'Dumbbell'),
  (null, 'Cable Crossover', 'chest', '{front_delts}'::public.muscle_group[], 'Cable'),
  (null, 'Push Up', 'chest', '{triceps,front_delts}'::public.muscle_group[], 'Bodyweight'),
  (null, 'Overhead Press', 'front_delts', '{side_delts,triceps}'::public.muscle_group[], 'Barbell'),
  (null, 'Lateral Raise', 'side_delts', '{}'::public.muscle_group[], 'Dumbbell'),
  (null, 'Face Pull', 'rear_delts', '{traps}'::public.muscle_group[], 'Cable'),
  (null, 'Reverse Pec Deck', 'rear_delts', '{traps}'::public.muscle_group[], 'Machine'),
  (null, 'Barbell Curl', 'biceps', '{forearms}'::public.muscle_group[], 'Barbell'),
  (null, 'Hammer Curl', 'biceps', '{forearms}'::public.muscle_group[], 'Dumbbell'),
  (null, 'Incline Dumbbell Curl', 'biceps', '{}'::public.muscle_group[], 'Dumbbell'),
  (null, 'Tricep Pushdown', 'triceps', '{}'::public.muscle_group[], 'Cable'),
  (null, 'Skull Crusher', 'triceps', '{}'::public.muscle_group[], 'Barbell'),
  (null, 'Dips', 'triceps', '{chest,front_delts}'::public.muscle_group[], 'Bodyweight'),
  (null, 'Wrist Curl', 'forearms', '{}'::public.muscle_group[], 'Dumbbell'),
  (null, 'Cable Crunch', 'abs', '{}'::public.muscle_group[], 'Cable'),
  (null, 'Hanging Leg Raise', 'abs', '{obliques}'::public.muscle_group[], 'Bodyweight'),
  (null, 'Plank', 'abs', '{obliques}'::public.muscle_group[], 'Bodyweight'),
  (null, 'Russian Twist', 'obliques', '{abs}'::public.muscle_group[], 'Bodyweight'),
  (null, 'Cable Woodchop', 'obliques', '{abs}'::public.muscle_group[], 'Cable'),
  (null, 'Barbell Shrug', 'traps', '{forearms}'::public.muscle_group[], 'Barbell'),
  (null, 'Pull Up', 'lats', '{biceps,rear_delts}'::public.muscle_group[], 'Bodyweight'),
  (null, 'Lat Pulldown', 'lats', '{biceps}'::public.muscle_group[], 'Cable'),
  (null, 'Barbell Row', 'lats', '{rear_delts,biceps,lower_back}'::public.muscle_group[], 'Barbell'),
  (null, 'Seated Cable Row', 'lats', '{biceps,rear_delts}'::public.muscle_group[], 'Cable'),
  (null, 'Back Extension', 'lower_back', '{glutes,hamstrings}'::public.muscle_group[], 'Bodyweight'),
  (null, 'Hip Thrust', 'glutes', '{hamstrings}'::public.muscle_group[], 'Barbell'),
  (null, 'Barbell Back Squat', 'quads', '{glutes,hamstrings,lower_back}'::public.muscle_group[], 'Barbell'),
  (null, 'Leg Press', 'quads', '{glutes}'::public.muscle_group[], 'Machine'),
  (null, 'Leg Extension', 'quads', '{}'::public.muscle_group[], 'Machine'),
  (null, 'Bulgarian Split Squat', 'quads', '{glutes}'::public.muscle_group[], 'Dumbbell'),
  (null, 'Deadlift', 'hamstrings', '{glutes,lower_back,traps,forearms}'::public.muscle_group[], 'Barbell'),
  (null, 'Romanian Deadlift', 'hamstrings', '{glutes,lower_back}'::public.muscle_group[], 'Barbell'),
  (null, 'Lying Leg Curl', 'hamstrings', '{}'::public.muscle_group[], 'Machine'),
  (null, 'Standing Calf Raise', 'calves', '{}'::public.muscle_group[], 'Machine'),
  (null, 'Seated Calf Raise', 'calves', '{}'::public.muscle_group[], 'Machine')
on conflict (name) where user_id is null do nothing;
