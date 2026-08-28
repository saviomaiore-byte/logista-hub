import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { SITUACAO_LABELS, type TransportadorComMotoristas } from "./types";

export interface RelatorioResumo {
  totalMotoristas: number;
  aptos: number;
  inaptos: number;
  emPraca: number;
  emViagem: number;
  totalTransportadoras: number;
}

// ─── PDF generation (returns jsPDF doc) ───
export function buildPdfDoc(dados: TransportadorComMotoristas[], resumo: RelatorioResumo): jsPDF {
  const doc = new jsPDF({ orientation: "landscape" });
  const dataAtual = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });

  doc.setFontSize(16);
  doc.text("Relatório Semanal de Motoristas", 14, 20);
  doc.setFontSize(10);
  doc.text(`Gerado em: ${dataAtual}`, 14, 28);

  let startY = 35;

  dados.forEach((t) => {
    if (startY > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      startY = 20;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`${t.razao_social} — CNPJ: ${t.cpf_cnpj}`, 14, startY);
    startY += 6;

    if (t.motoristas.length === 0) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Nenhum motorista vinculado.", 14, startY);
      startY += 10;
      return;
    }

    const tableData = t.motoristas.map((m) => [
      m.nome,
      m.cpf,
      m.apto ? "APTO" : "INAPTO",
      m.status === "ativo" ? "Ativo" : "Inativo",
      SITUACAO_LABELS[t.situacao_operacional || "em_praca_apto"] || "Em Praça",
      m.tem_contrato ? "Sim" : "Não",
      t.antt_numero ? "Sim" : "Não",
      t.certificado_numero ? "Sim" : "Não",
      t.alvara_numero ? "Sim" : "Não",
      m.apto ? "" : m.motivos_inaptidao.join("; "),
    ]);

    autoTable(doc, {
      startY,
      head: [["Nome", "CPF", "Aptidão", "Status", "Situação", "Contrato", "ANTT", "Certificado", "Alvará", "Motivos Inaptidão"]],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [34, 49, 74], textColor: 255, fontSize: 8 },
      columnStyles: {
        2: { fontStyle: "bold" },
        9: { cellWidth: 50 },
      },
      didParseCell: (data) => {
        if (data.column.index === 2 && data.section === "body") {
          if (data.cell.raw === "INAPTO") {
            data.cell.styles.textColor = [220, 38, 38];
          } else {
            data.cell.styles.textColor = [22, 163, 74];
          }
        }
      },
      margin: { left: 14, right: 14 },
    });

    startY = (doc as any).lastAutoTable.finalY + 12;
  });

  // Summary page
  doc.addPage();
  doc.setFontSize(14);
  doc.text("Resumo", 14, 20);

  autoTable(doc, {
    startY: 30,
    head: [["Indicador", "Quantidade"]],
    body: [
      ["Total de Transportadoras", resumo.totalTransportadoras.toString()],
      ["Total de Motoristas", resumo.totalMotoristas.toString()],
      ["Motoristas Aptos", resumo.aptos.toString()],
      ["Motoristas Inaptos", resumo.inaptos.toString()],
      ["Em Praça", resumo.emPraca.toString()],
      ["Em Viagem", resumo.emViagem.toString()],
    ],
    headStyles: { fillColor: [34, 49, 74] },
    styles: { fontSize: 11 },
  });

  return doc;
}
