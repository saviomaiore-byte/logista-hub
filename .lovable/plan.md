# Revalidação de T7, T5 e T6 (somente investigação)

Nenhum arquivo de código foi alterado. Tudo abaixo foi confirmado lendo o código e consultando o banco.

## T7 — Cavalos e Reboques

Você está certo: a classificação anterior estava **errada**.

- **Onde está a navegação:** dentro de `src/pages/Transportadores.tsx` (rota `/transportadores`), em abas `Tabs`: "Transportadores", "Cavalos" e "Reboques" (linhas 332-336). Não são rotas separadas, por isso a análise anterior não as encontrou.
- **Tela carregada:** a própria página `Transportadores.tsx`; cada aba tem sua listagem (tabela no desktop, cards no mobile) e diálogos próprios `showCavaloDialog` / `showReboqueDialog`.
- **Funcionalidades existentes:** listar, buscar/filtrar (`filteredCavalos`, `filteredReboques`), criar, editar, excluir (com `confirm`) e anexar arquivo (`arquivo_url`).
- **Persistência:** React Query + Supabase.
  - Leitura: `supabase.from("cavalos").select("*, transportadores(razao_social)")` (l.149) e o equivalente para `reboques` (l.158).
  - Gravação: `saveCavalo` (insert/update, l.230-249), `deleteCavalo` (l.254-261), `saveReboque` (l.265-284), `deleteReboque` (l.289-296). Validação com `cavaloSchema` / `reboqueSchema` (l.89-98).
- **Tabelas:** `public.cavalos` e `public.reboques`, ambas com FK `transportador_id -> transportadores.id`, RLS ativa (leitura para autenticados, escrita para autor/admin, exclusão só admin), triggers de `updated_at` e de auditoria.
- **Dados reais:** `cavalos` = 10 registros, `reboques` = 1 registro. O `audit_log` tem 18 eventos de `cavalos`, ou seja, houve gravação real pela aplicação.

**Status real: ✅ Existe e está funcionando.** T7 sai do backlog como "implementar"; nada deve ser criado.

Observações menores (não são bugs de funcionalidade, ficam como itens separados e opcionais):
- Exclusão usa `window.confirm` em vez do diálogo de confirmação do design system usado em outras telas.
- As queries de `cavalos`/`reboques` não têm tratamento de erro visível ao usuário (cai no item T8, tratamento de erro padronizado).
- Sem contador de registros no cabeçalho das abas, diferente do padrão adotado em Motoristas/Transportadores.

## T5 — DocumentosEmpresa

Rastreamento campo → banco (`src/pages/DocumentosEmpresa.tsx`):

| Campo | Formulário | Estado | Função salvar | Chamada Supabase | Tabela | Situação |
|---|---|---|---|---|---|---|
| empresa | Formik `FormField` | `initialValues` | `handleSubmit` | `insert` | `documentos_empresa.empresa` | 🟡 |
| tipo | `FormSelectWrapper` + Select | `values.tipo` | `handleSubmit` | `insert` | `.tipo` | 🟡 |
| descricao | `FormField` | sim | `handleSubmit` | `insert` | `.descricao` | 🟡 |
| vencimento | `FormField` date | sim | `handleSubmit` | `insert` | `.vencimento` | 🟡 |
| status | fixo `"valido"` | — | `handleSubmit` | `insert` | `.status` | 🟡 |
| arquivo_url | ❌ não existe no formulário | — | — | — | coluna existe | ❌ |

Operações:
- **Leitura:** ✅ `fetchDocumentos()` faz `select("*")` ordenado por `created_at`.
- **Criação:** ✅ existe no código (`insert`), com validação `documentoEmpresaSchema`.
- **Edição:** ❌ não existe (nenhum update).
- **Exclusão:** ❌ não existe (nenhum delete). O botão "Enviar" da tabela não tem `onClick` — é decorativo.
- **Banco:** tabela `documentos_empresa` existe, com RLS, `created_by`, trigger de auditoria e coluna `arquivo_url`.

