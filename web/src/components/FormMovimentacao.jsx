import { useEffect, useMemo, useState } from "react";
import { api, mensagemDeErro } from "../api.js";
import { dataBR, hojeISO, TIPOS_MOV } from "../format.js";
import { useCatalogo } from "../catalogo.js";
import { Aviso, Campo } from "./ui.jsx";

const RECEITA_VAZIA = { receita_numero: "", receita_data: "", prescritor_nome: "", prescritor_registro: "", paciente_nome: "" };

const loteFefo = (lotes) =>
  lotes.filter((l) => l.saldo > 0 && l.dias_para_vencer >= 0).sort((a, b) => a.dias_para_vencer - b.dias_para_vencer)[0];

export default function FormMovimentacao({ lote, aoSalvar, aoCancelar }) {
  const catalogo = useCatalogo();
  const [medicamentos, setMedicamentos] = useState([]);
  const [lotes, setLotes] = useState(lote ? [lote] : []);
  const [medicamentoId, setMedicamentoId] = useState(lote ? String(lote.medicamento_id) : "");
  const [loteId, setLoteId] = useState(lote ? String(lote.id) : "");
  const [tipo, setTipo] = useState("saida");
  const [quantidade, setQuantidade] = useState("");
  const [observacao, setObservacao] = useState("");
  const [receita, setReceita] = useState(RECEITA_VAZIA);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!lote) api("/medicamentos").then(setMedicamentos).catch((e) => setErro(mensagemDeErro(e)));
  }, [lote]);

  useEffect(() => {
    if (lote || !medicamentoId) return;
    setLoteId("");
    api(`/lotes?medicamento_id=${medicamentoId}`)
      .then((ls) => {
        setLotes(ls);
        const sugerido = loteFefo(ls);
        if (sugerido) setLoteId(String(sugerido.id));
      })
      .catch((e) => setErro(mensagemDeErro(e)));
  }, [medicamentoId, lote]);

  const selecionado = useMemo(() => lotes.find((l) => String(l.id) === loteId), [lotes, loteId]);
  const sugerido = useMemo(() => (lote ? null : loteFefo(lotes)), [lotes, lote]);
  const vencido = selecionado && selecionado.dias_para_vencer < 0;
  const controle = selecionado?.controle_especial;
  const regra = controle && catalogo?.controles[controle];
  const pedeReceita = tipo === "saida" && Boolean(controle);
  const exigeNumero = controle && controle !== "antimicrobiano" && /^[AB]|C2/.test(controle);

  useEffect(() => {
    if (vencido && tipo === "saida") setTipo("baixa_vencimento");
  }, [vencido, tipo]);

  const mudaReceita = (campo) => (e) => setReceita({ ...receita, [campo]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      const corpo = { lote_id: Number(loteId), tipo, quantidade: Number(quantidade), observacao: observacao || null };
      if (pedeReceita) Object.assign(corpo, receita);
      const mov = await api("/movimentacoes", { method: "POST", body: corpo });
      setQuantidade("");
      setObservacao("");
      setReceita(RECEITA_VAZIA);
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
        <div className="form-grade">
          <Campo rotulo="Medicamento *">
            <select value={medicamentoId} onChange={(e) => setMedicamentoId(e.target.value)} required>
              <option value="">Selecione…</option>
              {medicamentos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Lote *" dica={sugerido && String(sugerido.id) === loteId ? "Sugerido: o lote válido que vence primeiro." : undefined}>
            <select value={loteId} onChange={(e) => setLoteId(e.target.value)} required disabled={!medicamentoId}>
              <option value="">{medicamentoId ? "Selecione…" : "Escolha o medicamento"}</option>
              {lotes.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.codigo}, validade {dataBR(l.validade)}, saldo {l.saldo}{sugerido?.id === l.id ? " (vence primeiro)" : ""}
                </option>
              ))}
            </select>
          </Campo>
        </div>
      )}
      {lote && (
        <p className="texto-fraco">
          Lote <strong>{lote.codigo}</strong>, validade {dataBR(lote.validade)}, saldo atual {lote.saldo}
        </p>
      )}
      {vencido && <Aviso tipo="alerta">Este lote está vencido: só é possível registrar baixa ou entrada.</Aviso>}
      {selecionado && sugerido && tipo === "saida" && selecionado.id !== sugerido.id && !vencido && (
        <Aviso tipo="alerta">O lote {sugerido.codigo} vence antes deste. Prefira vendê-lo primeiro para evitar perdas.</Aviso>
      )}
      <div className="form-grade">
        <Campo rotulo="Tipo *">
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {Object.entries(TIPOS_MOV).filter(([, t]) => !t.automatico).map(([valor, t]) => (
              <option key={valor} value={valor} disabled={vencido && valor === "saida"}>{t.rotulo}</option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Quantidade *" dica={selecionado && tipo !== "entrada" ? `Máximo: ${selecionado.saldo}` : undefined}>
          <input type="number" min="1" step="1" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} required />
        </Campo>
      </div>

      {pedeReceita && (
        <fieldset className="receita">
          <legend>Receita retida</legend>
          <p className="receita-explica">{regra ? `${regra.rotulo}: exige ${regra.receita}.` : "Medicamento com controle especial."} Os dados ficam no livro de controlados.</p>
          <div className="form-grade">
            <Campo rotulo="Data da receita *" dica={controle === "antimicrobiano" ? "Receita de antimicrobiano vale 10 dias." : undefined}>
              <input type="date" value={receita.receita_data} max={hojeISO()} onChange={mudaReceita("receita_data")} required />
            </Campo>
            <Campo rotulo={exigeNumero ? "Número da notificação *" : "Número da receita"}>
              <input value={receita.receita_numero} onChange={mudaReceita("receita_numero")} required={Boolean(exigeNumero)} />
            </Campo>
            <Campo rotulo="Prescritor *">
              <input value={receita.prescritor_nome} onChange={mudaReceita("prescritor_nome")} required />
            </Campo>
            <Campo rotulo="Registro do prescritor *">
              <input value={receita.prescritor_registro} onChange={mudaReceita("prescritor_registro")} placeholder="Ex.: CRM-PB 12345" required />
            </Campo>
            <Campo rotulo="Paciente *" largura={2}>
              <input value={receita.paciente_nome} onChange={mudaReceita("paciente_nome")} required />
            </Campo>
          </div>
        </fieldset>
      )}

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
