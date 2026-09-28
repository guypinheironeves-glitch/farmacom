import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { query } from "./db.js";
import { HttpError, wrap } from "./http-error.js";

const SECRET = process.env.JWT_SECRET || "troque-este-segredo-em-producao";
const EXPIRA_EM = "8h";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  senha: z.string().min(1, "Informe a senha."),
});

authRouter.post(
  "/login",
  wrap(async (req, res) => {
    const { email, senha } = loginSchema.parse(req.body);
    const { rows } = await query("SELECT id, nome, email, senha_hash FROM usuarios WHERE email = $1", [email]);
    const usuario = rows[0];
    if (!usuario || !(await bcrypt.compare(senha, usuario.senha_hash))) {
      throw new HttpError(401, "E-mail ou senha incorretos.");
    }
    const token = jwt.sign({ sub: usuario.id, nome: usuario.nome }, SECRET, { expiresIn: EXPIRA_EM });
    res.json({ token, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email } });
  })
);

authRouter.get(
  "/eu",
  requireAuth,
  wrap(async (req, res) => {
    const { rows } = await query("SELECT id, nome, email FROM usuarios WHERE id = $1", [req.usuario.id]);
    if (!rows[0]) throw new HttpError(401, "Sessão inválida.");
    res.json(rows[0]);
  })
);

export function requireAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const [tipo, token] = header.split(" ");
  if (tipo !== "Bearer" || !token) return next(new HttpError(401, "Faça login para continuar."));
  try {
    const payload = jwt.verify(token, SECRET);
    req.usuario = { id: payload.sub, nome: payload.nome };
    next();
  } catch {
    next(new HttpError(401, "Sessão expirada. Faça login novamente."));
  }
}

export const hashSenha = (senha) => bcrypt.hash(senha, 10);
