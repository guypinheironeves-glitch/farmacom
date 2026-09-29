import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, mensagemDeErro } from "../api.js";
import { cnpjFormatado, dataBR, hojeISO, moeda, numero } from "../format.js";
import { Aviso, Icone } from "../components/ui.jsx";
import { useAvisar } from "../components/Toasts.jsx";

const loteVazio = (quantidade = "") => ({ codigo: "", validade: "", quantidade });

function prepararItens(itens) {
  return itens.map((it) => ({
    ...it,
    incluir: Boolean(it.medicamento_id),
    medicamento_id: it.medicamento_id ? String(it.medicamento_id) : "",
    lotes: it.lotes.length
      ? it.lotes.map((l) => ({ codigo: l.codigo, validade: l.validade || "", quantidade: l.quantidade }))
      : [loteVazio(it.quantidade)],
  }));
}

export default function EntradaNota() {
  const avisar = useAvisar();
  const entrada = useRef(null);
  const [arrastando, setArrastando] = useState(false);
  const [analise, setAnalise] = useState(null);
  const [itens, setItens] = useState([]);
  const [medicamentos, setMedicamentos] = useState([]);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    api("/medicamentos").then(setMedicamentos).catch(() => {});
  }, []);

  const ler = async (arquivo) => {
    if (!arquivo) return;
    setErro("");
    if (!/\.xml$/i.test(arquivo.name)) {
      setErro("Escolha o arquivo XML da nota fiscal (termina em .xml).");
      return;
    }
    setCarregando(true);
    try {
      const xml = await arquivo.text();
      const r = await api("/nfe/analisar", { method: "POST", body: { xml } });
      setAnalise(r);
      setItens(prepararItens(r.itens));
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  };

  const mudaItem = (i, campo, valor) =>
    setItens((lista) => lista.map((it, j) => (j === i ? { ...it, [campo]: valor, ...(campo === "medicamento_id" && valor ? { incluir: true } : {}) } : it)));
  const mudaLote = (i, k, campo, valor) =>
    setItens((lista) => lista.map((it, j) => (j === i ? { ...it, lotes: it.lotes.map((l, n) => (n === k ? { ...l, [campo]: valor } : l)) } : it)));
  const addLote = (i) => setItens((lista) => lista.map((it, j) => (j === i ? { ...it, lotes: [...it.lotes, loteVazio()] } : it)));
  const tiraLote = (i, k) => setItens((lista) => lista.map((it, j) => (j === i ? { ...it, lotes: it.lotes.filter((_, n) => n !== k) } : it)));

  const selecionados = itens.filter((it) => it.incluir);
  const unidades = selecionados.reduce((a, it) => a + it.lotes.reduce((b, l) => b + (Number(l.quantidade) || 0), 0), 0);

  const importar = async () => {
    setErro("");
    setCarregando(true);
    try {
      const r = await api("/nfe/importar", {
        method: "POST",
        body: {
          nota: { chave: analise.nota.chave || "", numero: analise.nota.numero || "" },
          fornecedor: { cnpj: analise.fornecedor.cnpj || "", nome: analise.fornecedor.nome, telefone: analise.fornecedor.telefone || null },
          itens: selecionados.map((it) => ({
            medicamento_id: Number(it.medicamento_id),
            valor_unitario: it.valor_unitario,
            lotes: it.lotes.map((l) => ({ codigo: l.codigo, validade: l.validade, quantidade: Number(l.quantidade) })),
          })),
        },
      });
      setResultado(r);
      avisar(`Nota ${analise.nota.numero} importada.`);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  };

  const recomecar = () => {
    setAnalise(null);
    setItens([]);
    setResultado(null);
    setErro("");
  };

  return (
    <>
      <div className="cabecalho">
        <div>
          <h1>Entrada por nota fiscal</h1>
          <p className="subtitulo">Envie o XML da NF-e de compra. Os lotes, validades e quantidades são lidos da nota e entram no estoque de uma vez.</p>
        </div>
        {analise && !resultado && <button className="botao" onClick={recomecar}>Escolher outra nota</button>}
      </div>
      <Aviso>{erro}</Aviso>

      {!analise && (
        <>
          <div
            className={`area-arquivo ${arrastando ? "arrastando" : ""}`}
            role="button"
            tabIndex={0}
            onClick={() => entrada.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && entrada.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
            onDragLeave={() => setArrastando(false)}
            onDrop={(e) => { e.preventDefault(); setArrastando(false); ler(e.dataTransfer.files[0]); }}
          >
            <span className="icone-grande"><Icone nome={carregando ? "relogio" : "upload"} tamanho={30} /></span>
            <strong>{carregando ? "Lendo a nota…" : "Arraste o XML da nota aqui ou clique para escolher"}</strong>
            <span className="texto-fraco">O arquivo é enviado pelo fornecedor junto com a mercadoria, ou baixado no portal da NF-e.</span>
            <input ref={entrada} type="file" accept=".xml,text/xml,application/xml" hidden onChange={(e) => { ler(e.target.files[0]); e.target.value = ""; }} />
          </div>
          <p className="nota">
            Quer testar? <a href="/nfe-exemplo.xml" download>Baixe uma nota de exemplo</a> com medicamentos do catálogo de demonstração.
          </p>
        </>
      )}

      {resultado && (
        <section className="bloco resultado-importacao">
          <span className="icone-ok"><Icone nome="confirmar" tamanho={34} /></span>
          <h2>Nota importada</h2>
          <p className="subtitulo">
            {numero(resultado.unidades)} unidades entraram no estoque em {resultado.lotes_criados} {resultado.lotes_criados === 1 ? "lote novo" : "lotes novos"}.
          </p>
          <div className="grupo-botoes">
            <button className="botao botao-primario sem-giro" onClick={recomecar}>Importar outra nota</button>
            <Link className="botao" to="/movimentacoes">Ver movimentações</Link>
          </div>
        </section>
      )}

      {analise && !resultado && (
        <>
          <section className="bloco">
            <div className="bloco-topo">
              <h2>NF-e {analise.nota.numero}{analise.nota.serie ? `, série ${analise.nota.serie}` : ""}</h2>
              {analise.ja_importada && <span className="selo selo-perigo">Já importada</span>}
            </div>
            <dl className="nota-cabecalho">
              <div><dt>Fornecedor</dt><dd>{analise.fornecedor.nome}</dd></div>
              <div><dt>CNPJ</dt><dd>{cnpjFormatado(analise.fornecedor.cnpj)}</dd></div>
              <div>
                <dt>Cadastro</dt>
                <dd>{analise.fornecedor.cadastrado ? <span className="selo selo-ok">Já cadastrado</span> : <span className="selo selo-destaque">Será cadastrado</span>}</dd>
              </div>
              <div><dt>Emissão</dt><dd>{dataBR(analise.nota.emissao)}</dd></div>
              <div><dt>Valor total</dt><dd>{moeda(analise.nota.valor_total)}</dd></div>
              <div style={{ gridColumn: "1 / -1" }}><dt>Chave de acesso</dt><dd className="num-mono">{analise.nota.chave || "-"}</dd></div>
            </dl>
          </section>

          {analise.avisos.length > 0 && (
            <Aviso tipo="alerta">
              Confira antes de importar:
              <ul>{analise.avisos.map((a) => <li key={a}>{a}</li>)}</ul>
            </Aviso>
          )}

          <section className="bloco">
            <div className="bloco-topo">
              <h2>Itens da nota</h2>
              <span className="texto-fraco">{selecionados.length} de {itens.length} itens selecionados, {numero(unidades)} unidades</span>
            </div>
            {itens.map((it, i) => {
              const somaLotes = it.lotes.reduce((a, l) => a + (Number(l.quantidade) || 0), 0);
              return (
                <div key={it.indice ?? i} className={`item-nota ${it.incluir ? "" : "ignorado"} ${!it.medicamento_id ? "sem-vinculo" : ""}`}>
                  <div className="item-nota-topo">
                    <div>
                      <strong>{it.descricao}</strong>
                      <div className="texto-fraco">
                        {it.ean ? `EAN ${it.ean}` : "Sem código de barras"} · {numero(it.quantidade)} un. × {moeda(it.valor_unitario)}
                      </div>
                    </div>
                    <label className="campo-marcar">
                      <input type="checkbox" checked={it.incluir} onChange={(e) => mudaItem(i, "incluir", e.target.checked)} />
                      Importar
                    </label>
                  </div>
                  <label className="campo">
                    <span className="campo-rotulo">Medicamento no estoque {it.medicamento_id && it.medicamento ? <span className="selo selo-ok">reconhecido</span> : null}</span>
                    <select value={it.medicamento_id} onChange={(e) => mudaItem(i, "medicamento_id", e.target.value)}>
                      <option value="">Escolha o medicamento…</option>
                      {medicamentos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                    </select>
                  </label>
                  {it.incluir && (
                    <div className="item-nota-lotes">
                      {it.lotes.map((l, k) => (
                        <div className="item-nota-lote" key={k}>
                          <label className="campo"><span className="campo-rotulo">Lote</span><input value={l.codigo} onChange={(e) => mudaLote(i, k, "codigo", e.target.value)} required /></label>
                          <label className="campo">
                            <span className="campo-rotulo">Validade</span>
                            <input type="date" value={l.validade} onChange={(e) => mudaLote(i, k, "validade", e.target.value)} required />
                          </label>
                          <label className="campo"><span className="campo-rotulo">Qtd.</span><input type="number" min="1" value={l.quantidade} onChange={(e) => mudaLote(i, k, "quantidade", e.target.value)} /></label>
                          <button type="button" className="botao-icone" onClick={() => tiraLote(i, k)} disabled={it.lotes.length === 1} aria-label="Remover lote" title="Remover lote">
                            <Icone nome="fechar" tamanho={18} />
                          </button>
                        </div>
                      ))}
                      <div className="grupo-botoes" style={{ alignItems: "center" }}>
                        <button type="button" className="botao botao-pequeno" onClick={() => addLote(i)}><Icone nome="mais" tamanho={16} /> Outro lote</button>
                        {somaLotes !== Number(it.quantidade) && (
                          <span className="selo selo-alerta">Soma dos lotes ({numero(somaLotes)}) diferente da nota ({numero(it.quantidade)})</span>
                        )}
                        {it.lotes.some((l) => l.validade && l.validade < hojeISO()) && <span className="selo selo-perigo">Lote com validade vencida</span>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div className="form-acoes" style={{ marginTop: 18 }}>
              <button className="botao" onClick={recomecar}>Cancelar</button>
              <button
                className="botao botao-primario sem-giro"
                onClick={importar}
                disabled={carregando || analise.ja_importada || !selecionados.length || selecionados.some((it) => !it.medicamento_id)}
              >
                <Icone nome="caixa" tamanho={18} /> {carregando ? "Importando…" : `Dar entrada em ${numero(unidades)} unidades`}
              </button>
            </div>
          </section>
        </>
      )}
    </>
  );
}
