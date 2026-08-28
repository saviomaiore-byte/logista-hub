# Ciclo de correções pré-produção — diagnóstico e plano (5 itens)

Diagnóstico concluído. Nenhum arquivo, dado, policy ou RLS foi alterado nesta fase.

## Etapa 1 — `created_by` nulo

### O que foi medido agora

| Tabela | Nulos | Total |
|---|---|---|
| motoristas | 249 | 305 |
| transportadores | 126 | 137 |
| contratos | 26 | 910 |
| cavalos | 7 | 10 |
| reboques | 1 | 1 |
| seguros | 1 | 1 |
| certificados / documentos_empresa / conferencia_seguros / relatorio_config | 0 | — |

**O número real é 410, não 375.** A auditoria anterior contou apenas motoristas e transportadores; contratos, cavalos, reboques e seguros também têm registros legados.

### Policies que dependem de `created_by`

Padrão idêntico nas 10 tabelas: SELECT `true` · INSERT `with_check (created_by = auth.uid())` · UPDATE `created_by = auth.uid() OR has_role(auth.uid(),'admin')` · DELETE `has_role(...,'admin')`.

`created_by` tem `DEFAULT auth.uid()` em todas elas — nenhum código do frontend envia o campo, o banco preenche. Inserções novas estão corretas; só o legado importado por SQL em lote ficou nulo.

### Contexto que muda a urgência

Os 3 usuários cadastrados hoje (`enzo.castro`, `atendimento`, `savio.paula`) são **todos admin**. Ou seja, hoje ninguém é bloqueado — o problema é latente e só aparece no primeiro usuário comum.

### Alternativas

**A) Backfill** — atribuir os 410 registros a um admin.
- Segurança: neutra. Passa a existir "dono" nominal que não criou o registro.
- RLS: nenhuma mudança.
- Rollback: exige registrar previamente os IDs afetados (todos já identificáveis por `created_by IS NULL`); depois do backfill não há mais como distinguir legado de real sem esse snapshot.
- Risco: baixo, mas é alteração de dados em 410 linhas e dispara os triggers de auditoria (410 linhas novas em `audit_log`).

**B) Ajustar policy de UPDATE** — aceitar também `created_by IS NULL`.
- Segurança: qualquer autenticado passa a poder editar registros legados. DELETE continua só admin.
- RLS: 6 policies alteradas (uma por tabela com legado).
- Rollback: trivial — recriar a policy anterior.
- Risco: baixo estruturalmente, mas amplia permissão de escrita sobre 410 registros.

### Recomendação

**Alternativa A (backfill)**, restrita às 6 tabelas com nulos, atribuindo a `enzo.castro@maiore.com.br` (admin que conduziu a importação). Motivos: não enfraquece nenhuma policy, mantém o modelo de autorização com uma regra só, corrige a causa em vez do sintoma e deixa o dado consistente para auditoria. Antes de executar, apresento a lista de IDs afetados por tabela para rollback.

## Etapa 2 — UI x permissões

`useAdmin` hoje é usado em apenas 3 lugares: `Sidebar` (itens de menu admin), `Usuarios` (bloqueia a página) e `Seguranca` (redireciona). Nenhuma lista de CRUD consulta permissão.

Ações de editar/excluir renderizadas incondicionalmente em: `MotoristasList`, `TransportadoresList`, `CavalosList`, `ReboquesList`, `SegurosList`, `ConferenciasSidebar`, `Contratos`, `Certificados`, `Seguros`, `ContratoAnexos`, `MotoristaAnexos`, `TransportadorAnexos`.

Divergência real: **DELETE é exclusivo de admin no banco em todas as tabelas**, e a UI mostra o botão para todos. UPDATE é permitido a criador ou admin — depois da Etapa 1, o não-admin edita o que criou e é bloqueado no resto.

Abordagem proposta (mínima, sem componentes novos):
- Expor `isAdmin` já existente nas listas via prop.
- Ocultar a ação de excluir quando `!isAdmin`.
- Manter a edição visível: com a Etapa 1 aplicada, o não-admin ainda não poderá editar registro de terceiros, mas isso é caso legítimo de erro de permissão, com mensagem já tratada por `reportDbError`.
- Nenhuma RLS enfraquecida; RLS permanece a camada definitiva.

Teste: admin (tudo visível), usuário comum (sem excluir), registro próprio, registro legado pós-backfill, tentativa bloqueada.

