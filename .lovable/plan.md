# Diagnóstico — Regime Tributário na página Certificados Digitais

## Respostas ao diagnóstico solicitado

**1. Como `certificados` se relaciona com `transportadores`?**
Não existe chave estrangeira. A ligação é feita por texto: `certificados.empresa` guarda a `razao_social` da transportadora (o formulário usa um `<Select>` cujo `value` é `transportadora.razao_social`).

**2. Campos de `certificados`:**
`id`, `empresa`, `tipo`, `vencimento`, `data_renovacao_agendada`, `status`, `observacoes`, `arquivo_url`, `created_by`, `created_at`, `updated_at`. Não há `transportador_id` nem nenhuma FK.

**3. Campos de `transportadores` (relevantes):**
`razao_social`, `cpf_cnpj`, `inscricao_estadual`, `contato`, `status`, `situacao_operacional`, dados de documentos (ANTT/alvará/certificado) etc.

**4. Onde está o regime tributário?**
Na coluna `transportadores.inscricao_estadual`. Apesar do nome, ela armazena o regime tributário, restrito aos valores: "Simples nacional", "Lucro presumido", "Lucro real", "MEI caminhoneiro" (ver `transportadorSchema` e `REGIME_TRIBUTARIO_OPTIONS`).

**5. Relacionamento existente:**
Somente a associação por texto `empresa = razao_social`. Não há FK nem relação declarativa no backend.

**6. Existe `regime_tributario` em `certificados`?**
Não. A tabela não possui esse campo.

**7. É possível exibir sem duplicar o dado?**
Sim. A página já carrega as transportadoras via `useTransportadorasResumo()` (hook que hoje seleciona `id, razao_social, cpf_cnpj`) e já deriva o CNPJ por razão social em memória (mapas `cnpjPorEmpresa` / `cnpjRawPorEmpresa`). O regime tributário pode ser derivado exatamente da mesma forma, sem migration, sem duplicar dado.

## Recomendação — alteração mínima

1. **`src/hooks/useCertificados.ts`** — em `useTransportadorasResumo`, incluir `inscricao_estadual` no `select` e no tipo `TransportadoraResumo`.
2. **`src/pages/Certificados.tsx`** — criar um mapa `razao_social → inscricao_estadual` (mesmo padrão do CNPJ) e exibir uma coluna/badge "Regime Tributário" na tabela desktop e nos cards mobile, com fallback "—" quando vazio ou quando a transportadora não for encontrada.

Sem alteração de banco, RLS, policies, payloads de criação/edição, MCP ou Assistente.

## Ressalvas

- Como a ligação é por texto, se a `razao_social` for editada depois, o certificado antigo pode ficar sem correspondência — nesse caso a coluna mostra "—" (mesmo comportamento atual do CNPJ).
- Transportadoras sem regime preenchido exibem "—".
- O nome da coluna no banco é `inscricao_estadual`; apenas o rótulo exibido na tela será "Regime Tributário".

## Validação após implementar

- Exibir regime correto para certificados com transportadora correspondente.
- Fallback "—" para certificado sem correspondência ou sem regime.
- Pesquisa e ordenação existentes continuam funcionando.
- Cadastro/edição/exclusão/renovação inalterados.
- Typecheck, build e Vitest 20/20.
