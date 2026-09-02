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
    "Ferramentas de consulta do Pactum Logística: motoristas, transportadores, contratos, seguros e certificados digitais. Todas as consultas respeitam as permissões do usuário autenticado.",
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