## Etapa 3 — `relatorio_config`

Estado atual: **1 única linha**, `created_by` preenchido, destinatário `savio.paula@maiore.com.br`, `envio_automatico = true`. Nada duplicado, nada a apagar.

Problemas confirmados no código (`src/pages/Relatorios.tsx`):
- Linha 88-91: `.select("*").limit(1).maybeSingle()` sem `.order(...)` → leitura não determinística se surgir uma segunda linha.
- Linha 129: `insert` sempre que `configId` estiver vazio → é o que pode criar a segunda linha (ex.: falha transitória no `fetchConfig`).

Solução proposta (duas partes, ambas mínimas):
1. Adicionar `.order("updated_at", { ascending: false })` antes do `.limit(1)` — leitura determinística.
2. Índice único parcial garantindo linha única na tabela (migração), impedindo a criação de uma segunda configuração na origem.

Nenhum campo alterado, nenhum registro apagado; a linha existente é preservada integralmente.

## Etapa 4 — invalidação da Conferência

Investigado o código real:

```
conferenciasKey       = ["conferencia-seguros"]
conferenciaItensKey(id) = ["conferencia-seguros", "itens", id]
```

Como a chave dos itens é **prefixada** pela chave da lista, o `invalidateQueries({ queryKey: conferenciasKey })` já existente em `useExcluirConferencia` **já invalida também os itens**, por prefix matching do React Query. Ou seja, o item do backlog estava superestimado: não há risco de "aparecer itens antigos ao abrir outra conferência" — cada conferência tem chave própria e a lista inteira é invalidada.

O que de fato sobra: o cache da conferência excluída permanece em memória até o garbage collector. Correção proposta, de uma linha:

```ts
queryClient.removeQueries({ queryKey: conferenciaItensKey(id) });
```

Sem alterar payload, mutation, regra de negócio ou qualquer outra chave.

## Etapa 5 — `frame-ancestors` como header HTTP

Verificado: o projeto **não possui** nenhum arquivo de configuração de hosting (`vercel.json`, `netlify.toml`, `_headers`, `nginx.conf`, `staticwebapp.config.json`) e `public/` contém apenas `favicon.ico`, `placeholder.svg` e `robots.txt`. O build é servido pela hospedagem da plataforma, que não é controlada por arquivos do repositório.

Conclusão: **não há forma segura de aplicar o header pelo código do projeto.** Criar um `_headers` ou `vercel.json` seria configuração inventada para um servidor que o projeto não controla — inerte e enganosa.

Observação adicional relevante: aplicar `frame-ancestors 'self'` como header real **quebraria o preview do Lovable**, que carrega a aplicação em iframe de outra origem. Se um dia for aplicado no hosting, o valor deve contemplar a origem do preview.

Ação proposta para esta etapa: **nenhuma alteração de código**. Apenas registrar em `docs/arquitetura.md` que a proteção contra clickjacking depende de header HTTP no hosting e que `frame-ancestors` na meta é declarativo. Se preferir, deixo também esta etapa como "somente registro" sem tocar na documentação.

## Ordem de execução e verificação

1. Etapa 1 — backfill de `created_by` (migração de dados, com lista de IDs para rollback apresentada antes)
2. Etapa 2 — UI x permissões (esconder excluir para não-admin)
3. Etapa 3 — `.order()` + índice único em `relatorio_config`
4. Etapa 4 — `removeQueries` na exclusão de conferência
5. Etapa 5 — registro documental do `frame-ancestors`

Após cada etapa: build, typecheck, Vitest (baseline 20/20), console sem erros novos, validação funcional específica, e relatório de arquivos alterados / banco alterado ou não / RLS alterada ou não / payloads alterados ou não / regressões. Parada obrigatória para aprovação entre etapas.

## Resumo de impacto por etapa

| Etapa | Código | Banco (dados) | RLS/Policies | Payloads |
|---|---|---|---|---|
| 1 | Não | Sim — 410 linhas | Não | Não |
| 2 | Sim — listas/props | Não | Não | Não |
| 3 | Sim — 1 linha em `Relatorios.tsx` | Não (só índice) | Não | Não |
| 4 | Sim — 1 linha em `useConferenciaSeguros.ts` | Não | Não | Não |
| 5 | Só documentação | Não | Não | Não |

Nada foi implementado. Aguardando aprovação para iniciar a Etapa 1.
