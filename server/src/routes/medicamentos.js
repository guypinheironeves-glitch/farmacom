import { Router } from "express";
import { z } from "zod";
import { hojeISO, query, transaction } from "../db.js";
import { HttpError, parseId, wrap } from "../http-error.js";
import { CATEGORIAS, CONTROLES, TARJAS, TIPOS_MEDICAMENTO } from "../catalogo.js";

export const medicamentosRouter = Router();

const texto = (max) => z.string().trim().max(max).optional().nullable().transform((v) => (v ? v : null));

// Dígito verificador do código de barras EAN-13
export function eanValido(codigo) {
  if (!/^\d{13}$/.test(codigo)) return false;
  const soma = codigo
    .slice(0, 12)
    .split("")
    .reduce((acc, d, i) => acc + Number(d) * (i % 2 ? 3 : 1), 0);
  return (10 - (soma % 10)) % 10 === Number(codigo[12]);
}

const medicamentoSchema = z
  .object({
    nome: z.string().trim().min(2, "Informe o nome do medicamento.").max(160),
    principio_ativo: texto(160),
    fabricante: texto(120),
    apresentacao: texto(120),
    categoria: z.enum(CATEGORIAS, { message: "Categoria inválida." }).optional().nullable(),
    tipo: z.enum(Object.keys(TIPOS_MEDICAMENTO), { message: "Tipo inválido." }).default("generico"),
    tarja: z.enum(Object.keys(TARJAS), { message: "Tarja inválida." }).default("vermelha"),
    controle_especial: z.enum(Object.keys(CONTROLES), { message: "Controle especial inválido." }).optional().nullable(),
    refrigerado: z.boolean().default(false),
    codigo_barras: z
      .string()
      .trim()
      .optional()
      .nullable()
      .transform((v) => (v ? v : null))
      .refine((v) => v === null || eanValido(v), "Código de barras EAN-13 inválido."),
    preco_venda: z.coerce.number().min(0, "Não pode ser negativo.").optional().nullable(),
    estoque_minimo: z.coerce.number().int("Use um número inteiro.").min(0, "Não pode ser negativo.").default(0),
  })
  // Coerência entre tarja e controle especial
  .refine((d) => !(d.controle_especial && d.tarja === "sem_tarja"), {
    message: "Medicamento com controle especial não pode ser isento de prescrição.",
    path: ["tarja"],
  })
  .refine((d) => !(d.tarja === "vermelha_retencao" && !d.controle_especial), {
    message: "Tarja com retenção de receita exige informar o controle especial.",
    path: ["controle_especial"],
  });

const loteSchema = z.object({
  codigo: z.string().trim().min(1, "Informe o código do lote.").max(60),
  validade: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data no formato AAAA-MM-DD."),
  fornecedor: texto(160),
  preco_custo: z.coerce.number().min(0, "Não pode ser negativo.").optional().nullable(),
  quantidade_inicial: z.coerce.number().int().min(0, "Não pode ser negativa.").default(0),
});

const CAMPOS = [
  "nome", "principio_ativo", "fabricante", "apresentacao", "categoria", "tipo", "tarja",
  "controle_especial", "refrigerado", "codigo_barras", "preco_venda", "estoque_minimo",
];
const valores = (d) => CAMPOS.map((c) => d[c] ?? null);

// Lista de medicamentos com saldo, lotes e próxima validade, com filtros
medicamentosRouter.get(
  "/",
  wrap(async (req, res) => {
    const busca = (req.query.busca || "").toString().trim();
    const categoria = (req.query.categoria || "").toString();
    const tarja = (req.query.tarja || "").toString();
    const controlado = req.query.controlado === "sim" ? true : req.query.controlado === "nao" ? false : null;
    const { rows } = await query(
      `SELECT m.*,
              COALESCE(SUM(s.saldo), 0)::INTEGER AS saldo_total,
              COALESCE(SUM(s.saldo) FILTER (WHERE l.validade >= $5::DATE), 0)::INTEGER AS saldo_utilizavel,
              COUNT(l.id)::INTEGER AS total_lotes,
              MIN(l.validade) FILTER (WHERE s.saldo > 0) AS proxima_validade
         FROM medicamentos m
         LEFT JOIN lotes l ON l.medicamento_id = m.id
         LEFT JOIN saldo_lotes s ON s.lote_id = l.id
        WHERE ($1 = '' OR m.nome ILIKE '%' || $1 || '%' OR m.principio_ativo ILIKE '%' || $1 || '%'
                       OR m.codigo_barras = $1)
          AND ($2 = '' OR m.categoria = $2)
          AND ($3 = '' OR m.tarja::TEXT = $3)
          AND ($4::BOOLEAN IS NULL OR (m.controle_especial IS NOT NULL) = $4)
        GROUP BY m.id
        ORDER BY m.nome`,
      [busca, categoria, tarja, controlado, hojeISO()]
    );
    let lista = rows.map((m) => ({ ...m, abaixo_minimo: m.saldo_utilizavel < m.estoque_minimo }));
    if (req.query.situacao === "abaixo_minimo") lista = lista.filter((m) => m.abaixo_minimo);
    res.json(lista);
  })
);

medicamentosRouter.get(
  "/:id",
  wrap(async (req, res) => {
    const id = parseId(req.params.id);
    const hoje = hojeISO();
    const med = await query("SELECT * FROM medicamentos WHERE id = $1", [id]);
    if (!med.rows[0]) throw new HttpError(404, "Medicamento não encontrado.");
    const lotes = await query(
      `SELECT l.*, s.saldo, (l.validade - $2::DATE) AS dias_para_vencer
         FROM lotes l JOIN saldo_lotes s ON s.lote_id = l.id
        WHERE l.medicamento_id = $1
        ORDER BY l.validade`,
      [id, hoje]
    );
    const vendas = await query(
      `SELECT COALESCE(SUM(mv.quantidade), 0)::INTEGER AS total
         FROM movimentacoes mv JOIN lotes l ON l.id = mv.lote_id
        WHERE l.medicamento_id = $1 AND mv.tipo = 'saida' AND mv.criado_em >= now() - INTERVAL '30 days'`,
      [id]
    );
    const saldo_total = lotes.rows.reduce((acc, l) => acc + l.saldo, 0);
    const saldo_utilizavel = lotes.rows.filter((l) => l.dias_para_vencer >= 0).reduce((acc, l) => acc + l.saldo, 0);
    // Lote sugerido para a próxima venda: o que vence primeiro entre os válidos com saldo (FEFO)
    const fefo = lotes.rows.find((l) => l.saldo > 0 && l.dias_para_vencer >= 0);
    res.json({
      ...med.rows[0],
      saldo_total,
      saldo_utilizavel,
      abaixo_minimo: saldo_utilizavel < med.rows[0].estoque_minimo,
      vendas_30_dias: vendas.rows[0].total,
      lote_sugerido_id: fefo ? fefo.id : null,
      lotes: lotes.rows,
    });
  })
);

medicamentosRouter.post(
  "/",
  wrap(async (req, res) => {
    const d = medicamentoSchema.parse(req.body);
    const { rows } = await query(
      `INSERT INTO medicamentos (${CAMPOS.join(", ")})
       VALUES (${CAMPOS.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING *`,
      valores(d)
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
      `UPDATE medicamentos SET ${CAMPOS.map((c, i) => `${c} = $${i + 1}`).join(", ")}
        WHERE id = $${CAMPOS.length + 1} RETURNING *`,
      [...valores(d), id]
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
