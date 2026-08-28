import * as XLSX from "xlsx";
import { SITUACAO_LABELS, formatDate, type TransportadorComMotoristas } from "./types";
import type { RelatorioResumo } from "./relatorioPdf";

// ─── Excel generation (returns workbook) ───
export function buildExcelWorkbook(dados: TransportadorComMotoristas[], resumo: RelatorioResumo): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  dados.forEach((t) => {
    const sheetData = t.motoristas.map((m) => ({
      Nome: m.nome,
      CPF: m.cpf,
      Aptidão: m.apto ? "APTO" : "INAPTO",
      Status: m.status === "ativo" ? "Ativo" : "Inativo",
      "Situação Operacional": SITUACAO_LABELS[t.situacao_operacional || "em_praca_apto"] || "Em Praça",
      "Contrato Assinado": m.tem_contrato ? "Sim" : "Não",
      "ANTT (Transportadora)": t.antt_numero ? "Sim" : "Não",
      "Certificado (Transportadora)": t.certificado_numero ? "Sim" : "Não",
      "Alvará (Transportadora)": t.alvara_numero ? "Sim" : "Não",
      "CNH Nº": m.cnh_numero || "",
      "CNH Vencimento": formatDate(m.cnh_vencimento),
      "Motivos Inaptidão": m.motivos_inaptidao.join("; "),
    }));

    const ws = XLSX.utils.json_to_sheet(sheetData);
    const sheetName = t.razao_social.substring(0, 31).replace(/[\\\/\?\*\[\]]/g, "");
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  const summaryData = [
    { Indicador: "Total de Transportadoras", Quantidade: resumo.totalTransportadoras },
    { Indicador: "Total de Motoristas", Quantidade: resumo.totalMotoristas },
    { Indicador: "Motoristas Aptos", Quantidade: resumo.aptos },
    { Indicador: "Motoristas Inaptos", Quantidade: resumo.inaptos },
    { Indicador: "Em Praça", Quantidade: resumo.emPraca },
    { Indicador: "Em Viagem", Quantidade: resumo.emViagem },
  ];
  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWs, "Resumo");

  return wb;
}
