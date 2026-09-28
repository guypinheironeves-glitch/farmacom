// Formatação no padrão brasileiro
export const dataBR = (iso) => {
  if (!iso) return "-";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
};

export const dataHoraBR = (iso) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "-";

export const moeda = (v) =>
  (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const numero = (v) => (Number(v) || 0).toLocaleString("pt-BR");

// Data de hoje (fuso do navegador) no formato AAAA-MM-DD, com deslocamento em dias
export const hojeISO = (deslocamento = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + deslocamento);
  return d.toLocaleDateString("sv-SE");
};

export const TIPOS_MOV = {
  entrada: { rotulo: "Entrada", sinal: "+", classe: "entrada" },
  saida: { rotulo: "Saída (venda)", sinal: "-", classe: "saida" },
  baixa_vencimento: { rotulo: "Baixa por vencimento", sinal: "-", classe: "baixa" },
  baixa_avaria: { rotulo: "Baixa por avaria", sinal: "-", classe: "baixa" },
};

// Situação de validade de um lote
export function situacaoValidade(dias) {
  if (dias === null || dias === undefined) return { rotulo: "-", classe: "neutro" };
  if (dias < 0) return { rotulo: `Vencido há ${-dias} ${-dias === 1 ? "dia" : "dias"}`, classe: "perigo" };
  if (dias === 0) return { rotulo: "Vence hoje", classe: "perigo" };
  if (dias <= 30) return { rotulo: `Vence em ${dias} ${dias === 1 ? "dia" : "dias"}`, classe: "alerta" };
  if (dias <= 90) return { rotulo: `Vence em ${dias} dias`, classe: "atencao" };
  return { rotulo: "Em dia", classe: "ok" };
}

// Gera e baixa um arquivo CSV (abre no Excel com acentos corretos)
export function baixarCSV(nomeArquivo, colunas, linhas) {
  const esc = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const conteudo = [colunas.map((c) => esc(c.titulo)).join(";")]
    .concat(linhas.map((l) => colunas.map((c) => esc(c.valor(l))).join(";")))
    .join("\r\n");
  const blob = new Blob(["﻿" + conteudo], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}
