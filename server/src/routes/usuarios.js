import { Router } from "express";
import { z } from "zod";
import { query } from "../db.js";
import { HttpError, parseId, wrap } from "../http-error.js";
import { hashSenha } from "../auth.js";

export const usuariosRouter = Router();

const PERFIS = ["administrador", "atendente"];

const novoSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome.").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  perfil: z.enum(PERFIS, { message: "Perfil inválido." }),
  senha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
});

const edicaoSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome.").max(120),
  perfil: z.enum(PERFIS, { message: "Perfil inválido." }),
  ativo: z.boolean(),
  senha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres.").optional().or(z.literal("")),
});

const campos = "id, nome, email, perfil, ativo, criado_em";

usuariosRouter.get(
  "/",
  wrap(async (_req, res) => {
    const { rows } = await query(`SELECT ${campos} FROM usuarios ORDER BY nome`);
    res.json(rows);
  })
);

usuariosRouter.post(
  "/",
  wrap(async (req, res) => {
    const d = novoSchema.parse(req.body);
    const { rows } = await query(
      `INSERT INTO usuarios (nome, email, perfil, senha_hash) VALUES ($1, $2, $3, $4) RETURNING ${campos}`,
      [d.nome, d.email, d.perfil, await hashSenha(d.senha)]
    );
    res.status(201).json(rows[0]);
  })
);

usuariosRouter.put(
  "/:id",
  wrap(async (req, res) => {
    const id = parseId(req.params.id);
    const d = edicaoSchema.parse(req.body);
    if (id === req.usuario.id && (!d.ativo || d.perfil !== "administrador")) {
      throw new HttpError(422, "Você não pode desativar nem rebaixar o próprio usuário.");
    }
    const { rows } = await query(
      `UPDATE usuarios SET nome = $1, perfil = $2, ativo = $3 WHERE id = $4 RETURNING ${campos}`,
      [d.nome, d.perfil, d.ativo, id]
    );
    if (!rows[0]) throw new HttpError(404, "Usuário não encontrado.");
    if (d.senha) await query("UPDATE usuarios SET senha_hash = $1 WHERE id = $2", [await hashSenha(d.senha), id]);
    res.json(rows[0]);
  })
);
