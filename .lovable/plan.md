# Importar Certificados — Etapa 2: gravação segura

## Ponto de partida confirmado

- Conferência atual da planilha: 141 linhas válidas, 54 já existentes, 81 novos, 4 sem transportadora, 2 requerem revisão, 0 duplicidades.
- A diferença anterior (53 x 54) era o certificado de Danilo da Silva Rosa com ano digitado errado, já corrigido. Não há falha na regra de correspondência.
- Todos os 54 certificados cadastrados hoje estão com situação "renovação agendada", porque a regra atual do sistema define a situação automaticamente: com data de renovação preenchida vira "renovação agendada", sem data vira "ativo".
- A autoria do registro já é preenchida automaticamente pelo banco com o usuário logado, então a importação feita pela tela mantém exatamente a mesma regra da criação manual, sem nenhum atalho de permissão.

## Fluxo que será construído no modal

1. Selecionar planilha → preview atual (resumo + tabela + avisos + divergências de regime), sem nenhuma alteração visual.
2. Botão "Prosseguir com importação" no lugar do botão desativado. Só fica ativo quando existe pelo menos um registro novo.
3. Ao clicar: o sistema busca de novo os dados atuais do banco (transportadoras e certificados) e refaz toda a conferência.
4. Tela de confirmação final, com números calculados na hora:
   - registros elegíveis no preview
   - prontos para importar após a revalidação
   - já existentes detectados agora
   - sem transportadora
   - com erro de dados / requer revisão
   - lista das alterações de Regime Tributário que serão feitas (transportadora, valor atual, novo valor)
5. Botões [Cancelar] e [Confirmar importação de XX certificados].
6. Gravação e relatório final.

## Regras da gravação

- Só entram os registros classificados como "Novo - pronto para importação" na revalidação feita no momento da confirmação.
- Correspondência sempre por CNPJ da planilha → transportadora cadastrada → razão social → campo empresa do certificado. Nome da planilha nunca decide.
- CNPJ que passe a corresponder a mais de uma transportadora: não importa, vira "Requer revisão".
- Já existe certificado da mesma transportadora com o mesmo vencimento: não importa, resultado "Ignorado — já existente".
- Mesma transportadora com vencimento diferente: continua elegível, com aviso no relatório.
- Tipo gravado: A1 para todos.
- Renovação → data de renovação agendada; Vencimento → vencimento; Observações → observações (vazio continua sendo gravado como vazio/nulo, igual ao formulário manual).
- Situação do certificado: mantida a regra atual do sistema (com data de renovação → "renovação agendada"; sem data → "ativo"). "OK" e "VENCIDO" da planilha não são situações existentes no sistema e não serão inventadas; qualquer valor diferente de OK/VENCIDO na coluna STATUS marca a linha como "Requer revisão" em vez de ser gravada.
- Regime Tributário: só é atualizado para as transportadoras efetivamente importadas nesta operação e apenas quando o regime da planilha está na lista oficial do sistema. Regime fora da lista (por exemplo "MEI" sem "caminhoneiro") impede a importação daquela linha, que vira "Requer revisão".

## Segurança contra duplicação e falha parcial

- A conferência de duplicidade é refeita contra o banco imediatamente antes de gravar; o resultado do preview nunca é usado sozinho.
- Todos os certificados aprovados são gravados em uma única operação, o que é tratado pelo banco como tudo-ou-nada: ou entram todos, ou nenhum entra.
- As atualizações de regime acontecem depois da gravação dos certificados; se alguma falhar, o relatório informa explicitamente quais transportadoras não tiveram o regime atualizado.
- Botão fica bloqueado durante o processamento e a confirmação é de uso único, então clicar duas vezes não duplica nada. Mesmo que a operação seja repetida, a revalidação detecta os registros já existentes e não insere de novo.
- Se houver qualquer falha, a mensagem nunca será "Importação concluída"; será informado o que falhou e o motivo.

## Relatório final

Resumo com: linhas válidas na planilha, já existentes antes, novos elegíveis inicialmente, importados, ignorados por já existirem, transportadoras não encontradas, registros que requeriam revisão, falhas e alterações de regime. Abaixo, tabela com Empresa, CNPJ, Transportadora, Vencimento, Tipo, Regime e Resultado/Motivo ("Importado", "Ignorado — já existente", "Não importado — transportadora não encontrada", "Não importado — requer revisão", "Falha na importação").

Depois de uma importação bem-sucedida, a lista de Certificados Digitais e os dados de transportadoras são recarregados automaticamente.

## Detalhes técnicos

- `src/lib/importacaoCertificados.ts`: acrescentar validação de regime oficial e de STATUS como critério de bloqueio ("requer revisão"), e uma função pura que monta as linhas a gravar e as atualizações de regime a partir de uma análise. Funções e classificações atuais permanecem.
- `src/hooks/useCertificados.ts`: novo hook `useImportarCertificados` que (1) refaz `select` de `transportadores` e `certificados`, (2) reexecuta `analisarImportacao`, (3) faz um único `insert` em lote de `certificados` (status pela regra atual, `created_by` pelo default `auth.uid()`), (4) atualiza `inscricao_estadual` somente das transportadoras importadas com regime válido divergente, (5) invalida/refetch de `["certificados"]` e `["transportadores","resumo"]`. Erros passam por `reportDbError`, como nos demais hooks.
- `src/components/certificado/ImportarCertificadosDialog.tsx`: estados `preview | confirmacao | processando | resultado`, substituindo apenas o rodapé e acrescentando as telas de confirmação e relatório. Preview atual intacto.
- `src/pages/Certificados.tsx`: sem mudanças além das já existentes (botão e render do modal).
- Sem migration, sem novas colunas, sem alteração de RLS, schema, MCP, Assistente, ou do restante da tela. Auditoria continua sendo a dos triggers existentes.
- Testes novos no Vitest para: elegibilidade após revalidação, bloqueio por regime inválido, bloqueio por status desconhecido, CNPJ ambíguo, mesmo vencimento (ignorado) e vencimento diferente (elegível com aviso). Validação final com typecheck, build e Vitest.
