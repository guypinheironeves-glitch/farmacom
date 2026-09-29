import { Router } from "express";
import { z } from "zod";
import { TIMEZONE, hojeISO, query } from "../db.js";
import { wrap } from "../http-error.js";

export const relatoriosRouter = Router();

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data no formato AAAA-MM-DD.");
const periodoSchema = z
  .object({ inicio: data, fim: data })
  .refine((p) => p.inicio <= p.fim, { message: "A data inicial deve ser anterior à final.", path: ["inicio"] });

function periodo(req) {
  return periodoSchema.parse({
    inicio: req.query.inicio || hojeISO(-30),
    fim: req.query.fim || hojeISO(),
  });
}

// Perdas: baixas por vencimento e por avaria no período, com valor pelo preço de custo do lote
relatoriosRouter.get(
  "/perdas",
  wrap(async (req, res) => {
    const { inicio, fim } = periodo(req);
    const { rows } = await query(
      `SELECT m.id AS medicamento_id, m.nome AS medicamento, l.codigo AS lote, l.validade, mv.tipo,
              SUM(mv.quantidade)::INTEGER AS quantidade,
              ROUND(SUM(mv.quantidade * COALESCE(l.preco_custo, 0)), 2) AS valor
         FROM movimentacoes mv
         JOIN lotes l ON l.id = mv.lote_id
         JOIN medicamentos m ON m.id = l.medicamento_id
        WHERE mv.tipo IN ('baixa_vencimento', 'baixa_avaria')
          AND (mv.criado_em AT TIME ZONE $3)::DATE BETWEEN $1 AND $2
        GROUP BY m.id, m.nome, l.codigo, l.validade, mv.tipo
        ORDER BY valor DESC, m.nome`,
      [inicio, fim, TIMEZONE]
    );
    const soma = (tipo, campo) =>
      Number(rows.filter((r) => !tipo || r.tipo === tipo).reduce((a, r) => a + Number(r[campo]), 0).toFixed(2));
    res.json({
      inicio,
      fim,
      totais: {
        quantidade: soma(null, "quantidade"),
        valor: soma(null, "valor"),
        vencimento: { quantidade: soma("baixa_vencimento", "quantidade"), valor: soma("baixa_vencimento", "valor") },
        avaria: { quantidade: soma("baixa_avaria", "quantidade"), valor: soma("baixa_avaria", "valor") },
      },
      itens: rows,
    });
  })
);

// Movimentação: totais por tipo e por medicamento no período
relatoriosRouter.get(
  "/movimentacao",
  wrap(async (req, res) => {
    const { inicio, fim } = periodo(req);
    const { rows } = await query(
      `SELECT m.id AS medicamento_id, m.nome AS medicamento,
              COALESCE(SUM(mv.quantidade) FILTER (WHERE mv.tipo = 'entrada'), 0)::INTEGER AS entradas,
              COALESCE(SUM(mv.quantidade) FILTER (WHERE mv.tipo = 'saida'), 0)::INTEGER AS saidas,
              COALESCE(SUM(mv.quantidade) FILTER (WHERE mv.tipo IN ('baixa_vencimento', 'baixa_avaria')), 0)::INTEGER AS baixas
         FROM movimentacoes mv
         JOIN lotes l ON l.id = mv.lote_id
         JOIN medicamentos m ON m.id = l.medicamento_id
        WHERE (mv.criado_em AT TIME ZONE $3)::DATE BETWEEN $1 AND $2
        GROUP BY m.id, m.nome
        ORDER BY m.nome`,
      [inicio, fim, TIMEZONE]
    );
    const total = (c) => rows.reduce((a, r) => a + r[c], 0);
    res.json({
      inicio,
      fim,
      totais: { entradas: total("entradas"), saidas: total("saidas"), baixas: total("baixas") },
      itens: rows,
    });
  })
);

// Curva ABC: classifica os medicamentos pelo faturamento das vendas no período
// A = até 80% do faturamento acumulado, B = de 80% a 95%, C = o restante
relatoriosRouter.get(
  "/curva-abc",
  wrap(async (req, res) => {
    const { inicio, fim } = periodo(req);
    const { rows } = await query(
      `SELECT m.id AS medicamento_id, m.nome AS medicamento, m.categoria,
              SUM(mv.quantidade)::INTEGER AS quantidade,
              ROUND(SUM(mv.quantidade * COALESCE(m.preco_venda, 0)), 2) AS faturamento
         FROM movimentacoes mv
         JOIN lotes l ON l.id = mv.lote_id
         JOIN medicamentos m ON m.id = l.medicamento_id
        WHERE mv.tipo = 'saida' AND (mv.criado_em AT TIME ZONE $3)::DATE BETWEEN $1 AND $2
        GROUP BY m.id, m.nome, m.categoria
        ORDER BY faturamento DESC, quantidade DESC, m.nome`,
      [inicio, fim, TIMEZONE]
    );
    const total = rows.reduce((a, r) => a + Number(r.faturamento), 0);
    let acumulado = 0;
    const itens = rows.map((r) => {
      const antes = acumulado;
      acumulado += Number(r.faturamento);
      const percentual = total ? (Number(r.faturamento) / total) * 100 : 0;
      // A classe é decidida pelo acumulado antes do item: o item que cruza os 80% ainda é A
      const classe = total === 0 ? "C" : antes / total < 0.8 ? "A" : antes / total < 0.95 ? "B" : "C";
      return {
        ...r,
        percentual: Number(percentual.toFixed(2)),
        acumulado: Number((total ? (acumulado / total) * 100 : 0).toFixed(2)),
        classe,
      };
    });
    const resumo = ["A", "B", "C"].map((c) => {
      const grupo = itens.filter((i) => i.classe === c);
      return {
        classe: c,
        itens: grupo.length,
        faturamento: Number(grupo.reduce((a, i) => a + Number(i.faturamento), 0).toFixed(2)),
      };
    });
    res.json({ inicio, fim, total: Number(total.toFixed(2)), resumo, itens });
  })
);

// Livro de medicamentos com controle especial: saídas com os dados da receita (base para o SNGPC)
relatoriosRouter.get(
  "/controlados",
  wrap(async (req, res) => {
    const { inicio, fim } = periodo(req);
    const { rows } = await query(
      `SELECT mv.id, mv.criado_em, mv.quantidade, mv.receita_numero, mv.receita_data,
              mv.prescritor_nome, mv.prescritor_registro, mv.paciente_nome,
              m.id AS medicamento_id, m.nome AS medicamento, m.controle_especial, l.codigo AS lote
         FROM movimentacoes mv
         JOIN lotes l ON l.id = mv.lote_id
         JOIN medicamentos m ON m.id = l.medicamento_id
        WHERE mv.tipo = 'saida' AND m.controle_especial IS NOT NULL
          AND (mv.criado_em AT TIME ZONE $3)::DATE BETWEEN $1 AND $2
        ORDER BY mv.criado_em DESC`,
      [inicio, fim, TIMEZONE]
    );
    res.json({ inicio, fim, total_unidades: rows.reduce((a, r) => a + r.quantidade, 0), itens: rows });
  })
);
