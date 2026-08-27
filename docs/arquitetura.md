# Arquitetura técnica

## Estrutura de pastas

```text
src/
  components/        UI compartilhada (shadcn em ui/), layout, anexos por entidade
  contexts/          AuthContext (sessão, MFA, logout)
  hooks/             useAdmin, usePdfExtraction, use-toast, use-mobile
  integrations/      cliente do backend (gerado — não editar)
  lib/               regras e utilitários puros
  pages/             uma página por rota
  test/              setup do Vitest e testes unitários
supabase/
  functions/         edge functions (extract-apolice, send-report-email)
  config.toml        gerado — não editar
```

## Camada de dados

Consultas são feitas direto do componente com o cliente do backend. Padrão obrigatório:

```ts
const { data, error } = await supabase.from("motoristas").select("*");
if (reportDbError("carregar motoristas", error, toast.error)) return;
```

`reportDbError` registra no console, traduz erros comuns (RLS, duplicidade, FK, rede) e retorna `true` quando houve falha.

## Tabelas principais

- `motoristas`, `motorista_arquivos`
- `transportadores`, `transportador_motoristas`, `transportador_arquivos`, `cavalos`, `reboques`
- `contratos`, `seguros`, `certificados`, `documentos_empresa`
- `conferencia_seguros`, `conferencia_seguros_itens`, `conferencia_seguros_extraidos`
- `relatorio_config`, `profiles`, `user_roles`, `audit_log`

Padrão de RLS: `SELECT` para autenticados; `INSERT`/`UPDATE` para o criador (`created_by`) ou administrador; `DELETE` apenas para administrador (`has_role(auth.uid(), 'admin')`).

## Edge functions

| Função | JWT | O que faz |
|---|---|---|
| `extract-apolice` | obrigatório | Extrai dados de apólices em PDF usando modelo de visão da IA |
| `send-report-email` | obrigatório | Envia o relatório semanal (PDF + Excel em anexo) via SMTP próprio (`mail.maiore.com.br`, porta 465, TLS direto) |

Segredos usados: `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.

## Relatório semanal

`src/pages/Relatorios.tsx` monta o dataset agrupando motoristas por transportadora, aplica `checkMotoristaAptidao` e gera:

- PDF com `jspdf` + `jspdf-autotable`
- Excel com `xlsx` (uma aba por bloco)
- Pré-visualização de ambos em abas antes do envio

## Testes

`bun run test` roda o Vitest em ambiente `happy-dom` (jsdom foi trocado porque o pacote nativo `canvas` não compila no ambiente). Cobertura atual: `lib/masks`, `lib/passwordPolicy`, `lib/dbError` e as regras de aptidão em `lib/aptidao`.

## Backlog técnico

Ver `.lovable/plan/planejamento-técnico-pactum-logística-2026-08-27.md` (T11–T14: quebra das páginas grandes, hooks de dados/React Query, limpeza de dependências e endurecimento da CSP).
