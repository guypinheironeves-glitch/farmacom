import "dotenv/config";
import { createApp } from "./app.js";
import { iniciarAgendador } from "./avisos.js";

const port = Number(process.env.PORT) || 3333;

createApp().listen(port, () => {
  console.log(`API do FarmaCom rodando em http://localhost:${port}`);
  iniciarAgendador();
});
