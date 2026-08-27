# T11 — Refatoração de `Motoristas.tsx`

Objetivo: reduzir o tamanho do arquivo sem alterar comportamento, layout, textos, chamadas ao banco, permissões ou rotas.

## A. Diagnóstico atual

**Arquivo:** `src/pages/Motoristas.tsx` — 946 linhas, um único componente `export default`.

**Responsabilidades (7):** tipos + `initialValues`, busca de dados, persistência, filtros, listagem (tabela desktop + cards mobile), três diálogos (Cadastrar, Documentos, Editar), cabeçalho com contador e rodapé "Mostrando X de Y".

**Estados (11):** `motoristas`, `transportadoras`, `motoristaTransportadoras`, `loading`, `searchTerm`, `showFilters`, `statusFilter`, `transportadoraFilter`, `open`, `docsMotorista`, `editMotorista`, `selectedTransportadoras`.

**Hooks:** `useState` (12), `useEffect` (1, carga inicial), `useIsMobile`. Não usa React Query (diferente de Transportadores) — é `useState` + `fetch` manual.

**Funções:** `fetchMotoristas`, `fetchTransportadoras`, `fetchMotoristaTransportadoraLinks`, `syncTransportadoraLinks`, `handleSubmit` (criar), `handleDelete`, `getStatusBadge`, `filteredMotoristas` (derivado), e o `onSubmit` inline do diálogo de edição.

**Formulários:** dois Formik quase idênticos (criar e editar), ambos com `motoristaSchema` de `src/lib/validationSchemas.ts`; 21 campos + seletor múltiplo de transportadoras + bloco Documentos (CNH, MOPP, MOPP vitalício).

**Filtros:** `searchTerm` (nome ou CPF), `statusFilter`, `transportadoraFilter`, painel colapsável `showFilters` e botão "Limpar filtros". Sem ordenação na UI (ordem vem do banco por `nome`) e sem paginação.

**Regras de negócio embutidas:** strings vazias viram `null` no salvar; `mopp_vencimento` é forçado a `null` quando `mopp_vitalicio`; erro `23505` vira "CPF já cadastrado"; `confirm()` antes de excluir; badge de status com três variantes; no diálogo de Documentos, ANTT/Alvará/Certificado são exibidos como "Sim/Não".

**Permissões:** a página não usa `useAdmin` — controle é 100% RLS. **Nada muda.**

**Navegação:** rota única `/motoristas` em `App.tsx` e item no `Sidebar`. Sem subrotas.

**Componentes externos já usados:** `MainLayout`, `MotoristaAnexos`, `ContratoAnexos`, `FormField`, `FormSelectWrapper`, shadcn UI, `reportDbError`.

## B. Banco de dados (fluxo atual, a ser preservado)

```text
Motoristas.tsx → fetchMotoristas()                    → supabase → SELECT motoristas (order nome)
                → fetchTransportadoras()               → supabase → SELECT transportadores (id, razao_social, cpf_cnpj)
                → fetchMotoristaTransportadoraLinks()  → supabase → SELECT transportador_motoristas
                → handleSubmit()                       → supabase → INSERT motoristas
                → onSubmit (edição)                    → supabase → UPDATE motoristas WHERE id
                → handleDelete()                       → supabase → DELETE motoristas WHERE id
                → syncTransportadoraLinks()            → supabase → SELECT/DELETE/INSERT transportador_motoristas
```

FKs relevantes: `transportador_motoristas.motorista_id → motoristas.id` e `→ transportadores.id`. Sem RPCs nesta página. Nenhuma dessas chamadas será movida ou alterada: **todas permanecem em `Motoristas.tsx`**.

## C. Dependências externas

`Motoristas.tsx` é referenciado apenas por `src/App.tsx` (rota) e pelo link do `Sidebar`. Nenhum outro arquivo importa a página, e ela não exporta nada além do componente default. Os tipos `Motorista`/`Transportadora` são locais e não usados fora. Relatórios, Seguros, Contratos e Transportadores leem as tabelas diretamente, sem passar por esta página — extrair componentes daqui não afeta esses módulos.

## D. Componentes recomendados

