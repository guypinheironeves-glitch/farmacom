import { useEffect, useState } from "react";
import { MarcaIcone } from "./Logo.jsx";
import { numero, situacaoValidade } from "../format.js";
import { ROTULO_TARJA_CURTO, ROTULO_TIPO, rotuloControle } from "../catalogo.js";

const CAMINHOS = {
  painel: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
  pilula: "M4.22 11.29l7.07-7.07a5 5 0 017.07 7.07l-7.07 7.07a5 5 0 01-7.07-7.07zm1.41 1.42a3 3 0 004.24 4.24l3.54-3.54-4.24-4.24-3.54 3.54z",
  setas: "M7 7h11l-3-3 1.4-1.4L21.8 8l-5.4 5.4L15 12l3-3H7V7zm10 10H6l3 3-1.4 1.4L2.2 16l5.4-5.4L9 12l-3 3h11v2z",
  grafico: "M5 9h3v10H5V9zm5.5-4h3v14h-3V5zM16 13h3v6h-3v-6z",
  menu: "M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z",
  sino: "M12 22a2 2 0 002-2h-4a2 2 0 002 2zm6-6V11a6 6 0 00-5-5.9V4a1 1 0 10-2 0v1.1A6 6 0 006 11v5l-2 2v1h16v-1l-2-2z",
  caixa: "M20 7l-8-4-8 4v10l8 4 8-4V7zm-8 11.8l-6-3V9.2l6 3v6.6zm1-8.4L7.2 7.5 12 5.1l4.8 2.4L13 10.4z",
  alerta: "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",
  carrinho: "M7 18a2 2 0 100 4 2 2 0 000-4zm10 0a2 2 0 100 4 2 2 0 000-4zM7.2 14.8h9.3c.8 0 1.4-.4 1.8-1l3.5-6.4L20 6.4l-3.5 6.4H8.1L4.3 4H1v2h2l3.6 7.6-1.3 2.5C4.6 17.4 5.6 19 7 19h12v-2H7l1.1-2.2z",
  mais: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
  fechar: "M19 6.4L17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z",
  baixar: "M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z",
  voltar: "M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20v-2z",
  floco: "M22 11h-4.2l3.2-3.2-1.4-1.4L15 11h-2V9l4.6-4.6-1.4-1.4L13 6.2V2h-2v4.2L7.8 3 6.4 4.4 11 9v2H9L4.4 6.4 3 7.8 6.2 11H2v2h4.2L3 16.2l1.4 1.4L9 13h2v2l-4.6 4.6L7.8 21l3.2-3.2V22h2v-4.2l3.2 3.2 1.4-1.4L13 15v-2h2l4.6 4.6 1.4-1.4-3.2-3.2H22v-2z",
  receita: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
  relogio: "M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z",
  moeda: "M11.8 10.9c-2.3-.6-3-1.2-3-2.1 0-1.1 1-1.9 2.7-1.9 1.8 0 2.4.8 2.5 2.1h2.2c-.1-1.7-1.1-3.3-3.2-3.8V3h-3v2.2c-1.9.4-3.5 1.7-3.5 3.6 0 2.3 1.9 3.5 4.7 4.1 2.5.6 3 1.5 3 2.4 0 .7-.5 1.8-2.7 1.8-2.1 0-2.9-.9-3-2.1H5.3c.1 2.2 1.8 3.5 3.7 3.9V21h3v-2.1c1.9-.4 3.5-1.5 3.5-3.6 0-2.8-2.4-3.8-4.7-4.4z",
  nota: "M18 17H6v-2h12v2zm0-4H6v-2h12v2zm0-4H6V7h12v2zM3 22l1.5-1.5L6 22l1.5-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l1.5-1.5L18 22l1.5-1.5L21 22V2l-1.5 1.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2 4.5 3.5 3 2v20z",
  caminhao: "M20 8h-3V4H3a2 2 0 00-2 2v11h2a3 3 0 006 0h6a3 3 0 006 0h2v-5l-3-4zM6 18.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm13.5-9l1.96 2.5H17V9.5h2.5zM18 18.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z",
  engrenagem: "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 00-.48-.41h-3.84a.47.47 0 00-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 00-.59.22L2.74 8.87a.47.47 0 00.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.47.47 0 00-.12-.61l-2.01-1.58zM12 15.6a3.6 3.6 0 110-7.2 3.6 3.6 0 010 7.2z",
  sol: "M12 7a5 5 0 100 10 5 5 0 000-10zM11 1h2v3h-2V1zm0 19h2v3h-2v-3zM1 11h3v2H1v-2zm19 0h3v2h-3v-2zM4.22 5.64l1.42-1.42 2.12 2.12-1.42 1.42-2.12-2.12zm12.02 12.02l1.42-1.42 2.12 2.12-1.42 1.42-2.12-2.12zM18.36 4.22l1.42 1.42-2.12 2.12-1.42-1.42 2.12-2.12zM6.34 16.24l1.42 1.42-2.12 2.12-1.42-1.42 2.12-2.12z",
  lua: "M12.3 22A10 10 0 0110.4 2.2a8 8 0 0011.4 11.4A10 10 0 0112.3 22z",
  estrela: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z",
  amanhecer: "M3 18h18v2H3v-2zm9-9a6 6 0 016 6H6a6 6 0 016-6zm-1-6h2v3h-2V3zM4.22 6.64l1.42-1.42 2.12 2.12-1.42 1.42-2.12-2.12zm12.02.7l2.12-2.12 1.42 1.42-2.12 2.12-1.42-1.42z",
  sair: "M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4a2 2 0 00-2 2v14a2 2 0 002 2h8v-2H4V5z",
  confirmar: "M12 2a10 10 0 100 20 10 10 0 000-20zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z",
  upload: "M5 20h14v-2H5v2zm0-10h4v6h6v-6h4l-7-7-7 7z",
  pdf: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 7V3.5L18.5 9H13zm-1 10l-4-4h2.5v-4h3v4H16l-4 4z",
  desfazer: "M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62A7.95 7.95 0 0112.5 10c3.54 0 6.55 2.31 7.6 5.5l2.37-.78A10.02 10.02 0 0012.5 8z",
  prancheta: "M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-7 0a1 1 0 110 2 1 1 0 010-2zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z",
  lapis: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
  lixeira: "M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
  pessoas: "M16 11a3 3 0 100-6 3 3 0 000 6zm-8 0a3 3 0 100-6 3 3 0 000 6zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
  cadeado: "M18 8h-1V6A5 5 0 007 6v2H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V10a2 2 0 00-2-2zm-6 9a2 2 0 110-4 2 2 0 010 4zm3.1-9H8.9V6a3.1 3.1 0 016.2 0v2z",
  paleta: "M12 3a9 9 0 000 18c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16a5 5 0 005-5c0-4.42-4.03-8-9-8zm-5.5 9a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm3-4a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm5 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm3 4a1.5 1.5 0 110-3 1.5 1.5 0 010 3z",
  loja: "M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z",
  enviar: "M2.01 21L23 12 2.01 3 2 10l15 2-15 2z",
  olho: "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17a5 5 0 110-10 5 5 0 010 10zm0-8a3 3 0 100 6 3 3 0 000-6z",
  olhoFechado: "M12 7a5 5 0 014.64 6.86l2.92 2.92A11.82 11.82 0 0023 12c-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.8 11.8 0 001 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55A2.82 2.82 0 009 12a3 3 0 003 3c.22 0 .44-.03.65-.08l1.55 1.55A4.97 4.97 0 017 12c0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16a3 3 0 00-3-3l-.17.01z",
  mensagem: "M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z",
  email: "M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z",
  escudo: "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z",
  local: "M12 2a7 7 0 00-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 00-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z",
  busca: "M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0a4.5 4.5 0 110-9 4.5 4.5 0 010 9z",
};

