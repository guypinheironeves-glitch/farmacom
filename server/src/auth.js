import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { query } from "./db.js";
import { HttpError, wrap } from "./http-error.js";

const SECRET = process.env.JWT_SECRET || "troque-este-segredo-em-producao";
const EXPIRA_EM = "8h";

export const authRouter = Router();

const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === "test" ? 1000 : 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: "Muitas tentativas de login. Aguarde alguns minutos e tente de novo." },
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  senha: z.string().min(1, "Informe a senha."),
});

const publico = (u) => ({ id: u.id, nome: u.nome, email: u.email, perfil: u.perfil });

authRouter.post(
  "/login",
  limiteLogin,
  wrap(async (req, res) => {
    const { email, senha } = loginSchema.parse(req.body);
    const { rows } = await query("SELECT * FROM usuarios WHERE email = $1", [email]);
    const usuario = rows[0];
    if (!usuario || !(await bcrypt.compare(senha, usuario.senha_hash))) {
      throw new HttpError(401, "E-mail ou senha incorretos.");
    }
    if (!usuario.ativo) throw new HttpError(403, "Usuário desativado. Fale com o administrador.");
    const token = jwt.sign({ sub: usuario.id, nome: usuario.nome, perfil: usuario.perfil }, SECRET, { expiresIn: EXPIRA_EM });
    res.json({ token, usuario: publico(usuario) });
  })
);

authRouter.get(
  "/eu",
  requireAuth,
  wrap(async (req, res) => {
    const { rows } = await query("SELECT * FROM usuarios WHERE id = $1 AND ativo", [req.usuario.id]);
    if (!rows[0]) throw new HttpError(401, "Sessão inválida.");
    res.json(publico(rows[0]));
  })
);

const senhaSchema = z.object({
  senha_atual: z.string().min(1, "Informe a senha atual."),
  nova_senha: z.string().min(8, "A nova senha precisa ter pelo menos 8 caracteres."),
});

authRouter.put(
  "/senha",
  requireAuth,
  wrap(async (req, res) => {
    const d = senhaSchema.parse(req.body);
    const { rows } = await query("SELECT senha_hash FROM usuarios WHERE id = $1", [req.usuario.id]);
    if (!rows[0] || !(await bcrypt.compare(d.senha_atual, rows[0].senha_hash))) {
      throw new HttpError(422, "A senha atual não confere.");
    }
    await query("UPDATE usuarios SET senha_hash = $1 WHERE id = $2", [await hashSenha(d.nova_senha), req.usuario.id]);
    res.status(204).end();
  })
);

export function requireAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const [tipo, token] = header.split(" ");
  if (tipo !== "Bearer" || !token) return next(new HttpError(401, "Faça login para continuar."));
  try {
    const payload = jwt.verify(token, SECRET);
    req.usuario = { id: payload.sub, nome: payload.nome, perfil: payload.perfil };
    next();
  } catch {
    next(new HttpError(401, "Sessão expirada. Faça login novamente."));
  }
}

export const somenteAdministrador = (req, _res, next) =>
  req.usuario?.perfil === "administrador"
    ? next()
    : next(new HttpError(403, "Apenas o administrador pode fazer isso."));

export const hashSenha = (senha) => bcrypt.hash(senha, 10);
