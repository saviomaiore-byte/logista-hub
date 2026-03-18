CREATE TABLE IF NOT EXISTS public.transportador_arquivos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transportador_id UUID NOT NULL REFERENCES public.transportadores(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  arquivo_url TEXT NOT NULL,
  tipo_arquivo TEXT,
  tamanho_bytes BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.transportador_arquivos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'transportador_arquivos'
      AND policyname = 'Authenticated users can view transportador_arquivos'
  ) THEN
    CREATE POLICY "Authenticated users can view transportador_arquivos"
    ON public.transportador_arquivos
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'transportador_arquivos'
      AND policyname = 'Authenticated users can insert transportador_arquivos'
  ) THEN
    CREATE POLICY "Authenticated users can insert transportador_arquivos"
    ON public.transportador_arquivos
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'transportador_arquivos'
      AND policyname = 'Authenticated users can delete transportador_arquivos'
  ) THEN
    CREATE POLICY "Authenticated users can delete transportador_arquivos"
    ON public.transportador_arquivos
    FOR DELETE
    TO authenticated
    USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transportador_arquivos_transportador_id
ON public.transportador_arquivos (transportador_id);