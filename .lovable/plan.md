# Interface do Assistente Maiore — plano de UX/UI

Somente planejamento. Nenhuma alteração de código, banco, RLS, Storage, MCP, ferramentas ou deploy.

Decisões já confirmadas: **conversas múltiplas (threads)**, **persistência no banco (Lovable Cloud)** e **motor de IA da Lovable chamando as consultas como tools**.

## A. Diagnóstico da UI atual

Verificado no código:

- `src/components/layout/MainLayout.tsx`: sidebar fixa + `<main>` com `pl-64` no desktop e `pt-14` no mobile; conteúdo com `p-6 lg:p-8`. Não existe header global — cada página traz seu próprio cabeçalho (`MotoristasHeader`, `TransportadoresHeader`, `RelatoriosHeader`), com título, contador dinâmico e ações à direita.
- `src/components/layout/Sidebar.tsx`: navy (`--sidebar-background: 222 47% 11%`), colapsável (64 → 20), ícones Lucide, item ativo via classe `nav-item active`, rodapé com avatar/inicial do usuário e "Sair". No mobile vira `Sheet` lateral com top bar de 14. Nav base: Dashboard, Motoristas, Transportadores, Seguros, Contratos, Conferência Docs, Certificados Digitais, Relatórios (+ Usuários/Segurança para admin).
- `src/index.css`: tokens HSL semânticos (`--primary 222 47% 20%`, `--success`, `--warning`, `--destructive`, `--radius: 0.75rem`), gradientes e sombras de card, tema dark definido. Fonte **Inter** via Google Fonts.
- Componentes: shadcn/Radix completo (`card`, `table`, `dialog`, `sheet`, `badge`, `tabs`, `accordion`, `skeleton`, `tooltip`), `sonner` + `use-toast` para notificações, tabelas que viram cards no mobile, React Query em hooks centralizados (`useMotoristas`, `useContratos`, …), `usePermissoes`/`useAdmin` para gates de UI.
- Rotas em `src/App.tsx` protegidas por `AuthContext`; padrão de página = `MainLayout` + header + cards de resumo + lista/tabela + dialogs.

Implicação: o Assistente deve reusar sidebar, tokens, Inter, Card/Badge/Table e o padrão de header de página. Nada de paleta nova nem de layout "produto separado".

## B. Recomendação de localização

| Opção | Usabilidade | Espaço | Impacto nas telas | Esforço | Responsivo | Escala |
|---|---|---|---|---|---|---|
| A. Página própria | Alta para análise longa | Total | Nenhum | Baixo | Boa | Boa |
| B. Chat lateral global | Boa para consulta rápida | Estreito demais para tabelas | Precisa mexer no MainLayout | Médio | Ruim no mobile | Limitada |
| C. **Página própria + acesso rápido** | Alta nos dois modos | Total na página | Mínimo (1 botão flutuante/atalho) | Médio-baixo | Boa | Boa |
| D. Só dentro do Dashboard | Baixa | Pequeno | Alto | Baixo | Média | Ruim |

**Recomendada: C**, alinhada à sua preferência. Página `/assistente` (thread própria em `/assistente/:threadId`) como casa do Assistente + item na sidebar + botão de acesso rápido flutuante que **navega** para a página já com a pergunta pré-preenchida (não um segundo chat paralelo — evita duplicar estado e RLS). O botão respeita o mesmo gate de auth das demais rotas.

## C. Wireframe textual

