# Etapa 3 — Índice único parcial em `relatorio_config` (estratégia para aprovação)

Nada será executado agora. Este documento descreve exatamente o que pretendo fazer.

## Estado atual verificado

- `relatorio_config` tem **1 linha**: `tipo = 'semanal'`, `destinatarios = [savio.paula@maiore.com.br]`, `dia_envio = segunda`, `horario_envio = 08:00`, `envio_automatico = true`.
- Índices existentes: apenas `relatorio_config_pkey (id)`. Não há nenhuma restrição de unicidade além da chave primária.
- `fetchConfig` usa `.select("*").limit(1).maybeSingle()` sem ordenação.
- `saveConfig` faz UPDATE quando `configId` existe e INSERT quando está vazio — hoje nada impede duas linhas.

## Respostas às 10 perguntas

1. **Coluna do índice:** a coluna `tipo` (sem expressão, sem função).
2. **Condição do índice parcial:** `WHERE tipo = 'semanal'`.
3. **Por que garante exatamente uma configuração:** o índice é único sobre `tipo`, mas só indexa as linhas em que `tipo = 'semanal'`. Como todas as configurações do relatório semanal usam esse valor, a segunda tentativa de inserir uma linha `'semanal'` viola o índice e é rejeitada pelo banco com erro `23505`. A proteção fica no banco, não na aplicação — vale para qualquer caminho (UI, script, chamada direta), inclusive requisições simultâneas. A forma parcial mantém a porta aberta para um futuro `tipo = 'mensal'` sem precisar mexer no índice.
4. **A linha existente:** continua válida e **não é alterada**. O índice é criado sobre o estado atual; com apenas uma linha `'semanal'`, a criação passa sem conflito e nenhum dado é tocado (nenhum UPDATE, nenhum trigger de auditoria ou de `updated_at` dispara).
5. **Outras tabelas:** o índice é criado exclusivamente em `public.relatorio_config`. Nenhuma outra tabela, policy, função, trigger ou grant é modificado.
6. **Migration pretendida** (não executada):

```sql
CREATE UNIQUE INDEX IF NOT EXISTS relatorio_config_tipo_semanal_uniq
  ON public.relatorio_config (tipo)
  WHERE tipo = 'semanal';
```

7. **Proteção do `saveConfig` com `configId` vazio:** o fluxo passa a ser, quando `configId` está vazio:
   - reconsultar a configuração no banco antes de gravar; se encontrar uma linha, atualizar essa linha (UPDATE por `id`) em vez de inserir;
   - só inserir quando a reconsulta confirmar que não existe nenhuma linha, e o INSERT passa a incluir explicitamente `tipo: "semanal"`;
   - se mesmo assim o INSERT falhar por violação de unicidade (`23505`) — caso de corrida entre duas abas/usuários — o código relê a linha existente, guarda o `id` em `configId` e converte a operação em UPDATE, mantendo a mensagem de sucesso. Nenhuma linha duplicada é criada e o usuário não vê erro espúrio.
   - `fetchConfig` também ganha ordenação determinística (`order by created_at asc`) para sempre carregar a mesma linha.
8. **Payload da Edge Function:** permanece **byte a byte igual**. `enviarRelatorio` e o corpo enviado para `send-report-email` não são tocados em nenhum ponto.
9. **Destinatário:** `savio.paula@maiore.com.br` permanece exatamente como está — nenhum UPDATE, DELETE ou reescrita da coluna `destinatarios`.
10. **Nada será alterado sem sua aprovação explícita.** Este turno é somente descritivo.

## Cenário exigido: `fetchConfig` falha e o usuário salva

```text
fetchConfig falha (rede/RLS)  ->  configId = ""  ->  usuário clica Salvar
        |
        v
saveConfig reconsulta o banco
        |-- achou linha  -> UPDATE por id  -> 1 linha (sem duplicar)
        |-- não achou    -> INSERT tipo='semanal'
                                 |-- sucesso            -> 1 linha
                                 |-- erro 23505 (corrida) -> relê id -> UPDATE -> 1 linha
```

Mesmo que a camada de aplicação falhe por completo, o índice único parcial rejeita a segunda linha no próprio banco. A garantia final é do Postgres; a lógica do `saveConfig` só evita que o usuário veja um erro.

## Escopo

- Migration: 1 índice em `relatorio_config`.
- Código: apenas `fetchConfig` e `saveConfig` em `src/pages/Relatorios.tsx`.
- Sem mudanças em RLS, policies, grants, triggers, schema de outras tabelas, Edge Functions, rotas, geração de PDF/Excel ou regras de aptidão.
