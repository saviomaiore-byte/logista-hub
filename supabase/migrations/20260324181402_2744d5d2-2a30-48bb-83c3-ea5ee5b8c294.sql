
-- 1. DROP old DELETE policies and create admin-only DELETE policies

DROP POLICY IF EXISTS "Authenticated users can delete motoristas" ON public.motoristas;
CREATE POLICY "Only admins can delete motoristas" ON public.motoristas FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can delete transportadores" ON public.transportadores;
CREATE POLICY "Only admins can delete transportadores" ON public.transportadores FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can delete contratos" ON public.contratos;
CREATE POLICY "Only admins can delete contratos" ON public.contratos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can delete seguros" ON public.seguros;
CREATE POLICY "Only admins can delete seguros" ON public.seguros FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can delete certificados" ON public.certificados;
CREATE POLICY "Only admins can delete certificados" ON public.certificados FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can delete documentos_empresa" ON public.documentos_empresa;
CREATE POLICY "Only admins can delete documentos_empresa" ON public.documentos_empresa FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can delete boletos" ON public.boletos;
CREATE POLICY "Only admins can delete boletos" ON public.boletos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can delete pronampe" ON public.pronampe;
CREATE POLICY "Only admins can delete pronampe" ON public.pronampe FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can delete pins_confins" ON public.pins_confins;
CREATE POLICY "Only admins can delete pins_confins" ON public.pins_confins FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can delete cavalos" ON public.cavalos;
CREATE POLICY "Only admins can delete cavalos" ON public.cavalos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can delete reboques" ON public.reboques;
CREATE POLICY "Only admins can delete reboques" ON public.reboques FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can delete motorista_arquivos" ON public.motorista_arquivos;
CREATE POLICY "Only admins can delete motorista_arquivos" ON public.motorista_arquivos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can delete transportador_arquivos" ON public.transportador_arquivos;
CREATE POLICY "Only admins can delete transportador_arquivos" ON public.transportador_arquivos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can delete transportador_motoristas" ON public.transportador_motoristas;
CREATE POLICY "Only admins can delete transportador_motoristas" ON public.transportador_motoristas FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can delete conferencia_seguros" ON public.conferencia_seguros;
CREATE POLICY "Only admins can delete conferencia_seguros" ON public.conferencia_seguros FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can delete conferencia_seguros_itens" ON public.conferencia_seguros_itens;
CREATE POLICY "Only admins can delete conferencia_seguros_itens" ON public.conferencia_seguros_itens FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can delete conferencia_seguros_extraidos" ON public.conferencia_seguros_extraidos;
CREATE POLICY "Only admins can delete conferencia_seguros_extraidos" ON public.conferencia_seguros_extraidos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 2. Create audit_log table
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id text,
  action text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  user_id uuid DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit_log" ON public.audit_log
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit_log" ON public.audit_log
FOR INSERT TO authenticated
WITH CHECK (true);

-- 3. Audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log(table_name, record_id, action, old_data, user_id)
    VALUES (TG_TABLE_NAME, OLD.id::text, 'DELETE', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log(table_name, record_id, action, old_data, new_data, user_id)
    VALUES (TG_TABLE_NAME, NEW.id::text, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log(table_name, record_id, action, new_data, user_id)
    VALUES (TG_TABLE_NAME, NEW.id::text, 'INSERT', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  END IF;
END;
$$;

-- 4. Attach audit triggers to all business tables
CREATE TRIGGER audit_motoristas AFTER INSERT OR UPDATE OR DELETE ON public.motoristas FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_transportadores AFTER INSERT OR UPDATE OR DELETE ON public.transportadores FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_contratos AFTER INSERT OR UPDATE OR DELETE ON public.contratos FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_seguros AFTER INSERT OR UPDATE OR DELETE ON public.seguros FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_certificados AFTER INSERT OR UPDATE OR DELETE ON public.certificados FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_documentos_empresa AFTER INSERT OR UPDATE OR DELETE ON public.documentos_empresa FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_boletos AFTER INSERT OR UPDATE OR DELETE ON public.boletos FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_pronampe AFTER INSERT OR UPDATE OR DELETE ON public.pronampe FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_pins_confins AFTER INSERT OR UPDATE OR DELETE ON public.pins_confins FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_cavalos AFTER INSERT OR UPDATE OR DELETE ON public.cavalos FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_reboques AFTER INSERT OR UPDATE OR DELETE ON public.reboques FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_motorista_arquivos AFTER INSERT OR UPDATE OR DELETE ON public.motorista_arquivos FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_transportador_arquivos AFTER INSERT OR UPDATE OR DELETE ON public.transportador_arquivos FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_transportador_motoristas AFTER INSERT OR UPDATE OR DELETE ON public.transportador_motoristas FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_conferencia_seguros AFTER INSERT OR UPDATE OR DELETE ON public.conferencia_seguros FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_conferencia_seguros_itens AFTER INSERT OR UPDATE OR DELETE ON public.conferencia_seguros_itens FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_conferencia_seguros_extraidos AFTER INSERT OR UPDATE OR DELETE ON public.conferencia_seguros_extraidos FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