Ponto decisivo: **o componente não está acessível.** `src/App.tsx` não importa nem registra rota para `DocumentosEmpresa`, e o `Sidebar.tsx` não tem item apontando para ele. `documentoEmpresaSchema` só é usado por esse arquivo órfão. A tabela tem **0 registros** e **0 eventos no audit_log** — nunca houve gravação.

**Status real: 🟡 Existe e persiste dados no código, mas está morto em runtime (sem rota, sem menu, sem dados).** Não é "sem persistência"; é "persistência inalcançável".

## T6 — Tabelas fora de escopo

| Tabela | Existe na interface? | É consultada? | INSERT | UPDATE | DELETE | Relacionamento/FK | Registros | Audit | Situação |
|---|---|---|---|---|---|---|---|---|---|
| documentos_empresa | Componente existe, sem rota/menu | Sim (no componente órfão) | Sim (no componente órfão) | Não | Não | Nenhuma FK | 0 | 0 | Código órfão |
| boletos | Não | Não | Não | Não | Não | Nenhuma FK | 0 | 0 | Sem uso |
| pronampe | Não (só `pronampeSchema` em `validationSchemas.ts`, não importado por nenhuma tela) | Não | Não | Não | Não | Nenhuma FK | 0 | 0 | Sem uso |
| pins_confins | Não | Não | Não | Não | Não | Nenhuma FK | 0 | 0 | Sem uso |
| cavalos | Sim (aba em Transportadores) | Sim | Sim | Sim | Sim | FK → transportadores | 10 | 18 | Em uso — **não é fora de escopo** |
| reboques | Sim (aba em Transportadores) | Sim | Sim | Sim | Sim | FK → transportadores | 1 | 0 | Em uso — **não é fora de escopo** |

As quatro primeiras têm RLS, `created_by` e trigger de auditoria, mas nenhuma delas é referenciada por outra tabela, função, RPC ou edge function.

## 🚨 Possíveis riscos

- **Remover `cavalos`/`reboques`:** quebraria a página de Transportadores por completo (queries e mutations diretas) e destruiria 11 registros reais. Não fazer.
- **Remover `documentos_empresa`:** quebra a compilação de `DocumentosEmpresa.tsx` enquanto o arquivo existir. A ordem segura é decidir o destino do componente antes de tocar na tabela.
- **Remover `boletos`/`pronampe`/`pins_confins`:** sem impacto de código hoje; o risco é apenas irreversibilidade. `pronampeSchema` continuaria compilando (é só um schema Yup isolado), mas convém removê-lo junto.
- **Qualquer remoção de tabela** apaga também as respectivas linhas de `audit_log`? Não — o `audit_log` guarda o nome da tabela como texto, então o histórico permanece; hoje não há histórico dessas quatro de qualquer forma.
- **Risco de classificação:** confirmado que nenhum formulário ativo do sistema grava nessas quatro tabelas.

## 📌 Conclusão

- **T7 — remover do backlog.** Já está implementada, funcional e com dados reais. Correção do plano anterior. Ficam, no máximo, três melhorias menores listadas acima (confirmação padronizada, tratamento de erro, contador).
- **T5 — permanece no backlog, como decisão de produto, não como implementação.** O código está pronto e conectado ao banco, mas inacessível e incompleto (sem editar/excluir, botão "Enviar" inerte, sem upload). Duas saídas: (a) publicar a rota + menu e completar edição/exclusão, ou (b) remover o componente e a tabela. Só você pode decidir se "Documentos de Empresa" faz parte do escopo da Pactum.
- **T6 — `boletos`, `pronampe` e `pins_confins` confirmadamente fora de escopo** (zero uso, zero dados, zero relacionamentos) e podem ser removidas com segurança quando você autorizar. `documentos_empresa` fica atrelada à decisão de T5. `cavalos` e `reboques` saem definitivamente da lista de "fora de escopo".

## Próximo passo proposto

Nenhuma alteração até sua decisão sobre T5. Assim que responder, eu: (1) atualizo o planejamento técnico marcando T7 como concluída e reescrevendo T6; (2) executo a saída escolhida para T5 em uma migração isolada e testável.
