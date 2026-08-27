# Pós-validação T8–T10: registrar backlog e seguir para T11

A auditoria de T8, T9 e T10 foi concluída: nenhuma regressão funcional encontrada. As pendências apontadas viram backlog, sem correção agora.

## 1. Registrar pendências no planejamento (somente documentação)

Adicionar ao arquivo de planejamento técnico (`.lovable/plan/planejamento-técnico-pactum-logística-2026-08-27.md`) duas novas entradas de backlog:

**T8b — Completar padronização de erros de banco**
- `src/pages/Index.tsx`: `certError` é capturado mas nunca reportado (falha silenciosa na contagem de certificados).
- Aplicar `reportDbError` em: `Transportadores.tsx`, `Contratos.tsx`, `Certificados.tsx`, `ConferenciaSeguros.tsx`, `Usuarios.tsx`, `DocumentosEmpresa.tsx`.

**T10b — Limpeza de testes e documentação**
- Remover `src/test/example.test.ts` (teste sem valor).
- Centralizar a regra de "documento vencido" (hoje duplicada em `Index.tsx` e `Relatorios.tsx:290`) em `src/lib/`.
- Ajustar o README para descrever o padrão de erros como parcial enquanto T8b não estiver concluída.

Marcar T8, T9 e T10 como validadas.

## 2. Seguir para T11

T11 (quebra das páginas grandes em componentes) é a próxima tarefa do backlog. Confirmação do escopo antes de começar: `Transportadores.tsx`, `Motoristas.tsx`, `Seguros.tsx` e `Relatorios.tsx` são os arquivos mais longos e os candidatos naturais.

## Notas técnicas

- Nenhuma alteração de código nesta etapa além do arquivo de planejamento.
- Build e 20 testes verdes; `happy-dom` restrito a `vitest.config.ts`, sem efeito em produção.
