# Auditoria Final / Pós-Backlog — Pactum Logística

Diagnóstico apenas. Nenhum arquivo, migração, policy ou registro foi alterado.

## Escopo real desta auditoria

Verificado nesta rodada: código-fonte (estático), estrutura, hooks React Query, tratamento de erros, `package.json`, banco (contagens, policies, defaults, órfãos), build/typecheck/testes.

Não re-executado nesta rodada: passagem interativa tela a tela no navegador (Fluxos 1–6, previews de PDF/Excel, upload/download). Essa validação foi feita na regressão final da T12 e passou; se quiser, executo agora como etapa separada de verificação em runtime.

## 1. Arquitetura

Estrutura está coerente: `pages/` finas, `components/<entidade>/`, `hooks/` por entidade, `lib/` com regras puras (`aptidao`, `masks`, `dbError`, `passwordPolicy`, `storage`). T11 e T12 cumpriram o objetivo na maior parte do sistema.

| # | Achado | Sev |
|---|---|---|
| A1 | `Relatorios.tsx` (440 linhas) ficou fora da T12: consulta `relatorio_config`, `transportadores`, `transportador_motoristas`, `motoristas` e `contratos` direto pelo cliente, sem React Query, sem hook e sem cache compartilhado | 🟠 |
| A2 | `MotoristaAnexos.tsx` (265) e `TransportadorAnexos.tsx` (262) são praticamente o mesmo componente duplicado, mais `FileUpload.tsx` com terceira variação de upload | 🟡 |
| A3 | Páginas ainda grandes: `Contratos.tsx` 535, `Seguros.tsx` 515, `ConferenciaSeguros.tsx` 464, `ConferenciaComparativo.tsx` 416, `Conferencia.tsx` 356 | 🟡 |
| A4 | `tsconfig` com `strictNullChecks: false`, `noImplicitAny: false`, `noUnusedLocals: false` — typecheck não detecta null nem imports mortos | 🟡 |
| A5 | 44 ocorrências de `as any`, concentradas em `Relatorios.tsx` (9), `Seguros.tsx` (7), `Transportadores.tsx` (6) — os tipos gerados existem e não estão sendo usados | 🟡 |
| A6 | Sem ciclos de dependência detectados; sem código morto relevante fora do já conhecido (`DocumentosEmpresa` mantida propositalmente oculta) | 🟢 |

## 2. React Query

Chaves estáveis, exportadas como constantes por hook; nenhum conflito de cache identificado.

- Invalidação cruzada correta em `useTransportadores`: vínculos invalidam `transportadorVinculosKey` **e** `motoristaVinculosKey`.
- `useUsuarios` usa `enabled: isAdmin` corretamente.
- 🟠 **Lacuna real:** `Relatorios.tsx` lê motoristas/transportadores/contratos por fora do cache. Qualquer mutation nessas entidades não reflete no relatório sem recarregar a página.
- 🟡 `useConferenciaSeguros`: exclusão de conferência invalida `conferenciasKey`, mas não remove/invalida `conferenciaItensKey(id)` — cache órfão de itens permanece até o GC.
- Consultas diretas restantes fora dos hooks e sua justificativa:

| Local | Chamada | Justificada? |
|---|---|---|
| `Relatorios.tsx` 88–160 | `relatorio_config`, 4 tabelas de negócio | ❌ Não — pendência da T12 |
| `MotoristaAnexos` / `TransportadorAnexos` / `FileUpload` | `supabase.storage` | ✅ Sim — Storage não é PostgREST |
| `Relatorios.tsx` 315 | `functions.invoke("send-report-email")` | ✅ Sim — Edge Function |
| `usePdfExtraction` | `functions.invoke("extract-apolice")` + tabela de extraídos | ✅ Sim, mas fora do padrão React Query |
| `AuthContext`, `Auth`, `Seguranca`, `MfaEnroll/Verify`, `useAdmin` | `supabase.auth` | ✅ Sim |

## 3. reportDbError

Presente em todos os 8 hooks de entidade e em `Index.tsx`/`Relatorios.tsx`.

