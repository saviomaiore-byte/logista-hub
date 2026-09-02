# Assistente Maiore — Documentação técnica

Estado: implementação atual do projeto (setembro/2026).
Escopo: descreve **somente o que existe no código**. Onde algo não existe, está registrado como “Não implementado atualmente.”

Documento complementar: `docs/arquitetura.md` (arquitetura geral do sistema; não cobre o Assistente).

---

## 1. Visão geral

O **Assistente Maiore** é um chat operacional embutido no sistema Pactum Logística. Ele permite que um usuário autenticado faça perguntas em linguagem natural sobre os dados operacionais da empresa e receba respostas geradas por um modelo de IA que consulta o banco através de ferramentas controladas.

**Problema que resolve:** hoje, para saber “quem está inapto”, “o que vence este mês” ou “qual o panorama da operação”, é preciso abrir várias telas e cruzar informações manualmente. O Assistente responde isso em uma pergunta.

**Tipos de pergunta que ele responde (conforme as tools existentes):**
- listagens e contagens de motoristas, transportadores, contratos e seguros;
- detalhe de um motorista específico;
- certificados digitais da empresa vencendo;
- pendências operacionais e motivos de inaptidão;
- documentos vencidos ou a vencer numa janela de dias;
- vínculos entre motoristas, transportadores e contratos;
- panorama consolidado da operação.

**O que ele NÃO faz:**
- não cria, edita, exclui nem envia nada nos dados operacionais;
- não dispara e-mails, relatórios ou notificações;
- não altera status, documentos, contratos ou aptidão;
- não acessa Storage nem arquivos anexados;
- não executa SQL arbitrário.

**Natureza read-only:** todas as ferramentas do Assistente usam apenas `.select()` no Supabase. As únicas escritas de todo o fluxo são as próprias mensagens e conversas do chat, feitas pelo frontend nas tabelas `assistente_conversas` e `assistente_mensagens`.

---

## 2. Arquitetura geral

```text
Usuário (autenticado no app)
  ↓
Interface do Assistente (React — /assistente)
  ↓  fetch com Authorization: Bearer <access_token do usuário>
Edge Function  supabase/functions/assistente-chat  (verify_jwt = true)
  ↓  server-side, com LOVABLE_API_KEY
Lovable AI Gateway  (https://ai.gateway.lovable.dev/v1)
  ↓
Modelo google/gemini-3.7-flash
  ↓  tool calling
Tools do chat (supabase/functions/assistente-chat/tools.ts)
  ↓  cliente Supabase criado com a anon key + token do usuário
Supabase / PostgREST  →  RLS  →  dados operacionais
  ↑
Stream da resposta de volta para a UI
```

Em paralelo, e **sem participação no fluxo acima**:

```text
Agente externo (ex.: Lovable Connectors)
  ↓  OAuth 2.1 / Supabase Auth
Servidor MCP  supabase/functions/mcp  (definido em src/lib/mcp/**)
  ↓
Mesmas 10 capacidades, implementação própria
  ↓
Supabase → RLS → dados operacionais
```

Responsabilidade de cada camada:

| Camada | Responsabilidade |
|---|---|
| Interface | Threads, composição da pergunta, streaming visual, persistência das mensagens, erros amigáveis |
| Edge Function | Autenticar, montar o contexto, chamar o gateway, expor as tools, tratar erros |
| Lovable AI Gateway | Roteamento para o modelo, autenticado por `LOVABLE_API_KEY` (só existe no servidor) |
| Modelo | Decidir quais tools chamar e redigir a resposta |
| Tools do chat | Consultas SQL tipadas, paginação, mascaramento e regras de aptidão |
| Supabase/RLS | Última barreira de autorização — o cliente usado é o do usuário, nunca service role |
| MCP | Canal separado, para agentes externos; **o chat não o consome** |

**Ponto crítico:** o chat **não chama o servidor MCP**. Ele tem tools próprias, definidas dentro da Edge Function. Ver seção 9.

---

## 3. Interface do Assistente