| Componente | Responsabilidade | Props principais | Risco |
|---|---|---|---|
| `motorista/types.ts` | tipos `Motorista`, `Transportadora`, `initialValues`, `MotoristaFormValues` | — | Baixo |
| `MotoristasHeader` | título + contador + botão "Novo Motorista" (dispara `onNovo`) | `total`, `onNovo` | Baixo |
| `MotoristasFilters` | busca, botão Filtros, painel com status/transportadora/limpar | valores + setters, `transportadoras` | Baixo |
| `TransportadorasSelector` | select + badges removíveis das transportadoras vinculadas (usado nos 2 formulários) | `transportadoras`, `selected`, `onChange` | Baixo |
| `MotoristaForm` | corpo Formik compartilhado por criar e editar (campos + Documentos + botão) | `initialValues`, `submitLabel`, `onSubmit`, selector via children/props | Médio |
| `MotoristaFormDialog` | Dialog de criar **e** editar reutilizando `MotoristaForm` | `open`, `onOpenChange`, `editing`, `onSubmit` | Médio |
| `MotoristasList` | tabela desktop + cards mobile + estados de loading/vazio | `items`, `isMobile`, `loading`, `vinculos`, `transportadoras`, callbacks `onEdit`/`onDocs`/`onDelete` | Médio |
| `MotoristaDocsDialog` | diálogo com abas Dados/Anexos/Contratos | `motorista`, `onClose` | Baixo |

Os dois formulários hoje são quase idênticos — as únicas diferenças são o título, o rótulo do botão, os `initialValues` e o `id` do checkbox MOPP. Unificar em `MotoristaForm` elimina ~200 linhas duplicadas. Se preferir risco zero, mantenho `MotoristaCreateDialog` e `MotoristaEditDialog` separados usando o mesmo `MotoristaForm`.

Não vou extrair hooks de dados nesta tarefa: fetches e mutações **permanecem na página**, para o fluxo componente → supabase → tabela não mudar.

## E. Estrutura proposta

Atual:

```text
src/pages/Motoristas.tsx   (946 linhas, tudo aqui)
```

Proposta (mesmo padrão adotado em Transportadores, sem mover a página nem criar rota):

```text
src/pages/Motoristas.tsx                 (~280 linhas: estado, fetches, mutações, composição)
src/components/motorista/
├── MotoristaAnexos.tsx                  (já existe, intocado)
├── types.ts
├── MotoristasHeader.tsx
├── MotoristasFilters.tsx
├── MotoristasList.tsx
├── TransportadorasSelector.tsx
├── MotoristaForm.tsx
├── MotoristaFormDialog.tsx
└── MotoristaDocsDialog.tsx
```

## F. Riscos

1. **Unificar criar/editar** é a única mudança estrutural real; validar criando um motorista e editando dois registros em sequência (`enableReinitialize`).
2. **Perda de foco na busca** se o campo de filtros for declarado dentro do pai — será arquivo separado.
3. `selectedTransportadoras` é estado do pai e é lido/escrito pelos dois formulários; continua no pai e desce por props para não mudar o fluxo de vínculos.
4. `getStatusBadge` acompanha `MotoristasList`; nenhum outro arquivo o usa.
5. Sem testes automatizados cobrindo esta página — validação é build + Playwright + inspeção manual.

## G. Ordem de implementação

```text
Etapa 1  types.ts + MotoristasHeader              → build + abrir página
Etapa 2  MotoristasFilters                        → build + buscar e filtrar
Etapa 3  MotoristasList                           → build + listar desktop/mobile, ações
Etapa 4  MotoristaDocsDialog                      → build + abrir as 3 abas
Etapa 5  TransportadorasSelector                  → build + vincular/desvincular
Etapa 6  MotoristaForm + MotoristaFormDialog      → build + criar e editar
Etapa 7  Regressão completa                       → smoke test + testes unitários
```

Uma etapa por vez, com verificação antes da próxima.

## H. Plano de testes (a cada etapa)

- Build limpo e console sem erros.
- Listar, buscar por nome e por CPF, filtrar por status e por transportadora, limpar filtros.
- Criar motorista (incluindo erro de CPF duplicado), editar, excluir com confirmação.
- MOPP vitalício desabilita e zera o vencimento.
- Vincular e desvincular transportadoras nos dois formulários; badges na listagem.
- Documentos: abas Dados, Anexos e Contratos.
- Mobile (viewport estreito): cards e menu de ações.
- `bunx vitest run` verde (20 testes existentes).

## I. Critérios de conclusão

`Motoristas.tsx` abaixo de ~300 linhas; todas as funcionalidades acima operando; nenhuma query/mutação alterada; nenhum texto, layout ou rota alterado; build e testes verdes; console limpo.

## J. Recomendação

**Sim, é seguro iniciar.** A página tem baixo acoplamento externo (só rota e menu), nenhuma permissão própria e boa parte do volume é duplicação entre os formulários de criar e editar. A única decisão em aberto é unificar ou não esses dois formulários.
