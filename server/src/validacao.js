const digitos = (v) => String(v || "").replace(/\D/g, "");

export function eanValido(codigo) {
  if (!/^\d{13}$/.test(codigo)) return false;
  const soma = codigo
    .slice(0, 12)
    .split("")
    .reduce((acc, d, i) => acc + Number(d) * (i % 2 ? 3 : 1), 0);
  return (10 - (soma % 10)) % 10 === Number(codigo[12]);
}

function digitoModulo11(base, pesos) {
  const soma = base.split("").reduce((acc, d, i) => acc + Number(d) * pesos[i], 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function cnpjValido(valor) {
  const c = digitos(valor);
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
  const p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const p2 = [6, ...p1];
  const d1 = digitoModulo11(c.slice(0, 12), p1);
  const d2 = digitoModulo11(c.slice(0, 12) + d1, p2);
  return c.endsWith(`${d1}${d2}`);
}

export function cpfValido(valor) {
  const c = digitos(valor);
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  const d1 = digitoModulo11(c.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = digitoModulo11(c.slice(0, 9) + d1, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return c.endsWith(`${d1}${d2}`);
}

export { digitos };
