# T11 — Refatoração de `Transportadores.tsx`

Objetivo: reduzir o tamanho do arquivo sem alterar comportamento, layout, textos, chamadas ao banco, permissões ou rotas.

## A. Diagnóstico atual

**Arquivo:** `src/pages/Transportadores.tsx` — 946 linhas, um único componente `export default`.

**Responsabilidades acumuladas (7):** tipos + schemas Yup, busca de dados, mutações, filtros, três listagens (desktop + mobile), quatro diálogos, cabeçalho com contador.

**Estados (11):** `activeTab`, `search`, `showTranspDialog`, `editingTransp`, `showVinculoDialog`, `vinculoTranspId`, `showCavaloDialog`, `editingCavalo`, `showReboqueDialog`, `editingReboque`, `docsTransp`, `docsTab`.

**Hooks:** `useState`, `useIsMobile`, `useQuery` (5x), `useMutation` (7x), `useQueryClient`, `useToast`.

**Queries → tabelas (fluxo atual, a ser preservado):**

```text
Transportadores.tsx → useQuery(["transportadores"])          → supabase → transportadores
                    → useQuery(["motoristas"])               → supabase → motoristas
                    → useQuery(["transportador_motoristas"]) → supabase → transportador_motoristas (+ join motoristas)
                    → useQuery(["cavalos"])                  → supabase → cavalos (+ join transportadores)
                    → useQuery(["reboques"])                 → supabase → reboques (+ join transportadores)
```

**Mutações (7):** `saveTransp`, `deleteTransp`, `addVinculo`, `removeVinculo`, `saveCavalo`, `deleteCavalo`, `saveReboque`, `deleteReboque`. Todas invalidam a query correspondente e mostram toast.

**Formulários (Formik + Yup):** transportador (13 campos, máscara CPF/CNPJ, 3 checkboxes de documentos), cavalo (transportador + anexo), reboque (transportador + anexo).

**Filtros:** um único `search` compartilhado pelas três abas (`filteredTransp` por razão social/CPF-CNPJ; `filteredCavalos` e `filteredReboques` por razão social do transportador).

**Regras de negócio embutidas:** normalização de strings vazias para `null` no `saveTransp`; badge "Motorista Próprio" quando `motorista_id`; `getAvailableMotoristas` exclui já vinculados; máscara dinâmica CPF vs CNPJ (>11 dígitos).

**Permissões:** a página não usa `useAdmin`; o controle é 100% RLS no banco. **Nada muda.**

**Navegação:** rota única `/transportadores` em `App.tsx`. Cavalos e Reboques **não são rotas** — são `TabsContent` internos controlados pelo estado `activeTab`. Não há links externos para essas abas.

**Componentes externos já usados:** `MainLayout`, `TransportadorAnexos`, `ContratoAnexos`, `FileUpload`, `openSignedFile`, `masks`, shadcn UI.

## B. Componentes recomendados

| Componente | Responsabilidade | Risco |
|---|---|---|
| `types.ts` | tipos `Transportador`, `Cavalo`, `Reboque`, `REGIME_TRIBUTARIO_OPTIONS` e os 3 schemas Yup | Baixo |
| `TransportadoresHeader` | título + contador | Baixo |
| `TransportadoresSearch` | input de busca (valor controlado pelo pai) | Baixo |
| `TransportadoresList` | tabela desktop + cards mobile da aba Transportadores | Médio |
| `CavalosList` | tabela + cards da aba Cavalos | Baixo |
| `ReboquesList` | tabela + cards da aba Reboques | Baixo |
| `TransportadorFormDialog` | diálogo + Formik do transportador | Médio |
| `VeiculoFormDialog` | diálogo + Formik de cavalo **e** reboque (idênticos, só mudam título/folder/label) | Médio |
| `VincularMotoristaDialog` | diálogo de vínculo | Baixo |
| `TransportadorDocsDialog` | diálogo com abas Anexos/Contratos | Baixo |

Não vou extrair hooks de dados nesta tarefa: queries e mutações **permanecem em `Transportadores.tsx`**, para que o fluxo componente → supabase → tabela não mude. Extrair hooks é escopo de T12.

## C. Estrutura proposta

Atual:

```text
src/pages/Transportadores.tsx   (946 linhas, tudo aqui)
```

Proposta:

```text
src/pages/Transportadores.tsx            (~250 linhas: estado, queries, mutações, composição)
src/components/transportador/
├── TransportadorAnexos.tsx              (já existe, intocado)
├── types.ts
├── TransportadoresHeader.tsx
├── TransportadoresSearch.tsx
├── TransportadoresList.tsx
├── CavalosList.tsx
├── ReboquesList.tsx
├── TransportadorFormDialog.tsx
├── VeiculoFormDialog.tsx
├── VincularMotoristaDialog.tsx
└── TransportadorDocsDialog.tsx
```

