import { Router } from "express";
import { hojeISO, query, TIMEZONE } from "../db.js";
import { wrap } from "../http-error.js";

export const painelRouter = Router();

painelRouter.get(
  "/graficos",
  wrap(async (_req, res) => {
    const hoje = hojeISO();
    const vendas = await query(
      `WITH dias AS (
         SELECT generate_series($1::DATE - 29, $1::DATE, INTERVAL '1 day')::DATE AS dia
       )
       SELECT d.dia, COALESCE(SUM(mv.quantidade), 0)::INTEGER AS unidades,
              COALESCE(ROUND(SUM(mv.quantidade * COALESCE(m.preco_venda, 0)), 2), 0) AS faturamento
         FROM dias d
         LEFT JOIN movimentacoes mv ON mv.tipo = 'saida' AND NOT mv.estornada
              AND (mv.criado_em AT TIME ZONE $2)::DATE = d.dia
         LEFT JOIN lotes l ON l.id = mv.lote_id
         LEFT JOIN medicamentos m ON m.id = l.medicamento_id
        GROUP BY d.dia ORDER BY d.dia`,
      [hoje, TIMEZONE]
    );

    const categorias = await query(
      `SELECT COALESCE(m.categoria, 'Sem categoria') AS categoria,
              ROUND(SUM(s.saldo * COALESCE(l.preco_custo, 0)), 2) AS valor
         FROM lotes l JOIN saldo_lotes s ON s.lote_id = l.id JOIN medicamentos m ON m.id = l.medicamento_id
        WHERE s.saldo > 0
        GROUP BY 1 ORDER BY valor DESC`
    );
    const principais = categorias.rows.slice(0, 5);
    const outros = categorias.rows.slice(5).reduce((a, c) => a + Number(c.valor), 0);
    if (outros > 0) principais.push({ categoria: "Outras categorias", valor: Number(outros.toFixed(2)) });

    const maisVendidos = await query(
      `SELECT m.id, m.nome, SUM(mv.quantidade)::INTEGER AS unidades
         FROM movimentacoes mv JOIN lotes l ON l.id = mv.lote_id JOIN medicamentos m ON m.id = l.medicamento_id
        WHERE mv.tipo = 'saida' AND NOT mv.estornada AND mv.criado_em >= now() - INTERVAL '30 days'
        GROUP BY m.id, m.nome ORDER BY unidades DESC LIMIT 8`
    );

    res.json({
      vendas_diarias: vendas.rows,
      estoque_por_categoria: principais,
      mais_vendidos: maisVendidos.rows,
    });
  })
);