- 🟡 Fluxos de Storage (upload/remove) não passam por tratamento centralizado — usam `toast` ad-hoc com textos próprios.
- 🟡 `usePdfExtraction` usa `console.error` + `catch` genérico e engole o erro no `loadSavedExtraction` (retorna `false` sem avisar o usuário).
- 🟡 Mensagens inconsistentes: parte do sistema usa `sonner` (`toast.error`), parte usa `useToast` (`variant: "destructive"`) — dois sistemas de toast ativos ao mesmo tempo.

## 4. Banco

Contagens atuais: 137 transportadores, 305 motoristas, 910 contratos, 1 seguro, 1 `relatorio_config`, 5.716 linhas em `audit_log`. Nenhum vínculo órfão em `transportador_motoristas`; nenhum seguro sem motorista.

- 🔴 **`created_by` nulo em massa:** 249 de 305 motoristas e 126 de 137 transportadores têm `created_by IS NULL` (importação SQL em lote). Consequência direta na seção 5.
- 🟠 `relatorio_config` continua com `.limit(1)` **sem `.order(...)`** em `Relatorios.tsx:88-91`. Hoje só existe 1 linha, então não há bug visível — mas nada no schema impede uma segunda linha (sem unique/constraint), e `saveConfig` insere nova linha sempre que `configId` estiver vazio. Se surgir uma segunda linha, a configuração exibida passa a ser não determinística.
- 🟢 `created_by` tem default `auth.uid()` em todas as 10 tabelas relevantes — inserts novos ficam corretos.
- 🟢 `audit_log` cresce sem política de retenção nem consumo no frontend.

## 5. RLS / Segurança

Padrão aplicado consistentemente nas tabelas verificadas (`motoristas`, `transportadores`, `contratos`, `cavalos`, `relatorio_config`, `conferencia_seguros_itens`):
SELECT `true` para autenticados · INSERT `created_by = auth.uid()` · UPDATE criador ou admin · DELETE somente admin.

- 🔴 **Divergência frontend × banco:** a UI mostra "Editar" para todo usuário autenticado, mas o banco recusa UPDATE em 249 motoristas e 126 transportadores importados (`created_by NULL`). Um usuário comum recebe erro de permissão ao editar quase todo o cadastro legado. Só o admin consegue.
- 🟠 Mesma divergência no DELETE: botão de excluir é exibido a não-admins, e a policy só permite admin.
- 🟢 `conferencia_seguros_itens` valida propriedade via `EXISTS` na conferência-pai — correto.
- 🟢 Bucket `documentos` privado, acesso via URL assinada em `lib/storage.ts` (expiração de 1h).
- ⚪ `extract-apolice` com `verify_jwt = true` e validação de claims — ok.

## 6. Autenticação

`ProtectedRoute`/`PublicRoute` cobrem todas as rotas de negócio; `/reset-password` é pública por design. MFA TOTP, política de senha e rate limiting no login presentes. Restrição `@maiore.com.br` aplicada no trigger `handle_new_user`.

- 🟡 `/documentos-empresa` continua protegida e funcional, apenas oculta no menu — acessível por URL direta a qualquer autenticado (decisão de produto já registrada).
- 🟡 Não há verificação de expiração de sessão além do refresh automático do SDK.

## 7–10. Telas, fluxos, PDF/Excel, Storage

Estado conforme a regressão da T12 (aprovada): todas as rotas carregam, buscas funcionam, conferência persiste itens e toggles, relatórios geram e pré-visualizam PDF e Excel, destinatário `savio.paula@maiore.com.br` persistido, upload/download de anexos com URL assinada. Não re-testado interativamente nesta rodada.

- 🟡 Exclusão de anexo remove o arquivo do Storage e depois a linha; se a segunda etapa falhar, sobra registro apontando para arquivo inexistente (sem transação).
- 🟡 Não há rotina de detecção de arquivos órfãos no bucket.

## 11. CSP

Produção (via plugin `production-csp` no `vite.config.ts`): sem `unsafe-eval`, sem `unsafe-inline` em `script-src`, `worker-src 'self' blob:`, `frame-src 'self' blob: https://*.supabase.co`.

- ⚪ `frame-ancestors` entregue por `<meta>` é ignorado pelo navegador — proteção real depende de header HTTP no hosting. Observação, não correção.
- 🟡 `style-src` mantém `unsafe-inline` (necessário para Tailwind/Radix).

