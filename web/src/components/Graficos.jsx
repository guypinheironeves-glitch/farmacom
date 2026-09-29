import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";

const CORES_CATEGORIAS = ["var(--cat-1)", "var(--cat-2)", "var(--cat-3)", "var(--cat-4)", "var(--cat-5)"];

function Dica({ x, children }) {
  return <div className="grafico-dica" style={{ left: `${x}%` }}>{children}</div>;
}

function useLargura(padrao) {
  const ref = useRef(null);
  const [largura, setLargura] = useState(padrao);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const obs = new ResizeObserver(([e]) => e.contentRect.width && setLargura(Math.max(260, Math.round(e.contentRect.width))));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, largura];
}

function escalaBonita(max) {
  if (max <= 0) return 1;
  const potencia = 10 ** Math.floor(Math.log10(max));
  const passo = [1, 2, 2.5, 5, 10].find((p) => p * potencia * 4 >= max) * potencia;
  return passo * 4;
}

export function GraficoColunas({ dados, formatarValor, descricao, altura: alturaMax = 200 }) {
  const [ativo, setAtivo] = useState(null);
  const [caixa, largura] = useLargura(560);
  const altura = Math.min(alturaMax, Math.round(largura * 0.7));
  const m = { topo: 26, base: 30, lado: 8 };
  const max = Math.max(...dados.map((d) => d.valor), 1);
  const passo = (largura - m.lado * 2) / dados.length;
  const larguraBarra = Math.min(56, passo * 0.56);
  const areaAltura = altura - m.topo - m.base;
  const base = altura - m.base;

  return (
    <div className="grafico" ref={caixa}>
      <svg viewBox={`0 0 ${largura} ${altura}`} role="img" aria-label={descricao}>
        <line x1={m.lado} x2={largura - m.lado} y1={base} y2={base} className="grafico-eixo" />
        {dados.map((d, i) => {
          const h = d.valor > 0 ? Math.max(3, (d.valor / max) * areaAltura) : 0;
          const x = m.lado + passo * i + (passo - larguraBarra) / 2;
          const y = base - h;
          const r = Math.min(5, h / 2);
          return (
            <g key={d.chave} tabIndex={0} onMouseEnter={() => setAtivo(i)} onMouseLeave={() => setAtivo(null)} onFocus={() => setAtivo(i)} onBlur={() => setAtivo(null)}>
              <rect x={m.lado + passo * i} y={m.topo - 10} width={passo} height={areaAltura + 10} fill="transparent" />
              {h > 0 && (
                <path
                  className={`grafico-barra ${ativo === i ? "ativa" : ""}`}
                  style={{ animationDelay: `${i * 70}ms` }}
                  d={`M${x},${base} V${y + r} Q${x},${y} ${x + r},${y} H${x + larguraBarra - r} Q${x + larguraBarra},${y} ${x + larguraBarra},${y + r} V${base} Z`}
                />
              )}
              {d.valor > 0 && (
                <text x={x + larguraBarra / 2} y={y - 7} textAnchor="middle" className="grafico-valor">{formatarValor(d.valor, true)}</text>
              )}
              <text x={x + larguraBarra / 2} y={base + 19} textAnchor="middle" className="grafico-rotulo">{d.rotulo}</text>
            </g>
          );
        })}
      </svg>
      {ativo !== null && (
        <Dica x={((m.lado + passo * ativo + passo / 2) / largura) * 100}>
          <strong>{dados[ativo].rotuloLongo || dados[ativo].rotulo}</strong>
          <span>{formatarValor(dados[ativo].valor)}</span>
          {dados[ativo].detalhe && <span className="texto-fraco">{dados[ativo].detalhe}</span>}
        </Dica>
      )}
    </div>
  );
}

