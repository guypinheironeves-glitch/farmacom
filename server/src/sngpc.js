import { query, TIMEZONE } from "./db.js";
import { lerConfiguracao } from "./configuracoes.js";

const TIPO_RECEITUARIO = { C1: 1, C4: 1, C5: 1, B1: 2, B2: 2, C2: 3, A1: 4, A2: 4, A3: 4, antimicrobiano: 5 };
const MOTIVO_PERDA = { baixa_vencimento: 3, baixa_avaria: 1 };

const esc = (v) =>
  String(v ?? "").replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]);
const tag = (nome, valor) => `<${nome}>${esc(valor)}</${nome}>`;
const classe = (controle) => (controle === "antimicrobiano" ? 1 : 2);

export function lerRegistroProfissional(texto) {
  const m = String(texto || "").toUpperCase().match(/(CRM|CRO|CRMV|COREN|CRF)\W*([A-Z]{2})?\W*(\d+)/);
  if (!m) return { conselho: "", uf: "", numero: String(texto || "").replace(/\D/g, "") };
  return { conselho: m[1], uf: m[2] || "", numero: m[3] };
}

async function dados(inicio, fim) {
  const periodo = [inicio, fim, TIMEZONE];
  const entradas = await query(
    `SELECT mv.id, mv.quantidade, (mv.criado_em AT TIME ZONE $3)::DATE AS data, l.codigo AS lote, l.nota_fiscal,
            m.nome, m.registro_anvisa, m.controle_especial, f.cnpj AS cnpj_fornecedor
       FROM movimentacoes mv JOIN lotes l ON l.id = mv.lote_id JOIN medicamentos m ON m.id = l.medicamento_id
       LEFT JOIN fornecedores f ON f.id = l.fornecedor_id
      WHERE mv.tipo = 'entrada' AND NOT mv.estornada AND m.controle_especial IS NOT NULL
        AND (mv.criado_em AT TIME ZONE $3)::DATE BETWEEN $1 AND $2
      ORDER BY mv.criado_em`,
    periodo
  );
  const saidas = await query(
    `SELECT mv.*, (mv.criado_em AT TIME ZONE $3)::DATE AS data, l.codigo AS lote, m.nome, m.registro_anvisa, m.controle_especial
       FROM movimentacoes mv JOIN lotes l ON l.id = mv.lote_id JOIN medicamentos m ON m.id = l.medicamento_id
      WHERE mv.tipo = 'saida' AND NOT mv.estornada AND m.controle_especial IS NOT NULL
        AND (mv.criado_em AT TIME ZONE $3)::DATE BETWEEN $1 AND $2
      ORDER BY mv.criado_em`,
    periodo
  );
  const perdas = await query(
    `SELECT mv.*, (mv.criado_em AT TIME ZONE $3)::DATE AS data, l.codigo AS lote, m.nome, m.registro_anvisa, m.controle_especial
       FROM movimentacoes mv JOIN lotes l ON l.id = mv.lote_id JOIN medicamentos m ON m.id = l.medicamento_id
      WHERE mv.tipo IN ('baixa_vencimento', 'baixa_avaria') AND NOT mv.estornada AND m.controle_especial IS NOT NULL
        AND (mv.criado_em AT TIME ZONE $3)::DATE BETWEEN $1 AND $2
      ORDER BY mv.criado_em`,
    periodo
  );
  return { entradas: entradas.rows, saidas: saidas.rows, perdas: perdas.rows };
}

export async function conferirSngpc(inicio, fim) {
  const farmacia = await lerConfiguracao("farmacia");
  const d = await dados(inicio, fim);
  const pendencias = [];
  if (!farmacia.cnpj) pendencias.push("Informe o CNPJ da farmácia em Configurações.");
  if (!farmacia.cpf_responsavel) pendencias.push("Informe o CPF do farmacêutico responsável em Configurações.");
  const semRegistro = new Set([...d.entradas, ...d.saidas, ...d.perdas].filter((m) => !m.registro_anvisa).map((m) => m.nome));
  semRegistro.forEach((nome) => pendencias.push(`${nome} está sem número de registro na Anvisa.`));
  d.entradas.filter((e) => !e.nota_fiscal).forEach((e) => pendencias.push(`Entrada do lote ${e.lote} (${e.nome}) sem nota fiscal vinculada.`));
  return {
    inicio,
    fim,
    totais: { entradas: d.entradas.length, saidas: d.saidas.length, perdas: d.perdas.length },
    pendencias,
  };
}

