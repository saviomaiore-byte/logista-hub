ALTER TABLE public.cavalos
ADD COLUMN IF NOT EXISTS arquivo_url text;

ALTER TABLE public.reboques
ADD COLUMN IF NOT EXISTS arquivo_url text;

ALTER TABLE public.cavalos
ALTER COLUMN placa DROP NOT NULL;

ALTER TABLE public.reboques
ALTER COLUMN placa DROP NOT NULL;