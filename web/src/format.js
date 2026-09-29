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
  ajuste_entrada: { rotulo: "Ajuste (sobra)", sinal: "+", classe: "ajuste", automatico: true },
  ajuste_saida: { rotulo: "Ajuste (falta)", sinal: "-", classe: "ajuste", automatico: true },
};

export function periodoDoDia(hora = new Date().getHours()) {
  if (hora < 5) return { id: "madrugada", saudacao: "Boa madrugada", icone: "estrela" };
  if (hora < 12) return { id: "manha", saudacao: "Bom dia", icone: "amanhecer" };
  if (hora < 18) return { id: "tarde", saudacao: "Boa tarde", icone: "sol" };
  return { id: "noite", saudacao: "Boa noite", icone: "lua" };
}

const FUSOS_BRASIL = {
  "-2": "Horário de Fernando de Noronha",
  "-3": "Horário de Brasília",
  "-4": "Horário do Amazonas",
  "-5": "Horário do Acre",
};

export function regiaoDoFuso(data = new Date()) {
  const fuso = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const horas = -data.getTimezoneOffset() / 60;
  const utc = `UTC${horas >= 0 ? "+" : "−"}${Math.abs(horas)}`;
  const noBrasil = /^America\/(Sao_Paulo|Fortaleza|Recife|Bahia|Belem|Maceio|Araguaina|Santarem|Manaus|Cuiaba|Campo_Grande|Porto_Velho|Boa_Vista|Rio_Branco|Eirunepe|Noronha)$/.test(fuso) || fuso === "Brazil/East";
  if (noBrasil && FUSOS_BRASIL[horas]) return `${FUSOS_BRASIL[horas]} (${utc})`;
  const cidade = fuso.split("/").pop()?.replace(/_/g, " ");
  return cidade ? `${cidade} (${utc})` : utc;
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
