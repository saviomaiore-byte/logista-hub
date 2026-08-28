CREATE UNIQUE INDEX IF NOT EXISTS relatorio_config_tipo_semanal_uniq
  ON public.relatorio_config (tipo)
  WHERE tipo = 'semanal';