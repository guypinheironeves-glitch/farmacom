// Cliente da API: adiciona o token de login e trata os erros em português
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
      /* navegador sem armazenamento: a sessão dura até recarregar */
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
    throw new ApiError(0, { erro: "Sem conexão com o servidor. Verifique se a API está rodando." });
  }

  if (res.status === 204) return null;
  const dados = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token) aoExpirar();
    throw new ApiError(res.status, dados);
  }
  return dados;
}

// Mensagem de erro com o detalhe do primeiro campo inválido, quando houver
export function mensagemDeErro(err) {
  if (err instanceof ApiError && err.detalhes.length) return `${err.message} ${err.detalhes[0].mensagem}`;
  return err.message;
}
