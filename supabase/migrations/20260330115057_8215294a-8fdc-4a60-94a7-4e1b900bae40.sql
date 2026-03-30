
-- Update SELECT policies on all business tables to allow all authenticated users to view data

-- motoristas
DROP POLICY IF EXISTS "Owner or admin can view motoristas" ON public.motoristas;
CREATE POLICY "All authenticated can view motoristas" ON public.motoristas
FOR SELECT TO authenticated USING (true);

-- transportadores
DROP POLICY IF EXISTS "Owner or admin can view transportadores" ON public.transportadores;
CREATE POLICY "All authenticated can view transportadores" ON public.transportadores
FOR SELECT TO authenticated USING (true);

-- contratos
DROP POLICY IF EXISTS "Owner or admin can view contratos" ON public.contratos;
CREATE POLICY "All authenticated can view contratos" ON public.contratos
FOR SELECT TO authenticated USING (true);

-- seguros
DROP POLICY IF EXISTS "Owner or admin can view seguros" ON public.seguros;
CREATE POLICY "All authenticated can view seguros" ON public.seguros
FOR SELECT TO authenticated USING (true);

-- boletos
DROP POLICY IF EXISTS "Owner or admin can view boletos" ON public.boletos;
CREATE POLICY "All authenticated can view boletos" ON public.boletos
FOR SELECT TO authenticated USING (true);

-- certificados
DROP POLICY IF EXISTS "Owner or admin can view certificados" ON public.certificados;
CREATE POLICY "All authenticated can view certificados" ON public.certificados
FOR SELECT TO authenticated USING (true);

-- documentos_empresa
DROP POLICY IF EXISTS "Owner or admin can view documentos_empresa" ON public.documentos_empresa;
CREATE POLICY "All authenticated can view documentos_empresa" ON public.documentos_empresa
FOR SELECT TO authenticated USING (true);

-- cavalos
DROP POLICY IF EXISTS "Owner or admin can view cavalos" ON public.cavalos;
CREATE POLICY "All authenticated can view cavalos" ON public.cavalos
FOR SELECT TO authenticated USING (true);

-- reboques
DROP POLICY IF EXISTS "Owner or admin can view reboques" ON public.reboques;
CREATE POLICY "All authenticated can view reboques" ON public.reboques
FOR SELECT TO authenticated USING (true);

-- pins_confins
DROP POLICY IF EXISTS "Owner or admin can view pins_confins" ON public.pins_confins;
CREATE POLICY "All authenticated can view pins_confins" ON public.pins_confins
FOR SELECT TO authenticated USING (true);

-- pronampe
DROP POLICY IF EXISTS "Owner or admin can view pronampe" ON public.pronampe;
CREATE POLICY "All authenticated can view pronampe" ON public.pronampe
FOR SELECT TO authenticated USING (true);

-- conferencia_seguros
DROP POLICY IF EXISTS "Owner or admin can view conferencia_seguros" ON public.conferencia_seguros;
CREATE POLICY "All authenticated can view conferencia_seguros" ON public.conferencia_seguros
FOR SELECT TO authenticated USING (true);

-- conferencia_seguros_itens
DROP POLICY IF EXISTS "Owner or admin can view conferencia_seguros_itens" ON public.conferencia_seguros_itens;
CREATE POLICY "All authenticated can view conferencia_seguros_itens" ON public.conferencia_seguros_itens
FOR SELECT TO authenticated USING (true);

-- conferencia_seguros_extraidos
DROP POLICY IF EXISTS "Owner or admin can view conferencia_seguros_extraidos" ON public.conferencia_seguros_extraidos;
CREATE POLICY "All authenticated can view conferencia_seguros_extraidos" ON public.conferencia_seguros_extraidos
FOR SELECT TO authenticated USING (true);

-- motorista_arquivos
DROP POLICY IF EXISTS "Owner or admin can view motorista_arquivos" ON public.motorista_arquivos;
CREATE POLICY "All authenticated can view motorista_arquivos" ON public.motorista_arquivos
FOR SELECT TO authenticated USING (true);

-- transportador_arquivos
DROP POLICY IF EXISTS "Owner or admin can view transportador_arquivos" ON public.transportador_arquivos;
CREATE POLICY "All authenticated can view transportador_arquivos" ON public.transportador_arquivos
FOR SELECT TO authenticated USING (true);

-- transportador_motoristas
DROP POLICY IF EXISTS "Owner or admin can view transportador_motoristas" ON public.transportador_motoristas;
CREATE POLICY "All authenticated can view transportador_motoristas" ON public.transportador_motoristas
FOR SELECT TO authenticated USING (true);
