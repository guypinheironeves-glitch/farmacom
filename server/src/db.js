import pg from "pg";
import "dotenv/config";

pg.types.setTypeParser(1082, (v) => v);
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

export const TIMEZONE = process.env.APP_TIMEZONE || "America/Sao_Paulo";

export const hojeISO = (deslocamentoDias = 0) =>
  new Date(Date.now() + deslocamentoDias * 86400000).toLocaleDateString("sv-SE", { timeZone: TIMEZONE });

export const query = (text, params) => pool.query(text, params);

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
