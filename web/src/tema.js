import { createContext, useCallback, useContext, useEffect, useState } from "react";

export const COR_PADRAO = "#14746F";
export const CORES_SUGERIDAS = ["#14746F", "#1F5FAD", "#6B3FA0", "#C2410C", "#B91C4B", "#15803D", "#0E7490", "#374151"];

function hexParaHsl(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [h, s * 100, l * 100];
}

function hslParaHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return `#${[f(0), f(8), f(4)].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

function luminancia(hex) {
  const n = parseInt(hex.slice(1), 16);
  const canal = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
}

const contraste = (a, b) => {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

export function paletaDestaque(cor, modo) {
  const [h, s, l] = hexParaHsl(cor);
  const base = modo === "escuro" ? hslParaHex(h, Math.min(s, 52), Math.min(Math.max(l, 42), 62)) : cor;
  const [, , lb] = hexParaHsl(base);
  const forte = hslParaHex(h, s, modo === "escuro" ? Math.min(lb + 8, 72) : Math.max(lb - 9, 12));
  const suave = modo === "escuro" ? hslParaHex(h, Math.min(s, 40), 20) : hslParaHex(h, Math.min(s, 45), 90);
  const texto = contraste(base, "#f5f5f5") >= 3.2 ? "#f5f5f5" : "#10201f";
  const lateral = modo === "escuro" ? hslParaHex(h, Math.min(s, 30), 8) : hslParaHex(h, Math.min(s, 55), 15);
  const lateral2 = modo === "escuro" ? hslParaHex(h, Math.min(s, 30), 14) : hslParaHex(h, Math.min(s, 50), 22);
  const lateralTexto = hslParaHex(h, Math.min(s, 30), 80);
  const superficie = modo === "escuro" ? "#182022" : "#f5f5f5";
  let link = base;
  for (let l2 = lb; contraste(link, superficie) < 4.5 && l2 > 5 && l2 < 95; ) {
    l2 += modo === "escuro" ? 3 : -3;
    link = hslParaHex(h, s, l2);
  }
  return { base, forte, suave, texto, lateral, lateral2, lateralTexto, link };
}

function modoInicial() {
  try {
    const salvo = localStorage.getItem("farmacom.tema");
    if (salvo === "claro" || salvo === "escuro") return salvo;
  } catch {
    /* sem armazenamento */
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "escuro" : "claro";
}

const TemaContext = createContext(null);
export const useTema = () => useContext(TemaContext);

export function useProvedorTema() {
  const [modo, setModo] = useState(modoInicial);
  const [cor, setCor] = useState(COR_PADRAO);

  useEffect(() => {
    const raiz = document.documentElement;
    const p = paletaDestaque(cor, modo);
    raiz.dataset.tema = modo;
    raiz.style.setProperty("--destaque", p.base);
    raiz.style.setProperty("--destaque-forte", p.forte);
    raiz.style.setProperty("--destaque-suave", p.suave);
    raiz.style.setProperty("--destaque-texto", p.texto);
    raiz.style.setProperty("--lateral", p.lateral);
    raiz.style.setProperty("--lateral-2", p.lateral2);
    raiz.style.setProperty("--lateral-texto", p.lateralTexto);
    raiz.style.setProperty("--destaque-link", p.link);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", p.lateral);
  }, [modo, cor]);

  const definirModo = useCallback((novo) => {
    setModo(novo);
    try {
      localStorage.setItem("farmacom.tema", novo);
    } catch {
      /* sem armazenamento */
    }
  }, []);

  const alternarModo = useCallback(() => definirModo(modo === "claro" ? "escuro" : "claro"), [modo, definirModo]);

  return { modo, alternarModo, definirModo, cor, setCor };
}

export { TemaContext };
