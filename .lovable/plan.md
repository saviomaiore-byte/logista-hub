# T11 — Planejamento da refatoração de Relatorios.tsx

Refatoração exclusivamente estrutural. Sem novas funcionalidades, sem mudança de layout, regra de negócio, banco, queries, permissões ou rotas.

## A. Diagnóstico atual

`src/pages/Relatorios.tsx` — 976 linhas, um único componente `Relatorios()`.

Responsabilidades acumuladas:

1. Tipos locais `TransportadorComMotoristas` e `MotoristaRelatorio` + constantes `SITUACAO_LABELS`, `SITUACAO_ICONS`, `DIAS_SEMANA`.
2. Carregamento de dados (`fetchDados`) e da configuração de envio (`fetchConfig`).
3. Cálculo do resumo (`useMemo`) e helpers `formatDate` / `docStatus`.
4. Geração de PDF (`buildPdfDoc`, ~90 linhas com jsPDF + autoTable) e de Excel (`buildExcelWorkbook`, ~38 linhas com XLSX).
5. Download (`gerarPDF`, `gerarExcel`), pré-visualização (`gerarPreviewPDF` com blob URL, `gerarPreviewExcel` com `sheet_to_json`) e base64 para envio (`getPdfBase64`, `getExcelBase64`).
6. Destinatários (`addDestinatario`, `removeDestinatario`, validação por regex) e `saveConfig`.
7. Envio via edge function (`enviarRelatorio`).
8. JSX: cabeçalho com 4 ações, 6 cards de resumo, e 4 abas — Dados, Pré-visualizar PDF, Pré-visualizar Excel, Configurações.

Estados (13): `loading`, `sending`, `dados`, `activeTab`, `pdfPreviewUrl`, `excelPreviewData`, `activeExcelSheet`, `destinatarios`, `novoEmail`, `assunto`, `corpo`, `diaEnvio`, `horarioEnvio`, `envioAutomatico`, `configId`.

Hooks: `useState`, `useEffect` (carga inicial + revoke do blob URL), `useMemo`, `useToast`, `useAuth`.

Não existem: filtros, ordenação, paginação, gráficos ou modais. Não há react-query nesta página (fetch manual com `useState`).

Observações registradas (não corrigir agora):
- `useAuth`/`user` é importado e não utilizado.
- Vários casts `(data as any)` em `relatorio_config`.
- Lógica de "email digitado e não adicionado" está duplicada em `saveConfig` e `enviarRelatorio`.
- `SITUACAO_ICONS` é declarado mas parece só usado na aba Dados.

## B. Componentes recomendados

Pasta nova: `src/components/relatorio/`.

**1. `types.ts`** — Risco: Baixo
Responsabilidade: tipos e constantes compartilhadas. Extrai `TransportadorComMotoristas`, `MotoristaRelatorio`, `SITUACAO_LABELS`, `SITUACAO_ICONS`, `DIAS_SEMANA` e os helpers puros `formatDate` e `docStatus`. Sem estado, sem props, sem banco.

**2. `RelatoriosHeader.tsx`** — Risco: Baixo
Responsabilidade: título + botões Atualizar / Excel / PDF / Enviar.
Props: `loading`, `sending`, `sendDisabled`, `onRefresh`, `onExcel`, `onPdf`, `onEnviar`. Sem banco.

**3. `RelatorioResumoCards.tsx`** — Risco: Baixo
Responsabilidade: os 6 cards (Transportadoras, Motoristas, Aptos, Inaptos, Em Praça, Em Viagem).
Props: `resumo`. O `useMemo` permanece na página. Sem banco.

**4. `RelatorioDadosTab.tsx`** — Risco: Baixo/Médio
Responsabilidade: aba "Dados" — loading, estado vazio, card por transportadora e tabela de motoristas com badges de aptidão/situação/contrato/motivos.
Props: `dados`, `loading`. Usa `SITUACAO_LABELS`/`SITUACAO_ICONS` de `types.ts`. Sem banco.

**5. `relatorioPdf.ts`** (módulo, não componente) — Risco: Médio
Responsabilidade: `buildPdfDoc(dados, resumo)` retornando `jsPDF`. Move jsPDF/autoTable para fora da página. Nenhuma alteração de conteúdo, fontes, colunas ou ordem.

**6. `relatorioExcel.ts`** (módulo) — Risco: Médio
Responsabilidade: `buildExcelWorkbook(dados, resumo)` retornando `XLSX.WorkBook`. Mesmas abas, colunas e ordem.

**7. `PdfPreviewTab.tsx`** — Risco: Médio
Responsabilidade: aba de pré-visualização PDF (iframe com `pdfPreviewUrl`, botões de regenerar/baixar).
Props: `pdfPreviewUrl`, `onRegenerar`, `onDownload`. O ciclo de vida do blob URL (criação e `revokeObjectURL`) permanece na página.

**8. `ExcelPreviewTab.tsx`** — Risco: Médio
Responsabilidade: aba de pré-visualização Excel (seletor de planilha, tabela renderizada a partir de `sheet_to_json`).
Props: `excelPreviewData`, `activeExcelSheet`, `onSelectSheet`, `onRegenerar`, `onDownload`.

**9. `ConfiguracoesTab.tsx`** — Risco: Médio
Responsabilidade: aba Configurações — destinatários (chips + input + add/remove), assunto, corpo, dia, horário, switch de envio automático e botão Salvar.
Props: os estados de config e seus setters + `onAdd`, `onRemove`, `onSave`. `saveConfig` permanece na página.

