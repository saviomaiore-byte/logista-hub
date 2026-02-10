
-- Tabela para armazenar arquivos anexados a motoristas
CREATE TABLE public.motorista_arquivos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  motorista_id UUID NOT NULL REFERENCES public.motoristas(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  arquivo_url TEXT NOT NULL,
  tipo_arquivo TEXT,
  tamanho_bytes BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.motorista_arquivos ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Authenticated users can view motorista_arquivos"
ON public.motorista_arquivos FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert motorista_arquivos"
ON public.motorista_arquivos FOR INSERT
TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can delete motorista_arquivos"
ON public.motorista_arquivos FOR DELETE
TO authenticated USING (true);
