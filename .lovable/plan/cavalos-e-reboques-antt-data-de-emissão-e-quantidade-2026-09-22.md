# Cavalos e Reboques: ANTT, data de emissão e quantidade

## O que muda

Hoje as abas **Cavalos** e **Reboques** (dentro de Transportadores) guardam apenas o transportador e um anexo genérico. Passam a guardar exatamente quatro informações:

1. Transportador (como hoje, obrigatório)
2. Anexo do documento ANTT (PDF ou imagem)
3. Data de emissão do ANTT
4. Quantidade de veículos (cavalos) / reboques cobertos por esse ANTT

Sem vencimento, sem alerta de documento vencido, sem placa ou demais campos.

## Como fica a tela

**Formulário (Novo / Editar Cavalo e Reboque):**
- Transportador (obrigatório)
- Anexo do ANTT — rótulo passa a ser "Anexar ANTT do cavalo" / "Anexar ANTT do reboque"
- Data de emissão — campo de data, opcional
- Quantidade — número inteiro, mínimo 1, opcional

**Listas (desktop e celular):**
- Colunas: Transportador · Data de emissão · Quantidade · ANTT (botão Abrir anexo) · Ações
- Sem data: mostra "—". Sem quantidade: mostra "—". Sem anexo: "Sem anexo" (como hoje)
- No celular os mesmos dados aparecem no formato de card já usado
- Contadores e botões existentes das abas permanecem como estão

## Regras

- Nenhuma dessas informações entra nas regras de aptidão de motorista, nem nos Relatórios Semanais, Assistente, Conferências ou Pendências do Painel — é cadastro puro.
- Registros já existentes continuam válidos, com data e quantidade em branco; nada é preenchido automaticamente.
- Permissões de editar/excluir continuam idênticas (editar pelo criador ou administrador, excluir só administrador).

## Detalhes técnicos

**Banco (migration mínima, aditiva):**
- `cavalos`: novas colunas `antt_data_emissao date null`, `antt_quantidade integer null` (com `check (antt_quantidade is null or antt_quantidade > 0)`)
- `reboques`: mesmas duas colunas, mesmas regras
- Sem alteração de RLS, grants, triggers de auditoria ou `updated_at` — as políticas atuais já cobrem colunas novas
- O anexo continua em `arquivo_url` (bucket privado `documentos`), sem nova coluna nem novo bucket

**Frontend:**
- `src/components/transportador/types.ts`: campos nos tipos `Cavalo`/`Reboque`; `cavaloSchema` e `reboqueSchema` ganham `antt_data_emissao` (string nullable) e `antt_quantidade` (número inteiro positivo nullable, vazio → `null`)
- `src/components/transportador/VeiculoFormDialog.tsx`: dois campos novos no mesmo padrão Formik já usado; `editing` passa a carregar os dois valores
- `src/hooks/useTransportadores.ts`: `useSalvarCavalo` e `useSalvarReboque` incluem os dois campos no payload, normalizando vazio para `null`
- `src/components/transportador/CavalosList.tsx` e `ReboquesList.tsx`: novas colunas/linhas de card, formatação de data com `date-fns` no padrão `dd/MM/yyyy`
- `src/integrations/supabase/types.ts` é regenerado pela migration

**Validação:** `bunx tsgo --noEmit -p tsconfig.app.json`, `npm run build`, `bunx vitest run`, e teste no navegador autenticado criando um cavalo com anexo, data e quantidade, recarregando para confirmar que gravou.
