# Diagnóstico — 6 achados críticos de SELECT (somente análise)

Escopo: apenas os achados de nível `error` do último scan. Nenhuma alteração foi feita.
Os outros 8 achados de SELECT (cavalos, reboques, certificados, documentos_empresa, relatorio_config, conferencia_*, transportador_motoristas) são nível `warn` e ficam fora desta análise.

## Contexto verificado no banco

- Todas as 6 tabelas têm o mesmo padrão: `SELECT` com `USING (true)` para o papel `authenticated`; `UPDATE` restrito a `created_by = auth.uid() OR has_role(...,'admin')`; `DELETE` só admin.
- Volume atual: motoristas 307, transportadores 137, contratos 910, seguros 1.
- `created_by` está concentrado em apenas 2 usuários distintos por tabela (efeito do backfill anterior para o admin).
- Contas: 6 perfis, 3 com papel admin.

## Achado 1 — `motoristas`

- Policy: `All authenticated can view motoristas` (SELECT, `authenticated`, `USING true`)
- Hoje lê: qualquer usuário logado (todos os 6), inclusive não-admins.
- Por que é crítico: expõe CPF, RG, telefone, e-mail, endereço, nascimento e dados de CNH/MOPP de 307 pessoas — PII sensível sem qualquer vínculo de negócio.
- Depende dessa leitura: Motoristas, Index (dashboard), Conferência, Conferência de Seguros, Relatórios; MCP `list_motoristas`, `get_motorista`, `analisar_pendencias`, `analisar_vencimentos`, `analisar_cruzamentos`, `resumo_operacional`.
- Correção mínima: manter leitura para todos os autenticados, mas retirar as colunas de PII do alcance geral — expor a listagem por uma view/coluna reduzida e restringir a tabela completa a admin; alternativa mais simples: `USING (created_by = auth.uid() OR has_role(auth.uid(),'admin'))`.
- Risco: **alto**. Com `created_by` concentrado em 2 usuários, a versão por propriedade deixaria os demais com a base praticamente vazia — quebra telas e MCP.

## Achado 2 — `transportadores`

- Policy: `All authenticated can view transportadores` (SELECT, `USING true`)
- Hoje lê: qualquer usuário logado.
- Por que é crítico: CPF/CNPJ, e-mail, endereço e dados cadastrais de 137 transportadores.
- Depende: Transportadores, Contratos, Certificados, Relatórios; MCP `list_transportadores`, `analisar_pendencias`, `analisar_cruzamentos`, `resumo_operacional`.
- Correção mínima: mesma opção da anterior — view sem documento completo para leitura ampla, tabela completa só para admin.
- Risco: **alto** pela mesma concentração de `created_by`. O MCP já mascara CPF/CNPJ na saída, então o vazamento real é via cliente web, não via MCP.

## Achado 3 — `contratos`

- Policy: `All authenticated can view contratos` (SELECT, `USING true`)
- Hoje lê: qualquer usuário logado.
- Por que é crítico: 910 contratos com CNPJ e `arquivo_url` de documentos assinados.
- Depende: Contratos, Index, Relatórios; MCP `list_contratos`, `analisar_pendencias`, `analisar_cruzamentos`, `resumo_operacional`.
- Correção mínima: restringir SELECT a criador/admin, ou a contratos cujo transportador/motorista o usuário possa ver.
- Risco: **alto**; Relatórios e o resumo do MCP passariam a produzir números diferentes por usuário.

## Achado 4 — `seguros`

- Policy: `All authenticated can view seguros` (SELECT, `USING true`)
- Hoje lê: qualquer usuário logado.
- Por que é crítico: apólices vinculadas a motoristas identificáveis (prêmio, seguradora, arquivo).
- Depende: Seguros, Conferência de Seguros; MCP `list_seguros`.
- Correção mínima: `USING (created_by = auth.uid() OR has_role(...,'admin'))`.
- Risco: **baixo hoje** (apenas 1 registro), mas cresce conforme a base for populada por usuários diferentes.

## Achado 5 — `motorista_arquivos`

- Policy: `All authenticated can view motorista_arquivos` (SELECT, `USING true`); INSERT já é dono-ou-admin.
- Hoje lê: qualquer usuário logado.
- Por que é crítico: incoerência com o INSERT — quem não pode anexar consegue listar todos os caminhos de arquivos de documentos pessoais.
- Depende: aba de anexos do motorista (`useMotoristas`), diálogo de documentos.
- Correção mínima: alinhar o SELECT ao mesmo predicado do INSERT (join de propriedade com `motoristas`), sem mexer no bucket.
- Risco: **médio**. A tabela guarda só metadados; o download real já usa URL assinada no bucket privado. Não é usada por nenhuma ferramenta MCP.

## Achado 6 — `transportador_arquivos`

- Policy: `All authenticated can view transportador_arquivos` (SELECT, `USING true`); INSERT já é dono-ou-admin.
- Hoje lê: qualquer usuário logado.
- Por que é crítico: mesma incoerência do achado 5, para documentos de transportadoras.
- Depende: aba de anexos do transportador (`useTransportadores`), `TransportadorDocsDialog`.
- Correção mínima: alinhar SELECT ao predicado do INSERT.
- Risco: **médio**; sem impacto no MCP.

## Leitura geral e recomendação

O padrão atual não é um bug: foi decidido em etapa anterior que qualquer usuário autenticado precisa enxergar toda a base operacional (era exatamente o problema de "só o meu usuário vê os dados"). O scanner avalia isso como um modelo multi-tenant, que não é o caso — aqui todos os 6 usuários pertencem à mesma empresa e ao domínio `@maiore.com.br`.

Assim, a correção realista não é restringir por `created_by`, e sim reduzir a superfície de PII:

1. **Achados 5 e 6 (arquivos)** — corrigíveis com baixo risco: alinhar SELECT ao INSERT. Não afetam o MCP.
2. **Achados 1 e 2 (motoristas, transportadores)** — tratar com view de leitura sem documento completo (CPF/CNPJ/RG mascarados) para não-admin, mantendo a tabela crua para admin. Exige ajuste em telas e nas tools MCP.
3. **Achados 3 e 4 (contratos, seguros)** — manter leitura geral e marcar como aceitos conscientemente, ou restringir junto com o item 2.

Se nada for alterado, a alternativa formal é marcar os achados como aceitos com justificativa (empresa única, domínio restrito, auditoria em `audit_log`), para o scan parar de reportá-los como pendentes.

Nenhuma alteração foi executada nesta etapa.
