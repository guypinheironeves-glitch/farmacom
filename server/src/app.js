import express from "express";
import cors from "cors";
import { ZodError } from "zod";
import { authRouter, requireAuth } from "./auth.js";
import { medicamentosRouter } from "./routes/medicamentos.js";
import { lotesRouter } from "./routes/lotes.js";
import { movimentacoesRouter } from "./routes/movimentacoes.js";
import { alertasRouter } from "./routes/alertas.js";
import { relatoriosRouter } from "./routes/relatorios.js";
import { HttpError } from "./http-error.js";
import { catalogo } from "./catalogo.js";

export function createApp() {
  const app = express();

  const origins = (process.env.CORS_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean);
  app.use(cors(origins.length ? { origin: origins } : undefined));
  app.use(express.json());

  app.get("/api/saude", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/auth", authRouter);
  app.get("/api/catalogo", requireAuth, (_req, res) => res.json(catalogo));
  app.use("/api/medicamentos", requireAuth, medicamentosRouter);
  app.use("/api/lotes", requireAuth, lotesRouter);
  app.use("/api/movimentacoes", requireAuth, movimentacoesRouter);
  app.use("/api/alertas", requireAuth, alertasRouter);
  app.use("/api/relatorios", requireAuth, relatoriosRouter);

  app.use((_req, res) => res.status(404).json({ erro: "Rota não encontrada." }));

  app.use((err, _req, res, _next) => {
    if (err instanceof ZodError) {
      return res.status(400).json({
        erro: "Dados inválidos.",
        detalhes: err.issues.map((i) => ({ campo: i.path.join("."), mensagem: i.message })),
      });
    }
    if (err instanceof HttpError) return res.status(err.status).json({ erro: err.message });
    if (err.code === "23505") return res.status(409).json({ erro: "Registro já existe." });
    if (err.code === "23503") return res.status(409).json({ erro: "Registro vinculado a outros dados." });
    console.error(err);
    return res.status(500).json({ erro: "Erro interno do servidor." });
  });

  return app;
}
