import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../App.jsx";
import { api, mensagemDeErro } from "../api.js";
import { dataBR, moeda, moedaCurta, nomeMes, numero, periodoDoDia } from "../format.js";
import { Aviso, Carregando, Contador, FaixaTarja, Icone, SeloValidade, Vazio } from "../components/ui.jsx";
import { MarcaIcone } from "../components/Logo.jsx";
import { GraficoArea, GraficoBarrasHorizontais, GraficoColunas, GraficoRosca } from "../components/Graficos.jsx";

const PRAZOS = [30, 60, 90];
const diaCurto = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export default function Painel() {
  const { usuario } = useAuth();
  const [dias, setDias] = useState(30);
  const [dados, setDados] = useState(null);
  const [graficos, setGraficos] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    setErro("");
    api(`/alertas?dias=${dias}`).then(setDados).catch((e) => setErro(mensagemDeErro(e)));
  }, [dias]);

  useEffect(() => {
    api("/painel/graficos").then(setGraficos).catch((e) => setErro(mensagemDeErro(e)));
  }, []);

  const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const vendas30 = graficos?.vendas_diarias.reduce((a, d) => a + Number(d.faturamento), 0) || 0;

  return (
    <>
      <div className="cabecalho">
        <div>
          <h1>{periodoDoDia().saudacao}, {usuario?.nome?.split(" ")[0]}</h1>
          <p className="subtitulo">Hoje é {hoje}. Veja o que precisa de atenção no estoque.</p>
        </div>
      </div>
      <Aviso>{erro}</Aviso>
      {!dados && !erro && <Carregando linhas={6} />}

      {dados && (
        <>
          <section className="painel-indicadores escalonado">
            <div className="estoque-resumo">
              <MarcaIcone tamanho={120} />
              <span className="estoque-rotulo">Valor do estoque a preço de custo</span>
              <strong className="estoque-valor"><Contador valor={Number(dados.resumo.valor_estoque)} formatar={moeda} duracao={1100} /></strong>
              <div className="estoque-detalhes">
                <span><strong><Contador valor={dados.resumo.unidades_estoque} /></strong> unidades</span>
                <span><strong><Contador valor={dados.resumo.medicamentos_com_estoque} /></strong> medicamentos com saldo</span>
              </div>
            </div>
            <Indicador tom="perigo" icone="alerta" valor={dados.resumo.lotes_vencidos}
              rotulo={dados.resumo.lotes_vencidos === 1 ? "lote vencido no estoque" : "lotes vencidos no estoque"}
              detalhe="Retirar da prateleira e dar baixa" />
            <Indicador tom="alerta" icone="relogio" valor={dados.resumo.lotes_a_vencer}
              rotulo={`${dados.resumo.lotes_a_vencer === 1 ? "lote vence" : "lotes vencem"} em até ${dias} dias`}
              detalhe={`${moeda(dados.resumo.valor_em_risco)} em risco, contando os vencidos`} />
            <Indicador tom="padrao" icone="carrinho" valor={dados.resumo.estoque_baixo}
              rotulo={dados.resumo.estoque_baixo === 1 ? "medicamento abaixo do mínimo" : "medicamentos abaixo do mínimo"}
              detalhe="Veja a sugestão de compra abaixo" />
          </section>

          {graficos && (
            <>
              <div className="painel-graficos escalonado">
                <section className="bloco">
                  <div className="bloco-topo">
                    <h2>Vendas dos últimos 30 dias</h2>
                    <span className="texto-fraco">{moeda(vendas30)} no período</span>
                  </div>
                  <GraficoArea
                    descricao="Faturamento diário com vendas nos últimos 30 dias"
                    dados={graficos.vendas_diarias.map((d) => ({
                      chave: d.dia,
                      valor: Number(d.faturamento),
                      rotulo: diaCurto(d.dia),
                      rotuloLongo: new Date(`${d.dia}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" }),
                      detalhe: `${numero(d.unidades)} ${d.unidades === 1 ? "unidade vendida" : "unidades vendidas"}`,
                    }))}
                    formatarValor={moeda}
                    formatarEixo={moedaCurta}
                    altura={330}
                  />
                </section>
                <section className="bloco">
                  <div className="bloco-topo">
                    <h2>Estoque por categoria</h2>
                    <span className="texto-fraco">a preço de custo</span>
                  </div>
                  <GraficoRosca
                    descricao="Distribuição do valor em estoque por categoria"
                    dados={graficos.estoque_por_categoria.map((c) => ({
                      rotulo: c.categoria,
                      valor: Number(c.valor),
                      outros: c.categoria === "Outras categorias",
                    }))}
                    formatarValor={(v, curto) => (curto ? moedaCurta(v) : moeda(v))}
                    rotuloCentro="em estoque"
                  />
                </section>
              </div>
              <div className="painel-graficos escalonado">
                <section className="bloco">
                  <div className="bloco-topo">
                    <h2>Vencimentos nos próximos 6 meses</h2>
                    <span className="texto-fraco">valor a preço de custo</span>
                  </div>
                  <GraficoColunas
                    descricao="Valor em estoque que vence em cada um dos próximos seis meses"
                    dados={dados.vencimentos_por_mes.map((m) => ({
                      chave: m.mes,
                      valor: Number(m.valor),
                      rotulo: nomeMes(m.mes),
                      rotuloLongo: nomeMes(m.mes, true),
                      detalhe: `${m.lotes} ${m.lotes === 1 ? "lote" : "lotes"}, ${numero(m.unidades)} unidades`,
                    }))}
                    formatarValor={(v, curto) => (curto ? moedaCurta(v) : moeda(v))}
                    altura={300}
                  />
                </section>
                <section className="bloco">
                  <div className="bloco-topo">
                    <h2>Mais vendidos</h2>
                    <span className="texto-fraco">unidades em 30 dias</span>
                  </div>
                  {graficos.mais_vendidos.length === 0 ? (
                    <Vazio>Nenhuma venda nos últimos 30 dias.</Vazio>
                  ) : (
                    <GraficoBarrasHorizontais
                      dados={graficos.mais_vendidos.map((m) => ({ chave: m.id, rotulo: m.nome, valor: m.unidades, link: `/medicamentos/${m.id}` }))}
                      formatarValor={numero}
                    />
                  )}
                </section>
              </div>
            </>
          )}

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
      <span className="indicador-valor"><Contador valor={valor} /></span>
      <div>
        <div className="indicador-rotulo">{rotulo}</div>
        <div className="indicador-detalhe">{detalhe}</div>
      </div>
    </div>
  );
}