export async function gerarSngpc(inicio, fim) {
  const farmacia = await lerConfiguracao("farmacia");
  const d = await dados(inicio, fim);

  const entradas = d.entradas.map((e) =>
    [
      "<entradaMedicamentos>",
      "<notaFiscalEntradaMedicamento>",
      tag("numeroNotaFiscal", e.nota_fiscal ? e.nota_fiscal.slice(25, 34).replace(/^0+/, "") : ""),
      tag("tipoOperacaoNotaFiscal", 1),
      tag("dataNotaFiscal", e.data),
      tag("cnpjOrigem", e.cnpj_fornecedor || ""),
      tag("cnpjDestino", farmacia.cnpj),
      "</notaFiscalEntradaMedicamento>",
      "<medicamentoEntrada>",
      tag("classeTerapeutica", classe(e.controle_especial)),
      tag("registroMSMedicamento", e.registro_anvisa || ""),
      tag("numeroLoteMedicamento", e.lote),
      tag("quantidadeMedicamento", e.quantidade),
      tag("unidadeMedidaMedicamento", 1),
      "</medicamentoEntrada>",
      tag("dataRecebimentoMedicamento", e.data),
      "</entradaMedicamentos>",
    ].join("")
  );

  const saidas = d.saidas.map((s) => {
    const reg = lerRegistroProfissional(s.prescritor_registro);
    return [
      "<saidaMedicamentoVendaAoConsumidor>",
      tag("tipoReceituarioMedicamento", TIPO_RECEITUARIO[s.controle_especial] || 1),
      tag("numeroNotificacaoMedicamento", s.receita_numero || ""),
      tag("dataPrescricaoMedicamento", s.receita_data ? String(s.receita_data).slice(0, 10) : ""),
      "<prescritorMedicamento>",
      tag("nomePrescritor", s.prescritor_nome),
      tag("numeroRegistroProfissional", reg.numero),
      tag("conselhoProfissional", reg.conselho),
      tag("UFConselho", reg.uf),
      "</prescritorMedicamento>",
      tag("usoMedicamento", 1),
      "<compradorMedicamento>",
      tag("nomeComprador", s.paciente_nome),
      "</compradorMedicamento>",
      "<medicamentoVenda>",
      tag("usoProlongado", "N"),
      tag("registroMSMedicamento", s.registro_anvisa || ""),
      tag("numeroLoteMedicamento", s.lote),
      tag("quantidadeMedicamento", s.quantidade),
      tag("unidadeMedidaMedicamento", 1),
      "</medicamentoVenda>",
      tag("dataVendaMedicamento", s.data),
      "</saidaMedicamentoVendaAoConsumidor>",
    ].join("");
  });

  const perdas = d.perdas.map((p) =>
    [
      "<saidaMedicamentoPerda>",
      tag("motivoPerdaMedicamento", MOTIVO_PERDA[p.tipo]),
      "<medicamentoPerda>",
      tag("classeTerapeutica", classe(p.controle_especial)),
      tag("registroMSMedicamento", p.registro_anvisa || ""),
      tag("numeroLoteMedicamento", p.lote),
      tag("quantidadeMedicamento", p.quantidade),
      tag("unidadeMedidaMedicamento", 1),
      "</medicamentoPerda>",
      tag("dataPerdaMedicamento", p.data),
      "</saidaMedicamentoPerda>",
    ].join("")
  );

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<mensagemSNGPC xmlns="urn:sngpc-schema">',
    "<cabecalho>",
    tag("cnpjEmissor", farmacia.cnpj),
    tag("cpfTransmissor", farmacia.cpf_responsavel),
    tag("dataInicio", inicio),
    tag("dataFim", fim),
    "</cabecalho>",
    "<corpo>",
    "<medicamentos>",
    ...entradas,
    ...saidas,
    ...perdas,
    "</medicamentos>",
    "<insumos/>",
    "</corpo>",
    "</mensagemSNGPC>",
  ].join("\n");
  return xml;
}
