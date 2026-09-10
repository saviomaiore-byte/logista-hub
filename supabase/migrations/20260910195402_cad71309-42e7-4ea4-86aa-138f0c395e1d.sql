ALTER TABLE public.transportador_motoristas
  ADD COLUMN IF NOT EXISTS motorista_proprio boolean NOT NULL DEFAULT false;