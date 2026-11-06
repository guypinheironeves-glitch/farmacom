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

// Mesmo fuso da API, para "vencido" e "hoje" baterem mesmo se o computador estiver com outro horário
const FUSO = "America/Sao_Paulo";
export const hojeISO = (deslocamento = 0) =>
  new Date(Date.now() + deslocamento * 86400000).toLocaleDateString("sv-SE", { timeZone: FUSO });

export const TIPOS_MOV = {
  entrada: { rotulo: "Entrada", sinal: "+", classe: "entrada" },
  saida: { rotulo: "Saída (venda)", sinal: "-", classe: "saida" },
  baixa_vencimento: { rotulo: "Baixa por vencimento", sinal: "-", classe: "baixa" },
  baixa_avaria: { rotulo: "Baixa por avaria", sinal: "-", classe: "baixa" },
  ajuste_entrada: { rotulo: "Ajuste (sobra)", sinal: "+", classe: "ajuste", automatico: true },
  ajuste_saida: { rotulo: "Ajuste (falta)", sinal: "-", classe: "ajuste", automatico: true },
};

export function saudacao(hora = new Date().getHours()) {
  if (hora < 5) return "Boa noite";
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

export const dataLocal = (iso) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "-");

export const telefoneFormatado = (v) => {
  const d = String(v || "").replace(/\D/g, "");
  if (d.length === 10) return d.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  if (d.length === 11) return d.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  return v || "";
};

export const cnpjFormatado = (v) => {
  const d = String(v || "").replace(/\D/g, "");
  return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : v || "-";
};

export function situacaoValidade(dias) {
  if (dias === null || dias === undefined) return { rotulo: "-", classe: "neutro" };
  if (dias < 0) return { rotulo: `Vencido há ${-dias} ${-dias === 1 ? "dia" : "dias"}`, classe: "perigo" };
  if (dias === 0) return { rotulo: "Vence hoje", classe: "perigo" };
  if (dias <= 30) return { rotulo: `Vence em ${dias} ${dias === 1 ? "dia" : "dias"}`, classe: "alerta" };
  if (dias <= 90) return { rotulo: `Vence em ${dias} dias`, classe: "atencao" };
  return { rotulo: "Dentro da validade", classe: "ok" };
}

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

export const moedaCurta = (v) => {
  const n = Number(v) || 0;
  if (n >= 1000) return `R$ ${(n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return `R$ ${Math.round(n).toLocaleString("pt-BR")}`;
};

export const nomeMes = (aaaamm, longo = false) => {
  const [a, m] = aaaamm.split("-").map(Number);
  const d = new Date(a, m - 1, 1);
  return longo
    ? d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
};
