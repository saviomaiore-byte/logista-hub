# T11 — Refatoração de `Seguros.tsx`

Objetivo: dividir o arquivo em componentes menores sem alterar comportamento, layout, textos, rotas, permissões ou chamadas ao banco.

## A. Diagnóstico atual

**Arquivo:** `src/pages/Seguros.tsx` — 1024 linhas, com **três** componentes no mesmo arquivo:

| Componente | Linhas | Papel |
|---|---|---|
| `Seguros` (default) | 95–133 | Casca: `MainLayout`, título e as duas abas principais |
| `SegurosTab` | 136–585 | Aba "Seguros": CRUD completo |
| `ConferenciaTab` | 588–1024 | Aba "Conferência de Apólice" |

Tipos e constantes no topo (38–93): `Seguro`, `Motorista`, `Conferencia`, `ConferenciaItem`, `tiposSeguros`, `initialValues`.

**Estados:**
- `Seguros`: `activeMainTab`.
- `SegurosTab` (4): `open`, `editingSeguro`, `searchTerm`, `formInitialValues`.
- `ConferenciaTab` (7): `openNew`, `selectedConferencia`, `searchTerm`, `newTitulo`, `newPeriodo`, `newArquivoUrl`, `newObs`, `confTab`.

**Hooks:** `useState`, `useIsMobile`, `useToast`, `useQueryClient`, `useQuery` (5x), `useMutation` (6x), `usePdfExtraction`.

**Funções locais:** `resetForm`, `handleEdit`, `handleSubmit`, `formatVigencia`, `getStatusBadge`, `handleExtract`, além dos filtros e contadores derivados.

**Regras de negócio embutidas:**
- Badge de status: `cancelado`/`vencido` explícitos; senão calcula por `vigencia_fim` (vencido, "vence em N dias" quando ≤30, ativo).
- Cards de resumo: total, ativos (>30 dias ou `status = ativo` sem vigência), vencendo em 30 dias, vencidos.
- Busca em Seguros: seguradora, tipo, nome do segurado, número da apólice.
- Conferência: ao criar, gera automaticamente um item para **cada motorista com `status = ativo`**; percentual de cobertura = cobertos/total.
- Observação do item é salva no `onBlur` só quando o valor muda.

**Permissões:** a página não usa `useAdmin`; controle é 100% RLS. Nada muda.

## B. Navegação e Conferência Seguros (verificado)

- `src/App.tsx:67` registra `/conferencia-seguros` → `ConferenciaSeguros` (`src/pages/ConferenciaSeguros.tsx`, 548 linhas) dentro de `ProtectedRoute`. **A rota continua existindo e não será tocada.**
- O item "Conferência Seguros" já foi removido do menu principal; o acesso pelo produto é a aba interna `ConferenciaTab` em `/seguros`.
- Ou seja, existem **duas implementações paralelas** da conferência: a aba dentro de `Seguros.tsx` e a página `ConferenciaSeguros.tsx`. Registro isso como observação — **não unifico nesta tarefa**.

## C. Comunicação com o banco (fluxo atual, preservado)

```text
Seguros.tsx
├── SegurosTab
│   ├── useQuery(["seguros"])        SELECT seguros + join motoristas(nome,cpf), order vigencia_fim
│   ├── useQuery(["motoristas"])     SELECT id,nome,cpf order nome
│   ├── createMutation               INSERT seguros
│   ├── updateMutation               UPDATE seguros WHERE id
│   └── deleteMutation               DELETE seguros WHERE id
└── ConferenciaTab
    ├── useQuery(["conferencia_seguros"])              SELECT, order created_at desc
    ├── useQuery(["conferencia_seguros_itens", id])    SELECT + join motoristas(nome,cpf,status)
    ├── useQuery(["motoristas_ativos"])                SELECT WHERE status = 'ativo'
    ├── createMutation           INSERT conferencia_seguros + INSERT em lote conferencia_seguros_itens
    ├── toggleCobertoMutation    UPDATE conferencia_seguros_itens.coberto
    ├── updateItemObsMutation    UPDATE conferencia_seguros_itens.observacoes
    ├── deleteMutation           DELETE conferencia_seguros
    ├── FileUpload inline        UPDATE conferencia_seguros.arquivo_apolice_url (usa reportDbError)
    └── usePdfExtraction         extração IA → conferencia_seguros_extraidos
```

