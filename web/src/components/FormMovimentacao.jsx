import { useEffect, useMemo, useState } from "react";
import { api, mensagemDeErro } from "../api.js";
import { dataBR, TIPOS_MOV } from "../format.js";
import { Aviso, Campo } from "./ui.jsx";

// Formulário de movimentação. Com "lote" definido, o lote já vem escolhido.
export default function FormMovimentacao({ lote, aoSalvar, aoCancelar }) {
  const [medicamentos, setMedicamentos] = useState([]);
  const [lotes, setLotes] = useState(lote ? [lote] : []);
  const [medicamentoId, setMedicamentoId] = useState(lote ? String(lote.medicamento_id) : "");
  const [loteId, setLoteId] = useState(lote ? String(lote.id) : "");
  const [tipo, setTipo] = useState("saida");
  const [quantidade, setQuantidade] = useState("");
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!lote) api("/medicamentos").then(setMedicamentos).catch((e) => setErro(mensagemDeErro(e)));
  }, [lote]);

  useEffect(() => {
    if (lote || !medicamentoId) return;
    setLoteId("");
    api(`/lotes?medicamento_id=${medicamentoId}`).then(setLotes).catch((e) => setErro(mensagemDeErro(e)));
  }, [medicamentoId, lote]);

  const selecionado = useMemo(() => lotes.find((l) => String(l.id) === loteId), [lotes, loteId]);
  const vencido = selecionado && selecionado.dias_para_vencer < 0;

  // Lote vencido: sugere baixa por vencimento em vez de venda
  useEffect(() => {
    if (vencido && tipo === "saida") setTipo("baixa_vencimento");
  }, [vencido, tipo]);

  const enviar = async (e) => {
    e.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      const mov = await api("/movimentacoes", {
        method: "POST",
        body: { lote_id: Number(loteId), tipo, quantidade: Number(quantidade), observacao: observacao || null },
      });
      setQuantidade("");
      setObservacao("");
      setSalvando(false);
      aoSalvar(mov);
    } catch (err) {
      setErro(mensagemDeErro(err));
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="form">
      {!lote && (
        <div className="form-linha">
          <Campo rotulo="Medicamento *">
            <select value={medicamentoId} onChange={(e) => setMedicamentoId(e.target.value)} required>
              <option value="">Selecione…</option>
              {medicamentos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Lote *">
            <select value={loteId} onChange={(e) => setLoteId(e.target.value)} required disabled={!medicamentoId}>
              <option value="">{medicamentoId ? "Selecione…" : "Escolha o medicamento"}</option>
              {lotes.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.codigo} · validade {dataBR(l.validade)} · saldo {l.saldo}
                </option>
              ))}
            </select>
          </Campo>
        </div>
      )}
      {lote && (
        <p className="texto-fraco">
          Lote <strong>{lote.codigo}</strong> · validade {dataBR(lote.validade)} · saldo atual {lote.saldo}
        </p>
      )}
      {vencido && <Aviso tipo="alerta">Este lote está vencido: só é possível registrar baixa ou entrada.</Aviso>}
      <div className="form-linha">
        <Campo rotulo="Tipo *">
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {Object.entries(TIPOS_MOV).map(([valor, t]) => (
              <option key={valor} value={valor} disabled={vencido && valor === "saida"}>{t.rotulo}</option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Quantidade *" dica={selecionado && tipo !== "entrada" ? `Máximo: ${selecionado.saldo}` : undefined}>
          <input type="number" min="1" step="1" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} required />
        </Campo>
      </div>
      <Campo rotulo="Observação">
        <input value={observacao} onChange={(e) => setObservacao(e.target.value)} maxLength={255} placeholder="Opcional" />
      </Campo>
      <Aviso>{erro}</Aviso>
      <div className="form-acoes">
        {aoCancelar && <button type="button" className="botao" onClick={aoCancelar}>Cancelar</button>}
        <button className="botao botao-primario" disabled={salvando || !loteId}>
          {salvando ? "Registrando…" : "Registrar movimentação"}
        </button>
      </div>
    </form>
  );
}
