# PromptSheet.dev: Governança de IA por Proximidade

**Cascading Prompt Sheets (CPS)** - Uma camada de governança componentizada para IA inspirada na estrutura de cascata do CSS.

## O Problema

IA sem contexto é IA sem padrão. Ao utilizar IA para gerar componentes de interface, perdemos tempo refinando o resultado. A IA não conhece as restrições de negócio, o tom de voz da marca ou os padrões de acessibilidade específicos de cada componente.

## A Solução

O **CPS** propõe uma camada de governança componentizada. Em vez de prompts globais genéricos, definimos um arquivo `.prompt` colocalizado com o componente, estabelecendo restrições e regras de comportamento para a IA.

## Quick Start

### Instalação

```bash
git clone https://github.com/mikaelcarrara/prompt-sheet.git
cd prompt-sheet

npm install

npm start
```

Abra `http://localhost:3000` no seu navegador.

## Status Atual

- Core de resolução com cache por diretório
- Merge determinístico de regras (`último valor vence` para escalares, `união sem duplicatas` para arrays)
- Endpoint de debug para inspecionar ordem de arquivos e regras efetivas

### Estrutura do Projeto

```
prompt-sheet/
├── .github/
│   └── workflows/
│       └── deploy.yml        # Workflow de deploy no GitHub Pages
├── src/
│   ├── prompt-resolver.js    # Core engine do CPS
│   └── demo-server.js        # Servidor de demonstração
├── index.html                # Landing page
├── examples/
│   └── components/
│       ├── Button.prompt    # Exemplo de prompt de botão
│       └── Input.prompt     # Exemplo de prompt de input
├── global.prompt            # Regras globais herdadas
├── tests/
│   └── test-resolver.js      # Testes do PromptResolver
└── package.json              # Scripts e dependências
```

## Como Funciona

### 1. Herança em Cascata

Regras definidas na raiz (ex: `/global.prompt`) são herdadas por todos os subdiretórios.

### 2. Especificidade Local

Regras locais no diretório alvo são combinadas após os globais.
Para chaves escalares, o valor mais específico sobrescreve o anterior.
Para arrays, os valores são unidos sem duplicação.

### 3. Injeção de Contexto

O `PromptResolver` lê os arquivos aplicáveis e monta o prompt de sistema para a IA.

## Formato do Arquivo .prompt

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

### Endpoints HTTP da Demo

- `POST /api/generate-prompt`
- `GET /api/prompts/:filePath?`
- `POST /api/resolve-debug`

### Gerar Prompt Enriquecido

```javascript
const PromptResolver = require('./src/prompt-resolver');
const resolver = new PromptResolver(__dirname);

const enhancedPrompt = await resolver.generatePrompt(
    'examples/components/Button.jsx',
    'Crie um botão de compra para e-commerce'
);
```

### Carregar Regras de um Diretório

```javascript
const prompts = await resolver.loadPromptFiles('examples/components/Button.jsx');
console.log(prompts); // Array de regras aplicáveis
```

### Diagnóstico Completo de Resolução

```javascript
const debug = await resolver.resolveDebug(
    'examples/components/Button.jsx',
    'Crie um botão de compra para e-commerce'
);

console.log(debug.orderedPromptFiles);
console.log(debug.effectiveSections);
```

### Exemplo de chamada HTTP para debug

```bash
curl -X POST http://localhost:3000/api/resolve-debug \
  -H "Content-Type: application/json" \
  -d "{\"filePath\":\"examples/components/Button.jsx\",\"userPrompt\":\"Crie um botão\"}"
```

## Interface Web

A demo inclui uma landing page em `index.html` servida em `http://localhost:3000`.

## Testes

```bash
npm test
```

## Arquitetura

### PromptResolver

Classe principal que implementa:

- **Cache inteligente** para performance
- **Herança em cascata** de regras globais para locais
- **Parse de `.prompt`** com metadados, seções, arrays, boolean e número
- **Merge determinístico** de regras efetivas
- **Geração automática** de prompts enriquecidos
- **Diagnóstico completo** com `resolveDebug`

### Estrutura de Dados

```javascript
{
  filePath: "examples/components/Button.jsx",
  orderedPromptFiles: ["global.prompt", "examples/components/Button.prompt"],
  promptCount: 2,
  prompts: [
    { component: "global", sourceFile: "global.prompt", sections: { ... } },
    { component: "action-button", sourceFile: "examples/components/Button.prompt", sections: { ... } }
  ],
  effectiveSections: {
    governance: {
      tone: "urgente e direto",
      "restricted-terms": ["click aqui", "grátis"]
    }
  },
  enhancedPrompt: "# Governança de IA - PromptSheet.dev..."
}
```

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
