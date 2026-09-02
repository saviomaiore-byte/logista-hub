# AUDITORIA MCP — ASSISTENTE MAIORE

Somente diagnóstico. Nenhum arquivo de código, banco, RLS, policy, tool ou UI foi alterado.

## 1. Visão geral

- 6 tools, todas read-only, definidas em `src/lib/mcp/tools/` e registradas em `src/lib/mcp/index.ts`.
- O servidor é publicado como Edge Function `mcp` (`supabase/functions/mcp/index.ts`, arquivo auto-gerado pelo bundler do plugin Vite). `supabase/config.toml` define `verify_jwt = false` para essa função — a verificação é feita pelo SDK MCP via OAuth (`auth.oauth.issuer`, issuer `.../auth/v1`, audience `authenticated`).
- Padrão comum a todas as tools: `ctx.isAuthenticated()` → `supabaseForUser(ctx)` (client criado com URL + chave publicável e header `Authorization: Bearer <token do usuário>`) → 1 query PostgREST → resposta em `content` (JSON string) + `structuredContent`.
- Nenhuma tool usa service role. `outputSchema` é `null` em todas (manifesto).
- Volume real no banco hoje: motoristas 307, transportadores 137, contratos 910, seguros 1, certificados 15, vínculos transportador_motoristas 283.

Arquitetura geral: consistente e homogênea. A camada de CONSULTAS existe; a camada de ANÁLISES ainda não tem nenhuma tool dedicada.

## 2. Auditoria individual

### 2.1 list_motoristas

1. Implementação — `src/lib/mcp/tools/list-motoristas.ts`. Tabela `motoristas`. Sem joins. Nenhuma lógica adicional além dos filtros.
2. Parâmetros — `busca` (string, opcional, sem default; quando ausente não filtra) aplicada via `.or("nome.ilike.%X%,cpf.ilike.%X%")`; `situacao_operacional` (string, opcional, `.eq`); `limite` (int 1–100, default 25). Validação: apenas `trim()` e faixa do limite; nenhum enum validado.
3. Dados retornados — id, nome, cpf, telefone, email, cidade, estado, status, situacao_operacional, cnh_vencimento, mopp_vencimento, mopp_vitalicio. `cpf`, `telefone` e `email` são pessoais e vão em toda listagem, mesmo quando a pergunta não os exige. Faltam campos usados pelas regras de aptidão em transportadores (ANTT/alvará/certificado) — a tool sozinha não determina aptidão.
4. Filtros e limitações — ordenação por `nome`; limite máximo 100; sem paginação (`offset`/cursor); com 307 motoristas, uma varredura completa exige ≥4 chamadas e não há como pedir a página seguinte de forma determinística.
5. Segurança — usa o token do usuário; a RLS `All authenticated can view motoristas` (`qual: true`) se aplica igual à aplicação web. Não há escalonamento. Ponto de atenção: `busca` é interpolada crua no filtro `.or(...)`; vírgulas, parênteses ou pontos no texto podem alterar a expressão PostgREST (quebra da consulta ou filtro diferente do pretendido). Não expande escopo de leitura além do que o usuário já vê, mas é entrada não sanitizada.
6. Consistência — `situacao_operacional` existe hoje nas duas tabelas (`motoristas` e `transportadores`); o módulo de Relatórios usa a da transportadora vinculada. Filtrar por `motoristas.situacao_operacional` pode divergir do conceito atual do sistema. **NÃO CONFIRMADO** qual das duas colunas é a fonte de verdade em uso corrente.
7. Comportamento do agente — descrição clara para "listar/buscar motoristas". Não informa que os valores válidos de `situacao_operacional` são livres (texto), nem que a lista é truncada.
8. Sobreposição — complementar a `get_motorista` (lista → detalhe).
9. Performance — SELECT enxuto, limite obrigatório, sem join. `ilike %texto%` não usa índice, mas a tabela é pequena.

### 2.2 get_motorista

1. Implementação — `src/lib/mcp/tools/get-motorista.ts`. Tabelas `motoristas` (`select *`, `maybeSingle`) e `transportador_motoristas` com join embutido em `transportadores(id, razao_social, cpf_cnpj, status, situacao_operacional)`. 2 queries por chamada.
2. Parâmetros — `id` (uuid, obrigatório, validado por `z.string().uuid()`). Sem default.
3. Dados retornados — **todas** as colunas de `motoristas`: inclui cpf, rg, endereco, data_nascimento, estado_civil, telefone, email, números de CNH/MOPP/ANTT/alvará/certificado, `created_by`. Conjunto claramente mais sensível que o necessário para consultas operacionais; `select *` também acompanha automaticamente qualquer coluna futura, inclusive sensível.
4. Filtros e limitações — sem limite na consulta de vínculos (na prática poucos por motorista, máx. observado compatível com 283 vínculos/307 motoristas).
5. Segurança — respeita RLS (`SELECT true` para autenticados em `motoristas`, `transportador_motoristas`, `transportadores`). Sem bypass. Risco = exposição de PII ao agente/LLM, não de permissão.
6. Consistência — retorna as colunas do cadastro reais; coerente com a UI.
7. Comportamento do agente — clara, mas exige `id`: o agente precisa sempre chamar `list_motoristas` antes. A descrição não diz isso explicitamente.
8. Sobreposição — nenhuma; é o detalhe de `list_motoristas`.
9. Performance — 2 queries fixas; sem N+1 interno.

