import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../App.jsx";
import { api, mensagemDeErro } from "../api.js";
import { dataBR, dataHoraBR, numero, TIPOS_MOV } from "../format.js";
import { Aviso, Campo, Carregando, Icone, Modal, Vazio } from "../components/ui.jsx";
import { useAvisar } from "../components/Toasts.jsx";
import FormMovimentacao from "../components/FormMovimentacao.jsx";

export default function Movimentacoes() {
  const { admin } = useAuth();
  const avisar = useAvisar();
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState("");
  const [chaveForm, setChaveForm] = useState(0);
  const [tipo, setTipo] = useState("");
  const [estornando, setEstornando] = useState(null);

  const carregar = useCallback(() => {
    api(`/movimentacoes?limite=100${tipo ? `&tipo=${tipo}` : ""}`).then(setLista).catch((e) => setErro(mensagemDeErro(e)));
  }, [tipo]);

  useEffect(carregar, [carregar]);

  return (
    <>
      <div className="cabecalho">
        <div>
          <h1>Movimentações</h1>
          <p className="subtitulo">Entradas, vendas e baixas de estoque, sempre por lote.</p>
        </div>
      </div>

      <section className="bloco">
        <div className="bloco-topo"><h2>Registrar movimentação</h2></div>
        <FormMovimentacao
          key={chaveForm}
          aoSalvar={(m) => {
            avisar(`Movimentação registrada. Saldo do lote: ${m.saldo_lote}.`);
            setChaveForm((k) => k + 1);
            carregar();
          }}
        />
      </section>

      <section className="bloco">
        <div className="bloco-topo">
          <h2>Últimas movimentações</h2>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Filtrar por tipo" className="select-compacto">
            <option value="">Todos os tipos</option>
            {Object.entries(TIPOS_MOV).map(([v, t]) => <option key={v} value={v}>{t.rotulo}</option>)}
          </select>
        </div>
        <Aviso>{erro}</Aviso>
        {!lista && !erro && <Carregando />}
        {lista && lista.length === 0 && <Vazio>{tipo ? "Nenhuma movimentação desse tipo." : "Nenhuma movimentação registrada."}</Vazio>}
        {lista && lista.length > 0 && (
          <div className="tabela-rolagem">
            <table>
              <thead>
                <tr><th>Data</th><th>Medicamento</th><th>Lote</th><th>Tipo</th><th className="num">Qtd.</th><th>Observação ou receita</th><th>Usuário</th>{admin && <th></th>}</tr>
              </thead>
              <tbody>
                {lista.map((m) => {
                  const t = TIPOS_MOV[m.tipo];
                  return (
                    <tr key={m.id} className={m.estornada ? "linha-estornada" : ""}>
                      <td className="sem-quebra">{dataHoraBR(m.criado_em)}</td>
                      <td><Link to={`/medicamentos/${m.medicamento_id}`}>{m.medicamento}</Link></td>
                      <td>{m.lote}<div className="texto-fraco">val. {dataBR(m.validade)}</div></td>
                      <td>
                        <span className={`tipo tipo-${t.classe}`}>{t.rotulo}</span>
                        {m.estornada && <div><span className="selo selo-perigo">Estornada</span></div>}
                        {m.estorno_de && <div><span className="selo selo-neutro">Estorno</span></div>}
                      </td>
                      <td className={`num tipo-num-${t.classe}`}>{t.sinal}{numero(m.quantidade)}</td>
                      <td>
                        {m.prescritor_registro ? (
                          <span className="receita-linha" title={`Receita de ${dataBR(m.receita_data)}, ${m.prescritor_nome}`}>
                            <Icone nome="receita" tamanho={15} /> {m.paciente_nome}, {m.prescritor_registro}
                          </span>
                        ) : (m.observacao || "-")}
                      </td>
                      <td>{m.usuario || "-"}</td>
                      {admin && (
                        <td className="acoes-linha">
                          {!m.estornada && !m.estorno_de && (
                            <button className="botao-icone" onClick={() => setEstornando(m)} title="Estornar" aria-label="Estornar movimentação">
                              <Icone nome="desfazer" tamanho={18} />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {estornando && (
        <Estorno
          mov={estornando}
          aoFechar={() => setEstornando(null)}
          aoSalvar={() => { setEstornando(null); avisar("Movimentação estornada."); carregar(); }}
        />
      )}
    </>
  );
}

function Estorno({ mov, aoFechar, aoSalvar }) {
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const t = TIPOS_MOV[mov.tipo];

  const enviar = async (e) => {
    e.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      await api(`/movimentacoes/${mov.id}/estorno`, { method: "POST", body: { motivo } });
      aoSalvar();
    } catch (err) {
      setErro(mensagemDeErro(err));
      setSalvando(false);
    }
  };

  return (
    <Modal titulo="Estornar movimentação" aoFechar={aoFechar}>
      <form className="form" onSubmit={enviar}>
        <p style={{ margin: 0 }}>
          {t.rotulo} de <strong>{numero(mov.quantidade)}</strong> {mov.quantidade === 1 ? "unidade" : "unidades"} de <strong>{mov.medicamento}</strong>, lote {mov.lote}, em {dataHoraBR(mov.criado_em)}.
        </p>
        <p className="nota" style={{ margin: 0 }}>O registro original continua no histórico, riscado, e um lançamento inverso corrige o saldo do lote.</p>
        <Campo rotulo="Motivo do estorno *">
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: quantidade digitada errada" required minLength={3} autoFocus />
        </Campo>
        <Aviso>{erro}</Aviso>
        <div className="form-acoes">
          <button type="button" className="botao" onClick={aoFechar}>Cancelar</button>
          <button className="botao botao-perigo-cheio" disabled={salvando}>{salvando ? "Estornando…" : "Estornar"}</button>
        </div>
      </form>
    </Modal>
  );
}
