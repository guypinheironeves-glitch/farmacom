import "./setup-env.js";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import request from "supertest";
import { createApp } from "../src/app.js";
import { hojeISO, pool } from "../src/db.js";
import { seedDatabase, USUARIO_DEMO, ATENDENTE_DEMO } from "../db/seed.js";
import { migrar, resetar } from "../db/banco.js";
import { cnpjValido, cpfValido } from "../src/validacao.js";
import { lerRegistroProfissional } from "../src/sngpc.js";

const app = createApp();
let admin;
let atendente;
const como = (token) => ({ Authorization: `Bearer ${token}` });
const login = async (u) => (await request(app).post("/api/auth/login").send({ email: u.email, senha: u.senha })).body.token;

before(async () => {
  await seedDatabase();
  admin = await login(USUARIO_DEMO);
  atendente = await login(ATENDENTE_DEMO);
});

after(() => pool.end());

test("valida CNPJ e CPF pelos dígitos verificadores", () => {
  assert.ok(cnpjValido("11.222.333/0001-81"));
  assert.ok(!cnpjValido("11.222.333/0001-82"));
  assert.ok(cpfValido("123.456.789-09"));
  assert.ok(!cpfValido("111.111.111-11"));
});

test("fornecedor com CNPJ inválido é recusado", async () => {
  const res = await request(app).post("/api/fornecedores").set(como(admin)).send({ nome: "Teste", cnpj: "11222333000100" });
  assert.equal(res.status, 400);
});

test("fornecedor com lotes não pode ser excluído", async () => {
  const lista = await request(app).get("/api/fornecedores").set(como(admin));
  const usado = lista.body.find((f) => f.total_lotes > 0);
  const res = await request(app).delete(`/api/fornecedores/${usado.id}`).set(como(admin));
  assert.equal(res.status, 409);
});

test("atendente não acessa usuários nem exclui medicamento", async () => {
  assert.equal((await request(app).get("/api/usuarios").set(como(atendente))).status, 403);
  assert.equal((await request(app).delete("/api/medicamentos/1").set(como(atendente))).status, 403);
});

test("usuário desativado não consegue entrar", async () => {
  const novo = await request(app).post("/api/usuarios").set(como(admin))
    .send({ nome: "Temporário", email: "temp@farmacom.app", perfil: "atendente", senha: "senhaforte1" });
  assert.equal(novo.status, 201);
  await request(app).put(`/api/usuarios/${novo.body.id}`).set(como(admin)).send({ nome: "Temporário", perfil: "atendente", ativo: false });
  const res = await request(app).post("/api/auth/login").send({ email: "temp@farmacom.app", senha: "senhaforte1" });
  assert.equal(res.status, 403);
});

test("troca de senha exige a senha atual", async () => {
  const res = await request(app).put("/api/auth/senha").set(como(atendente)).send({ senha_atual: "errada", nova_senha: "novasenha123" });
  assert.equal(res.status, 422);
});

test("estorno desfaz a movimentação e não pode ser repetido", async () => {
  const med = await request(app).post("/api/medicamentos").set(como(admin)).send({ nome: "Teste estorno" });
  const lote = await request(app).post(`/api/medicamentos/${med.body.id}/lotes`).set(como(admin))
    .send({ codigo: "ES1", validade: hojeISO(90), quantidade_inicial: 10 });
  const venda = await request(app).post("/api/movimentacoes").set(como(admin)).send({ lote_id: lote.body.id, tipo: "saida", quantidade: 4 });
  assert.equal(venda.body.saldo_lote, 6);

  assert.equal((await request(app).post(`/api/movimentacoes/${venda.body.id}/estorno`).set(como(atendente)).send({ motivo: "Digitado errado" })).status, 403);
  const estorno = await request(app).post(`/api/movimentacoes/${venda.body.id}/estorno`).set(como(admin)).send({ motivo: "Digitado errado" });
  assert.equal(estorno.status, 201);
  const detalhe = await request(app).get(`/api/medicamentos/${med.body.id}`).set(como(admin));
  assert.equal(detalhe.body.saldo_total, 10);
  const repetido = await request(app).post(`/api/movimentacoes/${venda.body.id}/estorno`).set(como(admin)).send({ motivo: "De novo" });
  assert.equal(repetido.status, 409);
});

test("inventário ajusta o saldo para a contagem física", async () => {
  const med = await request(app).post("/api/medicamentos").set(como(admin)).send({ nome: "Teste inventário" });
  const lote = await request(app).post(`/api/medicamentos/${med.body.id}/lotes`).set(como(admin))
    .send({ codigo: "IN1", validade: hojeISO(90), quantidade_inicial: 10 });
  const res = await request(app).post(`/api/lotes/${lote.body.id}/inventario`).set(como(admin)).send({ contagem: 7 });
  assert.equal(res.body.diferenca, -3);
  const detalhe = await request(app).get(`/api/medicamentos/${med.body.id}`).set(como(admin));
  assert.equal(detalhe.body.saldo_total, 7);
});

