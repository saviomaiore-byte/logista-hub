# MCP — Inteligência e Orquestração (plano técnico)

Somente planejamento. Nenhuma alteração de código, banco, RLS, Storage, UI, ferramentas ou deploy.

## A. Diagnóstico da arquitetura atual

Verificado no código:

- `src/lib/mcp/index.ts` define o servidor com `instructions` (um bloco único de texto) e registra as 10 tools; `auth.oauth.issuer` exige token do Supabase (audiência `authenticated`).
- `src/lib/mcp/supabase.ts` cria um client por chamada com a publishable key + `Authorization: Bearer <token do usuário>`. Não há service role. Helpers: `maskDocumento`, `temDocumento`, `likeTerm`, `rangeFor`, `paginationMeta`.
- Todas as 10 tools usam apenas `.select()`, com `readOnlyHint: true`. Nenhuma escreve.
- Cada tool é independente: não há chamada de tool dentro de tool, nem estado entre chamadas. `resumo_operacional` é a única exceção parcial — agrega internamente a lógica de pendências/vencimentos e já sinaliza `incompleto` + `avisos`.
- Paginação padronizada em listagens (`returned`, `total_encontrado`, `limite`, `offset`, `truncated`, `aviso`). As análises usam um formato próprio (`total_analisado`, `returned`, `limite`, `truncated`, `aviso`), sem `offset` — ou seja, **não é possível paginar além do `limite` máximo (200) em `analisar_pendencias`/`analisar_vencimentos`/`analisar_cruzamentos`**.
- `list_certificados_vencendo` não retorna bloco de paginação (só array + `ate`).

Conclusão do diagnóstico: a base de dados/tools está pronta; falta apenas a **camada de decisão**. Hoje ela existe só como um parágrafo em `instructions`, sem regras de encadeamento, limites, ou política de resposta parcial.

## B. Arquitetura recomendada de orquestração

Três alternativas avaliadas:

| Alternativa | Prós | Contras | Veredito |
|---|---|---|---|
| 1. Só instruções do servidor MCP (`instructions` + descrições de tools) | Zero código novo, zero superfície de risco, funciona com qualquer cliente (Lovable Connector, Claude, Cursor); o próprio modelo já sabe encadear | Depende da aderência do modelo; não há garantia determinística | **Recomendada** |
| 2. Camada de serviço (orquestrador em Edge Function/`src/lib/mcp/orchestrator.ts`) | Determinística, limites forçados por código | Duplica regras já existentes; novo ponto de falha; precisa manter estado; não usada por clientes que chamam tools diretamente | Não nesta etapa |
| 3. Nova tool "macro" (ex.: `responder_pergunta`) que chama várias internamente | Uma chamada só; controle de PII centralizado | Vira um mini-agente dentro do MCP, com custo, latência e risco de LLM dentro da tool; contradiz "não criar ferramentas ainda" | Não nesta etapa |

**Recomendação: alternativa 1 (prompt-driven), com opção futura de 3 para 2–3 fluxos campeões.** É a mais simples e a única que não amplia superfície de segurança. A inteligência vira um "protocolo de orquestração" escrito em `instructions`, complementado por frases curtas de encadeamento nas `description` das tools envolvidas.

## C. Fluxo de decisão do Assistente

```text
Pergunta
  |
  v
Classificar intenção (ver seção 7 / abaixo)
  |
  +-- detalhe de 1 entidade -----> get_motorista (ou list_* com busca)   -> responder
  +-- listagem/contagem simples -> 1 list_*                              -> responder
  +-- panorama geral -----------> resumo_operacional                     -> responder
  +-- analítica focada ---------> analisar_pendencias | analisar_vencimentos
  +-- relacionamento -----------> analisar_cruzamentos
  +-- composta -----------------> passo 1 (análise) -> extrair ids ->
                                   passo 2 (cruzamento/list filtrado)
  |
  v
Tenho dados suficientes? --nao--> mais 1 passo (respeitando limites da seção H)
  |sim
  v
Alguma resposta veio truncada/incompleta?  -> declarar explicitamente na resposta
  |
  v
Responder somente com o que foi retornado (nunca inferir)
```

Regra de parada: assim que a pergunta puder ser respondida com os dados já obtidos, parar. Nunca chamar uma tool "para conferir" um número que outra já retornou.

## D. Matriz de dependência entre as 10 ferramentas

