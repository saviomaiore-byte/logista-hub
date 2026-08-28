# Detalhamento — T12 (Hooks/React Query), T13 (limpeza de dependências) e T14 (endurecer CSP)

Refatorações puramente técnicas. Nenhuma alteração de funcionalidade, layout, regra de negócio, banco, queries, permissões ou rotas. Mantém o princípio do plano técnico: **não quebrar o que já funciona**, uma alteração por vez, com regressão.

---

## T12 — Hooks de dados por entidade + migração para React Query

### Objetivo
Centralizar as consultas ao backend em hooks reutilizáveis por entidade e migrar as buscas manuais (`useState` + `useEffect` + `supabase.from(...)`) para React Query, que já está instalado (`@tanstack/react-query`, v5) e **já em uso** em `Seguros.tsx`, `Transportadores.tsx` e `ConferenciaSeguros.tsx`. O trabalho é padronizar o restante, não introduzir a lib.

### Estado atual (confirmado por leitura)
- Consultas diretas ao banco em 12 arquivos (páginas + componentes de anexos).
- React Query já usado em 3 páginas (padrão de referência a seguir).
- `reportDbError` (`src/lib/dbError.ts`) **não** está aplicado em todas as consultas (ver T8b).

### Escopo — criar hooks por entidade em `src/hooks/`
| Hook | Origem (pagina/componente) | Retorna |
|---|---|---|
| `useMotoristas` | `pages/Motoristas.tsx`, `MotoristaAnexos.tsx` | lista + criacao/atualizacao/exclusao (mutations com invalidation) |
| `useTransportadores` | `pages/Transportadores.tsx` | lista + vinculo motoristas + cavalos + reboques |
| `useContratos` | `pages/Contratos.tsx`, `ContratoAnexos.tsx` | lista + anexos |
| `useSeguros` | `pages/Seguros.tsx`, `usePdfExtraction` | lista + apolice |
| `useCertificados` | `pages/Certificados.tsx` | lista |
| `useConferenciaSeguros` | `pages/ConferenciaSeguros.tsx` | conferencias + itens + extraidos |
| `useUsuarios` / `useAuditoria` | `pages/Usuarios.tsx` | contas + roles |
| `useDocumentosEmpresa` | `pages/DocumentosEmpresa.tsx` | lista (rota oculta) |

### Regras obrigatórias dos hooks
1. Toda query usa React Query `useQuery` com `queryKey` estável por entidade.
2. Toda mutation usa `useMutation` e invalida a `queryKey` da entidade ao concluir (`invalidateQueries`).
3. Todo erro passa por `reportDbError` — aproveita para fechar a pendência **T8b** (erro tratado em um só lugar).
4. `Relatorios.tsx` **não** é migrado para React Query nesta tarefa: o payload da edge function e o fluxo de envio precisam permanecer byte a byte iguais e já foram validados na T11. Se migrado, só numa etapa final e isolada.
5. Estados vazios/opcionais continuam enviados como `null` (regra de memória).

### Riscos e mitigação
- **Médio/Alto**: trocar fetch manual por React Query muda o ciclo de vida (cache, refetch, loading). Mitigação: fazer página a página, começando pelas de baixo risco (Certificados, DocumentosEmpresa), mantendo as telas visualmente idênticas.
- **Médio**: `reportDbError` ainda parcial — migrar junto com o hook, não em separado.
- **Baixo**: hooks são autocontidos; nenhum módulo externo importa as páginas.

### Ordem de execução (uma etapa por vez, com regressão)
1. `useCertificados` + `useDocumentosEmpresa` (mais simples).
2. `useContratos` (+ anexos).
3. `useMotoristas` (+ anexos).
4. `useTransportadores` (maior volume: cavalos, reboques, vínculos).
5. `useSeguros` + `useConferenciaSeguros`.
6. `useUsuarios` / `useAuditoria`.
7. Regressão completa: login → dashboard → todas as telas de CRUD → conferências → relatórios (PDF/Excel) → logout.

### Critérios de conclusão
Todas as consultas de CRUD via hooks React Query; `reportDbError` aplicado em todos os hooks; invalidação correta (criar/editar reflete na lista); nenhuma mudança visual; build, typecheck e 20+ testes verdes; console sem erros novos.

---

## T13 — Limpeza de dependências não usadas

### Objetivo
Remover do `package.json` as dependências que não são importadas em nenhum lugar, reduzindo o peso do bundle e a superfície de ataque.

