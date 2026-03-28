# PromptSheet.dev - Documentação Rápida

## Objetivo

Cascading Prompt Sheets (CPS) é uma abordagem de governança de IA por proximidade:
arquivos `.prompt` são lidos em cascata para compor regras de geração.

## Fluxo de Resolução

1. Resolver diretório de destino a partir de `filePath`
2. Carregar `global.prompt` da raiz até o diretório alvo
3. Carregar `.prompt` locais do diretório alvo
4. Fazer merge determinístico das regras
5. Gerar prompt final e, opcionalmente, diagnóstico

## Semântica de Merge

- Escalares: último valor vence
- Arrays: união sem duplicatas, preservando ordem

## API da Demo

- `POST /api/generate-prompt` gera prompt final
- `GET /api/prompts/:filePath?` lista prompts aplicáveis
- `POST /api/resolve-debug` retorna arquivos em ordem, prompts parseados, regras efetivas e prompt final

## Comandos

```bash
npm install
npm start
npm test
```
