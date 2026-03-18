ALTER TABLE public.seguros
ALTER COLUMN vigencia_inicio DROP NOT NULL,
ALTER COLUMN vigencia_fim DROP NOT NULL;