### Estado atual (package.json lido)
Dependências potencialmente não usadas a **confirmar por busca** antes de remover:
- `jsdom` (devDependency) — o Vitest usa `happy-dom`; verificar se algum teste importa jsdom.
- `@vitejs/plugin-react-swc` — o build usa `@vitejs/plugin-react` (memória: trocado do swc); confirmar em `vite.config.ts`.
- `@hookform/resolvers`, `react-hook-form` — confirmar se ainda há formulários react-hook-form (projeto migrou para Formik).
- `input-otp` — confirmar uso (MFA usa lib própria?).
- `sonner` — confirmar se o Toaster usado é shadcn (`use-toast`) ou sonner.
- `cmdk` — confirmar se algum comando usa `Command`.
- `react-resizable-panels`, `vaul`, `embla-carousel-react`, `next-themes`, `react-day-picker` — confirmar uso real.

### Processo (por dependência candidata)
1. `rg "<import>|from '<pkg>'|require('<pkg>')" src` — se **zero** ocorrências de import, marcar como candidata.
2. Verificar se aparece em `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js` ou scripts de build.
3. Remover apenas as confirmadamente sem uso.
4. Rodar build + `vitest run` para detectar quebra de import em tempo de execução.

### Regras
- **Nunca** remover uma dependência usada por uma Edge Function (`supabase/functions/`) — o escopo da limpeza é o frontend; functions têm seu próprio runtime.
- Manter `@tanstack/react-query` (usado e alvo da T12), `jspdf`, `xlsx`, `pdfjs-dist`, `formik`, `yup`, `@supabase/supabase-js`.
- Uma remoção por vez; se o build quebrar, reverter a dependência.

### Risco
Baixo, desde que cada remoção seja precedida por busca de import e seguida de build.

### Critérios de conclusão
`package.json` sem dependências não usadas; build, typecheck e testes verdes; bundle menor (comparar `bun run build` antes/depois).

---

## T14 — Endurecer a Content Security Policy

### Objetivo
Reduzir `unsafe-inline` / `unsafe-eval` da CSP atual para defesa em profundidade, sem quebrar o app em produção.

### Estado atual (index.html lido)
`default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self';`

### Endurecimentos propostos
1. **Remover `'unsafe-eval'`** do `script-src` — o maior risco. Antes: confirmar que Vite em produção não precisa de eval (build gera JS estático; pdfjs-dist e jspdf podem exigir `'unsafe-eval'` em modo worker — validar no preview de produção e na geração de PDF).
   - Se pdfjs-dist/jspdf exigirem, avaliar alternativas (worker via `new Worker(..., { type: 'module' })` já usado no projeto) em vez de abrir mão da proteção.
2. **Remover `'unsafe-inline'` do `script-src`** — exige que nenhum script inline exista. Vite em produção não injeta script inline por padrão; validar o HTML de build.
3. **Manter `'unsafe-inline'` no `style-src`** — o shadcn/Tailwind (injetado via `<style>`) e fontes Google dependem disso; remover quebraria o visual. Restringir à origem das fontes é o suficiente nesta etapa.
4. **Aplicar `worker-src 'self' blob:`** explícito se pdfjs-dist usar workers.
5. **`frame-ancestors 'self'`** para impedir que o app seja embutido em iframe de terceiros (defesa anti-clickjacking).
6. Revisar `img-src`/`connect-src` se houver novos hosts de arquivos/upload.

### Processo
1. Testar o app com `'unsafe-eval'` removido **em preview de produção** (build + `bun run preview`), exercitando: login, MFA, geração/visualização de PDF e Excel, upload/abertura de arquivos, extração de PDF por IA.
2. Se algo quebrar, identificar o requisito exato (ex.: pdfjs `'unsafe-eval'`) e decidir: configurar worker module (melhor) ou manter a diretiva só para o contexto necessário.
3. Aplicar `frame-ancestors`, `worker-src` e validar novamente.
4. Não usar meta tag duplicada nem headers de servidor em paralelo (meta única no `index.html`).

### Risco
Médio — CSP afeta o app inteiro (scripts, workers, estilos). Por isso é a última tarefa e exige validação de produção, não só de dev.

### Critérios de conclusão
CSP em produção sem `unsafe-eval` (e, se possível, sem `unsafe-inline` em `script-src`), com `frame-ancestors` e `worker-src`; todas as funcionalidades críticas (login, MFA, PDF/Excel, upload, IA) validadas; nenhum erro de CSP no console.

---

## Roadmap de execução

```text
T12 (hooks/React Query)  →  T13 (limpar dependências)  →  T14 (endurecer CSP)
```

- **T12 primeiro**: a limpeza de dependências (T13) fica mais segura depois que todas as consultas forem centralizadas nos hooks (só importam o que usam). Além disso, T12 encerra a pendência T8b.
- **T13 em seguida**: reduz o peso e a superfície antes do endurecimento de CSP.
- **T14 por último**: maior risco; exige rede de testes (T12) e bundle limpo (T13) antes.

## Riscos de regressão (maiores primeiro)
1. T14 — CSP afeta todo o app (scripts, workers, estilos).
2. T12 — trocar fetch manual por React Query muda ciclo de vida de dados.
3. T13 — remover dependência usada em runtime quebra build/imports.