| Arquivo | Responsabilidade | Usado por | Comunicação |
|---|---|---|---|
| `src/pages/Assistente.tsx` | Página: layout, resolução da thread pela URL, criação automática da primeira conversa, diálogo de exclusão | Rotas `/assistente` e `/assistente/:threadId` | Usa os hooks de `useAssistente` e renderiza `ConversasPanel` + `ChatWindow` |
| `src/components/assistente/ChatWindow.tsx` | Janela de chat: `useChat`, envio, streaming, loading, erro com “Tentar novamente”, foco no campo | `Assistente.tsx` | Chama a Edge Function via `DefaultChatTransport`; devolve texto ao pai por `onEnviarUsuario` / `onRespostaFinal` |
| `src/components/assistente/ConversasPanel.tsx` | Lista de conversas, botão “Nova conversa”, seleção e exclusão | `Assistente.tsx` (aside no desktop, `Sheet` no mobile) | Callbacks `onNova`, `onSelecionar`, `onExcluir` |
| `src/components/assistente/WelcomeState.tsx` | Estado inicial com identidade do Assistente e 6 cards de perguntas sugeridas | `ChatWindow.tsx` quando não há mensagens | `onSugestao(texto)` → envia a pergunta |
| `src/components/ai-elements/conversation.tsx` | Área rolável + botão de “ir para o fim” | `ChatWindow` | — |
| `src/components/ai-elements/message.tsx` | Bolha de mensagem e renderização markdown da resposta | `ChatWindow` | — |
| `src/components/ai-elements/prompt-input.tsx` | Composer: textarea, Enter envia, Shift+Enter quebra linha, botão de envio com estado | `ChatWindow` | — |
| `src/components/ai-elements/shimmer.tsx` | Texto animado do estado de carregamento | `ChatWindow` | — |
| `src/hooks/useAssistente.ts` | React Query: listar/criar/renomear/excluir conversas e salvar mensagens | `Assistente.tsx` | Supabase client do frontend |

**Rotas** (`src/App.tsx`): `/assistente` e `/assistente/:threadId`, ambas dentro do wrapper de rota protegida do app (exigem sessão). `/assistente` sem thread redireciona para a conversa mais recente ou cria uma nova.

**Sidebar** (`src/components/layout/Sidebar.tsx`): item “Assistente” com ícone `MessagesSquare` apontando para `/assistente`.

Estados visuais existentes: welcome state, “Analisando os dados...”, “Consultando os dados...” (quando há tool call em andamento), alerta de erro com botão de retry.

**Não implementado atualmente:** componentes dedicados de KPI, tabela, lista ou alerta de resultado parcial. A resposta é renderizada como markdown; tabelas aparecem porque o modelo as escreve em markdown, não porque exista um componente de tabela.

---

## 4. Conversas e histórico

Comportamento atual:
- ao entrar em `/assistente`, abre a conversa mais recente; se não houver nenhuma, cria uma com título “Nova conversa”;
- “Nova conversa” cria um registro e navega para a nova URL;
- o título é substituído pelo texto da primeira pergunta (limitado a 80 caracteres) quando ainda é “Nova conversa”;
- trocar de conversa é navegar para outra URL; `ChatWindow` é remontada por `key={threadId}`;
- excluir pede confirmação e, se for a conversa aberta, volta para `/assistente`;
- a listagem é ordenada por `updated_at` decrescente, atualizado a cada mensagem salva.

### Tabelas

**`public.assistente_conversas`** — uma linha por conversa.

| Coluna | Observação |
|---|---|
| `id` uuid | PK |
| `user_id` uuid | Dono da conversa (sem FK para `auth.users`, por padrão do projeto) |
| `titulo` text | “Nova conversa” até a primeira pergunta |
| `created_at`, `updated_at` timestamptz | `updated_at` mantido por trigger `update_updated_at_column` |

Índice: `idx_assistente_conversas_user` (por usuário).

**`public.assistente_mensagens`** — uma linha por mensagem.

| Coluna | Observação |
|---|---|
| `id` uuid | PK |
| `conversa_id` uuid | FK → `assistente_conversas(id)` **ON DELETE CASCADE** |
| `user_id` uuid | Dono da mensagem |
| `role` text | `user` ou `assistant` |
| `content` text | Texto puro |
| `created_at` timestamptz | Ordenação cronológica |

Índice: `idx_assistente_mensagens_conversa`.

**Cascade:** excluir a conversa apaga automaticamente suas mensagens.
**Isolamento:** garantido pela RLS (seção 5) — cada usuário só enxerga as próprias conversas e mensagens.

---

## 5. RLS e segurança das conversas

RLS **habilitada** nas duas tabelas. Grants: `authenticated` e `service_role` com privilégios; `anon` possui grant de tabela mas **nenhuma policy**, portanto não acessa nada.

### `assistente_conversas` (4 policies, role `authenticated`)

| Operação | Regra |
|---|---|
| SELECT | `user_id = auth.uid()` |
| INSERT | `WITH CHECK user_id = auth.uid()` |
| UPDATE | `user_id = auth.uid()` (USING e WITH CHECK) |
| DELETE | `user_id = auth.uid()` |

### `assistente_mensagens` (3 policies, role `authenticated`)

