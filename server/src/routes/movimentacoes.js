import { Router } from "express";
import { z } from "zod";
import { hojeISO, query, transaction } from "../db.js";
import { HttpError, wrap } from "../http-error.js";

export const movimentacoesRouter = Router();

export const TIPOS = ["entrada", "saida", "baixa_vencimento", "baixa_avaria"];

const movSchema = z.object({
  lote_id: z.coerce.number().int().positive("Selecione um lote."),
  tipo: z.enum(TIPOS, { message: "Tipo de movimentação inválido." }),
  quantidade: z.coerce.number().int("Use um número inteiro.").positive("A quantidade deve ser maior que zero."),
  observacao: z.string().trim().max(255).optional().nullable().transform((v) => (v ? v : null)),
});

movimentacoesRouter.get(
  "/",
  wrap(async (req, res) => {
    const limite = Math.min(Number(req.query.limite) || 50, 500);
    const { rows } = await query(
      `SELECT mv.*, l.codigo AS lote, l.validade, m.id AS medicamento_id, m.nome AS medicamento, u.nome AS usuario
         FROM movimentacoes mv
         JOIN lotes l ON l.id = mv.lote_id
         JOIN medicamentos m ON m.id = l.medicamento_id
         LEFT JOIN usuarios u ON u.id = mv.usuario_id
        ORDER BY mv.criado_em DESC, mv.id DESC
        LIMIT $1`,
      [limite]
    );
    res.json(rows);
  })
);

movimentacoesRouter.post(
  "/",
  wrap(async (req, res) => {
    const d = movSchema.parse(req.body);
    const mov = await transaction(async (db) => {
      // trava o lote para evitar duas saídas simultâneas deixarem o saldo negativo
      const lote = await db.query("SELECT id, validade FROM lotes WHERE id = $1 FOR UPDATE", [d.lote_id]);
      if (!lote.rows[0]) throw new HttpError(404, "Lote não encontrado.");

      if (d.tipo !== "entrada") {
        const { rows } = await db.query("SELECT saldo FROM saldo_lotes WHERE lote_id = $1", [d.lote_id]);
        const saldo = rows[0].saldo;
        if (d.quantidade > saldo) {
          throw new HttpError(422, `Quantidade maior que o saldo do lote (${saldo}).`);
        }
      }
      if (d.tipo === "saida") {
        if (lote.rows[0].validade < hojeISO()) {
          throw new HttpError(422, "Lote vencido não pode ter saída para venda. Registre como baixa por vencimento.");
        }
      }

      const { rows } = await db.query(
        `INSERT INTO movimentacoes (lote_id, tipo, quantidade, observacao, usuario_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [d.lote_id, d.tipo, d.quantidade, d.observacao, req.usuario.id]
      );
      const saldo = await db.query("SELECT saldo FROM saldo_lotes WHERE lote_id = $1", [d.lote_id]);
      return { ...rows[0], saldo_lote: saldo.rows[0].saldo };
    });
    res.status(201).json(mov);
  })
);
