// Garante que os testes usem o banco de teste (importado antes de qualquer outro módulo)
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "segredo-de-teste";
