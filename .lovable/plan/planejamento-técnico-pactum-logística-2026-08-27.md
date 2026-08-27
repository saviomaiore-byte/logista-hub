# Planejamento técnico — Pactum Logística

Regra que rege todo o plano: **não quebrar o que já funciona**. Alterações pequenas, isoladas e testáveis, uma por vez.

## 🔒 Funcionalidades protegidas (não podem quebrar)

| Funcionalidade | O que faz | Onde está | Depende / é dependida por | Backend |
|---|---|---|---|---|
| Autenticação e sessão | Login, cadastro, reset de senha, MFA TOTP, rate limit, domínio `@maiore.com.br` | `src/contexts/AuthContext.tsx`, `src/pages/Auth.tsx`, `ResetPassword.tsx`, `components/auth/MfaEnroll.tsx`, `MfaVerify.tsx`, `lib/passwordPolicy.ts`, `lib/rateLimiter.ts` | Todas as rotas (`ProtectedRoute` em `App.tsx`), Sidebar, todas as páginas | Auth + trigger `handle_new_user` → `profiles` |
| Permissões (RBAC) | Admin vê Usuários/Segurança e pode deletar | `src/hooks/useAdmin.ts`, `components/layout/Sidebar.tsx`, `pages/Usuarios.tsx` | Menu lateral, botões de exclusão em todas as páginas | `user_roles`, função `has_role()`, RLS de todas as tabelas |
| CRUD Motoristas | Cadastro/edição/exclusão, CNH, MOPP, anexos, contador no header | `pages/Motoristas.tsx`, `components/motorista/MotoristaAnexos.tsx`, `lib/validationSchemas.ts`, `lib/masks.ts` | Conferência, Seguros, Contratos, Relatórios | `motoristas`, `motorista_arquivos`, bucket `documentos` |
| CRUD Transportadores | Cadastro, vínculo N:M com motoristas, checkboxes ANTT/Alvará/Certificado, situação operacional | `pages/Transportadores.tsx`, `components/transportador/TransportadorAnexos.tsx` | Relatórios (regras de aptidão), Contratos | `transportadores`, `transportador_motoristas`, `transportador_arquivos` |
| Seguros | Cadastro de apólices e extração por IA de PDF | `pages/Seguros.tsx`, `hooks/usePdfExtraction.ts`, `supabase/functions/extract-apolice` | Conferência de seguros | `seguros`, `conferencia_seguros*`, Gemini |
| Contratos | Cadastro, modelo, anexos | `pages/Contratos.tsx`, `components/contrato/ContratoAnexos.tsx` | Relatórios (contrato assinado) | `contratos` |
| Conferência de documentos | Comparativo/alertas de vencimento | `pages/Conferencia.tsx`, `components/conferencia/ConferenciaComparativo.tsx` | Dashboard | `motoristas`, `certificados` |
| Relatórios semanais | PDF + Excel, pré-visualização e envio por e-mail SMTP | `pages/Relatorios.tsx`, `supabase/functions/send-report-email` | Motoristas, Transportadores, Contratos | `relatorio_config`, segredos SMTP_* |
| Upload / arquivos | Upload e leitura via signed URL (bucket privado) | `components/FileUpload.tsx`, `lib/storage.ts` | Motoristas, Transportadores, Contratos, Seguros, Certificados | Storage `documentos` |
| Auditoria | Registra INSERT/UPDATE/DELETE | trigger `audit_trigger_func` | Página Segurança | `audit_log` |

Qualquer tarefa abaixo que toque estes pontos exige teste de regressão explícito.

## 📊 Resumo de prioridades

**🔴 P0 — Crítico**
- Nenhum item que impeça o sistema de funcionar hoje. O único de segurança real: `verify_jwt = false` na função `extract-apolice` (gateway aberto; há checagem interna de token, mas a superfície fica exposta).

**🟠 P1 — Alta**
- Rota `/conferencia-seguros` renderiza `Seguros`, não `ConferenciaSeguros` — funcionalidade construída e inacessível.
- Metadados do `index.html` ainda são "Lovable App" / "Lovable Generated Project" (aparecem no navegador e em compartilhamentos).
- Revisão tabela a tabela das políticas de escrita/exclusão para confirmar coerência após as várias migrações.

**🟡 P2 — Média**
- Decidir destino de `DocumentosEmpresa.tsx` (sem rota) e das tabelas fora de escopo (`boletos`, `pronampe`, `pins_confins`, `documentos_empresa`).
- Definir uso de `cavalos` e `reboques` (dados existem, sem tela).
- Padronizar tratamento de erro nas chamadas ao banco (várias não checam `error`).
- Testes automatizados das regras de aptidão e das libs (`masks`, `passwordPolicy`, `validationSchemas`).
- README e documentação técnica reais.

**🟢 P3 — Baixa**
- Quebrar páginas grandes (Seguros ~1021, Relatórios ~978, Transportadores ~946, Motoristas ~939 linhas) em tabela/formulário/filtros.
- Extrair hooks de dados por entidade; migrar buscas para React Query.
- Remover dependências não usadas.
- Endurecer CSP (hoje com `unsafe-inline`/`unsafe-eval`).

