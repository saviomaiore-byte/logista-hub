CREATE OR REPLACE FUNCTION public.importar_certificados(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  item jsonb;
  v_cnpj text;
  v_venc text;
  v_renov text;
  v_status text;
  v_regime text;
  v_regime_oficial text;
  v_obs text;
  v_tr_id uuid;
  v_tr_nome text;
  v_tr_regime text;
  v_qtd int;
  v_novo_id uuid;
  inseridos jsonb := '[]'::jsonb;
  ignorados jsonb := '[]'::jsonb;
  regimes jsonb := '[]'::jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF jsonb_typeof(payload) <> 'array' THEN
    RAISE EXCEPTION 'Payload inválido';
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(payload)
  LOOP
    v_cnpj := regexp_replace(coalesce(item->>'cnpj', ''), '\D', '', 'g');
    v_venc := btrim(coalesce(item->>'vencimento', ''));
    v_renov := btrim(coalesce(item->>'renovacao', ''));
    v_status := upper(btrim(coalesce(item->>'status', '')));
    v_regime := btrim(coalesce(item->>'regime', ''));
    v_obs := btrim(coalesce(item->>'observacoes', ''));

    -- CNPJ
    IF length(v_cnpj) <> 14 THEN
      ignorados := ignorados || jsonb_build_array(jsonb_build_object('cnpj', v_cnpj, 'motivo', 'CNPJ inválido'));
      CONTINUE;
    END IF;

    SELECT count(*) INTO v_qtd FROM public.transportadores t
      WHERE regexp_replace(coalesce(t.cpf_cnpj, ''), '\D', '', 'g') = v_cnpj;

    IF v_qtd = 0 THEN
      ignorados := ignorados || jsonb_build_array(jsonb_build_object('cnpj', v_cnpj, 'motivo', 'Transportadora não encontrada'));
      CONTINUE;
    ELSIF v_qtd > 1 THEN
      ignorados := ignorados || jsonb_build_array(jsonb_build_object('cnpj', v_cnpj, 'motivo', 'CNPJ corresponde a mais de uma transportadora'));
      CONTINUE;
    END IF;

    SELECT t.id, t.razao_social, coalesce(t.inscricao_estadual, '')
      INTO v_tr_id, v_tr_nome, v_tr_regime
      FROM public.transportadores t
     WHERE regexp_replace(coalesce(t.cpf_cnpj, ''), '\D', '', 'g') = v_cnpj;

    -- Datas
    IF v_venc !~ '^\d{4}-\d{2}-\d{2}$' THEN
      ignorados := ignorados || jsonb_build_array(jsonb_build_object('cnpj', v_cnpj, 'motivo', 'Data de vencimento inválida'));
      CONTINUE;
    END IF;
    BEGIN
      PERFORM v_venc::date;
    EXCEPTION WHEN others THEN
      ignorados := ignorados || jsonb_build_array(jsonb_build_object('cnpj', v_cnpj, 'motivo', 'Data de vencimento inválida'));
      CONTINUE;
    END;

    IF v_renov <> '' THEN
      IF v_renov !~ '^\d{4}-\d{2}-\d{2}$' THEN
        ignorados := ignorados || jsonb_build_array(jsonb_build_object('cnpj', v_cnpj, 'motivo', 'Data de renovação inválida'));
        CONTINUE;
      END IF;
      BEGIN
        PERFORM v_renov::date;
      EXCEPTION WHEN others THEN
        ignorados := ignorados || jsonb_build_array(jsonb_build_object('cnpj', v_cnpj, 'motivo', 'Data de renovação inválida'));
        CONTINUE;
      END;
    END IF;

    -- Status da planilha
    IF v_status NOT IN ('OK', 'VENCIDO') THEN
      ignorados := ignorados || jsonb_build_array(jsonb_build_object('cnpj', v_cnpj, 'motivo', 'Situação da planilha não reconhecida'));
      CONTINUE;
    END IF;

    -- Regime tributário oficial
    v_regime_oficial := CASE lower(translate(v_regime,
        'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç',
        'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'))
      WHEN 'simples nacional' THEN 'Simples nacional'
      WHEN 'lucro presumido' THEN 'Lucro presumido'
      WHEN 'lucro real' THEN 'Lucro real'
      WHEN 'mei caminhoneiro' THEN 'MEI caminhoneiro'
      ELSE NULL
    END;

    IF v_regime <> '' AND v_regime_oficial IS NULL THEN
      ignorados := ignorados || jsonb_build_array(jsonb_build_object('cnpj', v_cnpj, 'motivo', 'Regime tributário fora da lista oficial'));
      CONTINUE;
    END IF;

    -- Duplicidade: mesma transportadora + mesmo vencimento
    IF EXISTS (
      SELECT 1 FROM public.certificados c
       WHERE lower(btrim(c.empresa)) = lower(btrim(v_tr_nome))
         AND c.vencimento = v_venc::date
    ) THEN
      ignorados := ignorados || jsonb_build_array(jsonb_build_object('cnpj', v_cnpj, 'motivo', 'Já existente'));
      CONTINUE;
    END IF;

    INSERT INTO public.certificados (empresa, tipo, vencimento, data_renovacao_agendada, observacoes, status)
    VALUES (
      v_tr_nome,
      'A1',
      v_venc::date,
      CASE WHEN v_renov = '' THEN NULL ELSE v_renov::date END,
      CASE WHEN v_obs = '' THEN NULL ELSE v_obs END,
      CASE WHEN v_renov = '' THEN 'ativo' ELSE 'renovacao_agendada' END
    )
    RETURNING id INTO v_novo_id;

    inseridos := inseridos || jsonb_build_array(jsonb_build_object(
      'id', v_novo_id, 'cnpj', v_cnpj, 'empresa', v_tr_nome, 'vencimento', v_venc));

    IF v_regime_oficial IS NOT NULL AND lower(btrim(v_tr_regime)) IS DISTINCT FROM lower(v_regime_oficial) THEN
      UPDATE public.transportadores
         SET inscricao_estadual = v_regime_oficial
       WHERE id = v_tr_id;

      regimes := regimes || jsonb_build_array(jsonb_build_object(
        'transportadora', v_tr_nome,
        'anterior', NULLIF(v_tr_regime, ''),
        'novo', v_regime_oficial));
    END IF;
  END LOOP;

  RETURN jsonb_build_object('inseridos', inseridos, 'ignorados', ignorados, 'regimes', regimes);
END;
$$;

GRANT EXECUTE ON FUNCTION public.importar_certificados(jsonb) TO authenticated;