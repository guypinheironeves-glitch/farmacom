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
