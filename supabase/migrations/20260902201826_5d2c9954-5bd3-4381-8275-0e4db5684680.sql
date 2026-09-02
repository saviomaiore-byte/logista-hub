DROP POLICY IF EXISTS "Owner can insert own mensagens" ON public.assistente_mensagens;

CREATE POLICY "Owner can insert own mensagens"
ON public.assistente_mensagens
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.assistente_conversas c
    WHERE c.id = assistente_mensagens.conversa_id
      AND c.user_id = auth.uid()
  )
);