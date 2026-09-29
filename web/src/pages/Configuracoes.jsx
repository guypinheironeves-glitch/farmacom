import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../App.jsx";
import { COR_PADRAO, CORES_SUGERIDAS, useTema } from "../tema.js";
import { api, mensagemDeErro } from "../api.js";
import { dataBR, dataHoraBR } from "../format.js";
import { Aviso, Campo, Carregando, Icone, Interruptor, Modal, Vazio } from "../components/ui.jsx";
import { MarcaIcone } from "../components/Logo.jsx";
import { useAvisar } from "../components/Toasts.jsx";

const SECOES = [
  { id: "farmacia", rotulo: "Farmácia", icone: "loja", admin: true },
  { id: "aparencia", rotulo: "Aparência", icone: "paleta" },
  { id: "avisos", rotulo: "Avisos diários", icone: "sino", admin: true },
  { id: "usuarios", rotulo: "Usuários", icone: "pessoas", admin: true },
  { id: "conta", rotulo: "Minha conta", icone: "cadeado" },
];

export default function Configuracoes() {
  const { admin } = useAuth();
  const secoes = SECOES.filter((s) => admin || !s.admin);
  const [secao, setSecao] = useState(secoes[0].id);
  const [config, setConfig] = useState(null);
  const [erro, setErro] = useState("");

  const carregar = useCallback(() => {
    api("/configuracoes").then(setConfig).catch((e) => setErro(mensagemDeErro(e)));
  }, []);
  useEffect(carregar, [carregar]);

  return (
    <>
      <div className="cabecalho">
        <div>
          <h1>Configurações</h1>
          <p className="subtitulo">Dados da farmácia, aparência do sistema, avisos e acesso da equipe.</p>
        </div>
      </div>
      <Aviso>{erro}</Aviso>
      <div className="config">
        <nav className="config-menu" aria-label="Seções">
          {secoes.map((s) => (
            <button key={s.id} className={secao === s.id ? "ativa" : ""} onClick={() => setSecao(s.id)} aria-current={secao === s.id}>
              <Icone nome={s.icone} tamanho={18} /> {s.rotulo}
            </button>
          ))}
        </nav>
        <div className="config-painel" key={secao}>
          {!config && !erro && <Carregando />}
          {config && secao === "farmacia" && <Farmacia inicial={config.farmacia} aoSalvar={carregar} />}
          {config && secao === "aparencia" && <Aparencia salvo={config.aparencia.cor_destaque} aoSalvar={carregar} />}
          {config && secao === "avisos" && <Avisos inicial={config.avisos} canais={config.canais} aoSalvar={carregar} />}
          {secao === "usuarios" && <Usuarios />}
          {secao === "conta" && <Conta />}
        </div>
      </div>
    </>
  );
}

function useSalvar(chave, aoSalvar, mensagem) {
  const avisar = useAvisar();
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const salvar = async (dados) => {
    setErro("");
    setSalvando(true);
    try {
      const r = await api(`/configuracoes/${chave}`, { method: "PUT", body: dados });
      avisar(mensagem);
      aoSalvar?.(r);
      return r;
    } catch (e) {
      setErro(mensagemDeErro(e));
      return null;
    } finally {
      setSalvando(false);
    }
  };
  return { salvar, erro, salvando };
}

function Farmacia({ inicial, aoSalvar }) {
  const { setNomeFarmacia } = useAuth();
  const [dados, setDados] = useState(inicial);
  const { salvar, erro, salvando } = useSalvar("farmacia", (r) => { setNomeFarmacia(r.nome); aoSalvar(); }, "Dados da farmácia salvos.");
  const muda = (c) => (e) => setDados({ ...dados, [c]: e.target.value });

  return (
    <section className="bloco">
      <div className="bloco-topo"><h2>Dados da farmácia</h2></div>
      <form className="form" onSubmit={(e) => { e.preventDefault(); salvar(dados); }}>
        <div className="form-grade">
          <Campo rotulo="Nome da farmácia" largura={2}><input value={dados.nome} onChange={muda("nome")} /></Campo>
          <Campo rotulo="CNPJ"><input value={dados.cnpj} onChange={muda("cnpj")} inputMode="numeric" /></Campo>
          <div className="form-grade" style={{ gridTemplateColumns: "1fr 80px" }}>
            <Campo rotulo="Cidade"><input value={dados.cidade} onChange={muda("cidade")} /></Campo>
            <Campo rotulo="UF"><input value={dados.uf} onChange={muda("uf")} maxLength={2} /></Campo>
          </div>
        </div>
        <fieldset>
          <legend>Farmacêutico responsável técnico</legend>
          <div className="form-grade form-grade-3">
            <Campo rotulo="Nome"><input value={dados.responsavel_tecnico} onChange={muda("responsavel_tecnico")} /></Campo>
            <Campo rotulo="CRF"><input value={dados.crf} onChange={muda("crf")} placeholder="CRF-PB 0000" /></Campo>
            <Campo rotulo="CPF"><input value={dados.cpf_responsavel} onChange={muda("cpf_responsavel")} inputMode="numeric" /></Campo>
          </div>
        </fieldset>
        <p className="nota" style={{ margin: 0 }}>O CNPJ e o CPF do responsável entram no cabeçalho do arquivo do SNGPC.</p>
        <Aviso>{erro}</Aviso>
        <div className="form-acoes"><button className="botao botao-primario sem-giro" disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</button></div>
      </form>
    </section>
  );
}