| Operação | Regra |
|---|---|
| SELECT | `user_id = auth.uid()` |
| INSERT | `user_id = auth.uid()` **E** existe linha em `assistente_conversas` com `id = conversa_id` e `user_id = auth.uid()` |
| UPDATE | Nenhuma policy — mensagens são imutáveis |
| DELETE | `user_id = auth.uid()` |

Consequências verificadas em teste real (transação revertida):
- inserir mensagem na própria conversa → **permitido**;
- inserir mensagem apontando para a conversa de outro usuário → **bloqueado**;
- inserir sem autenticação (role `anon`) → **bloqueado**.

Nenhuma função `SECURITY DEFINER` foi criada para o Assistente.

---

## 6. Edge Function `assistente-chat`

Diretório: `supabase/functions/assistente-chat/` — contém exatamente dois arquivos: `index.ts` (164 linhas) e `tools.ts` (648 linhas).

### `index.ts`

Responsabilidades, na ordem em que acontecem:
1. Responde `OPTIONS` com os headers de CORS.
2. Verifica a existência de `LOVABLE_API_KEY`; sem ela, retorna 500 `assistente_indisponivel`.
3. Exige header `Authorization: Bearer ...`; sem ele, 401 `nao_autenticado`.
4. Cria o client Supabase com `SUPABASE_URL` + `SUPABASE_ANON_KEY` e repassa o header do usuário — sem sessão persistida e sem refresh. **Toda consulta roda sob a RLS do usuário.**
5. Valida o usuário com `auth.getUser()`; falha → 401.
6. Lê `messages` do corpo (histórico da thread enviado pelo frontend).
7. Cria o provider `createOpenAICompatible` apontando para o Lovable AI Gateway.
8. Chama `streamText` com o system prompt, as mensagens convertidas, as tools de `buildTools(supabase)` e `stopWhen: stepCountIs(8)`.
9. Devolve `toUIMessageStreamResponse` com CORS e um `onError` que converte o erro em mensagem amigável dentro do próprio stream.
10. Erros fora do stream caem no `catch`, que responde com status e código controlados.

Configuração: `supabase/config.toml` → `[functions.assistente-chat] verify_jwt = true`.

**Persistência:** a Edge Function **não grava nada**. Quem persiste é o frontend (seção 14).

### `tools.ts`

Exporta `buildTools(supabase)`, que devolve as 10 tools do chat, além dos helpers internos: `maskDocumento`, `temDocumento`, `likeTerm`/`quoteFilterValue` (escapes de `ILIKE`), `paginationMeta`, `ISO_DATE`/`diasEntre`/`vencida` (datas) e `checkMotoristaAptidao` (regras de aptidão). Erros de consulta retornam `{ erro: true, mensagem }`.

**Limites existentes:** `stepCountIs(8)` no servidor; `limite`/`offset` validados por Zod em cada tool; demais limites de orquestração são apenas textuais no prompt (seção 15).

---

## 7. Modelo de IA e Lovable AI Gateway

- **Provedor:** Lovable AI Gateway, `https://ai.gateway.lovable.dev/v1`, via `createOpenAICompatible` (`npm:@ai-sdk/openai-compatible@2.0.0`).
- **Modelo:** `google/gemini-3.7-flash`.
- **Autenticação:** header `Lovable-API-Key` com o secret `LOVABLE_API_KEY`, lido por `Deno.env.get` dentro da Edge Function.
- **Streaming:** `streamText` + `toUIMessageStreamResponse`; o frontend consome com `useChat`.
- **Chave no frontend:** **não existe**. O browser só conhece a URL do projeto e a publishable key do Supabase; a chamada ao gateway é 100% server-side.
- **Não implementado atualmente:** escolha de modelo pelo usuário, ajuste de temperatura, `service_tier`, limite de tokens de saída e propagação de run-id do gateway.

---

## 8. Tools do Assistente (as 10 do chat)

Todas somente leitura, todas sob a RLS do usuário. Padrão de paginação: `limite` (Zod, com default) e `offset`, retornando `returned`, `total_encontrado`, `limite`, `offset`, `truncated`, `aviso` e `filtros_aplicados`.

### 8.1 Tools de CONSULTA

