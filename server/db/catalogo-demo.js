const AN = "Analgésicos e antitérmicos";
const AI = "Anti-inflamatórios";
const CV = "Anti-hipertensivos e cardiovasculares";
const DM = "Antidiabéticos";
const HL = "Hipolipemiantes";
const AB = "Antibióticos";
const AF = "Antifúngicos";
const AP = "Antiparasitários";
const AL = "Antialérgicos";
const GI = "Gastrointestinais";
const RE = "Respiratórios";
const AX = "Ansiolíticos e hipnóticos";
const AD = "Antidepressivos";
const AC = "Anticonvulsivantes e antipsicóticos";
const HO = "Hormônios e contraceptivos";
const VI = "Vitaminas e minerais";
const DE = "Dermatológicos";
const SO = "Soluções e hidratação";
const UR = "Urológicos";

const G = "generico", R = "referencia", S = "similar";
const ST = "sem_tarja", V = "vermelha", VR = "vermelha_retencao", P = "preta";
const ATM = "antimicrobiano";

export const CATALOGO_DEMO = [
  ["Dipirona sódica 500 mg", "Dipirona monoidratada", "EMS", "Caixa com 10 comprimidos", AN, G, ST, null, false, 8.9, 3.1, 40, 90, null],
  ["Dipirona sódica 500 mg/ml gotas", "Dipirona monoidratada", "Neo Química", "Frasco com 20 ml", AN, G, ST, null, false, 7.5, 2.6, 25, 55, "baixado"],
  ["Paracetamol 750 mg", "Paracetamol", "Medley", "Caixa com 20 comprimidos", AN, G, ST, null, false, 11.9, 4.2, 30, 70, null],
  ["Paracetamol 200 mg/ml gotas", "Paracetamol", "Prati-Donaduzzi", "Frasco com 15 ml", AN, G, ST, null, false, 9.8, 3.4, 15, 30, "vence30"],
  ["Dipirona + orfenadrina + cafeína", "Dipirona, citrato de orfenadrina, cafeína", "Neo Química", "Caixa com 10 comprimidos", AN, S, ST, null, false, 12.5, 5.1, 30, 80, null],
  ["Dipirona + isometepteno + cafeína", "Dipirona, mucato de isometepteno, cafeína", "Cimed", "Caixa com 20 comprimidos", AN, S, ST, null, false, 14.9, 6.0, 20, 45, null],
  ["Escopolamina + dipirona 10 mg/250 mg", "Butilbrometo de escopolamina, dipirona", "EMS", "Caixa com 20 comprimidos", AN, G, ST, null, false, 16.9, 6.8, 20, 40, "vence90"],

  ["Nimesulida 100 mg", "Nimesulida", "EMS", "Caixa com 12 comprimidos", AI, G, V, null, false, 9.9, 3.3, 25, 55, "baixado"],
  ["Ibuprofeno 400 mg", "Ibuprofeno", "Prati-Donaduzzi", "Caixa com 10 cápsulas", AI, G, ST, null, false, 13.9, 5.2, 20, 45, "vence30"],
  ["Ibuprofeno 600 mg", "Ibuprofeno", "Prati-Donaduzzi", "Caixa com 20 comprimidos", AI, G, V, null, false, 18.9, 7.4, 15, 25, null],
  ["Diclofenaco potássico 50 mg", "Diclofenaco potássico", "Medley", "Caixa com 20 comprimidos", AI, G, V, null, false, 12.9, 4.6, 15, 30, null],
  ["Diclofenaco dietilamônio gel 10 mg/g", "Diclofenaco dietilamônio", "Neo Química", "Bisnaga com 60 g", AI, G, ST, null, false, 19.9, 8.2, 10, 18, "vencido"],
  ["Prednisona 20 mg", "Prednisona", "Teuto", "Caixa com 10 comprimidos", AI, G, V, null, false, 10.9, 3.9, 15, 25, null],
  ["Dexametasona 4 mg", "Dexametasona", "Teuto", "Caixa com 10 comprimidos", AI, G, V, null, false, 9.5, 3.2, 10, 12, null],

  ["Losartana potássica 50 mg", "Losartana potássica", "Neo Química", "Caixa com 30 comprimidos", CV, G, V, null, false, 12.9, 4.1, 40, 110, null],
  ["Hidroclorotiazida 25 mg", "Hidroclorotiazida", "EMS", "Caixa com 30 comprimidos", CV, G, V, null, false, 7.9, 2.4, 30, 70, null],
  ["Enalapril 10 mg", "Maleato de enalapril", "Teuto", "Caixa com 30 comprimidos", CV, G, V, null, false, 9.9, 3.0, 25, 45, null],
  ["Captopril 25 mg", "Captopril", "Prati-Donaduzzi", "Caixa com 30 comprimidos", CV, G, V, null, false, 8.5, 2.7, 15, 20, null],
  ["Anlodipino 5 mg", "Besilato de anlodipino", "Medley", "Caixa com 30 comprimidos", CV, G, V, null, false, 11.9, 3.8, 25, 45, "vence90"],
  ["Atenolol 50 mg", "Atenolol", "Germed", "Caixa com 30 comprimidos", CV, G, V, null, false, 10.5, 3.4, 25, 40, null],
  ["Propranolol 40 mg", "Cloridrato de propranolol", "Germed", "Caixa com 30 comprimidos", CV, G, V, null, false, 6.9, 2.1, 15, 20, null],
  ["Furosemida 40 mg", "Furosemida", "Teuto", "Caixa com 20 comprimidos", CV, G, V, null, false, 6.5, 2.0, 10, 15, null],
  ["Espironolactona 25 mg", "Espironolactona", "EMS", "Caixa com 30 comprimidos", CV, G, V, null, false, 16.9, 6.2, 10, 12, null],
  ["Losartana + hidroclorotiazida 50/12,5 mg", "Losartana potássica, hidroclorotiazida", "EMS", "Caixa com 30 comprimidos", CV, G, V, null, false, 22.9, 8.5, 12, 15, "baixo"],

  ["Metformina 850 mg", "Cloridrato de metformina", "Prati-Donaduzzi", "Caixa com 30 comprimidos", DM, G, V, null, false, 9.9, 3.2, 30, 60, null],
  ["Metformina 500 mg liberação prolongada", "Cloridrato de metformina", "Merck", "Caixa com 30 comprimidos", DM, R, V, null, false, 24.9, 11.0, 20, 40, "baixo"],
  ["Glibenclamida 5 mg", "Glibenclamida", "Neo Química", "Caixa com 30 comprimidos", DM, G, V, null, false, 6.9, 2.0, 15, 20, null],
  ["Gliclazida 30 mg liberação modificada", "Gliclazida", "Medley", "Caixa com 30 comprimidos", DM, G, V, null, false, 19.9, 7.5, 10, 12, null],
  ["Insulina humana NPH 100 UI/ml", "Insulina humana isófana", "Novo Nordisk", "Frasco-ampola com 10 ml", DM, R, V, null, true, 59.9, 38.0, 6, 8, "vence30"],

  ["Sinvastatina 20 mg", "Sinvastatina", "Medley", "Caixa com 30 comprimidos", HL, G, V, null, false, 11.9, 3.6, 25, 45, null],
  ["Atorvastatina 20 mg", "Atorvastatina cálcica", "EMS", "Caixa com 30 comprimidos", HL, G, V, null, false, 29.9, 11.0, 15, 25, "baixo"],
  ["Rosuvastatina 10 mg", "Rosuvastatina cálcica", "Eurofarma", "Caixa com 30 comprimidos", HL, G, V, null, false, 34.9, 13.5, 10, 15, null],

  ["Amoxicilina 500 mg", "Amoxicilina tri-hidratada", "Eurofarma", "Caixa com 21 cápsulas", AB, G, VR, ATM, false, 24.9, 9.8, 15, 30, "baixado"],
  ["Amoxicilina + clavulanato 875/125 mg", "Amoxicilina, clavulanato de potássio", "EMS", "Caixa com 14 comprimidos", AB, G, VR, ATM, false, 69.9, 28.0, 8, 12, "baixo"],
  ["Azitromicina 500 mg", "Azitromicina di-hidratada", "Medley", "Caixa com 3 comprimidos", AB, G, VR, ATM, false, 22.9, 8.9, 12, 25, "vence30"],
  ["Cefalexina 500 mg", "Cefalexina monoidratada", "Teuto", "Caixa com 8 cápsulas", AB, G, VR, ATM, false, 19.9, 7.2, 10, 18, null],
  ["Ciprofloxacino 500 mg", "Cloridrato de ciprofloxacino", "Prati-Donaduzzi", "Caixa com 14 comprimidos", AB, G, VR, ATM, false, 26.9, 9.5, 8, 12, null],
  ["Sulfametoxazol + trimetoprima 400/80 mg", "Sulfametoxazol, trimetoprima", "Teuto", "Caixa com 20 comprimidos", AB, G, VR, ATM, false, 9.9, 3.5, 8, 10, null],
  ["Metronidazol 250 mg", "Metronidazol", "Prati-Donaduzzi", "Caixa com 20 comprimidos", AB, G, VR, ATM, false, 12.9, 4.4, 8, 10, null],
  ["Nitrofurantoína 100 mg", "Nitrofurantoína", "EMS", "Caixa com 28 cápsulas", AB, G, VR, ATM, false, 29.9, 11.0, 5, 6, null],

  ["Fluconazol 150 mg", "Fluconazol", "Medley", "Caixa com 1 cápsula", AF, G, V, null, false, 9.9, 2.9, 15, 30, null],
  ["Cetoconazol creme 20 mg/g", "Cetoconazol", "Prati-Donaduzzi", "Bisnaga com 30 g", AF, G, V, null, false, 14.9, 5.6, 8, 10, null],
  ["Nistatina + óxido de zinco pomada", "Nistatina, óxido de zinco", "Neo Química", "Bisnaga com 60 g", DE, G, ST, null, false, 13.9, 5.1, 10, 15, null],

  ["Albendazol 400 mg", "Albendazol", "Prati-Donaduzzi", "Caixa com 1 comprimido", AP, G, V, null, false, 7.9, 2.3, 15, 25, null],
  ["Ivermectina 6 mg", "Ivermectina", "Vitamedic", "Caixa com 4 comprimidos", AP, G, V, null, false, 14.9, 5.5, 10, 15, null],

  ["Loratadina 10 mg", "Loratadina", "Cimed", "Caixa com 12 comprimidos", AL, G, ST, null, false, 9.9, 3.1, 20, 45, "vence30"],
  ["Dexclorfeniramina 2 mg", "Maleato de dexclorfeniramina", "EMS", "Caixa com 20 comprimidos", AL, G, V, null, false, 11.9, 4.3, 10, 18, null],
  ["Desloratadina 5 mg", "Desloratadina", "Eurofarma", "Caixa com 10 comprimidos", AL, G, V, null, false, 21.9, 8.1, 8, 10, null],

  ["Omeprazol 20 mg", "Omeprazol", "Medley", "Caixa com 28 cápsulas", GI, G, V, null, false, 16.9, 5.9, 25, 50, "baixado"],
  ["Pantoprazol 40 mg", "Pantoprazol sódico sesqui-hidratado", "Eurofarma", "Caixa com 28 comprimidos", GI, G, V, null, false, 34.9, 12.9, 12, 20, null],
  ["Simeticona 40 mg", "Simeticona", "Medley", "Caixa com 20 comprimidos", GI, G, ST, null, false, 8.9, 2.8, 15, 30, null],
  ["Domperidona 10 mg", "Domperidona", "Medley", "Caixa com 30 comprimidos", GI, G, V, null, false, 18.9, 6.8, 8, 10, null],
  ["Ondansetrona 8 mg", "Cloridrato de ondansetrona", "EMS", "Caixa com 10 comprimidos", GI, G, V, null, false, 24.9, 9.4, 8, 10, null],

  ["Salbutamol aerossol 100 mcg", "Sulfato de salbutamol", "GSK", "Frasco com 200 doses", RE, R, V, null, false, 24.9, 12.0, 8, 12, null],
  ["Budesonida spray nasal 64 mcg", "Budesonida", "Aché", "Frasco com 120 doses", RE, S, V, null, false, 49.9, 22.0, 5, 6, null],
  ["Acetilcisteína 600 mg", "Acetilcisteína", "EMS", "Caixa com 16 envelopes", RE, G, ST, null, false, 34.9, 13.0, 8, 12, null],

  ["Clonazepam 2 mg", "Clonazepam", "EMS", "Caixa com 30 comprimidos", AX, G, P, "B1", false, 12.9, 4.2, 10, 25, null],
  ["Clonazepam 2,5 mg/ml gotas", "Clonazepam", "Germed", "Frasco com 20 ml", AX, G, P, "B1", false, 14.9, 5.2, 6, 10, "vence30"],
  ["Alprazolam 1 mg", "Alprazolam", "EMS", "Caixa com 30 comprimidos", AX, G, P, "B1", false, 29.9, 10.5, 6, 10, null],
  ["Diazepam 10 mg", "Diazepam", "Teuto", "Caixa com 20 comprimidos", AX, G, P, "B1", false, 8.9, 2.6, 6, 8, null],
  ["Zolpidem 10 mg", "Hemitartarato de zolpidem", "EMS", "Caixa com 20 comprimidos", AX, G, P, "B1", false, 39.9, 15.0, 5, 6, null],

  ["Sertralina 50 mg", "Cloridrato de sertralina", "EMS", "Caixa com 30 comprimidos", AD, G, VR, "C1", false, 24.9, 8.9, 10, 20, "baixo"],
  ["Fluoxetina 20 mg", "Cloridrato de fluoxetina", "Medley", "Caixa com 30 cápsulas", AD, G, VR, "C1", false, 17.9, 5.9, 10, 18, null],
  ["Escitalopram 10 mg", "Oxalato de escitalopram", "Eurofarma", "Caixa com 30 comprimidos", AD, G, VR, "C1", false, 39.9, 14.5, 8, 12, null],
  ["Amitriptilina 25 mg", "Cloridrato de amitriptilina", "Teuto", "Caixa com 30 comprimidos", AD, G, VR, "C1", false, 12.9, 4.1, 8, 12, null],

  ["Carbamazepina 200 mg", "Carbamazepina", "EMS", "Caixa com 20 comprimidos", AC, G, VR, "C1", false, 12.9, 4.3, 6, 8, null],
  ["Quetiapina 25 mg", "Hemifumarato de quetiapina", "Germed", "Caixa com 30 comprimidos", AC, G, VR, "C1", false, 29.9, 10.9, 6, 8, null],

  ["Levotiroxina sódica 50 mcg", "Levotiroxina sódica", "Merck", "Caixa com 30 comprimidos", HO, R, V, null, false, 14.9, 6.2, 15, 30, null],
  ["Levonorgestrel + etinilestradiol 0,15/0,03 mg", "Levonorgestrel, etinilestradiol", "Medley", "Cartela com 21 comprimidos", HO, G, V, null, false, 9.9, 3.4, 15, 30, null],

  ["Vitamina C 1 g efervescente", "Ácido ascórbico", "Cimed", "Tubo com 10 comprimidos", VI, S, ST, null, false, 12.9, 4.8, 15, 30, null],
  ["Sulfato ferroso 40 mg", "Sulfato ferroso", "Neo Química", "Frasco com 50 comprimidos", VI, G, ST, null, false, 7.9, 2.4, 10, 15, null],
  ["Complexo B", "Vitaminas do complexo B", "Cimed", "Caixa com 30 drágeas", VI, S, ST, null, false, 11.9, 4.1, 10, 12, "baixado"],

  ["Cloreto de sódio 0,9% spray nasal", "Cloreto de sódio", "Farmax", "Frasco com 50 ml", SO, S, ST, null, false, 9.9, 3.6, 15, 35, null],
  ["Soro fisiológico 0,9% 500 ml", "Cloreto de sódio", "Equiplex", "Frasco com 500 ml", SO, S, ST, null, false, 8.5, 3.9, 12, 20, "vencido avaria"],
  ["Sais para reidratação oral", "Cloreto de sódio, citrato de sódio, cloreto de potássio, glicose", "Prati-Donaduzzi", "Envelope com 27,9 g", SO, G, ST, null, false, 3.9, 1.2, 20, 30, null],

  ["Tadalafila 5 mg", "Tadalafila", "EMS", "Caixa com 30 comprimidos", UR, G, V, null, false, 39.9, 14.0, 10, 25, null],
  ["Sildenafila 50 mg", "Citrato de sildenafila", "Neo Química", "Caixa com 4 comprimidos", UR, G, V, null, false, 17.9, 5.8, 10, 20, "vencido"],
];

export const FORNECEDORES = [
  { nome: "Distribuidora Nordeste de Medicamentos", filial: 2, telefone: "8332150000", contato: "Carla Menezes" },
  { nome: "Atacado Farma Paraíba", filial: 3, telefone: "8333210000", contato: "Rodrigo Lins" },
  { nome: "Medfarma Distribuição", filial: 4, telefone: "8130450000", contato: "Fernanda Sá" },
  { nome: "Santa Luzia Distribuidora", filial: 6, telefone: "8421030000", contato: "Paulo Diniz" },
];

export const PRESCRITORES = [
  ["Dra. Helena Duarte", "CRM-PB 10234"],
  ["Dr. Rafael Nóbrega", "CRM-PB 8876"],
  ["Dra. Camila Arruda", "CRM-PB 12511"],
  ["Dr. Paulo Mendes", "CRO-PB 4312"],
];
export const PACIENTES = [
  "Maria das Graças Lima", "José Carlos Andrade", "Ana Beatriz Figueiredo", "Francisco Alves", "Luiza Cavalcanti",
  "Antônio Pereira", "Juliana Rocha", "Severino Batista", "Patrícia Moura", "Marcos Vinícius Araújo",
];
