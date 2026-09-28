import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, mensagemDeErro } from "../api.js";
import { dataBR, moeda, numero } from "../format.js";
import { Aviso, Cartao, SeloValidade, Vazio } from "../components/ui.jsx";

const PRAZOS = [30, 60, 90];

export default function Painel() {
  const [dias, setDias] = useState(30);
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    setErro("");
    api(`/alertas?dias=${dias}`).then(setDados).catch((e) => setErro(mensagemDeErro(e)));
  }, [dias]);

  return (
    <>
      <div className="cabecalho">
        <div>
          <h1>Painel</h1>
          <p className="subtitulo">O que precisa de atenção hoje na farmácia.</p>
        </div>
      </div>
      <Aviso>{erro}</Aviso>

      {dados && (
        <>
          <div className="grade-indicadores">
            <Cartao icone="alerta" tom="perigo" valor={numero(dados.resumo.lotes_vencidos)} rotulo="Lotes vencidos com estoque" detalhe="Retirar da prateleira" />
            <Cartao icone="sino" tom="alerta" valor={numero(dados.resumo.lotes_a_vencer)} rotulo={`Lotes vencendo em ${dias} dias`} detalhe="Priorizar a venda" />
            <Cartao icone="caixa" tom="padrao" valor={numero(dados.resumo.estoque_baixo)} rotulo="Medicamentos abaixo do mínimo" detalhe="Providenciar reposição" />
            <Cartao icone="dinheiro" tom="escuro" valor={moeda(dados.resumo.valor_em_risco)} rotulo="Valor em risco" detalhe="Custo dos lotes vencidos e a vencer" />
          </div>

          <section className="painel-bloco">
            <div className="bloco-topo">
              <h2>Validade</h2>
              <div className="abas" role="tablist" aria-label="Prazo de alerta">
                {PRAZOS.map((p) => (
                  <button key={p} role="tab" aria-selected={dias === p} className={dias === p ? "ativa" : ""} onClick={() => setDias(p)}>
                    {p} dias
                  </button>
                ))}
              </div>
            </div>
            {dados.validade.length === 0 ? (
              <Vazio>Nenhum lote vence nos próximos {dias} dias.</Vazio>
            ) : (
              <div className="tabela-rolagem">
                <table>
                  <thead>
                    <tr><th>Medicamento</th><th>Lote</th><th>Validade</th><th>Situação</th><th className="num">Saldo</th><th className="num">Valor</th></tr>
                  </thead>
                  <tbody>
                    {dados.validade.map((l) => (
                      <tr key={l.lote_id}>
                        <td><Link to={`/medicamentos/${l.medicamento_id}`}>{l.medicamento}</Link></td>
                        <td>{l.lote}</td>
                        <td>{dataBR(l.validade)}</td>
                        <td><SeloValidade dias={l.dias_para_vencer} /></td>
                        <td className="num">{numero(l.saldo)}</td>
                        <td className="num">{moeda((l.preco_custo || 0) * l.saldo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="painel-bloco">
            <div className="bloco-topo"><h2>Estoque baixo</h2></div>
            {dados.estoque_baixo.length === 0 ? (
              <Vazio>Todos os medicamentos estão acima do estoque mínimo.</Vazio>
            ) : (
              <div className="tabela-rolagem">
                <table>
                  <thead>
                    <tr><th>Medicamento</th><th className="num">Saldo utilizável</th><th className="num">Mínimo</th><th className="num">Faltam</th></tr>
                  </thead>
                  <tbody>
                    {dados.estoque_baixo.map((m) => (
                      <tr key={m.medicamento_id}>
                        <td><Link to={`/medicamentos/${m.medicamento_id}`}>{m.medicamento}</Link></td>
                        <td className="num">{numero(m.saldo_utilizavel)}</td>
                        <td className="num">{numero(m.estoque_minimo)}</td>
                        <td className="num destaque-perigo">{numero(m.estoque_minimo - m.saldo_utilizavel)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="nota">Saldo utilizável não conta lotes vencidos.</p>
          </section>
        </>
      )}
    </>
  );
}