| Tool | Finalidade | Parâmetros | Tabelas | Retorno / PII |
|---|---|---|---|---|
| `list_motoristas` | Listar motoristas | `busca`, `situacao_operacional`, `limite` 1–100 (25), `offset` ≥0 (0) | `motoristas` | id, nome, **CPF mascarado**, telefone, cidade/UF, status, situação e vencimentos de CNH/MOPP. Busca por `ILIKE` em nome e CPF |
| `get_motorista` | Detalhe individual | `id` (uuid) | `motoristas`, `transportador_motoristas`, `transportadores` | Dados do motorista com **CPF mascarado**, vencimentos de CNH/MOPP/ANTT/alvará/certificado e transportadoras vinculadas. Retorna telefone e cidade/UF. Quando não existe: `{ encontrado: false }` |
| `list_transportadores` | Listar transportadores | `busca`, `limite` 1–100 (25), `offset` (0) | `transportadores` | Razão social, **CPF/CNPJ mascarado**, contato, status, situação operacional e **apenas presença** de documentos (`tem_antt`, `tem_alvara`, `tem_certificado`) — os números nunca saem |
| `list_contratos` | Listar contratos | `status` (`pendente`/`enviado`/`assinado`/`recusado`), `motorista_id`, `transportador_id`, `limite` 1–100 (25), `offset` (0) | `contratos` | Empresa, tipo, modelo, status, datas e ids relacionados. Não retorna CNPJ |
| `list_seguros` | Listar apólices | `status`, `seguradora` (parcial), `limite` 1–100 (25), `offset` (0) | `seguros` | Seguradora, tipo, status, vigências, prêmio e `motorista_id`. Regra documentada: `ativo` com `vigencia_fim` no passado é vencido |
| `list_certificados_vencendo` | Certificados digitais **da empresa** vencendo em N dias (inclui vencidos) | `dias` 0–365 (30), `limite` 1–100 (50) | `certificados` | Empresa, tipo, status, vencimento e renovação agendada. **Sem `offset` e sem `total_encontrado`** — só `returned`, `limite`, `truncated` e `ate` |

### 8.2 Tools de ANÁLISE

| Tool | Finalidade | Parâmetros | Tabelas | Regras / PII |
|---|---|---|---|---|
| `analisar_pendencias` | Pendências e inaptidão | `entidade` (`ambos`/`motorista`/`transportador`, default `ambos`), `limite` 1–200 (100) | `transportadores` (só `ativo`), `transportador_motoristas`, `motoristas`, `contratos` (`assinado`) | Aplica `checkMotoristaAptidao`: sem contrato assinado, transportadora sem ANTT/alvará/certificado, CNH vencida, MOPP vencido (ignorado se vitalício), motorista inativo. **Sem PII de documento** |
| `analisar_vencimentos` | Documentos vencidos/a vencer | `dias` 0–365 (30), `entidade` (default `ambos`), `limite` 1–200 (100) | `motoristas` | Campos CNH, MOPP, ANTT, alvará e certificado. Datas não interpretáveis são excluídas do cálculo e contabilizadas em aviso — nunca viram `NaN` nem zero. Transportador não tem data de vencimento cadastrada. **Sem números de documento** |
| `analisar_cruzamentos` | Vínculos comprovados | `motorista_id`, `transportador_id`, `limite` 1–200 (100) | `transportador_motoristas`, `contratos`, `motoristas`, `transportadores` | Nada é inferido: ausência na lista = ausência de registro. Retorna apenas nomes e ids |
| `resumo_operacional` | Panorama consolidado | `dias` 0–365 (30), `top_pendencias` 1–20 (5) | Contagens em `motoristas`, `transportadores`, `contratos` + as mesmas leituras de pendências e vencimentos | Agrega totais, principais motivos de pendência e vencimentos; sinaliza incompletude em `incompleto`/`avisos`. **Sem PII** |

**Tratamento de dados sensíveis, resumido:** CPF e CPF/CNPJ passam por `maskDocumento` (só os 4 últimos dígitos visíveis); números de ANTT/alvará/certificado do transportador viram booleanos; as 4 tools de análise não retornam documento algum; RG, endereço e e-mail não são selecionados em nenhuma tool.

---

## 9. MCP

- **Localização:** definição em `src/lib/mcp/index.ts`, tools em `src/lib/mcp/tools/*.ts`, schemas compartilhados em `src/lib/mcp/schemas.ts`, acesso ao banco em `src/lib/mcp/supabase.ts`. Publicado pela Edge Function `supabase/functions/mcp` (`verify_jwt = false`, autenticação feita pelo próprio protocolo), com o plugin `mcpPlugin()` no `vite.config.ts` e manifesto em `.lovable/mcp/manifest.json`.
- **Quantidade:** 10 tools, os mesmos nomes das do chat: `list_motoristas`, `get_motorista`, `list_transportadores`, `list_contratos`, `list_seguros`, `list_certificados_vencendo`, `analisar_pendencias`, `analisar_vencimentos`, `analisar_cruzamentos`, `resumo_operacional`.
- **Autenticação:** OAuth 2.1 com o issuer do Supabase Auth (`auth.oauth.issuer`), audiência `authenticated`; a tela de consentimento é `src/pages/OAuthConsent.tsx`.
- **RLS:** as consultas usam o client do usuário autenticado (`supabaseForUser`), portanto a RLS vale igualmente.
- **Paginação e schemas:** mesmo contrato (`returned`, `total_encontrado`, `limite`, `offset`, `truncated`, `aviso`), com blocos de schema de saída reutilizáveis em `src/lib/mcp/schemas.ts`.
- **PII:** mesmas regras de mascaramento.
- **Instruções do servidor:** o `instructions` do `defineMcp` orienta o agente externo sobre paginação, truncamento e escolha de tool.

