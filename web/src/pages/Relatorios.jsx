import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../App.jsx";
import { api, baixarArquivo, mensagemDeErro } from "../api.js";
import { baixarCSV, dataBR, dataHoraBR, hojeISO, moeda, numero, TIPOS_MOV } from "../format.js";
import { baixarPDF } from "../pdf.js";
import { rotuloControle } from "../catalogo.js";
import { Aviso, Carregando, Icone, Vazio } from "../components/ui.jsx";
import { useAvisar } from "../components/Toasts.jsx";
import { GraficoCurvaABC } from "../components/Graficos.jsx";

const pct = (v) => `${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
const reais = (v) => Number(v).toFixed(2).replace(".", ",");

const ABAS = [
  { id: "perdas", rotulo: "Perdas" },
  { id: "movimentacao", rotulo: "Movimentação" },
  { id: "curva-abc", rotulo: "Curva ABC" },
  { id: "controlados", rotulo: "Livro de controlados" },
  { id: "sngpc", rotulo: "SNGPC" },
];

export default function Relatorios() {
  const [aba, setAba] = useState("perdas");
  const [inicio, setInicio] = useState(hojeISO(-30));
  const [fim, setFim] = useState(hojeISO());
  const [dados, setDados] = useState({});
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!inicio || !fim) return;
    setErro("");
    setDados((d) => ({ ...d, [aba]: null }));
    api(`/relatorios/${aba}?inicio=${inicio}&fim=${fim}`)
      .then((r) => setDados((d) => ({ ...d, [aba]: r })))
      .catch((e) => setErro(mensagemDeErro(e)));
  }, [aba, inicio, fim]);

  const atual = dados[aba];
  const periodo = { inicio, fim };

  return (
    <>
      <div className="cabecalho">
        <div>
          <h1>Relatórios</h1>
          <p className="subtitulo">Perdas, giro do estoque e controlados no período escolhido, em planilha ou PDF.</p>
        </div>
      </div>

      <div className="barra-relatorio">
        <div className="abas abas-grandes" role="tablist" aria-label="Relatório">
          {ABAS.map((a) => (
            <button key={a.id} role="tab" aria-selected={aba === a.id} className={aba === a.id ? "ativa" : ""} onClick={() => setAba(a.id)}>
              {a.rotulo}
            </button>
          ))}
        </div>
        <div className="periodo">
          <label className="filtro-data">De <input type="date" value={inicio} max={fim} onChange={(e) => setInicio(e.target.value)} /></label>
          <label className="filtro-data">até <input type="date" value={fim} min={inicio} onChange={(e) => setFim(e.target.value)} /></label>
        </div>
      </div>
      <Aviso>{erro}</Aviso>
      {!atual && !erro && <Carregando linhas={6} />}

      <div key={aba} className="pagina">
        {atual && aba === "perdas" && <Perdas r={atual} periodo={periodo} />}
        {atual && aba === "movimentacao" && <Movimentacao r={atual} periodo={periodo} />}
        {atual && aba === "curva-abc" && <CurvaABC r={atual} periodo={periodo} />}
        {atual && aba === "controlados" && <Controlados r={atual} periodo={periodo} />}
        {atual && aba === "sngpc" && <Sngpc r={atual} periodo={periodo} />}
      </div>
    </>
  );
}

function Exportar({ nome, titulo, periodo, colunas, linhas, resumo, totais, observacao }) {
  const { nomeFarmacia } = useAuth();
  const avisar = useAvisar();
  const [gerando, setGerando] = useState(false);
  const sufixo = `${periodo.inicio}-a-${periodo.fim}`;

  const pdf = async () => {
    setGerando(true);
    try {
      await baixarPDF({ nomeArquivo: `farmacom-${nome}-${sufixo}.pdf`, titulo, farmacia: nomeFarmacia, ...periodo, resumo, colunas, linhas, totais, observacao });
    } catch {
      avisar("Não foi possível gerar o PDF.", "erro");
    } finally {
      setGerando(false);
    }
  };

  return (
    <div className="grupo-botoes">
      <button className="botao botao-pequeno" onClick={() => baixarCSV(`farmacom-${nome}-${sufixo}.csv`, colunas, linhas)} disabled={!linhas.length}>
        <Icone nome="baixar" tamanho={16} /> Planilha
      </button>
      <button className="botao botao-pequeno" onClick={pdf} disabled={!linhas.length || gerando}>
        <Icone nome="pdf" tamanho={16} /> {gerando ? "Gerando…" : "PDF"}
      </button>
    </div>
  );
}

function Destaques({ itens }) {
  return (
    <div className="destaques escalonado">
      {itens.map((i) => (
        <div key={i.rotulo} className={`destaque ${i.tom ? `destaque-${i.tom}` : ""}`}>
          <strong>{i.valor}</strong>
          <span>{i.rotulo}</span>
        </div>
      ))}
    </div>
  );
}

function Perdas({ r, periodo }) {
  const colunas = [
    { titulo: "Medicamento", valor: (x) => x.medicamento },
    { titulo: "Lote", valor: (x) => x.lote },
    { titulo: "Validade", valor: (x) => dataBR(x.validade) },
    { titulo: "Motivo", valor: (x) => TIPOS_MOV[x.tipo].rotulo },
    { titulo: "Quantidade", valor: (x) => x.quantidade, numero: true },
    { titulo: "Valor (R$)", valor: (x) => reais(x.valor), pdf: (x) => moeda(x.valor), numero: true },
  ];
  const destaques = [
    { valor: moeda(r.totais.valor), rotulo: "perdidos no período, a preço de custo", tom: "perigo" },
    { valor: numero(r.totais.vencimento.quantidade), rotulo: `unidades vencidas (${moeda(r.totais.vencimento.valor)})` },
    { valor: numero(r.totais.avaria.quantidade), rotulo: `unidades avariadas (${moeda(r.totais.avaria.valor)})` },
  ];
  return (
    <>
      <Destaques itens={destaques} />
      <section className="bloco">
        <div className="bloco-topo">
          <h2>Baixas por vencimento e avaria</h2>
          <Exportar nome="perdas" titulo="Relatório de perdas" periodo={periodo} colunas={colunas} linhas={r.itens} resumo={destaques}
            totais={["Total", "", "", "", numero(r.totais.quantidade), moeda(r.totais.valor)]} />
        </div>
        {r.itens.length === 0 ? <Vazio>Nenhuma perda registrada no período.</Vazio> : (
          <div className="tabela-rolagem">
            <table>
              <thead><tr><th>Medicamento</th><th>Lote</th><th>Validade</th><th>Motivo</th><th className="num">Qtd.</th><th className="num">Valor</th></tr></thead>
              <tbody>
                {r.itens.map((x, i) => (
                  <tr key={i}>
                    <td><Link to={`/medicamentos/${x.medicamento_id}`}>{x.medicamento}</Link></td><td>{x.lote}</td><td>{dataBR(x.validade)}</td>
                    <td>{TIPOS_MOV[x.tipo].rotulo}</td><td className="num">{numero(x.quantidade)}</td><td className="num">{moeda(x.valor)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={4}>Total</td><td className="num">{numero(r.totais.quantidade)}</td><td className="num">{moeda(r.totais.valor)}</td></tr></tfoot>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function Movimentacao({ r, periodo }) {
  const colunas = [
    { titulo: "Medicamento", valor: (x) => x.medicamento },
    { titulo: "Entradas", valor: (x) => x.entradas, numero: true },
    { titulo: "Saídas", valor: (x) => x.saidas, numero: true },
    { titulo: "Baixas", valor: (x) => x.baixas, numero: true },
    { titulo: "Ajustes", valor: (x) => x.ajustes, numero: true },
  ];
  const destaques = [
    { valor: numero(r.totais.entradas), rotulo: "unidades recebidas" },
    { valor: numero(r.totais.saidas), rotulo: "unidades vendidas" },
    { valor: numero(r.totais.baixas), rotulo: "unidades baixadas", tom: r.totais.baixas ? "perigo" : undefined },
    { valor: `${r.totais.ajustes > 0 ? "+" : ""}${numero(r.totais.ajustes)}`, rotulo: "saldo dos ajustes de inventário" },
  ];
  return (
    <>
      <Destaques itens={destaques} />
      <section className="bloco">
        <div className="bloco-topo">
          <h2>Por medicamento</h2>
          <Exportar nome="movimentacao" titulo="Relatório de movimentação" periodo={periodo} colunas={colunas} linhas={r.itens} resumo={destaques}
            totais={["Total", numero(r.totais.entradas), numero(r.totais.saidas), numero(r.totais.baixas), numero(r.totais.ajustes)]} />
        </div>
        {r.itens.length === 0 ? <Vazio>Nenhuma movimentação no período.</Vazio> : (
          <div className="tabela-rolagem">
            <table>
              <thead><tr><th>Medicamento</th><th className="num">Entradas</th><th className="num">Saídas</th><th className="num">Baixas</th><th className="num">Ajustes</th></tr></thead>
              <tbody>
                {r.itens.map((x) => (
                  <tr key={x.medicamento_id}>
                    <td><Link to={`/medicamentos/${x.medicamento_id}`}>{x.medicamento}</Link></td>
                    <td className="num">{numero(x.entradas)}</td><td className="num">{numero(x.saidas)}</td><td className="num">{numero(x.baixas)}</td>
                    <td className="num">{x.ajustes > 0 ? "+" : ""}{numero(x.ajustes)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td>Total</td><td className="num">{numero(r.totais.entradas)}</td><td className="num">{numero(r.totais.saidas)}</td><td className="num">{numero(r.totais.baixas)}</td><td className="num">{numero(r.totais.ajustes)}</td></tr></tfoot>
            </table>
          </div>
        )}
        <p className="nota">Estornos não entram na soma: a movimentação estornada e o lançamento de estorno se anulam.</p>
      </section>
    </>
  );
}

const DESCRICAO_CLASSE = {
  A: "Até 80% do faturamento. Nunca pode faltar: acompanhe o estoque de perto.",
  B: "De 80% a 95% do faturamento. Reposição regular.",
  C: "Últimos 5% do faturamento. Compre em pequenas quantidades para não vencer na prateleira.",
};

function CurvaABC({ r, periodo }) {
  const colunas = [
    { titulo: "Classe", valor: (x) => x.classe },
    { titulo: "Medicamento", valor: (x) => x.medicamento },
    { titulo: "Categoria", valor: (x) => x.categoria || "" },
    { titulo: "Unidades", valor: (x) => x.quantidade, numero: true },
    { titulo: "Faturamento (R$)", valor: (x) => reais(x.faturamento), pdf: (x) => moeda(x.faturamento), numero: true },
    { titulo: "% do faturamento", valor: (x) => String(x.percentual).replace(".", ","), pdf: (x) => pct(x.percentual), numero: true },
    { titulo: "% acumulado", valor: (x) => String(x.acumulado).replace(".", ","), pdf: (x) => pct(x.acumulado), numero: true },
  ];
  const totalItens = r.itens.length || 1;
  const maior = Math.max(...r.itens.map((x) => Number(x.faturamento)), 1);
  return (
    <>
      <div className="abc-resumo escalonado">
        {r.resumo.map((c) => (
          <div key={c.classe} className={`abc-classe abc-${c.classe}`}>
            <div className="abc-letra">{c.classe}</div>
            <div>
              <strong>{moeda(c.faturamento)}</strong>
              <span>{c.itens} {c.itens === 1 ? "item" : "itens"} ({Math.round((c.itens / totalItens) * 100)}% do catálogo vendido)</span>
              <p>{DESCRICAO_CLASSE[c.classe]}</p>
            </div>
          </div>
        ))}
      </div>
      {r.itens.length > 1 && (
        <section className="bloco">
          <div className="bloco-topo">
            <h2>Curva de Pareto</h2>
            <span className="texto-fraco">faturamento acumulado conforme os itens mais vendidos entram na conta</span>
          </div>
          <GraficoCurvaABC itens={r.itens} descricao="Curva ABC: percentual acumulado do faturamento por percentual de itens" />
        </section>
      )}
      <section className="bloco">
        <div className="bloco-topo">
          <h2>Faturamento por medicamento</h2>
          <Exportar nome="curva-abc" titulo="Curva ABC" periodo={periodo} colunas={colunas} linhas={r.itens}
            resumo={r.resumo.map((c) => ({ valor: moeda(c.faturamento), rotulo: `Classe ${c.classe}: ${c.itens} itens` }))}
            observacao="Classe A: até 80% do faturamento. Classe B: de 80% a 95%. Classe C: os 5% restantes." />
        </div>
        {r.itens.length === 0 ? <Vazio>Nenhuma venda no período.</Vazio> : (
          <div className="tabela-rolagem">
            <table>
              <thead><tr><th>Classe</th><th>Medicamento</th><th className="num">Unidades</th><th className="num">Faturamento</th><th className="coluna-barra">Participação</th><th className="num">Acumulado</th></tr></thead>
              <tbody>
                {r.itens.map((x) => (
                  <tr key={x.medicamento_id}>
                    <td><span className={`letra-abc abc-${x.classe}`}>{x.classe}</span></td>
                    <td><Link to={`/medicamentos/${x.medicamento_id}`}>{x.medicamento}</Link><div className="texto-fraco">{x.categoria}</div></td>
                    <td className="num">{numero(x.quantidade)}</td>
                    <td className="num">{moeda(x.faturamento)}</td>
                    <td className="coluna-barra">
                      <span className="barra-celula"><span style={{ width: `${(Number(x.faturamento) / maior) * 100}%` }} /></span>
                      <span className="num">{pct(x.percentual)}</span>
                    </td>
                    <td className="num">{pct(x.acumulado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="nota">Faturamento calculado pelas vendas registradas no período e pelo preço de venda cadastrado.</p>
      </section>
    </>
  );
}

function Controlados({ r, periodo }) {
  const colunas = [
    { titulo: "Data da venda", valor: (x) => dataHoraBR(x.criado_em) },
    { titulo: "Medicamento", valor: (x) => x.medicamento },
    { titulo: "Controle", valor: (x) => rotuloControle(x.controle_especial) },
    { titulo: "Lote", valor: (x) => x.lote },
    { titulo: "Qtd.", valor: (x) => x.quantidade, numero: true },
    { titulo: "Data da receita", valor: (x) => dataBR(x.receita_data) },
    { titulo: "Número", valor: (x) => x.receita_numero || "" },
    { titulo: "Prescritor", valor: (x) => x.prescritor_nome },
    { titulo: "Registro", valor: (x) => x.prescritor_registro },
    { titulo: "Paciente", valor: (x) => x.paciente_nome },
  ];
  const destaques = [
    { valor: numero(r.itens.length), rotulo: "dispensações com receita retida" },
    { valor: numero(r.total_unidades), rotulo: "unidades dispensadas" },
  ];
  return (
    <>
      <Destaques itens={destaques} />
      <section className="bloco">
        <div className="bloco-topo">
          <h2>Saídas com receita retida</h2>
          <Exportar nome="controlados" titulo="Livro de controlados e antimicrobianos" periodo={periodo} colunas={colunas} linhas={r.itens} resumo={destaques} />
        </div>
        {r.itens.length === 0 ? <Vazio>Nenhuma saída de medicamento controlado no período.</Vazio> : (
          <div className="tabela-rolagem">
            <table>
              <thead><tr><th>Data</th><th>Medicamento</th><th>Controle</th><th className="num">Qtd.</th><th>Receita</th><th>Prescritor</th><th>Paciente</th></tr></thead>
              <tbody>
                {r.itens.map((x) => (
                  <tr key={x.id}>
                    <td className="sem-quebra">{dataHoraBR(x.criado_em)}</td>
                    <td><Link to={`/medicamentos/${x.medicamento_id}`}>{x.medicamento}</Link><div className="texto-fraco">lote {x.lote}</div></td>
                    <td>{rotuloControle(x.controle_especial)}</td>
                    <td className="num">{numero(x.quantidade)}</td>
                    <td className="sem-quebra">{dataBR(x.receita_data)}{x.receita_numero && <div className="texto-fraco">{x.receita_numero}</div>}</td>
                    <td>{x.prescritor_nome}<div className="texto-fraco">{x.prescritor_registro}</div></td>
                    <td>{x.paciente_nome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function Sngpc({ r, periodo }) {
  const avisar = useAvisar();
  const [baixando, setBaixando] = useState(false);
  const baixar = async () => {
    setBaixando(true);
    try {
      await baixarArquivo(`/relatorios/sngpc/arquivo?inicio=${periodo.inicio}&fim=${periodo.fim}`, `sngpc-${periodo.inicio}-a-${periodo.fim}.xml`);
      avisar("Arquivo do SNGPC gerado.");
    } catch (e) {
      avisar(mensagemDeErro(e), "erro");
    } finally {
      setBaixando(false);
    }
  };
  const total = r.totais.entradas + r.totais.saidas + r.totais.perdas;

  return (
    <>
      <Destaques itens={[
        { valor: numero(r.totais.entradas), rotulo: "entradas de controlados e antimicrobianos" },
        { valor: numero(r.totais.saidas), rotulo: "dispensações com receita" },
        { valor: numero(r.totais.perdas), rotulo: "perdas (vencimento e avaria)", tom: r.totais.perdas ? "perigo" : undefined },
      ]} />
      <section className="bloco">
        <div className="bloco-topo">
          <h2>Conferência antes do envio</h2>
          <button className="botao botao-primario sem-giro" onClick={baixar} disabled={baixando || !total}>
            <Icone nome="baixar" tamanho={18} /> {baixando ? "Gerando…" : "Baixar arquivo XML"}
          </button>
        </div>
        {r.pendencias.length === 0 ? (
          <Aviso tipo="sucesso">Nenhuma pendência encontrada no período.</Aviso>
        ) : (
          <Aviso tipo="alerta">
            {r.pendencias.length} {r.pendencias.length === 1 ? "pendência" : "pendências"} para resolver antes de transmitir:
            <ul>{r.pendencias.slice(0, 12).map((p) => <li key={p}>{p}</li>)}</ul>
            {r.pendencias.length > 12 && <span>e mais {r.pendencias.length - 12}.</span>}
          </Aviso>
        )}
        {!total && <Vazio>Nenhuma movimentação de controlados ou antimicrobianos no período.</Vazio>}
        <p className="nota">
          O Sistema Nacional de Gerenciamento de Produtos Controlados (SNGPC) da Anvisa recebe a escrituração de entradas, vendas e perdas desses medicamentos.
          O arquivo gerado segue a estrutura de inventário e movimentação do SNGPC, mas precisa ser validado no ambiente de testes da Anvisa antes do primeiro envio real.
        </p>
      </section>
    </>
  );
}
