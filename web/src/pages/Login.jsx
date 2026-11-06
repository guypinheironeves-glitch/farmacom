import { useState } from "react";
import { useAuth } from "../App.jsx";
import { useTema } from "../tema.js";
import { mensagemDeErro } from "../api.js";
import { Aviso, Campo, Icone } from "../components/ui.jsx";
import Logo from "../components/Logo.jsx";

const DEMOS = [
  { rotulo: "Administrador", email: "demo@farmacom.app" },
  { rotulo: "Atendente", email: "atendente@farmacom.app" },
];

export default function Login() {
  const { entrar, nomeFarmacia } = useAuth();
  const { modo, alternarModo } = useTema();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

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
          <div>
            <h2 className="login-titulo">Entrar</h2>
            <p className="login-nota">{nomeFarmacia ? `Acesso da equipe da ${nomeFarmacia}.` : "Acesso da equipe da farmácia."}</p>
          </div>
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
