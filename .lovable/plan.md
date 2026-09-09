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
- Certificados e alterações de Regime Tributário são gravados em **uma única transação no banco**: ou tudo é gravado, ou nada é. Detalhes abaixo.
- Botão fica bloqueado durante o processamento e a confirmação é de uso único, então clicar duas vezes não duplica nada. Mesmo que a operação seja repetida, a revalidação detecta os registros já existentes e não insere de novo.
- A mensagem "Importação concluída" só aparece depois que o banco confirma a gravação completa. Qualquer falha resulta em "Importação não realizada" com o motivo, e nada terá sido alterado.

## Estratégia transacional (ajuste solicitado)

1. **Onde a transação roda:** dentro do banco, em uma função de importação criada por migration. O navegador não consegue abrir uma transação com várias operações; por isso a operação inteira (todos os certificados + todos os regimes) é enviada em uma única chamada autenticada, e o banco executa tudo dentro da mesma transação. Toda função no Postgres roda em uma transação: se qualquer passo levantar erro, tudo é desfeito automaticamente.
2. **Identificação do usuário:** a chamada sai do próprio aplicativo com a sessão do usuário logado, então `auth.uid()` dentro da função é o usuário atual. A função é criada como *security invoker*, ou seja, roda com as permissões de quem chamou e continua sujeita às políticas de acesso existentes. Não há uso de service role nem de chave administrativa.
3. **Autoria (`created_by`):** os certificados são inseridos sem informar autoria, exatamente como no formulário manual, e o banco preenche o campo com o usuário logado através do valor padrão já existente. A política de inserção atual (autoria precisa ser o próprio usuário) continua valendo e é respeitada.
4. **Regimes na mesma transação:** as atualizações de `transportadores.inscricao_estadual` acontecem dentro da mesma função, depois dos certificados, apenas para as transportadoras efetivamente importadas e com regime válido. Estão portanto no mesmo commit.
5. **Se um certificado falhar:** a função levanta erro, a transação é desfeita e nenhum certificado novo permanece no banco. O aplicativo mostra "Importação não realizada" e o motivo retornado.
6. **Se uma atualização de regime falhar:** mesmo comportamento — desfaz também os certificados já inseridos naquela execução. Nunca fica um estado meio gravado.
7. **Revalidação dentro da transação:** além da revalidação feita antes da confirmação, a própria função reconfere, no momento da gravação, que cada linha tem transportadora única pelo CNPJ e que ainda não existe certificado da mesma transportadora com o mesmo vencimento. Linhas que deixarem de ser elegíveis são simplesmente puladas e devolvidas como "Ignorado — já existente" no relatório, sem abortar as demais; erros reais (permissão, dado inválido) abortam tudo.
8. **Auditoria:** os gatilhos de auditoria já existentes registram cada inserção e atualização normalmente, inclusive as feitas pela função. Nenhum mecanismo paralelo é criado.
9. **Retorno:** a função devolve, em uma resposta única, quantos foram inseridos, quais foram ignorados e quais regimes foram atualizados — é essa resposta, já pós-commit, que alimenta o relatório final.


## Relatório final

Resumo com: linhas válidas na planilha, já existentes antes, novos elegíveis inicialmente, importados, ignorados por já existirem, transportadoras não encontradas, registros que requeriam revisão, falhas e alterações de regime. Abaixo, tabela com Empresa, CNPJ, Transportadora, Vencimento, Tipo, Regime e Resultado/Motivo ("Importado", "Ignorado — já existente", "Não importado — transportadora não encontrada", "Não importado — requer revisão", "Falha na importação").

Depois de uma importação bem-sucedida, a lista de Certificados Digitais e os dados de transportadoras são recarregados automaticamente.

## Detalhes técnicos

- `src/lib/importacaoCertificados.ts`: acrescentar validação de regime oficial e de STATUS como critério de bloqueio ("requer revisão"), e uma função pura que monta as linhas a gravar e as atualizações de regime a partir de uma análise. Funções e classificações atuais permanecem.
- Migration: função `public.importar_certificados(payload jsonb)` em plpgsql, `SECURITY INVOKER`, `SET search_path = public`, com `GRANT EXECUTE ... TO authenticated`. Ela percorre o payload, revalida CNPJ único e duplicidade (transportadora + vencimento), insere em `certificados` (sem informar `created_by`, deixando o default `auth.uid()`), atualiza `inscricao_estadual` das transportadoras importadas e retorna um `jsonb` com inseridos/ignorados/regimes. Nenhuma policy é criada ou afrouxada; nenhuma tabela ou coluna nova.
- `src/hooks/useCertificados.ts`: novo hook `useImportarCertificados` que (1) refaz `select` de `transportadores` e `certificados` para a revalidação exibida, (2) reexecuta `analisarImportacao`, (3) chama a função do banco via `supabase.rpc` com a sessão do usuário, (4) invalida/refetch de `["certificados"]` e `["transportadores","resumo"]`. Erros passam por `reportDbError`, como nos demais hooks.
- `src/components/certificado/ImportarCertificadosDialog.tsx`: estados `preview | confirmacao | processando | resultado`, substituindo apenas o rodapé e acrescentando as telas de confirmação e relatório. Preview atual intacto.
- `src/pages/Certificados.tsx`: sem mudanças além das já existentes (botão e render do modal).
- Sem novas colunas, sem alteração de RLS, schema de tabelas, MCP, Assistente, ou do restante da tela. Auditoria continua sendo a dos triggers existentes.
- Testes novos no Vitest para: elegibilidade após revalidação, bloqueio por regime inválido, bloqueio por status desconhecido, CNPJ ambíguo, mesmo vencimento (ignorado) e vencimento diferente (elegível com aviso). Validação final com typecheck, build e Vitest.