test("NF-e: reconhece itens pelo código de barras e importa lotes uma única vez", async () => {
  const xml = await readFile(new URL("./nfe-exemplo.xml", import.meta.url), "utf8");
  const analise = await request(app).post("/api/nfe/analisar").set(como(admin)).send({ xml });
  assert.equal(analise.status, 200);
  assert.equal(analise.body.nota.numero, "4587");
  assert.equal(analise.body.fornecedor.cadastrado, false);
  assert.equal(analise.body.itens.length, 4);
  assert.equal(analise.body.itens.filter((i) => i.medicamento_id).length, 3);
  assert.equal(analise.body.itens[0].lotes.length, 2);

  const itens = analise.body.itens.filter((i) => i.medicamento_id).map((i) => ({
    medicamento_id: i.medicamento_id, valor_unitario: i.valor_unitario, lotes: i.lotes,
  }));
  const corpo = { nota: analise.body.nota, fornecedor: analise.body.fornecedor, itens };
  const importacao = await request(app).post("/api/nfe/importar").set(como(admin)).send(corpo);
  assert.equal(importacao.status, 201);
  assert.equal(importacao.body.lotes_criados, 4);
  assert.equal(importacao.body.unidades, 90);
  const repetida = await request(app).post("/api/nfe/importar").set(como(admin)).send(corpo);
  assert.equal(repetida.status, 409);
});

test("NF-e: arquivo que não é nota fiscal é recusado", async () => {
  const res = await request(app).post("/api/nfe/analisar").set(como(admin)).send({ xml: "<pedido><item/></pedido>" });
  assert.equal(res.status, 400);
});

test("SNGPC: gera o arquivo com as vendas de controlados do período", async () => {
  const conferencia = await request(app).get("/api/relatorios/sngpc").set(como(admin));
  assert.ok(conferencia.body.totais.saidas > 0);
  const arquivo = await request(app).get("/api/relatorios/sngpc/arquivo").set(como(admin));
  assert.equal(arquivo.status, 200);
  assert.match(arquivo.headers["content-type"], /xml/);
  assert.match(arquivo.text, /<cnpjEmissor>11222333000181<\/cnpjEmissor>/);
  assert.match(arquivo.text, /<saidaMedicamentoVendaAoConsumidor>/);
});

test("SNGPC: separa conselho, UF e número do registro do prescritor", () => {
  assert.deepEqual(lerRegistroProfissional("CRM-PB 12345"), { conselho: "CRM", uf: "PB", numero: "12345" });
  assert.deepEqual(lerRegistroProfissional("cro/pb 4312"), { conselho: "CRO", uf: "PB", numero: "4312" });
});

test("avisos: prévia lista vencidos e estoque baixo e envio sem canal configurado não quebra", async () => {
  const previa = await request(app).get("/api/avisos/previa").set(como(admin));
  assert.ok(previa.body.total > 0);
  assert.match(previa.body.texto, /Vencidos/);
  await request(app).put("/api/configuracoes/avisos").set(como(admin)).send({
    ativo: true, hora: "08:00", dias_validade: 30,
    email: { ativo: true, destinatarios: ["dono@farmacia.com"] },
    whatsapp: { ativo: false, numeros: [] },
  });
  const teste = await request(app).post("/api/avisos/teste").set(como(admin));
  assert.equal(teste.status, 200);
  assert.equal(teste.body.enviado, false);
  assert.match(teste.body.resultados[0].detalhe, /não configurado/);
});

test("configuração de cor aceita apenas hexadecimal", async () => {
  assert.equal((await request(app).put("/api/configuracoes/aparencia").set(como(admin)).send({ cor_destaque: "azul" })).status, 400);
  assert.equal((await request(app).put("/api/configuracoes/aparencia").set(como(admin)).send({ cor_destaque: "#1F5FAD" })).status, 200);
  assert.equal((await request(app).get("/api/aparencia")).body.cor_destaque, "#1F5FAD");
});

test("gráficos do painel trazem 30 dias de vendas", async () => {
  const res = await request(app).get("/api/painel/graficos").set(como(admin));
  assert.equal(res.body.vendas_diarias.length, 30);
  assert.ok(res.body.estoque_por_categoria.length <= 6);
  assert.ok(res.body.mais_vendidos.length > 0);
});

test("migração recria um banco antigo sem perder a possibilidade de rodar de novo", async () => {
  await resetar();
  await pool.query("CREATE TABLE usuarios (id SERIAL PRIMARY KEY)");
  const primeira = await migrar();
  assert.deepEqual(primeira, ["001_inicial.sql"]);
  assert.deepEqual(await migrar(), []);
  await seedDatabase();
});
