# FarmaCom

Sistema web de controle de estoque e validade para farmácias de bairro, desenvolvido no Desafio Unifacisa (Análise e Desenvolvimento de Sistemas).

![Painel](docs/telas/painel.png)

## O que o sistema faz

- Cadastro de medicamentos com tarja, tipo (referência, genérico ou similar), controle especial, código de barras e preço
- Lotes com validade, fornecedor e custo; a venda sai sempre do lote que vence primeiro
- Receita obrigatória na venda de controlados e antimicrobianos
- Painel com valor do estoque, vencimentos dos próximos meses e sugestão de compra
- Relatórios de perdas, movimentação, curva ABC e livro de controlados, com exportação para planilha

A pesquisa que orientou essas funcionalidades está em [docs/pesquisa.md](docs/pesquisa.md).

![Medicamento](docs/telas/medicamento.png)

## Tecnologias

React com Vite na interface, Node.js com Express na API e PostgreSQL no banco.

## Como rodar

Precisa de Node.js 20 ou superior e de um PostgreSQL. Com Docker, na raiz do projeto:

```bash
docker compose up -d
```

API:

```bash
cd server
cp .env.example .env
npm install
npm run db:seed
npm run dev
```

Interface, em outro terminal:

```bash
cd web
npm install
npm run dev
```

Abra http://localhost:5173 e entre com `demo@farmacom.app` / `farmacom123`. Os dados de exemplo são de uma farmácia fictícia.

## Testes

```bash
cd server
npm test
```

## Publicação

A API e a interface estão no Render (configuração em `render.yaml`) e o banco no Neon. A cada envio para a `main`, o Render publica a nova versão e recria os dados de demonstração.

## Equipe

- Guylherme Neves Pinheiro
- Gabriel Gaspar Mendes Bomfim
- João Guilherme Mendes Bomfim
