import { useState } from "react";

// Gráfico de colunas de uma série, com rótulo nas colunas e dica ao passar o mouse
export default function GraficoBarras({ dados, formatarValor, formatarRotulo, descricao, altura = 190 }) {
  const [ativo, setAtivo] = useState(null);
  const largura = 560;
  const margem = { topo: 26, base: 30, lado: 8 };
  const max = Math.max(...dados.map((d) => d.valor), 1);
  const passo = (largura - margem.lado * 2) / dados.length;
  const larguraBarra = Math.min(56, passo * 0.56);
  const areaAltura = altura - margem.topo - margem.base;
  const base = altura - margem.base;

  return (
    <div className="grafico">
      <svg viewBox={`0 0 ${largura} ${altura}`} role="img" aria-label={descricao} preserveAspectRatio="xMidYMid meet">
        <line x1={margem.lado} x2={largura - margem.lado} y1={base} y2={base} className="grafico-eixo" />
        {dados.map((d, i) => {
          const h = d.valor > 0 ? Math.max(3, (d.valor / max) * areaAltura) : 0;
          const x = margem.lado + passo * i + (passo - larguraBarra) / 2;
          const y = base - h;
          const r = Math.min(4, h / 2);
          return (
            <g key={d.chave} onMouseEnter={() => setAtivo(i)} onMouseLeave={() => setAtivo(null)} onFocus={() => setAtivo(i)} onBlur={() => setAtivo(null)} tabIndex={0}>
              {/* área de toque maior que a coluna */}
              <rect x={margem.lado + passo * i} y={margem.topo - 10} width={passo} height={areaAltura + 10} fill="transparent" />
              {h > 0 && (
                <path
                  className={`grafico-barra ${ativo === i ? "ativa" : ""}`}
                  d={`M${x},${base} V${y + r} Q${x},${y} ${x + r},${y} H${x + larguraBarra - r} Q${x + larguraBarra},${y} ${x + larguraBarra},${y + r} V${base} Z`}
                />
              )}
              {d.valor > 0 && (
                <text x={x + larguraBarra / 2} y={y - 7} textAnchor="middle" className="grafico-valor">{formatarValor(d.valor, true)}</text>
              )}
              <text x={x + larguraBarra / 2} y={base + 19} textAnchor="middle" className="grafico-rotulo">{formatarRotulo(d)}</text>
            </g>
          );
        })}
      </svg>
      {ativo !== null && (
        <div className="grafico-dica" style={{ left: `${((margem.lado + passo * ativo + passo / 2) / largura) * 100}%` }}>
          <strong>{formatarRotulo(dados[ativo], true)}</strong>
          <span>{formatarValor(dados[ativo].valor)}</span>
          {dados[ativo].detalhe && <span className="texto-fraco">{dados[ativo].detalhe}</span>}
        </div>
      )}
    </div>
  );
}
