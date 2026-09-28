# Fluxo de trabalho da equipe

Este guia vale para os três integrantes. Ele segue as regras do quadro Kanban definidas no Detalhamento do Projeto.

## 1. Preparar o ambiente (uma vez só)

1. Peça ao dono do repositório para te adicionar como colaborador (*Settings > Collaborators*).
2. Aceite o convite no e-mail.
3. Clone o repositório e siga o passo a passo do [README](README.md):

```bash
git clone https://github.com/guypinheironeves-glitch/farmacom.git
cd farmacom
```

4. Configure seu nome e e-mail no Git, para que seus commits apareçam no seu perfil:

```bash
git config --global user.name "Seu Nome"
git config --global user.email "email-da-sua-conta-github@exemplo.com"
```

## 2. Para cada tarefa (cartão do quadro)

1. Puxe o cartão para **Desenvolvimento** no quadro (respeitando o limite da coluna).
2. Atualize a `main` e crie um ramo com o número da tarefa:

```bash
git checkout main
git pull
git checkout -b 12-edicao-de-lote
```

3. Faça as alterações em commits pequenos, com mensagens no imperativo:

```bash
git add .
git commit -m "Adiciona formulário de edição de lote"
git push -u origin 12-edicao-de-lote
```

4. No GitHub, abra uma **solicitação de integração** (*pull request*) para a `main`, escreva `Closes #12` na descrição e peça revisão de outro integrante.
5. Mova o cartão para **Teste**. Com a integração contínua ativada (veja o README), o GitHub roda os testes automaticamente.
6. Depois da aprovação do revisor e com os testes passando, faça o *merge*. O cartão segue para **Homologação**.

## Regras combinadas

- Ninguém envia direto para a `main`: tudo passa por solicitação de integração revisada por outro integrante.
- Toda regra de negócio nova no servidor ganha pelo menos um teste em `server/test/`.
- Antes de pedir revisão, rode `npm test` (em `server`) e `npm run build` (em `web`).
- Textos da interface em português, sem termos em inglês quando houver equivalente.