function Aparencia({ salvo, aoSalvar }) {
  const { admin } = useAuth();
  const { modo, definirModo, cor, setCor } = useTema();
  const [texto, setTexto] = useState(cor.toUpperCase());
  const { salvar, erro, salvando } = useSalvar("aparencia", aoSalvar, "Cor de destaque salva para toda a equipe.");

  useEffect(() => setTexto(cor.toUpperCase()), [cor]);
  const salvoRef = useRef(salvo);
  salvoRef.current = salvo;
  useEffect(() => () => setCor(salvoRef.current), [setCor]);

  const digitar = (v) => {
    setTexto(v.toUpperCase());
    const hex = v.startsWith("#") ? v : `#${v}`;
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) setCor(hex);
  };
  const alterado = cor.toLowerCase() !== String(salvo).toLowerCase();

  return (
    <>
      <section className="bloco">
        <div className="bloco-topo"><h2>Tema</h2><span className="texto-fraco">vale só para este navegador</span></div>
        <div className="modos">
          {["claro", "escuro"].map((m) => (
            <button key={m} className={`modo modo-${m} ${modo === m ? "ativo" : ""}`} onClick={() => definirModo(m)} aria-pressed={modo === m}>
              <span className="modo-previa"><span /><span><i /><i /><i /></span></span>
              <span><Icone nome={m === "claro" ? "sol" : "lua"} tamanho={16} /> Tema {m}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="bloco">
        <div className="bloco-topo">
          <h2>Cor de destaque</h2>
          <span className="texto-fraco">{admin ? "use a cor da sua farmácia; vale para toda a equipe" : "definida pelo administrador"}</span>
        </div>
        {admin ? (
          <div className="form">
            <div className="amostras" role="radiogroup" aria-label="Cores sugeridas">
              {CORES_SUGERIDAS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={cor.toLowerCase() === c.toLowerCase()}
                  aria-label={`Cor ${c}`}
                  className={`amostra ${cor.toLowerCase() === c.toLowerCase() ? "ativa" : ""}`}
                  style={{ background: c }}
                  onClick={() => setCor(c)}
                >
                  {cor.toLowerCase() === c.toLowerCase() && <Icone nome="confirmar" tamanho={16} />}
                </button>
              ))}
            </div>
            <div className="cor-personalizada">
              <span className="campo-rotulo">Outra cor</span>
              <input type="color" value={cor} onChange={(e) => setCor(e.target.value)} aria-label="Escolher cor" />
              <input type="text" value={texto} onChange={(e) => digitar(e.target.value)} maxLength={7} aria-label="Código da cor" />
            </div>
            <div className="previa-destaque">
              <MarcaIcone tamanho={40} />
              <button type="button" className="botao botao-primario"><Icone nome="mais" tamanho={18} /> Botão principal</button>
              <span className="selo selo-destaque">Selo</span>
              <a href="#previa" onClick={(e) => e.preventDefault()}>Link de exemplo</a>
            </div>
            <Aviso>{erro}</Aviso>
            <div className="form-acoes">
              <button type="button" className="botao" onClick={() => setCor(COR_PADRAO)} disabled={cor.toLowerCase() === COR_PADRAO.toLowerCase()}>Restaurar padrão</button>
              <button type="button" className="botao" onClick={() => setCor(salvo)} disabled={!alterado}>Desfazer</button>
              <button type="button" className="botao botao-primario sem-giro" onClick={() => salvar({ cor_destaque: cor })} disabled={salvando || !alterado}>
                {salvando ? "Salvando…" : "Salvar cor"}
              </button>
            </div>
          </div>
        ) : (
          <div className="previa-destaque"><MarcaIcone tamanho={40} /><span className="num-mono">{cor.toUpperCase()}</span></div>
        )}
      </section>
    </>
  );
}

