# PromptSheet.dev: Governança de IA por Proximidade

**Cascading Prompt Sheets (CPS)** - Uma camada de governança componentizada para IA inspirada na estrutura de cascata do CSS.

## 🎯 O Problema

IA sem contexto é IA sem padrão. Ao utilizar IA para gerar componentes de interface, perdemos tempo refinando o resultado. A IA não conhece as restrições de negócio, o tom de voz da marca ou os padrões de acessibilidade específicos de cada componente.

## ✅ A Solução

O **CPS** propõe uma camada de governança componentizada. Em vez de prompts globais genéricos, definimos um arquivo `.prompt` colocalizado com o componente, estabelecendo restrições e regras de comportamento para a IA.

## 🚀 Quick Start

### Instalação

```bash
# Clone o projeto
git clone <repository-url>
cd PromptSheet.dev

# Instale dependências
npm install

# Inicie o servidor de demonstração
npm start
```

Abra `http://localhost:3000` no seu navegador.

### Estrutura do Projeto

```
PromptSheet.dev/
├── src/
│   ├── prompt-resolver.js    # Core engine do CPS
│   └── demo-server.js        # Servidor de demonstração
├── public/
│   └── index.html           # Interface web
├── examples/
│   └── components/
│       ├── Button.prompt    # Exemplo de prompt de botão
│       └── Input.prompt     # Exemplo de prompt de input
├── global.prompt            # Regras globais herdadas
└── tests/
    └── test-resolver.js     # Testes do motor CPS
```

## 📖 Como Funciona

### 1. Herança em Cascata

Regras definidas na raiz (ex: `/global.prompt`) são herdadas por todos os subdiretórios.

### 2. Especificidade Local

Regras locais (ex: `Button.prompt`) sobrescrevem regras globais.

### 3. Injeção de Contexto

Um *Prompt Resolver* lê a árvore do componente no momento da geração e injeta as regras no prompt de sistema da IA.

## 📝 Formato do Arquivo .prompt

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

## 🔧 API

### Gerar Prompt Enriquecido

```javascript
const PromptResolver = require('./src/prompt-resolver');
const resolver = new PromptResolver('./meu-projeto');

const enhancedPrompt = await resolver.generatePrompt(
    'components/Button',
    'Crie um botão de compra para e-commerce'
);
```

### Carregar Regras de um Diretório

```javascript
const prompts = await resolver.loadPromptFiles('components/Button');
console.log(prompts); // Array de regras aplicáveis
```

## 🎨 Interface Web

A demo inclui uma interface web interativa onde você pode:

- Digitar seu prompt original
- Especificar o contexto do componente
- Ver o prompt enriquecido com governança CPS
- Copiar o prompt final para usar com qualquer IA

## 🧪 Testes

```bash
npm test
```

## 🏗️ Arquitetura

### PromptResolver

Classe principal que implementa:

- **Cache inteligente** para performance
- **Herança em cascata** de regras globais para locais
- **Parse flexível** do formato `.prompt`
- **Geração automática** de prompts enriquecidos

### Estrutura de Dados

```javascript
{
  component: "action-button",
  context: "e-commerce-checkout",
  sections: {
    governance: {
      tone: "urgente e direto",
      restrictedTerms: ["barato", "grátis"],
      allowedActions: ["comprar", "adicionar ao carrinho"]
    },
    logicConstraints: {
      maxCharacters: 30,
      dynamicState: "se estado for 'loading', exibir spinner"
    }
  }
}
```

## 🎯 Benefícios

- **Governança por Proximidade:** Se o componente está ali, a regra está ali
- **Padronização Automática:** Toda a equipe gera código sob as mesmas diretrizes
- **Redução de Alucinação:** Restrições rígidas para termos e comportamentos proibidos
- **Manutenibilidade:** Atualize a regra de negócio uma única vez no arquivo `.prompt`

## 🔮 Roadmap

- [ ] Integração com IDEs (VS Code extension)
- [ ] Plugin para frameworks populares (React, Vue, Angular)
- [ ] Suporte a múltiplos LLMs
- [ ] Validação sintática de arquivos `.prompt`
- [ ] CLI para automação em CI/CD

## 📄 Licença

MIT License - veja o arquivo LICENSE para detalhes.

## 🤝 Contribuição

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie sua feature branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Add: nova funcionalidade'`)
4. Push para o branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

---

**PromptSheet.dev** - Onde cada componente tem suas próprias regras. 🚀
