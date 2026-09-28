import { useEffect } from "react";
import { situacaoValidade } from "../format.js";

// Ícones simples em SVG (sem dependências externas)
const CAMINHOS = {
  painel: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
  pilula: "M4.22 11.29l7.07-7.07a5 5 0 017.07 7.07l-7.07 7.07a5 5 0 01-7.07-7.07zm1.41 1.42a3 3 0 004.24 4.24l3.54-3.54-4.24-4.24-3.54 3.54z",
  setas: "M7 7h11l-3-3 1.4-1.4L21.8 8l-5.4 5.4L15 12l3-3H7V7zm10 10H6l3 3-1.4 1.4L2.2 16l5.4-5.4L9 12l-3 3h11v2z",
  grafico: "M5 9h3v10H5V9zm5.5-4h3v14h-3V5zM16 13h3v6h-3v-6z",
  menu: "M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z",
  sino: "M12 22a2 2 0 002-2h-4a2 2 0 002 2zm6-6V11a6 6 0 00-5-5.9V4a1 1 0 10-2 0v1.1A6 6 0 006 11v5l-2 2v1h16v-1l-2-2z",
  caixa: "M20 7l-8-4-8 4v10l8 4 8-4V7zm-8 11.8l-6-3V9.2l6 3v6.6zm1-8.4L7.2 7.5 12 5.1l4.8 2.4L13 10.4z",
  alerta: "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",
  dinheiro: "M11.8 10.9c-2.3-.6-3-1.2-3-2.1 0-1.1 1-1.9 2.7-1.9 1.8 0 2.4.8 2.5 2.1h2.2c-.1-1.7-1.1-3.3-3.2-3.8V3h-3v2.2c-1.9.4-3.5 1.7-3.5 3.6 0 2.3 1.9 3.5 4.7 4.1 2.5.6 3 1.5 3 2.4 0 .7-.5 1.8-2.7 1.8-2.1 0-2.9-.9-3-2.1H5.3c.1 2.2 1.8 3.5 3.7 3.9V21h3v-2.1c1.9-.4 3.5-1.5 3.5-3.6 0-2.8-2.4-3.8-4.7-4.4z",
  mais: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
  fechar: "M19 6.4L17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z",
  baixar: "M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z",
  voltar: "M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20v-2z",
};

export function Icone({ nome, tamanho = 20 }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={CAMINHOS[nome]} />
    </svg>
  );
}

export function SeloValidade({ dias }) {
  const s = situacaoValidade(dias);
  return <span className={`selo selo-${s.classe}`}>{s.rotulo}</span>;
}

export function Selo({ classe = "neutro", children }) {
  return <span className={`selo selo-${classe}`}>{children}</span>;
}

export function Modal({ titulo, aoFechar, children }) {
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && aoFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aoFechar]);

  return (
    <div className="modal-fundo" onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="modal-topo">
          <h2>{titulo}</h2>
          <button className="botao-icone" onClick={aoFechar} aria-label="Fechar">
            <Icone nome="fechar" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Campo({ rotulo, dica, children }) {
  return (
    <label className="campo">
      <span className="campo-rotulo">{rotulo}</span>
      {children}
      {dica && <span className="campo-dica">{dica}</span>}
    </label>
  );
}

export function Aviso({ tipo = "erro", children }) {
  if (!children) return null;
  return <div className={`aviso aviso-${tipo}`} role={tipo === "erro" ? "alert" : "status"}>{children}</div>;
}

export function Vazio({ children }) {
  return <div className="vazio">{children}</div>;
}

export function Cartao({ icone, rotulo, valor, detalhe, tom = "padrao" }) {
  return (
    <div className={`cartao-indicador tom-${tom}`}>
      <div className="cartao-icone"><Icone nome={icone} /></div>
      <div>
        <div className="cartao-valor">{valor}</div>
        <div className="cartao-rotulo">{rotulo}</div>
        {detalhe && <div className="cartao-detalhe">{detalhe}</div>}
      </div>
    </div>
  );
}