const lista = (texto) => texto.split(/[\n,;]+/).map((v) => v.trim()).filter(Boolean);

function Avisos({ inicial, canais, aoSalvar }) {
  const avisar = useAvisar();
  const [dados, setDados] = useState(inicial);
  const [emails, setEmails] = useState(inicial.email.destinatarios.join("\n"));
  const [numeros, setNumeros] = useState(inicial.whatsapp.numeros.join("\n"));
  const [previa, setPrevia] = useState(null);
  const [historico, setHistorico] = useState(null);
  const [testando, setTestando] = useState(false);
  const [resultadoTeste, setResultadoTeste] = useState(null);
  const { salvar, erro, salvando } = useSalvar("avisos", aoSalvar, "Configuração de avisos salva.");

  const carregarExtras = useCallback(() => {
    api("/avisos/previa").then(setPrevia).catch(() => {});
    api("/avisos/historico").then(setHistorico).catch(() => {});
  }, []);
  useEffect(carregarExtras, [carregarExtras]);

  const montar = () => ({
    ativo: dados.ativo,
    hora: dados.hora,
    dias_validade: Number(dados.dias_validade),
    email: { ativo: dados.email.ativo, destinatarios: lista(emails) },
    whatsapp: { ativo: dados.whatsapp.ativo, numeros: lista(numeros) },
  });

  const testar = async () => {
    setTestando(true);
    setResultadoTeste(null);
    try {
      const salvoAgora = await salvar(montar());
      if (!salvoAgora) return;
      const r = await api("/avisos/teste", { method: "POST" });
      setResultadoTeste(r);
      avisar(r.enviado ? "Aviso de teste enviado." : r.motivo || "Nenhum aviso foi enviado.", r.enviado ? "sucesso" : "erro");
      carregarExtras();
    } catch (e) {
      avisar(mensagemDeErro(e), "erro");
    } finally {
      setTestando(false);
    }
  };

  const canal = (chave, sub) => ({ ...dados[chave], ...sub });

  return (
    <>
      <section className="bloco">
        <div className="bloco-topo">
          <h2>Aviso diário</h2>
          <Interruptor ligado={dados.ativo} aoMudar={(v) => setDados({ ...dados, ativo: v })} rotulo={dados.ativo ? "Ativado" : "Desativado"} />
        </div>
        <p className="subtitulo" style={{ marginTop: 0, marginBottom: 16 }}>
          Uma vez por dia, no horário escolhido, o sistema envia a lista de lotes que vencem e de medicamentos abaixo do estoque mínimo.
        </p>
        <div className="linha-config" style={{ marginBottom: 18 }}>
          <Campo rotulo="Horário do envio"><input type="time" value={dados.hora} onChange={(e) => setDados({ ...dados, hora: e.target.value })} /></Campo>
          <Campo rotulo="Avisar validade com"><select value={dados.dias_validade} onChange={(e) => setDados({ ...dados, dias_validade: e.target.value })}>
            {[15, 30, 45, 60, 90].map((d) => <option key={d} value={d}>{d} dias de antecedência</option>)}
          </select></Campo>
          {dados.ultimo_envio && <span className="texto-fraco">Último envio automático: {dataBR(dados.ultimo_envio)}</span>}
        </div>
        <div className="canais">
          <div className="canal">
            <div className="canal-topo">
              <h3><Icone nome="email" tamanho={18} /> E-mail</h3>
              <Interruptor ligado={dados.email.ativo} aoMudar={(v) => setDados({ ...dados, email: canal("email", { ativo: v }) })} />
            </div>
            {canais.email ? <span className="selo selo-ok">Servidor de e-mail configurado</span> : <span className="selo selo-alerta">Servidor de e-mail não configurado</span>}
            <Campo rotulo="Destinatários" dica="Um e-mail por linha.">
              <textarea value={emails} onChange={(e) => setEmails(e.target.value)} disabled={!dados.email.ativo} placeholder="farmaceutico@exemplo.com" />
            </Campo>
          </div>
          <div className="canal">
            <div className="canal-topo">
              <h3><Icone nome="mensagem" tamanho={18} /> WhatsApp</h3>
              <Interruptor ligado={dados.whatsapp.ativo} aoMudar={(v) => setDados({ ...dados, whatsapp: canal("whatsapp", { ativo: v }) })} />
            </div>
            {canais.whatsapp ? <span className="selo selo-ok">API do WhatsApp configurada</span> : <span className="selo selo-alerta">API do WhatsApp não configurada</span>}
            <Campo rotulo="Números" dica="Com DDI e DDD, um por linha. Ex.: 5583999990000">
              <textarea value={numeros} onChange={(e) => setNumeros(e.target.value)} disabled={!dados.whatsapp.ativo} placeholder="5583999990000" />
            </Campo>
          </div>
        </div>
        {(!canais.email || !canais.whatsapp) && (
          <p className="nota">
            Os canais dependem de variáveis no servidor: SMTP_HOST, SMTP_USER e SMTP_PASS para e-mail; WHATSAPP_API_URL, WHATSAPP_INSTANCIA e WHATSAPP_TOKEN para WhatsApp (Evolution API).
          </p>
        )}
        <Aviso>{erro}</Aviso>
        <div className="form-acoes" style={{ marginTop: 16 }}>
          <button className="botao" onClick={testar} disabled={testando || salvando}><Icone nome="enviar" tamanho={16} /> {testando ? "Enviando…" : "Salvar e enviar teste"}</button>
          <button className="botao botao-primario sem-giro" onClick={() => salvar(montar())} disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</button>
        </div>
        {resultadoTeste?.resultados && (
          <ul className="nota">
            {resultadoTeste.resultados.map((r, i) => (
              <li key={i}>{r.canal === "email" ? "E-mail" : "WhatsApp"} {r.destino ? `para ${r.destino}` : ""}: {r.sucesso ? "enviado" : `falhou (${r.detalhe})`}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="bloco">
        <div className="bloco-topo"><h2>Prévia da mensagem de hoje</h2></div>
        {previa ? <div className="mensagem-previa">{previa.texto.replace(/\*/g, "")}</div> : <Carregando linhas={2} />}
      </section>

      <section className="bloco">
        <div className="bloco-topo"><h2>Histórico de envios</h2></div>
        {historico && historico.length === 0 && <Vazio>Nenhum aviso enviado ainda.</Vazio>}
        {historico && historico.length > 0 && (
          <div className="tabela-rolagem">
            <table>
              <thead><tr><th>Data</th><th>Canal</th><th>Destino</th><th>Situação</th></tr></thead>
              <tbody>
                {historico.map((h) => (
                  <tr key={h.id}>
                    <td className="sem-quebra">{dataHoraBR(h.enviado_em)}</td>
                    <td>{h.canal === "email" ? "E-mail" : "WhatsApp"}</td>
                    <td>{h.destino || "-"}</td>
                    <td>{h.sucesso ? <span className="selo selo-ok">Enviado</span> : <span className="selo selo-perigo" title={h.detalhe}>Falhou</span>}</td>
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

function Usuarios() {
  const avisar = useAvisar();
  const { usuario } = useAuth();
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState("");
  const [editado, setEditado] = useState(null);

  const carregar = useCallback(() => {
    api("/usuarios").then(setLista).catch((e) => setErro(mensagemDeErro(e)));
  }, []);
  useEffect(carregar, [carregar]);

  return (
    <section className="bloco">
      <div className="bloco-topo">
        <h2>Usuários</h2>
        <button className="botao botao-primario" onClick={() => setEditado({})}><Icone nome="mais" tamanho={18} /> Novo usuário</button>
      </div>
      <p className="subtitulo" style={{ marginTop: 0, marginBottom: 14 }}>
        Atendentes registram vendas e entradas. Só administradores excluem medicamentos, estornam movimentações e mudam configurações.
      </p>
      <Aviso>{erro}</Aviso>
      {!lista && !erro && <Carregando />}
      {lista && (
        <div className="tabela-rolagem">
          <table>
            <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Situação</th><th></th></tr></thead>
            <tbody>
              {lista.map((u) => (
                <tr key={u.id} className={u.ativo ? "" : "linha-apagada"}>
                  <td><strong>{u.nome}</strong>{u.id === usuario.id && <span className="texto-fraco"> (você)</span>}</td>
                  <td>{u.email}</td>
                  <td>{u.perfil === "administrador" ? "Administrador" : "Atendente"}</td>
                  <td>{u.ativo ? <span className="selo selo-ok">Ativo</span> : <span className="selo selo-neutro">Desativado</span>}</td>
                  <td className="acoes-linha">
                    <button className="botao-icone" onClick={() => setEditado(u)} aria-label={`Editar ${u.nome}`} title="Editar"><Icone nome="lapis" tamanho={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editado && (
        <FormUsuario
          inicial={editado}
          proprio={editado.id === usuario.id}
          aoFechar={() => setEditado(null)}
          aoSalvar={() => { setEditado(null); avisar(editado.id ? "Usuário atualizado." : "Usuário criado."); carregar(); }}
        />
      )}
    </section>
  );
}

function FormUsuario({ inicial, proprio, aoFechar, aoSalvar }) {
  const novo = !inicial.id;
  const [dados, setDados] = useState({
    nome: inicial.nome || "",
    email: inicial.email || "",
    perfil: inicial.perfil || "atendente",
    ativo: inicial.ativo ?? true,
    senha: "",
  });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const muda = (c) => (e) => setDados({ ...dados, [c]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      if (novo) await api("/usuarios", { method: "POST", body: { nome: dados.nome, email: dados.email, perfil: dados.perfil, senha: dados.senha } });
      else await api(`/usuarios/${inicial.id}`, { method: "PUT", body: { nome: dados.nome, perfil: dados.perfil, ativo: dados.ativo, senha: dados.senha } });
      aoSalvar();
    } catch (err) {
      setErro(mensagemDeErro(err));
      setSalvando(false);
    }
  };

  return (
    <Modal titulo={novo ? "Novo usuário" : `Editar ${inicial.nome}`} aoFechar={aoFechar}>
      <form className="form" onSubmit={enviar}>
        <Campo rotulo="Nome *"><input value={dados.nome} onChange={muda("nome")} required autoFocus /></Campo>
        <Campo rotulo="E-mail *"><input type="email" value={dados.email} onChange={muda("email")} required disabled={!novo} /></Campo>
        <div className="form-grade">
          <Campo rotulo="Perfil">
            <select value={dados.perfil} onChange={muda("perfil")} disabled={proprio}>
              <option value="atendente">Atendente</option>
              <option value="administrador">Administrador</option>
            </select>
          </Campo>
          <Campo rotulo={novo ? "Senha *" : "Nova senha"} dica={novo ? "Pelo menos 8 caracteres." : "Deixe em branco para manter."}>
            <input type="password" value={dados.senha} onChange={muda("senha")} minLength={8} required={novo} autoComplete="new-password" />
          </Campo>
        </div>
        {!novo && !proprio && (
          <Interruptor ligado={dados.ativo} aoMudar={(v) => setDados({ ...dados, ativo: v })} rotulo={dados.ativo ? "Acesso ativo" : "Acesso desativado"} />
        )}
        <Aviso>{erro}</Aviso>
        <div className="form-acoes">
          <button type="button" className="botao" onClick={aoFechar}>Cancelar</button>
          <button className="botao botao-primario sem-giro" disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</button>
        </div>
      </form>
    </Modal>
  );
}

function Conta() {
  const { usuario } = useAuth();
  const avisar = useAvisar();
  const [dados, setDados] = useState({ senha_atual: "", nova_senha: "", confirmar: "" });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const muda = (c) => (e) => setDados({ ...dados, [c]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    setErro("");
    if (dados.nova_senha !== dados.confirmar) {
      setErro("A confirmação não confere com a nova senha.");
      return;
    }
    setSalvando(true);
    try {
      await api("/auth/senha", { method: "PUT", body: { senha_atual: dados.senha_atual, nova_senha: dados.nova_senha } });
      avisar("Senha alterada.");
      setDados({ senha_atual: "", nova_senha: "", confirmar: "" });
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <section className="bloco">
      <div className="bloco-topo"><h2>Minha conta</h2></div>
      <dl className="ficha" style={{ marginBottom: 20 }}>
        <div><dt>Nome</dt><dd>{usuario.nome}</dd></div>
        <div><dt>E-mail</dt><dd>{usuario.email}</dd></div>
        <div><dt>Perfil</dt><dd>{usuario.perfil === "administrador" ? "Administrador" : "Atendente"}</dd></div>
      </dl>
      <form className="form" onSubmit={enviar} style={{ maxWidth: 420 }}>
        <h3>Trocar senha</h3>
        <Campo rotulo="Senha atual"><input type="password" value={dados.senha_atual} onChange={muda("senha_atual")} required autoComplete="current-password" /></Campo>
        <Campo rotulo="Nova senha" dica="Pelo menos 8 caracteres."><input type="password" value={dados.nova_senha} onChange={muda("nova_senha")} minLength={8} required autoComplete="new-password" /></Campo>
        <Campo rotulo="Confirmar nova senha"><input type="password" value={dados.confirmar} onChange={muda("confirmar")} required autoComplete="new-password" /></Campo>
        <Aviso>{erro}</Aviso>
        <div className="form-acoes" style={{ justifyContent: "flex-start" }}>
          <button className="botao botao-primario sem-giro" disabled={salvando}>{salvando ? "Salvando…" : "Trocar senha"}</button>
        </div>
      </form>
    </section>
  );
}