```text
Desktop (>= 1024px)
┌──────────┬───────────────────────────────┬──────────────────┐
│ Sidebar  │ AssistenteHeader              │ Painel de        │
│ (navy)   │  [logo] Assistente Maiore     │ conversas        │
│          │  "Seu assistente operacional" │  + Nova conversa │
│ ...      │  [Nova conversa]              │  • Pendências... │
│ Assistente│──────────────────────────────│  • Vencimentos.. │
│ (ativo)  │                               │  • Contratos ... │
│          │  [Conversa / WelcomeState]    │  (renomear/excl.)│
│          │                               │                  │
│          │  ┌ Assistente ──────────────┐ │                  │
│          │  │ Resumo + KPIs + tabela   │ │                  │
│          │  │ ⚠ Resultado parcial      │ │                  │
│          │  └──────────────────────────┘ │                  │
│          │              ┌ Você ────────┐ │                  │
│          │              │ pergunta...  │ │                  │
│          │──────────────────────────────│                  │
│          │ [textarea ............] [→]  │                  │
└──────────┴───────────────────────────────┴──────────────────┘

Tablet: painel de conversas vira Sheet acionado por botão no header.
Mobile: sidebar já é Sheet; chat ocupa 100%; input fixo no rodapé (safe-area);
        sugestões viram chips com scroll horizontal; tabelas viram cards.
```

## D. Fluxo de interação

1. Usuário abre `/assistente` → se não há thread, cria uma e navega para `/assistente/:id`.
2. WelcomeState com saudação + 5 sugestões clicáveis.
3. Envio: mensagem do usuário aparece na hora (otimista) + indicador "Pensando…".
4. Streaming: passos de execução aparecem em linha ("Consultando motoristas…", "Analisando pendências…"), colapsados por padrão.
5. Resposta renderizada em markdown + blocos estruturados (KPI/tabela/lista/alerta).
6. Follow-up: a thread inteira é reenviada ao modelo, então "e quais deles têm contrato pendente?" mantém contexto.
7. Ações por mensagem: copiar, tentar novamente (em erro).
8. Nova conversa / renomear / excluir pelo painel de conversas.

## E. Componentes necessários

```text
src/pages/Assistente.tsx                (rota /assistente e /assistente/:threadId)
src/components/assistente/
├── AssistenteHeader.tsx        título, subtítulo, nova conversa, botão de threads (mobile)
├── ConversasSidebar.tsx        lista de threads, renomear, excluir, busca simples
├── ChatContainer.tsx           Conversation + scroll-to-bottom
├── WelcomeState.tsx            saudação + capacidades + sugestões
├── SuggestedQuestions.tsx      chips de perguntas
├── UserMessage.tsx             bolha primary/primary-foreground
├── AssistantMessage.tsx        markdown sem bolha, sobre o fundo
├── ToolExecutionState.tsx      passos amigáveis, accordion fechado
├── ResultTable.tsx             tabela → cards no mobile
├── ResultKpi.tsx               indicador numérico (reusa padrão do StatCard)
├── PartialResultAlert.tsx      "⚠ Mostrando parte dos resultados (N de M)"
├── ErrorMessage.tsx            erro amigável + botão Tentar novamente
└── ChatInput.tsx               textarea, Enter envia, Shift+Enter quebra linha
```

Base: AI Elements (`conversation`, `message`, `prompt-input`, `shimmer`, `tool`) instalados via registry, customizados com os tokens do Pactum. Identidade visual própria (marca gerada), **sem** ícone `Sparkles` genérico.

## F. Estados da interface

| Estado | Apresentação |
|---|---|
| Vazio (primeira vez) | WelcomeState + sugestões |
| Enviando | Mensagem do usuário + shimmer "Pensando…" |
| Executando consultas | Lista de passos em linguagem de negócio, sem nomes técnicos de tool |
| Streaming | Texto aparecendo progressivamente; input desabilitado, botão vira "parar" |
| Resposta completa | Markdown + blocos estruturados + ações (copiar) |
| Resposta parcial | `PartialResultAlert` acima da lista/tabela |
| Sem resultado | "Nenhum registro encontrado para esse filtro" (nunca inventar) |
| Erro | Mensagem curta + "Tentar novamente"; sem stack trace |
| Offline / sessão expirada | Aviso e chamada para reautenticar |

Mensagens de erro por caso: temporário ("Instabilidade momentânea, tente de novo"), autenticação ("Sua sessão expirou — entre novamente"), ferramenta indisponível ("Não consegui consultar X agora; o restante da resposta segue abaixo"), limite de uso (429/402 do gateway, tratado como aviso amigável), pergunta fora de escopo ("Consigo responder sobre motoristas, transportadores, contratos, seguros e certificados").

