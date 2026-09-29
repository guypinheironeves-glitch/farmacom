import { useCallback, useEffect, useMemo, useState } from "react";
import { api, mensagemDeErro } from "../api.js";
import { cnpjFormatado, dataLocal, numero, telefoneFormatado } from "../format.js";
import { Aviso, Campo, Carregando, Icone, Modal, Vazio } from "../components/ui.jsx";
import { useAvisar } from "../components/Toasts.jsx";

const VAZIO = { nome: "", cnpj: "", telefone: "", email: "", contato: "" };

export default function Fornecedores() {
  const avisar = useAvisar();
  const [lista, setLista] = useState(null);
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState("");
  const [editado, setEditado] = useState(null);
  const [excluindo, setExcluindo] = useState(null);

  const carregar = useCallback(() => {
    api("/fornecedores").then(setLista).catch((e) => setErro(mensagemDeErro(e)));
  }, []);
  useEffect(carregar, [carregar]);

  const filtrados = useMemo(() => {
    if (!lista) return null;
    const termo = busca.trim().toLowerCase();
    const soDigitos = termo.replace(/\D/g, "");
    return lista.filter((f) => !termo || f.nome.toLowerCase().includes(termo) || (soDigitos && f.cnpj?.includes(soDigitos)));
  }, [lista, busca]);

  const excluir = async () => {
    try {
      await api(`/fornecedores/${excluindo.id}`, { method: "DELETE" });
      avisar(`${excluindo.nome} excluído.`);
      setExcluindo(null);
      carregar();
    } catch (e) {
      avisar(mensagemDeErro(e), "erro");
      setExcluindo(null);
    }
  };

  return (
    <>
      <div className="cabecalho">
        <div>
          <h1>Fornecedores</h1>
          <p className="subtitulo">Distribuidoras e laboratórios de quem a farmácia compra. Cada lote fica ligado ao fornecedor que entregou.</p>
        </div>
        <button className="botao botao-primario" onClick={() => setEditado(VAZIO)}>
          <Icone nome="mais" tamanho={18} /> Cadastrar fornecedor
        </button>
      </div>

      <div className="barra-filtros">
        <input type="search" className="filtro-busca" placeholder="Nome ou CNPJ" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar fornecedor" />
      </div>
      <Aviso>{erro}</Aviso>

      <section className="bloco sem-padding">
        {!filtrados && !erro && <div style={{ padding: 20 }}><Carregando /></div>}
        {filtrados && filtrados.length === 0 && (
          <div style={{ padding: 20 }}><Vazio>{busca ? "Nenhum fornecedor encontrado." : "Nenhum fornecedor cadastrado. Eles também são criados ao importar uma nota fiscal."}</Vazio></div>
        )}
        {filtrados && filtrados.length > 0 && (
          <div className="tabela-rolagem">
            <table>
              <thead>
                <tr><th>Fornecedor</th><th>CNPJ</th><th>Contato</th><th className="num">Lotes</th><th>Última entrega</th><th></th></tr>
              </thead>
              <tbody>
                {filtrados.map((f) => (
                  <tr key={f.id}>
                    <td><strong>{f.nome}</strong></td>
                    <td className="num-mono sem-quebra">{cnpjFormatado(f.cnpj)}</td>
                    <td>
                      {f.contato || "-"}
                      <div className="texto-fraco">{[telefoneFormatado(f.telefone), f.email].filter(Boolean).join(" · ")}</div>
                    </td>
                    <td className="num">{numero(f.total_lotes)}</td>
                    <td>{dataLocal(f.ultima_entrega)}</td>
                    <td className="acoes-linha">
                      <button className="botao-icone" onClick={() => setEditado(f)} aria-label={`Editar ${f.nome}`} title="Editar"><Icone nome="lapis" tamanho={18} /></button>
                      <button className="botao-icone" onClick={() => setExcluindo(f)} aria-label={`Excluir ${f.nome}`} title="Excluir" disabled={f.total_lotes > 0}>
                        <Icone nome="lixeira" tamanho={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editado && (
        <FormFornecedor
          inicial={editado}
          aoFechar={() => setEditado(null)}
          aoSalvar={(f) => { setEditado(null); avisar(editado.id ? "Fornecedor atualizado." : `${f.nome} cadastrado.`); carregar(); }}
        />
      )}
      {excluindo && (
        <Modal titulo="Excluir fornecedor" aoFechar={() => setExcluindo(null)}>
          <p style={{ marginTop: 0 }}>Excluir <strong>{excluindo.nome}</strong>? Essa ação não pode ser desfeita.</p>
          <div className="form-acoes">
            <button className="botao" onClick={() => setExcluindo(null)}>Cancelar</button>
            <button className="botao botao-perigo-cheio" onClick={excluir}>Excluir</button>
          </div>
        </Modal>
      )}
    </>
  );
}

function FormFornecedor({ inicial, aoFechar, aoSalvar }) {
  const [dados, setDados] = useState({ ...VAZIO, ...Object.fromEntries(Object.keys(VAZIO).map((k) => [k, inicial[k] || ""])) });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const muda = (c) => (e) => setDados({ ...dados, [c]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      const salvo = inicial.id
        ? await api(`/fornecedores/${inicial.id}`, { method: "PUT", body: dados })
        : await api("/fornecedores", { method: "POST", body: dados });
      aoSalvar(salvo);
    } catch (err) {
      setErro(mensagemDeErro(err));
      setSalvando(false);
    }
  };

  return (
    <Modal titulo={inicial.id ? "Editar fornecedor" : "Cadastrar fornecedor"} aoFechar={aoFechar}>
      <form className="form" onSubmit={enviar}>
        <Campo rotulo="Razão social ou nome *"><input value={dados.nome} onChange={muda("nome")} required autoFocus /></Campo>
        <div className="form-grade">
          <Campo rotulo="CNPJ"><input value={dados.cnpj} onChange={muda("cnpj")} inputMode="numeric" placeholder="00.000.000/0000-00" /></Campo>
          <Campo rotulo="Telefone"><input value={dados.telefone} onChange={muda("telefone")} inputMode="tel" /></Campo>
          <Campo rotulo="E-mail"><input type="email" value={dados.email} onChange={muda("email")} /></Campo>
          <Campo rotulo="Pessoa de contato"><input value={dados.contato} onChange={muda("contato")} /></Campo>
        </div>
        <Aviso>{erro}</Aviso>
        <div className="form-acoes">
          <button type="button" className="botao" onClick={aoFechar}>Cancelar</button>
          <button className="botao botao-primario sem-giro" disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</button>
        </div>
      </form>
    </Modal>
  );
}