### 2.3 list_transportadores

1. Implementação — `src/lib/mcp/tools/list-transportadores.ts`. Tabela `transportadores`. Sem joins.
2. Parâmetros — `busca` (opcional, `.or("razao_social.ilike…,cpf_cnpj.ilike…")`), `limite` (1–100, default 25).
3. Dados retornados — id, razao_social, cpf_cnpj, contato, email, status, situacao_operacional, antt_numero, alvara_numero, certificado_numero. Retorna os **números** dos documentos; para pendências bastaria um booleano "possui/não possui" — os números são dado sensível desnecessário para o agente.
4. Filtros e limitações — ordem por `razao_social`; sem paginação; 137 registros exigem ≥2 chamadas para varredura.
5. Segurança — token do usuário + RLS `SELECT true`. Mesma observação de interpolação de `busca` no `.or(...)`.
6. Consistência — os três campos de documento são exatamente os usados por `src/lib/aptidao.ts` (presença do número = regular). Coerente.
7. Comportamento do agente — adequada; não diz que os documentos são avaliados por presença/ausência, não por vencimento.
8. Sobreposição — não retorna motoristas vinculados; o cruzamento só existe em `get_motorista` (sentido inverso). Lacuna real.
9. Performance — OK.

### 2.4 list_contratos

1. Implementação — `src/lib/mcp/tools/list-contratos.ts`. Tabela `contratos`. Sem joins.
2. Parâmetros — `status` (opcional, `.eq`, sem enum validado), `limite` (1–100, default 25).
3. Dados retornados — id, empresa, cnpj, tipo, modelo, status, data_envio, data_assinatura, motorista_id, transportador_id, observacoes. Retorna apenas **IDs** de motorista/transportador: para nomear as partes o agente precisa de chamadas extras → N+1 no nível do agente. `observacoes` é texto livre, pode inflar a resposta.
4. Filtros e limitações — ordem por `created_at desc`; sem filtro por motorista_id, transportador_id ou período; limite 100 contra **910 contratos** — pior razão cobertura/limite entre as tools. Perguntas do tipo "o motorista X tem contrato assinado?" não são respondíveis de forma confiável.
5. Segurança — respeita RLS (`SELECT true` autenticados). Sem bypass.
6. Consistência — `status` livre; a regra de aptidão do sistema depende de "contrato assinado" vinculado ao motorista, conceito que a tool não expõe diretamente.
7. Comportamento do agente — descrição pobre: não lista status possíveis nem avisa que não há filtro por motorista/transportador. Alto risco de o agente concluir erroneamente "não há contrato" a partir de uma lista truncada.
8. Sobreposição — nenhuma, mas é a peça que mais depende de combinação com outras tools.
9. Performance — query leve; o problema é insuficiência de filtro, não custo.

### 2.5 list_seguros

1. Implementação — `src/lib/mcp/tools/list-seguros.ts`. Tabela `seguros`. Sem joins.
2. Parâmetros — `status` (opcional, `.eq`), `seguradora` (opcional, `.ilike %x%`), `limite` (1–100, default 25).
3. Dados retornados — id, seguradora, tipo, numero_apolice, status, vigencia_inicio, vigencia_fim, valor_premio, motorista_id. `valor_premio` é dado financeiro; `numero_apolice` é identificador sensível. Só `motorista_id`, sem nome.
4. Filtros e limitações — ordem por `vigencia_fim` asc (`nullsFirst: false`); sem filtro por motorista nem por janela de vencimento. Hoje há apenas 1 registro, então não há risco imediato de truncamento.
5. Segurança — RLS respeitada, sem bypass.
6. Consistência — coerente com o módulo de Seguros; a conferência de seguros (`conferencia_seguros*`) não é exposta por nenhuma tool.
7. Comportamento do agente — adequada; não indica valores de `status`.
8. Sobreposição — nenhuma.
9. Performance — OK.

### 2.6 list_certificados_vencendo