## 12. Dependências

- 🟢 Candidatas novas: `zod` (nenhum import em `src/`, incluindo `ui/`) e `@tailwindcss/typography` (não referenciado). Apenas registrado.
- ⚪ `react-hook-form`, `recharts`, `vaul`, `cmdk`, `input-otp`, `next-themes`, `embla-carousel-react`, `react-resizable-panels`, `react-day-picker` são usados exclusivamente por componentes `src/components/ui/*` — manter.
- ⚪ Dois sistemas de toast (`sonner` + `ui/toaster`) coexistem por decisão histórica.

## 13. Performance

- 🟡 `Relatorios.tsx` carrega 305 motoristas + 137 transportadores + 910 contratos sem paginação a cada abertura, e sem cache.
- 🟡 Listas de Motoristas (305) e Contratos (910) renderizam sem virtualização.
- 🟡 Criação de conferência insere ~260 itens em lote — aceitável, mas é o ponto mais pesado do app.
- ⚪ Sem code-splitting por rota; `pdfjs-dist`, `jspdf` e `xlsx` entram no bundle inicial.

## 14. Acessibilidade

- 🟡 `Badge` sem `forwardRef` recebendo ref em `TransportadoresList` — warning real no console.
- 🟡 `<button>` dentro de `<button>` em `ConferenciasSidebar.tsx:53` (botão de excluir dentro do item clicável da lista) — HTML inválido, confirmado.
- 🟡 Vários inputs sem `label` associado por `htmlFor`/`id` nos diálogos de formulário.

## 15. Console

Apenas 2 famílias de warnings, ambas pré-existentes e de origem identificada: `forwardRef` no `Badge` e aninhamento de botões na sidebar de conferências. Zero erros de runtime. As mensagens `Unknown message type: lovable-preview-auth:result` vêm do ambiente de preview, não da aplicação.

## 16. Testes

`vitest run`: **20/20 passando** (5 arquivos). Typecheck limpo. Build ok.

- 🟠 Cobertura restrita a `lib/` puro (`masks`, `passwordPolicy`, `dbError`, `aptidao`). Zero testes para hooks React Query, geração de PDF/Excel, regras de relatório e componentes.

## 18. Classificação final

| Problema | Arquivo | Sev | Impacto | Recomendação |
|---|---|---|---|---|
| 375 registros com `created_by` nulo bloqueiam UPDATE de não-admins | banco (`motoristas`, `transportadores`) | 🔴 | Usuário comum não edita o cadastro legado | Atribuir `created_by` ao admin ou flexibilizar a policy |
| UI oferece Editar/Excluir que o banco recusa | listas de todas as entidades | 🔴 | Erro de permissão como experiência padrão | Ocultar/desabilitar ações conforme `useAdmin` + autoria |
| Relatórios fora do React Query | `src/pages/Relatorios.tsx` | 🟠 | Dados desatualizados, sem cache | Criar `useRelatorios` + `useRelatorioConfig` |
| `.limit(1)` sem `.order()` em `relatorio_config` | `Relatorios.tsx:88` | 🟠 | Config não determinística se surgir 2ª linha | `.order("updated_at", { ascending: false })` + unique |
| `conferenciaItensKey` não invalidada ao excluir conferência | `useConferenciaSeguros.ts:172` | 🟡 | Cache órfão | Adicionar `removeQueries` |
| Componentes de anexo duplicados | `MotoristaAnexos` / `TransportadorAnexos` | 🟡 | Manutenção dobrada | Extrair `useAnexos` genérico |
| Storage sem `reportDbError` | 3 componentes | 🟡 | Mensagens inconsistentes | Padronizar |
| `strictNullChecks` desligado + 44 `as any` | `tsconfig`, páginas | 🟡 | Bugs de null passam no typecheck | Ativar gradualmente |
| Sem testes de hooks/relatórios | `src/test/` | 🟠 | Refatorações futuras sem rede de segurança | Testar hooks e builders |
| `<button>` dentro de `<button>` | `ConferenciasSidebar.tsx:53` | 🟡 | HTML inválido, a11y | Trocar item por `div` + `role` |
| `Badge` sem `forwardRef` | `ui/badge.tsx` | 🟡 | Warning | `React.forwardRef` |
| Anexo órfão em falha parcial | anexos | 🟡 | Registro sem arquivo | Reordenar operações |
| `audit_log` sem retenção nem UI | banco | 🟢 | Crescimento indefinido | Política de expurgo |
| `zod` e `@tailwindcss/typography` sem uso | `package.json` | 🟢 | Bundle/ruído | Avaliar remoção |
| Sem code-splitting; bundle inicial pesado | build | 🟢 | Carga inicial | Lazy nas rotas pesadas |
| `frame-ancestors` inerte em `<meta>` | `index.html` | ⚪ | Sem clickjacking protection real | Header no hosting |

