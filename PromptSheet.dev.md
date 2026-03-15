Aqui está o esboço completo da sua proposta em formato Markdown, pronto para ser utilizado como documentação de projeto ou base para sua landing page:

```markdown
# PromptSheet.dev: Governança de IA por Proximidade

## O Problema: IA sem contexto é IA sem padrão
Atualmente, ao utilizar IA para gerar componentes de interface, perdemos tempo refinando o resultado. A IA não conhece as restrições de negócio, o tom de voz da marca ou os padrões de acessibilidade específicos de cada componente. O resultado é um código inconsistente e propenso a alucinações.

---

## A Solução: Cascading Prompt Sheets (CPS)
Inspirado na estrutura de cascata do CSS, o **CPS** propõe uma camada de governança componentizada. Em vez de prompts globais genéricos, definimos um arquivo `.prompt` colocalizado com o componente, estabelecendo restrições e regras de comportamento para a IA.



---

## Exemplo Prático: Button.prompt

```markdown
# Button.prompt
[component: action-button]
[context: e-commerce-checkout]

@governance
- tone: "urgente e direto"
- restricted-terms: ["barato", "grátis", "clique aqui"]
- allowed-actions: ["comprar", "adicionar ao carrinho", "finalizar"]
- accessibility-check: "sempre validar aria-label"

@logic-constraints
- max-characters: 30
- dynamic-state: "se estado for 'loading', exibir spinner"

```

---

## Como Funciona a "Cascata"

1. **Herança:** Regras definidas na raiz (ex: `/global.prompt`) são herdadas por todos os subdiretórios.
2. **Especificidade:** Regras locais (ex: `Button.prompt`) sobrescrevem regras globais.
3. **Injeção de Contexto:** Um *Prompt Resolver* lê a árvore do componente no momento da geração e injeta as regras no prompt de sistema da IA, garantindo que o output respeite o contrato definido.

---

## Benefícios

* **Governança por Proximidade:** Se o componente está ali, a regra está ali.
* **Padronização Automática:** Toda a equipe gera código sob as mesmas diretrizes.
* **Redução de Alucinação:** Restrições rígidas para termos e comportamentos proibidos.
* **Manutenibilidade:** Atualize a regra de negócio uma única vez no arquivo `.prompt` e toda a base de código é impactada positivamente nas próximas gerações.

```

---

**Próximo passo:** Você gostaria que eu detalhasse o funcionamento do "Prompt Resolver" (o script que faz a leitura do diretório e a injeção no LLM)?

```