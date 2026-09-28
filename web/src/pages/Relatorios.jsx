import { useEffect, useState } from "react";
import { api, mensagemDeErro } from "../api.js";
import { baixarCSV, dataBR, hojeISO, moeda, numero, TIPOS_MOV } from "../format.js";
import { Aviso, Cartao, Icone, Vazio } from "../components/ui.jsx";

export default function Relatorios() {
  const [inicio, setInicio] = useState(hojeISO(-30));
  const [fim, setFim] = useState(hojeISO());
  const [perdas, setPerdas] = useState(null);
  const [mov, setMov] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!inicio || !fim) return;
    setErro("");
    const q = `inicio=${inicio}&fim=${fim}`;
    Promise.all([api(`/relatorios/perdas?${q}`), api(`/relatorios/movimentacao?${q}`)])
      .then(([p, m]) => { setPerdas(p); setMov(m); })
      .catch((e) => setErro(mensagemDeErro(e)));
  }, [inicio, fim]);

  const exportarPerdas = () =>
    baixarCSV(`farmacom-perdas-${inicio}-a-${fim}.csv`, [
      { titulo: "Medicamento", valor: (r) => r.medicamento },
      { titulo: "Lote", valor: (r) => r.lote },
      { titulo: "Validade", valor: (r) => dataBR(r.validade) },
      { titulo: "Motivo", valor: (r) => TIPOS_MOV[r.tipo].rotulo },
      { titulo: "Quantidade", valor: (r) => r.quantidade },
      { titulo: "Valor (R$)", valor: (r) => Number(r.valor).toFixed(2).replace(".", ",") },
    ], perdas.itens);

  const exportarMov = () =>
    baixarCSV(`farmacom-movimentacao-${inicio}-a-${fim}.csv`, [
      { titulo: "Medicamento", valor: (r) => r.medicamento },
      { titulo: "Entradas", valor: (r) => r.entradas },
      { titulo: "Saídas", valor: (r) => r.saidas },
      { titulo: "Baixas", valor: (r) => r.baixas },
    ], mov.itens);

  return (
    <>
      <div className="cabecalho">
        <div>
          <h1>Relatórios</h1>
          <p className="subtitulo">Perdas e movimentação do estoque no período.</p>
        </div>
      </div>

      <div className="barra-filtros">
        <label className="filtro-data">De <input type="date" value={inicio} max={fim} onChange={(e) => setInicio(e.target.value)} /></label>
        <label className="filtro-data">Até <input type="date" value={fim} min={inicio} onChange={(e) => setFim(e.target.value)} /></label>
      </div>
      <Aviso>{erro}</Aviso>

      {perdas && mov && (
        <>
          <div className="grade-indicadores">
            <Cartao icone="dinheiro" tom="perigo" valor={moeda(perdas.totais.valor)} rotulo="Perdas no período" detalhe={`${numero(perdas.totais.quantidade)} unidades descartadas`} />
            <Cartao icone="alerta" tom="alerta" valor={moeda(perdas.totais.vencimento.valor)} rotulo="Por vencimento" detalhe={`${numero(perdas.totais.vencimento.quantidade)} unidades`} />
            <Cartao icone="caixa" tom="padrao" valor={numero(mov.totais.entradas)} rotulo="Unidades recebidas" />
            <Cartao icone="setas" tom="escuro" valor={numero(mov.totais.saidas)} rotulo="Unidades vendidas" />
          </div>

          <section className="painel-bloco">
            <div className="bloco-topo">
              <h2>Perdas por vencimento e avaria</h2>
              <button className="botao botao-pequeno" onClick={exportarPerdas} disabled={!perdas.itens.length}>
                <Icone nome="baixar" tamanho={16} /> Exportar planilha
              </button>
            </div>
            {perdas.itens.length === 0 ? (
              <Vazio>Nenhuma perda registrada no período.</Vazio>
            ) : (
              <div className="tabela-rolagem">
                <table>
                  <thead><tr><th>Medicamento</th><th>Lote</th><th>Validade</th><th>Motivo</th><th className="num">Qtd.</th><th className="num">Valor</th></tr></thead>
                  <tbody>
                    {perdas.itens.map((r, i) => (
                      <tr key={i}>
                        <td>{r.medicamento}</td><td>{r.lote}</td><td>{dataBR(r.validade)}</td>
                        <td>{TIPOS_MOV[r.tipo].rotulo}</td>
                        <td className="num">{numero(r.quantidade)}</td>
                        <td className="num">{moeda(r.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr><td colSpan={4}>Total</td><td className="num">{numero(perdas.totais.quantidade)}</td><td className="num">{moeda(perdas.totais.valor)}</td></tr></tfoot>
                </table>
              </div>
            )}
          </section>

          <section className="painel-bloco">
            <div className="bloco-topo">
              <h2>Movimentação por medicamento</h2>
              <button className="botao botao-pequeno" onClick={exportarMov} disabled={!mov.itens.length}>
                <Icone nome="baixar" tamanho={16} /> Exportar planilha
              </button>
            </div>
            {mov.itens.length === 0 ? (
              <Vazio>Nenhuma movimentação no período.</Vazio>
            ) : (
              <div className="tabela-rolagem">
                <table>
                  <thead><tr><th>Medicamento</th><th className="num">Entradas</th><th className="num">Saídas</th><th className="num">Baixas</th></tr></thead>
                  <tbody>
                    {mov.itens.map((r) => (
                      <tr key={r.medicamento_id}>
                        <td>{r.medicamento}</td>
                        <td className="num">{numero(r.entradas)}</td>
                        <td className="num">{numero(r.saidas)}</td>
                        <td className="num">{numero(r.baixas)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr><td>Total</td><td className="num">{numero(mov.totais.entradas)}</td><td className="num">{numero(mov.totais.saidas)}</td><td className="num">{numero(mov.totais.baixas)}</td></tr></tfoot>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