## G. Responsividade

- **Desktop ≥1280**: 3 colunas (sidebar, chat, conversas). Chat com largura máxima legível (~48rem centralizada).
- **1024–1279**: painel de conversas colapsa em botão/Sheet.
- **Tablet 768–1023**: uma coluna, header compacto, sugestões em 2 linhas.
- **Mobile <768**: chat full-screen sob a top bar de 14; input fixo no rodapé; tabelas em cards; alvos de toque ≥44px.

## H. Acessibilidade

- Landmark único `<main>`; lista de mensagens em `role="log"` com `aria-live="polite"` para leitura das respostas.
- Foco no textarea ao abrir, após enviar, ao terminar o stream e ao trocar de thread.
- Enter envia, Shift+Enter quebra linha, Esc fecha painéis; navegação por Tab em todos os controles.
- `aria-label` em todo botão só de ícone (enviar, nova conversa, excluir, copiar).
- Contraste via tokens (`text-foreground`, `primary`/`primary-foreground`); nada de cinza arbitrário.
- Loading anunciado por texto ("Consultando dados…"), não só animação.
- Item de conversa: linha não-botão com botões separados de selecionar e excluir (sem botão dentro de botão).

## I. Histórico de conversas

UX: painel com lista de conversas (título automático a partir da primeira pergunta), "Nova conversa", renomear inline, excluir com confirmação e busca por texto do título. Cada conversa tem URL própria; recarregar `/assistente/:id` restaura a conversa.

Persistência escolhida: **banco (Lovable Cloud)**. O que será necessário na etapa de implementação:

- Tabela `assistente_conversas` (id, user_id, titulo, created_at, updated_at) e `assistente_mensagens` (id uuid gerado pelo banco, conversa_id, role, parts jsonb, created_at).
- GRANTs para `authenticated` e `service_role`; RLS estrita por `auth.uid() = user_id` (SELECT/INSERT/UPDATE/DELETE somente do dono — nada de leitura ampla como nas tabelas operacionais).
- Ids de mensagem do AI SDK (`msg_…`) não vão em coluna uuid; se necessários, coluna texto à parte.
- Persistência do assistente no `onFinish` do stream, com tratamento explícito de erro.

## J. Arquitetura de integração

```text
Chat UI (React, useChat)
   ↓ POST /functions/v1/assistente-chat  (JWT do usuário)
Camada do Assistente (Edge Function)
   • system prompt = protocolo de orquestração
   • define as consultas como tools do AI SDK
   • aplica limites (nº de chamadas, ids propagados, páginas)
   ↓
Camada de consulta (mesma lógica das 10 tools MCP)
   ↓ client Supabase com o Bearer do usuário
Supabase + RLS
```

Responsabilidades: a **UI** só envia texto e renderiza `message.parts` — não conhece nomes de tabela, filtros nem nomes técnicos das tools; a **camada do Assistente** decide quais consultas fazer, em que ordem, e formata o resultado; a **camada de consulta** é read-only e roda sob o token do usuário; o **banco** aplica RLS.

Observação técnica importante: as ferramentas do MCP são consumidas por clientes MCP externos (Connector, Claude, Cursor). O chat dentro do app **não pode chamar o Connector**; a Edge Function precisa expor as mesmas consultas como tools do AI SDK, **reutilizando a lógica já existente** em `src/lib/mcp/tools/*` (ou um módulo compartilhado) para não duplicar regras de negócio. Nenhuma tool MCP é alterada.

## K. Arquivos que precisariam ser criados/alterados