FKs envolvidas: `seguros.motorista_id → motoristas`, `conferencia_seguros_itens.conferencia_id → conferencia_seguros`, `.motorista_id → motoristas`, `.seguro_id → seguros`.

Tratamento de erros: mutações usam `onError` + toast destrutivo; apenas o `FileUpload` da conferência usa `reportDbError`. **Mantenho exatamente como está** (padronizar é T8b).

Nenhuma RPC é usada nesta página.

**Regra da refatoração:** todas as queries e mutações permanecem nos componentes `SegurosTab` e `ConferenciaTab`; os componentes extraídos recebem dados por props e emitem callbacks.

## D. Componentes recomendados

| Componente | Responsabilidade | Extraído de | Props principais | Banco | Risco |
|---|---|---|---|---|---|
| `seguros/types.ts` | tipos + `tiposSeguros` + `initialValues` + helpers `formatVigencia`, `seguroToFormValues` | 38–93, 246–257, 270–273 | — | não | Baixo |
| `SegurosResumoCards` | 4 cards de contadores | 388–435 | `total`, `ativos`, `vencendo`, `vencidos` | não | Baixo |
| `SegurosSearch` | campo de busca da aba Seguros | 437–445 | `value`, `onChange` | não | Baixo |
| `SeguroStatusBadge` | badge de status por vigência | 275–284 | `seguro` | não | Baixo |
| `SegurosList` | tabela desktop + cards mobile | 447–582 | `items`, `isLoading`, `isMobile`, `onEdit`, `onDelete` | não | Médio |
| `SeguroFormDialog` | diálogo + Formik do seguro | 307–385 | `open`, `onOpenChange`, `editing`, `initialValues`, `motoristas`, `isPending`, `onSubmit` | não | Médio |
| `NovaConferenciaDialog` | diálogo de criação | 751–794 | `open`, `onOpenChange`, campos controlados ou estado local + `onCreate(payload)`, `isPending` | não | Médio |
| `ConferenciasSidebar` | lista lateral de conferências | 799–838 | `items`, `selectedId`, `isLoading`, `onSelect`, `onDelete` | não | Baixo |
| `ConferenciaHeaderCard` | título/período + Ver Apólice + FileUpload | 849–891 | `conferencia`, `onUploadApolice`, `onRemoveApolice` | não (callbacks no pai) | Médio |
| `ConferenciaChecklist` | progresso, busca, tabela/cards do checklist | 905–1004 | `itens`, `isLoading`, `isMobile`, `searchTerm`, `onSearchChange`, `onToggleCoberto`, `onUpdateObs`, `cobertura` | não | Médio |

Não extraio: a casca `Seguros` (já mínima), o `Tabs` interno manual/IA (só orquestra dois filhos) e `ConferenciaComparativo` (já é componente próprio).

## E. Estrutura proposta

```text
src/pages/Seguros.tsx                 (~330 linhas: casca + estado + queries/mutações)
src/components/seguro/
├── types.ts
├── SeguroStatusBadge.tsx
├── SegurosResumoCards.tsx
├── SegurosSearch.tsx
├── SegurosList.tsx
├── SeguroFormDialog.tsx
├── ConferenciasSidebar.tsx
├── NovaConferenciaDialog.tsx
├── ConferenciaHeaderCard.tsx
└── ConferenciaChecklist.tsx
```

Mesma convenção usada em `src/components/transportador/` e `src/components/motorista/`.

## F. Dependências

- **Motoristas**: leitura (`motoristas` e `motoristas_ativos`). A chave de query `["motoristas"]` é compartilhada com outras telas — **não altero chaves de query**.
- **Conferência Seguros**: `ConferenciaComparativo` e `usePdfExtraction` continuam sendo usados pelo mesmo componente; a página `/conferencia-seguros` não importa nada de `Seguros.tsx`, então a refatoração não a afeta.
- **Relatórios / Transportadores / Cavalos / Reboques**: sem dependência com esta página.
- **Compartilhados**: `FileUpload`, `FormField`/`FormSelectWrapper`, `seguroSchema`, `useIsMobile`, `useToast`, `reportDbError` — todos apenas consumidos, nenhum alterado.

