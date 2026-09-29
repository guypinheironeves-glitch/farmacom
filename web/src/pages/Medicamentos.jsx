import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, mensagemDeErro } from "../api.js";
import { dataBR, moeda, numero } from "../format.js";
import { ROTULO_TARJA_CURTO, useCatalogo } from "../catalogo.js";
import { Aviso, Carregando, FaixaTarja, Icone, Selo, SelosRegulatorios, Vazio } from "../components/ui.jsx";
import FormMedicamento from "../components/FormMedicamento.jsx";

const FILTROS_VAZIOS = { busca: "", categoria: "", tarja: "", controlado: "", situacao: "" };

export default function Medicamentos() {
  const catalogo = useCatalogo();
  const [lista, setLista] = useState(null);
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS);
  const [erro, setErro] = useState("");
  const [novo, setNovo] = useState(false);
  const navigate = useNavigate();
  const muda = (campo) => (e) => setFiltros({ ...filtros, [campo]: e.target.value });
  const filtrando = Object.values(filtros).some(Boolean);

  const carregar = useCallback(() => {
    const q = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v)).toString();
    api(`/medicamentos?${q}`).then(setLista).catch((e) => setErro(mensagemDeErro(e)));
  }, [filtros]);

  useEffect(() => {
    const t = setTimeout(carregar, 200);
    return () => clearTimeout(t);
  }, [carregar]);

  return (
    <>
      <div className="cabecalho">
        <div>
          <h1>Medicamentos</h1>
          <p className="subtitulo">Catálogo da farmácia com saldo, validade e dados regulatórios.</p>
        </div>
        <button className="botao botao-primario" onClick={() => setNovo(true)}>
          <Icone nome="mais" tamanho={18} /> Cadastrar medicamento
        </button>
      </div>

      <div className="barra-filtros">
        <input type="search" className="filtro-busca" placeholder="Nome, princípio ativo ou código de barras" value={filtros.busca} onChange={muda("busca")} aria-label="Buscar medicamento" />
        <select value={filtros.categoria} onChange={muda("categoria")} aria-label="Categoria">
          <option value="">Todas as categorias</option>
          {catalogo?.categorias.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={filtros.tarja} onChange={muda("tarja")} aria-label="Tarja">
          <option value="">Todas as tarjas</option>
          {Object.entries(ROTULO_TARJA_CURTO).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
        </select>
        <select value={filtros.controlado} onChange={muda("controlado")} aria-label="Controle especial">
          <option value="">Controlados e não controlados</option>
          <option value="sim">Só com controle especial</option>
          <option value="nao">Sem controle especial</option>
        </select>
        <select value={filtros.situacao} onChange={muda("situacao")} aria-label="Situação do estoque">
          <option value="">Qualquer situação</option>
          <option value="abaixo_minimo">Abaixo do mínimo</option>
        </select>
        {filtrando && <button className="botao-link" onClick={() => setFiltros(FILTROS_VAZIOS)}>Limpar filtros</button>}
      </div>
      <Aviso>{erro}</Aviso>

      {!lista && !erro && <Carregando linhas={8} />}
      {lista && lista.length === 0 && (
        <Vazio>{filtrando ? "Nenhum medicamento com esses filtros." : "Nenhum medicamento cadastrado. Cadastre o primeiro para começar."}</Vazio>
      )}
      {lista && lista.length > 0 && (
        <div className="bloco sem-padding">
          <div className="tabela-info">
            <span>{lista.length} {lista.length === 1 ? "medicamento" : "medicamentos"}</span>
            <span className="legenda-tarjas" aria-label="Legenda das tarjas">
              {Object.entries(ROTULO_TARJA_CURTO).map(([v, r]) => (
                <span key={v}><span className={`faixa-legenda faixa-${v}`} />{r}</span>
              ))}
            </span>
          </div>
          <div className="tabela-rolagem">
            <table>
              <thead>
                <tr>
                  <th>Medicamento</th><th>Categoria</th><th className="num">Saldo</th>
                  <th className="num">Mínimo</th><th>Próxima validade</th><th className="num">Preço</th><th>Estoque</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((m) => (
                  <tr key={m.id} className="linha-clicavel" onClick={() => navigate(`/medicamentos/${m.id}`)}>
                    <td className="celula-medicamento">
                      <FaixaTarja tarja={m.tarja} />
                      <div>
                        <Link to={`/medicamentos/${m.id}`} onClick={(e) => e.stopPropagation()}>{m.nome}</Link>
                        <div className="linha-selos">
                          <span className="texto-fraco">{m.apresentacao || m.principio_ativo}</span>
                          <SelosRegulatorios med={m} compacto />
                        </div>
                      </div>
                    </td>
                    <td className="texto-fraco">{m.categoria || "-"}</td>
                    <td className="num">{numero(m.saldo_total)}</td>
                    <td className="num">{numero(m.estoque_minimo)}</td>
                    <td>{dataBR(m.proxima_validade)}</td>
                    <td className="num">{m.preco_venda === null ? "-" : moeda(m.preco_venda)}</td>
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
