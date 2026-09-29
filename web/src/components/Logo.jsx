export function MarcaIcone({ tamanho = 34, className = "" }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 48 48" aria-hidden="true" className={`marca-svg ${className}`}>
      <rect x="2" y="2" width="44" height="44" rx="13" className="marca-fundo" />
      <path d="M17 8h8v9h9v8h-9v9h-8v-9H8v-8h9z" className="marca-cruz" />
      <g className="marca-capsula">
        <g transform="rotate(-45 34 34)">
          <rect x="24" y="28.5" width="20" height="11" rx="5.5" className="marca-capsula-contorno" />
          <path d="M29.5 29.5H34v9h-4.5a4.5 4.5 0 0 1 0-9z" className="marca-capsula-metade" />
          <path d="M34 29.5h4.5a4.5 4.5 0 0 1 0 9H34z" className="marca-capsula-outra" />
        </g>
      </g>
    </svg>
  );
}

export default function Logo({ tamanho = 34, claro = false }) {
  return (
    <span className={`logo ${claro ? "logo-claro" : ""}`}>
      <MarcaIcone tamanho={tamanho} />
      <span className="logo-texto">
        Farma<span>Com</span>
      </span>
    </span>
  );
}
