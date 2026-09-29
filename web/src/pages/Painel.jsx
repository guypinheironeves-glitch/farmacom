import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../App.jsx";
import { api, mensagemDeErro } from "../api.js";
import { dataBR, moeda, moedaCurta, nomeMes, numero } from "../format.js";
import { Aviso, Carregando, FaixaTarja, Icone, SeloValidade, Vazio } from "../components/ui.jsx";
import GraficoBarras from "../components/GraficoBarras.jsx";

const PRAZOS = [30, 60, 90];

function saudacao() {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

export default function Painel() {
  const { usuario } = useAuth();
  const [dias, setDias] = useState(30);
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    setErro("");
    api(`/alertas?dias=${dias}`).then(setDados).catch((e) => setErro(mensagemDeErro(e)));
  }, [dias]);

  const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <>
      <div className="cabecalho">
        <div>
          <h1>{saudacao()}, {usuario?.nome?.split(" ")[0]}</h1>
          <p className="subtitulo">Hoje é {hoje}. Veja o que precisa de atenção no estoque.</p>
        </div>
      </div>
      <Aviso>{erro}</Aviso>
      {!dados && !erro && <Carregando linhas={6} />}

      {dados && (
        <>
          <section className="painel-topo">
            <div className="estoque-resumo">
              <span className="estoque-rotulo">Valor do estoque a preço de custo</span>
              <strong className="estoque-valor">{moeda(dados.resumo.valor_estoque)}</strong>
              <div className="estoque-detalhes">
                <span><strong>{numero(dados.resumo.unidades_estoque)}</strong> unidades</span>
                <span><strong>{numero(dados.resumo.medicamentos_com_estoque)}</strong> medicamentos com saldo</span>
              </div>
            </div>
            <div className="bloco grafico-bloco">
              <div className="bloco-topo">
                <h2>Vencimentos nos próximos 6 meses</h2>
                <span className="texto-fraco">valor a preço de custo</span>
              </div>
              <GraficoBarras
                descricao="Valor em estoque que vence em cada um dos próximos seis meses"
                dados={dados.vencimentos_por_mes.map((m) => ({
                  chave: m.mes,
                  valor: Number(m.valor),
                  mes: m.mes,
                  detalhe: `${m.lotes} ${m.lotes === 1 ? "lote" : "lotes"}, ${numero(m.unidades)} unidades`,
                }))}
                formatarValor={(v, curto) => (curto ? moedaCurta(v) : moeda(v))}
                formatarRotulo={(d, longo) => nomeMes(d.mes, longo)}
              />
            </div>
          </section>

          <div className="grade-indicadores">
            <Indicador tom="perigo" icone="alerta" valor={dados.resumo.lotes_vencidos}
              rotulo={dados.resumo.lotes_vencidos === 1 ? "lote vencido ainda no estoque" : "lotes vencidos ainda no estoque"}
              detalhe="Retirar da prateleira e dar baixa" />
            <Indicador tom="alerta" icone="relogio" valor={dados.resumo.lotes_a_vencer}
              rotulo={`${dados.resumo.lotes_a_vencer === 1 ? "lote vence" : "lotes vencem"} em até ${dias} dias`}
              detalhe={`${moeda(dados.resumo.valor_em_risco)} em risco, contando os vencidos`} />
            <Indicador tom="padrao" icone="carrinho" valor={dados.resumo.estoque_baixo}
              rotulo={dados.resumo.estoque_baixo === 1 ? "medicamento abaixo do mínimo" : "medicamentos abaixo do mínimo"}
              detalhe="Veja a sugestão de compra abaixo" />
          </div>

          <section className="bloco">
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
                    <tr><th>Medicamento</th><th>Lote</th><th>Validade</th><th>Situação</th><th className="num">Saldo</th><th className="num">Valor de custo</th></tr>
                  </thead>
                  <tbody>
                    {dados.validade.map((l) => (
                      <tr key={l.lote_id}>
                        <td className="celula-medicamento">
                          <FaixaTarja tarja={l.tarja} />
                          <Link to={`/medicamentos/${l.medicamento_id}`}>{l.medicamento}</Link>
                        </td>
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

          <section className="bloco">
            <div className="bloco-topo">
              <h2>Sugestão de compra</h2>
              <span className="texto-fraco">cobre 30 dias de vendas e repõe o estoque mínimo</span>
            </div>
            {dados.estoque_baixo.length === 0 ? (
              <Vazio>Todos os medicamentos estão acima do estoque mínimo.</Vazio>
            ) : (
              <div className="tabela-rolagem">
                <table>
                  <thead>
                    <tr><th>Medicamento</th><th>Fabricante</th><th className="num">Saldo válido</th><th className="num">Mínimo</th><th className="num">Vendas em 30 dias</th><th className="num">Comprar</th></tr>
                  </thead>
                  <tbody>
                    {dados.estoque_baixo.map((m) => (
                      <tr key={m.medicamento_id}>
                        <td><Link to={`/medicamentos/${m.medicamento_id}`}>{m.medicamento}</Link></td>
                        <td>{m.fabricante || "-"}</td>
                        <td className="num destaque-perigo">{numero(m.saldo_utilizavel)}</td>
                        <td className="num">{numero(m.estoque_minimo)}</td>
                        <td className="num">{numero(m.vendidos_30_dias)}</td>
                        <td className="num"><strong>{numero(m.sugestao_compra)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="nota">O saldo válido não conta lotes vencidos.</p>
          </section>
        </>
      )}
    </>
  );
}

function Indicador({ tom, icone, valor, rotulo, detalhe }) {
  return (
    <div className={`indicador tom-${tom}`}>
      <div className="indicador-icone"><Icone nome={icone} /></div>
      <div className="indicador-corpo">
        <div className="indicador-linha"><span className="indicador-valor">{numero(valor)}</span> <span className="indicador-rotulo">{rotulo}</span></div>
        <div className="indicador-detalhe">{detalhe}</div>
      </div>
    </div>
  );
}
