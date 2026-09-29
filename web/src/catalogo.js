import { useEffect, useState } from "react";
import { api } from "./api.js";

let cache = null;
let pendente = null;

export function useCatalogo() {
  const [catalogo, setCatalogo] = useState(cache);
  useEffect(() => {
    if (cache) return;
    pendente = pendente || api("/catalogo").then((c) => (cache = c));
    pendente.then(setCatalogo).catch(() => {
      pendente = null;
    });
  }, []);
  return catalogo;
}

export const FRASE_TARJA = {
  sem_tarja: null,
  vermelha: "Venda sob prescrição médica",
  vermelha_retencao: "Venda sob prescrição médica. Só pode ser vendido com retenção da receita",
  preta: "Venda sob prescrição médica. O abuso deste medicamento pode causar dependência",
};

export const ROTULO_TARJA_CURTO = {
  sem_tarja: "Sem tarja",
  vermelha: "Vermelha",
  vermelha_retencao: "Vermelha com retenção",
  preta: "Preta",
};

export const ROTULO_TIPO = { referencia: "Referência", generico: "Genérico", similar: "Similar" };

export const rotuloControle = (c) => (c === "antimicrobiano" ? "Antimicrobiano" : c ? `Lista ${c}` : null);