export function GraficoArea({ dados, formatarValor, formatarEixo = formatarValor, descricao, altura: alturaMax = 230 }) {
  const [ativo, setAtivo] = useState(null);
  const ref = useRef(null);
  const [caixa, largura] = useLargura(640);
  const altura = Math.min(alturaMax, Math.round(largura * 0.75));
  const m = { topo: 16, base: 28, esquerda: 54, direita: 10 };
  const topo = escalaBonita(Math.max(...dados.map((d) => d.valor), 0));
  const w = largura - m.esquerda - m.direita;
  const h = altura - m.topo - m.base;
  const x = (i) => m.esquerda + (dados.length > 1 ? (i / (dados.length - 1)) * w : w / 2);
  const y = (v) => m.topo + h - (v / topo) * h;
  const linha = dados.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.valor).toFixed(1)}`).join(" ");
  const area = `${linha} L${x(dados.length - 1)},${m.topo + h} L${x(0)},${m.topo + h} Z`;
  const marcas = [0, 0.25, 0.5, 0.75, 1].map((f) => topo * f);
  const intervalo = Math.ceil(dados.length / Math.max(3, Math.floor(w / 80)));

  const mover = (e) => {
    const caixa = ref.current.getBoundingClientRect();
    const px = ((e.clientX - caixa.left) / caixa.width) * largura;
    const i = Math.round(((px - m.esquerda) / w) * (dados.length - 1));
    setAtivo(Math.max(0, Math.min(dados.length - 1, i)));
  };
  const teclado = (e) => {
    if (e.key === "ArrowRight") setAtivo((a) => Math.min(dados.length - 1, (a ?? -1) + 1));
    if (e.key === "ArrowLeft") setAtivo((a) => Math.max(0, (a ?? dados.length) - 1));
  };

  return (
    <div className="grafico" ref={caixa}>
      <svg ref={ref} viewBox={`0 0 ${largura} ${altura}`} role="img" aria-label={descricao} tabIndex={0} onKeyDown={teclado} onBlur={() => setAtivo(null)}>
        <defs>
          <linearGradient id="area-gradiente" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" className="grafico-area-parada-1" />
            <stop offset="100%" className="grafico-area-parada-2" />
          </linearGradient>
        </defs>
        {marcas.map((v) => (
          <g key={v}>
            <line x1={m.esquerda} x2={largura - m.direita} y1={y(v)} y2={y(v)} className={v === 0 ? "grafico-eixo" : "grafico-grade"} />
            <text x={m.esquerda - 8} y={y(v) + 4} textAnchor="end" className="grafico-rotulo">{formatarEixo(v)}</text>
          </g>
        ))}
        {dados.map((d, i) =>
          i % intervalo === 0 || i === dados.length - 1 ? (
            <text key={d.chave} x={x(i)} y={altura - 8} textAnchor="middle" className="grafico-rotulo">{d.rotulo}</text>
          ) : null
        )}
        <path d={area} className="grafico-area" />
        <path d={linha} className="grafico-linha" pathLength={1} />
        {ativo !== null && (
          <g>
            <line x1={x(ativo)} x2={x(ativo)} y1={m.topo} y2={m.topo + h} className="grafico-mira" />
            <circle cx={x(ativo)} cy={y(dados[ativo].valor)} r={5} className="grafico-ponto" />
          </g>
        )}
        <rect x={m.esquerda} y={m.topo} width={w} height={h} className="grafico-captura" onMouseMove={mover} onMouseLeave={() => setAtivo(null)} />
      </svg>
      {ativo !== null && (
        <Dica x={(x(ativo) / largura) * 100}>
          <strong>{dados[ativo].rotuloLongo || dados[ativo].rotulo}</strong>
          <span>{formatarValor(dados[ativo].valor)}</span>
          {dados[ativo].detalhe && <span className="texto-fraco">{dados[ativo].detalhe}</span>}
        </Dica>
      )}
    </div>
  );
}

export function GraficoRosca({ dados, formatarValor, rotuloCentro, descricao }) {
  const [ativo, setAtivo] = useState(null);
  const total = dados.reduce((a, d) => a + d.valor, 0) || 1;
  const r = 70;
  const c = 2 * Math.PI * r;
  const folga = dados.length > 1 ? 2.5 : 0;
  let acumulado = 0;
  const fatias = dados.map((d, i) => {
    const comprimento = (d.valor / total) * c;
    const fatia = {
      ...d,
      cor: d.outros ? "var(--cat-outros)" : CORES_CATEGORIAS[i % CORES_CATEGORIAS.length],
      traco: Math.max(comprimento - folga, 0.5),
      deslocamento: -acumulado,
      pct: (d.valor / total) * 100,
    };
    acumulado += comprimento;
    return fatia;
  });
  const foco = ativo !== null ? fatias[ativo] : null;

  return (
    <div className="rosca">
      <svg viewBox="0 0 180 180" role="img" aria-label={descricao}>
        <g transform="rotate(-90 90 90)">
          {fatias.map((f, i) => (
            <circle
              key={f.rotulo}
              cx="90"
              cy="90"
              r={r}
              stroke={f.cor}
              strokeDasharray={`${f.traco} ${c - f.traco}`}
              strokeDashoffset={f.deslocamento}
              className={`rosca-fatia ${ativo === i ? "ativa" : ativo !== null ? "apagada" : ""}`}
              style={{ "--c": c, animationDelay: `${i * 90}ms` }}
              onMouseEnter={() => setAtivo(i)}
              onMouseLeave={() => setAtivo(null)}
            />
          ))}
        </g>
        <text x="90" y="88" textAnchor="middle" className="rosca-centro-valor">{foco ? `${Math.round(foco.pct)}%` : formatarValor(total, true)}</text>
        <text x="90" y="106" textAnchor="middle" className="rosca-centro-rotulo">{foco ? "do estoque" : rotuloCentro}</text>
      </svg>
      <ul className="legenda">
        {fatias.map((f, i) => (
          <li key={f.rotulo} className={ativo === i ? "ativa" : ""} onMouseEnter={() => setAtivo(i)} onMouseLeave={() => setAtivo(null)}>
            <span className="legenda-cor" style={{ background: f.cor }} />
            <span className="legenda-nome" title={f.rotulo}>{f.rotulo}</span>
            <span className="legenda-valor">{formatarValor(f.valor, true)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GraficoBarrasHorizontais({ dados, formatarValor }) {
  const max = Math.max(...dados.map((d) => d.valor), 1);
  return (
    <ul className="barras-h">
      {dados.map((d, i) => (
        <li key={d.chave}>
          <span className="barras-h-nome" title={d.rotulo}>{d.link ? <Link to={d.link}>{d.rotulo}</Link> : d.rotulo}</span>
          <span className="barras-h-trilho">
            <span style={{ width: `${(d.valor / max) * 100}%`, animationDelay: `${i * 60}ms` }} />
          </span>
          <span className="barras-h-valor">{formatarValor(d.valor)}</span>
        </li>
      ))}
    </ul>
  );
}

export function GraficoCurvaABC({ itens, descricao }) {
  const [ativo, setAtivo] = useState(null);
  const ref = useRef(null);
  const id = useId();
  const [caixa, largura] = useLargura(640);
  const altura = Math.min(320, Math.round(largura * 0.6));
  const m = { topo: 14, base: 30, esquerda: 44, direita: 12 };
  const w = largura - m.esquerda - m.direita;
  const h = altura - m.topo - m.base;
  const n = itens.length;
  const x = (i) => m.esquerda + (i / n) * w;
  const y = (v) => m.topo + h - (v / 100) * h;
  const pontos = [{ x: x(0), y: y(0) }, ...itens.map((it, i) => ({ x: x(i + 1), y: y(Number(it.acumulado)) }))];
  const linha = pontos.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const faixas = ["A", "B", "C"]
    .map((classe) => {
      const indices = itens.map((it, i) => (it.classe === classe ? i : -1)).filter((i) => i >= 0);
      if (!indices.length) return null;
      return { classe, de: x(indices[0]), ate: x(indices[indices.length - 1] + 1) };
    })
    .filter(Boolean);

  const mover = (e) => {
    const caixa = ref.current.getBoundingClientRect();
    const px = ((e.clientX - caixa.left) / caixa.width) * largura;
    setAtivo(Math.max(0, Math.min(n - 1, Math.floor(((px - m.esquerda) / w) * n))));
  };

  return (
    <div className="grafico" ref={caixa}>
      <svg ref={ref} viewBox={`0 0 ${largura} ${altura}`} role="img" aria-label={descricao}>
        <clipPath id={`${id}-area`}><rect x={m.esquerda} y={m.topo} width={w} height={h} /></clipPath>
        {faixas.map((f) => (
          <g key={f.classe}>
            <rect x={f.de} y={m.topo} width={Math.max(f.ate - f.de, 1)} height={h} className={`abc-faixa-${f.classe}`} />
            <text x={(f.de + f.ate) / 2} y={m.topo + h - 10} textAnchor="middle" className="abc-faixa-rotulo">{f.classe}</text>
          </g>
        ))}
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={m.esquerda} x2={largura - m.direita} y1={y(v)} y2={y(v)} className={v === 0 ? "grafico-eixo" : "grafico-grade"} />
            <text x={m.esquerda - 8} y={y(v) + 4} textAnchor="end" className="grafico-rotulo">{v}%</text>
          </g>
        ))}
        {[80, 95].map((v) => (
          <line key={v} x1={m.esquerda} x2={largura - m.direita} y1={y(v)} y2={y(v)} className="abc-referencia" />
        ))}
        {[["start", 0], ["middle", 0.5], ["end", 1]].map(([ancora, f]) => (
          <text key={f} x={m.esquerda + f * w} y={altura - 8} textAnchor={ancora} className="grafico-rotulo">{largura < 480 && f === 0.5 ? "" : `${Math.round(f * 100)}% dos itens`}</text>
        ))}
        <path d={linha} className="grafico-linha" pathLength={1} clipPath={`url(#${id}-area)`} />
        {ativo !== null && (
          <g>
            <line x1={pontos[ativo + 1].x} x2={pontos[ativo + 1].x} y1={m.topo} y2={m.topo + h} className="grafico-mira" />
            <circle cx={pontos[ativo + 1].x} cy={pontos[ativo + 1].y} r={5} className="grafico-ponto" />
          </g>
        )}
        <rect x={m.esquerda} y={m.topo} width={w} height={h} className="grafico-captura" onMouseMove={mover} onMouseLeave={() => setAtivo(null)} />
      </svg>
      {ativo !== null && (
        <Dica x={(pontos[ativo + 1].x / largura) * 100}>
          <strong>{ativo + 1}º {itens[ativo].medicamento}</strong>
          <span>Classe {itens[ativo].classe}, {Number(itens[ativo].acumulado).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% acumulado</span>
        </Dica>
      )}
    </div>
  );
}
