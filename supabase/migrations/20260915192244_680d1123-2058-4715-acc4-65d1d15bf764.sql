-- Permite que todos os usuários autenticados consultem o histórico.
-- A inserção continua restrita aos gatilhos SECURITY DEFINER.
DROP POLICY IF EXISTS "Authenticated users can view audit_log" ON public.audit_log;

CREATE POLICY "Authenticated users can view audit_log"
ON public.audit_log
FOR SELECT
TO authenticated
USING (true);

CREATE INDEX IF NOT EXISTS audit_log_created_at_idx
ON public.audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS audit_log_table_record_idx
ON public.audit_log (table_name, record_id);