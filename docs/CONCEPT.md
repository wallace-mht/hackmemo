# Conceito — HackMemo

## O problema

Quem roda vários hackathons em sequência (como no diretório `sui/hackatons` deste projeto)
acumula um volume de decisões técnicas, bugs contornados e ideias descartadas que simplesmente
some depois que a call/thread do dia termina. Uma semana depois, ninguém lembra por que a equipe
escolheu um determinado modelo de token, ou qual foi o workaround pro bug de assinatura que
consumiu duas horas na hackathon anterior. Esse conhecimento fica preso na cabeça de quem estava
na conversa, se é que ficou.

Chatbots de LLM comuns não resolvem isso: cada conversa começa do zero. Um assistente que
"lembra" só dentro da janela de contexto atual não ajuda quando a pergunta relevante surge
dias depois, numa hackathon diferente, às vezes com outra pessoa da equipe perguntando.

## A solução

HackMemo é um assistente pessoal — acessível por WhatsApp ou por um widget web — que qualquer
pessoa da equipe usa para registrar, no calor do momento, decisões, bugs e ideias durante uma
hackathon. Depois, qualquer um pode perguntar em linguagem natural ("o que decidimos sobre o
modelo de token do projeto X?") e o bot recupera o fato certo, mesmo que tenha sido registrado
por outra pessoa, em outro dia, em outro canal.

A memória persiste em **Walrus Memory**: as informações não vivem só numa conversa efêmera nem
num banco centralizado de um único provedor — ficam armazenadas de forma criptografada e
recuperável por busca semântica, isoladas por usuário.

## Por que isso é genuíno, não só uma demo de hackathon

Este projeto nasce dentro do próprio fluxo de trabalho descrito em `sui/hackatons`: a pessoa
por trás dele participa de múltiplas hackathons Sui e sente esse problema de perda de contexto
na prática. Isso resolve dois propósitos ao mesmo tempo:

1. **Submissão para o hackathon "Walrus Session 8: Chatbots That Remember"** — que pede
   exatamente um chatbot com memória persistente, usado de verdade por pessoas reais.
2. **Ferramenta de uso próprio** — continua útil depois da submissão, nas próximas hackathons.

Esse é o motivo pelo qual o critério de "uso real, por pessoas reais, por alguns dias" tende a
ser fácil de cumprir aqui: o uso não é fabricado para a demo, é o próprio workflow.

## Público-alvo

- Quem constrói o HackMemo e sua equipe direta, durante cada hackathon que participam.
- Por extensão, qualquer pequena equipe que rode hackathons/sprints recorrentes e queira uma
  memória compartilhada leve, sem processo de documentação formal.

## O que "sucesso" significa aqui

- A resposta do bot muda de forma visível quando há uma memória relevante — não é decorativo.
- Pelo menos 3 pessoas usando de fato, cada uma acumulando pelo menos 10 memórias reais
  (não sintéticas) ao longo de alguns dias de uso.
- O artigo da submissão consegue mostrar um antes/depois concreto: uma pergunta que o bot
  não conseguiria responder sem memória, respondida corretamente com ela.

## Fora de escopo (por enquanto)

- Múltiplas hackathons/projetos como conceitos formalmente separados dentro do bot — a v1 trata
  tudo como uma memória contínua por usuário; separar por projeto é uma extensão natural, não
  uma exigência do hackathon.
- Autenticação/gestão de equipe formal — o MVP usa identidade simples (telefone no WhatsApp,
  UUID anônimo no site).
- Interface administrativa — a verificação de uso (`scripts/memory-report.ts`) é propositalmente
  um script de linha de comando, não um painel.

Ver [ARCHITECTURE.md](./ARCHITECTURE.md) para como isso é implementado e
[MEMORY-MODEL.md](./MEMORY-MODEL.md) para como a memória especificamente funciona.
