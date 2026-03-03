
CREATE TABLE public.conferencia_seguros_extraidos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conferencia_id uuid NOT NULL REFERENCES public.conferencia_seguros(id) ON DELETE CASCADE,
  nome text NOT NULL,
  certificado text,
  vigencia_inicio text,
  vigencia_fim text,
  premio text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.conferencia_seguros_extraidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view conferencia_seguros_extraidos"
ON public.conferencia_seguros_extraidos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert conferencia_seguros_extraidos"
ON public.conferencia_seguros_extraidos FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can delete conferencia_seguros_extraidos"
ON public.conferencia_seguros_extraidos FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_extraidos_conferencia ON public.conferencia_seguros_extraidos(conferencia_id);
