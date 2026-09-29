import { Router } from "express";
import { z } from "zod";
import { query } from "../db.js";
import { HttpError, parseId, wrap } from "../http-error.js";
import { cnpjValido, digitos } from "../validacao.js";

export const fornecedoresRouter = Router();

const texto = (max) => z.string().trim().max(max).optional().nullable().transform((v) => (v ? v : null));

const fornecedorSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do fornecedor.").max(160),
  cnpj: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v ? digitos(v) : null))
    .refine((v) => v === null || cnpjValido(v), "CNPJ inválido."),
  telefone: texto(20),
  email: z.string().trim().email("E-mail inválido.").optional().nullable().or(z.literal("")).transform((v) => v || null),
  contato: texto(120),
});

fornecedoresRouter.get(
  "/",
  wrap(async (_req, res) => {
    const { rows } = await query(
      `SELECT f.*, COUNT(l.id)::INTEGER AS total_lotes, MAX(l.criado_em) AS ultima_entrega
         FROM fornecedores f LEFT JOIN lotes l ON l.fornecedor_id = f.id
        GROUP BY f.id ORDER BY f.nome`
    );
    res.json(rows);
  })
);

fornecedoresRouter.post(
  "/",
  wrap(async (req, res) => {
    const d = fornecedorSchema.parse(req.body);
    const { rows } = await query(
      `INSERT INTO fornecedores (nome, cnpj, telefone, email, contato) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [d.nome, d.cnpj, d.telefone, d.email, d.contato]
    );
    res.status(201).json(rows[0]);
  })
);

fornecedoresRouter.put(
  "/:id",
  wrap(async (req, res) => {
    const id = parseId(req.params.id);
    const d = fornecedorSchema.parse(req.body);
    const { rows } = await query(
      `UPDATE fornecedores SET nome = $1, cnpj = $2, telefone = $3, email = $4, contato = $5 WHERE id = $6 RETURNING *`,
      [d.nome, d.cnpj, d.telefone, d.email, d.contato, id]
    );
    if (!rows[0]) throw new HttpError(404, "Fornecedor não encontrado.");
    res.json(rows[0]);
  })
);

fornecedoresRouter.delete(
  "/:id",
  wrap(async (req, res) => {
    const id = parseId(req.params.id);
    const uso = await query("SELECT COUNT(*)::INTEGER AS n FROM lotes WHERE fornecedor_id = $1", [id]);
    if (uso.rows[0].n > 0) throw new HttpError(409, "Este fornecedor tem lotes cadastrados e não pode ser excluído.");
    const { rowCount } = await query("DELETE FROM fornecedores WHERE id = $1", [id]);
    if (!rowCount) throw new HttpError(404, "Fornecedor não encontrado.");
    res.status(204).end();
  })
);
