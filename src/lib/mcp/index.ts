import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMotoristas from "./tools/list-motoristas";
import getMotorista from "./tools/get-motorista";
import listTransportadores from "./tools/list-transportadores";
import listContratos from "./tools/list-contratos";
import listSeguros from "./tools/list-seguros";
import listCertificadosVencendo from "./tools/list-certificados-vencendo";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "pactum-logistica-hub",
  title: "Pactum Logista Hub",
  version: "0.1.0",
  instructions:
    "Ferramentas de consulta do Pactum Logística: motoristas, transportadores, contratos, seguros e certificados digitais. Todas as consultas respeitam as permissões do usuário autenticado. " +
    "REGRA OBRIGATÓRIA para as tools de listagem: nunca deduza ausência, inexistência ou contagem total de registros a partir de uma lista que possa estar truncada. " +
    "As respostas trazem os campos 'returned', 'limite', 'truncated' e, quando disponível, 'total_encontrado'. " +
    "Se 'truncated' for true, informe explicitamente que o resultado é parcial e não afirme que não existem outros registros. " +
    "Se uma listagem retornar zero registros com filtros amplos ou truncamento possível, diga que nada foi encontrado no conjunto consultado, sem afirmar inexistência. " +
    "Para verificar contratos de um motorista ou transportador, use sempre list_contratos com motorista_id ou transportador_id em vez de procurar em uma listagem genérica.",
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
  ],
});
