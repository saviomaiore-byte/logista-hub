import { checkMotoristaAptidao, type MotoristaAptidaoInput, type TransportadoraAptidaoInput } from "./aptidao";
type Motorista = MotoristaAptidaoInput & { id: string };
type Transportador = TransportadoraAptidaoInput & { id: string; status?: string | null; situacao_operacional?: string | null };
type Vinculo = { motorista_id: string; transportador_id: string; motorista_proprio?: boolean | null };
type Contrato = { motorista_id: string | null; arquivo_url: string | null; tipo: string };
export function calcularDashboardStats(transportadores: Transportador[], motoristas: Motorista[], vinculos: Vinculo[], contratos: Contrato[]) {
  const ativos = transportadores.filter(item => item.status === "ativo");
  const transportadoresPorId = new Map(ativos.map(item => [item.id, item]));
  const motoristasPorId = new Map(motoristas.map(item => [item.id, item]));
  const motoristasAtivos = motoristas.filter(item => item.status === "ativo");
  const contratosSet = new Set(contratos.filter(item => item.arquivo_url && item.tipo === "contrato").map(item => item.motorista_id));
  const adesoesSet = new Set(contratos.filter(item => item.arquivo_url && item.tipo === "adesao").map(item => item.motorista_id));
  const avaliados = new Set<string>();
  const aptos = new Set<string>();

  for (const vinculo of vinculos) {
    const motorista = motoristasPorId.get(vinculo.motorista_id);
    const transportador = transportadoresPorId.get(vinculo.transportador_id);
    // Inatividade é uma categoria cadastral separada; inaptidão mede apenas
    // pendências dos motoristas ativos em vínculos com transportadoras ativas.
    // Mesma regra do relatório: só "inativo" fica fora (ex.: "pendente" é avaliado).
    if (!motorista || motorista.status === "inativo" || !transportador) continue;
    avaliados.add(motorista.id);
    const resultado = checkMotoristaAptidao(
      motorista,
      { contrato: contratosSet.has(motorista.id), adesao: adesoesSet.has(motorista.id) },
      transportador,
      vinculo.motorista_proprio === true,
    );
    // Conta a pessoa uma vez: apta quando pode operar em pelo menos um vínculo ativo.
    if (resultado.apto) aptos.add(motorista.id);
  }

  const transportadoresInaptos = ativos.filter(item => item.situacao_operacional === "inapto").length;
  return {
    transportadores: transportadores.length,
    transportadoresAtivos: ativos.length,
    transportadoresAptos: ativos.length - transportadoresInaptos,
    transportadoresInaptos,
    motoristas: motoristas.length,
    motoristasAtivos: motoristasAtivos.length,
    motoristasInativos: motoristas.filter(item => item.status === "inativo").length,
    motoristasAptos: aptos.size,
    motoristasInaptos: avaliados.size - aptos.size,
    motoristasSemVinculoAtivo: motoristasAtivos.length - avaliados.size,
  };
}