## 📋 Backlog

| P | Tarefa | Motivo | Arquivos | Risco | Dependências | Status |
|---|---|---|---|---|---|---|
| P0 | T1 Ligar `verify_jwt` em extract-apolice | Endpoint aberto no gateway | `supabase/config.toml`, `functions/extract-apolice/index.ts`, `hooks/usePdfExtraction.ts` | Médio | — | ✅ Concluída |
| P1 | T2 Corrigir rota `/conferencia-seguros` | Rota aponta para componente errado | `src/App.tsx`, `pages/ConferenciaSeguros.tsx`, `Sidebar.tsx` | Baixo | — | ✅ Concluída |
| P1 | T3 Metadados reais no `index.html` | Template default em produção | `index.html` | Baixo | — | ✅ Concluída |
| P1 | T4 Auditoria das políticas RLS por tabela | Várias migrações sobrepostas | migration + linter | Médio | — | ✅ Concluída (sem migração necessária) |
| P2 | T5 Decidir `DocumentosEmpresa.tsx` (publicar rota + completar, ou remover) ⚠️ Requer decisão de produto | Componente com insert/select funcionais, mas sem rota e sem menu; tabela com 0 registros | `pages/DocumentosEmpresa.tsx`, `App.tsx`, `Sidebar.tsx`, `lib/validationSchemas.ts`, migration | Baixo | Decisão do usuário | Bloqueada |
| P2 | T6 Remover `boletos`, `pronampe`, `pins_confins` (zero uso, zero dados, zero FK) ⚠️ Requer confirmação | Escopo já excluiu esses módulos | migration + `lib/validationSchemas.ts` (`pronampeSchema`) | Baixo | Confirmação | Bloqueada |
| — | ~~T7 Definir `cavalos`/`reboques`~~ | **Classificação incorreta.** CRUD completo já existe nas abas de `pages/Transportadores.tsx`, com FK para transportadores e dados reais (10 cavalos, 1 reboque) | — | — | — | ✅ Já implementada — removida do backlog |

| P2 | T8 Padronizar tratamento de erro | Falhas silenciosas | `lib/dbError.ts`, Index, Motoristas, Relatorios, Seguros, anexos | Baixo | — | ✅ Concluída |
| P2 | T9 Testes das libs e regras de aptidão | Só existe teste de exemplo | `src/test/*`, `lib/aptidao.ts`, `vitest.config.ts` | Baixo | — | ✅ Concluída (20 testes verdes) |
| P2 | T10 README + doc técnica | Template padrão | `README.md`, `docs/arquitetura.md` | Nenhum | T1–T4 | ✅ Concluída |
| P3 | T11 Quebrar páginas grandes (uma por vez) | Manutenibilidade | páginas | Alto | T9 | A fazer |
| P3 | T12 Hooks de dados / React Query | Manutenibilidade | novos `hooks/` | Médio | T11 | A fazer |
| P3 | T13 Limpar dependências não usadas | Peso do bundle | `package.json` | Baixo | — | A fazer |
| P3 | T14 Endurecer CSP | Defesa em profundidade | `index.html` | Médio | — | A fazer |

## 🗺️ Roadmap (ordem e motivo)

```text
T3 metadados  →  T2 rota            (mudanças isoladas, zero dependência, ganho imediato)
      ↓
T1 verify_jwt →  T4 revisão RLS     (segurança; T1 antes porque toca só a função de IA)
      ↓
T5/T6/T7 decisões de escopo         (bloqueadas por validação do requisito)
      ↓
T8 tratamento de erro               (torna as falhas visíveis antes de refatorar)
      ↓
T9 testes                           (rede de segurança obrigatória antes de refatorar)
      ↓
T10 documentação
      ↓
T11–T14 refatorações e CSP          (só com testes verdes)
```

Motivo da ordem: primeiro o que é isolado e reversível; depois segurança; depois esclarecer escopo (evita trabalhar em código que será removido); depois visibilidade de erros e testes; refatoração por último, apoiada em testes.

## Fases

1. **Segurança e estabilidade** — T1, T4
2. **Correção de bugs** — T2, T3
3. **Funcionalidades pendentes / escopo** — T5, T6, T7
4. **Melhorias** — T8, T13
5. **Testes** — T9
6. **Documentação** — T10
7. **Produção** — T14 + rescan de segurança e dependências, revisão de logs das functions

## Detalhamento das primeiras tarefas

### Tarefa T3 — Metadados reais no index.html
- **Objetivo:** título e descrição corretos no navegador e no compartilhamento.
- **Problema:** `<title>Lovable App</title>` e descrição de template, com TODOs.
- **Arquivos:** `index.html`.
- **Impacto:** apenas `<head>`. Não tocar na meta CSP nesta tarefa.
- **Risco:** Baixo.
- **Como implementar:** definir title (<60 chars), description (<160), og:title/description/type, twitter:card. Sem og:image novo.
- **Como testar:** abrir o app, conferir aba do navegador; app carrega normalmente (a CSP não foi alterada).
- **Critério:** nenhuma string "Lovable" de template no `<head>`.
- **Regressões possíveis:** só se a CSP for editada por engano.