Motivo: mantém a pasta já usada pelo domínio, sem criar rota nem mover a página.

## D. Dependências por componente

**TransportadoresList** — recebe `items`, `vinculos`, `isMobile`, e callbacks `onEdit`, `onDelete`, `onVincular`, `onRemoveVinculo`, `onVerDocs`, `onVerContratos`. Usa `getMotoristasByTransp` — essa função é pura sobre `vinculos`, será passada como prop ou recebida já resolvida. Risco: **Médio** (é o maior bloco de JSX, com duas variantes de layout).

**CavalosList / ReboquesList** — recebem `items`, `isMobile`, `onEdit`, `onDelete`; usam `openSignedFile` direto (não é chamada de banco de negócio, é helper de storage já isolado). Risco: **Baixo**.

**TransportadorFormDialog** — recebe `open`, `onOpenChange`, `editing`, `onSubmit(values)`. Formik e schema movem juntos; a mutação **fica no pai**. Risco: **Médio** (13 campos + máscara).

**VeiculoFormDialog** — recebe `open`, `onOpenChange`, `editing`, `transportadores`, `folder`, `titulo`, `uploadLabel`, `onSubmit`. Risco: **Médio** (unifica dois diálogos; se preferir risco menor, faço `CavaloFormDialog` e `ReboqueFormDialog` separados).

**VincularMotoristaDialog** — recebe `open`, `onOpenChange`, `transportadorId`, `motoristasDisponiveis`, `onVincular`. Risco: **Baixo**.

**TransportadorDocsDialog** — recebe `transportador`, `tab`, `onTabChange`, `onClose`. Risco: **Baixo**.

**Header / Search** — props triviais. Risco: **Baixo**.

Nenhum componente extraído acessa estado interno da página diretamente: tudo entra por props e sai por callbacks.

## E. Riscos

1. **Cavalos e Reboques**: não há rota, componente ou permissão própria — só `TabsContent`. A refatoração troca o JSX interno da aba por `<CavalosList .../>`; `activeTab`, `Tabs` e `TabsTrigger` continuam em `Transportadores.tsx`. Risco de quebrar navegação: baixo, mas será verificado clicando nas três abas a cada etapa.
2. **Perda de foco no campo de busca** se `TransportadoresSearch` for declarado dentro do componente pai — será um arquivo separado, evitando o problema.
3. **`enableReinitialize` do Formik** depende de `editing` chegar atualizado por prop; validado abrindo edição de dois registros diferentes em sequência.
4. **Unificar cavalo/reboque** num só diálogo é a única mudança estrutural real; se houver qualquer divergência entre eles, mantenho separados.
5. Não há teste automatizado cobrindo esta página — a validação é build + Playwright + inspeção manual.

## F. Ordem de implementação

```text
Etapa 1  types.ts + Header + Search              → build + abrir página
Etapa 2  CavalosList + ReboquesList              → build + abas Cavalos/Reboques
Etapa 3  TransportadoresList                     → build + listar, filtrar, vincular, desvincular
Etapa 4  VincularMotoristaDialog + DocsDialog    → build + abrir os dois diálogos
Etapa 5  TransportadorFormDialog                 → build + criar e editar transportador
Etapa 6  VeiculoFormDialog (cavalo e reboque)    → build + criar e editar cavalo/reboque
Etapa 7  Regressão completa                      → smoke test da página + testes unitários
```

Uma etapa por vez, com verificação antes da próxima.

## G. Plano de testes (a cada etapa)

- Build limpo e sem erros no console.
- Aba Transportadores: listar, buscar por nome e por CPF/CNPJ, badge "Motorista Próprio", criar, editar, excluir.
- Vínculos: vincular motorista, desvincular, verificar que motorista já vinculado não aparece na lista.
- Docs: "Ver docs" abre em Anexos, "Ver contratos" abre em Contratos.
- Abas Cavalos e Reboques: listar, buscar, criar com anexo, abrir anexo, editar, excluir.
- Mobile (viewport estreito): cards renderizam nas três abas.
- `bunx vitest run` verde (20 testes existentes).

## H. Critérios de conclusão

`Transportadores.tsx` abaixo de ~300 linhas; todas as funcionalidades acima operando; nenhuma query/mutação alterada; nenhum texto, layout ou rota alterado; build e testes verdes; console limpo.

## I. Recomendação

**Sim, refatorar agora.** O arquivo é grande mas tem estrutura regular e baixo acoplamento: as três abas são independentes e os diálogos já recebem quase tudo do estado do topo. Cavalos e Reboques não têm rota nem permissão própria, então o risco apontado no backlog não se confirma. A única decisão em aberto é unificar ou não os diálogos de cavalo e reboque — se preferir risco zero, mantenho os dois separados.
