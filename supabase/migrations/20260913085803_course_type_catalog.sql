ALTER TABLE public.course_types
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

UPDATE public.course_types
SET name = 'IELTS'
WHERE name = 'Exam Prep (IELTS)';

UPDATE public.course_types
SET name = 'Free Talk / Open Discussion'
WHERE name = 'General Conversation';

INSERT INTO public.course_types (name, category, description, sort_order)
VALUES
  ('YLE: Pre A1 Starters', 'Cambridge Exam Preparation', NULL, 101),
  ('YLE: A1 Movers', 'Cambridge Exam Preparation', NULL, 102),
  ('YLE: A2 Flyers', 'Cambridge Exam Preparation', NULL, 103),
  ('KET: A2 Key', 'Cambridge Exam Preparation', NULL, 104),
  ('PET: B1 Preliminary', 'Cambridge Exam Preparation', NULL, 105),
  ('FCE: B2 First', 'Cambridge Exam Preparation', NULL, 106),
  ('CAE: C1 Advanced', 'Cambridge Exam Preparation', NULL, 107),
  ('BEC: Business Preliminary', 'Cambridge Exam Preparation', NULL, 108),
  ('BEC: Business Vantage', 'Cambridge Exam Preparation', NULL, 109),
  ('BEC: Business Higher', 'Cambridge Exam Preparation', NULL, 110),
  ('TOEFL', 'Other Exam Preparation', NULL, 201),
  ('IELTS', 'Other Exam Preparation', NULL, 202),
  ('SAT', 'Other Exam Preparation', NULL, 203),
  ('General English Enhancement', 'General English & Intensive Skills', NULL, 301),
  ('Intensive Writing', 'General English & Intensive Skills', NULL, 302),
  ('Intensive Speaking', 'General English & Intensive Skills', NULL, 303),
  ('Intensive Reading', 'General English & Intensive Skills', NULL, 304),
  (
    'Novel Reading',
    'Reading & Discussion',
    'Guided reading and discussion of novels, including a summer intensive option.',
    401
  ),
  (
    'Daily News',
    'Reading & Discussion',
    'English practice through news articles and current events.',
    402
  ),
  ('Free Talk / Open Discussion', 'Reading & Discussion', NULL, 403),
  ('Public Speaking', 'Communication & Professional English', NULL, 501),
  ('Business English', 'Communication & Professional English', NULL, 502),
  ('Math', 'Academic Subjects', NULL, 601),
  ('Physics', 'Academic Subjects', NULL, 602),
  ('History', 'Academic Subjects', NULL, 603),
  ('Biology', 'Academic Subjects', NULL, 604)
ON CONFLICT (name) DO UPDATE
SET
  category = EXCLUDED.category,
  description = COALESCE(EXCLUDED.description, public.course_types.description),
  sort_order = EXCLUDED.sort_order;