Não serão criados componentes artificiais: cabeçalho de aba, badges isolados e blocos de 5 linhas continuam inline.

## C. Estrutura de pastas

Atual:
```text
src/pages/Relatorios.tsx   (976 linhas — tudo)
```

Proposta:
```text
src/pages/Relatorios.tsx            (~300 linhas: estados, fetch, mutations, orquestração)
src/components/relatorio/
├── types.ts
├── relatorioPdf.ts
├── relatorioExcel.ts
├── RelatoriosHeader.tsx
├── RelatorioResumoCards.tsx
├── RelatorioDadosTab.tsx
├── PdfPreviewTab.tsx
├── ExcelPreviewTab.tsx
└── ConfiguracoesTab.tsx
```

## D. Dependências

Fluxo de banco/API atual (deve ser preservado integralmente, todo ele na página):

```text
Relatorios.tsx
├── fetchConfig  → SELECT relatorio_config (limit 1, maybeSingle) → reportDbError
├── saveConfig   → UPDATE relatorio_config (por id) | INSERT relatorio_config → reportDbError
├── fetchDados   → SELECT transportadores (status = ativo)
│                → SELECT transportador_motoristas
│                → SELECT motoristas
│                → SELECT contratos (status = assinado)
│                → checkMotoristaAptidao(m, temContrato, t)  [src/lib/aptidao.ts]
│                → reportDbError no primeiro erro
└── enviarRelatorio → supabase.functions.invoke("send-report-email", { destinatarios, assunto, corpo, dados, anexos[pdf, xlsx base64] })
```

Sem INSERT/UPDATE/DELETE fora de `relatorio_config`. Sem RPC. Sem react-query, portanto sem invalidação de cache. Sem agregação no banco — todo cálculo é em memória.

A página depende de dados de Transportadores, Motoristas, Contratos e do vínculo transportador↔motorista, mas não importa código desses módulos. Depende de `MainLayout`, UI shadcn, `checkMotoristaAptidao`, `reportDbError`, `useToast`.

Nenhum outro módulo importa `Relatorios.tsx` — apenas a rota `/relatorios` em `App.tsx`. Risco de regressão externa: praticamente nulo.

## E. Riscos

- **Alto**: `buildPdfDoc` e `buildExcelWorkbook` — geram o arquivo enviado por e-mail. Qualquer troca de ordem de colunas ou de dados muda o entregável. Devem ser movidos por cópia literal, recebendo `dados` e `resumo` por parâmetro.
- **Médio**: `pdfPreviewUrl` (blob URL) — o `revokeObjectURL` no unmount e na regeneração precisa continuar na página, senão vaza memória ou o iframe quebra.
- **Médio**: `enviarRelatorio` reaproveita `getPdfBase64`/`getExcelBase64`; se os builders forem movidos, o payload da edge function precisa ficar byte a byte igual.
- **Baixo**: header, cards e aba Dados são puramente apresentacionais.

## F. Ordem de execução

- **Etapa 1** — `types.ts` + `RelatoriosHeader` + `RelatorioResumoCards` (baixo risco, valida o padrão).
- **Etapa 2** — `RelatorioDadosTab` (maior bloco visual, sem banco).
- **Etapa 3** — `relatorioPdf.ts` e `relatorioExcel.ts` (geradores; comparar PDF/Excel antes e depois).
- **Etapa 4** — `PdfPreviewTab` e `ExcelPreviewTab`.
- **Etapa 5** — `ConfiguracoesTab`.
- **Etapa 6** — Regressão completa (mesmo formato da Etapa 7 de Seguros).

Uma etapa por vez, com validação e aprovação entre elas.

## G. Plano de testes por etapa

Em todas: build, typecheck (`tsgo`), `vitest run` (20 testes atuais) e console sem erros novos.

- Etapa 1: os 6 cards com os mesmos números; os 4 botões funcionando (Atualizar recarrega, Excel/PDF baixam, Enviar respeita o `disabled`).
- Etapa 2: mesma quantidade de transportadoras e motoristas; badges de aptidão, situação, contrato e motivos idênticos; estados de loading e vazio.
- Etapa 3: baixar PDF e Excel antes e depois e comparar número de páginas/abas, cabeçalhos, colunas e totais.
- Etapa 4: abrir cada aba de pré-visualização, regenerar, trocar de planilha no Excel, baixar a partir da aba, e trocar de aba várias vezes verificando o blob URL.
- Etapa 5: adicionar/remover destinatário, e-mail inválido, e-mail duplicado, salvar configurações e recarregar a página conferindo a persistência em `relatorio_config`.
- Etapa 6: fluxo completo Atualizar → Dados → PDF → Excel → Configurações → Enviar, mais checagem de que Motoristas, Transportadores e Seguros seguem intactos.

O envio real de e-mail será testado no máximo uma vez, na Etapa 6, com um destinatário definido por você.

## H. Critérios de conclusão

Página em torno de 300 linhas com responsabilidades separadas; relatórios, filtros de aba, exportações, downloads, pré-visualizações, configurações e envio idênticos; queries e payloads preservados; build, typecheck e testes OK; console sem erros novos; nenhuma regressão.

## I. Recomendação

Seguro iniciar. A página é autocontida, não é importada por nenhum outro módulo e não usa react-query, o que elimina riscos de cache. O único ponto realmente delicado são os geradores de PDF/Excel, isolados na Etapa 3 justamente para poderem ser validados por comparação de arquivos.
