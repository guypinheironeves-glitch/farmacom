const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const CHAVE_TOKEN = "farmacom.token";

export const sessao = {
  get token() {
    try {
      return localStorage.getItem(CHAVE_TOKEN);
    } catch {
      return null;
    }
  },
  salvar(token) {
    try {
      localStorage.setItem(CHAVE_TOKEN, token);
    } catch {
      /* sem armazenamento */
    }
  },
  limpar() {
    try {
      localStorage.removeItem(CHAVE_TOKEN);
    } catch {
      /* ignora */
    }
  },
};

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.erro || "Não foi possível completar a operação.");
    this.status = status;
    this.detalhes = body?.detalhes || [];
  }
}

let aoExpirar = () => {};
export const quandoSessaoExpirar = (fn) => {
  aoExpirar = fn;
};

export async function api(caminho, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = sessao.token;
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE}/api${caminho}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, { erro: "Sem resposta do servidor. Se ele estava parado, pode levar até 1 minuto para iniciar. Tente de novo." });
  }

  if (res.status === 204) return null;
  const dados = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token) aoExpirar();
    throw new ApiError(res.status, dados);
  }
  return dados;
}

export async function baixarArquivo(caminho, nomeArquivo) {
  const res = await fetch(`${BASE}/api${caminho}`, { headers: { Authorization: `Bearer ${sessao.token}` } });
  if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null));
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}

export function mensagemDeErro(err) {
  if (err instanceof ApiError && err.detalhes.length) return `${err.message} ${err.detalhes[0].mensagem}`;
  return err.message;
}
