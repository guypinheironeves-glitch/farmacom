import { XMLParser } from "fast-xml-parser";
import { HttpError } from "./http-error.js";

const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  parseTagValue: false,
  isArray: (nome) => ["det", "rastro"].includes(nome),
});

const numero = (v) => Number(String(v ?? "").replace(",", "."));
const data = (v) => (v ? String(v).slice(0, 10) : null);
const semGtin = (v) => (!v || String(v).toUpperCase() === "SEM GTIN" ? null : String(v));

export function lerNfe(xml) {
  let doc;
  try {
    doc = parser.parse(xml);
  } catch {
    throw new HttpError(400, "Não foi possível ler o arquivo. Envie o XML da nota fiscal (NF-e).");
  }
  const inf = doc?.nfeProc?.NFe?.infNFe || doc?.NFe?.infNFe;
  if (!inf) throw new HttpError(400, "O arquivo não parece ser uma NF-e: não encontrei o grupo infNFe.");

  const emit = inf.emit || {};
  const itens = (inf.det || []).map((det, indice) => {
    const prod = det.prod || {};
    const quantidade = numero(prod.qCom);
    const lotes = (prod.rastro || []).map((r) => ({
      codigo: String(r.nLote || "").trim(),
      quantidade: Math.round(numero(r.qLote)),
      fabricacao: data(r.dFab),
      validade: data(r.dVal),
    }));
    return {
      indice,
      codigo_produto: String(prod.cProd || ""),
      descricao: String(prod.xProd || ""),
      ean: semGtin(prod.cEAN) || semGtin(prod.cEANTrib),
      registro_anvisa: prod.med?.cProdANVISA ? String(prod.med.cProdANVISA) : null,
      quantidade: Math.round(quantidade),
      valor_unitario: numero(prod.vUnCom),
      lotes: lotes.length ? lotes : [{ codigo: "", quantidade: Math.round(quantidade), fabricacao: null, validade: null }],
    };
  });

  return {
    nota: {
      chave: String(inf["@_Id"] || "").replace(/^NFe/, ""),
      numero: String(inf.ide?.nNF || ""),
      serie: String(inf.ide?.serie || ""),
      emissao: data(inf.ide?.dhEmi || inf.ide?.dEmi),
      valor_total: numero(inf.total?.ICMSTot?.vNF),
    },
    fornecedor: {
      cnpj: String(emit.CNPJ || ""),
      nome: String(emit.xNome || emit.xFant || ""),
      telefone: emit.enderEmit?.fone ? String(emit.enderEmit.fone) : null,
    },
    itens,
  };
}