**Relação com o Assistente — importante:** as tools do chat **não importam nem chamam** as funções MCP. `supabase/functions/assistente-chat/tools.ts` **reimplementa** a mesma lógica (mascaramento, paginação, datas e regras de aptidão) porque a Edge Function Deno não consegue importar código de `src/`. As duas implementações são independentes e precisam ser mantidas em sincronia manualmente. O chat também **não fala o protocolo MCP** em momento algum.

---

## 10. Segurança e privacidade

### Implementado
- Rotas do Assistente protegidas por sessão; sem sessão não há acesso à página.
- `verify_jwt = true` na Edge Function, mais validação explícita do header `Bearer` e `auth.getUser()` no código.
- Consultas feitas com a **anon key + token do usuário** → RLS sempre ativa.
- **Nenhum uso de service role** em todo o fluxo do Assistente (frontend, Edge Function e tools).
- `LOVABLE_API_KEY` existe apenas como secret do servidor; o browser nunca a vê.
- Todas as 10 tools são somente leitura; não há insert/update/delete/upsert, RPC nem acesso a Storage.
- CPF e CPF/CNPJ mascarados; números de ANTT/alvará/certificado do transportador reduzidos a booleanos; RG, endereço e e-mail nunca selecionados.
- Conversas e mensagens isoladas por usuário via RLS, incluindo validação de dono da conversa no INSERT de mensagens.
- Erros nunca expõem stack trace, token, chave, SQL ou prompt interno.
- CSP do app libera apenas `'self'` e os domínios Supabase; o gateway é chamado server-side.

### Limitações / pontos de atenção atuais
- `get_motorista` devolve telefone e cidade/UF — dados pessoais, ainda que sem documento.
- A instrução de não exibir documentos é do prompt; não há filtro de PII no texto final gerado.
- O prompt não contém cláusula explícita contra tentativas de revelar as próprias instruções.
- Os limites de orquestração (5 chamadas, 3 níveis, 10 ids, 4 páginas) são textuais; o único limite técnico é `stepCountIs(8)`.
- `list_certificados_vencendo` não informa total nem aceita `offset`.

---

## 11. Prompt / instruções do Assistente

O system prompt vive em `supabase/functions/assistente-chat/index.ts`. Resumo técnico do que ele estabelece:

- **Identidade e idioma:** Assistente Maiore, do sistema Pactum Logística, respondendo em português do Brasil, objetivo e profissional.
- **Escopo:** motoristas, transportadores, contratos, seguros, certificados digitais, pendências, vencimentos e vínculos.
- **Somente leitura:** declara explicitamente que não existe ação de criar, editar, excluir ou enviar.
- **Fluxo de decisão:** panorama → apenas `resumo_operacional`; listagem simples → uma tool de listagem; pergunta analítica → `analisar_pendencias`/`analisar_vencimentos`; relacionamento → `analisar_cruzamentos`; detalhe de pessoa → `list_motoristas` e só então `get_motorista`; pergunta composta → análise primeiro, depois os ids. Parar assim que houver informação suficiente e nunca reconferir número já obtido.
- **Limites declarados:** no máximo 5 chamadas por pergunta, 3 níveis de encadeamento, 10 ids propagados, 4 páginas da mesma listagem, sem repetir chamada idêntica.
- **Paginação:** `truncated: true` nunca significa lista completa; usar `total_encontrado`/`total_analisado`/`total_com_pendencias` como total e nunca `returned`; não concluir ausência a partir de resultado truncado.
- **Privacidade:** nunca exibir CPF, CNPJ, RG ou número de documento, mesmo que apareçam; identificar por nome; não repetir telefone/e-mail/endereço sem pedido.
- **Confiabilidade:** não inventar; ao falhar uma consulta, dizer qual falhou e responder com o que obteve; “nenhum registro encontrado” só quando o resultado não estiver truncado; divergências entre fontes devem ser mostradas com a origem.
- **Formato:** frase de resumo com o total, tabelas markdown para vários registros e, quando parcial, uma linha final começando por “⚠ Resultado parcial:”.

