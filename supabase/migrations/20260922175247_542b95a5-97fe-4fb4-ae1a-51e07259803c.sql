CREATE TABLE public.registros_antt (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transportador_id uuid NOT NULL REFERENCES public.transportadores(id) ON DELETE CASCADE,
  arquivo_url text NULL,
  antt_data_emissao date NULL,
  qtd_cavalos integer NULL,
  qtd_reboques integer NULL,
  created_by uuid NULL DEFAULT auth.uid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT registros_antt_qtd_cavalos_positiva CHECK (qtd_cavalos IS NULL OR qtd_cavalos > 0),
  CONSTRAINT registros_antt_qtd_reboques_positiva CHECK (qtd_reboques IS NULL OR qtd_reboques > 0)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.registros_antt TO authenticated;
GRANT ALL ON public.registros_antt TO service_role;

ALTER TABLE public.registros_antt ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view registros_antt"
  ON public.registros_antt FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert registros_antt"
  ON public.registros_antt FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

CREATE POLICY "Creator or admin can update registros_antt"
  ON public.registros_antt FOR UPDATE TO authenticated
  USING ((created_by = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete registros_antt"
  ON public.registros_antt FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_registros_antt_updated_at
  BEFORE UPDATE ON public.registros_antt
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER audit_registros_antt
  AFTER INSERT OR UPDATE OR DELETE ON public.registros_antt
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

INSERT INTO public.registros_antt (transportador_id, arquivo_url, antt_data_emissao, qtd_cavalos, created_by, created_at)
SELECT transportador_id, arquivo_url, antt_data_emissao, antt_quantidade, created_by, created_at FROM public.cavalos;

INSERT INTO public.registros_antt (transportador_id, arquivo_url, antt_data_emissao, qtd_reboques, created_by, created_at)
SELECT transportador_id, arquivo_url, antt_data_emissao, antt_quantidade, created_by, created_at FROM public.reboques;