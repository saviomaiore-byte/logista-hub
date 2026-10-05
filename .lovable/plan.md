# Separar motoristas inativos das inaptidões no Dashboard

## Objetivo
Deixar os indicadores iniciais do Dashboard claros: motorista inativo não será misturado com motorista inapto por pendências operacionais ou documentais.

## Alterações
- Ajustar o cálculo dos indicadores do Dashboard para contar separadamente:
  - ativos;
  - inativos;
  - aptos entre os ativos vinculados a transportadoras ativas;
  - inaptos entre os ativos vinculados, conforme as regras atuais do relatório (contrato, adesão, ANTT, certificado, CNH e MOPP);
  - sem vínculo ativo.
- Atualizar somente os textos dos cards de Motoristas para explicar os números sem ambiguidade.
- Manter intactas as regras do Relatório Semanal, o cadastro, o banco, as permissões e os demais cards.
- Adicionar testes para garantir que um motorista inativo não aumente o total de inaptos por pendência.

## Validação
- Executar checagem de tipos e testes relevantes.
- Conferir o resultado no Dashboard autenticado, se a sessão estiver disponível.
