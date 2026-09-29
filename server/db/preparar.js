import { pool, query } from "../src/db.js";
import { migrar } from "./banco.js";
import { seedDatabase } from "./seed.js";

const aplicadas = await migrar();
if (aplicadas.length) console.log(`Migrações aplicadas: ${aplicadas.join(", ")}`);
const { rows } = await query("SELECT COUNT(*)::INTEGER AS n FROM usuarios");
if (rows[0].n === 0) {
  await seedDatabase({ recriar: false });
  console.log("Banco vazio: dados de demonstração criados.");
} else {
  console.log("Banco pronto. Dados existentes mantidos.");
}
await pool.end();