---

## 12. Paginação e dados parciais

Campos devolvidos por `paginationMeta` nas listagens:

| Campo | Significado |
|---|---|
| `limite` | Tamanho da página aplicado |
| `offset` | Deslocamento aplicado |
| `returned` | Quantidade **desta página** — nunca é o total |
| `total_encontrado` | Total que atende aos filtros (`count: "exact"`), ou `null` |
| `truncated` | `true` quando `offset + returned < total_encontrado` (ou, sem total, quando `returned >= limite`) |
| `aviso` | Frase pronta descrevendo se o resultado é parcial ou final |

- **Com total:** `list_motoristas`, `list_transportadores`, `list_contratos`, `list_seguros`.
- **Sem `offset` e sem total:** `list_certificados_vencendo` (`returned`, `limite`, `truncated`, `ate`).
- **Análises:** usam `limite` próprio (até 200) e expõem totais próprios (`total_analisado`, `total_com_pendencias`) e avisos de truncamento; `resumo_operacional` sinaliza incompletude em `incompleto`/`avisos`.

Interpretação esperada: o modelo deve reportar “mostrando N de M”, tratar `truncated` como “há mais registros” e jamais afirmar ausência a partir de página truncada. Isso é garantido por instrução, não por componente de UI.

---

## 13. Tratamento de erros

| Situação | Comportamento atual |
|---|---|
| Sem header `Authorization` | 401 pela plataforma (`UNAUTHORIZED_NO_AUTH_HEADER`) ou 401 `nao_autenticado` pelo código |
| Token inválido/expirado | 401 `nao_autenticado` |
| `LOVABLE_API_KEY` ausente | 500 `assistente_indisponivel` |
| Erro de tool / erro do Supabase (RLS, filtro inválido) | A tool devolve `{ erro: true, mensagem }` ao modelo, que informa qual consulta falhou e responde com o que obteve; a requisição não quebra |
| Gateway 429 | 429 `limite_temporario` — “O Assistente atingiu o limite de uso no momento…” |
| Gateway 402 | 402 `servico_indisponivel` — “O serviço de IA está temporariamente indisponível…” |
| Timeout / abort da geração | 504 `tempo_excedido` — “A geração demorou mais que o esperado…” |
| Qualquer outro erro | 500 `erro_temporario` com mensagem genérica |
| Erro durante o stream | Convertido pela mesma função `classificar` e entregue como mensagem dentro do stream |
| Falha ao persistir mensagem | Toast de erro no frontend (`dbErrorMessage`); a UI continua com a mensagem em memória |

Nenhuma resposta expõe stack trace, chave, token, prompt ou detalhe interno do gateway.

---

## 14. Persistência das mensagens

```text
usuário digita e envia
  → onEnviarUsuario: INSERT da pergunta em assistente_mensagens
     (+ renomeia a conversa se o título ainda for "Nova conversa")
  → useChat.sendMessage → POST na Edge Function com todo o histórico da thread
  → Edge Function autentica, chama o gateway e o modelo decide as tools
  → resposta chega em stream e é renderizada progressivamente
  → onFinish: INSERT da resposta final em assistente_mensagens
  → updated_at da conversa é atualizado e a lista é invalidada (React Query)
```

Comportamento em situações de exceção, como está hoje:
- **Geração falha:** `onFinish` não dispara; a resposta não é gravada. Ao recarregar, a thread mostra a pergunta sem resposta.
- **Usuário interrompe / sai da página:** idem — nada parcial é gravado, o histórico não fica corrompido. Não há botão de parar geração.
- **Persistência falha:** aparece um toast de erro; a mensagem continua visível em memória até o reload, quando desaparece.
- **Conversa recarregada:** as mensagens vêm do banco ordenadas por `created_at` e substituem o estado do `useChat`.

---

## 15. Limites conhecidos e technical debt

Registro apenas — nada aqui foi corrigido neste documento.

### Alta

| Item | Local | Impacto / risco |
|---|---|---|
| Duplicação de regras entre MCP e chat | `supabase/functions/assistente-chat/tools.ts` × `src/lib/mcp/tools/*` e `src/lib/aptidao.ts` | Uma mudança de regra de aptidão, máscara ou paginação aplicada em um lado e esquecida no outro faz o chat e o MCP responderem diferente sobre o mesmo dado. Direção evidente: módulo compartilhado sob `supabase/functions/_shared/` |
| Resposta não persistida em falha ou interrupção | `ChatWindow.tsx` (`onFinish`) | Histórico incompleto após recarregar; usuário não sabe que a resposta se perdeu |