export function Icone({ nome, tamanho = 20, titulo, className }) {
  return (
    <svg className={className} width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="currentColor" aria-hidden={titulo ? undefined : "true"} role={titulo ? "img" : undefined}>
      {titulo && <title>{titulo}</title>}
      <path d={CAMINHOS[nome]} />
    </svg>
  );
}

export function SeloValidade({ dias }) {
  const s = situacaoValidade(dias);
  return <span className={`selo selo-${s.classe}`}>{s.rotulo}</span>;
}

export function Selo({ classe = "neutro", children, titulo }) {
  return <span className={`selo selo-${classe}`} title={titulo}>{children}</span>;
}

export function FaixaTarja({ tarja }) {
  return <span className={`faixa-tarja faixa-${tarja}`} title={ROTULO_TARJA_CURTO[tarja]} aria-label={`Tarja: ${ROTULO_TARJA_CURTO[tarja]}`} />;
}

export function SelosRegulatorios({ med, compacto = false }) {
  return (
    <span className="selos">
      {med.tipo === "generico" ? (
        <span className="selo-generico" title="Medicamento genérico">G</span>
      ) : (
        !compacto && <Selo classe="neutro">{ROTULO_TIPO[med.tipo]}</Selo>
      )}
      {med.controle_especial && (
        <Selo classe={med.controle_especial === "antimicrobiano" ? "atm" : "controle"} titulo="Exige retenção de receita">
          {compacto && med.controle_especial === "antimicrobiano" ? "ATM" : rotuloControle(med.controle_especial)}
        </Selo>
      )}
      {med.refrigerado && (
        <span className="selo selo-frio" title="Armazenar entre 2 °C e 8 °C">
          <Icone nome="floco" tamanho={13} /> {compacto ? "" : "2 a 8 °C"}
        </span>
      )}
    </span>
  );
}

