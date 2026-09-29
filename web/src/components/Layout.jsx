import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../App.jsx";
import { Icone } from "./ui.jsx";
import Logo from "./Logo.jsx";

const MENU = [
  { para: "/", rotulo: "Painel", icone: "painel", fim: true },
  { para: "/medicamentos", rotulo: "Medicamentos", icone: "pilula" },
  { para: "/movimentacoes", rotulo: "Movimentações", icone: "setas" },
  { para: "/relatorios", rotulo: "Relatórios", icone: "grafico" },
];

export default function Layout() {
  const { usuario, sair } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);
  const iniciais = (usuario?.nome || "?").split(" ").map((p) => p[0]).slice(0, 2).join("");

  return (
    <div className="app">
      <aside className={`lateral ${menuAberto ? "aberta" : ""}`}>
        <div className="lateral-marca"><Logo claro /></div>
        <nav aria-label="Menu principal">
          {MENU.map((m) => (
            <NavLink key={m.para} to={m.para} end={m.fim} onClick={() => setMenuAberto(false)}>
              <Icone nome={m.icone} />
              {m.rotulo}
            </NavLink>
          ))}
        </nav>
        <div className="usuario">
          <span className="usuario-avatar" aria-hidden="true">{iniciais}</span>
          <div>
            <div className="usuario-nome">{usuario?.nome}</div>
            <button className="botao-link" onClick={sair}>Sair</button>
          </div>
        </div>
      </aside>
      <div className="conteudo">
        <header className="topo-movel">
          <button className="botao-icone" aria-label="Abrir menu" aria-expanded={menuAberto} onClick={() => setMenuAberto((v) => !v)}>
            <Icone nome="menu" />
          </button>
          <Logo tamanho={28} claro />
        </header>
        <main>
          <Outlet />
        </main>
      </div>
      {menuAberto && <div className="fundo-menu" onClick={() => setMenuAberto(false)} />}
    </div>
  );
}
