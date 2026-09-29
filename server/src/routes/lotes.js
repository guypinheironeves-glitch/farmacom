import { Router } from "express";
import { z } from "zod";
import { hojeISO, query, transaction } from "../db.js";
import { HttpError, parseId, wrap } from "../http-error.js";

export const lotesRouter = Router();

const edicaoSchema = z.object({
  codigo: z.string().trim().min(1, "Informe o código do lote.").max(60),
  validade: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data no formato AAAA-MM-DD."),
  fornecedor_id: z.coerce.number().int().positive().optional().nullable(),
  preco_custo: z.coerce.number().min(0).optional().nullable(),
});

const inventarioSchema = z.object({
  contagem: z.coerce.number().int("Use um número inteiro.").min(0, "A contagem não pode ser negativa."),
  observacao: z.string().trim().max(255).optional().nullable(),
});

lotesRouter.get(
  "/",
  wrap(async (req, res) => {
    const medicamentoId = req.query.medicamento_id ? parseId(req.query.medicamento_id) : null;
    const { rows } = await query(
      `SELECT l.*, s.saldo, m.nome AS medicamento, m.controle_especial, m.tarja, f.nome AS fornecedor,
              (l.validade - $2::DATE) AS dias_para_vencer
         FROM lotes l
         JOIN saldo_lotes s ON s.lote_id = l.id
         JOIN medicamentos m ON m.id = l.medicamento_id
         LEFT JOIN fornecedores f ON f.id = l.fornecedor_id
        WHERE $1::INTEGER IS NULL OR l.medicamento_id = $1
        ORDER BY m.nome, l.validade`,
      [medicamentoId, hojeISO()]
    );
    res.json(rows);
  })
);

lotesRouter.put(
  "/:id",
  wrap(async (req, res) => {
    const id = parseId(req.params.id);
    const d = edicaoSchema.parse(req.body);
    const { rows } = await query(
      `UPDATE lotes SET codigo = $1, validade = $2, fornecedor_id = $3, preco_custo = $4
        WHERE id = $5 RETURNING *`,
      [d.codigo, d.validade, d.fornecedor_id ?? null, d.preco_custo ?? null, id]
    );
    if (!rows[0]) throw new HttpError(404, "Lote não encontrado.");
    res.json(rows[0]);
  })
);

lotesRouter.post(
  "/:id/inventario",
  wrap(async (req, res) => {
    const id = parseId(req.params.id);
    const d = inventarioSchema.parse(req.body);
    const resultado = await transaction(async (db) => {
      const lote = await db.query("SELECT id FROM lotes WHERE id = $1 FOR UPDATE", [id]);
      if (!lote.rows[0]) throw new HttpError(404, "Lote não encontrado.");
      const { rows } = await db.query("SELECT saldo FROM saldo_lotes WHERE lote_id = $1", [id]);
      const diferenca = d.contagem - rows[0].saldo;
      if (diferenca === 0) return { diferenca, saldo: d.contagem };
      await db.query(
        `INSERT INTO movimentacoes (lote_id, tipo, quantidade, observacao, usuario_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, diferenca > 0 ? "ajuste_entrada" : "ajuste_saida", Math.abs(diferenca), d.observacao || "Ajuste de inventário", req.usuario.id]
      );
      return { diferenca, saldo: d.contagem };
    });
    res.status(201).json(resultado);
  })
);
