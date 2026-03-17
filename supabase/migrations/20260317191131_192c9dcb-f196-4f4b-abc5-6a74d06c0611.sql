
ALTER TABLE public.motoristas
ADD COLUMN IF NOT EXISTS mopp_vitalicio boolean NOT NULL DEFAULT false;
