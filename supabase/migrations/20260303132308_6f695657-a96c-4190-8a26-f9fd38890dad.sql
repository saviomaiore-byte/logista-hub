
-- Tabela de Transportadores
CREATE TABLE public.transportadores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  razao_social TEXT NOT NULL,
  cpf_cnpj TEXT NOT NULL,
  inscricao_estadual TEXT,
  contato TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.transportadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view transportadores" ON public.transportadores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert transportadores" ON public.transportadores FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update transportadores" ON public.transportadores FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete transportadores" ON public.transportadores FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_transportadores_updated_at BEFORE UPDATE ON public.transportadores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de vínculo Transportador <-> Motorista (N:N mas gerenciado como 1:N do ponto de vista do transportador)
CREATE TABLE public.transportador_motoristas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transportador_id UUID NOT NULL REFERENCES public.transportadores(id) ON DELETE CASCADE,
  motorista_id UUID NOT NULL REFERENCES public.motoristas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(transportador_id, motorista_id)
);

ALTER TABLE public.transportador_motoristas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view transportador_motoristas" ON public.transportador_motoristas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert transportador_motoristas" ON public.transportador_motoristas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete transportador_motoristas" ON public.transportador_motoristas FOR DELETE TO authenticated USING (true);

-- Tabela de Cavalos (Caminhão/Tração)
CREATE TABLE public.cavalos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transportador_id UUID NOT NULL REFERENCES public.transportadores(id) ON DELETE CASCADE,
  placa TEXT NOT NULL,
  renavam TEXT,
  chassi TEXT,
  marca_modelo TEXT,
  ano TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cavalos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view cavalos" ON public.cavalos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert cavalos" ON public.cavalos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update cavalos" ON public.cavalos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete cavalos" ON public.cavalos FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_cavalos_updated_at BEFORE UPDATE ON public.cavalos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de Reboques/Implementos
CREATE TABLE public.reboques (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transportador_id UUID NOT NULL REFERENCES public.transportadores(id) ON DELETE CASCADE,
  placa TEXT NOT NULL,
  renavam TEXT,
  tipo TEXT,
  ano TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reboques ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view reboques" ON public.reboques FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert reboques" ON public.reboques FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update reboques" ON public.reboques FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete reboques" ON public.reboques FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_reboques_updated_at BEFORE UPDATE ON public.reboques FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