Conclusão: nenhuma extração proposta afeta outra funcionalidade.

## G. Riscos

1. **`SeguroFormDialog`** — `enableReinitialize` + `formInitialValues` + `resetForm` do Formik: risco de o formulário não recarregar ao editar dois seguros seguidos. Validar abrindo edições em sequência. **Médio**.
2. **`ConferenciaHeaderCard`** — o `FileUpload` faz update direto no Supabase dentro do JSX; ao extrair, essas duas funções viram callbacks no pai, mantendo o mesmo código. **Médio**.
3. **`ConferenciaChecklist`** — os `Input` de observação são não-controlados (`defaultValue` + `onBlur`); se virarem controlados por engano, perde-se foco/comportamento. Manter idêntico. **Médio**.
4. **Busca duplicada** — `searchTerm` existe nas duas abas com significados diferentes; manter estados separados.
5. Sem testes automatizados cobrindo esta página: validação é build + Playwright + inspeção manual.

## H. Observações registradas (fora do escopo)

- `Seguros` (95–98) declara `toast` e `queryClient` sem usar — código morto.
- Duplicação entre a aba Conferência e a página `/conferencia-seguros`.
- `createMutation`/`updateMutation` repetem o mesmo mapeamento de payload.
- `handleEdit` atribui `vigencia_inicio`/`vigencia_fim` possivelmente `null` a campos de string.

Nenhum desses itens será corrigido nesta refatoração; entram no backlog.

## I. Ordem de execução

```text
Etapa 1  types.ts + SeguroStatusBadge + SegurosResumoCards + SegurosSearch  → build + abrir aba Seguros
Etapa 2  SegurosList                                                        → listar, buscar, editar, excluir, baixar
Etapa 3  SeguroFormDialog                                                   → criar e editar seguro
Etapa 4  ConferenciasSidebar + NovaConferenciaDialog                        → criar, selecionar, excluir conferência
Etapa 5  ConferenciaHeaderCard                                              → anexar/remover/ver apólice
Etapa 6  ConferenciaChecklist                                               → marcar coberto, observação, cobertura
Etapa 7  Regressão completa                                                 → smoke test + testes unitários
```

Uma etapa por vez, com verificação antes da próxima.

## J. Plano de testes (a cada etapa)

- Build limpo e console sem novos erros.
- Aba Seguros: cards de resumo com os mesmos números; busca por seguradora, tipo, segurado e apólice; criar, editar, excluir; baixar apólice; badges de status corretos (ativo, vencendo, vencido, cancelado, sem vigência).
- Aba Conferência: criar conferência (gera itens dos motoristas ativos), selecionar, excluir; anexar/remover/ver apólice PDF; marcar/desmarcar coberto; salvar observação no blur; barra de cobertura; aba "Comparativo Automático" com extração IA.
- Rota direta `/conferencia-seguros` continua abrindo a página antiga.
- Menu lateral sem o item "Conferência Seguros".
- Mobile (viewport estreito): cards nas duas abas.
- `bunx vitest run` verde (20 testes) e páginas Motoristas/Transportadores sem regressão.

## K. Critérios de conclusão

`Seguros.tsx` abaixo de ~350 linhas; todas as funcionalidades acima operando; nenhuma query, mutação ou chave de query alterada; nenhum texto, layout, rota ou permissão alterado; Conferência Seguros intacta nos dois pontos de acesso; build e testes verdes; console limpo.

## L. Recomendação

**Seguro iniciar.** O arquivo já está dividido em três componentes com fronteiras claras e todos os dados descem de `useQuery`, o que torna a extração mecânica. Os pontos de atenção são o Formik do diálogo de seguro, os uploads inline da conferência e os inputs não-controlados do checklist — todos cobertos por etapas isoladas e testes específicos.
