import { Router } from "express";
import { z } from "zod";
import { hojeISO, query, transaction } from "../db.js";
import { HttpError, parseId, wrap } from "../http-error.js";

export const medicamentosRouter = Router();

const texto = (max) => z.string().trim().max(max).optional().nullable().transform((v) => (v ? v : null));

const medicamentoSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do medicamento.").max(160),
  principio_ativo: texto(160),
  fabricante: texto(120),
  apresentacao: texto(120),
  estoque_minimo: z.coerce.number().int("Use um número inteiro.").min(0, "Não pode ser negativo.").default(0),
});

const loteSchema = z.object({
  codigo: z.string().trim().min(1, "Informe o código do lote.").max(60),
  validade: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data no formato AAAA-MM-DD."),
  fornecedor: texto(160),
  preco_custo: z.coerce.number().min(0, "Não pode ser negativo.").optional().nullable(),
  quantidade_inicial: z.coerce.number().int().min(0, "Não pode ser negativa.").default(0),
});

// Lista de medicamentos com saldo total, quantidade de lotes e próxima validade
medicamentosRouter.get(
  "/",
  wrap(async (req, res) => {
    const busca = (req.query.busca || "").toString().trim();
    const { rows } = await query(
      `SELECT m.*,
              COALESCE(SUM(s.saldo), 0)::INTEGER AS saldo_total,
              COUNT(l.id)::INTEGER AS total_lotes,
              MIN(l.validade) FILTER (WHERE s.saldo > 0) AS proxima_validade
         FROM medicamentos m
         LEFT JOIN lotes l ON l.medicamento_id = m.id
         LEFT JOIN saldo_lotes s ON s.lote_id = l.id
        WHERE $1 = '' OR m.nome ILIKE '%' || $1 || '%' OR m.principio_ativo ILIKE '%' || $1 || '%'
        GROUP BY m.id
        ORDER BY m.nome`,
      [busca]
    );
    res.json(rows.map((m) => ({ ...m, abaixo_minimo: m.saldo_total < m.estoque_minimo })));
  })
);

medicamentosRouter.get(
  "/:id",
  wrap(async (req, res) => {
    const id = parseId(req.params.id);
    const med = await query("SELECT * FROM medicamentos WHERE id = $1", [id]);
    if (!med.rows[0]) throw new HttpError(404, "Medicamento não encontrado.");
    const lotes = await query(
      `SELECT l.*, s.saldo, (l.validade - $2::DATE) AS dias_para_vencer
         FROM lotes l JOIN saldo_lotes s ON s.lote_id = l.id
        WHERE l.medicamento_id = $1
        ORDER BY l.validade`,
      [id, hojeISO()]
    );
    const saldo_total = lotes.rows.reduce((acc, l) => acc + l.saldo, 0);
    res.json({ ...med.rows[0], saldo_total, abaixo_minimo: saldo_total < med.rows[0].estoque_minimo, lotes: lotes.rows });
  })
);

medicamentosRouter.post(
  "/",
  wrap(async (req, res) => {
    const d = medicamentoSchema.parse(req.body);
    const { rows } = await query(
      `INSERT INTO medicamentos (nome, principio_ativo, fabricante, apresentacao, estoque_minimo)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [d.nome, d.principio_ativo, d.fabricante, d.apresentacao, d.estoque_minimo]
    );
    res.status(201).json(rows[0]);
  })
);

medicamentosRouter.put(
  "/:id",
  wrap(async (req, res) => {
    const id = parseId(req.params.id);
    const d = medicamentoSchema.parse(req.body);
    const { rows } = await query(
      `UPDATE medicamentos
          SET nome = $1, principio_ativo = $2, fabricante = $3, apresentacao = $4, estoque_minimo = $5
        WHERE id = $6 RETURNING *`,
      [d.nome, d.principio_ativo, d.fabricante, d.apresentacao, d.estoque_minimo, id]
    );
    if (!rows[0]) throw new HttpError(404, "Medicamento não encontrado.");
    res.json(rows[0]);
  })
);

medicamentosRouter.delete(
  "/:id",
  wrap(async (req, res) => {
    const id = parseId(req.params.id);
    const mov = await query(
      `SELECT COUNT(*)::INTEGER AS n FROM movimentacoes m JOIN lotes l ON l.id = m.lote_id
        WHERE l.medicamento_id = $1 AND m.tipo <> 'entrada'`,
      [id]
    );
    if (mov.rows[0].n > 0) {
      throw new HttpError(409, "Este medicamento já tem saídas ou baixas registradas e não pode ser excluído.");
    }
    const { rowCount } = await query("DELETE FROM medicamentos WHERE id = $1", [id]);
    if (!rowCount) throw new HttpError(404, "Medicamento não encontrado.");
    res.status(204).end();
  })
);

// Cadastro de lote; a quantidade inicial vira uma movimentação de entrada
medicamentosRouter.post(
  "/:id/lotes",
  wrap(async (req, res) => {
    const medicamentoId = parseId(req.params.id);
    const d = loteSchema.parse(req.body);
    const lote = await transaction(async (db) => {
      const med = await db.query("SELECT id FROM medicamentos WHERE id = $1", [medicamentoId]);
      if (!med.rows[0]) throw new HttpError(404, "Medicamento não encontrado.");
      const { rows } = await db.query(
        `INSERT INTO lotes (medicamento_id, codigo, validade, fornecedor, preco_custo)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [medicamentoId, d.codigo, d.validade, d.fornecedor, d.preco_custo ?? null]
      );
      if (d.quantidade_inicial > 0) {
        await db.query(
          `INSERT INTO movimentacoes (lote_id, tipo, quantidade, observacao, usuario_id)
           VALUES ($1, 'entrada', $2, 'Entrada inicial do lote', $3)`,
          [rows[0].id, d.quantidade_inicial, req.usuario.id]
        );
      }
      return { ...rows[0], saldo: d.quantidade_inicial };
    });
    res.status(201).json(lote);
  })
);
