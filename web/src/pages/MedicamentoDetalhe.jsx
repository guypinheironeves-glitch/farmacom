import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, mensagemDeErro } from "../api.js";
import { dataBR, hojeISO, moeda, numero } from "../format.js";
import { Aviso, Campo, Icone, Modal, Selo, SeloValidade, Vazio } from "../components/ui.jsx";
import FormMedicamento from "../components/FormMedicamento.jsx";
import FormMovimentacao from "../components/FormMovimentacao.jsx";

export default function MedicamentoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [med, setMed] = useState(null);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [editando, setEditando] = useState(false);
  const [novoLote, setNovoLote] = useState(false);
  const [movLote, setMovLote] = useState(null);

  const carregar = useCallback(() => {
    api(`/medicamentos/${id}`).then(setMed).catch((e) => setErro(mensagemDeErro(e)));
  }, [id]);

  useEffect(carregar, [carregar]);

  const excluir = async () => {
    if (!window.confirm(`Excluir ${med.nome}? Os lotes cadastrados também serão apagados.`)) return;
    try {
      await api(`/medicamentos/${id}`, { method: "DELETE" });
      navigate("/medicamentos");
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  };

  if (!med) return <Aviso>{erro}</Aviso>;

  return (
    <>
      <Link to="/medicamentos" className="voltar"><Icone nome="voltar" tamanho={18} /> Medicamentos</Link>
      <div className="cabecalho">
        <div>
          <h1>{med.nome}</h1>
          <p className="subtitulo">
            {[med.principio_ativo, med.fabricante, med.apresentacao].filter(Boolean).join(" · ") || "Sem detalhes cadastrados"}
          </p>
        </div>
        <div className="acoes">
          <button className="botao" onClick={() => setEditando(true)}>Editar</button>
          <button className="botao botao-perigo" onClick={excluir}>Excluir</button>
        </div>
      </div>
      <Aviso>{erro}</Aviso>
      <Aviso tipo="sucesso">{aviso}</Aviso>

      <div className="grade-resumo">
        <div className="resumo-item"><span>Saldo total</span><strong>{numero(med.saldo_total)}</strong></div>
        <div className="resumo-item"><span>Estoque mínimo</span><strong>{numero(med.estoque_minimo)}</strong></div>
        <div className="resumo-item">
          <span>Situação</span>
          <strong>{med.abaixo_minimo ? <Selo classe="alerta">Abaixo do mínimo</Selo> : <Selo classe="ok">Normal</Selo>}</strong>
        </div>
        <div className="resumo-item"><span>Lotes</span><strong>{med.lotes.length}</strong></div>
      </div>

      <section className="painel-bloco">
        <div className="bloco-topo">
          <h2>Lotes</h2>
          <button className="botao botao-primario" onClick={() => setNovoLote(true)}>
            <Icone nome="mais" tamanho={18} /> Novo lote
          </button>
        </div>
        {med.lotes.length === 0 ? (
          <Vazio>Nenhum lote cadastrado. Cadastre o primeiro lote para começar a controlar o estoque.</Vazio>
        ) : (
          <div className="tabela-rolagem">
            <table>
              <thead>
                <tr>
                  <th>Lote</th><th>Validade</th><th>Situação</th><th>Fornecedor</th>
                  <th className="num">Custo unit.</th><th className="num">Saldo</th><th></th>
                </tr>
              </thead>
              <tbody>
                {med.lotes.map((l) => (
                  <tr key={l.id} className={l.saldo === 0 ? "linha-apagada" : ""}>
                    <td>{l.codigo}</td>
                    <td>{dataBR(l.validade)}</td>
                    <td>{l.saldo === 0 ? <Selo>Sem estoque</Selo> : <SeloValidade dias={l.dias_para_vencer} />}</td>
                    <td>{l.fornecedor || "-"}</td>
                    <td className="num">{l.preco_custo === null ? "-" : moeda(l.preco_custo)}</td>
                    <td className="num">{numero(l.saldo)}</td>
                    <td className="num">
                      <button className="botao botao-pequeno" onClick={() => setMovLote({ ...l, medicamento_id: med.id })}>
                        Movimentar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editando && (
        <FormMedicamento inicial={med} aoFechar={() => setEditando(false)} aoSalvar={() => { setEditando(false); carregar(); }} />
      )}
      {novoLote && (
        <FormLote
          medicamentoId={med.id}
          aoFechar={() => setNovoLote(false)}
          aoSalvar={(l) => { setNovoLote(false); setAviso(`Lote ${l.codigo} cadastrado.`); carregar(); }}
        />
      )}
      {movLote && (
        <Modal titulo={`Movimentar ${med.nome}`} aoFechar={() => setMovLote(null)}>
          <FormMovimentacao
            lote={movLote}
            aoCancelar={() => setMovLote(null)}
            aoSalvar={(m) => { setMovLote(null); setAviso(`Movimentação registrada. Saldo do lote: ${m.saldo_lote}.`); carregar(); }}
          />
        </Modal>
      )}
    </>
  );
}

function FormLote({ medicamentoId, aoFechar, aoSalvar }) {
  const [dados, setDados] = useState({ codigo: "", validade: "", fornecedor: "", preco_custo: "", quantidade_inicial: "" });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const muda = (c) => (e) => setDados({ ...dados, [c]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      const lote = await api(`/medicamentos/${medicamentoId}/lotes`, {
        method: "POST",
        body: {
          codigo: dados.codigo,
          validade: dados.validade,
          fornecedor: dados.fornecedor || null,
          preco_custo: dados.preco_custo === "" ? null : Number(dados.preco_custo),
          quantidade_inicial: Number(dados.quantidade_inicial) || 0,
        },
      });
      aoSalvar(lote);
    } catch (err) {
      setErro(mensagemDeErro(err));
      setSalvando(false);
    }
  };

  return (
    <Modal titulo="Novo lote" aoFechar={aoFechar}>
      <form onSubmit={enviar} className="form">
        <div className="form-linha">
          <Campo rotulo="Código do lote *"><input value={dados.codigo} onChange={muda("codigo")} required autoFocus /></Campo>
          <Campo rotulo="Validade *">
            <input type="date" value={dados.validade} onChange={muda("validade")} required />
          </Campo>
        </div>
        {dados.validade && dados.validade < hojeISO() && (
          <Aviso tipo="alerta">A validade informada já passou. Confira a data antes de salvar.</Aviso>
        )}
        <Campo rotulo="Fornecedor"><input value={dados.fornecedor} onChange={muda("fornecedor")} /></Campo>
        <div className="form-linha">
          <Campo rotulo="Quantidade recebida" dica="Registrada como entrada no estoque.">
            <input type="number" min="0" step="1" value={dados.quantidade_inicial} onChange={muda("quantidade_inicial")} />
          </Campo>
          <Campo rotulo="Custo unitário (R$)" dica="Usado para calcular as perdas.">
            <input type="number" min="0" step="0.01" value={dados.preco_custo} onChange={muda("preco_custo")} />
          </Campo>
        </div>
        <Aviso>{erro}</Aviso>
        <div className="form-acoes">
          <button type="button" className="botao" onClick={aoFechar}>Cancelar</button>
          <button className="botao botao-primario" disabled={salvando}>{salvando ? "Salvando…" : "Salvar lote"}</button>
        </div>
      </form>
    </Modal>
  );
}
