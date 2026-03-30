
-- Add new fields to motoristas
ALTER TABLE public.motoristas 
ADD COLUMN IF NOT EXISTS situacao_operacional text DEFAULT 'em_praca',
ADD COLUMN IF NOT EXISTS alvara_numero text,
ADD COLUMN IF NOT EXISTS alvara_vencimento date,
ADD COLUMN IF NOT EXISTS certificado_numero text,
ADD COLUMN IF NOT EXISTS certificado_vencimento date;

-- Create report config table
CREATE TABLE public.relatorio_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL DEFAULT 'semanal',
  destinatarios text[] DEFAULT '{}',
  assunto_padrao text DEFAULT 'Relatório Semanal de Motoristas',
  corpo_padrao text DEFAULT 'Segue em anexo o relatório semanal com a situação dos motoristas.',
  dia_envio text DEFAULT 'segunda',
  horario_envio text DEFAULT '08:00',
  envio_automatico boolean DEFAULT false,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.relatorio_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view relatorio_config" ON public.relatorio_config
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert relatorio_config" ON public.relatorio_config
FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

CREATE POLICY "Creator or admin can update relatorio_config" ON public.relatorio_config
FOR UPDATE TO authenticated USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete relatorio_config" ON public.relatorio_config
FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_relatorio_config_updated_at
  BEFORE UPDATE ON public.relatorio_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