| Arquivo | Motivo | Tipo |
|---|---|---|
| `src/pages/Assistente.tsx` | Página do chat | Novo |
| `src/components/assistente/*` | Componentes listados na seção E | Novos |
| `src/components/ai-elements/*` | Primitivas AI Elements instaladas via registry | Novos (gerados) |
| `src/App.tsx` | Rotas `/assistente` e `/assistente/:threadId` | Edição pequena |
| `src/components/layout/Sidebar.tsx` | Item de menu "Assistente" | Edição pequena (1 entrada no array) |
| `src/hooks/useAssistenteConversas.ts` | React Query para threads/mensagens | Novo |
| `supabase/functions/assistente-chat/index.ts` | Motor do chat (AI Gateway + tools) | Nova Edge Function |
| `src/lib/mcp/tools/*` (ou módulo compartilhado) | Reuso da lógica de consulta pelo chat | Refactor sem mudança de comportamento (etapa futura) |
| Migration `assistente_conversas` / `assistente_mensagens` | Persistência com RLS por usuário | Nova migration |
| `index.html` / assets | Marca do Assistente | Ajuste pontual |

## L. Dependências novas

- `ai` + `@ai-sdk/react` (+ `@ai-sdk/openai-compatible` no lado da Edge Function) para streaming.
- AI Elements via `shadcn add` (código-fonte no projeto, não é dependência de runtime).
- `react-markdown` se as primitivas instaladas não cobrirem a renderização de markdown.
- Lovable AI Gateway habilitado (`LOVABLE_API_KEY`); nenhuma chave de terceiros.

## M. Riscos

| Risco | Nível |
|---|---|
| Chat expor PII além do necessário (ex.: pedir cadastro completo) | **Alto** — mitigar no system prompt e evitando exibir documento na UI |
| Duplicação de regra de negócio entre MCP e Edge Function do chat | **Alto** se copiada; médio com módulo compartilhado |
| Custo/latência de LLM em perguntas amplas | Médio |
| Respostas parciais interpretadas como totais pelo usuário | Médio — mitigado pelo `PartialResultAlert` |
| Novas tabelas de conversa com RLS frouxa | Médio — exigir política estrita por `auth.uid()` |
| CSP atual bloquear o endpoint de streaming | Médio — revisar `connect-src` |
| Peso de bundle das primitivas de chat | Baixo |
| Quebra de layout em telas pequenas | Baixo |

## N. Critérios de aceite da futura implementação

1. `/assistente` acessível pela sidebar e por acesso rápido, dentro do `MainLayout`, visualmente indistinguível do resto do sistema (tokens, Inter, Card/Badge/Table).
2. Threads com URL própria: criar → navega; recarregar restaura a conversa certa; duas conversas não misturam mensagens.
3. Mensagens persistidas por usuário com RLS validada (usuário A não lê conversa de B).
4. Mensagem do usuário aparece imediatamente; indicador de processamento em linguagem de negócio; input desabilitado durante o stream.
5. Renderização de `message.parts`, markdown, tabela, KPI, alerta de parcial e erro amigável — sem stack trace nem nome técnico de tool.
6. `truncated:true` sempre gera o alerta de resultado parcial com "N de M".
7. Nenhum CPF/CNPJ exibido na interface do chat.
8. Teclado: Enter envia, Shift+Enter quebra linha, foco correto, `aria-label` em ícones, `aria-live` na conversa.
9. Mobile 375px sem overflow horizontal; tabelas em cards.
10. Somente leitura: nenhuma ação de escrita disponível ao Assistente.
11. Typecheck, build, Vitest e scan de segurança sem novos achados.

## O. Escopo: agora x depois

**Agora (etapa da interface)**
- Página `/assistente` + rota de thread, item na sidebar e acesso rápido.
- Componentes de chat, welcome state, sugestões, input, estados de loading/erro/parcial.
- Blocos de resultado (KPI, tabela, lista, alerta).
- Edge Function de chat com as consultas como tools e o protocolo de orquestração no system prompt.
- Tabelas de conversa/mensagem com RLS por usuário.

**Depois**
- Correção dos achados de PII em `get_motorista` e `list_certificados_vencendo`.
- Exportar conversa (PDF/e-mail) e integração com o módulo de Relatórios.
- Busca semântica no histórico e favoritos.
- Ações de escrita (nenhuma nesta etapa nem na seguinte sem decisão explícita).
- Refactor formal do módulo compartilhado de consultas MCP ↔ chat.

Aguardando sua autorização para implementar.
