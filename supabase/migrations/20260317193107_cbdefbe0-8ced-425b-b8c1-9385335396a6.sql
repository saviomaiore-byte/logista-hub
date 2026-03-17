
ALTER TABLE public.contratos
ADD COLUMN IF NOT EXISTS motorista_id uuid REFERENCES public.motoristas(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS transportador_id uuid REFERENCES public.transportadores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contratos_motorista_id ON public.contratos(motorista_id);
CREATE INDEX IF NOT EXISTS idx_contratos_transportador_id ON public.contratos(transportador_id);
