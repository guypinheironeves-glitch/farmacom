import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, mensagemDeErro } from "../api.js";
import { dataBR, numero } from "../format.js";
import { Aviso, Icone, Selo, Vazio } from "../components/ui.jsx";
import FormMedicamento from "../components/FormMedicamento.jsx";

export default function Medicamentos() {
  const [lista, setLista] = useState(null);
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState("");
  const [novo, setNovo] = useState(false);
  const navigate = useNavigate();

  const carregar = useCallback(() => {
    api(`/medicamentos?busca=${encodeURIComponent(busca)}`)
      .then(setLista)
      .catch((e) => setErro(mensagemDeErro(e)));
  }, [busca]);

  useEffect(() => {
    const t = setTimeout(carregar, 250);
    return () => clearTimeout(t);
  }, [carregar]);

  return (
    <>
      <div className="cabecalho">
        <div>
          <h1>Medicamentos</h1>
          <p className="subtitulo">Cadastro, saldo e próxima validade de cada medicamento.</p>
        </div>
        <button className="botao botao-primario" onClick={() => setNovo(true)}>
          <Icone nome="mais" tamanho={18} /> Novo medicamento
        </button>
      </div>

      <div className="barra-filtros">
        <input type="search" placeholder="Buscar por nome ou princípio ativo" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar medicamento" />
      </div>
      <Aviso>{erro}</Aviso>

      {lista && lista.length === 0 && <Vazio>Nenhum medicamento encontrado.</Vazio>}
      {lista && lista.length > 0 && (
        <div className="painel-bloco sem-padding">
          <div className="tabela-rolagem">
            <table>
              <thead>
                <tr>
                  <th>Medicamento</th><th>Apresentação</th><th className="num">Lotes</th>
                  <th className="num">Saldo</th><th className="num">Mínimo</th><th>Próxima validade</th><th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((m) => (
                  <tr key={m.id} className="linha-clicavel" onClick={() => navigate(`/medicamentos/${m.id}`)}>
                    <td>
                      <Link to={`/medicamentos/${m.id}`} onClick={(e) => e.stopPropagation()}>{m.nome}</Link>
                      {m.principio_ativo && <div className="texto-fraco">{m.principio_ativo}</div>}
                    </td>
                    <td>{m.apresentacao || "-"}</td>
                    <td className="num">{m.total_lotes}</td>
                    <td className="num">{numero(m.saldo_total)}</td>
                    <td className="num">{numero(m.estoque_minimo)}</td>
                    <td>{dataBR(m.proxima_validade)}</td>
                    <td>{m.abaixo_minimo ? <Selo classe="alerta">Abaixo do mínimo</Selo> : <Selo classe="ok">Normal</Selo>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {novo && (
        <FormMedicamento
          aoFechar={() => setNovo(false)}
          aoSalvar={(m) => { setNovo(false); navigate(`/medicamentos/${m.id}`); }}
        />
      )}
    </>
  );
}
