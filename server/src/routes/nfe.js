import { Router } from "express";
import { z } from "zod";
import { query, transaction } from "../db.js";
import { HttpError, wrap } from "../http-error.js";
import { lerNfe } from "../nfe.js";
import { cnpjValido } from "../validacao.js";

export const nfeRouter = Router();

nfeRouter.post(
  "/analisar",
  wrap(async (req, res) => {
    const xml = String(req.body?.xml || "");
    if (!xml.trim()) throw new HttpError(400, "Envie o conteúdo do XML.");
    const nfe = lerNfe(xml);

    const jaImportada = nfe.nota.chave
      ? (await query("SELECT COUNT(*)::INTEGER AS n FROM lotes WHERE nota_fiscal = $1", [nfe.nota.chave])).rows[0].n > 0
      : false;
    const fornecedor = nfe.fornecedor.cnpj
      ? (await query("SELECT id, nome FROM fornecedores WHERE cnpj = $1", [nfe.fornecedor.cnpj])).rows[0]
      : null;

    const itens = [];
    for (const item of nfe.itens) {
      let med = null;
      if (item.ean) med = (await query("SELECT id, nome FROM medicamentos WHERE codigo_barras = $1", [item.ean])).rows[0];
      if (!med && item.registro_anvisa) {
        med = (await query("SELECT id, nome FROM medicamentos WHERE registro_anvisa = $1", [item.registro_anvisa])).rows[0];
      }
      itens.push({ ...item, medicamento_id: med?.id || null, medicamento: med?.nome || null });
    }

    const avisos = [];
    if (jaImportada) avisos.push("Esta nota já foi importada antes.");
    if (nfe.fornecedor.cnpj && !cnpjValido(nfe.fornecedor.cnpj)) avisos.push("O CNPJ do emitente não é válido.");
    const semVinculo = itens.filter((i) => !i.medicamento_id).length;
    if (semVinculo) avisos.push(`${semVinculo} ${semVinculo === 1 ? "item não foi reconhecido" : "itens não foram reconhecidos"} pelo código de barras. Escolha o medicamento ou ignore.`);

    res.json({
      ...nfe,
      ja_importada: jaImportada,
      fornecedor: { ...nfe.fornecedor, id: fornecedor?.id || null, cadastrado: Boolean(fornecedor) },
      itens,
      avisos,
    });
  })
);

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Validade no formato AAAA-MM-DD.");

const importarSchema = z.object({
  nota: z.object({ chave: z.string().max(44).optional().default(""), numero: z.string().max(20).optional().default("") }),
  fornecedor: z.object({
    cnpj: z.string().optional().default(""),
    nome: z.string().trim().min(2, "Informe o nome do fornecedor.").max(160),
    telefone: z.string().max(20).optional().nullable(),
  }),
  itens: z
    .array(
      z.object({
        medicamento_id: z.coerce.number().int().positive("Escolha o medicamento de cada item."),
        valor_unitario: z.coerce.number().min(0),
        lotes: z
          .array(
            z.object({
              codigo: z.string().trim().min(1, "Informe o código de cada lote.").max(60),
              validade: data,
              quantidade: z.coerce.number().int().positive("Quantidade do lote deve ser maior que zero."),
            })
          )
          .min(1),
      })
    )
    .min(1, "Selecione pelo menos um item para importar."),
});

nfeRouter.post(
  "/importar",
  wrap(async (req, res) => {
    const d = importarSchema.parse(req.body);
    const resultado = await transaction(async (db) => {
      if (d.nota.chave) {
        const dup = await db.query("SELECT COUNT(*)::INTEGER AS n FROM lotes WHERE nota_fiscal = $1", [d.nota.chave]);
        if (dup.rows[0].n > 0) throw new HttpError(409, "Esta nota já foi importada.");
      }
      let fornecedorId = null;
      if (d.fornecedor.cnpj) {
        const existente = await db.query("SELECT id FROM fornecedores WHERE cnpj = $1", [d.fornecedor.cnpj]);
        fornecedorId = existente.rows[0]?.id;
      }
      if (!fornecedorId) {
        const novo = await db.query(
          "INSERT INTO fornecedores (nome, cnpj, telefone) VALUES ($1, $2, $3) RETURNING id",
          [d.fornecedor.nome, d.fornecedor.cnpj || null, d.fornecedor.telefone || null]
        );
        fornecedorId = novo.rows[0].id;
      }

      let lotesCriados = 0;
      let unidades = 0;
      for (const item of d.itens) {
        for (const l of item.lotes) {
          const existente = await db.query("SELECT id FROM lotes WHERE medicamento_id = $1 AND codigo = $2", [item.medicamento_id, l.codigo]);
          let loteId = existente.rows[0]?.id;
          if (!loteId) {
            const novo = await db.query(
              `INSERT INTO lotes (medicamento_id, fornecedor_id, codigo, validade, preco_custo, nota_fiscal)
               VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
              [item.medicamento_id, fornecedorId, l.codigo, l.validade, item.valor_unitario, d.nota.chave || null]
            );
            loteId = novo.rows[0].id;
            lotesCriados++;
          }
          await db.query(
            `INSERT INTO movimentacoes (lote_id, tipo, quantidade, observacao, usuario_id) VALUES ($1, 'entrada', $2, $3, $4)`,
            [loteId, l.quantidade, `Entrada pela NF-e ${d.nota.numero || ""}`.trim(), req.usuario.id]
          );
          unidades += l.quantidade;
        }
      }
      return { fornecedor_id: fornecedorId, lotes_criados: lotesCriados, unidades };
    });
    res.status(201).json(resultado);
  })
);
