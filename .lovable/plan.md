# Auditoria final do Assistente Maiore — somente inspeção

Nenhum arquivo de código, banco, RLS, MCP, tool, dependência ou deploy foi alterado. Todas as verificações abaixo vieram de leitura de código, consultas read-only ao banco, execução de typecheck/testes e um novo Security Scan.

## 1. Capacidades no chat vs. 10 tools MCP

Todas as 10 capacidades existem na Edge Function (`supabase/functions/assistente-chat/tools.ts`): list_motoristas, get_motorista, list_transportadores, list_contratos, list_seguros, list_certificados_vencendo, analisar_pendencias, analisar_vencimentos, analisar_cruzamentos, resumo_operacional.

- Filtros: preservados (busca, status, situacao_operacional, motorista_id, transportador_id, dias, entidade, limite, offset).
- Paginação: presente em todas as listagens via `paginationMeta` (returned / total_encontrado / limite / offset / truncated / aviso). Exceção: `list_certificados_vencendo` retorna apenas `returned/limite/truncated`, sem `total_encontrado` (mesma limitação já registrada na auditoria MCP).
- PII: CPF e CPF/CNPJ mascarados nas listagens; transportador expõe apenas presença de ANTT/alvará/certificado; análises não retornam documentos.
- Status: OK para 9; ATENÇÃO para `get_motorista` (ver seção PII) e `list_certificados_vencendo` (sem total).

## 2. Duplicação de lógica (débito técnico confirmado)

Cenário **C**: o chat tem uma segunda implementação independente em `supabase/functions/assistente-chat/tools.ts` (648 linhas), que reimplementa `maskDocumento`, `paginationMeta`, `diasEntre` e as regras de aptidão de `src/lib/aptidao.ts`. Os arquivos MCP (`src/lib/mcp/tools/*`) não foram tocados. Risco real de divergência: qualquer mudança futura de regra de aptidão, mascaramento ou paginação precisa ser aplicada em dois lugares. Registrado como débito técnico — sem refactor nesta etapa.

## 3. Autenticação e autorização

- `supabase/config.toml`: `[functions.assistente-chat] verify_jwt = true`.
- A função exige header `Bearer`, valida com `auth.getUser()` e cria o client com `SUPABASE_ANON_KEY` + token do usuário, preservando RLS.
- Nenhum uso de `SUPABASE_SERVICE_ROLE_KEY` na função nem no frontend; nenhum secret no cliente (só `VITE_SUPABASE_URL`/anon key).
- Sem autenticação: retorna 401 (`nao_autenticado`) — comportamento já validado anteriormente e presente no código.

## 4. Lovable AI / Gateway

- Modelo `google/gemini-3.7-flash` via `https://ai.gateway.lovable.dev/v1` com header `Lovable-API-Key` lido de `LOVABLE_API_KEY` (secret já existente).
- Streaming via `toUIMessageStreamResponse` com CORS.
- **Pendência**: não há tratamento explícito de 429 (rate limit) nem 402 (créditos). Tudo cai no `catch` genérico `erro_temporario`, e o usuário vê apenas a mensagem genérica de falha. Sem timeout explícito e sem `onError`/`abort` do streamText.

## 5. Tools do chat — somente leitura

Todas as tools usam apenas `.select()`. Nenhum `insert/update/delete/upsert`, nenhuma chamada a Storage, nenhuma RPC. As únicas escritas do Assistente são em `assistente_conversas`/`assistente_mensagens`, feitas pelo frontend com o usuário autenticado. Schemas de entrada validados por `zod` com min/max em `limite`, `offset`, `dias` e `uuid` em ids; erros de tool retornam `{ erro: true, mensagem }` (mensagem do PostgREST, sem SQL nem stack).

## 6. Prompt injection

O system prompt fixa escopo, somente leitura, privacidade e limites. Proteções estruturais reais: o modelo só enxerga as 10 tools de leitura, não recebe credenciais, e escrita é impossível pela RLS/anon key. **Pendência**: não há instrução explícita para recusar pedidos de revelar o system prompt / listar ferramentas internas, nem defesa declarada contra "ignore as instruções anteriores". Como não há capacidade de escrita nem acesso a secrets, o impacto é baixo (vazamento de instruções, não de dados).

## 7. PII

- Listagens: CPF/CNPJ mascarados (só 4 dígitos). OK.
- `get_motorista`: **permanece pendente** — retorna telefone, cidade/estado e as datas de documentos; o CPF está mascarado nesta versão do chat (diferente do achado MCP anterior). CNH/número de documento não é retornado. Risco baixo-médio, impacto limitado a usuários já autenticados.
- `list_certificados_vencendo`: retorna `empresa`, sem CNPJ. O achado anterior de CNPJ completo **não se reproduz** na implementação do chat.
- Análises (pendências, vencimentos, cruzamentos, resumo): sem documentos, apenas nomes/ids. OK.
- UI: renderiza texto do modelo como markdown; não há filtro adicional de PII no cliente (débito conhecido, dependente do backend).

