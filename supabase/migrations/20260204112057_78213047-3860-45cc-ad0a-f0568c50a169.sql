-- Tabela para seguros dos motoristas
CREATE TABLE public.seguros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  motorista_id UUID REFERENCES public.motoristas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- RC, APP, etc
  seguradora TEXT NOT NULL,
  numero_apolice TEXT,
  valor_premio NUMERIC,
  vigencia_inicio DATE NOT NULL,
  vigencia_fim DATE NOT NULL,
  status TEXT DEFAULT 'ativo',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seguros ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view seguros" ON public.seguros FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert seguros" ON public.seguros FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update seguros" ON public.seguros FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete seguros" ON public.seguros FOR DELETE USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_seguros_updated_at
  BEFORE UPDATE ON public.seguros
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();