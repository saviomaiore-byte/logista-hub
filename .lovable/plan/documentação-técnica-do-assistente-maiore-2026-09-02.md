# Documentação técnica do Assistente Maiore

Criar um documento único, em português, descrevendo exatamente o que existe hoje no projeto — sem alterar código, banco, RLS, MCP, Edge Functions, UI ou dependências.

## Arquivo

- **Criar** `docs/assistente-maiore.md` (não existe hoje).
- `docs/arquitetura.md` já existe (63 linhas) e **não menciona o Assistente**; será preservado como está. A única mudança possível seria uma linha de referência cruzada — e ela só será feita se você autorizar; por padrão o plano não toca nesse arquivo.

## Fontes que serão lidas (nada é escrito nelas)

- `src/pages/Assistente.tsx`, `src/components/assistente/{ChatWindow,ConversasPanel,WelcomeState}.tsx`, `src/components/ai-elements/*`
- `src/hooks/useAssistente.ts`, `src/App.tsx`, `src/components/layout/Sidebar.tsx`
- `supabase/functions/assistente-chat/index.ts` (164 linhas) e `tools.ts` (648 linhas)
- `supabase/config.toml`, `package.json`, `index.html`/`vite.config.ts` (CSP)
- `src/lib/mcp/**` (10 tools MCP) e `src/lib/aptidao.ts`
- Consultas somente leitura em `pg_policies`, índices, constraints e grants de `assistente_conversas`/`assistente_mensagens`

## Seções do documento (1 a 20, conforme solicitado)

1. Visão geral — o que é, o que responde, e a natureza read-only sobre dados operacionais.
2. Arquitetura geral — diagrama textual do fluxo real e o papel de cada camada, deixando explícito que **o chat não chama o servidor MCP**: ele usa tools próprias na Edge Function.
3. Interface — página, janela de chat, painel de conversas, welcome state com 6 cards, componentes AI Elements, rotas `/assistente` e `/assistente/:threadId`, proteção de rota e item na Sidebar.
4. Conversas e histórico — criação, título automático, troca de thread, tabelas `assistente_conversas` e `assistente_mensagens` com colunas, FK com cascade e índices reais.
5. RLS das conversas — policies exatas, incluindo a regra de INSERT de mensagens que valida dono da conversa.
6. Edge Function — responsabilidade, `verify_jwt`, validação do usuário, client com token do usuário, streaming, limites e tratamento de erros; papel de `index.ts` e `tools.ts` (a função tem apenas esses dois arquivos).
7. Modelo e Lovable AI Gateway — provedor, modelo, chamada server-side, streaming, onde a chave fica e por que o frontend não a acessa.
8. Tools do chat — tabela detalhada das 10, separadas em **consulta** (6) e **análise** (4), com parâmetros, filtros, paginação, tabelas lidas, regras usadas, limitações e tratamento de PII.
9. MCP — localização, as 10 tools, autenticação, RLS, paginação, schemas e a relação real com o chat (duplicação de lógica, não reutilização).
10. Segurança e privacidade — separado em "Implementado" e "Limitações/pontos de atenção".
11. Prompt do Assistente — resumo técnico do system prompt (escopo, decisão de tools, limites, paginação, PII, confiabilidade, formato).
12. Paginação e dados parciais — campos de metadata, quais tools têm total e quais não têm.
13. Tratamento de erros — 401, erro de tool, erro do Supabase, 429/402/timeout e fallback genérico.
14. Persistência das mensagens — fluxo completo e o que acontece em falha, interrupção e recarregamento.
15. Limites conhecidos e débito técnico — Alta / Média / Baixa, apenas itens reais observados no código.
16. Fluxo completo de "Faça um resumo da operação", passo a passo conforme o código.
17. Estrutura de arquivos — árvore só com arquivos existentes.
18. Dependências — nome, finalidade e onde é usada.
19. Testes e validação — separado em "testado e funcionando" e "não testado/pendente", sem inventar execuções.
20. Guia rápido de onboarding na ordem de leitura sugerida.

## Regras aplicadas ao conteúdo

- Somente o que existe no código; o que não existe entra como "Não implementado atualmente."
- Nenhuma chave, token, segredo ou id de projeto no documento.
- Nenhum problema será corrigido — apenas registrado na seção 15.

## Entrega ao final

Arquivo criado, estrutura, arquivos analisados, decisões arquiteturais registradas, pontos de atenção e a confirmação explícita de que código, banco, RLS, MCP e UI **não** foram alterados.
