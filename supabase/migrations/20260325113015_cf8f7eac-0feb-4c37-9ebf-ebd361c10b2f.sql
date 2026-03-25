
-- Add created_by column to all business tables
ALTER TABLE public.motoristas ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();
ALTER TABLE public.transportadores ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();
ALTER TABLE public.seguros ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();
ALTER TABLE public.certificados ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();
ALTER TABLE public.documentos_empresa ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();
ALTER TABLE public.boletos ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();
ALTER TABLE public.pronampe ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();
ALTER TABLE public.pins_confins ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();
ALTER TABLE public.cavalos ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();
ALTER TABLE public.reboques ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();
ALTER TABLE public.conferencia_seguros ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();

-- Restrict UPDATE: only the creator or admin can update records
-- motoristas
DROP POLICY IF EXISTS "Authenticated users can update motoristas" ON public.motoristas;
CREATE POLICY "Creator or admin can update motoristas" ON public.motoristas
FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- transportadores
DROP POLICY IF EXISTS "Authenticated users can update transportadores" ON public.transportadores;
CREATE POLICY "Creator or admin can update transportadores" ON public.transportadores
FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- contratos
DROP POLICY IF EXISTS "Authenticated users can update contratos" ON public.contratos;
CREATE POLICY "Creator or admin can update contratos" ON public.contratos
FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- seguros
DROP POLICY IF EXISTS "Authenticated users can update seguros" ON public.seguros;
CREATE POLICY "Creator or admin can update seguros" ON public.seguros
FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- certificados
DROP POLICY IF EXISTS "Authenticated users can update certificados" ON public.certificados;
CREATE POLICY "Creator or admin can update certificados" ON public.certificados
FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- documentos_empresa
DROP POLICY IF EXISTS "Authenticated users can update documentos_empresa" ON public.documentos_empresa;
CREATE POLICY "Creator or admin can update documentos_empresa" ON public.documentos_empresa
FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- boletos
DROP POLICY IF EXISTS "Authenticated users can update boletos" ON public.boletos;
CREATE POLICY "Creator or admin can update boletos" ON public.boletos
FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- pronampe
DROP POLICY IF EXISTS "Authenticated users can update pronampe" ON public.pronampe;
CREATE POLICY "Creator or admin can update pronampe" ON public.pronampe
FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- pins_confins
DROP POLICY IF EXISTS "Authenticated users can update pins_confins" ON public.pins_confins;
CREATE POLICY "Creator or admin can update pins_confins" ON public.pins_confins
FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- cavalos
DROP POLICY IF EXISTS "Authenticated users can update cavalos" ON public.cavalos;
CREATE POLICY "Creator or admin can update cavalos" ON public.cavalos
FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- reboques
DROP POLICY IF EXISTS "Authenticated users can update reboques" ON public.reboques;
CREATE POLICY "Creator or admin can update reboques" ON public.reboques
FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- conferencia_seguros
DROP POLICY IF EXISTS "Authenticated users can update conferencia_seguros" ON public.conferencia_seguros;
CREATE POLICY "Creator or admin can update conferencia_seguros" ON public.conferencia_seguros
FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Restrict INSERT: set created_by automatically
-- motoristas
DROP POLICY IF EXISTS "Authenticated users can insert motoristas" ON public.motoristas;
CREATE POLICY "Authenticated users can insert motoristas" ON public.motoristas
FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

-- transportadores
DROP POLICY IF EXISTS "Authenticated users can insert transportadores" ON public.transportadores;
CREATE POLICY "Authenticated users can insert transportadores" ON public.transportadores
FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

-- contratos
DROP POLICY IF EXISTS "Authenticated users can insert contratos" ON public.contratos;
CREATE POLICY "Authenticated users can insert contratos" ON public.contratos
FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

-- seguros
DROP POLICY IF EXISTS "Authenticated users can insert seguros" ON public.seguros;
CREATE POLICY "Authenticated users can insert seguros" ON public.seguros
FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

-- certificados
DROP POLICY IF EXISTS "Authenticated users can insert certificados" ON public.certificados;
CREATE POLICY "Authenticated users can insert certificados" ON public.certificados
FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

-- documentos_empresa
DROP POLICY IF EXISTS "Authenticated users can insert documentos_empresa" ON public.documentos_empresa;
CREATE POLICY "Authenticated users can insert documentos_empresa" ON public.documentos_empresa
FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

-- boletos
DROP POLICY IF EXISTS "Authenticated users can insert boletos" ON public.boletos;
CREATE POLICY "Authenticated users can insert boletos" ON public.boletos
FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

-- pronampe
DROP POLICY IF EXISTS "Authenticated users can insert pronampe" ON public.pronampe;
CREATE POLICY "Authenticated users can insert pronampe" ON public.pronampe
FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

-- pins_confins
DROP POLICY IF EXISTS "Authenticated users can insert pins_confins" ON public.pins_confins;
CREATE POLICY "Authenticated users can insert pins_confins" ON public.pins_confins
FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

-- cavalos
DROP POLICY IF EXISTS "Authenticated users can insert cavalos" ON public.cavalos;
CREATE POLICY "Authenticated users can insert cavalos" ON public.cavalos
FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

-- reboques
DROP POLICY IF EXISTS "Authenticated users can insert reboques" ON public.reboques;
CREATE POLICY "Authenticated users can insert reboques" ON public.reboques
FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

-- conferencia_seguros
DROP POLICY IF EXISTS "Authenticated users can insert conferencia_seguros" ON public.conferencia_seguros;
CREATE POLICY "Authenticated users can insert conferencia_seguros" ON public.conferencia_seguros
FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());