| Origem | Destino | Quando usar | Objetivo |
|---|---|---|---|
| `analisar_pendencias` | `list_contratos` (`motorista_id`) | Pergunta cita pendência **e** contrato | Detalhar quais contratos existem/faltam para o motorista |
| `analisar_pendencias` | `analisar_cruzamentos` (`motorista_id`/`transportador_id`) | Precisa saber a transportadora responsável pela pendência | Atribuir responsabilidade |
| `analisar_vencimentos` | `analisar_cruzamentos` (`motorista_id`) | Pergunta "quem é afetado" por um vencimento | Ligar documento vencido → transportadora/contratos |
| `analisar_vencimentos` | `get_motorista` | Só quando o usuário pedir o detalhe de **um** motorista específico | Detalhe individual (atenção: expõe PII) |
| `list_motoristas` | `get_motorista` | Usuário nomeia uma pessoa e quer o cadastro | Resolver nome → id → detalhe |
| `list_motoristas` | `list_contratos` (`motorista_id`) | Contratos de um motorista nomeado | Evitar varredura de 910 contratos |
| `list_transportadores` | `list_contratos` (`transportador_id`) | Contratos de uma transportadora nomeada | Filtro server-side |
| `list_transportadores` | `analisar_cruzamentos` (`transportador_id`) | Quais motoristas pertencem a uma transportadora | Vínculos comprovados |
| `list_seguros` | `get_motorista` | Só se o usuário pedir o segurado específico | Resolver `motorista_id` → nome |
| `resumo_operacional` | `analisar_pendencias` / `analisar_vencimentos` | Somente quando o usuário pedir o **detalhe** por trás dos totais | Aprofundar sob demanda |

Encadeamentos **desnecessários** (explicitamente desaconselhados):
- `resumo_operacional` → `analisar_*` de forma automática: o resumo já agrega internamente; chamar as análises sem o usuário pedir detalhe é redundante.
- `analisar_cruzamentos` → `list_contratos`: os cruzamentos já trazem `contrato_id`, `contrato_tipo`, `contrato_status`.
- `list_certificados_vencendo` não alimenta nem é alimentada por nenhuma outra tool (escopo empresa, não operação).
- `get_motorista` como passo de enriquecimento em massa: proibido (PII + custo).

Reavaliação do Exemplo 2: das 4 chamadas propostas, apenas **`resumo_operacional`** é necessária para "principais problemas"; `analisar_pendencias` entra como segundo passo só se o usuário quiser a lista nominal (o resumo já avisa que a lista foi truncada); `analisar_vencimentos` só se o resumo indicar documentos vencidos > 0; `analisar_cruzamentos` **não** é necessária. Ou seja: 1 chamada no caso típico, até 3 no caso detalhado.

Exemplo 3: `analisar_vencimentos(dias:30)` já retorna id, nome, tipo de documento, data e situação operacional — sem números de documento. `analisar_cruzamentos` só é chamada para os motoristas efetivamente listados (hoje: 4), e só quando a pergunta pedir "quem é afetado" no sentido de transportadora/contrato.

## E. Estratégia de paginação

- `truncated: true` nunca pode ser tratado como lista completa. A resposta deve dizer: "X de Y registros" e oferecer continuar.
- Para as **listagens**: paginar com `offset += limite` enquanto `truncated` for true, respeitando o teto de páginas da seção H. Preferir sempre **filtro server-side** (`busca`, `status`, `motorista_id`, `transportador_id`) a varrer páginas.
- Para as **análises** (sem `offset`): a única alavanca é aumentar `limite` até 200. Se `total_com_pendencias` > 200, a resposta deve ser explicitamente parcial e usar os **totais agregados** (que são exatos) em vez da lista.
- Contagens sempre a partir de `total_encontrado` / `total_analisado` / `total_com_pendencias`, nunca de `returned`.
- `offset` além do total retorna erro de range (achado conhecido): a orquestração deve parar de paginar quando `offset + returned >= total_encontrado`, nunca "sondar" além.

## F. Estratégia de tratamento de erros

| Situação | Comportamento exigido |
|---|---|
| Tool retorna `isError` | Informar qual tool falhou e o motivo; não substituir por estimativa |
| Retorno vazio | Dizer "nenhum registro encontrado para os filtros X" — e só se `truncated:false` |
| Retorno parcial | Declarar "resultado parcial: N de M" e usar totais agregados para conclusões |
| Dados aparentemente conflitantes | Apresentar ambos, citando a fonte de cada número, e apontar a divergência; não escolher um silenciosamente |
| Id inexistente (`get_motorista`) | Reportar "não encontrado"; não tentar adivinhar por nome parecido sem confirmar com `list_motoristas` |
| Passo dependente de um passo que falhou | Não executar; responder com o que se obteve e declarar o que ficou faltando |
| Parâmetro inválido rejeitado | Corrigir o parâmetro uma vez; se falhar de novo, reportar — sem loop |

