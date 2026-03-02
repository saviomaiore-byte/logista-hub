
-- Tabela de conferências de seguros (cada conferência representa um período)
CREATE TABLE public.conferencia_seguros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  periodo_referencia TEXT NOT NULL,
  arquivo_apolice_url TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de itens da conferência (cada motorista e seu status)
CREATE TABLE public.conferencia_seguros_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conferencia_id UUID NOT NULL REFERENCES public.conferencia_seguros(id) ON DELETE CASCADE,
  motorista_id UUID NOT NULL REFERENCES public.motoristas(id) ON DELETE CASCADE,
  coberto BOOLEAN NOT NULL DEFAULT false,
  seguro_id UUID REFERENCES public.seguros(id) ON DELETE SET NULL,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conferencia_id, motorista_id)
);

-- Triggers de updated_at
CREATE TRIGGER update_conferencia_seguros_updated_at
  BEFORE UPDATE ON public.conferencia_seguros
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS conferencia_seguros
ALTER TABLE public.conferencia_seguros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view conferencia_seguros" ON public.conferencia_seguros FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert conferencia_seguros" ON public.conferencia_seguros FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update conferencia_seguros" ON public.conferencia_seguros FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete conferencia_seguros" ON public.conferencia_seguros FOR DELETE TO authenticated USING (true);

-- RLS conferencia_seguros_itens
ALTER TABLE public.conferencia_seguros_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view conferencia_seguros_itens" ON public.conferencia_seguros_itens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert conferencia_seguros_itens" ON public.conferencia_seguros_itens FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update conferencia_seguros_itens" ON public.conferencia_seguros_itens FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete conferencia_seguros_itens" ON public.conferencia_seguros_itens FOR DELETE TO authenticated USING (true);
