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

test("login com senha errada é recusado", async () => {
  const res = await request(app).post("/api/auth/login").send({ email: USUARIO_DEMO.email, senha: "errada" });
  assert.equal(res.status, 401);
});

test("rotas protegidas exigem login", async () => {
  const res = await request(app).get("/api/medicamentos");
  assert.equal(res.status, 401);
});

test("cadastro de medicamento valida o nome", async () => {
  const res = await request(app).post("/api/medicamentos").set(auth()).send({ nome: "" });
  assert.equal(res.status, 400);
  assert.equal(res.body.detalhes[0].campo, "nome");
});

test("lote com quantidade inicial gera entrada e saldo", async () => {
  const med = await request(app).post("/api/medicamentos").set(auth())
    .send({ nome: "Teste 10 mg", estoque_minimo: 5 });
  assert.equal(med.status, 201);

  const lote = await request(app).post(`/api/medicamentos/${med.body.id}/lotes`).set(auth())
    .send({ codigo: "T001", validade: hojeISO(100), quantidade_inicial: 12, preco_custo: 2.5 });
  assert.equal(lote.status, 201);

  const detalhe = await request(app).get(`/api/medicamentos/${med.body.id}`).set(auth());
  assert.equal(detalhe.body.saldo_total, 12);
  assert.equal(detalhe.body.lotes[0].dias_para_vencer, 100);
});

test("código de lote repetido no mesmo medicamento é recusado", async () => {
  const med = await request(app).post("/api/medicamentos").set(auth()).send({ nome: "Teste duplicado" });
  const dados = { codigo: "DUP1", validade: hojeISO(30) };
  await request(app).post(`/api/medicamentos/${med.body.id}/lotes`).set(auth()).send(dados);
  const res = await request(app).post(`/api/medicamentos/${med.body.id}/lotes`).set(auth()).send(dados);
  assert.equal(res.status, 409);
});

test("saída maior que o saldo é recusada (valor limite)", async () => {
  const med = await request(app).post("/api/medicamentos").set(auth()).send({ nome: "Teste saldo" });
  const lote = await request(app).post(`/api/medicamentos/${med.body.id}/lotes`).set(auth())
    .send({ codigo: "S1", validade: hojeISO(60), quantidade_inicial: 5 });

  const acima = await request(app).post("/api/movimentacoes").set(auth())
    .send({ lote_id: lote.body.id, tipo: "saida", quantidade: 6 });
  assert.equal(acima.status, 422);

  const exato = await request(app).post("/api/movimentacoes").set(auth())
    .send({ lote_id: lote.body.id, tipo: "saida", quantidade: 5 });
  assert.equal(exato.status, 201);
  assert.equal(exato.body.saldo_lote, 0);
});

test("quantidade zero ou negativa é recusada", async () => {
  for (const quantidade of [0, -3]) {
    const res = await request(app).post("/api/movimentacoes").set(auth())
      .send({ lote_id: 1, tipo: "entrada", quantidade });
    assert.equal(res.status, 400);
  }
});

test("lote vencido não pode ter saída para venda, só baixa", async () => {
  const med = await request(app).post("/api/medicamentos").set(auth()).send({ nome: "Teste vencido" });
  const lote = await request(app).post(`/api/medicamentos/${med.body.id}/lotes`).set(auth())
    .send({ codigo: "V1", validade: hojeISO(-1), quantidade_inicial: 4, preco_custo: 10 });

  const venda = await request(app).post("/api/movimentacoes").set(auth())
    .send({ lote_id: lote.body.id, tipo: "saida", quantidade: 1 });
  assert.equal(venda.status, 422);

  const baixa = await request(app).post("/api/movimentacoes").set(auth())
    .send({ lote_id: lote.body.id, tipo: "baixa_vencimento", quantidade: 4 });
  assert.equal(baixa.status, 201);

  const perdas = await request(app).get("/api/relatorios/perdas").set(auth());
  const item = perdas.body.itens.find((i) => i.lote === "V1");
  assert.equal(item.quantidade, 4);
  assert.equal(item.valor, 40);
});

test("alerta inclui lotes dentro do prazo e exclui os de fora", async () => {
  const med = await request(app).post("/api/medicamentos").set(auth()).send({ nome: "Teste alerta" });
  const criar = (codigo, dias) =>
    request(app).post(`/api/medicamentos/${med.body.id}/lotes`).set(auth())
      .send({ codigo, validade: hojeISO(dias), quantidade_inicial: 3 });
  await criar("A30", 30);
  await criar("A31", 31);

  const res = await request(app).get("/api/alertas?dias=30").set(auth());
  const lotes = res.body.validade.map((l) => l.lote);
  assert.ok(lotes.includes("A30"));
  assert.ok(!lotes.includes("A31"));
});

test("medicamento abaixo do estoque mínimo aparece no alerta", async () => {
  const med = await request(app).post("/api/medicamentos").set(auth()).send({ nome: "Teste mínimo", estoque_minimo: 10 });
  await request(app).post(`/api/medicamentos/${med.body.id}/lotes`).set(auth())
    .send({ codigo: "M1", validade: hojeISO(200), quantidade_inicial: 9 });
  const res = await request(app).get("/api/alertas").set(auth());
  assert.ok(res.body.estoque_baixo.some((m) => m.medicamento_id === med.body.id));
});

test("edição de lote altera validade e custo sem mexer no saldo", async () => {
  const med = await request(app).post("/api/medicamentos").set(auth()).send({ nome: "Teste edição" });
  const lote = await request(app).post(`/api/medicamentos/${med.body.id}/lotes`).set(auth())
    .send({ codigo: "E1", validade: hojeISO(50), quantidade_inicial: 7 });
  const res = await request(app).put(`/api/lotes/${lote.body.id}`).set(auth())
    .send({ codigo: "E1", validade: hojeISO(80), preco_custo: 3.5 });
  assert.equal(res.status, 200);
  const detalhe = await request(app).get(`/api/medicamentos/${med.body.id}`).set(auth());
  assert.equal(detalhe.body.lotes[0].dias_para_vencer, 80);
  assert.equal(detalhe.body.lotes[0].preco_custo, 3.5);
  assert.equal(detalhe.body.saldo_total, 7);
});

test("filtro de movimentações por tipo", async () => {
  const res = await request(app).get("/api/movimentacoes?tipo=entrada").set(auth());
  assert.ok(res.body.length > 0);
  assert.ok(res.body.every((m) => m.tipo === "entrada"));
});
