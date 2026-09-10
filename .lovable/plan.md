# Exceção de aptidão: motorista que também é transportadora

## 1. Situação atual (verificada)

- A regra central está em `src/lib/aptidao.ts` (`checkMotoristaAptidao`), que hoje exige: Contrato com arquivo, Termo de Adesão com arquivo, ANTT da transportadora, Certificado da transportadora, CNH válida, MOPP válido (salvo vitalício) e motorista ativo. Alvará já não gera motivo.
- Consumidores da regra: a tela de Relatórios (`src/pages/Relatorios.tsx`), a ferramenta de pendências do assistente (`src/lib/mcp/tools/analisar-pendencias.ts`) e duas cópias independentes da regra em funções do servidor (`supabase/functions/assistente-chat/tools.ts` e `supabase/functions/mcp/index.ts`).
- O vínculo motorista ↔ transportadora vem da tabela de vínculos; 273 motoristas estão vinculados e 4 têm mais de uma transportadora.
- Sobre identificar "motorista + transportadora": consultei a base e hoje **nenhum** dado marca esse caso — nenhum motorista está marcado como transportador próprio, nenhuma transportadora aponta para um motorista, e os documentos nunca coincidem (motoristas têm CPF de 11 dígitos, as 140 transportadoras têm CNPJ de 14). A única coincidência disponível é o nome: em 109 vínculos o nome do motorista é igual à razão social da transportadora.

## 2. Regra escolhida

Conforme sua decisão: o motorista é tratado como "motorista + transportadora" quando o **nome dele for igual à razão social da transportadora sob a qual ele está sendo avaliado**, e a dispensa vale **apenas nessa transportadora**. Sob qualquer outra transportadora, Contrato e Termo de Adesão continuam obrigatórios.

Comparação feita de forma tolerante e previsível: sem acentos, sem pontuação, sem espaços duplicados, sem diferenciar maiúsculas/minúsculas, e ignorando sufixos societários comuns (ME, EIRELI, LTDA, MEI). Sem correspondência parcial ou aproximada — apenas igualdade após essa normalização.

Ressalva: como o nome é a única pista disponível, homônimos ou grafias divergentes podem dispensar ou exigir documentos indevidamente. Recomendo, num passo futuro, uma marcação explícita no cadastro; não faz parte desta entrega.

## 3. Árvore de decisão final

```text
motorista + transportadora avaliada
├─ nome do motorista == razão social da transportadora?
│   ├─ SIM  → não verifica Contrato nem Termo de Adesão
│   └─ NÃO  → exige Contrato (com arquivo) e Termo de Adesão (com arquivo)
├─ ANTT da transportadora preenchida       (sempre)
├─ Certificado da transportadora preenchido(sempre)
├─ CNH não vencida                          (sempre)
├─ MOPP não vencido, salvo vitalício        (sempre)
└─ motorista ativo                          (sempre)
Alvará: nunca influencia; segue apenas informativo em "Ver Docs".
Distrato: nunca satisfaz Contrato nem Termo de Adesão.
Status do contrato: continua ignorado.
```

## 4. Motivos de inaptidão

No caso especial, "Sem contrato assinado" e "Sem Termo de Adesão" deixam de existir. Todos os demais motivos permanecem iguais, na mesma ordem, produzidos pela mesma função central.

## 5. Detalhes técnicos

- `src/lib/aptidao.ts`: adicionar um utilitário exportado `isMotoristaProprioTransportador(nomeMotorista, razaoSocial)` com a normalização descrita, e passar a receber o nome do motorista na entrada existente (`MotoristaAptidaoInput.nome`) e a razão social na entrada da transportadora (`TransportadoraAptidaoInput.razao_social`). Assinatura e ordem dos parâmetros de `checkMotoristaAptidao` permanecem as mesmas — apenas campos opcionais novos. Quando a exceção se aplica, o bloco de documentos contratuais é pulado.
- `src/pages/Relatorios.tsx`: já passa o objeto completo do motorista e da transportadora para a regra; a mudança é apenas garantir que `razao_social` esteja presente no objeto passado (já está na consulta). Nenhuma consulta, card, filtro, PDF, Excel ou e-mail muda.
- `src/lib/mcp/tools/analisar-pendencias.ts`: nenhuma mudança de lógica; passa a se beneficiar automaticamente, desde que a consulta já traga nome e razão social (verificar e ajustar apenas a seleção de colunas, se faltar).
- Cópias no servidor (`assistente-chat/tools.ts` e `mcp/index.ts`): replicar exatamente a mesma condição, para o Assistente não divergir do Relatório. São cópias por limitação de ambiente; ficarão idênticas em comportamento.
- Sem alteração de banco, tabelas, migrations, RLS, permissões, UI, layout, rotas ou dados. Nenhum backfill.

## 6. Riscos e casos-limite

- Motorista vinculado a mais de uma transportadora (4 casos): a exceção vale linha a linha, então ele pode ser apto sob a própria e inapto sob outra — comportamento pretendido.
- Homônimos entre motorista e uma transportadora que não é dele: seria dispensado indevidamente.
- Grafias divergentes (abreviações, nome do sócio vs. razão social): não dispensa, mantendo a exigência atual — falha para o lado seguro.
- Nome ou razão social vazios: nunca ativam a exceção.
- Existem 2 documentos de transportadora repetidos na base; como a regra é por nome e por vínculo, isso não interfere.

## 7. Testes

Ampliar `src/test/aptidao.test.ts` cobrindo: motorista comum sem documentos → dois motivos; motorista com nome igual à razão social e sem documentos → apto; mesmo caso com CNH vencida → inapto apenas por "CNH vencida"; mesmo caso sem ANTT ou sem Certificado → inapto pelos motivos correspondentes; variações de acento, caixa e sufixo societário; nome igual mas transportadora diferente → continua exigindo os documentos; distrato não substitui nada; status "pendente" segue irrelevante. Ao final: verificação de tipos, build e toda a suíte existente.
