# Importar Certificados — Etapa 1 (somente análise/preview)

Objetivo: permitir selecionar a planilha CSV e ver um **preview de conferência**. Nenhum dado é gravado nesta etapa.

## O que foi confirmado na planilha e no sistema

Planilha enviada (`CONTROLE_GERAL_-_INTERNO_CERTIFICADOS_PJ.csv`):
- Codificação ISO-8859-1, separador `;`, quebras CRLF.
- A **primeira linha é vazia**; o cabeçalho está na **segunda linha**: `elcim;CNPJ;Regime de Tributação;Renovação;Vencimento;STATUS;OBSERVAÇÕES` (a primeira coluna, apesar do rótulo "elcim", contém a Empresa).
- 177 linhas de dados + 36 linhas totalmente vazias no fim (serão ignoradas).
- Status na planilha: 137 "OK", 4 "VENCIDO".
- Regimes na planilha: LUCRO PRESUMIDO (59), MEI CAMINHONEIRO (55), SIMPLES NACIONAL (26), MEI (1).
- Nenhum CNPJ repetido dentro da planilha (a verificação continua no preview mesmo assim).

Sistema hoje:
- 54 certificados cadastrados, todos com tipo "A1"; todos com `empresa` casando com uma razão social existente.
- 140 transportadoras; 2 CNPJs repetidos entre elas (serão marcados como "Requer revisão").
- Os nomes divergem entre planilha e cadastro (ex.: "A.F. Januário Transportes" x "ALEXANDRE FERNANDO JANUÁRIO - A.F TRANSPORTES"), confirmando que a correspondência **deve ser feita pelo CNPJ**.
- O Regime no cadastro usa capitalização diferente da planilha ("Lucro presumido" x "LUCRO PRESUMIDO"), então a comparação será feita ignorando maiúsculas/acentos. "MEI" (sem "caminhoneiro") não existe na lista oficial de regimes e será sinalizado.

## O que será construído

Botão **"Importar Certificados"** na página Certificados Digitais (ao lado de "Novo Certificado Digital"), abrindo um modal:

1. Seleção do arquivo CSV (leitura no navegador, com decodificação ISO-8859-1 e detecção do cabeçalho real).
2. Cartões de resumo: total de linhas, já existentes, novos, transportadora não encontrada, requer revisão, possíveis duplicidades na planilha.
3. Tabela detalhada com: Empresa (planilha), CNPJ, Transportadora encontrada, Regime da planilha, Regime cadastrado, Renovação, Vencimento, Status, Classificação e Motivo.
4. Divergência de regime destacada com "Regime diferente — requer atualização".
5. Botão de importação presente porém **desabilitado**, com o texto "Importação será implementada na próxima etapa".

## Regras de classificação

- **Transportadora não encontrada** — CNPJ da planilha não bate com nenhum `cpf_cnpj` (comparação só por números).
- **Requer revisão** — CNPJ ausente/inválido, data de vencimento ausente ou inválida, CNPJ correspondendo a mais de uma transportadora, regime fora da lista oficial, ou CNPJ repetido na planilha ("Possível duplicidade na planilha").
- **Já existente** — existe certificado cuja `empresa` é igual à razão social encontrada **e** o vencimento é o mesmo. Também sinaliza, como aviso, quando existe certificado para a mesma transportadora com vencimento diferente.
- **Novo - pronto para importação** — transportadora encontrada e nenhum certificado correspondente.
- Todas as linhas novas mostram **"Tipo não informado"**, já que a planilha não traz A1/A3.

## Detalhes técnicos

- Novo componente `src/components/certificado/ImportarCertificadosDialog.tsx` e utilitário puro `src/lib/importacaoCertificados.ts` (parse do CSV + classificação), com testes unitários no Vitest.
- Reutiliza `useCertificados()` e `useTransportadorasResumo()` — nenhuma nova consulta, hook, tabela ou coluna.
- Datas convertidas de `dd/MM/yyyy` para `YYYY-MM-DD` por manipulação de string, sem `new Date`, preservando a regra atual de timezone; exibição via `formatDateOnly`.
- Somente leitura: nenhum INSERT/UPDATE/DELETE, nenhuma migration, nenhuma alteração de RLS, schema, MCP ou Assistente.
- A tela atual de Certificados (filtros, ordenação, busca, destaque de vencidos, CRUD) permanece intacta.
- Validação final: typecheck, build e Vitest.
