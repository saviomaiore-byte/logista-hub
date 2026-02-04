-- Criar bucket para documentos
INSERT INTO storage.buckets (id, name, public) VALUES ('documentos', 'documentos', true);

-- Políticas de storage para o bucket documentos
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documentos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'documentos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'documentos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'documentos' AND auth.role() = 'authenticated');

-- Adicionar coluna de arquivo nas tabelas
ALTER TABLE public.seguros ADD COLUMN arquivo_url TEXT;
ALTER TABLE public.contratos ADD COLUMN arquivo_url TEXT;
ALTER TABLE public.certificados ADD COLUMN arquivo_url TEXT;
ALTER TABLE public.documentos_empresa ADD COLUMN arquivo_url TEXT;