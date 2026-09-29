import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, mensagemDeErro } from "../api.js";
import { dataBR, hojeISO, moeda, numero } from "../format.js";
import { FRASE_TARJA, ROTULO_TIPO, rotuloControle, useCatalogo } from "../catalogo.js";
import { Aviso, Campo, Carregando, Icone, Modal, Selo, SeloValidade, Vazio } from "../components/ui.jsx";
import FormMedicamento from "../components/FormMedicamento.jsx";
import FormMovimentacao from "../components/FormMovimentacao.jsx";

export default function MedicamentoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const catalogo = useCatalogo();
  const [med, setMed] = useState(null);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [editando, setEditando] = useState(false);
  const [novoLote, setNovoLote] = useState(false);
  const [loteEditado, setLoteEditado] = useState(null);
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

  if (!med) return erro ? <Aviso>{erro}</Aviso> : <Carregando linhas={6} />;

  const frase = FRASE_TARJA[med.tarja];
  const controle = med.controle_especial && catalogo?.controles[med.controle_especial];

  return (
    <>
      <Link to="/medicamentos" className="voltar"><Icone nome="voltar" tamanho={18} /> Medicamentos</Link>

      <div className="detalhe-topo">
        <div className={`embalagem embalagem-${med.tarja}`}>
          <div className="embalagem-corpo">
            {med.tipo === "generico" && (
              <div className="embalagem-generico"><span>G</span> Medicamento genérico</div>
            )}
            <h1>{med.nome}</h1>
            <p className="embalagem-principio">{med.principio_ativo || "Princípio ativo não informado"}</p>
            <p className="embalagem-apresentacao">{[med.apresentacao, med.fabricante].filter(Boolean).join(", ")}</p>
          </div>
          {frase && <div className="embalagem-tarja">{frase}</div>}
        </div>

        <div className="detalhe-acoes">
          <button className="botao" onClick={() => setEditando(true)}>Editar</button>
          <button className="botao botao-perigo" onClick={excluir}>Excluir</button>
        </div>
      </div>
      <Aviso>{erro}</Aviso>
      <Aviso tipo="sucesso">{aviso}</Aviso>

      <div className="grade-resumo">
        <div className="resumo-item">
          <span>Saldo válido</span>
          <strong>{numero(med.saldo_utilizavel)}</strong>
          {med.saldo_total !== med.saldo_utilizavel && <em>{numero(med.saldo_total - med.saldo_utilizavel)} em lotes vencidos</em>}
        </div>
        <div className="resumo-item">
          <span>Estoque mínimo</span>
          <strong>{numero(med.estoque_minimo)}</strong>
          {med.abaixo_minimo ? <Selo classe="alerta">Abaixo do mínimo</Selo> : <Selo classe="ok">Normal</Selo>}
        </div>
        <div className="resumo-item"><span>Vendas nos últimos 30 dias</span><strong>{numero(med.vendas_30_dias)}</strong></div>
        <div className="resumo-item"><span>Preço de venda</span><strong>{med.preco_venda === null ? "-" : moeda(med.preco_venda)}</strong></div>
      </div>

      <section className="bloco">
        <div className="bloco-topo"><h2>Dados regulatórios</h2></div>
        <dl className="ficha">
          <div><dt>Tipo</dt><dd>{ROTULO_TIPO[med.tipo]}</dd></div>
          <div><dt>Tarja</dt><dd>{catalogo?.tarjas[med.tarja] || med.tarja}</dd></div>
          <div><dt>Controle especial</dt><dd>{med.controle_especial ? rotuloControle(med.controle_especial) : "Nenhum"}</dd></div>
          <div><dt>Receita exigida</dt><dd>{controle ? `${controle.receita}, retida na farmácia` : med.tarja === "sem_tarja" ? "Não exige (isento de prescrição)" : "Receita simples, sem retenção"}</dd></div>
          <div><dt>Categoria</dt><dd>{med.categoria || "-"}</dd></div>
          <div><dt>Armazenamento</dt><dd>{med.refrigerado ? "Geladeira, entre 2 °C e 8 °C" : "Temperatura ambiente"}</dd></div>
          <div><dt>Código de barras</dt><dd className="num-mono">{med.codigo_barras || "-"}</dd></div>
        </dl>
      </section>

      <section className="bloco">
        <div className="bloco-topo">
          <h2>Lotes</h2>
          <button className="botao botao-primario" onClick={() => setNovoLote(true)}>
            <Icone nome="mais" tamanho={18} /> Receber lote
          </button>
        </div>
        {med.lotes.length === 0 ? (
          <Vazio>Nenhum lote cadastrado. Registre o recebimento do primeiro lote para controlar o estoque.</Vazio>
        ) : (
          <div className="tabela-rolagem">
            <table>
              <thead>
                <tr>
                  <th>Lote</th><th>Validade</th><th>Situação</th><th>Fornecedor</th>
                  <th className="num">Custo unitário</th><th className="num">Saldo</th><th></th>
                </tr>
              </thead>
              <tbody>
                {med.lotes.map((l) => (
                  <tr key={l.id} className={l.saldo === 0 ? "linha-apagada" : ""}>
                    <td>
                      {l.codigo}
                      {l.id === med.lote_sugerido_id && <span className="selo selo-fefo" title="Vende primeiro o lote que vence primeiro">Próxima venda</span>}
                    </td>
                    <td>{dataBR(l.validade)}</td>
                    <td>{l.saldo === 0 ? <Selo>Sem estoque</Selo> : <SeloValidade dias={l.dias_para_vencer} />}</td>
                    <td>{l.fornecedor || "-"}</td>
                    <td className="num">{l.preco_custo === null ? "-" : moeda(l.preco_custo)}</td>
                    <td className="num">{numero(l.saldo)}</td>
                    <td className="num acoes-lote">
                      <button className="botao botao-pequeno" onClick={() => setLoteEditado(l)}>Editar</button>
                      <button className="botao botao-pequeno" onClick={() => setMovLote({ ...l, medicamento_id: med.id, controle_especial: med.controle_especial })}>
                        Movimentar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="nota">A venda deve sair do lote marcado como próxima venda: o válido que vence primeiro.</p>
      </section>

      {editando && (
        <FormMedicamento inicial={med} aoFechar={() => setEditando(false)} aoSalvar={() => { setEditando(false); setAviso("Alterações salvas."); carregar(); }} />
      )}
      {loteEditado && (
        <FormLote
          medicamentoId={med.id}
          lote={loteEditado}
          aoFechar={() => setLoteEditado(null)}
          aoSalvar={(l) => { setLoteEditado(null); setAviso(`Lote ${l.codigo} atualizado.`); carregar(); }}
        />
      )}
      {novoLote && (
        <FormLote
          medicamentoId={med.id}
          aoFechar={() => setNovoLote(false)}
          aoSalvar={(l) => { setNovoLote(false); setAviso(`Lote ${l.codigo} recebido.`); carregar(); }}
        />
      )}
      {movLote && (
        <Modal titulo={`Movimentar ${med.nome}`} aoFechar={() => setMovLote(null)} largo={Boolean(med.controle_especial)}>
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

function FormLote({ medicamentoId, lote, aoFechar, aoSalvar }) {
  const [dados, setDados] = useState(
    lote
      ? { codigo: lote.codigo, validade: lote.validade, fornecedor: lote.fornecedor || "", preco_custo: lote.preco_custo ?? "" }
      : { codigo: "", validade: "", fornecedor: "", preco_custo: "", quantidade_inicial: "" }
  );
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const muda = (c) => (e) => setDados({ ...dados, [c]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      const corpo = {
        codigo: dados.codigo,
        validade: dados.validade,
        fornecedor: dados.fornecedor || null,
        preco_custo: dados.preco_custo === "" ? null : Number(dados.preco_custo),
      };
      const salvo = lote
        ? await api(`/lotes/${lote.id}`, { method: "PUT", body: corpo })
        : await api(`/medicamentos/${medicamentoId}/lotes`, {
            method: "POST",
            body: { ...corpo, quantidade_inicial: Number(dados.quantidade_inicial) || 0 },
          });
      aoSalvar(salvo);
    } catch (err) {
      setErro(mensagemDeErro(err));
      setSalvando(false);
    }
  };

  return (
    <Modal titulo={lote ? `Editar lote ${lote.codigo}` : "Receber lote"} aoFechar={aoFechar}>
      <form onSubmit={enviar} className="form">
        <div className="form-grade">
          <Campo rotulo="Código do lote *"><input value={dados.codigo} onChange={muda("codigo")} required autoFocus /></Campo>
          <Campo rotulo="Validade *">
            <input type="date" value={dados.validade} onChange={muda("validade")} required />
          </Campo>
        </div>
        {dados.validade && dados.validade < hojeISO() && (
          <Aviso tipo="alerta">A validade informada já passou. Confira a data na embalagem antes de salvar.</Aviso>
        )}
        <Campo rotulo="Fornecedor"><input value={dados.fornecedor} onChange={muda("fornecedor")} /></Campo>
        <div className="form-grade">
          {!lote && (
            <Campo rotulo="Quantidade recebida" dica="Entra no estoque como entrada.">
              <input type="number" min="0" step="1" value={dados.quantidade_inicial} onChange={muda("quantidade_inicial")} />
            </Campo>
          )}
          <Campo rotulo="Custo unitário (R$)" dica="Usado no cálculo de perdas.">
            <input type="number" min="0" step="0.01" value={dados.preco_custo} onChange={muda("preco_custo")} />
          </Campo>
        </div>
        {lote && <p className="nota">Para mudar a quantidade, registre uma movimentação.</p>}
        <Aviso>{erro}</Aviso>
        <div className="form-acoes">
          <button type="button" className="botao" onClick={aoFechar}>Cancelar</button>
          <button className="botao botao-primario" disabled={salvando}>{salvando ? "Salvando…" : lote ? "Salvar lote" : "Registrar recebimento"}</button>
        </div>
      </form>
    </Modal>
  );
}
