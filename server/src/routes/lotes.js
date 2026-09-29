import { Router } from "express";
import { z } from "zod";
import { hojeISO, query } from "../db.js";
import { HttpError, parseId, wrap } from "../http-error.js";

export const lotesRouter = Router();

const edicaoSchema = z.object({
  codigo: z.string().trim().min(1, "Informe o código do lote.").max(60),
  validade: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data no formato AAAA-MM-DD."),
  fornecedor: z.string().trim().max(160).optional().nullable().transform((v) => (v ? v : null)),
  preco_custo: z.coerce.number().min(0).optional().nullable(),
});

lotesRouter.get(
  "/",
  wrap(async (req, res) => {
    const medicamentoId = req.query.medicamento_id ? parseId(req.query.medicamento_id) : null;
    const { rows } = await query(
      `SELECT l.*, s.saldo, m.nome AS medicamento, m.controle_especial, m.tarja, (l.validade - $2::DATE) AS dias_para_vencer
         FROM lotes l
         JOIN saldo_lotes s ON s.lote_id = l.id
         JOIN medicamentos m ON m.id = l.medicamento_id
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
      `UPDATE lotes SET codigo = $1, validade = $2, fornecedor = $3, preco_custo = $4
        WHERE id = $5 RETURNING *`,
      [d.codigo, d.validade, d.fornecedor, d.preco_custo ?? null, id]
    );
    if (!rows[0]) throw new HttpError(404, "Lote não encontrado.");
    res.json(rows[0]);
  })
);
