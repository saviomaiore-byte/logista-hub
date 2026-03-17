
-- Adicionar campos ao motoristas
ALTER TABLE public.motoristas
ADD COLUMN IF NOT EXISTS endereco text,
ADD COLUMN IF NOT EXISTS data_nascimento date,
ADD COLUMN IF NOT EXISTS estado_civil text,
ADD COLUMN IF NOT EXISTS rg text;

-- Adicionar campos ao transportadores
ALTER TABLE public.transportadores
ADD COLUMN IF NOT EXISTS endereco text,
ADD COLUMN IF NOT EXISTS data_nascimento date,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS estado_civil text,
ADD COLUMN IF NOT EXISTS rg text;
