import { useState } from "react";
import { useAuth } from "../App.jsx";
import { mensagemDeErro } from "../api.js";
import { Aviso, Campo } from "../components/ui.jsx";

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
      <div className="login-lado">
        <div className="marca marca-grande">
          <span className="marca-icone" aria-hidden="true">+</span>
          <span>FarmaCom</span>
        </div>
        <p className="login-chamada">Controle de estoque e validade para farmácias de bairro.</p>
        <ul className="login-lista">
          <li>Cadastro de medicamentos por lote e validade</li>
          <li>Alertas de vencimento e de estoque baixo</li>
          <li>Relatórios de movimentação e de perdas</li>
        </ul>
      </div>
      <form className="login-caixa" onSubmit={enviar}>
        <h1>Entrar</h1>
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
          <strong>Acesso de demonstração</strong>
          <span>demo@farmacom.app · farmacom123</span>
          <button type="button" className="botao-link" onClick={() => { setEmail("demo@farmacom.app"); setSenha("farmacom123"); }}>
            Preencher
          </button>
        </div>
      </form>
    </div>
  );
}
