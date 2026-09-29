import { Router } from "express";
import { z } from "zod";
import { query } from "../db.js";
import { HttpError, wrap } from "../http-error.js";
import { somenteAdministrador } from "../auth.js";
import { lerConfiguracao, salvarConfiguracao } from "../configuracoes.js";
import { canaisDisponiveis, enviarAvisos, montarResumo } from "../avisos.js";
import { cnpjValido, cpfValido, digitos } from "../validacao.js";

export const configuracoesRouter = Router();
export const avisosRouter = Router();

const texto = (max) => z.string().trim().max(max).optional().default("");

const schemas = {
  farmacia: z.object({
    nome: texto(120),
    cnpj: z.string().optional().default("").transform(digitos).refine((v) => !v || cnpjValido(v), "CNPJ da farmácia inválido."),
    cidade: texto(80),
    uf: z.string().trim().toUpperCase().max(2).optional().default(""),
    responsavel_tecnico: texto(120),
    crf: texto(30),
    cpf_responsavel: z.string().optional().default("").transform(digitos).refine((v) => !v || cpfValido(v), "CPF do responsável inválido."),
  }),
  aparencia: z.object({
    cor_destaque: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida."),
  }),
  avisos: z.object({
    ativo: z.boolean(),
    hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido."),
    dias_validade: z.coerce.number().int().min(1).max(180),
    email: z.object({
      ativo: z.boolean(),
      destinatarios: z.array(z.string().trim().email("E-mail de destino inválido.")).max(10),
    }),
    whatsapp: z.object({
      ativo: z.boolean(),
      numeros: z.array(z.string().transform(digitos).refine((v) => v.length >= 12 && v.length <= 13, "Número de WhatsApp com DDI e DDD, ex.: 5583999990000.")).max(10),
    }),
  }),
};

configuracoesRouter.get(
  "/",
  wrap(async (_req, res) => {
    res.json({
      farmacia: await lerConfiguracao("farmacia"),
      aparencia: await lerConfiguracao("aparencia"),
      avisos: await lerConfiguracao("avisos"),
      canais: canaisDisponiveis(),
    });
  })
);

configuracoesRouter.put(
  "/:chave",
  somenteAdministrador,
  wrap(async (req, res) => {
    const schema = schemas[req.params.chave];
    if (!schema) throw new HttpError(404, "Configuração não encontrada.");
    const dados = schema.parse(req.body);
    const atual = await lerConfiguracao(req.params.chave);
    res.json(await salvarConfiguracao(req.params.chave, { ...atual, ...dados }));
  })
);

avisosRouter.get(
  "/previa",
  wrap(async (_req, res) => {
    const config = await lerConfiguracao("avisos");
    res.json(await montarResumo(config.dias_validade));
  })
);

avisosRouter.get(
  "/historico",
  wrap(async (_req, res) => {
    const { rows } = await query("SELECT * FROM avisos_enviados ORDER BY enviado_em DESC LIMIT 20");
    res.json(rows);
  })
);

avisosRouter.post(
  "/teste",
  somenteAdministrador,
  wrap(async (_req, res) => {
    res.json(await enviarAvisos({ forcar: true }));
  })
);

export async function dispararExterno(req, res, next) {
  try {
    const chave = process.env.AVISOS_CHAVE;
    if (!chave || req.query.chave !== chave) throw new HttpError(403, "Chave inválida.");
    res.json(await enviarAvisos());
  } catch (err) {
    next(err);
  }
}

export async function aparenciaPublica(_req, res, next) {
  try {
    const aparencia = await lerConfiguracao("aparencia");
    const farmacia = await lerConfiguracao("farmacia");
    res.json({ cor_destaque: aparencia.cor_destaque, nome_farmacia: farmacia.nome });
  } catch (err) {
    next(err);
  }
}
