# Corrigir expansão do conteúdo ao recolher o menu

## Objetivo
Fazer a área principal acompanhar a largura real do menu lateral, liberando imediatamente o espaço quando ele for recolhido e restaurando-o quando for aberto.

## Implementação
- Elevar o estado aberto/recolhido para o layout principal, mantendo o menu como responsável apenas por exibir e acionar o controle.
- Aplicar no conteúdo principal o recuo correspondente ao estado atual: largura completa no celular, 256 px com o menu aberto e 80 px com o menu recolhido.
- Manter a transição existente sincronizada entre menu e conteúdo, sem alterar cards, tabelas, gráficos, filtros ou demais telas.
- Preservar o menu móvel em painel sobreposto, sem reservar espaço lateral.

## Validação
- Conferir no navegador a expansão e o retorno do conteúdo em desktop.
- Conferir que o menu móvel continua sobreposto e sem espaço lateral reservado.
- Executar testes e validação de compilação disponíveis no projeto.

## Detalhes técnicos
O estado será controlado em `MainLayout` e passado ao `Sidebar`. A classe de recuo do `<main>` será condicional ao mesmo estado, evitando divergência entre a largura visual do menu e a área reservada no layout.
