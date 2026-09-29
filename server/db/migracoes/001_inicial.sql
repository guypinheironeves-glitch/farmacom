CREATE TYPE perfil_usuario AS ENUM ('administrador', 'atendente');
CREATE TYPE tipo_medicamento AS ENUM ('referencia', 'generico', 'similar');
CREATE TYPE tarja_medicamento AS ENUM ('sem_tarja', 'vermelha', 'vermelha_retencao', 'preta');
CREATE TYPE tipo_movimentacao AS ENUM (
  'entrada', 'saida', 'baixa_vencimento', 'baixa_avaria', 'ajuste_entrada', 'ajuste_saida'
);

CREATE TABLE usuarios (
  id          SERIAL PRIMARY KEY,
  nome        VARCHAR(120) NOT NULL,
  email       VARCHAR(160) NOT NULL UNIQUE,
  senha_hash  VARCHAR(100) NOT NULL,
  perfil      perfil_usuario NOT NULL DEFAULT 'atendente',
  ativo       BOOLEAN NOT NULL DEFAULT true,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE configuracoes (
  chave  VARCHAR(40) PRIMARY KEY,
  valor  JSONB NOT NULL
);

CREATE TABLE fornecedores (
  id         SERIAL PRIMARY KEY,
  nome       VARCHAR(160) NOT NULL,
  cnpj       VARCHAR(14) UNIQUE,
  telefone   VARCHAR(20),
  email      VARCHAR(160),
  contato    VARCHAR(120),
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE medicamentos (
  id                 SERIAL PRIMARY KEY,
  nome               VARCHAR(160) NOT NULL,
  principio_ativo    VARCHAR(160),
  fabricante         VARCHAR(120),
  apresentacao       VARCHAR(120),
  categoria          VARCHAR(60),
  tipo               tipo_medicamento NOT NULL DEFAULT 'generico',
  tarja              tarja_medicamento NOT NULL DEFAULT 'vermelha',
  controle_especial  VARCHAR(20),
  refrigerado        BOOLEAN NOT NULL DEFAULT false,
  codigo_barras      VARCHAR(14) UNIQUE,
  registro_anvisa    VARCHAR(13),
  preco_venda        NUMERIC(10, 2) CHECK (preco_venda >= 0),
  estoque_minimo     INTEGER NOT NULL DEFAULT 0 CHECK (estoque_minimo >= 0),
  criado_em          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE lotes (
  id              SERIAL PRIMARY KEY,
  medicamento_id  INTEGER NOT NULL REFERENCES medicamentos(id) ON DELETE CASCADE,
  fornecedor_id   INTEGER REFERENCES fornecedores(id) ON DELETE SET NULL,
  codigo          VARCHAR(60) NOT NULL,
  validade        DATE NOT NULL,
  preco_custo     NUMERIC(10, 2) CHECK (preco_custo >= 0),
  nota_fiscal     VARCHAR(44),
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (medicamento_id, codigo)
);

CREATE TABLE movimentacoes (
  id                   SERIAL PRIMARY KEY,
  lote_id              INTEGER NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
  tipo                 tipo_movimentacao NOT NULL,
  quantidade           INTEGER NOT NULL CHECK (quantidade > 0),
  observacao           VARCHAR(255),
  receita_numero       VARCHAR(40),
  receita_data         DATE,
  prescritor_nome      VARCHAR(120),
  prescritor_registro  VARCHAR(40),
  paciente_nome        VARCHAR(120),
  estornada            BOOLEAN NOT NULL DEFAULT false,
  estorno_de           INTEGER REFERENCES movimentacoes(id) ON DELETE CASCADE,
  usuario_id           INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE avisos_enviados (
  id         SERIAL PRIMARY KEY,
  canal      VARCHAR(20) NOT NULL,
  destino    VARCHAR(160),
  sucesso    BOOLEAN NOT NULL,
  detalhe    VARCHAR(255),
  enviado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lotes_validade ON lotes (validade);
CREATE INDEX idx_mov_lote ON movimentacoes (lote_id);
CREATE INDEX idx_mov_criado ON movimentacoes (criado_em);
CREATE INDEX idx_med_categoria ON medicamentos (categoria);

CREATE VIEW saldo_lotes AS
SELECT
  l.id AS lote_id,
  COALESCE(SUM(CASE WHEN m.tipo IN ('entrada', 'ajuste_entrada') THEN m.quantidade ELSE -m.quantidade END), 0)::INTEGER AS saldo
FROM lotes l
LEFT JOIN movimentacoes m ON m.lote_id = l.id
GROUP BY l.id;
