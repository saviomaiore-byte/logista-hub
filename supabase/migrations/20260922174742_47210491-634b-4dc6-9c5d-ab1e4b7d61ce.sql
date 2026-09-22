ALTER TABLE public.cavalos
  ADD COLUMN antt_data_emissao date NULL,
  ADD COLUMN antt_quantidade integer NULL;

ALTER TABLE public.cavalos
  ADD CONSTRAINT cavalos_antt_quantidade_positiva
  CHECK (antt_quantidade IS NULL OR antt_quantidade > 0);

ALTER TABLE public.reboques
  ADD COLUMN antt_data_emissao date NULL,
  ADD COLUMN antt_quantidade integer NULL;

ALTER TABLE public.reboques
  ADD CONSTRAINT reboques_antt_quantidade_positiva
  CHECK (antt_quantidade IS NULL OR antt_quantidade > 0);