# Plano de trabalho — assumir o projeto Pactum Logística

Nenhuma alteração de código foi feita. Abaixo está o plano sugerido, em etapas, após a análise.

## Etapa 1 — Entender (sem alterar nada)
Ordem de estudo recomendada:
1. `src/main.tsx` → `src/App.tsx` (rotas e proteção de rotas)
2. `src/contexts/AuthContext.tsx` + `src/pages/Auth.tsx` (login/cadastro/sessão)
3. `src/hooks/useAdmin.ts` + `src/components/layout/Sidebar.tsx` (permissões e menu)
4. `src/pages/Motoristas.tsx` e `src/pages/Transportadores.tsx` (padrão CRUD do projeto)
5. `src/lib/validationSchemas.ts`, `src/lib/masks.ts`, `src/components/form/FormField.tsx`
6. `src/pages/Relatorios.tsx` + `supabase/functions/send-report-email/index.ts`
7. `src/integrations/supabase/types.ts` e as migrations em `supabase/migrations/`

## Etapa 2 — Corrigir problemas críticos
- `supabase/config.toml`: `verify_jwt = false` na função `extract-apolice`. A validação de token existe dentro do código, mas o gateway está aberto — revisar e ligar `verify_jwt = true`.
- `index.html`: título/descrição ainda são "Lovable App" / "Lovable Generated Project", com TODOs. Definir metadados reais.
- Revisar políticas de RLS de escrita (INSERT/UPDATE/DELETE) tabela por tabela e confirmar que DELETE é só admin em todas as 21 tabelas.

## Etapa 3 — Finalizar/limpar funcionalidades pendentes
- Decidir o destino de `src/pages/ConferenciaSeguros.tsx` (548 linhas) e `src/pages/DocumentosEmpresa.tsx` (253 linhas): não estão em nenhuma rota. Ligar ou remover.
- Decidir o destino das tabelas vazias e fora de escopo: `boletos`, `pronampe`, `pins_confins`, `documentos_empresa` (0 registros cada). Remover por migration se confirmado que estão fora de escopo.
- Rever `cavalos` e `reboques` (10 e 1 registros): não há tela dedicada identificada.

## Etapa 4 — Melhorar o código
- Extrair um hook/serviço de dados por entidade (ex.: `useMotoristas`) para tirar as chamadas `supabase.from(...)` de dentro das páginas.
- Quebrar as páginas grandes (Seguros 1021, Relatorios 978, Transportadores 946, Motoristas 939 linhas) em: tabela, formulário/modal, filtros.
- Padronizar tratamento de erro (hoje várias operações não checam `error`) e substituir os `any` restantes por tipos de `src/integrations/supabase/types.ts`.
- Usar React Query (já instalado) no lugar de `useEffect` + `useState` para busca de dados.
- Remover dependências não utilizadas após confirmação (`zod`, `react-hook-form`, `@hookform/resolvers` convivem com Formik+Yup; `next-themes`, `embla-carousel-react`, `vaul` provavelmente não usados).

## Etapa 5 — Testar
- Hoje só existe `src/test/example.test.ts` (teste vazio de exemplo).
- Começar por testes unitários de `src/lib/masks.ts`, `src/lib/passwordPolicy.ts`, `src/lib/rateLimiter.ts`, `src/lib/validationSchemas.ts` e das regras de aptidão em `Relatorios.tsx`.
- Depois, testes de componente com Testing Library (já instalado) para o formulário de Motoristas.

## Etapa 6 — Documentar
- Reescrever o `README.md` (hoje é o template padrão do Lovable).
- Documentar: o que é o sistema, regras de negócio (aptidão, conferência, relatório semanal), variáveis de ambiente, segredos das edge functions (SMTP_*), como rodar e como publicar.

## Etapa 7 — Preparar para produção
- Revisar CSP do `index.html` (hoje permite `unsafe-inline`/`unsafe-eval`).
- Conferir logs das edge functions e rotina de envio semanal do relatório.
- Rodar o scanner de segurança e o de dependências novamente antes de publicar.

## Observações
- Itens que não foi possível determinar pelo código: se o envio semanal do relatório é agendado automaticamente ou apenas manual; a intenção original por trás de `ConferenciaSeguros.tsx`, `DocumentosEmpresa.tsx`, `cavalos` e `reboques`.
