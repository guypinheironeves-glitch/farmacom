import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { pool } from "../src/db.js";

const here = dirname(fileURLToPath(import.meta.url));

export async function setupDatabase() {
  const sql = await readFile(join(here, "schema.sql"), "utf8");
  await pool.query(sql);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  setupDatabase()
    .then(() => {
      console.log("Banco de dados criado.");
      return pool.end();
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
