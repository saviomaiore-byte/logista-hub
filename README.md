# Pactum Logística — Gestão de Motoristas e Transportadores

Aplicação interna para cadastro e conferência documental de motoristas e transportadores, controle de contratos, seguros e certificados, e geração/envio do relatório semanal de aptidão.

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui (paleta navy)
- Formik + Yup (formulários) e React Query (parte das consultas)
- Backend gerenciado (Postgres + Auth + Storage + Edge Functions)
- Vitest + Testing Library (happy-dom)

## Como rodar

```bash
bun install
bun run dev        # http://localhost:8080
bun run test       # testes unitários
bun run build      # build de produção
```

As variáveis do backend (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`) são geradas automaticamente no `.env` — não edite manualmente.

## Módulos

| Módulo | Rota | Descrição |
|---|---|---|
| Dashboard | `/` | Indicadores e alertas de vencimento |
| Motoristas | `/motoristas` | CRUD, CNH/MOPP, anexos, vínculo com transportadoras |
| Transportadores | `/transportadores` | CRUD, ANTT/Alvará/Certificado, situação operacional, cavalos e reboques |
| Contratos | `/contratos` | Cadastro, modelo e anexos |
| Seguros | `/seguros` | Apólices + conferência (extração de PDF por IA) |
| Conferência Seguros | `/conferencia-seguros` | Mesma tela, acesso direto |
| Conferência | `/conferencia` | Comparativo de vencimentos |
| Certificados | `/certificados` | Certificados por empresa |
| Relatórios | `/relatorios` | Relatório semanal em PDF e Excel + envio por e-mail |
| Usuários / Segurança | `/usuarios`, `/seguranca` | Somente administradores |

`Documentos de Empresa` existe em `/documentos-empresa`, sem item de menu (decisão de produto).

## Regras de negócio principais

- **Aptidão do motorista** (`src/lib/aptidao.ts`): inapto se não houver contrato assinado, se a transportadora não tiver ANTT/Alvará/Certificado, se a CNH estiver vencida, se o MOPP estiver vencido (salvo vitalício) ou se o motorista estiver inativo.
- **Situação operacional** (`em praça apto`, `em viagem apto`, `inapto`) pertence à **transportadora**.
- CPF/CNPJ são únicos e usam máscara de entrada.

## Segurança

- Autenticação por e-mail restrita ao domínio `@maiore.com.br`, com política de senha forte, bloqueio após 5 tentativas e MFA (TOTP).
- RBAC via tabela `user_roles` e função `has_role()`; leitura liberada a autenticados, escrita ao autor ou administrador, exclusão somente para administradores.
- Todas as tabelas de negócio têm RLS ativa e trigger de auditoria gravando em `audit_log`.
- Arquivos ficam em bucket privado, sempre acessados por URL assinada.
- Edge functions exigem JWT válido.

## Convenções

- Erros de banco passam por `reportDbError` (`src/lib/dbError.ts`) — nunca ignore o campo `error` de uma chamada ao banco.
- Campos opcionais vazios devem ser enviados como `null`.
- Cores e estilos vêm dos tokens do design system; não use classes de cor fixas.

Documentação técnica detalhada em [`docs/arquitetura.md`](docs/arquitetura.md).
