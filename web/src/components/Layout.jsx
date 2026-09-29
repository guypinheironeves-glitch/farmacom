import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../App.jsx";
import { useTema } from "../tema.js";
import { Icone } from "./ui.jsx";
import Logo from "./Logo.jsx";

const MENU = [
  { para: "/", rotulo: "Painel", icone: "painel", fim: true },
  { para: "/medicamentos", rotulo: "Medicamentos", icone: "pilula" },
  { para: "/movimentacoes", rotulo: "Movimentações", icone: "setas" },
  { para: "/entrada-nota", rotulo: "Entrada por nota", icone: "nota" },
  { para: "/fornecedores", rotulo: "Fornecedores", icone: "caminhao" },
  { para: "/relatorios", rotulo: "Relatórios", icone: "grafico" },
  { para: "/configuracoes", rotulo: "Configurações", icone: "engrenagem" },
];

export default function Layout() {
  const { usuario, sair, nomeFarmacia } = useAuth();
  const { modo, alternarModo } = useTema();
  const [menuAberto, setMenuAberto] = useState(false);
  const location = useLocation();
  const iniciais = (usuario?.nome || "?").split(" ").map((p) => p[0]).slice(0, 2).join("");

  return (
    <div className="app">
      <aside className={`lateral ${menuAberto ? "aberta" : ""}`}>
        <div className="lateral-marca">
          <Logo claro />
          {nomeFarmacia && <span className="lateral-farmacia">{nomeFarmacia}</span>}
        </div>
        <nav aria-label="Menu principal">
          {MENU.map((m) => (
            <NavLink key={m.para} to={m.para} end={m.fim} onClick={() => setMenuAberto(false)}>
              <Icone nome={m.icone} />
              {m.rotulo}
            </NavLink>
          ))}
        </nav>
        <button className="alternar-tema" onClick={alternarModo} aria-label={`Mudar para tema ${modo === "claro" ? "escuro" : "claro"}`}>
          <span className={`alternar-trilho ${modo}`}>
            <span className="alternar-bola"><Icone nome={modo === "claro" ? "sol" : "lua"} tamanho={14} /></span>
          </span>
          Tema {modo === "claro" ? "claro" : "escuro"}
        </button>
        <div className="usuario">
          <span className="usuario-avatar" aria-hidden="true">{iniciais}</span>
          <div>
            <div className="usuario-nome">{usuario?.nome}</div>
            <div className="usuario-perfil">{usuario?.perfil === "administrador" ? "Administrador" : "Atendente"}</div>
          </div>
          <button className="botao-icone sair" onClick={sair} aria-label="Sair" title="Sair">
            <Icone nome="sair" tamanho={18} />
          </button>
        </div>
      </aside>
      <div className="conteudo">
        <header className="topo-movel">
          <button className="botao-icone" aria-label="Abrir menu" aria-expanded={menuAberto} onClick={() => setMenuAberto((v) => !v)}>
            <Icone nome="menu" />
          </button>
          <Logo tamanho={28} claro />
          <button className="botao-icone" onClick={alternarModo} aria-label="Alternar tema"><Icone nome={modo === "claro" ? "lua" : "sol"} /></button>
        </header>
        <main key={location.pathname} className="pagina">
          <Outlet />
        </main>
      </div>
      {menuAberto && <div className="fundo-menu" onClick={() => setMenuAberto(false)} />}
    </div>
  );
}
