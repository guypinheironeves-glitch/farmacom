import "./setup-env.js";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/app.js";
import { hojeISO, pool } from "../src/db.js";
import { seedDatabase, USUARIO_DEMO } from "../db/seed.js";

const app = createApp();
let token;
const auth = () => ({ Authorization: `Bearer ${token}` });

before(async () => {
  await seedDatabase();
  const res = await request(app).post("/api/auth/login").send({ email: USUARIO_DEMO.email, senha: USUARIO_DEMO.senha });
  token = res.body.token;
});

after(() => pool.end());

async function criarComLote(dadosMedicamento, lote = {}) {
  const med = await request(app).post("/api/medicamentos").set(auth()).send(dadosMedicamento);
  assert.equal(med.status, 201, JSON.stringify(med.body));
  const l = await request(app).post(`/api/medicamentos/${med.body.id}/lotes`).set(auth())
    .send({ codigo: "L1", validade: hojeISO(200), quantidade_inicial: 20, ...lote });
  return { med: med.body, lote: l.body };
}

const receitaValida = () => ({
  receita_data: hojeISO(-1),
  prescritor_nome: "Dra. Teste",
  prescritor_registro: "CRM-PB 1",
  paciente_nome: "Paciente Teste",
});

test("código de barras com dígito verificador errado é recusado", async () => {
  const res = await request(app).post("/api/medicamentos").set(auth())
    .send({ nome: "Teste EAN", codigo_barras: "7891234567890" });
  assert.equal(res.status, 400);
  assert.equal(res.body.detalhes[0].campo, "codigo_barras");
});

test("tarja com retenção exige informar o controle especial", async () => {
  const res = await request(app).post("/api/medicamentos").set(auth())
    .send({ nome: "Teste retenção", tarja: "vermelha_retencao" });
  assert.equal(res.status, 400);
});

test("controlado não pode ser isento de prescrição", async () => {
  const res = await request(app).post("/api/medicamentos").set(auth())
    .send({ nome: "Teste isento", tarja: "sem_tarja", controle_especial: "C1" });
  assert.equal(res.status, 400);
});

test("saída de controlado sem receita é recusada e com receita é aceita", async () => {
  const { lote } = await criarComLote({ nome: "Teste C1", tarja: "vermelha_retencao", controle_especial: "C1" });
  const sem = await request(app).post("/api/movimentacoes").set(auth())
    .send({ lote_id: lote.id, tipo: "saida", quantidade: 1 });
  assert.equal(sem.status, 422);
  assert.match(sem.body.erro, /receita/);

  const com = await request(app).post("/api/movimentacoes").set(auth())
    .send({ lote_id: lote.id, tipo: "saida", quantidade: 1, ...receitaValida() });
  assert.equal(com.status, 201);
  assert.equal(com.body.prescritor_registro, "CRM-PB 1");
});

test("lista B1 exige o número da notificação de receita", async () => {
  const { lote } = await criarComLote({ nome: "Teste B1", tarja: "preta", controle_especial: "B1" });
  const res = await request(app).post("/api/movimentacoes").set(auth())
    .send({ lote_id: lote.id, tipo: "saida", quantidade: 1, ...receitaValida() });
  assert.equal(res.status, 422);
  assert.match(res.body.erro, /número da notificação/);
});

test("receita de antimicrobiano vale 10 dias (valor limite)", async () => {
  const { lote } = await criarComLote({ nome: "Teste ATM", tarja: "vermelha_retencao", controle_especial: "antimicrobiano" });
  const venda = (dias) => request(app).post("/api/movimentacoes").set(auth())
    .send({ lote_id: lote.id, tipo: "saida", quantidade: 1, ...receitaValida(), receita_data: hojeISO(-dias) });
  assert.equal((await venda(10)).status, 201);
  assert.equal((await venda(11)).status, 422);
});

test("receita com data futura é recusada", async () => {
  const { lote } = await criarComLote({ nome: "Teste futura", tarja: "vermelha_retencao", controle_especial: "C1" });
  const res = await request(app).post("/api/movimentacoes").set(auth())
    .send({ lote_id: lote.id, tipo: "saida", quantidade: 1, ...receitaValida(), receita_data: hojeISO(1) });
  assert.equal(res.status, 422);
});

test("entrada e baixa de controlado não exigem receita", async () => {
  const { lote } = await criarComLote({ nome: "Teste entrada C1", tarja: "vermelha_retencao", controle_especial: "C1" });
  const entrada = await request(app).post("/api/movimentacoes").set(auth())
    .send({ lote_id: lote.id, tipo: "entrada", quantidade: 5 });
  assert.equal(entrada.status, 201);
  const baixa = await request(app).post("/api/movimentacoes").set(auth())
    .send({ lote_id: lote.id, tipo: "baixa_avaria", quantidade: 1 });
  assert.equal(baixa.status, 201);
});

test("sugere o lote válido que vence primeiro (FEFO), ignorando vencidos e zerados", async () => {
  const { med } = await criarComLote({ nome: "Teste FEFO" }, { codigo: "TARDE", validade: hojeISO(300) });
  const lote = (codigo, dias, quantidade_inicial) =>
    request(app).post(`/api/medicamentos/${med.id}/lotes`).set(auth()).send({ codigo, validade: hojeISO(dias), quantidade_inicial });
  await lote("VENCIDO", -5, 10);
  await lote("ZERADO", 10, 0);
  const cedo = await lote("CEDO", 40, 10);
  const detalhe = await request(app).get(`/api/medicamentos/${med.id}`).set(auth());
  assert.equal(detalhe.body.lote_sugerido_id, cedo.body.id);
  assert.equal(detalhe.body.saldo_utilizavel, 30);
});

test("curva ABC classifica todos os itens vendidos e soma 100%", async () => {
  const res = await request(app).get("/api/relatorios/curva-abc").set(auth());
  assert.equal(res.status, 200);
  const { itens, resumo, total } = res.body;
  assert.ok(itens.length > 0);
  assert.equal(itens[0].classe, "A");
  assert.equal(itens.at(-1).acumulado, 100);
  const somaResumo = resumo.reduce((a, r) => a + r.faturamento, 0);
  assert.ok(Math.abs(somaResumo - total) < 0.05);
  // a ordem das classes nunca volta: A antes de B antes de C
  const ordem = itens.map((i) => i.classe).join("");
  assert.match(ordem, /^A+B*C*$/);
});

test("filtro de controlados lista apenas medicamentos com controle especial", async () => {
  const res = await request(app).get("/api/medicamentos?controlado=sim").set(auth());
  assert.ok(res.body.length > 0);
  assert.ok(res.body.every((m) => m.controle_especial));
});
