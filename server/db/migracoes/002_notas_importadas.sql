-- A chave da nota ficava só nos lotes criados por ela. Se todos os lotes já existiam,
-- a nota não deixava rastro e podia ser importada de novo.
CREATE TABLE notas_importadas (
  chave          VARCHAR(44) PRIMARY KEY,
  numero         VARCHAR(20),
  fornecedor_id  INTEGER REFERENCES fornecedores(id) ON DELETE SET NULL,
  usuario_id     INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  importada_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO notas_importadas (chave, fornecedor_id)
SELECT DISTINCT ON (nota_fiscal) nota_fiscal, fornecedor_id
  FROM lotes
 WHERE nota_fiscal ~ '^\d{44}$'
 ORDER BY nota_fiscal, criado_em;

CREATE INDEX idx_mov_lote_tipo ON movimentacoes (lote_id, tipo);
