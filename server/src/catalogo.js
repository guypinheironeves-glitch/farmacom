export const CATEGORIAS = [
  "Analgésicos e antitérmicos",
  "Anti-inflamatórios",
  "Anti-hipertensivos e cardiovasculares",
  "Antidiabéticos",
  "Hipolipemiantes",
  "Antibióticos",
  "Antifúngicos",
  "Antiparasitários",
  "Antialérgicos",
  "Gastrointestinais",
  "Respiratórios",
  "Ansiolíticos e hipnóticos",
  "Antidepressivos",
  "Anticonvulsivantes e antipsicóticos",
  "Hormônios e contraceptivos",
  "Vitaminas e minerais",
  "Dermatológicos",
  "Soluções e hidratação",
  "Urológicos",
];

export const TIPOS_MEDICAMENTO = {
  referencia: "Referência",
  generico: "Genérico",
  similar: "Similar",
};

export const TARJAS = {
  sem_tarja: "Sem tarja (isento de prescrição)",
  vermelha: "Tarja vermelha",
  vermelha_retencao: "Tarja vermelha com retenção de receita",
  preta: "Tarja preta",
};

export const CONTROLES = {
  antimicrobiano: { rotulo: "Antimicrobiano", receita: "Receita em 2 vias, retida", validadeDias: 10, exigeNumero: false },
  A1: { rotulo: "Lista A1 (entorpecentes)", receita: "Notificação de Receita A (amarela)", exigeNumero: true },
  A2: { rotulo: "Lista A2 (entorpecentes)", receita: "Notificação de Receita A (amarela)", exigeNumero: true },
  A3: { rotulo: "Lista A3 (psicotrópicos)", receita: "Notificação de Receita A (amarela)", exigeNumero: true },
  B1: { rotulo: "Lista B1 (psicotrópicos)", receita: "Notificação de Receita B (azul)", exigeNumero: true },
  B2: { rotulo: "Lista B2 (anorexígenos)", receita: "Notificação de Receita B2 (azul)", exigeNumero: true },
  C1: { rotulo: "Lista C1 (controle especial)", receita: "Receita de Controle Especial em 2 vias", exigeNumero: false },
  C2: { rotulo: "Lista C2 (retinoides)", receita: "Notificação de Receita Especial", exigeNumero: true },
  C4: { rotulo: "Lista C4 (antirretrovirais)", receita: "Receita de Controle Especial em 2 vias", exigeNumero: false },
  C5: { rotulo: "Lista C5 (anabolizantes)", receita: "Receita de Controle Especial em 2 vias", exigeNumero: false },
};

export const catalogo = {
  categorias: CATEGORIAS,
  tipos: TIPOS_MEDICAMENTO,
  tarjas: TARJAS,
  controles: Object.fromEntries(Object.entries(CONTROLES).map(([k, v]) => [k, { rotulo: v.rotulo, receita: v.receita }])),
};