### Média

| Item | Local | Impacto / risco |
|---|---|---|
| Limites de orquestração apenas textuais | System prompt × `stopWhen: stepCountIs(8)` | O modelo pode usar mais chamadas do que as 5 declaradas; custo e latência maiores que o previsto |
| Aviso de resultado parcial depende do texto do modelo | `ChatWindow.tsx` | Se o modelo omitir o aviso, o usuário pode tomar uma página truncada como total |
| `list_certificados_vencendo` sem `total_encontrado` e sem `offset` | `tools.ts` | Não é possível afirmar o total nem paginar certificados |

### Baixa

| Item | Local | Impacto / risco |
|---|---|---|
| `get_motorista` retorna telefone e cidade/UF | `tools.ts` | Exposição de dado pessoal além do necessário, restrita a usuários já autenticados |
| Prompt sem cláusula anti-revelação de instruções | `index.ts` | Vazamento das instruções internas (não de dados) |
| Conversa pode ficar sem nenhuma mensagem | `Assistente.tsx` | Threads vazias poluindo o painel |
| `react-markdown` instalado sem uso | `package.json` | Peso desnecessário; a renderização usa `streamdown` |
| Sem botão de parar geração | `ChatWindow.tsx` | Usuário não consegue cancelar uma resposta longa |

---

## 16. Fluxo completo de uma pergunta

Exemplo real: **“Faça um resumo da operação.”**

1. Usuário clica no card “📊 Resumo operacional” ou digita a frase e pressiona Enter.
2. `Assistente.tsx` já resolveu a thread ativa a partir da URL (`/assistente/:threadId`).
3. `onEnviarUsuario` grava a pergunta em `assistente_mensagens` e, se o título ainda for “Nova conversa”, renomeia a conversa para o texto da pergunta.
4. `useChat` envia `POST` para `.../functions/v1/assistente-chat` com todas as mensagens da thread e o header `Authorization: Bearer <token>`.
5. A Edge Function confirma a chave do gateway, valida o header, cria o client Supabase com o token do usuário e valida a sessão com `auth.getUser()`.
6. O modelo recebe o system prompt (escopo, fluxo de decisão, limites, paginação, PII, formato) e o histórico da conversa.
7. Conforme o fluxo de decisão, para uma pergunta de panorama o modelo chama **apenas** `resumo_operacional`.
8. A tool executa em paralelo as contagens de motoristas, transportadores e contratos e as leituras necessárias para pendências e vencimentos — tudo sob a RLS do usuário.
9. Retorna totais, principais motivos de pendência, vencimentos na janela padrão de 30 dias e eventuais avisos de incompletude.
10. O modelo redige a resposta: frase de resumo com o total, tabela markdown quando cabe e, se algo veio truncado, a linha “⚠ Resultado parcial:”.
11. O texto é transmitido em stream; a UI mostra “Analisando os dados...” / “Consultando os dados...” enquanto isso.
12. Ao terminar, `onFinish` grava a resposta em `assistente_mensagens` e atualiza `updated_at` da conversa.
13. A resposta fica renderizada como markdown e a conversa sobe para o topo do painel.

---

## 17. Estrutura de arquivos

```text
src/
├── pages/
│   ├── Assistente.tsx
│   └── OAuthConsent.tsx              (consentimento OAuth do MCP)
├── components/
│   ├── assistente/
│   │   ├── ChatWindow.tsx
│   │   ├── ConversasPanel.tsx
│   │   └── WelcomeState.tsx
│   └── ai-elements/
│       ├── conversation.tsx
│       ├── message.tsx
│       ├── prompt-input.tsx
│       └── shimmer.tsx
├── hooks/
│   └── useAssistente.ts
├── assets/
│   └── assistente-maiore.png
├── lib/
│   ├── aptidao.ts                    (regras oficiais de aptidão — usadas pelo app e pelo MCP)
│   └── mcp/
│       ├── index.ts
│       ├── schemas.ts
│       ├── supabase.ts
│       └── tools/                    (10 tools MCP)
│
supabase/
├── config.toml                       (verify_jwt das funções)
└── functions/
    ├── assistente-chat/
    │   ├── index.ts
    │   └── tools.ts
    └── mcp/
        └── index.ts
```

Tabelas relacionadas: `public.assistente_conversas`, `public.assistente_mensagens`.

---

## 18. Dependências utilizadas

