# Arquitetura — HackMemo

Ver [CONCEPT.md](./CONCEPT.md) para o porquê; este documento cobre o como e as decisões de design.

## Visão geral

```
                     ┌────────────────────┐
   WhatsApp  ──────▶ │  channels/whatsapp │ ──┐
   (Baileys)         └────────────────────┘   │
                                               ▼
                                    ┌─────────────────────┐        ┌───────────────┐
                                    │ core/conversation.ts │ ─────▶ │ core/memory.ts │──▶ Walrus Memory
                                    │  (orquestrador)      │        └───────────────┘   (MemWal SDK)
                                    │                      │
                                    │                      │ ─────▶ ┌───────────────┐
   Widget web ──────▶ ┌──────────┐ │                      │        │  core/llm.ts   │──▶ Gemini
   (fetch)            │ channels/│─┘                      │        └───────────────┘
                       │  web.ts │──────────────────────▶ │
                       └──────────┘                       │ ─────▶ ┌───────────────┐
                                                            │        │   db/log.ts    │──▶ SQLite
                                                            └───────────────────────┘   (histórico local)
```

Um único processo Node/TypeScript serve os dois canais. Não há filas, workers separados nem
serviços adicionais — a complexidade operacional foi mantida no mínimo necessário pro escopo de
um hackathon, e revisitada só se o uso real exigir.

## Por que um único backend para os dois canais

WhatsApp (via Baileys) e o widget web são só **transportes** diferentes para o mesmo conceito:
"uma pessoa manda uma mensagem, o bot responde usando memória". Separar isso em dois serviços
independentes duplicaria a lógica de recall → prompt → generate → remember sem nenhum ganho —
os dois canais compartilham o mesmo `core/conversation.ts`.

## Por que Baileys em vez da API oficial do WhatsApp Business

A API oficial da Meta exige aprovação de negócio e não é viável no prazo de um hackathon.
Baileys pareia como um dispositivo vinculado (Linked Device) a um número pessoal existente, sem
aprovação de terceiros. A contrapartida assumida conscientemente: é uma lib não-oficial, uso
automatizado tecnicamente viola os termos do WhatsApp, e há risco (baixo, em volume de teste)
de restrição da conta. Essa decisão já foi validada com o dono do projeto.

## Por que Gemini

Duas razões, não uma só:
1. É gratuito no tier usado, sem custo de operação durante o teste com usuários reais.
2. O hackathon tem uma categoria de prêmio específica ("Beyond the Big Two") para submissões
   cujo LLM principal não é Claude nem GPT — Gemini qualifica e essa categoria acumula com o
   prêmio principal.

## Por que SQLite local em vez de só confiar no Walrus Memory

Walrus Memory guarda **fatos extraídos** (via `analyzeAndWait`), não necessariamente o
histórico literal de cada turno de conversa. O log em SQLite (`db/log.ts`) tem dois papéis que a
memória semântica não cobre bem:

- **Histórico de conversa recente** (`recentHistoryFor`): dar ao Gemini o contexto imediato da
  troca atual, sem depender de uma busca semântica para "o que eu disse duas mensagens atrás".
- **Evidência para o artigo da submissão**: prints/transcrições de conversas reais, e uma forma
  de contar quantos turnos cada usuário gerou, sem precisar reconstruir isso a partir de buscas
  aproximadas no Walrus.

## Por que isolamento por namespace (`user:<id>`)

O SDK do MemWal isola memórias por `owner + namespace`, com correspondência exata (sem
prefixo/wildcard). Cada usuário do HackMemo recebe seu próprio namespace
(`namespaceForUser` em `core/memory.ts`) para que a memória de uma pessoa nunca vaze nas
respostas dadas a outra — inclusive quando duas pessoas da mesma equipe perguntam sobre o mesmo
projeto de hackathon, cada uma só vê o que ela mesma (ou o bot, em nome dela) registrou.

Essa escolha tem um trade-off explícito: memórias **não são compartilhadas entre a equipe**. Se
a pessoa A registrar uma decisão, a pessoa B não vê essa memória ao perguntar. Isso é aceitável
pro escopo do hackathon (ver "Fora de escopo" em CONCEPT.md) — namespaces por
projeto/equipe em vez de por usuário é a extensão natural caso isso vire uma dor real.

## Por que a extração de memória não bloqueia a resposta

`rememberTurn` (que chama `analyzeAndWait`) roda em paralelo à resposta, sem `await` no caminho
crítico (`conversation.ts`). Latência de resposta pro usuário importa mais do que a memória
estar garantidamente indexada no exato momento em que a resposta chega — um pequeno atraso na
indexação (segundos) não é perceptível em uso conversacional real.

## Limites conhecidos / dívida técnica assumida

- `scripts/memory-report.ts` aproxima a contagem de memórias por usuário via uma busca semântica
  ampla (`recall` com query genérica), não uma contagem exata — o SDK do MemWal não expõe um
  endpoint de contagem bruta por namespace. Suficiente pra verificar a meta do hackathon
  (≥10 memórias/usuário), não pra relatórios precisos.
- Reconexão do WhatsApp em caso de queda é automática (`startWhatsAppChannel` se rechama), mas
  sem backoff — aceitável em escala de teste, revisitar se isso virar produção de verdade.
- Sem testes automatizados. Dado o prazo e o escopo (validar um conceito com poucos usuários
  reais), a verificação é manual (ver seção "Verificação" no plano original e no README).

Ver [MEMORY-MODEL.md](./MEMORY-MODEL.md) para os detalhes de como a memória em si é usada.
