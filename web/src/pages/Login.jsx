import { useState } from "react";
import { useAuth } from "../App.jsx";
import { mensagemDeErro } from "../api.js";
import { Aviso, Campo } from "../components/ui.jsx";
import Logo from "../components/Logo.jsx";

export default function Login() {
  const { entrar } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
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
          <li><span className="login-faixa faixa-preta" />Receita obrigatória para controlados e antimicrobianos</li>
          <li><span className="login-faixa faixa-amarela" />Alertas, sugestão de compra, curva ABC e relatório de perdas</li>
        </ul>
        <p className="login-rodape">Projeto do Desafio Unifacisa, curso de Análise e Desenvolvimento de Sistemas</p>
      </section>
      <form className="login-caixa" onSubmit={enviar}>
        <h2>Entrar no sistema</h2>
        <Campo rotulo="E-mail">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required autoFocus />
        </Campo>
        <Campo rotulo="Senha">
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" required />
        </Campo>
        <Aviso>{erro}</Aviso>
        <button className="botao botao-primario botao-largo" disabled={enviando}>
          {enviando ? "Entrando…" : "Entrar"}
        </button>
        <div className="login-demo">
          <div>
            <strong>Acesso de demonstração</strong>
            <span>demo@farmacom.app, senha farmacom123</span>
          </div>
          <button type="button" className="botao botao-pequeno" onClick={() => { setEmail("demo@farmacom.app"); setSenha("farmacom123"); }}>
            Preencher
          </button>
        </div>
        <p className="login-nota">Os dados da demonstração são de uma farmácia fictícia.</p>
      </form>
    </div>
  );
}