Regra absoluta: nenhum dado inventado, nenhuma inferência de vínculo que não venha de registro (`analisar_cruzamentos` já garante isso do lado do dado).

## G. Estratégia de PII

- A orquestração **não pode** aumentar exposição. Regras:
  - Usar sempre a tool com menor superfície de PII capaz de responder: preferir `analisar_*` e `list_*` (documento mascarado) a `get_motorista` (documento em claro).
  - `get_motorista` só quando o usuário pedir explicitamente o cadastro de **uma** pessoa; nunca em laço.
  - Nunca reconciliar dados de duas tools para reconstruir documento (ex.: casar sufixo mascarado de `list_motoristas` com CNPJ de `list_certificados_vencendo.observacoes`) — esse é o único caminho de exposição indireta identificado e deve ser proibido em instrução.
  - Em respostas agregadas, identificar pessoas por **nome + id**, nunca por documento.
  - Não repetir na resposta campos de PII que não foram perguntados (telefone, e-mail, endereço).
- Os achados de PII da auditoria (`get_motorista`, `list_certificados_vencendo`) permanecem abertos e fora desta etapa; a instrução apenas evita amplificá-los.

## H. Limites de segurança/performance

| Limite | Valor proposto |
|---|---|
| Máx. de chamadas de tool por pergunta | 5 (típico: 1–2) |
| Profundidade máxima de encadeamento | 3 níveis |
| Máx. de ids propagados de uma tool para outra | 10 (acima disso, responder de forma agregada) |
| Máx. de páginas em uma mesma listagem | 4 (≈ 400 registros) antes de declarar parcial |
| `limite` padrão em passos intermediários | 25; usar 100–200 só quando o total já for conhecido e couber |
| Chamadas repetidas com os mesmos argumentos | Proibidas — reutilizar o resultado anterior |
| Tamanho da resposta | Totais + até ~20 exemplos nominais; o resto agregado |

Paralelismo:

```text
Independentes (paralelo):        Dependentes (sequencial):
resumo_operacional ──┐           analisar_pendencias
list_certificados ───┤                  ↓ (ids)
list_seguros ────────┴─ resposta   analisar_cruzamentos
                                        ↓
                                    resposta
```

Podem ir em paralelo: `resumo_operacional`, `list_certificados_vencendo`, `list_seguros`, `list_motoristas`+`list_transportadores`, e `analisar_pendencias`+`analisar_vencimentos` (não dependem entre si). Obrigatoriamente sequenciais: qualquer passo que precise de `motorista_id`/`transportador_id` vindo de outro passo (`list_* → get_motorista`, `analisar_* → analisar_cruzamentos`, `list_* → list_contratos` filtrado).

Segurança preservada por construção: nenhuma tool nova, nenhum client novo, mesmo token/RLS, `readOnlyHint` em todas, sem service role, sem mecanismo de ação.

## I. Exemplos de perguntas reais

| # | Pergunta | Ferramentas / ordem | Resultado esperado |
|---|---|---|---|
| 1 | "Quais motoristas estão com pendências e quais contratos deles estão pendentes?" | `analisar_pendencias(entidade:"motorista", limite:200)` → para até 10 ids: `list_contratos(motorista_id)` (paralelo entre si) | Lista nominal com motivos + situação dos contratos; declarar parcial se total > 200 |
| 2 | "Quais são os principais problemas da operação?" | `resumo_operacional()` apenas | Totais + top motivos + avisos de truncamento; sem chamadas extras |
| 3 | "Quais documentos vencem nos próximos 30 dias e quem será afetado?" | `analisar_vencimentos(dias:30, limite:100)` → `analisar_cruzamentos(motorista_id)` só para os listados | Documento, data, dias restantes, motorista e transportadora afetada; sem números de documento |
| 4 | "Quantos contratos assinados temos?" | `list_contratos(status:"assinado", limite:1)` | Usar `total_encontrado`; nunca contar itens da página |
| 5 | "Me mostre o cadastro do motorista Adalberto" | `list_motoristas(busca:"Adalberto")` → `get_motorista(id)` | Confirmar identidade antes do detalhe; só um registro |
| 6 | "Quais motoristas estão vinculados à transportadora X?" | `list_transportadores(busca:"X")` → `analisar_cruzamentos(transportador_id)` | Vínculos comprovados; ausência = ausência de registro |
| 7 | "Alguma transportadora está sem ANTT/alvará/certificado?" | `analisar_pendencias(entidade:"transportador", limite:200)` | Lista nominal com motivos; sem números de documento |
| 8 | "Quais certificados digitais da empresa vencem em 90 dias?" | `list_certificados_vencendo(dias:90)` | Lista por vencimento; não confundir com certificado do transportador |
| 9 | "Quais seguros estão vencidos?" | `list_seguros(status:"ativo")` + regra de `vigencia_fim` no passado | Apontar apólices ativas com vigência expirada |
| 10 | "O motorista Y pode rodar hoje?" | `list_motoristas(busca:"Y")` → `analisar_pendencias` (ou `analisar_cruzamentos` + `list_contratos`) | Resposta baseada apenas nos motivos oficiais de aptidão; sem julgamento próprio |

