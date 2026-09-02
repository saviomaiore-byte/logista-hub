DROP POLICY "All authenticated can view motorista_arquivos" ON public.motorista_arquivos;
CREATE POLICY "Owner or admin can view motorista_arquivos"
ON public.motorista_arquivos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.motoristas m
    WHERE m.id = motorista_arquivos.motorista_id
      AND (m.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  )
);

DROP POLICY "All authenticated can view transportador_arquivos" ON public.transportador_arquivos;
CREATE POLICY "Owner or admin can view transportador_arquivos"
ON public.transportador_arquivos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.transportadores t
    WHERE t.id = transportador_arquivos.transportador_id
      AND (t.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  )
);