import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../App.jsx";
import { Icone } from "./ui.jsx";

const MENU = [
  { para: "/", rotulo: "Painel", icone: "painel", fim: true },
  { para: "/medicamentos", rotulo: "Medicamentos", icone: "pilula" },
  { para: "/movimentacoes", rotulo: "Movimentações", icone: "setas" },
  { para: "/relatorios", rotulo: "Relatórios", icone: "grafico" },
];

export default function Layout() {
  const { usuario, sair } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div className="app">
      <aside className={`lateral ${menuAberto ? "aberta" : ""}`}>
        <div className="marca">
          <span className="marca-icone" aria-hidden="true">+</span>
          <span>FarmaCom</span>
        </div>
        <nav>
          {MENU.map((m) => (
            <NavLink key={m.para} to={m.para} end={m.fim} onClick={() => setMenuAberto(false)}>
              <Icone nome={m.icone} />
              {m.rotulo}
            </NavLink>
          ))}
        </nav>
        <div className="usuario">
          <div className="usuario-nome">{usuario?.nome}</div>
          <button className="botao-link" onClick={sair}>Sair</button>
        </div>
      </aside>
      <div className="conteudo">
        <header className="topo-movel">
          <button className="botao-icone" aria-label="Abrir menu" onClick={() => setMenuAberto((v) => !v)}>
            <Icone nome="menu" />
          </button>
          <span className="marca-texto">FarmaCom</span>
        </header>
        <main>
          <Outlet />
        </main>
      </div>
      {menuAberto && <div className="fundo-menu" onClick={() => setMenuAberto(false)} />}
    </div>
  );
}