export function Modal({ titulo, aoFechar, children, largo = false }) {
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && aoFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aoFechar]);

  return (
    <div className="modal-fundo" onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className={`modal ${largo ? "modal-largo" : ""}`} role="dialog" aria-modal="true" aria-label={titulo}>
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

export function Campo({ rotulo, dica, children, largura }) {
  return (
    <label className="campo" style={largura ? { gridColumn: `span ${largura}` } : undefined}>
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
  return (
    <div className="vazio">
      <MarcaIcone tamanho={40} className="marca-apagada" />
      <div>{children}</div>
    </div>
  );
}

export function Interruptor({ ligado, aoMudar, rotulo, desativado }) {
  return (
    <label className={`interruptor ${desativado ? "desativado" : ""}`}>
      <input type="checkbox" role="switch" checked={ligado} disabled={desativado} onChange={(e) => aoMudar(e.target.checked)} />
      <span className="interruptor-trilho" aria-hidden="true"><span /></span>
      {rotulo && <span>{rotulo}</span>}
    </label>
  );
}

const semMovimento = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function Contador({ valor, formatar = numero, duracao = 900 }) {
  const alvo = Number(valor) || 0;
  const [atual, setAtual] = useState(semMovimento() ? alvo : 0);

  useEffect(() => {
    if (semMovimento()) {
      setAtual(alvo);
      return undefined;
    }
    let inicio;
    let quadro;
    const de = 0;
    const passo = (t) => {
      inicio ??= t;
      const p = Math.min((t - inicio) / duracao, 1);
      setAtual(de + (alvo - de) * (1 - (1 - p) ** 3));
      if (p < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [alvo, duracao]);

  return <>{formatar(Number.isInteger(alvo) ? Math.round(atual) : atual)}</>;
}

export function Carregando({ linhas = 4 }) {
  return (
    <div className="carregando" aria-busy="true" aria-label="Carregando">
      {Array.from({ length: linhas }, (_, i) => <div key={i} className="carregando-linha" />)}
    </div>
  );
}