## 8. Contexto das conversas

Cada thread tem id próprio; `useChat({ id: conversaId })` + `key={threadId}` isolam o estado; mensagens carregadas por `conversa_id` e enviadas ao modelo apenas as da thread atual. Vazamento entre usuários é bloqueado pela RLS (`user_id = auth.uid()`).

## 9. Banco e RLS (verificado em produção)

- `assistente_conversas`: PK, RLS ativa, índice `idx_assistente_conversas_user`, policies SELECT/INSERT/UPDATE/DELETE todas com `user_id = auth.uid()` para `authenticated`.
- `assistente_mensagens`: PK, FK `conversa_id → assistente_conversas(id) ON DELETE CASCADE`, índice por conversa, RLS ativa, policies SELECT/INSERT/DELETE com `user_id = auth.uid()` (sem UPDATE — correto).
- Grants: `authenticated` e `service_role` têm privilégios; `anon` também tem grant de tabela, mas **nenhuma policy para anon**, então o acesso anônimo é efetivamente bloqueado.
- **Débito**: o `WITH CHECK` de `assistente_mensagens` não valida que `conversa_id` pertence ao mesmo usuário. Um usuário poderia inserir uma mensagem apontando para a conversa de outro; ele não conseguiria lê-la (RLS por `user_id`) e o dono também não a veria. Impacto: integridade referencial/lixo, não vazamento.

## 10. Persistência e streaming

Fluxo: criar conversa → salvar mensagem do usuário → stream → `onFinish` salva a resposta. Riscos identificados (não corrigidos):
- Se a geração falhar ou o usuário sair antes do fim, `onFinish` não dispara e a resposta não é persistida: a thread fica com pergunta sem resposta ao recarregar.
- Se `salvar.mutate` falhar (toast de erro), a UI segue com a mensagem em memória → divergência frontend/banco até o reload.
- Não há botão de parar/cancelar a geração; interrupção não corrompe o histórico (nada é gravado parcialmente).
- Título automático é a primeira pergunta; conversa pode ser criada sem nenhuma mensagem (thread vazia listada no painel).

## 11. Paginação e resultados parciais

Metadados corretos são devolvidos ao modelo, e o system prompt obriga usar `total_encontrado` e sinalizar "⚠ Resultado parcial:". Isso é **instrução ao modelo**, não garantia técnica: não existe componente de UI que force o aviso quando `truncated = true` — depende do texto gerado.

## 12. Regras de orquestração

Os limites (5 chamadas, 3 níveis, 10 ids, 4 páginas) existem apenas como texto no system prompt. O único controle técnico real é `stopWhen: stepCountIs(8)`, que é mais permissivo que o limite declarado de 5 chamadas. Classificação: débito técnico, sem risco de escrita.

## 13. Erros

401 tratado; erros de tool encapsulados; catch genérico devolve `erro_temporario`; UI mostra mensagem amigável com "Tentar novamente". Nenhum stack trace, token ou SQL chega ao usuário. Faltam: distinção de 429/402, sessão expirada e timeout.

## 14. CSP

`connect-src 'self' https://*.supabase.co wss://*.supabase.co` cobre a Edge Function (mesmo domínio Supabase). O gateway da Lovable é chamado **server-side**, não pelo browser, então não precisa estar na CSP. Streaming SSE passa pelo `connect-src` já liberado. Sem risco identificado.

## 15. Dependências

`ai@^7.0.90`, `@ai-sdk/react@^4.0.93`, `zod@^3.25.76`, `react-markdown@^10.1.0`. Observações: a Edge Function fixa `npm:ai@7.0.90` e `npm:zod@3.25.76` (bom, evita a regressão de Standard Schema já corrigida). `react-markdown` está instalado mas **não é usado** — a renderização usa `streamdown` via AI Elements: dependência supérflua no bundle. `@ai-sdk/openai-compatible` só existe na Edge Function (não é dep do frontend).

## 16. Testes e regressão

- Typecheck: OK, sem erros.
- Vitest: 20/20 passando (5 arquivos).
- Sidebar/App.tsx receberam apenas a nova entrada e as duas rotas protegidas; MainLayout, AuthContext, React Query, CSP, MCP e as 10 tools MCP permanecem inalterados.

## 17. Novo Security Scan

