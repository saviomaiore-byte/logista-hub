CREATE TABLE public.assistente_conversas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  titulo text NOT NULL DEFAULT 'Nova conversa',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assistente_conversas TO authenticated;
GRANT ALL ON public.assistente_conversas TO service_role;

ALTER TABLE public.assistente_conversas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own conversas"
  ON public.assistente_conversas FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Owner can insert own conversas"
  ON public.assistente_conversas FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owner can update own conversas"
  ON public.assistente_conversas FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owner can delete own conversas"
  ON public.assistente_conversas FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER update_assistente_conversas_updated_at
  BEFORE UPDATE ON public.assistente_conversas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.assistente_mensagens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversa_id uuid NOT NULL REFERENCES public.assistente_conversas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_assistente_mensagens_conversa ON public.assistente_mensagens (conversa_id, created_at);
CREATE INDEX idx_assistente_conversas_user ON public.assistente_conversas (user_id, updated_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assistente_mensagens TO authenticated;
GRANT ALL ON public.assistente_mensagens TO service_role;

ALTER TABLE public.assistente_mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own mensagens"
  ON public.assistente_mensagens FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Owner can insert own mensagens"
  ON public.assistente_mensagens FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owner can delete own mensagens"
  ON public.assistente_mensagens FOR DELETE TO authenticated
  USING (user_id = auth.uid());