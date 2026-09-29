# Sprints e tarefas

Linha do tempo em seis Sprints de duas semanas, conforme o Detalhamento do Projeto. As tarefas abaixo viram cartões (issues) no quadro Kanban do GitHub Projects.

| Sprint | Período | Meta |
|---|---|---|
| 1 | 28/09 a 09/10 | Entender a rotina da farmácia, priorizar a lista de pendências e apresentar o MVP |
| 2 | 13/10 a 23/10 | Base técnica pronta e telas aprovadas pelo cliente |
| 3 | 26/10 a 06/11 | Cadastro de medicamentos e registro de entradas e saídas |
| 4 | 09/11 a 19/11 | Alertas de vencimento e estoque baixo, e relatórios |
| 5 | 23/11 a 04/12 | Testes de usabilidade e aprovação para o piloto |
| 6 | 07/12 a 18/12 | Piloto em uso real e apresentação final |

## O que o MVP já entrega

- Catálogo com 77 medicamentos e dados regulatórios (tarja, tipo, controle especial, EAN-13, refrigeração)
- Cadastro, edição e exclusão de medicamentos, com filtros por categoria, tarja, controle e situação
- Recebimento de lotes e movimentações com controle de saldo
- Sugestão do lote que vence primeiro (FEFO) e bloqueio de venda de lote vencido
- Receita obrigatória na venda de controlados e antimicrobianos
- Painel com valor do estoque, gráfico de vencimentos, alertas e sugestão de compra
- Relatórios de perdas, movimentação, curva ABC e livro de controlados, com exportação para planilha
- Login, 21 testes automatizados da API e publicação no Render

## Tarefas para distribuir na Sprint 1 e 2

Cada integrante fica com tarefas ligadas à sua responsabilidade. Crie uma issue para cada uma e coloque no quadro.

### Guylherme: produto, regras de negócio e servidor

- [ ] Escrever as histórias de usuário da lista de pendências como issues, com critérios de aceite
- [ ] Validar com o cliente fictício os prazos de alerta (30, 60 e 90 dias) e registrar a decisão
- [ ] Servidor: rota para cadastrar novos usuários (somente usuário logado pode criar)
- [ ] Conduzir a revisão da Sprint 1 com o professor

### Gabriel: facilitação do processo e interfaces

- [ ] Montar o quadro Kanban no GitHub Projects com as colunas e limites do Detalhamento (Pendências, Selecionado para a Sprint, Análise 2, Desenvolvimento 3, Teste 2, Homologação 3, Concluído)
- [ ] Interface: formulário de edição de lote na tela do medicamento (a rota `PUT /api/lotes/:id` já existe)
- [ ] Interface: filtro por tipo na tela de movimentações (a API já aceita `GET /api/movimentacoes?tipo=saida`)
- [ ] Conduzir a retrospectiva da Sprint 1 e registrar a melhoria escolhida

### João Guilherme: qualidade, banco de dados e publicação

- [ ] Publicar o sistema no Render + Neon seguindo o README e colocar o link no topo do README
- [ ] Testes: relatório de movimentação, livro de controlados e exclusão de medicamento com e sem saídas
- [ ] Banco: índice e consulta para o histórico de movimentações de um lote
- [ ] Escrever o roteiro dos testes de usabilidade (Sprint 5)

## Próximas funcionalidades (lista de pendências)

- Cadastro de fornecedores como entidade própria
- Entrada de lotes pela nota fiscal de compra (XML da NF-e)
- Geração do arquivo para o SNGPC
- Exportação de relatórios em PDF
- Envio de alerta diário por e-mail ou WhatsApp
- Perfis de acesso (proprietário e balconista)
- Leitura de código de barras pela câmera ou leitor no balcão
