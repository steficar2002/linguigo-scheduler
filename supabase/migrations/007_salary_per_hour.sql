-- Rename salary_per_class to salary_per_hour (hourly rate)

ALTER TABLE public.profiles
  RENAME COLUMN salary_per_class TO salary_per_hour;
