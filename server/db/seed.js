import { fileURLToPath } from "node:url";
import { hojeISO, pool } from "../src/db.js";
import { hashSenha } from "../src/auth.js";
import { migrar, resetar } from "./banco.js";
import { CATALOGO_DEMO, FORNECEDORES, PACIENTES, PRESCRITORES } from "./catalogo-demo.js";

export const USUARIO_DEMO = { nome: "Proprietário Demo", email: "demo@farmacom.app", senha: "farmacom123" };
export const ATENDENTE_DEMO = { nome: "Atendente Demo", email: "atendente@farmacom.app", senha: "farmacom123" };

function cnpjFicticio(filial) {
  const base = `11222333${String(filial).padStart(4, "0")}`;
  const dv = (numeros, pesos) => {
    const resto = numeros.split("").reduce((acc, d, i) => acc + Number(d) * pesos[i], 0) % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = dv(base, p1);
  return `${base}${d1}${dv(base + d1, [6, ...p1])}`;
}

function chaveNfe(cnpj, numero, diasAtras) {
  const d = new Date(Date.now() - diasAtras * 86400000);
  const aamm = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}`;
  return `25${aamm}${cnpj}55001${String(numero).padStart(9, "0")}1${String(numero * 7919).padStart(8, "0").slice(-8)}0`;
}

function gerador(semente) {
  let s = semente >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function ean(sequencia) {
  const base = `200${String(sequencia).padStart(9, "0")}`;
  const soma = base.split("").reduce((acc, d, i) => acc + Number(d) * (i % 2 ? 3 : 1), 0);
  return base + ((10 - (soma % 10)) % 10);
}

function siglaLote(nome, n) {
  const letras = nome.normalize("NFD").replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 2);
  return `${letras}${String(26 + n).padStart(2, "0")}${String(100 + n * 37).slice(-3)}`;
}

function planejar(item, indice) {
  const [nome, , , , , , , controle, , , custo, minimo, demanda, cenario = ""] = item;
  const rnd = gerador(indice * 97 + 13);
  const vendasMes = Math.max(3, Math.round(demanda ** 1.7 / 12));
  const tem = (c) => (cenario || "").split(" ").includes(c);
  const lotes = [];
  const fornecedor = () => Math.floor(rnd() * FORNECEDORES.length);
  const custoLote = (fator = 1) => Number((custo * fator).toFixed(2));

  if (tem("vencido")) {
    lotes.push({ validade: -(2 + Math.floor(rnd() * 8)), entrada: Math.ceil(vendasMes * 0.6) + 4, diasAtras: 60, custo: custoLote(0.97), sobra: true });
  }
  if (tem("baixado")) {
    lotes.push({ validade: -(4 + Math.floor(rnd() * 14)), entrada: Math.ceil(vendasMes * 0.5) + 6, diasAtras: 70, custo: custoLote(0.97), baixa: true });
  }
  let validade = 120 + Math.floor(rnd() * 420);
  if (tem("vence30")) validade = 6 + Math.floor(rnd() * 22);
  if (tem("vence90")) validade = 40 + Math.floor(rnd() * 45);
  const entradaPrincipal = tem("baixo")
    ? Math.ceil(vendasMes * 0.9) + minimo
    : Math.max(Math.ceil(vendasMes * (1.4 + rnd())), minimo + vendasMes + 4);
  lotes.push({ validade, entrada: entradaPrincipal, diasAtras: 35, custo: custoLote() });
  if (!tem("baixo") && vendasMes >= 25) {
    lotes.push({ validade: validade + 150 + Math.floor(rnd() * 200), entrada: Math.ceil(vendasMes * (0.6 + rnd() * 0.6)), diasAtras: 8 + Math.floor(rnd() * 8), custo: custoLote(1.03) });
  }
  lotes.forEach((l, n) => {
    l.codigo = siglaLote(nome, indice * 3 + n);
    l.fornecedor = fornecedor();
    l.saldo = 0;
  });

  const movimentos = lotes.map((l, i) => ({ lote: i, tipo: "entrada", quantidade: l.entrada, diasAtras: l.diasAtras, obs: "Compra do fornecedor" }));
  lotes.forEach((l) => (l.saldo = l.entrada));
  let restante = Math.round(vendasMes * (0.85 + rnd() * 0.3));
  if (tem("baixo")) restante = entradaPrincipal - Math.max(1, Math.floor(minimo * 0.4));
  const vendas = [];
  while (restante > 0) {
    const qtd = Math.min(restante, 1 + Math.floor(rnd() * (vendasMes > 40 ? 4 : 2)));
    vendas.push({ qtd, diasAtras: 1 + Math.floor(rnd() * 27) });
    restante -= qtd;
  }
  vendas.sort((a, b) => b.diasAtras - a.diasAtras);
  for (const v of vendas) {
    const candidatos = lotes
      .map((l, i) => ({ l, i }))
      .filter(({ l }) => l.diasAtras >= v.diasAtras && l.validade >= -v.diasAtras && l.saldo >= v.qtd && !((l.sobra || l.baixa) && v.diasAtras < -l.validade + 12))
      .sort((a, b) => a.l.validade - b.l.validade);
    if (!candidatos.length) continue;
    const { l, i } = candidatos[0];
    l.saldo -= v.qtd;
    const mov = { lote: i, tipo: "saida", quantidade: v.qtd, diasAtras: v.diasAtras, obs: controle ? null : "Venda no balcão" };
    if (controle) {
      const [prescritor, registro] = PRESCRITORES[Math.floor(rnd() * (controle === "antimicrobiano" ? 4 : 3))];
      mov.receita = {
        receita_numero: controle.startsWith("B") || controle.startsWith("A") ? `PB${String(Math.floor(rnd() * 1e8)).padStart(8, "0")}` : null,
        diasReceita: v.diasAtras + Math.floor(rnd() * 3),
        prescritor_nome: prescritor,
        prescritor_registro: registro,
        paciente_nome: PACIENTES[Math.floor(rnd() * PACIENTES.length)],
      };
    }
    movimentos.push(mov);
  }
  lotes.forEach((l, i) => {
    if (l.baixa && l.saldo > 0) {
      movimentos.push({ lote: i, tipo: "baixa_vencimento", quantidade: l.saldo, diasAtras: Math.max(0, -l.validade - 1), obs: "Descarte de medicamento vencido" });
      l.saldo = 0;
    }
  });
  if (tem("avaria")) {
    const i = lotes.length - 1;
    if (lotes[i].saldo > 2) {
      movimentos.push({ lote: i, tipo: "baixa_avaria", quantidade: 2, diasAtras: 5, obs: "Embalagem danificada no recebimento" });
      lotes[i].saldo -= 2;
    }
  }
  return { lotes, movimentos };
}

export async function seedDatabase({ recriar = true } = {}) {
  if (recriar) await resetar();
  await migrar();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const u = await client.query(
      "INSERT INTO usuarios (nome, email, senha_hash) VALUES ($1, $2, $3) RETURNING id",
      [USUARIO_DEMO.nome, USUARIO_DEMO.email, await hashSenha(USUARIO_DEMO.senha)]
    );
    const usuarioId = u.rows[0].id;
    await client.query("UPDATE usuarios SET perfil = 'administrador' WHERE id = $1", [usuarioId]);
    await client.query(
      "INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES ($1, $2, $3, 'atendente')",
      [ATENDENTE_DEMO.nome, ATENDENTE_DEMO.email, await hashSenha(ATENDENTE_DEMO.senha)]
    );
    await client.query("INSERT INTO configuracoes (chave, valor) VALUES ('farmacia', $1)", [
      JSON.stringify({
        nome: "Farmácia Bem-Estar (fictícia)",
        cnpj: "11222333000181",
        cidade: "Campina Grande",
        uf: "PB",
        responsavel_tecnico: "Dra. Renata Albuquerque",
        crf: "CRF-PB 0000",
        cpf_responsavel: "12345678909",
      }),
    ]);
    const fornecedorIds = [];
    for (const f of FORNECEDORES) {
      const r = await client.query(
        "INSERT INTO fornecedores (nome, cnpj, telefone, contato) VALUES ($1, $2, $3, $4) RETURNING id, cnpj",
        [f.nome, cnpjFicticio(f.filial), f.telefone, f.contato]
      );
      fornecedorIds.push(r.rows[0]);
    }
    let numeroNota = 1000;

    for (let indice = 0; indice < CATALOGO_DEMO.length; indice++) {
      const item = CATALOGO_DEMO[indice];
      const [nome, principio, fabricante, apresentacao, categoria, tipo, tarja, controle, refrigerado, preco, , minimo] = item;
      const m = await client.query(
        `INSERT INTO medicamentos (nome, principio_ativo, fabricante, apresentacao, categoria, tipo, tarja,
                                   controle_especial, refrigerado, codigo_barras, registro_anvisa, preco_venda, estoque_minimo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
        [nome, principio, fabricante, apresentacao, categoria, tipo, tarja, controle, refrigerado, ean(indice + 1),
          `9${String(indice + 1).padStart(12, "0")}`, preco, minimo]
      );
      const { lotes, movimentos } = planejar(item, indice);
      const ids = [];
      for (const l of lotes) {
        const r = await client.query(
          `INSERT INTO lotes (medicamento_id, codigo, validade, fornecedor_id, preco_custo, nota_fiscal)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [m.rows[0].id, l.codigo, hojeISO(l.validade), fornecedorIds[l.fornecedor].id, l.custo,
            chaveNfe(fornecedorIds[l.fornecedor].cnpj, numeroNota++, l.diasAtras)]
        );
        ids.push(r.rows[0].id);
      }
      for (const mv of movimentos) {
        const r = mv.receita || {};
        await client.query(
          `INSERT INTO movimentacoes (lote_id, tipo, quantidade, observacao, receita_numero, receita_data,
                                      prescritor_nome, prescritor_registro, paciente_nome, usuario_id, criado_em)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                   now() - ($11 || ' days')::INTERVAL - (($12)::INTEGER || ' minutes')::INTERVAL)`,
          [
            ids[mv.lote], mv.tipo, mv.quantidade, mv.obs, r.receita_numero || null,
            mv.receita ? hojeISO(-r.diasReceita) : null, r.prescritor_nome || null, r.prescritor_registro || null,
            r.paciente_nome || null, usuarioId, String(mv.diasAtras), (indice * 7 + mv.quantidade * 13) % 540,
          ]
        );
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
