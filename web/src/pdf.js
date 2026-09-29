import { dataBR } from "./format.js";

function corDestaque() {
  const hex = getComputedStyle(document.documentElement).getPropertyValue("--destaque").trim() || "#14746f";
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export async function baixarPDF({ nomeArquivo, titulo, farmacia, inicio, fim, resumo = [], colunas, linhas, totais, observacao }) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ orientation: colunas.length > 6 ? "landscape" : "portrait", unit: "mm", format: "a4" });
  const largura = doc.internal.pageSize.getWidth();
  const cor = corDestaque();

  doc.setFillColor(...cor);
  doc.rect(0, 0, largura, 26, "F");
  doc.setTextColor(245, 245, 245);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(titulo, 14, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(`${farmacia || "FarmaCom"}  |  Período: ${dataBR(inicio)} a ${dataBR(fim)}`, 14, 19.5);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, largura - 14, 19.5, { align: "right" });

  let y = 34;
  if (resumo.length) {
    doc.setTextColor(30, 40, 42);
    const larguraItem = (largura - 28) / resumo.length;
    resumo.forEach((r, i) => {
      const x = 14 + i * larguraItem;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(String(r.valor), x, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(90, 102, 106);
      doc.text(doc.splitTextToSize(r.rotulo, larguraItem - 4), x, y + 5);
      doc.setTextColor(30, 40, 42);
    });
    y += 16;
  }

  autoTable(doc, {
    startY: y,
    head: [colunas.map((c) => c.titulo)],
    body: linhas.map((l) => colunas.map((c) => c.pdf ? c.pdf(l) : c.valor(l))),
    foot: totais ? [colunas.map((c, i) => (totais[i] ?? ""))] : undefined,
    theme: "grid",
    styles: { font: "helvetica", fontSize: 8.5, cellPadding: 2, lineColor: [220, 225, 224], textColor: [30, 40, 42] },
    headStyles: { fillColor: cor, textColor: [245, 245, 245], fontStyle: "bold" },
    footStyles: { fillColor: [235, 238, 237], textColor: [30, 40, 42], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [247, 247, 247] },
    columnStyles: Object.fromEntries(colunas.map((c, i) => [i, c.numero ? { halign: "right" } : {}])),
    margin: { left: 14, right: 14 },
    didDrawPage: () => {
      const altura = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(130, 140, 140);
      doc.text(`FarmaCom  |  página ${doc.getCurrentPageInfo().pageNumber}`, largura - 14, altura - 8, { align: "right" });
    },
  });

  if (observacao) {
    const fimTabela = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(8.5);
    doc.setTextColor(90, 102, 106);
    doc.text(doc.splitTextToSize(observacao, largura - 28), 14, fimTabela);
  }

  doc.save(nomeArquivo);
}