### Tarefa T2 — Corrigir a rota /conferencia-seguros
- **Objetivo:** dar acesso à tela de conferência de seguros já construída.
- **Problema:** `App.tsx` mapeia `/conferencia-seguros` para `Seguros`.
- **Arquivos:** `src/App.tsx`, `src/pages/ConferenciaSeguros.tsx`, `components/layout/Sidebar.tsx`.
- **Impacto:** rota nova no menu; `/seguros` permanece intacta.
- **Risco:** Baixo (nenhum item do menu aponta hoje para essa rota).
- **Como implementar:** importar `ConferenciaSeguros` e usá-lo na rota; validar que a página compila e lê `conferencia_seguros*` com as RLS atuais; só então adicionar o item no Sidebar.
- **Como testar:** abrir `/seguros` (regressão), abrir `/conferencia-seguros`, criar uma conferência, verificar extração e listagem; conferir console e rede.
- **Critério:** tela abre, lista e grava sem erro de permissão.
- **Regressões possíveis:** menu lateral, página Seguros.

### Tarefa T1 — Ligar verify_jwt em extract-apolice
- **Objetivo:** fechar o gateway da função.
- **Problema:** `supabase/config.toml` tem `verify_jwt = false`.
- **Arquivos:** `supabase/config.toml`, `functions/extract-apolice/index.ts`, `hooks/usePdfExtraction.ts`.
- **Impacto:** toda extração de apólice por IA (Seguros, Conferência de Seguros).
- **Risco:** Médio — se o cliente não enviar o header `Authorization`, a extração para de funcionar.
- **Como implementar:** antes de mudar, confirmar que a chamada no cliente usa `supabase.functions.invoke` com sessão ativa (envia o token). Só então ligar `verify_jwt = true` e manter a checagem interna de claims.
- **Como testar:** logado, subir um PDF e extrair; verificar log da function; conferir que sem sessão retorna 401.
- **Critério:** extração funciona logado e é rejeitada sem token.
- **Regressões possíveis:** upload/extração de apólices.

### Tarefa T4 — Auditoria das políticas RLS
- **Objetivo:** garantir regra uniforme: leitura para autenticados, escrita para autor ou admin, exclusão só admin.
- **Arquivos:** migration + linter de banco.
- **Risco:** Médio — política errada esconde dados dos usuários (já ocorreu antes).
- **Como implementar:** listar as políticas atuais das 21 tabelas, comparar com a regra, corrigir só as divergentes numa migration.
- **Como testar:** com conta admin e conta comum: listar, criar, editar registro próprio, tentar editar de terceiros, tentar excluir.
- **Critério:** nenhum usuário perde visibilidade; exclusão só por admin.
- **Regressões possíveis:** todas as telas de CRUD — por isso é feita isoladamente e validada com duas contas.

As tarefas seguintes serão detalhadas no mesmo formato quando chegarem na fila.

## ⚠️ Riscos de regressão (maiores primeiro)
1. Políticas RLS — afetam todas as telas de uma vez.
2. `AuthContext` / `ProtectedRoute` — quebram o acesso ao sistema inteiro.
3. `verify_jwt` e edge functions — quebram extração de IA e envio de e-mail.
4. Refatoração das páginas grandes — alto acoplamento entre formulário, tabela e filtros.
5. Remoção de tabelas — irreversível; exige confirmação explícita.

## 🧪 Plano de testes
- **Da alteração:** roteiro manual específico descrito em cada tarefa.
- **Regressão (smoke a rodar após cada tarefa):** login → dashboard → Motoristas (listar/criar/editar) → Transportadores → Seguros → Contratos → Conferência → Relatórios (gerar PDF e Excel) → logout.
- **Integração:** com conta admin e conta comum; upload de arquivo e abertura por signed URL; extração de PDF por IA; envio de e-mail de relatório.
- **Automatizados (T9):** unitários de `masks`, `passwordPolicy`, `rateLimiter`, `validationSchemas` e das regras de aptidão; depois teste de componente do formulário de Motoristas.

## ⚠️ Requer validação do requisito
- `DocumentosEmpresa.tsx`: publicar rota + menu e completar edição/exclusão, ou remover componente e tabela? (revalidado: o componente já faz select e insert reais, mas está inacessível; tabela com 0 registros e 0 eventos de auditoria)
- `boletos`, `pronampe`, `pins_confins`: remover as tabelas? (revalidado: zero uso no frontend, zero registros, zero FK — remoção segura)
- ~~`cavalos` e `reboques`~~: revalidado — CRUD completo já existe nas abas da página de Transportadores, com FK, RLS, auditoria e dados reais. **Não é pendência.**

- Envio semanal do relatório: é agendado automaticamente ou apenas manual? Não foi possível determinar pelo código.

## 🚀 Primeiro passo
**T3 — metadados do `index.html`.** É a alteração de menor risco possível (uma seção `<head>`, nenhum impacto em lógica ou banco), corrige algo visível em produção e serve para validar o ciclo entender → alterar → testar → validar antes de tocar em segurança e RLS. Em seguida, T2.
