import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { pool } from "../src/db.js";

const pasta = join(dirname(fileURLToPath(import.meta.url)), "migracoes");

export async function resetar() {
  await pool.query(`
    DROP VIEW IF EXISTS saldo_lotes;
    DROP TABLE IF EXISTS avisos_enviados, movimentacoes, lotes, medicamentos, fornecedores,
      configuracoes, usuarios, migracoes CASCADE;
    DROP TYPE IF EXISTS tipo_movimentacao, tipo_medicamento, tarja_medicamento, perfil_usuario;
  `);
}

export async function migrar() {
  const temControle = await pool.query("SELECT to_regclass('migracoes') AS t");
  if (!temControle.rows[0].t) {
    const antigo = await pool.query("SELECT to_regclass('usuarios') AS t");
    if (antigo.rows[0].t) await resetar();
    await pool.query("CREATE TABLE migracoes (nome VARCHAR(80) PRIMARY KEY, aplicada_em TIMESTAMPTZ NOT NULL DEFAULT now())");
  }
  const feitas = new Set((await pool.query("SELECT nome FROM migracoes")).rows.map((r) => r.nome));
  const arquivos = (await readdir(pasta)).filter((f) => f.endsWith(".sql")).sort();
  const aplicadas = [];
  for (const arquivo of arquivos) {
    if (feitas.has(arquivo)) continue;
    const sql = await readFile(join(pasta, arquivo), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO migracoes (nome) VALUES ($1)", [arquivo]);
      await client.query("COMMIT");
      aplicadas.push(arquivo);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
  return aplicadas;
}
