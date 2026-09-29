-- FarmaCom: esquema do banco de dados (PostgreSQL)
-- Pode ser executado várias vezes: apaga e recria as tabelas.

DROP VIEW IF EXISTS saldo_lotes;
DROP TABLE IF EXISTS movimentacoes;
DROP TABLE IF EXISTS lotes;
DROP TABLE IF EXISTS medicamentos;
DROP TABLE IF EXISTS usuarios;
DROP TYPE IF EXISTS tipo_movimentacao;
DROP TYPE IF EXISTS tipo_medicamento;
DROP TYPE IF EXISTS tarja_medicamento;

CREATE TABLE usuarios (
  id          SERIAL PRIMARY KEY,
  nome        VARCHAR(120) NOT NULL,
  email       VARCHAR(160) NOT NULL UNIQUE,
  senha_hash  VARCHAR(100) NOT NULL,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Categoria regulatória do medicamento (Lei 9.787/1999)
CREATE TYPE tipo_medicamento AS ENUM ('referencia', 'generico', 'similar');

-- Tarja da embalagem: sem tarja (isento de prescrição), vermelha, vermelha com retenção de receita, preta
CREATE TYPE tarja_medicamento AS ENUM ('sem_tarja', 'vermelha', 'vermelha_retencao', 'preta');

CREATE TABLE medicamentos (
  id                 SERIAL PRIMARY KEY,
  nome               VARCHAR(160) NOT NULL,           -- nome e concentração, ex.: "Losartana potássica 50 mg"
  principio_ativo    VARCHAR(160),
  fabricante         VARCHAR(120),
  apresentacao       VARCHAR(120),                    -- ex.: "caixa com 30 comprimidos"
  categoria          VARCHAR(60),                     -- classe terapêutica
  tipo               tipo_medicamento NOT NULL DEFAULT 'generico',
  tarja              tarja_medicamento NOT NULL DEFAULT 'vermelha',
  -- Controle especial: 'antimicrobiano' ou a lista da Portaria SVS/MS 344/1998 (A1, B1, C1...)
  controle_especial  VARCHAR(20),
  refrigerado        BOOLEAN NOT NULL DEFAULT false,  -- termolábil: armazenar entre 2 °C e 8 °C
  codigo_barras      VARCHAR(14) UNIQUE,
  preco_venda        NUMERIC(10, 2) CHECK (preco_venda >= 0),
  estoque_minimo     INTEGER NOT NULL DEFAULT 0 CHECK (estoque_minimo >= 0),
  criado_em          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE lotes (
  id              SERIAL PRIMARY KEY,
  medicamento_id  INTEGER NOT NULL REFERENCES medicamentos(id) ON DELETE CASCADE,
  codigo          VARCHAR(60) NOT NULL,
  validade        DATE NOT NULL,
  fornecedor      VARCHAR(160),
  preco_custo     NUMERIC(10, 2) CHECK (preco_custo >= 0),  -- custo unitário, usado no cálculo de perdas
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (medicamento_id, codigo)
);

-- entrada soma ao saldo; saida, baixa_vencimento e baixa_avaria subtraem
CREATE TYPE tipo_movimentacao AS ENUM ('entrada', 'saida', 'baixa_vencimento', 'baixa_avaria');

CREATE TABLE movimentacoes (
  id                   SERIAL PRIMARY KEY,
  lote_id              INTEGER NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
  tipo                 tipo_movimentacao NOT NULL,
  quantidade           INTEGER NOT NULL CHECK (quantidade > 0),
  observacao           VARCHAR(255),
  -- Dados da receita, exigidos na saída de medicamentos com controle especial
  receita_numero       VARCHAR(40),
  receita_data         DATE,
  prescritor_nome      VARCHAR(120),
  prescritor_registro  VARCHAR(40),                   -- ex.: CRM-PB 12345
  paciente_nome        VARCHAR(120),
  usuario_id           INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lotes_validade ON lotes (validade);
CREATE INDEX idx_mov_lote ON movimentacoes (lote_id);
CREATE INDEX idx_mov_criado ON movimentacoes (criado_em);
CREATE INDEX idx_med_categoria ON medicamentos (categoria);

-- Saldo atual de cada lote
CREATE VIEW saldo_lotes AS
SELECT
  l.id AS lote_id,
  COALESCE(SUM(CASE WHEN m.tipo = 'entrada' THEN m.quantidade ELSE -m.quantidade END), 0)::INTEGER AS saldo
FROM lotes l
LEFT JOIN movimentacoes m ON m.lote_id = l.id
GROUP BY l.id;
