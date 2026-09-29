import { useEffect, useState } from "react";
import { useAuth } from "../App.jsx";
import { useTema } from "../tema.js";
import { mensagemDeErro } from "../api.js";
import { periodoDoDia, regiaoDoFuso } from "../format.js";
import { Aviso, Campo, Icone } from "../components/ui.jsx";
import Logo, { MarcaIcone } from "../components/Logo.jsx";

const DEMOS = [
  { rotulo: "Administrador", email: "demo@farmacom.app" },
  { rotulo: "Atendente", email: "atendente@farmacom.app" },
];

const FLUTUANTES = [
  { tipo: "marca", x: "8%", y: "12%", t: 70, dur: "16s", dx: "30px", dy: "40px", rot: "20deg" },
  { tipo: "cruz", x: "78%", y: "8%", t: 54, dur: "13s", atraso: "-3s", dx: "-24px", dy: "30px" },
  { tipo: "capsula", x: "85%", y: "58%", t: 80, dur: "18s", atraso: "-6s", dx: "-30px", dy: "-40px", rot: "-35deg" },
  { tipo: "cruz", x: "14%", y: "74%", t: 40, dur: "12s", atraso: "-2s", dx: "20px", dy: "-26px" },
  { tipo: "capsula", x: "46%", y: "86%", t: 56, dur: "15s", atraso: "-8s", dx: "26px", dy: "-20px", rot: "40deg" },
  { tipo: "marca", x: "62%", y: "32%", t: 34, dur: "20s", atraso: "-10s", dx: "-18px", dy: "24px" },
];

function Forma({ tipo, tamanho }) {
  if (tipo === "marca") return <MarcaIcone tamanho={tamanho} />;
  if (tipo === "cruz") {
    return (
      <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="currentColor"><path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" /></svg>
    );
  }
  return (
    <svg width={tamanho} height={tamanho / 2} viewBox="0 0 40 20" fill="currentColor"><rect width="40" height="20" rx="10" /></svg>
  );
}

function useAgora() {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return agora;
}

export default function Login() {
  const { entrar, nomeFarmacia } = useAuth();
  const { modo, alternarModo } = useTema();
  const agora = useAgora();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const periodo = periodoDoDia(agora.getHours());
  const dataTexto = agora.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const data = dataTexto.charAt(0).toUpperCase() + dataTexto.slice(1);
  const hora = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const enviar = async (e) => {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      await entrar(email, senha);
    } catch (err) {
      setErro(mensagemDeErro(err));
      setEnviando(false);
    }
  };

  return (
    <div className="tela-login">
      <section className="login-lado">
        <div className="login-ceu" aria-hidden="true">
          {FLUTUANTES.map((f, i) => (
            <span
              key={i}
              className="flutuante"
              style={{ left: f.x, top: f.y, "--dur": f.dur, "--atraso": f.atraso, "--dx": f.dx, "--dy": f.dy, "--rot": f.rot }}
            >
              <Forma tipo={f.tipo} tamanho={f.t} />
            </span>
          ))}
        </div>
        <Logo tamanho={48} claro />
        <h1 className="login-chamada">Saiba o que vence e o que acaba antes que vire prejuízo.</h1>
        <ul className="login-lista">
          <li><span className="login-faixa faixa-vermelha" />Lotes e validades de cada medicamento, com a venda sempre pelo lote que vence primeiro</li>
          <li><span className="login-faixa faixa-preta" />Receita obrigatória para controlados e antimicrobianos, com arquivo para o SNGPC</li>
          <li><span className="login-faixa faixa-amarela" />Entrada pela nota fiscal, avisos diários, curva ABC e relatórios em PDF</li>
        </ul>
        <p className="login-rodape">Projeto do Desafio Unifacisa, curso de Análise e Desenvolvimento de Sistemas</p>
      </section>

      <div className="login-direita">
        <div className="login-topo">
          <button type="button" className="botao-tema" onClick={alternarModo}>
            <Icone nome={modo === "claro" ? "lua" : "sol"} tamanho={16} />
            {modo === "claro" ? "Tema escuro" : "Tema claro"}
          </button>
        </div>
        <form className="login-caixa" onSubmit={enviar}>
          <div className={`saudacao periodo-${periodo.id}`}>
            <h2 className="saudacao-titulo">
              <span className="saudacao-icone" key={periodo.id}><Icone nome={periodo.icone} tamanho={26} /></span>
              {periodo.saudacao}!
            </h2>
            <div className="saudacao-info">
              <span>{data}</span>
              <span className="saudacao-relogio"><Icone nome="relogio" tamanho={15} />{hora}</span>
              <span><Icone nome="local" tamanho={15} />{regiaoDoFuso(agora)}</span>
            </div>
          </div>
          <p className="login-nota">Entre para acessar {nomeFarmacia || "o sistema da farmácia"}.</p>
          <Campo rotulo="E-mail">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required autoFocus />
          </Campo>
          <Campo rotulo="Senha">
            <span className="campo-senha">
              <input type={verSenha ? "text" : "password"} value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" required />
              <button type="button" className="botao-icone" onClick={() => setVerSenha((v) => !v)} aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}>
                <Icone nome={verSenha ? "olhoFechado" : "olho"} tamanho={18} />
              </button>
            </span>
          </Campo>
          <Aviso>{erro}</Aviso>
          <button className="botao botao-primario botao-largo sem-giro" disabled={enviando}>
            {enviando ? "Entrando…" : "Entrar"}
          </button>
          <div className="login-demo">
            <strong>Acesso de demonstração (senha farmacom123)</strong>
            {DEMOS.map((d) => (
              <div className="login-demo-linha" key={d.email}>
                <div>
                  <span>{d.rotulo}</span>
                  <span className="texto-fraco">{d.email}</span>
                </div>
                <button type="button" className="botao botao-pequeno" onClick={() => { setEmail(d.email); setSenha("farmacom123"); }}>
                  Preencher
                </button>
              </div>
            ))}
          </div>
          <p className="login-nota">Os dados da demonstração são de uma farmácia fictícia.</p>
        </form>
      </div>
    </div>
  );
}
