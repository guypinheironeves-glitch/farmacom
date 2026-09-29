import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, mensagemDeErro } from "../api.js";
import { baixarCSV, dataBR, dataHoraBR, hojeISO, moeda, numero, TIPOS_MOV } from "../format.js";
import { rotuloControle } from "../catalogo.js";
import { Aviso, Carregando, Icone, Vazio } from "../components/ui.jsx";

const pct = (v) => `${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

const ABAS = [
  { id: "perdas", rotulo: "Perdas" },
  { id: "movimentacao", rotulo: "Movimentação" },
  { id: "curva-abc", rotulo: "Curva ABC" },
  { id: "controlados", rotulo: "Livro de controlados" },
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
  const sufixo = `${inicio}-a-${fim}`;

  return (
    <>
      <div className="cabecalho">
        <div>
          <h1>Relatórios</h1>
          <p className="subtitulo">Perdas, giro do estoque e registro de controlados no período escolhido.</p>
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

      {atual && aba === "perdas" && <Perdas r={atual} sufixo={sufixo} />}
      {atual && aba === "movimentacao" && <Movimentacao r={atual} sufixo={sufixo} />}
      {atual && aba === "curva-abc" && <CurvaABC r={atual} sufixo={sufixo} />}
      {atual && aba === "controlados" && <Controlados r={atual} sufixo={sufixo} />}
    </>
  );
}

function Exportar({ aoClicar, desativado }) {
  return (
    <button className="botao botao-pequeno" onClick={aoClicar} disabled={desativado}>
      <Icone nome="baixar" tamanho={16} /> Exportar planilha
    </button>
  );
}

function Destaques({ itens }) {
  return (
    <div className="destaques">
      {itens.map((i) => (
        <div key={i.rotulo} className={`destaque ${i.tom ? `destaque-${i.tom}` : ""}`}>
          <strong>{i.valor}</strong>
          <span>{i.rotulo}</span>
        </div>
      ))}
    </div>
  );
}

function Perdas({ r, sufixo }) {
  const exportar = () =>
    baixarCSV(`farmacom-perdas-${sufixo}.csv`, [
      { titulo: "Medicamento", valor: (x) => x.medicamento },
      { titulo: "Lote", valor: (x) => x.lote },
      { titulo: "Validade", valor: (x) => dataBR(x.validade) },
      { titulo: "Motivo", valor: (x) => TIPOS_MOV[x.tipo].rotulo },
      { titulo: "Quantidade", valor: (x) => x.quantidade },
      { titulo: "Valor (R$)", valor: (x) => Number(x.valor).toFixed(2).replace(".", ",") },
    ], r.itens);
  return (
    <>
      <Destaques itens={[
        { valor: moeda(r.totais.valor), rotulo: "perdidos no período, a preço de custo", tom: "perigo" },
        { valor: numero(r.totais.vencimento.quantidade), rotulo: `unidades vencidas (${moeda(r.totais.vencimento.valor)})` },
        { valor: numero(r.totais.avaria.quantidade), rotulo: `unidades avariadas (${moeda(r.totais.avaria.valor)})` },
      ]} />
      <section className="bloco">
        <div className="bloco-topo"><h2>Baixas por vencimento e avaria</h2><Exportar aoClicar={exportar} desativado={!r.itens.length} /></div>
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

function Movimentacao({ r, sufixo }) {
  const exportar = () =>
    baixarCSV(`farmacom-movimentacao-${sufixo}.csv`, [
      { titulo: "Medicamento", valor: (x) => x.medicamento },
      { titulo: "Entradas", valor: (x) => x.entradas },
      { titulo: "Saídas", valor: (x) => x.saidas },
      { titulo: "Baixas", valor: (x) => x.baixas },
    ], r.itens);
  return (
    <>
      <Destaques itens={[
        { valor: numero(r.totais.entradas), rotulo: "unidades recebidas" },
        { valor: numero(r.totais.saidas), rotulo: "unidades vendidas" },
        { valor: numero(r.totais.baixas), rotulo: "unidades baixadas", tom: r.totais.baixas ? "perigo" : undefined },
      ]} />
      <section className="bloco">
        <div className="bloco-topo"><h2>Por medicamento</h2><Exportar aoClicar={exportar} desativado={!r.itens.length} /></div>
        {r.itens.length === 0 ? <Vazio>Nenhuma movimentação no período.</Vazio> : (
          <div className="tabela-rolagem">
            <table>
              <thead><tr><th>Medicamento</th><th className="num">Entradas</th><th className="num">Saídas</th><th className="num">Baixas</th></tr></thead>
              <tbody>
                {r.itens.map((x) => (
                  <tr key={x.medicamento_id}>
                    <td><Link to={`/medicamentos/${x.medicamento_id}`}>{x.medicamento}</Link></td>
                    <td className="num">{numero(x.entradas)}</td><td className="num">{numero(x.saidas)}</td><td className="num">{numero(x.baixas)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td>Total</td><td className="num">{numero(r.totais.entradas)}</td><td className="num">{numero(r.totais.saidas)}</td><td className="num">{numero(r.totais.baixas)}</td></tr></tfoot>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

const DESCRICAO_CLASSE = {
  A: "Até 80% do faturamento. Nunca pode faltar: acompanhe o estoque de perto.",
  B: "De 80% a 95% do faturamento. Reposição regular.",
  C: "Últimos 5% do faturamento. Compre em pequenas quantidades para não vencer na prateleira.",
};

function CurvaABC({ r, sufixo }) {
  const exportar = () =>
    baixarCSV(`farmacom-curva-abc-${sufixo}.csv`, [
      { titulo: "Classe", valor: (x) => x.classe },
      { titulo: "Medicamento", valor: (x) => x.medicamento },
      { titulo: "Categoria", valor: (x) => x.categoria || "" },
      { titulo: "Unidades vendidas", valor: (x) => x.quantidade },
      { titulo: "Faturamento (R$)", valor: (x) => Number(x.faturamento).toFixed(2).replace(".", ",") },
      { titulo: "% do faturamento", valor: (x) => String(x.percentual).replace(".", ",") },
      { titulo: "% acumulado", valor: (x) => String(x.acumulado).replace(".", ",") },
    ], r.itens);
  const totalItens = r.itens.length || 1;
  const maior = Math.max(...r.itens.map((x) => Number(x.faturamento)), 1);
  return (
    <>
      <div className="abc-resumo">
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
      <section className="bloco">
        <div className="bloco-topo">
          <h2>Faturamento por medicamento</h2>
          <Exportar aoClicar={exportar} desativado={!r.itens.length} />
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

function Controlados({ r, sufixo }) {
  const exportar = () =>
    baixarCSV(`farmacom-controlados-${sufixo}.csv`, [
      { titulo: "Data da venda", valor: (x) => dataHoraBR(x.criado_em) },
      { titulo: "Medicamento", valor: (x) => x.medicamento },
      { titulo: "Controle", valor: (x) => rotuloControle(x.controle_especial) },
      { titulo: "Lote", valor: (x) => x.lote },
      { titulo: "Quantidade", valor: (x) => x.quantidade },
      { titulo: "Data da receita", valor: (x) => dataBR(x.receita_data) },
      { titulo: "Número", valor: (x) => x.receita_numero || "" },
      { titulo: "Prescritor", valor: (x) => x.prescritor_nome },
      { titulo: "Registro", valor: (x) => x.prescritor_registro },
      { titulo: "Paciente", valor: (x) => x.paciente_nome },
    ], r.itens);
  return (
    <>
      <Destaques itens={[
        { valor: numero(r.itens.length), rotulo: "dispensações com receita retida" },
        { valor: numero(r.total_unidades), rotulo: "unidades dispensadas" },
      ]} />
      <section className="bloco">
        <div className="bloco-topo"><h2>Saídas com receita retida</h2><Exportar aoClicar={exportar} desativado={!r.itens.length} /></div>
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
        <p className="nota">Base para a escrituração no SNGPC da Anvisa, que exige o envio das movimentações de controlados e antimicrobianos.</p>
      </section>
    </>
  );
}
