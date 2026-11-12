DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('reboques','All authenticated can view reboques'),
    ('contratos','All authenticated can view contratos'),
    ('motoristas','All authenticated can view motoristas'),
    ('conferencia_seguros','All authenticated can view conferencia_seguros'),
    ('transportador_motoristas','All authenticated can view transportador_motoristas'),
    ('seguros','All authenticated can view seguros'),
    ('certificados','All authenticated can view certificados'),
    ('audit_log','Authenticated users can view audit_log'),
    ('conferencia_seguros_extraidos','All authenticated can view conferencia_seguros_extraidos'),
    ('transportadores','All authenticated can view transportadores'),
    ('relatorio_config','All authenticated can view relatorio_config'),
    ('conferencia_seguros_itens','All authenticated can view conferencia_seguros_itens'),
    ('documentos_empresa','All authenticated can view documentos_empresa'),
    ('registros_antt','All authenticated can view registros_antt'),
    ('cavalos','All authenticated can view cavalos')
  ) AS t(tbl, pol)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.pol, r.tbl);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.has_role(auth.uid(), ''admin''::public.app_role) OR public.has_role(auth.uid(), ''user''::public.app_role))', 'Team members can view ' || r.tbl, r.tbl);
  END LOOP;
END $$;