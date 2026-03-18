ALTER TABLE public.contratos
ADD COLUMN IF NOT EXISTS modelo TEXT;

COMMENT ON COLUMN public.contratos.modelo IS 'Modelo do contrato, ex: Maiore, Start ou comodato';