1. Implementação — `src/lib/mcp/tools/list-certificados-vencendo.ts`. Tabela `certificados`. Sem joins. Lógica adicional: calcula `limite_data = hoje + dias` e aplica `.lte("vencimento", limite_data)` — inclui vencidos, como a descrição afirma.
2. Parâmetros — `dias` (int 0–365, default 30), `limite` (int 1–100, default 50).
3. Dados retornados — id, empresa, tipo, status, vencimento, data_renovacao_agendada, observacoes, mais `ate` (data limite) em `structuredContent`. Nada sensível.
4. Filtros e limitações — ordem por `vencimento` asc; 15 registros na base, sem risco de truncamento. Não há filtro por empresa.
5. Segurança — RLS `All authenticated can view certificados` respeitada.
6. Consistência — refere-se a **certificados digitais da empresa** (tabela `certificados`), não ao `certificado_numero` de transportadores. Conceitos diferentes com nome parecido.
7. Comportamento do agente — a melhor descrição do conjunto (regra e default explícitos). Ainda assim, o agente pode confundir com "certificado do transportador".
8. Sobreposição — conflito semântico com `list_transportadores` (campo `certificado_numero`).
9. Performance — a única com cálculo temporal server-side; ótima.

## 3. Segurança

| Tool | Classificação | Motivo |
|---|---|---|
| list_motoristas | 🟡 Atenção | RLS respeitada, sem bypass; mas `busca` é interpolada crua no filtro `.or(...)` e PII (CPF/telefone/e-mail) é retornada em toda listagem. |
| get_motorista | 🟡 Atenção | RLS respeitada; `select *` expõe RG, endereço, data de nascimento, estado civil e `created_by` ao agente. |
| list_transportadores | 🟡 Atenção | RLS respeitada; mesma interpolação em `busca` e exposição dos números de ANTT/alvará/certificado. |
| list_contratos | 🟢 OK | Sem entrada interpolada; campos operacionais. |
| list_seguros | 🟢 OK | Filtros usam `.eq`/`.ilike` parametrizados; expõe valor de prêmio (aceitável para o público interno). |
| list_certificados_vencendo | 🟢 OK | Sem entrada textual livre, sem dado pessoal. |

Confirmações centrais:
- Nenhuma tool usa `SUPABASE_SERVICE_ROLE_KEY`. Todas usam a chave publicável + JWT do usuário, exatamente como o front-end.
- Todas chamam `ctx.isAuthenticated()` antes de qualquer query e `supabaseForUser` lança erro sem token.
- `verify_jwt = false` na função `mcp` é intencional (o handshake OAuth/descoberta precisa passar), com a verificação de token feita pelo SDK contra o issuer do projeto. **NÃO CONFIRMADO por teste de runtime** — a análise é estática, baseada em `auth.oauth.issuer` e no handler gerado.
- Conclusão: as MCP Tools **não contornam** a RLS existente. O escopo de leitura é idêntico ao da aplicação (SELECT liberado para qualquer autenticado nas tabelas consultadas). O risco real é de exposição de PII a um agente/LLM, não de escalonamento de privilégio.

## 4. Performance

| Tool | Classificação | Motivo |
|---|---|---|
| list_motoristas | 🟡 Atenção | 307 registros vs. limite 100 e sem paginação. |
| get_motorista | 🟡 Atenção | `select *` retorna payload maior que o necessário; 2 queries por chamada. |
| list_transportadores | 🟢 OK | 137 registros, campos enxutos. |
| list_contratos | 🔴 Problema | 910 registros, limite máx. 100, sem paginação e sem filtro por motorista/transportador/período — risco alto de resposta truncada interpretada como resultado completo. |
| list_seguros | 🟢 OK | 1 registro; consulta leve. |
| list_certificados_vencendo | 🟢 OK | Filtro temporal server-side, base pequena. |

Nenhuma tool faz N+1 internamente. O N+1 aparece no nível do agente, quando ele precisa resolver `motorista_id`/`transportador_id` de contratos e seguros chamando `get_motorista` repetidamente.

## 5. Qualidade das descrições

| Tool | Adequada? | Observação |
|---|---|---|
| list_motoristas | Parcialmente | Não diz que a lista é truncada, nem quais valores de `situacao_operacional` são válidos, nem de qual tabela vem esse conceito. |
| get_motorista | Sim | Clara; poderia dizer "obtenha o id via list_motoristas". |
| list_transportadores | Parcialmente | "documentos (ANTT, alvará, certificado)" sugere vencimentos; na prática só há número/presença. |
| list_contratos | Não | Genérica demais: sem valores de status, sem aviso de truncamento, sem informar que não há filtro por motorista/transportador. |
| list_seguros | Parcialmente | Não indica valores de status; não avisa que só retorna `motorista_id`. |
| list_certificados_vencendo | Sim | Melhor descrição do conjunto; poderia distinguir de "certificado do transportador". |

## 6. Capacidade atual do Assistente

