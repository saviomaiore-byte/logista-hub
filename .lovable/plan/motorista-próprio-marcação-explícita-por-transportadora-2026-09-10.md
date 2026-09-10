# Motorista próprio: marcação explícita por transportadora

Substitui a regra atual, baseada em comparação de nomes, por uma marcação explícita feita por pessoas. Nenhuma propriedade será inferida automaticamente.

## 1. Onde guardar a informação (situação atual verificada)

- O vínculo motorista ↔ transportadora já existe na tabela `transportador_motoristas` (par transportadora + motorista, N:N). É exatamente o grão da regra pedida.
- Existe também um campo antigo `transportadores.motorista_id`, usado apenas para exibir o selo "Motorista Próprio" na lista de transportadores. Ele guarda um único motorista por transportadora, não representa o par avaliado e, conforme consulta anterior, está vazio em toda a base. Não serve como fonte da regra.

**Recomendação: opção 1** — reutilizar `transportador_motoristas`, acrescentando um indicador `motorista_proprio` (verdadeiro/falso, padrão falso). Motivos: é o mesmo grão da regra, não cria tabela paralela nem risco de duas verdades, e permite vários motoristas próprios por transportadora e o mesmo motorista próprio em uma transportadora e comum em outra. Criar uma tabela separada (opção 2) duplicaria o par e exigiria manter as duas em sincronia.

## 2. Alterações necessárias

Banco (uma migração, sem tocar em dados existentes):
- Nova coluna `motorista_proprio` em `transportador_motoristas`, booleana, obrigatória, padrão falso. Todos os vínculos atuais nascem como falso — ou seja, o comportamento hoje vigente (exigir Contrato e Termo) continua valendo até alguém marcar manualmente.
- Nenhum backfill, nenhuma alteração de RLS ou permissões: as regras atuais da tabela continuam valendo.
- `transportadores.motorista_id` permanece intocado; o selo atual da lista continua como está.

Regra de aptidão (`src/lib/aptidao.ts`):
- Remover a comparação por nome: apagar `isMotoristaProprioTransportador`, a normalização de sufixos societários e o uso de `nome`/`razao_social` na decisão.
- `checkMotoristaAptidao` passa a receber a indicação explícita do par avaliado. Quando verdadeira, não gera "Sem contrato assinado" nem "Sem Termo de Adesão". Todos os demais motivos ficam idênticos: ANTT, Certificado, CNH vencida, MOPP vencido (salvo vitalício) e motorista inativo. Alvará continua fora. Distrato nunca satisfaz nada. `contratos.status` continua ignorado.

Consumidores:
- `src/pages/Relatorios.tsx`: a consulta de vínculos passa a trazer o novo indicador e a avaliação de cada linha (transportadora + motorista) usa o valor daquele vínculo. Cards, filtros, PDF, Excel, e-mail e layout não mudam.
- `src/lib/mcp/tools/analisar-pendencias.ts`: mesma leitura do indicador no vínculo.
- `supabase/functions/assistente-chat/tools.ts` e `supabase/functions/mcp/index.ts`: as cópias da regra recebem o mesmo tratamento, para o Assistente não divergir do Relatório.

## 3. Cadastro e edição da marcação

Na tela de Transportadores, na lista de motoristas vinculados de cada transportadora:
- cada motorista vinculado ganha uma marcação "Motorista próprio" que pode ser ligada e desligada ali mesmo;
- ao vincular um motorista novo, a marcação nasce desligada;
- a marcação é sempre por transportadora: o mesmo motorista pode ser próprio em uma e comum em outra;
- apenas quem já pode editar transportadores pode alterar a marcação (mesma verificação de permissão usada hoje nos botões da lista).

Sem tela nova, sem redesenho: apenas o controle dentro do bloco de vinculados.

## 4. Como evitar mexer nos vínculos por acidente

O ponto de risco é a tela de Motoristas: ao salvar um motorista, o sistema hoje apaga os vínculos removidos e insere os novos. Um vínculo apagado e recriado voltaria com a marcação desligada.

Proteções previstas:
- manter a sincronização como está para vínculos que saem ou entram de fato, e nunca recriar um vínculo que já existe (o código já compara antes de inserir/remover, então um salvamento que não mexe na lista preserva a marcação);
- ao remover um vínculo marcado como próprio, avisar claramente antes de confirmar;
- a marcação nunca é alterada por importações, relatórios ou pelo Assistente — só pela ação manual descrita acima.

## 5. Migração

Uma única migração cria a coluna com padrão falso. Nenhum registro existente é alterado, nenhuma linha é apagada, nenhuma inferência por nome é aplicada. A marcação dos casos reais (J.O NAVES, TEODORO TRANSPORTE, CL INACIO e demais) é feita manualmente na tela, um a um.

Efeito imediato após a migração: comportamento idêntico ao de hoje sem a exceção por nome — ou seja, os motoristas que a regra por nome dispensava voltam a exigir Contrato e Termo até serem marcados. Vale confirmar se você quer que eu liste esses casos para facilitar a marcação manual.

## 6. Testes

Em `src/test/aptidao.test.ts`:
- marcação desligada e sem os dois documentos → dois motivos;
- marcação ligada e sem os dois documentos, demais requisitos válidos → apto;
- marcação ligada com CNH vencida → inapto só por CNH vencida;
- marcação ligada sem ANTT → inapto pelo motivo correspondente;
- marcação ligada sem Certificado → inapto pelo motivo correspondente;
- mesmo motorista com marcação ligada em uma transportadora e desligada em outra → resultados diferentes por linha;
- distrato não substitui Contrato nem Termo;
- `status = pendente` continua irrelevante;
- Alvará ausente não gera inaptidão;
- remoção dos testes da comparação por nome (acentos, caixa, sufixos), que deixam de existir.

Ao final: testes de aptidão, suíte completa, verificação de tipos e build.
