import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, mensagemDeErro } from "../api.js";
import { dataBR, dataHoraBR, numero, TIPOS_MOV } from "../format.js";
import { Aviso, Carregando, Icone, Vazio } from "../components/ui.jsx";
import FormMovimentacao from "../components/FormMovimentacao.jsx";

export default function Movimentacoes() {
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [chaveForm, setChaveForm] = useState(0);
  const [tipo, setTipo] = useState("");

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
        <Aviso tipo="sucesso">{aviso}</Aviso>
        <FormMovimentacao
          key={chaveForm}
          aoSalvar={(m) => {
            setAviso(`Movimentação registrada. Saldo do lote: ${m.saldo_lote}.`);
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
                <tr><th>Data</th><th>Medicamento</th><th>Lote</th><th>Tipo</th><th className="num">Qtd.</th><th>Observação ou receita</th><th>Usuário</th></tr>
              </thead>
              <tbody>
                {lista.map((m) => {
                  const t = TIPOS_MOV[m.tipo];
                  return (
                    <tr key={m.id}>
                      <td className="sem-quebra">{dataHoraBR(m.criado_em)}</td>
                      <td><Link to={`/medicamentos/${m.medicamento_id}`}>{m.medicamento}</Link></td>
                      <td>{m.lote}<div className="texto-fraco">val. {dataBR(m.validade)}</div></td>
                      <td><span className={`tipo tipo-${t.classe}`}>{t.rotulo}</span></td>
                      <td className={`num tipo-num-${t.classe}`}>{t.sinal}{numero(m.quantidade)}</td>
                      <td>
                        {m.prescritor_registro ? (
                          <span className="receita-linha" title={`Receita de ${dataBR(m.receita_data)}, ${m.prescritor_nome}`}>
                            <Icone nome="receita" tamanho={15} /> {m.paciente_nome}, {m.prescritor_registro}
                          </span>
                        ) : (m.observacao || "-")}
                      </td>
                      <td>{m.usuario || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
