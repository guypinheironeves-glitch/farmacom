import { Router } from "express";
import { hojeISO, query } from "../db.js";
import { wrap } from "../http-error.js";

export const alertasRouter = Router();

// Alertas de validade (lotes com saldo que vencem dentro do prazo, incluindo os já vencidos)
// e de estoque baixo (medicamentos com saldo abaixo do mínimo)
alertasRouter.get(
  "/",
  wrap(async (req, res) => {
    const dias = Math.max(0, Math.min(Number(req.query.dias) || 60, 365));

    const validade = await query(
      `SELECT l.id AS lote_id, l.codigo AS lote, l.validade, s.saldo, l.preco_custo,
              m.id AS medicamento_id, m.nome AS medicamento,
              (l.validade - $2::DATE) AS dias_para_vencer
         FROM lotes l
         JOIN saldo_lotes s ON s.lote_id = l.id
         JOIN medicamentos m ON m.id = l.medicamento_id
        WHERE s.saldo > 0 AND l.validade <= $2::DATE + $1::INTEGER
        ORDER BY l.validade`,
      [dias, hojeISO()]
    );

    const estoque = await query(
      `SELECT m.id AS medicamento_id, m.nome AS medicamento, m.estoque_minimo,
              COALESCE(SUM(s.saldo) FILTER (WHERE l.validade >= $1::DATE), 0)::INTEGER AS saldo_utilizavel
         FROM medicamentos m
         LEFT JOIN lotes l ON l.medicamento_id = m.id
         LEFT JOIN saldo_lotes s ON s.lote_id = l.id
        GROUP BY m.id
       HAVING COALESCE(SUM(s.saldo) FILTER (WHERE l.validade >= $1::DATE), 0) < m.estoque_minimo
        ORDER BY m.nome`,
      [hojeISO()]
    );

    const vencidos = validade.rows.filter((l) => l.dias_para_vencer < 0);
    res.json({
      dias,
      resumo: {
        lotes_vencidos: vencidos.length,
        lotes_a_vencer: validade.rows.length - vencidos.length,
        estoque_baixo: estoque.rows.length,
        valor_em_risco: Number(
          validade.rows.reduce((acc, l) => acc + (l.preco_custo || 0) * l.saldo, 0).toFixed(2)
        ),
      },
      validade: validade.rows,
      estoque_baixo: estoque.rows,
    });
  })
);
