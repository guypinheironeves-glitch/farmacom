// Dados de exemplo de uma farmácia fictícia, com datas relativas a hoje
// para que sempre existam lotes vencidos, a vencer e medicamentos com estoque baixo.
import { fileURLToPath } from "node:url";
import { hojeISO, pool } from "../src/db.js";
import { hashSenha } from "../src/auth.js";
import { setupDatabase } from "./setup.js";

export const USUARIO_DEMO = { nome: "Proprietário Demo", email: "demo@farmacom.app", senha: "farmacom123" };

// [nome, princípio ativo, fabricante, apresentação, estoque mínimo, lotes]
// lote: [código, validade em dias a partir de hoje, fornecedor, preço de custo, entrada, saídas, baixa por vencimento]
const MEDICAMENTOS = [
  ["Dipirona 500 mg", "Dipirona monoidratada", "Medley", "Caixa com 10 comprimidos", 30, [
    ["DP2401", -12, "Distribuidora Nordeste", 3.2, 40, 25, 15],
    ["DP2507", 25, "Distribuidora Nordeste", 3.4, 60, 32, 0],
    ["DP2611", 310, "Distribuidora Nordeste", 3.5, 50, 0, 0]]],
  ["Paracetamol 750 mg", "Paracetamol", "EMS", "Caixa com 20 comprimidos", 25, [
    ["PC2503", 48, "Drogaria Atacado PB", 5.9, 40, 22, 0],
    ["PC2609", 400, "Drogaria Atacado PB", 6.1, 30, 0, 0]]],
  ["Amoxicilina 500 mg", "Amoxicilina tri-hidratada", "Eurofarma", "Caixa com 21 cápsulas", 10, [
    ["AM2502", 18, "Distribuidora Nordeste", 14.5, 20, 12, 0]]],
  ["Losartana 50 mg", "Losartana potássica", "Neo Química", "Caixa com 30 comprimidos", 20, [
    ["LS2504", 85, "Drogaria Atacado PB", 7.8, 40, 29, 0],
    ["LS2610", 260, "Drogaria Atacado PB", 8.0, 20, 0, 0]]],
  ["Omeprazol 20 mg", "Omeprazol", "Medley", "Caixa com 28 cápsulas", 15, [
    ["OM2412", -20, "Distribuidora Nordeste", 6.3, 20, 12, 8],
    ["OM2606", 190, "Distribuidora Nordeste", 6.5, 30, 9, 0]]],
  ["Ibuprofeno 600 mg", "Ibuprofeno", "Prati-Donaduzzi", "Caixa com 20 comprimidos", 15, [
    ["IB2505", 8, "Drogaria Atacado PB", 9.9, 25, 14, 0],
    ["IB2612", 330, "Drogaria Atacado PB", 10.2, 20, 0, 0]]],
  ["Metformina 850 mg", "Cloridrato de metformina", "Merck", "Caixa com 30 comprimidos", 20, [
    ["MF2508", 120, "Distribuidora Nordeste", 6.9, 30, 18, 0]]],
  ["Soro fisiológico 0,9%", "Cloreto de sódio", "Arboreto", "Frasco de 500 ml", 12, [
    ["SF2501", -3, "Distribuidora Nordeste", 4.1, 24, 16, 0],
    ["SF2603", 150, "Distribuidora Nordeste", 4.3, 24, 5, 0]]],
  ["Loratadina 10 mg", "Loratadina", "EMS", "Caixa com 12 comprimidos", 10, [
    ["LR2506", 55, "Drogaria Atacado PB", 5.2, 20, 7, 0]]],
  ["Sinvastatina 20 mg", "Sinvastatina", "Neo Química", "Caixa com 30 comprimidos", 15, [
    ["SV2509", 200, "Drogaria Atacado PB", 9.4, 25, 13, 0]]],
];

// Espalha as saídas pelos últimos 25 dias; em lote vencido, só antes da data de validade
function datasPassadas(qtd, seed, diasValidade) {
  const minimo = diasValidade < 0 ? -diasValidade + 1 : 1;
  const faixa = Math.max(1, 26 - minimo);
  const datas = [];
  for (let i = 0; i < qtd; i++) datas.push(minimo + ((seed * 7 + i * 5) % faixa));
  return datas;
}

function partes(total, n) {
  const base = Math.floor(total / n);
  return Array.from({ length: n }, (_, i) => base + (i < total % n ? 1 : 0)).filter((q) => q > 0);
}

export async function seedDatabase({ recriar = true } = {}) {
  if (recriar) await setupDatabase();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const u = await client.query(
      "INSERT INTO usuarios (nome, email, senha_hash) VALUES ($1, $2, $3) RETURNING id",
      [USUARIO_DEMO.nome, USUARIO_DEMO.email, await hashSenha(USUARIO_DEMO.senha)]
    );
    const usuarioId = u.rows[0].id;

    let seed = 1;
    for (const [nome, principio, fabricante, apresentacao, minimo, lotes] of MEDICAMENTOS) {
      const m = await client.query(
        `INSERT INTO medicamentos (nome, principio_ativo, fabricante, apresentacao, estoque_minimo)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [nome, principio, fabricante, apresentacao, minimo]
      );
      for (const [codigo, dias, fornecedor, preco, entrada, saidas, baixa] of lotes) {
        const l = await client.query(
          `INSERT INTO lotes (medicamento_id, codigo, validade, fornecedor, preco_custo)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [m.rows[0].id, codigo, hojeISO(dias), fornecedor, preco]
        );
        const loteId = l.rows[0].id;
        const mov = (tipo, qtd, diasAtras, obs) =>
          client.query(
            `INSERT INTO movimentacoes (lote_id, tipo, quantidade, observacao, usuario_id, criado_em)
             VALUES ($1, $2, $3, $4, $5, now() - ($6 || ' days')::INTERVAL)`,
            [loteId, tipo, qtd, obs, usuarioId, String(diasAtras)]
          );
        await mov("entrada", entrada, 28, "Compra do fornecedor");
        if (saidas > 0) {
          const qtds = partes(saidas, 4);
          const datas = datasPassadas(qtds.length, seed++, dias);
          for (let i = 0; i < qtds.length; i++) await mov("saida", qtds[i], datas[i], "Venda no balcão");
        }
        if (baixa > 0) await mov("baixa_vencimento", baixa, Math.max(0, -dias - 1), "Descarte de medicamento vencido");
      }
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedDatabase()
    .then(() => {
      console.log(`Dados de exemplo criados. Login: ${USUARIO_DEMO.email} / ${USUARIO_DEMO.senha}`);
      return pool.end();
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
