// Marca do FarmaCom: uma caixa de medicamento com a cruz da farmácia e a faixa da tarja
export function MarcaIcone({ tamanho = 34, faixa = "#E8912D" }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 40 40" aria-hidden="true" className="marca-svg">
      <defs>
        <clipPath id="farmacom-caixa">
          <rect x="3" y="3" width="34" height="34" rx="9" />
        </clipPath>
      </defs>
      <g clipPath="url(#farmacom-caixa)">
        <rect x="3" y="3" width="34" height="34" fill="#14746F" />
        <rect x="3" y="29" width="34" height="8" fill={faixa} />
      </g>
      <path d="M17 8.5h6v5.5h5.5v6H23v5.5h-6V20h-5.5v-6H17z" fill="#fff" />
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
