
-- ============================================================
-- 1. FIX SELECT POLICIES: Restrict to created_by owner or admin
-- ============================================================

-- motoristas
DROP POLICY IF EXISTS "Authenticated users can view motoristas" ON public.motoristas;
CREATE POLICY "Owner or admin can view motoristas" ON public.motoristas
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- transportadores
DROP POLICY IF EXISTS "Authenticated users can view transportadores" ON public.transportadores;
CREATE POLICY "Owner or admin can view transportadores" ON public.transportadores
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- contratos
DROP POLICY IF EXISTS "Authenticated users can view contratos" ON public.contratos;
CREATE POLICY "Owner or admin can view contratos" ON public.contratos
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- boletos
DROP POLICY IF EXISTS "Authenticated users can view boletos" ON public.boletos;
CREATE POLICY "Owner or admin can view boletos" ON public.boletos
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- pronampe
DROP POLICY IF EXISTS "Authenticated users can view pronampe" ON public.pronampe;
CREATE POLICY "Owner or admin can view pronampe" ON public.pronampe
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- pins_confins
DROP POLICY IF EXISTS "Authenticated users can view pins_confins" ON public.pins_confins;
CREATE POLICY "Owner or admin can view pins_confins" ON public.pins_confins
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- seguros
DROP POLICY IF EXISTS "Authenticated users can view seguros" ON public.seguros;
CREATE POLICY "Owner or admin can view seguros" ON public.seguros
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- documentos_empresa
DROP POLICY IF EXISTS "Authenticated users can view documentos_empresa" ON public.documentos_empresa;
CREATE POLICY "Owner or admin can view documentos_empresa" ON public.documentos_empresa
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- certificados
DROP POLICY IF EXISTS "Authenticated users can view certificados" ON public.certificados;
CREATE POLICY "Owner or admin can view certificados" ON public.certificados
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- cavalos
DROP POLICY IF EXISTS "Authenticated users can view cavalos" ON public.cavalos;
CREATE POLICY "Owner or admin can view cavalos" ON public.cavalos
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- reboques
DROP POLICY IF EXISTS "Authenticated users can view reboques" ON public.reboques;
CREATE POLICY "Owner or admin can view reboques" ON public.reboques
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- conferencia_seguros
DROP POLICY IF EXISTS "Authenticated users can view conferencia_seguros" ON public.conferencia_seguros;
CREATE POLICY "Owner or admin can view conferencia_seguros" ON public.conferencia_seguros
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- 2. FIX INSERT/UPDATE PERMISSIVE POLICIES
-- ============================================================

-- motorista_arquivos: restrict INSERT to owner of the motorista record or admin
DROP POLICY IF EXISTS "Authenticated users can insert motorista_arquivos" ON public.motorista_arquivos;
CREATE POLICY "Owner or admin can insert motorista_arquivos" ON public.motorista_arquivos
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.motoristas m
      WHERE m.id = motorista_id AND (m.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- motorista_arquivos: restrict SELECT
DROP POLICY IF EXISTS "Authenticated users can view motorista_arquivos" ON public.motorista_arquivos;
CREATE POLICY "Owner or admin can view motorista_arquivos" ON public.motorista_arquivos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.motoristas m
      WHERE m.id = motorista_id AND (m.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- transportador_arquivos: restrict INSERT
DROP POLICY IF EXISTS "Authenticated users can insert transportador_arquivos" ON public.transportador_arquivos;
CREATE POLICY "Owner or admin can insert transportador_arquivos" ON public.transportador_arquivos
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.transportadores t
      WHERE t.id = transportador_id AND (t.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- transportador_arquivos: restrict SELECT
DROP POLICY IF EXISTS "Authenticated users can view transportador_arquivos" ON public.transportador_arquivos;
CREATE POLICY "Owner or admin can view transportador_arquivos" ON public.transportador_arquivos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transportadores t
      WHERE t.id = transportador_id AND (t.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- conferencia_seguros_itens: fix INSERT and UPDATE
DROP POLICY IF EXISTS "Authenticated users can insert conferencia_seguros_itens" ON public.conferencia_seguros_itens;
CREATE POLICY "Owner or admin can insert conferencia_seguros_itens" ON public.conferencia_seguros_itens
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conferencia_seguros cs
      WHERE cs.id = conferencia_id AND (cs.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

DROP POLICY IF EXISTS "Authenticated users can update conferencia_seguros_itens" ON public.conferencia_seguros_itens;
CREATE POLICY "Owner or admin can update conferencia_seguros_itens" ON public.conferencia_seguros_itens
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conferencia_seguros cs
      WHERE cs.id = conferencia_id AND (cs.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- conferencia_seguros_itens: fix SELECT
DROP POLICY IF EXISTS "Authenticated users can view conferencia_seguros_itens" ON public.conferencia_seguros_itens;
CREATE POLICY "Owner or admin can view conferencia_seguros_itens" ON public.conferencia_seguros_itens
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conferencia_seguros cs
      WHERE cs.id = conferencia_id AND (cs.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- conferencia_seguros_extraidos: fix INSERT and SELECT
DROP POLICY IF EXISTS "Authenticated users can insert conferencia_seguros_extraidos" ON public.conferencia_seguros_extraidos;
CREATE POLICY "Owner or admin can insert conferencia_seguros_extraidos" ON public.conferencia_seguros_extraidos
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conferencia_seguros cs
      WHERE cs.id = conferencia_id AND (cs.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

DROP POLICY IF EXISTS "Authenticated users can view conferencia_seguros_extraidos" ON public.conferencia_seguros_extraidos;
CREATE POLICY "Owner or admin can view conferencia_seguros_extraidos" ON public.conferencia_seguros_extraidos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conferencia_seguros cs
      WHERE cs.id = conferencia_id AND (cs.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- transportador_motoristas: fix INSERT and SELECT
DROP POLICY IF EXISTS "Authenticated users can insert transportador_motoristas" ON public.transportador_motoristas;
CREATE POLICY "Owner or admin can insert transportador_motoristas" ON public.transportador_motoristas
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.transportadores t
      WHERE t.id = transportador_id AND (t.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

DROP POLICY IF EXISTS "Authenticated users can view transportador_motoristas" ON public.transportador_motoristas;
CREATE POLICY "Owner or admin can view transportador_motoristas" ON public.transportador_motoristas
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transportadores t
      WHERE t.id = transportador_id AND (t.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- ============================================================
-- 3. FIX AUDIT_LOG INSERT: only triggers should insert (SECURITY DEFINER bypasses RLS)
-- ============================================================
DROP POLICY IF EXISTS "System can insert audit_log" ON public.audit_log;

-- ============================================================
-- 4. FIX STORAGE POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can read files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;

CREATE POLICY "Users can read own documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documentos' AND (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Users can upload own documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documentos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own documents" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'documentos' AND (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Admins can delete documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'documentos' AND has_role(auth.uid(), 'admin'::app_role));
