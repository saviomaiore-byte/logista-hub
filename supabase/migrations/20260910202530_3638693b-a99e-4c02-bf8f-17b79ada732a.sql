GRANT UPDATE ON public.transportador_motoristas TO authenticated;

CREATE POLICY "Owner or admin can update transportador_motoristas"
ON public.transportador_motoristas
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.transportadores t
  WHERE t.id = transportador_motoristas.transportador_id
    AND (t.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.transportadores t
  WHERE t.id = transportador_motoristas.transportador_id
    AND (t.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
));