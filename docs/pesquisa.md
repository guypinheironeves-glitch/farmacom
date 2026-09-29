# Pesquisa de referência

Levantamento feito para orientar as funcionalidades do FarmaCom: como funcionam os sistemas de gestão de farmácias do mercado e quais regras brasileiras afetam o controle de estoque de medicamentos.

## 1. O que os sistemas de farmácia do mercado oferecem

Sistemas como Trier, Vetor Farma, Inovafarma e Automatiza trazem, entre outras, estas funções ligadas a estoque:

| Funcionalidade no mercado | Como ficou no FarmaCom |
|---|---|
| Controle por lote e validade em todos os produtos | Cada medicamento tem lotes com validade, custo e saldo próprios |
| Organizar a saída pela validade: o que vence primeiro sai primeiro (FEFO) | A tela de movimentação sugere o lote válido que vence primeiro e avisa quando outro lote é escolhido |
| Bloqueio de venda de produto vencido | O servidor recusa venda de lote vencido e orienta a registrar baixa |
| Campos para a receita (prescritor, data, quantidade) e separação dos controlados | Saída de controlado ou antimicrobiano exige data da receita, prescritor, registro profissional e paciente |
| Livro de registro de controlados e envio ao SNGPC | Relatório "Livro de controlados" com todas as saídas e dados da receita, exportável em planilha |
| Estoque mínimo com sugestão automática de compra | Painel com sugestão de compra: 30 dias de vendas mais o estoque mínimo, menos o saldo válido |
| Curva ABC por faturamento | Relatório de curva ABC (A até 80% do faturamento, B até 95%, C o restante) |
| Lançamento de perdas | Baixa por vencimento e por avaria, com relatório de perdas em reais |
| Leitura de código de barras | Campo EAN-13 com validação do dígito verificador e busca por código |
| Controle de medicamentos termolábeis | Marcação de medicamento refrigerado (2 °C a 8 °C) |

Ficaram para as próximas Sprints: entrada automática pela nota fiscal (XML da NF-e), integração com o PDV e emissão de NFC-e, tabelas de preço (PMC, PBM), inventário e envio real do arquivo ao SNGPC.

## 2. Regras brasileiras aplicadas

**Tarjas.** Sem tarja: medicamento isento de prescrição. Tarja vermelha: venda sob prescrição, com ou sem retenção da receita. Tarja preta: controle mais rígido, com receita retida. A faixa amarela com a letra G identifica o medicamento genérico. O FarmaCom mostra a tarja de cada medicamento como uma faixa colorida na lista e reproduz a frase obrigatória da embalagem na tela do medicamento.

**Tipos de medicamento.** Referência, genérico e similar (Lei 9.787/1999).

**Controle especial.** A Portaria SVS/MS 344/1998 divide as substâncias em listas. Exemplos usados no catálogo de demonstração:

| Lista | Exemplos | Receita |
|---|---|---|
| B1 (psicotrópicos) | clonazepam, alprazolam, diazepam, zolpidem | Notificação de Receita B (azul), retida |
| C1 (controle especial) | sertralina, fluoxetina, escitalopram, amitriptilina, carbamazepina, quetiapina | Receita de Controle Especial em 2 vias, retida |

**Antimicrobianos.** Amoxicilina, azitromicina, cefalexina e outros antibióticos exigem receita em duas vias, com retenção, válida por 10 dias a partir da emissão. O FarmaCom recusa a venda com receita de antimicrobiano mais antiga que isso.

**SNGPC.** O Sistema Nacional de Gerenciamento de Produtos Controlados, da Anvisa, recebe as movimentações de controlados e antimicrobianos das farmácias. O livro de controlados do FarmaCom reúne os dados que a escrituração exige.

## 3. Medicamentos do catálogo de demonstração

O catálogo tem 77 medicamentos comuns no varejo brasileiro, em 19 categorias. A escolha partiu dos rankings de vendas: losartana, dipirona, hidroclorotiazida, tadalafila, nimesulida, simeticona, enalapril, sinvastatina, atenolol e anlodipino lideraram as vendas de genéricos no início de 2025, e a metformina de liberação prolongada foi a marca mais vendida.

Nomes, princípios ativos, tarjas e controles seguem a regulação. Fabricantes, preços, lotes e códigos de barras são ilustrativos: os códigos usam o prefixo 200, reservado para uso interno, para não coincidir com produtos reais.

## Fontes

- [CFF: medicamentos para diabetes e hipertensão dominam ranking de vendas em 2025](https://site.cff.org.br/noticia/Noticias-gerais/23/06/2025/medicamentos-para-diabetes-e-hipertensao-dominam-ranking-de-vendas-no-brasil-em-2025)
- [Inovafarma: 100 medicamentos mais vendidos em farmácia](https://www.inovafarma.com.br/blog/medicamentos-mais-vendidos-em-farmacias/)
- [Ministério da Saúde (BVS): significado das tarjas nas embalagens](https://bvsms.saude.gov.br/entenda-o-significado-das-tarjas-coloridas-nas-embalagens-dos-remedios/)
- [Hospital Sírio-Libanês: resumo da Portaria 344/98](https://guiafarmaceutico.hsl.org.br/informacoes-de-apoio/prescricao-de-medicamentos-sujeitos-a-controle-especial/medicamentos-controlados-resumo-portaria-344-98)
- [PharmaOne: SNGPC em 2026](https://pharmaone.com.br/blog/sngpc-voltou-novidades)
- [Gálago: funcionalidades essenciais de um sistema para farmácia](https://galago.com.br/blog/sistema-para-farmacia.html)
- [Automatiza: gestão de estoque para farmácia](https://automatizasistemas.com.br/solucoes-para-farmacias/sistema-farmacia-inteligente/gestao-estoque-farmacia/)
- [Trier Sistemas](https://www.triersistemas.com.br/) e [Vetor Farma](https://vetorfarma.com.br/software-de-gestao-para-farmacias/)
