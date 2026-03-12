
-- Add flag to motoristas
ALTER TABLE public.motoristas ADD COLUMN IF NOT EXISTS is_transportador_proprio boolean NOT NULL DEFAULT false;

-- Add motorista_id to transportadores (to link back when auto-created)
ALTER TABLE public.transportadores ADD COLUMN IF NOT EXISTS motorista_id uuid REFERENCES public.motoristas(id) ON DELETE SET NULL;
