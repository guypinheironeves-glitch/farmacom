import express from "express";
import cors from "cors";
import helmet from "helmet";
import { ZodError } from "zod";
import { authRouter, requireAuth, somenteAdministrador } from "./auth.js";
import { medicamentosRouter } from "./routes/medicamentos.js";
import { lotesRouter } from "./routes/lotes.js";
import { movimentacoesRouter } from "./routes/movimentacoes.js";
import { alertasRouter } from "./routes/alertas.js";
import { relatoriosRouter } from "./routes/relatorios.js";
import { fornecedoresRouter } from "./routes/fornecedores.js";
import { usuariosRouter } from "./routes/usuarios.js";
import { nfeRouter } from "./routes/nfe.js";
import { painelRouter } from "./routes/painel.js";
import { aparenciaPublica, avisosRouter, configuracoesRouter, dispararExterno } from "./routes/configuracoes.js";
import { HttpError } from "./http-error.js";
import { catalogo } from "./catalogo.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  const origins = (process.env.CORS_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean);
  app.use(cors(origins.length ? { origin: origins } : undefined));
  app.use(express.json({ limit: "5mb" }));

  app.get("/api/saude", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/aparencia", aparenciaPublica);
  app.get("/api/avisos/disparar", dispararExterno);

  app.use("/api/auth", authRouter);
  app.get("/api/catalogo", requireAuth, (_req, res) => res.json(catalogo));
  app.use("/api/medicamentos", requireAuth, medicamentosRouter);
  app.use("/api/lotes", requireAuth, lotesRouter);
  app.use("/api/movimentacoes", requireAuth, movimentacoesRouter);
  app.use("/api/alertas", requireAuth, alertasRouter);
  app.use("/api/painel", requireAuth, painelRouter);
  app.use("/api/relatorios", requireAuth, relatoriosRouter);
  app.use("/api/fornecedores", requireAuth, fornecedoresRouter);
  app.use("/api/nfe", requireAuth, nfeRouter);
  app.use("/api/configuracoes", requireAuth, configuracoesRouter);
  app.use("/api/avisos", requireAuth, avisosRouter);
  app.use("/api/usuarios", requireAuth, somenteAdministrador, usuariosRouter);

  app.use((_req, res) => res.status(404).json({ erro: "Rota não encontrada." }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof ZodError) {
      return res.status(400).json({
        erro: "Dados inválidos.",
        detalhes: err.issues.map((i) => ({ campo: i.path.join("."), mensagem: i.message })),
      });
    }
    if (err instanceof HttpError) return res.status(err.status).json({ erro: err.message });
    if (err.type === "entity.too.large") return res.status(413).json({ erro: "Arquivo grande demais." });
    if (err.code === "23505") return res.status(409).json({ erro: "Registro já existe." });
    if (err.code === "23503") return res.status(409).json({ erro: "Registro vinculado a outros dados." });
    console.error(err);
    return res.status(500).json({ erro: "Erro interno do servidor." });
  });

  return app;
}
