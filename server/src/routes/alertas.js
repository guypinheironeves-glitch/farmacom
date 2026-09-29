import { Router } from "express";
import { hojeISO, query } from "../db.js";
import { wrap } from "../http-error.js";

export const alertasRouter = Router();

const COBERTURA_DIAS = 30;

alertasRouter.get(
  "/",
  wrap(async (req, res) => {
    const dias = Math.max(0, Math.min(Number(req.query.dias) || 60, 365));
    const hoje = hojeISO();

    const validade = await query(
      `SELECT l.id AS lote_id, l.codigo AS lote, l.validade, s.saldo, l.preco_custo,
              m.id AS medicamento_id, m.nome AS medicamento, m.tarja, m.controle_especial,
              (l.validade - $2::DATE) AS dias_para_vencer
         FROM lotes l
         JOIN saldo_lotes s ON s.lote_id = l.id
         JOIN medicamentos m ON m.id = l.medicamento_id
        WHERE s.saldo > 0 AND l.validade <= $2::DATE + $1::INTEGER
        ORDER BY l.validade`,
      [dias, hoje]
    );

    const estoque = await query(
      `WITH saldo AS (
         SELECT m.id, COALESCE(SUM(s.saldo) FILTER (WHERE l.validade >= $1::DATE), 0)::INTEGER AS saldo_utilizavel
           FROM medicamentos m
           LEFT JOIN lotes l ON l.medicamento_id = m.id
           LEFT JOIN saldo_lotes s ON s.lote_id = l.id
          GROUP BY m.id
       ), vendas AS (
         SELECT l.medicamento_id AS id, SUM(mv.quantidade)::INTEGER AS vendidos
           FROM movimentacoes mv JOIN lotes l ON l.id = mv.lote_id
          WHERE mv.tipo = 'saida' AND NOT mv.estornada AND mv.criado_em >= now() - INTERVAL '30 days'
          GROUP BY l.medicamento_id
       )
       SELECT m.id AS medicamento_id, m.nome AS medicamento, m.estoque_minimo, m.fabricante,
              sd.saldo_utilizavel, COALESCE(v.vendidos, 0) AS vendidos_30_dias
         FROM medicamentos m
         JOIN saldo sd ON sd.id = m.id
         LEFT JOIN vendas v ON v.id = m.id
        WHERE sd.saldo_utilizavel < m.estoque_minimo
        ORDER BY (m.estoque_minimo - sd.saldo_utilizavel) DESC, m.nome`,
      [hoje]
    );
    const estoqueBaixo = estoque.rows.map((m) => {
      const mediaDiaria = m.vendidos_30_dias / 30;
      const necessidade = Math.ceil(mediaDiaria * COBERTURA_DIAS + m.estoque_minimo - m.saldo_utilizavel);
      return { ...m, sugestao_compra: Math.max(necessidade, m.estoque_minimo - m.saldo_utilizavel) };
    });

    const total = await query(
      `SELECT COALESCE(SUM(s.saldo * COALESCE(l.preco_custo, 0)), 0)::NUMERIC(12,2) AS valor,
              COALESCE(SUM(s.saldo), 0)::INTEGER AS unidades,
              COUNT(DISTINCT l.medicamento_id) FILTER (WHERE s.saldo > 0)::INTEGER AS medicamentos
         FROM lotes l JOIN saldo_lotes s ON s.lote_id = l.id`
    );

    const meses = await query(
      `SELECT TO_CHAR(DATE_TRUNC('month', l.validade), 'YYYY-MM') AS mes,
              SUM(s.saldo)::INTEGER AS unidades,
              ROUND(SUM(s.saldo * COALESCE(l.preco_custo, 0)), 2) AS valor,
              COUNT(*)::INTEGER AS lotes
         FROM lotes l JOIN saldo_lotes s ON s.lote_id = l.id
        WHERE s.saldo > 0
          AND l.validade >= DATE_TRUNC('month', $1::DATE)
          AND l.validade < DATE_TRUNC('month', $1::DATE) + INTERVAL '6 months'
        GROUP BY 1 ORDER BY 1`,
      [hoje]
    );
    const vencimentosPorMes = [];
    const [ano, mes] = hoje.split("-").map(Number);
    for (let i = 0; i < 6; i++) {
      const d = new Date(Date.UTC(ano, mes - 1 + i, 1));
      const chave = d.toISOString().slice(0, 7);
      const achado = meses.rows.find((r) => r.mes === chave);
      vencimentosPorMes.push({ mes: chave, unidades: achado?.unidades || 0, valor: achado?.valor || 0, lotes: achado?.lotes || 0 });
    }

    const vencidos = validade.rows.filter((l) => l.dias_para_vencer < 0);
    res.json({
      dias,
      resumo: {
        lotes_vencidos: vencidos.length,
        lotes_a_vencer: validade.rows.length - vencidos.length,
        estoque_baixo: estoqueBaixo.length,
        valor_em_risco: Number(validade.rows.reduce((acc, l) => acc + (l.preco_custo || 0) * l.saldo, 0).toFixed(2)),
        valor_estoque: total.rows[0].valor,
        unidades_estoque: total.rows[0].unidades,
        medicamentos_com_estoque: total.rows[0].medicamentos,
      },
      validade: validade.rows,
      estoque_baixo: estoqueBaixo,
      vencimentos_por_mes: vencimentosPorMes,
    });
  })
);