| Dependência | Finalidade | Onde |
|---|---|---|
| `ai` (7.0.90) | `streamText`, `tool`, conversão de mensagens, stream de UI | Edge Function (`npm:ai@7.0.90`) e tipos no frontend |
| `@ai-sdk/react` (4.0.93) | Hook `useChat` e transporte HTTP do chat | `ChatWindow.tsx` |
| `@ai-sdk/openai-compatible` (2.0.0) | Provider do Lovable AI Gateway | Edge Function |
| `zod` (3.25.76) | `inputSchema` das tools do chat e schemas MCP | `tools.ts`, `src/lib/mcp/**` |
| `@supabase/supabase-js` (2.58.0) | Cliente de banco autenticado | Edge Function e frontend |
| `@lovable.dev/mcp-js` | `defineMcp`, `auth.oauth.issuer` e plugin Vite | `src/lib/mcp/index.ts`, `vite.config.ts` |
| `streamdown` (+ `@streamdown/*`) | Renderização markdown da resposta em streaming | `src/components/ai-elements/message.tsx` |
| `@tanstack/react-query` | Cache e invalidação de conversas/mensagens | `useAssistente.ts` |
| `date-fns` | Formatação de datas no painel de conversas | `ConversasPanel.tsx` |
| `sonner` | Toasts de erro de persistência | `useAssistente.ts` |
| `lucide-react` | Ícones do Assistente e da Sidebar | Componentes |
| `react-markdown` (10.1.0) | **Instalado, mas sem uso no Assistente** | — |

---

## 19. Testes e validação

### Testado e funcionando
- `tsgo --noEmit` (typecheck) sem erros.
- Build de produção concluído.
- Vitest: 5 arquivos, **20/20 testes** verdes (incluindo `aptidao.test.ts`, que cobre as regras de aptidão do app/MCP).
- Endpoint `assistente-chat` sem token → **401**.
- RLS de `assistente_mensagens` validada com transação revertida: própria conversa permitida, conversa alheia bloqueada, anônimo bloqueado.
- MCP em produção: auditoria funcional de 48 cenários (48 executados, 43 OK, 5 divergências registradas, 0 falhas), cobrindo smoke, filtros, paginação, casos vazios, parâmetros inválidos, PII, consistência, segurança e regressão.
- Chat autenticado: fluxo end-to-end exercitado pela interface após a correção do provider de schema.

### Não testado / pendente
- Não há testes automatizados específicos do Assistente (nem da UI, nem das tools do chat, nem da Edge Function).
- Cenários 429 e 402 do gateway não foram reproduzidos em produção — o mapeamento foi validado pelo contrato do SDK, não por chamada real.
- Timeout/abort real da geração não foi provocado.
- Streaming não é coberto por teste automatizado.

---

## 20. Guia rápido para novo desenvolvedor

Ordem de leitura sugerida e o que procurar em cada etapa:

1. **`src/pages/Assistente.tsx`** — como a thread é resolvida pela URL, quando uma conversa é criada e como o layout se divide entre painel e chat.
2. **`src/components/assistente/*`** — `ChatWindow` (envio, streaming, erro), `ConversasPanel` (histórico) e `WelcomeState` (6 cards). Os blocos visuais reutilizados estão em `src/components/ai-elements/`.
3. **`src/hooks/useAssistente.ts`** — todas as queries e mutations de conversa/mensagem, e onde a invalidação do React Query acontece.
4. **`supabase/functions/assistente-chat/index.ts`** — autenticação, system prompt, chamada ao gateway, `stopWhen` e a função `classificar` de erros. É o coração do Assistente.
5. **`supabase/functions/assistente-chat/tools.ts`** — as 10 tools do chat e os helpers de máscara, paginação, datas e aptidão. Atenção: é código **duplicado** do MCP.
6. **Tabelas `assistente_conversas` / `assistente_mensagens`** — colunas, FK com cascade e índices (seção 4).
7. **RLS** — as policies das duas tabelas (seção 5), especialmente a regra de INSERT que valida o dono da conversa.
8. **`src/lib/mcp/**`** — o canal MCP para agentes externos, com as mesmas 10 capacidades e autenticação OAuth. Comparar com `tools.ts` para entender o débito de duplicação.
9. **Supabase** — lembrar que toda consulta do Assistente roda com o token do usuário; se algo “não aparece”, verificar RLS antes de suspeitar do código.
10. **Lovable AI** — o modelo e a chave ficam apenas no servidor; qualquer mudança de modelo ou de limites é feita na Edge Function.

Regra de ouro para manutenção: **mudou uma regra de negócio? verifique se ela existe em dois lugares** (`src/lib/aptidao.ts` / `src/lib/mcp/tools/*` e `supabase/functions/assistente-chat/tools.ts`).
