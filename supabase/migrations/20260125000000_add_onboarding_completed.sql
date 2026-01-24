ALTER TABLE public.tenants
ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT false;
