# Diagnóstico: por que o preview mostrou 53 "já existentes" com 54 certificados

Análise somente de leitura. Nada foi alterado no banco.

## Resposta direta

O certificado que faltava é o de **Danilo da Silva Rosa**.

- Empresa no certificado: DANILO DA SILVA ROSA
- Transportadora encontrada: DANILO DA SILVA ROSA
- CNPJ: 57.598.982/0001-82
- Vencimento na planilha: 03/10/2026
- Empresa na planilha: Danilo da Silva Rosa (mesmo CNPJ)
- Vencimento que estava gravado quando o preview rodou: **03/10/0006** (ano digitado errado)
- Motivo: com o ano errado, a data do cadastro não batia com a data da planilha, então a linha foi contada como "Novo" e não como "Já existente".

Esse registro foi corrigido no sistema hoje às 13:40 (horário de Brasília), poucos minutos antes desta verificação. O histórico de auditoria mostra a alteração de `0006-10-03` para `2026-10-03`.

Conclusão: não há erro na regra de correspondência e não há certificado ausente da planilha. Era apenas um dado com ano digitado errado.

## Conferência dos demais

Refazendo a mesma classificação com os dados atuais:

- Linhas válidas na planilha: 141
- Já existentes: **54** (todos os certificados do sistema têm correspondência inequívoca por CNPJ + vencimento)
- Novos: 81
- Transportadora não encontrada: 4
- Requer revisão: 2 (CNPJ que corresponde a mais de uma transportadora cadastrada)
- Duplicidades dentro da planilha: 0

Soma: 141. Nenhum certificado do sistema ficou sem linha correspondente na planilha.

## Próximo passo sugerido

Basta reabrir o preview de "Importar Certificados" e selecionar a planilha novamente: o resumo passará a mostrar 54 já existentes e 81 novos. Nenhuma alteração de código é necessária para isso.

Se quiser, o passo seguinte seria planejar a Etapa 2 (gravação dos novos), que exigirá antes decidir o Tipo (A1/A3) dos registros novos, já que a planilha não traz essa informação.
