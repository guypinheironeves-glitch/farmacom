import pg from "pg";
import "dotenv/config";

// DATE (OID 1082) volta como texto "AAAA-MM-DD", sem conversão de fuso horário
pg.types.setTypeParser(1082, (v) => v);
// NUMERIC (OID 1700) volta como número
pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));

const connectionString =
  process.env.NODE_ENV === "test"
    ? process.env.DATABASE_URL_TEST || "postgres://farmacom:farmacom@localhost:5432/farmacom_test"
    : process.env.DATABASE_URL || "postgres://farmacom:farmacom@localhost:5432/farmacom";

const useSsl = process.env.DATABASE_SSL === "true";

export const pool = new pg.Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
});

// Datas como "hoje" e "vencido" seguem o fuso da farmácia, não o do servidor
export const TIMEZONE = process.env.APP_TIMEZONE || "America/Sao_Paulo";

// Data de hoje no fuso da farmácia, no formato AAAA-MM-DD
export const hojeISO = (deslocamentoDias = 0) =>
  new Date(Date.now() + deslocamentoDias * 86400000).toLocaleDateString("sv-SE", { timeZone: TIMEZONE });

export const query = (text, params) => pool.query(text, params);

// Executa uma função dentro de uma transação
export async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
