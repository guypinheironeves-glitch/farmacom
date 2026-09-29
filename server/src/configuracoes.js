import { query } from "./db.js";

export const PADROES = {
  farmacia: {
    nome: "",
    cnpj: "",
    cidade: "",
    uf: "",
    responsavel_tecnico: "",
    crf: "",
    cpf_responsavel: "",
  },
  aparencia: { cor_destaque: "#14746F" },
  avisos: {
    ativo: false,
    hora: "08:00",
    dias_validade: 30,
    email: { ativo: false, destinatarios: [] },
    whatsapp: { ativo: false, numeros: [] },
    ultimo_envio: null,
  },
};

export async function lerConfiguracao(chave) {
  const { rows } = await query("SELECT valor FROM configuracoes WHERE chave = $1", [chave]);
  const padrao = PADROES[chave];
  if (!rows[0]) return structuredClone(padrao);
  return { ...structuredClone(padrao), ...rows[0].valor };
}

export async function salvarConfiguracao(chave, valor) {
  await query(
    `INSERT INTO configuracoes (chave, valor) VALUES ($1, $2)
     ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor`,
    [chave, JSON.stringify(valor)]
  );
  return valor;
}