15 achados no total; os 4 críticos (motoristas, transportadores, contratos, seguros) e os warns operacionais já eram conhecidos e aceitos. **Nenhum achado novo introduzido pelo Assistente**: `assistente_conversas` e `assistente_mensagens` não aparecem no scan, não há novo secret, nem exposição via Edge Function.

## 18. Classificação final

| Área | Status | Gravidade | Evidência | Ação necessária |
|---|---|---|---|---|
| Interface | 🟢 OK | — | Welcome state, 6 cards, painel de threads, tokens do design system | — |
| Rotas | 🟢 OK | — | `/assistente` e `/assistente/:threadId` protegidas | — |
| Histórico | 🟡 Atenção | baixa | Thread pode ficar vazia; resposta não persistida em falha | Persistir resposta parcial / limpar threads vazias |
| RLS | 🟡 Atenção | baixa | `WITH CHECK` de mensagens não valida dono da conversa | Reforçar policy com EXISTS na conversa |
| Autenticação | 🟢 OK | — | verify_jwt, getUser, token propagado, 401 | — |
| Edge Function | 🟢 OK | — | Somente leitura, CORS, catch genérico | — |
| Lovable AI | 🟡 Atenção | média | Sem tratamento de 429/402/timeout | Mapear erros do gateway |
| 10 tools | 🟡 Atenção | média | Lógica duplicada do MCP | Extrair módulo compartilhado |
| PII | 🟡 Atenção | baixa | `get_motorista` retorna telefone/cidade | Reduzir campos ou condicionar |
| Prompt injection | 🟡 Atenção | baixa | Sem regra anti-revelação de prompt | Adicionar cláusula ao system prompt |
| Contexto | 🟢 OK | — | id por thread, RLS por usuário | — |
| Streaming | 🟡 Atenção | baixa | Sem botão de parar; onFinish único ponto de persistência | Adicionar stop + persistência resiliente |
| Paginação | 🟡 Atenção | média | Aviso de parcialidade depende do modelo | Componente de alerta parcial na UI |
| CSP | 🟢 OK | — | connect-src cobre Supabase; gateway é server-side | — |
| Dependências | 🟡 Atenção | baixa | `react-markdown` não utilizado | Remover em limpeza futura |
| Regressão | 🟢 OK | — | typecheck + 20/20 testes; MCP intacto | — |
| Segurança | 🟢 OK | — | Scan sem achados novos do Assistente | — |

## 19. Resultado final

### ✅ O que foi confirmado
- 10 capacidades disponíveis no chat, todas somente leitura.
- JWT obrigatório, RLS preservada, sem service_role e sem secrets no frontend.
- Tabelas do Assistente com RLS por proprietário, FK com cascade, índices e grants corretos.
- Contexto isolado por thread e entre usuários.
- CSP compatível com o streaming; typecheck e 20/20 testes OK; MCP e telas existentes intactos.
- Security Scan sem nenhum achado novo atribuível ao Assistente.

### ⚠️ Pendências encontradas
- Duplicação das regras entre MCP e Edge Function.
- Erros 429/402/timeout do gateway sem tratamento específico.
- Limites de orquestração apenas textuais (`stepCountIs(8)` > 5 chamadas declaradas).
- Resposta não persistida quando a geração falha; sem cancelar geração.
- `WITH CHECK` de mensagens sem verificação do dono da conversa.
- `get_motorista` devolve telefone/cidade; `list_certificados_vencendo` sem `total_encontrado`.
- `react-markdown` instalado sem uso.

### 🔴 Bloqueadores
Nenhum.

### 🟡 Débitos técnicos
Duplicação de lógica, ausência de UI dedicada a resultado parcial, threads vazias, dependência não usada, limites de orquestração não técnicos.

### 📌 Recomendações (por prioridade)
1. **Alto** — Tratar 429/402 e timeout do gateway com mensagens específicas ao usuário.
2. **Alto** — Reforçar o `WITH CHECK` de `assistente_mensagens` com verificação do dono da conversa.
3. **Médio** — Extrair as regras compartilhadas (aptidão, máscara, paginação, datas) para um módulo único usado por MCP e chat.
4. **Médio** — Persistência resiliente da resposta (salvar parcial/erro) e botão de parar geração.
5. **Baixo** — Reduzir campos de `get_motorista`, adicionar `total_encontrado` em certificados, cláusula anti-revelação no prompt e remover `react-markdown`.

### 🏁 Veredito
**B) APROVADO COM PENDÊNCIAS NÃO BLOQUEADORAS** — a arquitetura é segura (autenticada, RLS, somente leitura, sem secrets expostos e sem novos achados de segurança), e as pendências encontradas são de robustez, UX de erro e manutenção, não de exposição de dados ou de integridade operacional.
