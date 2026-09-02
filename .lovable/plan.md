# Auditoria funcional do MCP / Assistente Maiore em produção

Somente teste e registro de resultados. Nenhuma alteração de código, banco, RLS, Storage, MCP, UI ou publicação.

## Matriz de testes

| # | Ferramenta | Cenário | Entrada | Resultado esperado | Criticidade |
|---|------------|---------|---------|--------------------|-------------|
| A1 | list_motoristas | Smoke | `{}` | Lista com metadata (returned/total_encontrado/limite/offset/truncated/aviso) | Alta |
| A2 | list_transportadores | Smoke | `{}` | Lista + metadata; documentos mascarados | Alta |
| A3 | list_contratos | Smoke | `{}` | Lista + metadata; total ~910 | Alta |
| A4 | list_seguros | Smoke | `{}` | Lista + metadata (base pequena) | Média |
| A5 | list_certificados_vencendo | Smoke | `{}` (dias padrão 30) | Lista + campo `ate` coerente | Média |
| A6 | resumo_operacional | Smoke | `{}` | Totais consolidados, sem erro | Alta |
| B1 | list_motoristas | Busca por nome | `busca:"a"` | Subconjunto coerente, total_encontrado menor que o geral | Alta |
| B2 | list_motoristas | Situação operacional | `situacao_operacional:"em_praca_apto"` | Só registros com esse marcador | Média |
| B3 | list_transportadores | Busca parcial | `busca:"transp"` | Filtro aplicado, refletido em filtros_aplicados | Média |
| B4 | list_contratos | Status | `status:"assinado"` | Só assinados; total coerente | Alta |
| B5 | list_contratos | Por motorista | `motorista_id:<id real>` | Só contratos daquele motorista | Alta |
| B6 | list_contratos | Por transportador | `transportador_id:<id real>` | Só contratos daquele transportador | Alta |
| B7 | list_seguros | Status + seguradora | `status:"ativo"`, `seguradora:"<parcial>"` | Filtro combinado correto | Média |
| B8 | list_certificados_vencendo | Janela ampliada | `dias:90` | Conjunto ⊇ ao de dias:30 | Média |
| B9 | analisar_vencimentos | Entidade | `entidade:"motorista"`, `dias:30` | Só motoristas | Alta |
| B10 | analisar_pendencias | Entidade | `entidade:"transportador"` | Só motivos de transportador | Alta |
| C1 | list_motoristas | Limite pequeno | `limite:2, offset:0` | returned=2, truncated=true, total real | Alta |
| C2 | list_motoristas | Offset > 0 | `limite:2, offset:2` | Página distinta da C1, mesmo total | Alta |
| C3 | list_motoristas | Offset além do total | `limite:5, offset:100000` | returned=0 sem erro, total preservado | Alta |
| C4 | list_contratos | Sem truncamento | `limite:100` + filtro estreito | truncated=false quando total ≤ limite | Média |
| C5 | list_seguros | Metadata | `limite:1` | Campos de paginação completos e coerentes | Média |
| D1 | list_motoristas | Sem resultado | `busca:"zzzzqqq"` | returned=0, total 0, sem erro nem invenção | Alta |
| D2 | list_contratos | Status inexistente na base | `status:"recusado"` | 0 ou N reais, resposta limpa | Média |
| D3 | list_certificados_vencendo | Janela zero | `dias:0` | Só vencidos/hoje, sem erro | Média |
| D4 | analisar_cruzamentos | Motorista sem vínculos | `motorista_id:<sem vínculo>` | Listas vazias, nenhum vínculo inferido | Alta |
| E1 | list_motoristas | Limite acima do máximo | `limite:500` | Rejeição de validação clara | Alta |
| E2 | list_motoristas | Offset negativo | `offset:-1` | Rejeição de validação | Alta |
| E3 | analisar_vencimentos | Dias fora do intervalo | `dias:9999` | Rejeição de validação | Alta |
| E4 | analisar_pendencias | Entidade inválida | `entidade:"veiculo"` | Rejeição de enum | Média |
| E5 | get_motorista | UUID inválido | `id:"abc"` | Erro de validação, não erro 500 | Alta |
| E6 | get_motorista | UUID válido inexistente | `id:<uuid aleatório>` | "Motorista não encontrado", sem vazamento | Alta |
| E7 | get_motorista | Motorista existente | `id:<id real>` | Cadastro completo + transportadoras vinculadas | Alta |
| F1 | list_motoristas | PII | `limite:5` | CPF mascarado (4 últimos dígitos) | Crítica |
| F2 | list_transportadores | PII | `limite:5` | CPF/CNPJ mascarado; documentos como booleanos | Crítica |
| F3 | analisar_pendencias | PII | `limite:20` | Nenhum CPF/CNPJ ou número de documento | Crítica |
| F4 | analisar_vencimentos | PII | `dias:30` | Sem números de documento | Crítica |
| F5 | analisar_cruzamentos | PII | `limite:20` | Só ids e nomes, sem documentos | Crítica |
| F6 | resumo_operacional | PII | `{}` | Só totais e motivos | Crítica |
| G1 | resumo_operacional × análises | Consistência | comparar com analisar_pendencias/vencimentos | Totais batem ou `incompleto`/`avisos` explicam | Alta |
| G2 | analisar_vencimentos | Janela | `dias:30` | Nenhum item com dias_para_vencer > 30 | Alta |
| G3 | analisar_pendencias × list_contratos | Coerência | motorista com "Sem contrato assinado" | list_contratos confirma ausência de assinado | Alta |
| G4 | analisar_cruzamentos × get_motorista | Coerência | mesmo motorista | Vínculos idênticos | Média |
| G5 | list_* | Contagens | totais das listagens | Coerentes com resumo_operacional | Média |
| H1 | Todas | Autenticação | chamada sem token | 401/não autenticado | Crítica |
| H2 | Código | Sem service role | inspeção de `src/lib/mcp/supabase.ts` | Usa token do usuário, RLS ativa | Crítica |
| H3 | Código | Somente leitura | inspeção das 10 tools | Nenhum insert/update/delete; readOnlyHint | Crítica |
| H4 | RLS | Escopo de leitura | comparar retorno com policies vigentes | Sem bypass de policy | Alta |
| I1 | Connector | Regressão de catálogo | listar tools | 10 ferramentas disponíveis | Alta |
| I2 | analisar_vencimentos | Regressão NaN | `dias:30, entidade:"ambos", limite:20` | Nenhum NaN/Infinity; datas inválidas em `aviso` | Crítica |
| I3 | Anexos pós-mudança de RLS | Regressão | listagens que dependem de motoristas/transportadores | Nenhuma tool quebrada pela alteração de policies de arquivos | Alta |
| I4 | Todas | Campos nulos | respostas das seções A–D | Nulos tratados, sem crash | Média |

## Resumo

- **Total planejado: 48 testes** (A:6, B:10, C:5, D:4, E:7, F:6, G:5, H:4, I:4 — os itens H2/H3 são inspeção de código).
- **Executáveis direto pelo Connector:** A1–A6, B1–B10, C1–C5, D1–D4, E1–E7, F1–F6, G1–G5, I1, I2, I4 — 44 testes.
- **Dependem de inspeção técnica do código/infra:** H1 (chamada sem token), H2, H3, H4, I3.
- **Dependem de dados específicos (ids reais coletados na fase A/B):** B5, B6, B7, D4, E6, E7, G3, G4.

## Execução proposta

1. Fase A (smoke) para coletar ids reais e totais de referência.
2. Fases B→I na ordem, registrando entrada, saída resumida e veredito (OK / Divergência / Falha).
3. Relatório final apenas em chat, com a lista de divergências encontradas — sem correções nesta etapa.

Nenhuma alteração será feita sem sua autorização.
