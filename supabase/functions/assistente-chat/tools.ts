// Ferramentas de CONSULTA do Assistente Maiore.
// Espelham exatamente as regras das 10 tools MCP (src/lib/mcp/tools/*), que
// permanecem inalteradas. Somente leitura: nenhum insert/update/delete.
import { tool } from "npm:ai@7.0.90";
import { z } from "npm:zod@3.25.76";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

/* ------------------------------- helpers ------------------------------- */

export function maskDocumento(value: string | null | undefined): string | null {
  if (!value) return value ?? null;
  const digitos = value.replace(/\D/g, "");
  if (digitos.length <= 4) return value;
  let restantes = digitos.length - 4;
  return value.replace(/\d/g, (d) => (restantes-- > 0 ? "*" : d));
}

function temDocumento(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function quoteFilterValue(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function likeTerm(value: string): string {
  return quoteFilterValue(`%${value.replace(/([\\%_])/g, "\\$1")}%`);
}

function paginationMeta(returned: number, total: number | null, limite: number, offset: number) {
  const total_encontrado = total ?? null;
  const truncated =
    total_encontrado !== null ? offset + returned < total_encontrado : returned >= limite;
  return {
    returned,
    total_encontrado,
    limite,
    offset,
    truncated,
    aviso: truncated
      ? `Resultado parcial: ${returned} registro(s) nesta página de ${total_encontrado ?? "?"} encontrados (offset ${offset}). Existem mais registros.`
      : `Resultado final da paginação: ${returned} registro(s) de ${total_encontrado ?? returned} encontrados (offset ${offset}).`,
  };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function diasEntre(hojeISO: string, dataISO: string): number | null {
  const bruto = String(dataISO).slice(0, 10);
  if (!ISO_DATE.test(bruto)) return null;
  const alvo = Date.parse(`${bruto}T00:00:00Z`);
  const base = Date.parse(`${hojeISO}T00:00:00Z`);
  if (!Number.isFinite(alvo) || !Number.isFinite(base)) return null;
  if (new Date(alvo).toISOString().slice(0, 10) !== bruto) return null;
  const dias = Math.round((alvo - base) / 86400000);
  return Number.isFinite(dias) ? dias : null;
}

function vencida(data?: string | null): boolean {
  if (!data) return false;
  const dias = diasEntre(new Date().toISOString().slice(0, 10), data);
  return dias !== null && dias < 0;
}

/** Regras de aptidão do relatório semanal (idênticas a src/lib/aptidao.ts). */
function checkMotoristaAptidao(
  m: {
    status?: string | null;
    cnh_vencimento?: string | null;
    mopp_vencimento?: string | null;
    mopp_vitalicio?: boolean | null;
  },
  temContrato: boolean,
  t: {
    antt_numero?: string | null;
    alvara_numero?: string | null;
    certificado_numero?: string | null;
  },
  // Vem apenas de transportador_motoristas.motorista_proprio (par avaliado).
  motoristaProprio: boolean = false,
) {
  const motivos: string[] = [];
  if (!temContrato && !motoristaProprio) motivos.push("Sem contrato assinado");
  if (!t?.antt_numero) motivos.push("Transportadora sem ANTT");
  if (!t?.alvara_numero) motivos.push("Transportadora sem Alvará");
  if (!t?.certificado_numero) motivos.push("Transportadora sem Certificado");
  if (vencida(m.cnh_vencimento)) motivos.push("CNH vencida");
  if (!m.mopp_vitalicio && vencida(m.mopp_vencimento)) motivos.push("MOPP vencido");
  if (m.status === "inativo") motivos.push("Motorista inativo");
  return { apto: motivos.length === 0, motivos };
}

function erro(message: string) {
  return { erro: true, mensagem: message };
}

/* -------------------------------- tools -------------------------------- */

export function buildTools(supabase: SupabaseClient) {
  return {
    list_motoristas: tool({
      description:
        "Lista motoristas cadastrados. Filtros: busca (nome/CPF parcial), situacao_operacional, limite, offset. CPF sempre mascarado.",
      inputSchema: z.object({
        busca: z.string().trim().optional(),
        situacao_operacional: z.string().trim().optional(),
        limite: z.number().int().min(1).max(100).default(25),
        offset: z.number().int().min(0).default(0),
      }),
      execute: async ({ busca, situacao_operacional, limite, offset }) => {
        let q = supabase
          .from("motoristas")
          .select(
            "id, nome, cpf, telefone, cidade, estado, status, situacao_operacional, cnh_vencimento, mopp_vencimento, mopp_vitalicio",
            { count: "exact" },
          )
          .order("nome", { ascending: true })
          .range(offset, offset + limite - 1);
        if (busca) {
          const termo = likeTerm(busca);
          q = q.or(`nome.ilike.${termo},cpf.ilike.${termo}`);
        }
        if (situacao_operacional) q = q.eq("situacao_operacional", situacao_operacional);
        const { data, error, count } = await q;
        if (error) return erro(error.message);
        const motoristas = (data ?? []).map((m) => ({ ...m, cpf: maskDocumento(m.cpf) }));
        return {
          motoristas,
          ...paginationMeta(motoristas.length, count ?? null, limite, offset),
          filtros_aplicados: { busca: busca ?? null, situacao_operacional: situacao_operacional ?? null },
        };
      },
    }),

    get_motorista: tool({
      description:
        "Detalha um motorista pelo id (documentos e transportadoras vinculadas). Use apenas para consulta individual pedida pelo usuário, nunca em laço.",
      inputSchema: z.object({ id: z.string().uuid() }),
      execute: async ({ id }) => {
        const { data, error } = await supabase
          .from("motoristas")
          .select(
            "id, nome, cpf, telefone, cidade, estado, status, situacao_operacional, cnh_vencimento, mopp_vencimento, mopp_vitalicio, antt_vencimento, alvara_vencimento, certificado_vencimento",
          )
          .eq("id", id)
          .maybeSingle();
        if (error) return erro(error.message);
        if (!data) return { encontrado: false, mensagem: "Motorista não encontrado." };
        const { data: vinculos } = await supabase
          .from("transportador_motoristas")
          .select("transportador_id, transportadores(id, razao_social, status, situacao_operacional)")
          .eq("motorista_id", id);
        return {
          encontrado: true,
          motorista: { ...data, cpf: maskDocumento(data.cpf) },
          transportadores: vinculos ?? [],
        };
      },
    }),

    list_transportadores: tool({
      description:
        "Lista transportadores. Documentos retornados apenas como presença (tem_antt/tem_alvara/tem_certificado). CPF/CNPJ mascarado.",
      inputSchema: z.object({
        busca: z.string().trim().optional(),
        limite: z.number().int().min(1).max(100).default(25),
        offset: z.number().int().min(0).default(0),
      }),
      execute: async ({ busca, limite, offset }) => {
        let q = supabase
          .from("transportadores")
          .select(
            "id, razao_social, cpf_cnpj, contato, status, situacao_operacional, antt_numero, alvara_numero, certificado_numero",
            { count: "exact" },
          )
          .order("razao_social", { ascending: true })
          .range(offset, offset + limite - 1);
        if (busca) {
          const termo = likeTerm(busca);
          q = q.or(`razao_social.ilike.${termo},cpf_cnpj.ilike.${termo}`);
        }
        const { data, error, count } = await q;
        if (error) return erro(error.message);
        const transportadores = (data ?? []).map(
          ({ antt_numero, alvara_numero, certificado_numero, cpf_cnpj, ...t }) => ({
            ...t,
            cpf_cnpj: maskDocumento(cpf_cnpj),
            tem_antt: temDocumento(antt_numero),
            tem_alvara: temDocumento(alvara_numero),
            tem_certificado: temDocumento(certificado_numero),
          }),
        );
        return {
          transportadores,
          ...paginationMeta(transportadores.length, count ?? null, limite, offset),
          filtros_aplicados: { busca: busca ?? null },
        };
      },
    }),

    list_contratos: tool({
      description:
        "Lista contratos. Filtros: status ('pendente','enviado','assinado','recusado'), motorista_id, transportador_id, limite, offset.",
      inputSchema: z.object({
        status: z.string().trim().optional(),
        motorista_id: z.string().uuid().optional(),
        transportador_id: z.string().uuid().optional(),
        limite: z.number().int().min(1).max(100).default(25),
        offset: z.number().int().min(0).default(0),
      }),
      execute: async ({ status, motorista_id, transportador_id, limite, offset }) => {
        let q = supabase
          .from("contratos")
          .select(
            "id, empresa, tipo, modelo, status, data_envio, data_assinatura, motorista_id, transportador_id",
            { count: "exact" },
          )
          .order("created_at", { ascending: false })
          .range(offset, offset + limite - 1);
        if (status) q = q.eq("status", status);
        if (motorista_id) q = q.eq("motorista_id", motorista_id);
        if (transportador_id) q = q.eq("transportador_id", transportador_id);
        const { data, error, count } = await q;
        if (error) return erro(error.message);
        const contratos = data ?? [];
        return {
          contratos,
          ...paginationMeta(contratos.length, count ?? null, limite, offset),
          filtros_aplicados: {
            status: status ?? null,
            motorista_id: motorista_id ?? null,
            transportador_id: transportador_id ?? null,
          },
        };
      },
    }),

    list_seguros: tool({
      description:
        "Lista apólices de seguro. Status 'ativo' com vigencia_fim no passado deve ser tratado como vencido.",
      inputSchema: z.object({
        status: z.string().trim().optional(),
        seguradora: z.string().trim().optional(),
        limite: z.number().int().min(1).max(100).default(25),
        offset: z.number().int().min(0).default(0),
      }),
      execute: async ({ status, seguradora, limite, offset }) => {
        let q = supabase
          .from("seguros")
          .select(
            "id, seguradora, tipo, status, vigencia_inicio, vigencia_fim, valor_premio, motorista_id",
            { count: "exact" },
          )
          .order("vigencia_fim", { ascending: true, nullsFirst: false })
          .range(offset, offset + limite - 1);
        if (status) q = q.eq("status", status);
        if (seguradora) q = q.or(`seguradora.ilike.${likeTerm(seguradora)}`);
        const { data, error, count } = await q;
        if (error) return erro(error.message);
        const seguros = data ?? [];
        return {
          seguros,
          ...paginationMeta(seguros.length, count ?? null, limite, offset),
          filtros_aplicados: { status: status ?? null, seguradora: seguradora ?? null },
        };
      },
    }),

    list_certificados_vencendo: tool({
      description:
        "Certificados digitais DA EMPRESA que vencem dentro de N dias (inclui vencidos). Não confundir com o certificado do transportador.",
      inputSchema: z.object({
        dias: z.number().int().min(0).max(365).default(30),
        limite: z.number().int().min(1).max(100).default(50),
      }),
      execute: async ({ dias, limite }) => {
        const ate = new Date(Date.now() + dias * 86400000).toISOString().slice(0, 10);
        const { data, error } = await supabase
          .from("certificados")
          .select("id, empresa, tipo, status, vencimento, data_renovacao_agendada")
          .lte("vencimento", ate)
          .order("vencimento", { ascending: true })
          .limit(limite);
        if (error) return erro(error.message);
        const certificados = data ?? [];
        return {
          certificados,
          returned: certificados.length,
          limite,
          truncated: certificados.length >= limite,
          ate,
        };
      },
    }),

    analisar_pendencias: tool({
      description:
        "Pendências operacionais de transportadores ativos e motoristas vinculados, com as regras oficiais de aptidão do relatório semanal. Sem PII.",
      inputSchema: z.object({
        entidade: z.enum(["ambos", "motorista", "transportador"]).default("ambos"),
        limite: z.number().int().min(1).max(200).default(100),
      }),
      execute: async ({ entidade, limite }) => {
        const [tRes, lRes, mRes, cRes] = await Promise.all([
          supabase
            .from("transportadores")
            .select("id, razao_social, status, situacao_operacional, antt_numero, alvara_numero, certificado_numero")
            .eq("status", "ativo")
            .order("razao_social", { ascending: true }),
          supabase
            .from("transportador_motoristas")
            .select("transportador_id, motorista_id, motorista_proprio"),
          supabase
            .from("motoristas")
            .select("id, nome, status, situacao_operacional, cnh_vencimento, mopp_vencimento, mopp_vitalicio"),
          supabase.from("contratos").select("motorista_id, status").eq("status", "assinado"),
        ]);
        const err = tRes.error || lRes.error || mRes.error || cRes.error;
        if (err) return erro(err.message);

        const transportadores = tRes.data ?? [];
        const links = lRes.data ?? [];
        const motoristas = mRes.data ?? [];
        const comContrato = new Set((cRes.data ?? []).map((c) => c.motorista_id));
        const porId = new Map(motoristas.map((m) => [m.id, m]));

        const pendencias: Array<Record<string, unknown>> = [];
        let total_analisado = 0;

        for (const t of transportadores) {
          if (entidade !== "motorista") {
            total_analisado++;
            const motivos = checkMotoristaAptidao({}, true, t).motivos.filter((m) =>
              m.startsWith("Transportadora"),
            );
            if (motivos.length > 0) {
              pendencias.push({
                entidade: "transportador",
                id: t.id,
                nome: t.razao_social,
                situacao_operacional: t.situacao_operacional ?? null,
                motivos,
              });
            }
          }
          if (entidade === "transportador") continue;

          for (const link of links.filter((l) => l.transportador_id === t.id)) {
            const m = porId.get(link.motorista_id);
            if (!m) continue;
            total_analisado++;
            const { apto, motivos } = checkMotoristaAptidao(
              m,
              comContrato.has(m.id),
              t,
              link.motorista_proprio === true,
            );
            if (!apto) {
              pendencias.push({
                entidade: "motorista",
                id: m.id,
                nome: m.nome,
                situacao_operacional: m.situacao_operacional ?? null,
                motivos,
              });
            }
          }
        }

        const lista = pendencias.slice(0, limite);
        const truncated = pendencias.length > lista.length;
        return {
          total_analisado,
          total_com_pendencias: pendencias.length,
          total_sem_pendencias: total_analisado - pendencias.length,
          returned: lista.length,
          limite,
          truncated,
          aviso: truncated
            ? `Resultado parcial: ${lista.length} de ${pendencias.length} pendência(s) retornadas.`
            : `Lista completa: ${lista.length} pendência(s) de ${total_analisado} registro(s) analisados.`,
          filtros_aplicados: { entidade },
          pendencias: lista,
        };
      },
    }),

    analisar_vencimentos: tool({
      description:
        "Documentos de motoristas vencidos ou a vencer dentro da janela de dias. Transportadores não têm data de vencimento cadastrada. Sem números de documento.",
      inputSchema: z.object({
        dias: z.number().int().min(0).max(365).default(30),
        entidade: z.enum(["ambos", "motorista", "transportador"]).default("ambos"),
        limite: z.number().int().min(1).max(200).default(100),
      }),
      execute: async ({ dias, entidade, limite }) => {
        const hoje = new Date().toISOString().slice(0, 10);
        const data_limite = new Date(Date.now() + dias * 86400000).toISOString().slice(0, 10);
        const campos = [
          ["cnh_vencimento", "CNH"],
          ["mopp_vencimento", "MOPP"],
          ["antt_vencimento", "ANTT"],
          ["alvara_vencimento", "Alvará"],
          ["certificado_vencimento", "Certificado"],
        ] as const;

        const itens: Array<Record<string, unknown>> = [];
        let total_analisado = 0;
        let invalidas = 0;

        if (entidade !== "transportador") {
          const { data, error } = await supabase
            .from("motoristas")
            .select(
              "id, nome, situacao_operacional, mopp_vitalicio, cnh_vencimento, mopp_vencimento, antt_vencimento, alvara_vencimento, certificado_vencimento",
            )
            .order("nome", { ascending: true });
          if (error) return erro(error.message);
          for (const m of data ?? []) {
            for (const [campo, tipo] of campos) {
              if (campo === "mopp_vencimento" && m.mopp_vitalicio) continue;
              const valor = (m as Record<string, string | null>)[campo];
              if (!valor) continue;
              total_analisado++;
              const dias_para_vencer = diasEntre(hoje, valor);
              if (dias_para_vencer === null) {
                invalidas++;
                continue;
              }
              if (dias_para_vencer > dias) continue;
              itens.push({
                entidade: "motorista",
                id: m.id,
                nome: m.nome,
                tipo_documento: tipo,
                data_vencimento: valor,
                dias_para_vencer,
                vencido: dias_para_vencer < 0,
                situacao_operacional: m.situacao_operacional ?? null,
              });
            }
          }
        }

        itens.sort((a, b) => String(a.data_vencimento).localeCompare(String(b.data_vencimento)));
        const lista = itens.slice(0, limite);
        const total_vencidos = itens.filter((i) => i.vencido).length;
        return {
          total_analisado,
          total_vencidos,
          total_a_vencer: itens.length - total_vencidos,
          returned: lista.length,
          limite,
          truncated: itens.length > lista.length,
          aviso:
            (itens.length > lista.length
              ? `Resultado parcial: ${lista.length} de ${itens.length} documento(s) retornados.`
              : `Lista completa: ${lista.length} documento(s) de ${total_analisado} vencimento(s) analisados.`) +
            (invalidas > 0
              ? ` ${invalidas} registro(s) têm data inválida e foram excluídos (nenhuma data foi inferida).`
              : ""),
          filtros_aplicados: { dias, entidade, data_limite },
          vencimentos: lista,
        };
      },
    }),

    analisar_cruzamentos: tool({
      description:
        "Vínculos comprovados entre motoristas, transportadores e contratos. Ausência na lista significa ausência de registro (nada é inferido).",
      inputSchema: z.object({
        motorista_id: z.string().uuid().optional(),
        transportador_id: z.string().uuid().optional(),
        limite: z.number().int().min(1).max(200).default(100),
      }),
      execute: async ({ motorista_id, transportador_id, limite }) => {
        let linksQuery = supabase
          .from("transportador_motoristas")
          .select("motorista_id, transportador_id");
        let contratosQuery = supabase
          .from("contratos")
          .select("id, tipo, status, motorista_id, transportador_id")
          .order("created_at", { ascending: false });
        if (motorista_id) {
          linksQuery = linksQuery.eq("motorista_id", motorista_id);
          contratosQuery = contratosQuery.eq("motorista_id", motorista_id);
        }
        if (transportador_id) {
          linksQuery = linksQuery.eq("transportador_id", transportador_id);
          contratosQuery = contratosQuery.eq("transportador_id", transportador_id);
        }
        const [lRes, cRes, mRes, tRes] = await Promise.all([
          linksQuery,
          contratosQuery,
          supabase.from("motoristas").select("id, nome"),
          supabase.from("transportadores").select("id, razao_social"),
        ]);
        const err = lRes.error || cRes.error || mRes.error || tRes.error;
        if (err) return erro(err.message);

        const nomeM = new Map((mRes.data ?? []).map((m) => [m.id, m.nome]));
        const nomeT = new Map((tRes.data ?? []).map((t) => [t.id, t.razao_social]));
        const contratos = cRes.data ?? [];

        const motorista_transportador = (lRes.data ?? []).map((l) => ({
          motorista_id: l.motorista_id,
          motorista_nome: nomeM.get(l.motorista_id) ?? null,
          transportador_id: l.transportador_id,
          transportador_nome: nomeT.get(l.transportador_id) ?? null,
        }));
        const motorista_contrato = contratos
          .filter((c) => !!c.motorista_id)
          .map((c) => ({
            motorista_id: c.motorista_id,
            motorista_nome: nomeM.get(c.motorista_id) ?? null,
            contrato_id: c.id,
            contrato_tipo: c.tipo ?? null,
            contrato_status: c.status ?? null,
          }));
        const transportador_contrato = contratos
          .filter((c) => !!c.transportador_id)
          .map((c) => ({
            transportador_id: c.transportador_id,
            transportador_nome: nomeT.get(c.transportador_id) ?? null,
            contrato_id: c.id,
            contrato_tipo: c.tipo ?? null,
            contrato_status: c.status ?? null,
          }));

        const truncated =
          motorista_transportador.length > limite ||
          motorista_contrato.length > limite ||
          transportador_contrato.length > limite;

        return {
          filtros_aplicados: {
            motorista_id: motorista_id ?? null,
            transportador_id: transportador_id ?? null,
            limite,
          },
          totais: {
            motorista_transportador: motorista_transportador.length,
            motorista_contrato: motorista_contrato.length,
            transportador_contrato: transportador_contrato.length,
          },
          truncated,
          motorista_transportador: motorista_transportador.slice(0, limite),
          motorista_contrato: motorista_contrato.slice(0, limite),
          transportador_contrato: transportador_contrato.slice(0, limite),
        };
      },
    }),

    resumo_operacional: tool({
      description:
        "Panorama consolidado: totais de motoristas, transportadores e contratos + pendências e vencimentos. Ponto de partida para perguntas gerais.",
      inputSchema: z.object({
        dias: z.number().int().min(0).max(365).default(30),
        top_pendencias: z.number().int().min(1).max(20).default(5),
      }),
      execute: async ({ dias, top_pendencias }) => {
        const [mCount, tCount, cCount, tRes, lRes, mRes, cAssinados, vencRes] = await Promise.all([
          supabase.from("motoristas").select("id", { count: "exact", head: true }),
          supabase.from("transportadores").select("id", { count: "exact", head: true }),
          supabase.from("contratos").select("id", { count: "exact", head: true }),
          supabase
            .from("transportadores")
            .select("id, razao_social, status, antt_numero, alvara_numero, certificado_numero")
            .eq("status", "ativo"),
          supabase
            .from("transportador_motoristas")
            .select("transportador_id, motorista_id, motorista_proprio"),
          supabase
            .from("motoristas")
            .select("id, nome, status, cnh_vencimento, mopp_vencimento, mopp_vitalicio"),
          supabase.from("contratos").select("motorista_id").eq("status", "assinado"),
          supabase
            .from("motoristas")
            .select(
              "id, mopp_vitalicio, cnh_vencimento, mopp_vencimento, antt_vencimento, alvara_vencimento, certificado_vencimento",
            ),
        ]);

        const err =
          tRes.error || lRes.error || mRes.error || cAssinados.error || vencRes.error;
        if (err) return erro(err.message);

        const comContrato = new Set((cAssinados.data ?? []).map((c) => c.motorista_id));
        const porId = new Map((mRes.data ?? []).map((m) => [m.id, m]));
        const motivos = new Map<string, number>();
        let analisados = 0;
        let comPendencia = 0;

        for (const t of tRes.data ?? []) {
          analisados++;
          const mt = checkMotoristaAptidao({}, true, t).motivos.filter((m) =>
            m.startsWith("Transportadora"),
          );
          if (mt.length) {
            comPendencia++;
            mt.forEach((m) => motivos.set(m, (motivos.get(m) ?? 0) + 1));
          }
          for (const link of (lRes.data ?? []).filter((l) => l.transportador_id === t.id)) {
            const m = porId.get(link.motorista_id);
            if (!m) continue;
            analisados++;
            const { apto, motivos: mm } = checkMotoristaAptidao(
              m,
              comContrato.has(m.id),
              t,
              link.motorista_proprio === true,
            );
            if (!apto) {
              comPendencia++;
              mm.forEach((x) => motivos.set(x, (motivos.get(x) ?? 0) + 1));
            }
          }
        }

        const hoje = new Date().toISOString().slice(0, 10);
        let vencidos = 0;
        let aVencer = 0;
        let vencAnalisados = 0;
        const campos = [
          "cnh_vencimento",
          "mopp_vencimento",
          "antt_vencimento",
          "alvara_vencimento",
          "certificado_vencimento",
        ] as const;
        for (const m of vencRes.data ?? []) {
          for (const campo of campos) {
            if (campo === "mopp_vencimento" && m.mopp_vitalicio) continue;
            const valor = (m as Record<string, string | null>)[campo];
            if (!valor) continue;
            vencAnalisados++;
            const d = diasEntre(hoje, valor);
            if (d === null) continue;
            if (d < 0) vencidos++;
            else if (d <= dias) aVencer++;
          }
        }

        return {
          totais: {
            motoristas: mCount.count ?? null,
            transportadores: tCount.count ?? null,
            contratos: cCount.count ?? null,
            registros_analisados_pendencias: analisados,
            com_pendencias: comPendencia,
            sem_pendencias: analisados - comPendencia,
            documentos_vencidos: vencidos,
            documentos_a_vencer: aVencer,
            vencimentos_analisados: vencAnalisados,
          },
          principais_pendencias: [...motivos.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, top_pendencias)
            .map(([motivo, ocorrencias]) => ({ motivo, ocorrencias })),
          avisos: [
            "Vencimentos consideram apenas motoristas: transportadores não possuem datas de vencimento cadastradas.",
          ],
          filtros_aplicados: { dias, top_pendencias },
        };
      },
    }),
  };
}