Perguntas já respondíveis hoje:
- "Quais motoristas têm 'Silva' no nome?" → list_motoristas(busca).
- "Mostre o cadastro completo do motorista X e suas transportadoras." → list_motoristas + get_motorista.
- "Quais transportadores estão sem ANTT?" → list_transportadores (avaliando `antt_numero` nulo, até 100 por chamada).
- "Quais certificados digitais vencem nos próximos 60 dias?" → list_certificados_vencendo(dias=60).
- "Quais apólices vencem primeiro?" / "Temos seguro na seguradora Y?" → list_seguros.
- "Quais foram os últimos contratos cadastrados?" / "Quais contratos estão com status Z?" → list_contratos (com ressalva de truncamento).
- "A CNH do motorista X está vencida?" → get_motorista (comparação de data feita pelo agente).

Perguntas ainda não respondíveis com confiabilidade:
- "O motorista X está apto?" (exige contrato do motorista + documentos da transportadora vinculada; contratos não filtram por motorista).
- "Quantos motoristas estão inaptos no total?" (agregação sobre base truncada).
- "Quais motoristas estão sem contrato assinado?"
- "Quais motoristas da transportadora Y?" (não há tool no sentido transportador → motoristas).

## 7. Camada de análises

| Capacidade | Situação | Detalhe |
|---|---|---|
| A) Pendências | Parcialmente viável | Usa list_motoristas + list_transportadores + list_contratos. Faltam: vínculo motorista↔transportadora em lote e contrato por motorista. Recomendável uma tool de aptidão que aplique `src/lib/aptidao.ts` no servidor. |
| B) Vencimentos | Parcialmente viável | list_certificados_vencendo cobre certificados digitais; list_seguros dá vigências mas sem filtro por janela; CNH/MOPP só vêm em listagem truncada, sem filtro por data. Falta uma tool única de vencimentos por janela de dias. |
| C) Cruzamentos | Não viável de forma eficiente | Só `get_motorista` cruza motorista↔transportadora, um por vez. Contratos e seguros não trazem nomes. Falta tool de cruzamento em lote. |
| D) Alertas | Não viável hoje | Depende de A e B consolidados; nenhuma tool retorna itens críticos priorizados. |
| E) Resumo operacional | Não viável | Nenhuma tool faz agregação/contagem server-side; contagens a partir de listas truncadas produziriam números errados. |

Tools que faltariam (não criar agora): aptidão/pendências de motoristas em lote, vencimentos unificados por janela, cruzamento motorista↔transportadora↔contrato, e um resumo com contagens agregadas.

## 8. Recomendações

### Prioridade 1 — necessário
1. `list_contratos`: adicionar filtro por `motorista_id`/`transportador_id` e indicação de truncamento (ex.: total encontrado) — hoje o agente pode afirmar "sem contrato" de forma incorreta.
2. Escapar/sanitizar `busca` antes de montar o filtro `.or(...)` em `list_motoristas` e `list_transportadores`.
3. Substituir `select *` por lista explícita em `get_motorista`, removendo RG, endereço, data de nascimento, estado civil e `created_by`.
4. Nenhuma agregação/contagem deve ser deduzida de listas truncadas enquanto não houver tool de resumo — restrição a documentar nas instruções do assistente.

### Prioridade 2 — recomendado
5. Paginação (`offset`/cursor) e campo de total nas 4 tools de listagem.
6. Enriquecer descrições: valores de status esperados, aviso de truncamento e distinção entre "certificado digital da empresa" e "certificado do transportador".
7. Resolver a ambiguidade de `situacao_operacional` (motoristas vs. transportadores) para que a tool reflita a fonte de verdade do sistema.
8. Reduzir PII: retornar CPF mascarado em listagens; retornar presença (booleano) em vez de números de ANTT/alvará/certificado.

### Prioridade 3 — futuro
9. Tools da camada de análises (pendências, vencimentos, cruzamentos, alertas, resumo) reaproveitando `src/lib/aptidao.ts` no servidor.
10. Definir `outputSchema` nas tools para respostas estruturadas mais previsíveis.
11. Expor conferência de seguros e frota (cavalos/reboques), hoje sem cobertura MCP.

## Conclusão

**PRECISA CORRIGIR ANTES DE AVANÇAR**

Motivo: a base está segura — nenhuma tool contorna a RLS, todas usam o token do usuário e são read-only. Porém, a camada de ANÁLISES depende de completude e de cruzamentos, e dois pontos quebram isso hoje: `list_contratos` cobre no máximo 100 de 910 contratos sem filtro por motorista/transportador (levando o assistente a conclusões falsas sobre "contrato assinado", que é regra direta de aptidão), e não há paginação nem contagem total em nenhuma listagem. Somando a interpolação não sanitizada de `busca` e o `select *` com PII em `get_motorista`, os itens de Prioridade 1 devem ser resolvidos antes de construir Pendências, Alertas e Resumo Operacional.