Agrupamento: 🔴 2 · 🟠 4 · 🟡 8 · 🟢 3 · ⚪ 1.

## 19. Veredito

**🟡 PRONTO COM PENDÊNCIAS.**

O projeto está tecnicamente saudável e sustentável: arquitetura clara, erros centralizados, RLS coerente, CSP endurecida, build e testes verdes. O que impede o 🟢 é um problema **de dados, não de código**: a importação em massa deixou 375 registros sem `created_by`, e a policy de UPDATE exige criador ou admin — na prática, apenas o admin consegue editar o cadastro legado, enquanto a interface segue oferecendo essas ações a todos.

- Arquiteturalmente saudável? **Sim**, com `Relatorios.tsx` como exceção.
- React Query consistente? **Quase** — falta Relatórios e uma invalidação de itens de conferência.
- Erros centralizados? **Sim** no banco; **não** no Storage e na extração de PDF.
- Riscos no banco? **Sim** — `created_by` nulo e ausência de unique em `relatorio_config`.
- Segurança adequada? **Sim** (RLS, bucket privado, JWT na Edge Function, MFA, política de senha).
- CSP adequada? **Sim**, com `frame-ancestors` dependente de header no hosting.
- Bugs funcionais conhecidos? **Sim** — edição negada a não-admins nos registros importados.
- Performance relevante? **Moderada** — Relatórios e listas grandes sem paginação.
- Acessibilidade relevante? **Sim, leve** — botão aninhado e labels.
- Alteração obrigatória antes de produção? **Sim**: resolver o `created_by` nulo **ou** alinhar a UI às permissões reais. Todo o resto é evolutivo.

## 20. Backlog pós-auditoria

**P1 — Crítico**
1. `created_by` nulo em 375 registros — banco (`motoristas`, `transportadores`). Risco: usuário comum não edita cadastro legado. Solução: backfill com o usuário admin ou policy que também aceite `created_by IS NULL`. Sem dependências. Complexidade: baixa.
2. UI x permissões — listas e diálogos de todas as entidades. Risco: erro de permissão como comportamento normal. Solução: derivar visibilidade de Editar/Excluir de `useAdmin` + autoria. Depende do item 1. Complexidade: média.

**P2 — Alto**
3. `useRelatorios` / `useRelatorioConfig` — `src/pages/Relatorios.tsx`. Risco: dados obsoletos. Complexidade: média.
4. `.limit(1)` sem `.order()` + ausência de unique em `relatorio_config`. Complexidade: baixa.
5. Testes de hooks React Query e dos builders de PDF/Excel. Complexidade: média.

**P3 — Médio**
6. `useAnexos` unificado (Motorista/Transportador/FileUpload). Complexidade: média.
7. Padronizar erros de Storage via `reportDbError` e unificar o sistema de toast. Complexidade: baixa.
8. Invalidar `conferenciaItensKey` na exclusão de conferência. Complexidade: trivial.
9. Ativar `strictNullChecks` e eliminar `as any` gradualmente. Complexidade: alta.

**P4 — Baixo**
10. Corrigir `<button>` aninhado e `forwardRef` do `Badge`. Complexidade: trivial.
11. Retenção/expurgo de `audit_log`. Complexidade: baixa.
12. Avaliar remoção de `zod` e `@tailwindcss/typography`. Complexidade: trivial.
13. Code-splitting das rotas pesadas (PDF/Excel). Complexidade: média.
14. `frame-ancestors` como header HTTP no hosting. Complexidade: baixa.

Nenhuma alteração foi aplicada. Aguardando sua decisão sobre o que entra no próximo ciclo.
