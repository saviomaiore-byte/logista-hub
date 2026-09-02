import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMotoristas from "./tools/list-motoristas";
import getMotorista from "./tools/get-motorista";
import listTransportadores from "./tools/list-transportadores";
import listContratos from "./tools/list-contratos";
import listSeguros from "./tools/list-seguros";
import listCertificadosVencendo from "./tools/list-certificados-vencendo";
import analisarPendencias from "./tools/analisar-pendencias";
import analisarVencimentos from "./tools/analisar-vencimentos";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "pactum-logistica-hub",
  title: "Pactum Logista Hub",
  version: "0.1.0",
  instructions:
    "Ferramentas de consulta do Pactum Logística: motoristas, transportadores, contratos, seguros e certificados digitais. Todas as consultas respeitam as permissões do usuário autenticado. " +
    "PAGINAÇÃO: as tools de listagem (list_motoristas, list_transportadores, list_contratos, list_seguros) aceitam 'limite' (1–100, padrão 25) e 'offset' (padrão 0) e retornam 'returned', 'total_encontrado', 'limite', 'offset', 'truncated' e 'filtros_aplicados'. " +
    "'total_encontrado' é o total de registros que atendem aos filtros aplicados; 'returned' é apenas a quantidade da página atual. NUNCA trate 'returned' como total quando 'total_encontrado' estiver disponível. " +
    "'truncated' = true significa que existem mais registros além da página atual: informe que o resultado é parcial e use 'offset' (offset + limite) para buscar as próximas páginas antes de concluir qualquer coisa. " +
    "NUNCA afirme que não existem mais registros quando 'truncated' for true. Se 'returned' for 0, considere o contexto de paginação e 'total_encontrado' antes de afirmar ausência — offset além do total também produz zero registros. " +
    "Para verificar contratos de um motorista ou transportador, use sempre list_contratos com motorista_id ou transportador_id em vez de varrer a listagem genérica. " +
    "Para perguntas sobre pendências, inaptidão ou documentos irregulares, use analisar_pendencias, que aplica as regras oficiais do relatório semanal. " +
    "Para perguntas sobre documentos vencidos ou a vencer, use analisar_vencimentos (motoristas) ou list_certificados_vencendo (certificados digitais da empresa).",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listMotoristas,
    getMotorista,
    listTransportadores,
    listContratos,
    listSeguros,
    listCertificadosVencendo,
    analisarPendencias,
    analisarVencimentos,
  ],
});
