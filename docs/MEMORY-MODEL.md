# Modelo de memória — HackMemo

Como o HackMemo usa especificamente o Walrus Memory (`@mysten-incubation/memwal`). Ver
[ARCHITECTURE.md](./ARCHITECTURE.md) para onde isso se encaixa no sistema como um todo.

## O ciclo de vida de uma memória

1. **Captura** — depois de cada turno de conversa (mensagem do usuário + resposta do bot),
   `rememberTurn` chama `memwal.analyzeAndWait(...)`. O `analyze` do MemWal extrai fatos
   discretos do texto bruto (ex.: de "vamos usar Postgres pro projeto Y porque já temos
   experiência com ele", extrai algo como "decidiu usar Postgres no projeto Y" como fato
   isolado), em vez de guardar a frase inteira.
2. **Armazenamento** — cada fato é embutido (embedding), criptografado e enviado pro Walrus,
   isolado no namespace do usuário (`user:<id>`).
3. **Recuperação** — na próxima mensagem desse mesmo usuário, `recallMemories` chama
   `memwal.recall({ query, namespace, limit: 5, maxDistance: 0.7 })`: busca semântica pela
   pergunta atual, filtrando resultados fracos/ruidosos (distância ≥ 0.7 é descartada).
4. **Uso** — os fatos recuperados entram no prompt do Gemini como um bloco explícito
   ("Relevant memories about this user: ..."), com instrução direta no system prompt pra
   realmente usá-los na resposta, não só reconhecer que existem.

## Por que `analyze` em vez de `remember` puro

`remember(text)` guarda o texto como está. `analyze(text)` extrai fatos estruturados do texto.
Para conversas (onde a mesma informação relevante pode vir cercada de conversa irrelevante —
"oi", "valeu", "beleza vou testar isso"), `analyze` produz memórias mais densas e mais fáceis de
recuperar por busca semântica depois. É por isso que o critério de julgamento do hackathon
("Does it actually remember? Is memory doing real work, or is it decorative?") pesou na escolha
dessa API em vez da mais simples.

## Por que `maxDistance: 0.7`

Referência da própria documentação do MemWal:

| Distância | Interpretação |
|---|---|
| `< 0.25` | quase duplicata |
| `0.25 – 0.55` | relacionado |
| `0.55 – 0.7` | fraco/ruidoso |
| `>= 0.7` | tipicamente não relacionado |

`0.7` foi escolhido como corte pra não injetar memórias "tipicamente não relacionadas" no
prompt — isso evita o bot citando uma memória fora de contexto só porque a busca vetorial achou
alguma correspondência fraca. O trade-off é recall mais conservador: em caso de dúvida, o bot
prefere dizer que não tem memória relevante a forçar uma conexão fraca.

## Por que namespace por usuário, e não por projeto/hackathon

Ver a seção correspondente em [ARCHITECTURE.md](./ARCHITECTURE.md) — decisão de escopo, não
técnica: o MemWal suporta qualquer string de namespace igualmente bem. Migrar para
`project:<id>` ou `team:<id>` no futuro é só trocar `namespaceForUser` por uma função que
resolve o namespace certo a partir de contexto adicional (qual hackathon está em andamento,
por exemplo) — não exige mudança no resto do pipeline.

## O que conta como "uma memória" para a meta do hackathon

A submissão exige ≥3 usuários com ≥10 memórias cada. Como `analyze` pode extrair **zero, um ou
vários fatos** de um único turno de conversa (uma frase com duas decisões vira duas memórias;
"oi, tudo bem?" pode não virar nenhuma), o número de memórias **não é igual** ao número de
mensagens trocadas. `scripts/memory-report.ts` existe justamente para medir memórias de fato
recuperáveis, não turnos de conversa — ver a ressalva sobre precisão dessa métrica em
ARCHITECTURE.md.

## Histórico de conversa vs. memória de longo prazo

Importante não confundir os dois mecanismos que coexistem no sistema:

- **Histórico recente** (`recentHistoryFor` em `db/log.ts`, backend SQLite): as últimas ~6
  trocas literais da conversa atual, dadas ao Gemini como `history` do chat — contexto
  conversacional de curto prazo, sem busca semântica.
- **Memória de longo prazo** (`recallMemories`, backend Walrus): fatos extraídos e persistidos
  entre sessões, recuperados por relevância semântica à pergunta atual, não por proximidade
  temporal.

O primeiro dá coerência dentro de uma conversa; o segundo é o que faz o bot "lembrar" dias
depois, entre dispositivos e canais diferentes — a exigência central do hackathon.
