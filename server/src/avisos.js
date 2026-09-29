import nodemailer from "nodemailer";
import { hojeISO, query, TIMEZONE } from "./db.js";
import { lerConfiguracao, salvarConfiguracao } from "./configuracoes.js";

export function canaisDisponiveis() {
  return {
    email: Boolean(process.env.SMTP_HOST),
    whatsapp: Boolean(process.env.WHATSAPP_API_URL && process.env.WHATSAPP_INSTANCIA && process.env.WHATSAPP_TOKEN),
  };
}

export async function montarResumo(dias = 30) {
  const hoje = hojeISO();
  const validade = await query(
    `SELECT m.nome, l.codigo, l.validade, s.saldo, (l.validade - $2::DATE) AS dias
       FROM lotes l JOIN saldo_lotes s ON s.lote_id = l.id JOIN medicamentos m ON m.id = l.medicamento_id
      WHERE s.saldo > 0 AND l.validade <= $2::DATE + $1::INTEGER
      ORDER BY l.validade`,
    [dias, hoje]
  );
  const estoque = await query(
    `SELECT m.nome, m.estoque_minimo,
            COALESCE(SUM(s.saldo) FILTER (WHERE l.validade >= $1::DATE), 0)::INTEGER AS saldo
       FROM medicamentos m
       LEFT JOIN lotes l ON l.medicamento_id = m.id
       LEFT JOIN saldo_lotes s ON s.lote_id = l.id
      GROUP BY m.id
     HAVING COALESCE(SUM(s.saldo) FILTER (WHERE l.validade >= $1::DATE), 0) < m.estoque_minimo
      ORDER BY m.nome`,
    [hoje]
  );
  const farmacia = await lerConfiguracao("farmacia");
  const vencidos = validade.rows.filter((l) => l.dias < 0);
  const vencendo = validade.rows.filter((l) => l.dias >= 0);
  const data = new Date().toLocaleDateString("pt-BR", { timeZone: TIMEZONE });
  const linhas = [`*FarmaCom${farmacia.nome ? ` | ${farmacia.nome}` : ""}*`, `Resumo do estoque em ${data}`, ""];
  const lote = (l) => `• ${l.nome} (lote ${l.codigo}): ${l.saldo} un., ${l.dias < 0 ? `vencido há ${-l.dias} dias` : l.dias === 0 ? "vence hoje" : `vence em ${l.dias} dias`}`;
  if (vencidos.length) linhas.push(`*Vencidos ainda no estoque (${vencidos.length})*`, ...vencidos.map(lote), "");
  if (vencendo.length) linhas.push(`*Vencem em até ${dias} dias (${vencendo.length})*`, ...vencendo.map(lote), "");
  if (estoque.rows.length) {
    linhas.push(`*Abaixo do estoque mínimo (${estoque.rows.length})*`, ...estoque.rows.map((m) => `• ${m.nome}: ${m.saldo} de ${m.estoque_minimo}`), "");
  }
  const total = vencidos.length + vencendo.length + estoque.rows.length;
  if (!total) linhas.push("Nenhum alerta hoje. Estoque em dia.");
  const texto = linhas.join("\n").trim();
  return { texto, total, vencidos: vencidos.length, vencendo: vencendo.length, estoque_baixo: estoque.rows.length };
}

async function registrar(canal, destino, sucesso, detalhe) {
  await query("INSERT INTO avisos_enviados (canal, destino, sucesso, detalhe) VALUES ($1, $2, $3, $4)", [
    canal, destino, sucesso, String(detalhe || "").slice(0, 255),
  ]);
}

async function enviarEmail(destinatarios, resumo) {
  const transporte = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  const texto = resumo.texto.replace(/\*/g, "");
  await transporte.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: destinatarios.join(", "),
    subject: resumo.total ? `FarmaCom: ${resumo.total} alertas no estoque hoje` : "FarmaCom: estoque em dia",
    text: texto,
  });
}

async function enviarWhatsapp(numero, resumo) {
  const base = process.env.WHATSAPP_API_URL.replace(/\/$/, "");
  const resposta = await fetch(`${base}/message/sendText/${process.env.WHATSAPP_INSTANCIA}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: process.env.WHATSAPP_TOKEN },
    body: JSON.stringify({ number: numero.replace(/\D/g, ""), text: resumo.texto }),
  });
  if (!resposta.ok) throw new Error(`WhatsApp respondeu ${resposta.status}`);
}

export async function enviarAvisos({ forcar = false } = {}) {
  const config = await lerConfiguracao("avisos");
  if (!config.ativo && !forcar) return { enviado: false, motivo: "Avisos desativados." };
  const canais = canaisDisponiveis();
  const resumo = await montarResumo(config.dias_validade);
  const resultados = [];

  if (config.email.ativo && config.email.destinatarios.length) {
    if (!canais.email) resultados.push({ canal: "email", sucesso: false, detalhe: "Servidor de e-mail não configurado." });
    else {
      try {
        await enviarEmail(config.email.destinatarios, resumo);
        resultados.push({ canal: "email", destino: config.email.destinatarios.join(", "), sucesso: true });
      } catch (err) {
        resultados.push({ canal: "email", destino: config.email.destinatarios.join(", "), sucesso: false, detalhe: err.message });
      }
    }
  }
  if (config.whatsapp.ativo && config.whatsapp.numeros.length) {
    for (const numero of config.whatsapp.numeros) {
      if (!canais.whatsapp) {
        resultados.push({ canal: "whatsapp", destino: numero, sucesso: false, detalhe: "API do WhatsApp não configurada." });
        continue;
      }
      try {
        await enviarWhatsapp(numero, resumo);
        resultados.push({ canal: "whatsapp", destino: numero, sucesso: true });
      } catch (err) {
        resultados.push({ canal: "whatsapp", destino: numero, sucesso: false, detalhe: err.message });
      }
    }
  }
  if (!resultados.length) return { enviado: false, motivo: "Nenhum canal ativo com destinatário.", resumo };

  for (const r of resultados) await registrar(r.canal, r.destino, r.sucesso, r.detalhe);
  if (!forcar) await salvarConfiguracao("avisos", { ...config, ultimo_envio: hojeISO() });
  return { enviado: resultados.some((r) => r.sucesso), resultados, resumo };
}

export async function verificarHorario() {
  const config = await lerConfiguracao("avisos");
  if (!config.ativo || config.ultimo_envio === hojeISO()) return null;
  const agora = new Date().toLocaleTimeString("pt-BR", { timeZone: TIMEZONE, hour: "2-digit", minute: "2-digit", hour12: false });
  if (agora < config.hora) return null;
  return enviarAvisos();
}

export function iniciarAgendador() {
  if (process.env.NODE_ENV === "test") return;
  setInterval(() => verificarHorario().catch((err) => console.error("Falha nos avisos:", err.message)), 60 * 1000);
}
