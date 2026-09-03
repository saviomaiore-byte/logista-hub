CREATE TABLE public.alertas_arquivados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entidade text NOT NULL,
  entidade_id uuid NOT NULL,
  entidade_nome text,
  tipo_documento text NOT NULL,
  vencimento date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT alertas_arquivados_unico UNIQUE (user_id, entidade, entidade_id, tipo_documento, vencimento)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alertas_arquivados TO authenticated;
GRANT ALL ON public.alertas_arquivados TO service_role;

ALTER TABLE public.alertas_arquivados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or admin can view alertas arquivados"
ON public.alertas_arquivados FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owner can insert own alertas arquivados"
ON public.alertas_arquivados FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owner can update own alertas arquivados"
ON public.alertas_arquivados FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owner can delete own alertas arquivados"
ON public.alertas_arquivados FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE TRIGGER update_alertas_arquivados_updated_at
BEFORE UPDATE ON public.alertas_arquivados
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();