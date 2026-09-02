# Conectar e testar o MCP do Assistente Maiore

Objetivo: disponibilizar este app como Connector no Lovable e executar 4 testes reais, sem alterar código, banco, RLS, UI ou ferramentas MCP.

## O que será feito

1. **Registrar o app como Connector**
   Abrir o fluxo "Add to Lovable" para o servidor MCP já publicado deste app (10 ferramentas). Isso apenas registra o connector no workspace — nenhum arquivo do projeto é tocado.

2. **Autorizar via OAuth**
   O fluxo abre a tela de consentimento já existente do app. É necessário estar logado com uma conta `@maiore.com.br`; a sessão do agente herda as permissões desse usuário (RLS).

3. **Executar os 4 testes pelo chat**
   - "Me dê um resumo operacional da empresa." (esperado: `resumo_operacional`)
   - "Quais motoristas estão com pendências?" (esperado: `analisar_pendencias`)
   - "O que vence nos próximos 30 dias?" (esperado: `analisar_vencimentos`, `dias=30`)
   - "Quais são os principais problemas que precisam de atenção?" (esperado: `resumo_operacional` e/ou `analisar_pendencias`)

4. **Relatar por teste**
   Ferramenta usada, sucesso/falha da chamada, parâmetros enviados, se retornou dados, e qualquer erro de autenticação/MCP/permissão.

## Fora de escopo

Nenhuma correção será aplicada. Problemas encontrados serão apenas reportados ao final.

## Observação técnica

O endpoint é a função `mcp` já publicada, protegida por OAuth 2.1 (issuer Supabase Auth, audiência `authenticated`). A conexão não expõe chaves nem altera políticas; todas as 10 ferramentas são somente leitura.
