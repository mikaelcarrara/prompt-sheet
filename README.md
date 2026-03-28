# PromptSheet.dev: Proximity-Based AI Governance

**Cascading Prompt Sheets (CPS)** — A componentized governance layer for AI inspired by CSS’s cascade.

## The Problem

Contextless AI is patternless AI. When using AI to generate UI components, we lose time refining outputs. AI doesn’t know your business constraints, brand tone, or component-specific accessibility patterns.

## The Solution

**CPS** proposes a componentized governance layer. Instead of generic global prompts, define a `.prompt` file colocated with the component, establishing constraints and behavioral rules for the AI.

## Quick Start

### Installation

```bash
git clone https://github.com/mikaelcarrara/prompt-sheet.git
cd prompt-sheet

npm install

npm start
```

Open `http://localhost:3000` in your browser.

## Current Status

- Resolution core with per-directory cache
- Deterministic rule merging (`last value wins` for scalars, `union without duplicates` for arrays)
- Debug endpoint to inspect file order and effective rules

### Project Structure

```
prompt-sheet/
├── .github/
│   └── workflows/
│       └── deploy.yml        # GitHub Pages deploy workflow
├── src/
│   ├── prompt-resolver.js    # CPS core engine
│   └── demo-server.js        # Demo server
├── index.html                # Landing page
├── examples/
│   └── components/
│       ├── Button.prompt     # Button prompt example
│       └── Input.prompt      # Input prompt example
├── global.prompt             # Inherited global rules
├── tests/
│   └── test-resolver.js      # PromptResolver tests
└── package.json              # Scripts and dependencies
```

## How It Works

### 1. Cascading Inheritance

Rules defined at root (e.g., `/global.prompt`) are inherited by all subdirectories.

### 2. Local Specificity

Local rules in the target directory are combined after globals.
For scalars, the most specific value overrides.
For arrays, values are unioned without duplication.

### 3. Context Injection

`PromptResolver` reads applicable files and builds the system prompt for the AI.

## .prompt File Format

```markdown
# Button.prompt
[component: action-button]
[context: e-commerce-checkout]

@governance
- tone: "urgent and direct"
- restricted-terms: ["cheap", "free", "click here"]
- allowed-actions: ["buy", "add to cart", "checkout"]
- accessibility-check: "always validate aria-label"

@logic-constraints
- max-characters: 30
- dynamic-state: "if state is 'loading', show spinner"
```

## 🔧 API

### Demo HTTP Endpoints

- `POST /api/generate-prompt`
- `GET /api/prompts/:filePath?`
- `POST /api/resolve-debug`

### CLI

Local install via bin:

```bash
npm run cps -- resolve examples/components/Button.jsx "Create an accessible button"
```

Global install (optional):

```bash
npm i -g .
cps resolve examples/components/Button.jsx "Create button with aria-label" --maxTokens 2048 --json
```

Output includes approximate token count and optional truncation via `--maxTokens`.

### Generate Enriched Prompt

```javascript
const PromptResolver = require('./src/prompt-resolver');
const resolver = new PromptResolver(__dirname);

const enhancedPrompt = await resolver.generatePrompt(
    'examples/components/Button.jsx',
    'Create a buy button for e-commerce'
);
```

### Load Rules From a Directory

```javascript
const prompts = await resolver.loadPromptFiles('examples/components/Button.jsx');
console.log(prompts); // Array of applicable rules
```

### Full Resolution Diagnostics

```javascript
const debug = await resolver.resolveDebug(
    'examples/components/Button.jsx',
    'Create a buy button for e-commerce'
);

console.log(debug.orderedPromptFiles);
console.log(debug.effectiveSections);
```

### Example HTTP call for debug

```bash
curl -X POST http://localhost:3000/api/resolve-debug \
  -H "Content-Type: application/json" \
  -d "{\"filePath\":\"examples/components/Button.jsx\",\"userPrompt\":\"Create a button\"}"
```

## Web Interface

The demo includes a landing page in `index.html` served at `http://localhost:3000`.

## Tests

```bash
npm test
```

## Architecture

### PromptResolver

Main class implementing:

- **Smart cache** for performance
- **Cascading inheritance** from global to local rules
- **`.prompt` parsing** with metadata, sections, arrays, boolean and number
- **Deterministic merge** of effective rules
- **Automatic generation** of enriched prompts
- **Full diagnostics** via `resolveDebug`
- **Metrics** for approximate prompt length (tokens) and optional truncation

### Data Structure

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
      tone: "urgent and direct",
      "restricted-terms": ["click here", "free"]
    }
  },
  enhancedPrompt: "# AI Governance - PromptSheet.dev..."
}
```

## v1 Schema (.prompt)

- Metadata: `[component: ...]`, `[context: ...]`
- Sections: start with `@section-name`
- Properties: `- key: value`
- Supported types: string, number, boolean, string array

TypeScript types available in `types/prompt-sheet.d.ts`.

## Middleware/Adapter

- Express: `attachCpsRoutes(app)` exposes `/cps/resolve` and `/cps/debug` for quick integration in existing apps.

## 📄 License

MIT License — see LICENSE for details.

## 🤝 Contributing

Contributions are welcome. Please:

1. Fork the project
2. Create your feature branch (`git checkout -b feature/new-functionality`)
3. Commit your changes (`git commit -m 'Add: new functionality'`)
4. Push to the branch (`git push origin feature/new-functionality`)
5. Open a Pull Request

---

**PromptSheet.dev** — Where every component has its own rules. 🚀
