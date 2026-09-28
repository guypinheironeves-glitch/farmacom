import { useState } from "react";
import { api, mensagemDeErro } from "../api.js";
import { Aviso, Campo, Modal } from "./ui.jsx";

const VAZIO = { nome: "", principio_ativo: "", fabricante: "", apresentacao: "", estoque_minimo: 0 };

// Formulário de cadastro e edição de medicamento
export default function FormMedicamento({ inicial, aoFechar, aoSalvar }) {
  const [dados, setDados] = useState(inicial ? { ...VAZIO, ...inicial } : VAZIO);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const muda = (campo) => (e) => setDados({ ...dados, [campo]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      const corpo = {
        nome: dados.nome,
        principio_ativo: dados.principio_ativo || null,
        fabricante: dados.fabricante || null,
        apresentacao: dados.apresentacao || null,
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
    <Modal titulo={inicial ? "Editar medicamento" : "Novo medicamento"} aoFechar={aoFechar}>
      <form onSubmit={enviar} className="form">
        <Campo rotulo="Nome comercial e dosagem *">
          <input value={dados.nome} onChange={muda("nome")} placeholder="Ex.: Dipirona 500 mg" required autoFocus />
        </Campo>
        <div className="form-linha">
          <Campo rotulo="Princípio ativo">
            <input value={dados.principio_ativo || ""} onChange={muda("principio_ativo")} />
          </Campo>
          <Campo rotulo="Fabricante">
            <input value={dados.fabricante || ""} onChange={muda("fabricante")} />
          </Campo>
        </div>
        <div className="form-linha">
          <Campo rotulo="Apresentação">
            <input value={dados.apresentacao || ""} onChange={muda("apresentacao")} placeholder="Ex.: caixa com 20 comprimidos" />
          </Campo>
          <Campo rotulo="Estoque mínimo" dica="Abaixo disso, o painel avisa para repor.">
            <input type="number" min="0" step="1" value={dados.estoque_minimo} onChange={muda("estoque_minimo")} />
          </Campo>
        </div>
        <Aviso>{erro}</Aviso>
        <div className="form-acoes">
          <button type="button" className="botao" onClick={aoFechar}>Cancelar</button>
          <button className="botao botao-primario" disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</button>
        </div>
      </form>
    </Modal>
  );
}
