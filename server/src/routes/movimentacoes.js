import { Router } from "express";
import { z } from "zod";
import { hojeISO, query, transaction } from "../db.js";
import { HttpError, wrap } from "../http-error.js";
import { CONTROLES } from "../catalogo.js";

export const movimentacoesRouter = Router();

export const TIPOS = ["entrada", "saida", "baixa_vencimento", "baixa_avaria"];

const texto = (max) => z.string().trim().max(max).optional().nullable().transform((v) => (v ? v : null));

const movSchema = z.object({
  lote_id: z.coerce.number().int().positive("Selecione um lote."),
  tipo: z.enum(TIPOS, { message: "Tipo de movimentação inválido." }),
  quantidade: z.coerce.number().int("Use um número inteiro.").positive("A quantidade deve ser maior que zero."),
  observacao: texto(255),
  receita_numero: texto(40),
  receita_data: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data da receita no formato AAAA-MM-DD.")
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  prescritor_nome: texto(120),
  prescritor_registro: texto(40),
  paciente_nome: texto(120),
});

const diasEntre = (inicio, fim) => Math.round((new Date(fim) - new Date(inicio)) / 86400000);

// Regras de dispensação de medicamentos com controle especial (receita retida)
export function validarReceita(controle, d, hoje) {
  const regra = CONTROLES[controle];
  if (!regra) return;
  const faltando = [];
  if (!d.receita_data) faltando.push("data da receita");
  if (!d.prescritor_nome) faltando.push("nome do prescritor");
  if (!d.prescritor_registro) faltando.push("registro do prescritor (CRM, CRO...)");
  if (!d.paciente_nome) faltando.push("nome do paciente");
  if (regra.exigeNumero && !d.receita_numero) faltando.push("número da notificação");
  if (faltando.length) {
    throw new HttpError(422, `Medicamento com controle especial (${regra.rotulo}): informe ${faltando.join(", ")}.`);
  }
  if (d.receita_data > hoje) throw new HttpError(422, "A data da receita não pode ser futura.");
  if (regra.validadeDias && diasEntre(d.receita_data, hoje) > regra.validadeDias) {
    throw new HttpError(422, `Receita de antimicrobiano vencida: vale ${regra.validadeDias} dias a partir da emissão.`);
  }
}

movimentacoesRouter.get(
  "/",
  wrap(async (req, res) => {
    const limite = Math.min(Number(req.query.limite) || 50, 500);
    const tipo = TIPOS.includes(req.query.tipo) ? req.query.tipo : null;
    const { rows } = await query(
      `SELECT mv.*, l.codigo AS lote, l.validade, m.id AS medicamento_id, m.nome AS medicamento,
              m.controle_especial, u.nome AS usuario
         FROM movimentacoes mv
         JOIN lotes l ON l.id = mv.lote_id
         JOIN medicamentos m ON m.id = l.medicamento_id
         LEFT JOIN usuarios u ON u.id = mv.usuario_id
        WHERE $2::tipo_movimentacao IS NULL OR mv.tipo = $2
        ORDER BY mv.criado_em DESC, mv.id DESC
        LIMIT $1`,
      [limite, tipo]
    );
    res.json(rows);
  })
);

movimentacoesRouter.post(
  "/",
  wrap(async (req, res) => {
    const d = movSchema.parse(req.body);
    const hoje = hojeISO();
    const mov = await transaction(async (db) => {
      // trava o lote para evitar duas saídas simultâneas deixarem o saldo negativo
      const lote = await db.query(
        `SELECT l.id, l.validade, m.controle_especial
           FROM lotes l JOIN medicamentos m ON m.id = l.medicamento_id
          WHERE l.id = $1 FOR UPDATE OF l`,
        [d.lote_id]
      );
      if (!lote.rows[0]) throw new HttpError(404, "Lote não encontrado.");
      const { validade, controle_especial } = lote.rows[0];

      if (d.tipo !== "entrada") {
        const { rows } = await db.query("SELECT saldo FROM saldo_lotes WHERE lote_id = $1", [d.lote_id]);
        const saldo = rows[0].saldo;
        if (d.quantidade > saldo) {
          throw new HttpError(422, `Quantidade maior que o saldo do lote (${saldo}).`);
        }
      }

      const receita = { receita_numero: null, receita_data: null, prescritor_nome: null, prescritor_registro: null, paciente_nome: null };
      if (d.tipo === "saida") {
        if (validade < hoje) {
          throw new HttpError(422, "Lote vencido não pode ter saída para venda. Registre como baixa por vencimento.");
        }
        if (controle_especial) {
          validarReceita(controle_especial, d, hoje);
          Object.keys(receita).forEach((k) => (receita[k] = d[k]));
        }
      }

      const { rows } = await db.query(
        `INSERT INTO movimentacoes
           (lote_id, tipo, quantidade, observacao, receita_numero, receita_data,
            prescritor_nome, prescritor_registro, paciente_nome, usuario_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [
          d.lote_id, d.tipo, d.quantidade, d.observacao, receita.receita_numero, receita.receita_data,
          receita.prescritor_nome, receita.prescritor_registro, receita.paciente_nome, req.usuario.id,
        ]
      );
      const saldo = await db.query("SELECT saldo FROM saldo_lotes WHERE lote_id = $1", [d.lote_id]);
      return { ...rows[0], saldo_lote: saldo.rows[0].saldo };
    });
    res.status(201).json(mov);
  })
);
