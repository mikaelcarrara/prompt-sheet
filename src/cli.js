#!/usr/bin/env node
const path = require('path');
const PromptResolver = require('./prompt-resolver');
const { enforceTokenLimit, estimateTokens } = require('./metrics');

function printUsage() {
  console.log('Usage:');
  console.log('  cps resolve <filePath> "<userPrompt>" [--maxTokens <n>] [--json]');
  console.log('');
  console.log('Examples:');
  console.log('  cps resolve examples/components/Button.jsx "Create button with aria-label"');
  console.log('  cps resolve . "Generate accessible form" --maxTokens 2048 --json');
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2 || args[0] !== 'resolve') {
    printUsage();
    process.exit(args[0] ? 1 : 0);
  }
  const filePath = args[1];
  const promptArg = args[2] || '';
  const maxIdx = args.indexOf('--maxTokens');
  const jsonIdx = args.indexOf('--json');
  const maxTokens = maxIdx !== -1 ? parseInt(args[maxIdx + 1], 10) : undefined;
  const asJson = jsonIdx !== -1;

  const resolver = new PromptResolver(process.cwd());
  const enhanced = await resolver.generatePrompt(filePath, promptArg);
  const originalTokens = estimateTokens(enhanced);
  const limited = enforceTokenLimit(enhanced, maxTokens);

  const out = {
    filePath,
    originalTokens,
    finalTokens: limited.tokens,
    truncated: limited.truncated,
    prompt: limited.text,
  };

  if (asJson) {
    console.log(JSON.stringify(out, null, 2));
  } else {
    console.log(`# filePath: ${out.filePath}`);
    console.log(`# tokens: ${out.finalTokens}${out.truncated ? ' (truncated)' : ''}`);
    console.log('');
    console.log(out.prompt);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