## J. Arquivos que precisariam ser alterados

| Arquivo | Motivo | Tipo de alteração |
|---|---|---|
| `src/lib/mcp/index.ts` | Único ponto onde vivem as `instructions` do servidor — receberia o protocolo de orquestração (decisão, encadeamento, limites, paginação, PII, erros) | Edição de texto (string `instructions`); nenhuma mudança de tools ou auth |
| `src/lib/mcp/tools/analisar-pendencias.ts` | Acrescentar 1 frase de encadeamento na `description` ("para detalhar contratos, use list_contratos com motorista_id") | Edição de `description` apenas |
| `src/lib/mcp/tools/analisar-vencimentos.ts` | Idem, apontando `analisar_cruzamentos` para "quem é afetado" | Edição de `description` apenas |
| `src/lib/mcp/tools/resumo-operacional.ts` | Deixar explícito que é ponto de partida e que não deve ser combinada sem necessidade | Edição de `description` apenas |
| `src/lib/mcp/tools/get-motorista.ts` | Deixar explícito na `description` que é para consulta individual e não para enriquecimento em massa (barreira de PII) | Edição de `description` apenas |
| `.lovable/mcp/manifest.json` | Regenerado automaticamente ao publicar, refletindo as descrições novas | Artefato gerado — não editado à mão |
| `docs/arquitetura.md` | Registrar o protocolo de orquestração | Documentação (opcional) |

Nenhum arquivo de banco, RLS, Storage, UI ou hook é tocado. Nenhuma tool nova. A Edge Function `supabase/functions/mcp/index.ts` é gerada pelo plugin a partir de `src/lib/mcp` e só muda no deploy.

## K. Riscos

| Risco | Classificação | Observação |
|---|---|---|
| Modelo não seguir o protocolo em 100% dos casos (limites são "soft") | **Médio** | Mitigado por regras curtas e numeradas; sem garantia determinística |
| `instructions` muito longa reduzir aderência geral | Médio | Manter o protocolo enxuto; regras específicas nas `description` das tools |
| Encadeamento aumentar custo/latência | Baixo | Teto de 5 chamadas e preferência por filtro server-side |
| Exposição indireta de PII por reconciliação entre tools | **Alto** se não instruído; baixo com a proibição explícita | Achados de PII de base seguem abertos, fora do escopo |
| Conclusão errada por lista truncada nas análises (sem `offset`) | Médio | Regra de usar totais agregados acima de 200 |
| Regressão nas 10 tools | Baixo | Só `description`/`instructions` mudam; comportamento e schemas intactos |
| Divergência entre manifesto publicado e código (já ocorreu antes) | Médio | Exigir redeploy e reconferência do catálogo após a mudança |

## L. Critérios de aceite

1. As 10 ferramentas continuam disponíveis, com schemas e comportamento idênticos (nenhum `inputSchema`/`outputSchema` alterado).
2. `instructions` contém, de forma verificável: fluxo de decisão, matriz de encadeamento permitido, encadeamentos desaconselhados, limites numéricos (5 chamadas / 3 níveis / 10 ids / 4 páginas), regra de `truncated`, regra de PII e regra de erro.
3. Exemplo 2 ("principais problemas") é respondido com **1 chamada** (`resumo_operacional`) no caso típico.
4. Exemplo 1 é respondido com no máximo 3 chamadas e correlação explícita entre pendência e contrato.
5. Exemplo 3 responde sem nenhum número de documento na saída.
6. Nenhuma resposta usa `returned` como total; toda resposta com `truncated:true` declara-se parcial.
7. Nenhuma resposta contém dado não presente nos retornos das tools.
8. Typecheck, build e Vitest passam; scan de segurança sem novos achados.
9. Após redeploy, o catálogo do Connector volta a listar exatamente 10 ferramentas com as descrições novas.

Aguardando sua autorização para executar.
