import { useState } from "react";
import { api, mensagemDeErro } from "../api.js";
import { ROTULO_TIPO, useCatalogo } from "../catalogo.js";
import { Aviso, Campo, Modal } from "./ui.jsx";

const VAZIO = {
  nome: "", principio_ativo: "", fabricante: "", apresentacao: "", categoria: "", tipo: "generico",
  tarja: "vermelha", controle_especial: "", refrigerado: false, codigo_barras: "", preco_venda: "", estoque_minimo: 0,
};

export default function FormMedicamento({ inicial, aoFechar, aoSalvar }) {
  const catalogo = useCatalogo();
  const [dados, setDados] = useState(() => {
    if (!inicial) return VAZIO;
    const d = { ...VAZIO };
    Object.keys(VAZIO).forEach((k) => (d[k] = inicial[k] ?? VAZIO[k]));
    return d;
  });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const muda = (campo) => (e) => {
    const valor = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    const novo = { ...dados, [campo]: valor };
    if (campo === "controle_especial" && valor) {
      novo.tarja = /^[AB]/.test(valor) ? "preta" : "vermelha_retencao";
    }
    if (campo === "controle_especial" && !valor && ["vermelha_retencao", "preta"].includes(dados.tarja)) novo.tarja = "vermelha";
    setDados(novo);
  };

  const enviar = async (e) => {
    e.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      const corpo = {
        ...dados,
        categoria: dados.categoria || null,
        controle_especial: dados.controle_especial || null,
        codigo_barras: dados.codigo_barras || null,
        preco_venda: dados.preco_venda === "" || dados.preco_venda === null ? null : Number(dados.preco_venda),
        estoque_minimo: Number(dados.estoque_minimo) || 0,
      };
      const salvo = inicial
        ? await api(`/medicamentos/${inicial.id}`, { method: "PUT", body: corpo })
        : await api("/medicamentos", { method: "POST", body: corpo });
      aoSalvar(salvo);
    } catch (err) {
      setErro(mensagemDeErro(err));
      setSalvando(false);
    }
  };

  return (
    <Modal titulo={inicial ? "Editar medicamento" : "Cadastrar medicamento"} aoFechar={aoFechar} largo>
      <form onSubmit={enviar} className="form">
        <fieldset>
          <legend>Identificação</legend>
          <div className="form-grade">
            <Campo rotulo="Nome e concentração *" largura={2}>
              <input value={dados.nome} onChange={muda("nome")} placeholder="Ex.: Losartana potássica 50 mg" required autoFocus />
            </Campo>
            <Campo rotulo="Princípio ativo">
              <input value={dados.principio_ativo || ""} onChange={muda("principio_ativo")} />
            </Campo>
            <Campo rotulo="Fabricante">
              <input value={dados.fabricante || ""} onChange={muda("fabricante")} />
            </Campo>
            <Campo rotulo="Apresentação">
              <input value={dados.apresentacao || ""} onChange={muda("apresentacao")} placeholder="Ex.: caixa com 30 comprimidos" />
            </Campo>
            <Campo rotulo="Código de barras (EAN-13)">
              <input value={dados.codigo_barras || ""} onChange={muda("codigo_barras")} inputMode="numeric" maxLength={13} pattern="\d{13}" title="13 dígitos" />
            </Campo>
            <Campo rotulo="Categoria" largura={2}>
              <select value={dados.categoria || ""} onChange={muda("categoria")}>
                <option value="">Selecione…</option>
                {catalogo?.categorias.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Campo>
          </div>
        </fieldset>

        <fieldset>
          <legend>Regulação</legend>
          <div className="form-grade">
            <Campo rotulo="Tipo">
              <select value={dados.tipo} onChange={muda("tipo")}>
                {Object.entries(ROTULO_TIPO).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
              </select>
            </Campo>
            <Campo rotulo="Controle especial" dica="Controlados e antimicrobianos exigem os dados da receita na venda.">
              <select value={dados.controle_especial || ""} onChange={muda("controle_especial")}>
                <option value="">Nenhum</option>
                {catalogo && Object.entries(catalogo.controles).map(([v, c]) => <option key={v} value={v}>{c.rotulo}</option>)}
              </select>
            </Campo>
            <Campo rotulo="Tarja" largura={2}>
              <select value={dados.tarja} onChange={muda("tarja")}>
                {catalogo && Object.entries(catalogo.tarjas).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
              </select>
            </Campo>
            <label className="campo-marcar" style={{ gridColumn: "span 2" }}>
              <input type="checkbox" checked={dados.refrigerado} onChange={muda("refrigerado")} />
              <span>Medicamento termolábil: armazenar na geladeira, entre 2 °C e 8 °C</span>
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>Estoque e preço</legend>
          <div className="form-grade">
            <Campo rotulo="Preço de venda (R$)">
              <input type="number" min="0" step="0.01" value={dados.preco_venda ?? ""} onChange={muda("preco_venda")} />
            </Campo>
            <Campo rotulo="Estoque mínimo" dica="Abaixo disso, o painel sugere a compra.">
              <input type="number" min="0" step="1" value={dados.estoque_minimo} onChange={muda("estoque_minimo")} />
            </Campo>
          </div>
        </fieldset>
        <Aviso>{erro}</Aviso>
        <div className="form-acoes">
          <button type="button" className="botao" onClick={aoFechar}>Cancelar</button>
          <button className="botao botao-primario" disabled={salvando}>{salvando ? "Salvando…" : inicial ? "Salvar alterações" : "Cadastrar"}</button>
        </div>
      </form>
    </Modal>
  );
}
