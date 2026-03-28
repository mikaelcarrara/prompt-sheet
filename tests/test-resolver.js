const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const PromptResolver = require('../src/prompt-resolver');

function writeFile(baseDir, relativePath, content) {
    const filePath = path.join(baseDir, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
}

function createTempProject() {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'promptsheet-'));
    return tmpRoot;
}

async function shouldThrow(asyncFn, expectedText) {
    let didThrow = false;
    try {
        await asyncFn();
    } catch (error) {
        didThrow = true;
        assert.ok(
            String(error.message).includes(expectedText),
            `Erro esperado contendo "${expectedText}", recebido: ${error.message}`
        );
    }
    assert.ok(didThrow, 'Era esperado erro, mas a operação concluiu sem falha');
}

async function run() {
    const tmpRootA = createTempProject();
    writeFile(
        tmpRootA,
        'global.prompt',
        `[component: global]
[context: all]

@governance
- tone: "profissional e amigável"
- language: "pt-BR"
- restricted-terms: ["click aqui"]

@code-quality
- use-typescript: true
`
    );
    writeFile(
        tmpRootA,
        'components/Button.prompt',
        `[component: action-button]
[context: checkout]

@governance
- tone: "urgente e direto"
- restricted-terms: ["grátis", "click aqui"]

@logic-constraints
- max-characters: 30
- dynamic-state: "se loading, exibir spinner"
`
    );
    const resolverA = new PromptResolver(tmpRootA);

    const promptsFirst = await resolverA.loadPromptFiles('components/Button.jsx');
    const promptsSecond = await resolverA.loadPromptFiles('components/Button.jsx');

    assert.strictEqual(promptsFirst.length, 2);
    assert.strictEqual(promptsFirst[0].component, 'global');
    assert.strictEqual(promptsFirst[1].component, 'action-button');
    assert.strictEqual(promptsFirst[0].sections.governance.tone, 'profissional e amigável');
    assert.strictEqual(promptsFirst[0].sections['code-quality']['use-typescript'], true);
    assert.strictEqual(promptsFirst[1].sections['logic-constraints']['max-characters'], 30);
    assert.strictEqual(promptsFirst, promptsSecond);

    const mergedRules = resolverA.mergePromptRules(promptsFirst);
    assert.strictEqual(mergedRules.governance.tone, 'urgente e direto');
    assert.deepStrictEqual(mergedRules.governance['restricted-terms'], ['click aqui', 'grátis']);
    assert.strictEqual(mergedRules['logic-constraints']['max-characters'], 30);

    const generated = await resolverA.generatePrompt('components/Button.jsx', 'Crie um botão');
    assert.ok(generated.includes('## Componente: global'));
    assert.ok(generated.includes('- use-typescript: true'));
    assert.ok(generated.includes('- max-characters: 30'));
    assert.ok(generated.includes('## Regras Efetivas'));
    assert.ok(generated.includes('- tone: urgente e direto'));
    assert.ok(generated.includes('- restricted-terms: click aqui, grátis'));
    assert.ok(generated.includes('## Instrução do Usuário'));
    assert.ok(generated.includes('Crie um botão'));

    const debug = await resolverA.resolveDebug('components/Button.jsx', 'Crie um botão');
    assert.strictEqual(debug.filePath, 'components/Button.jsx');
    assert.strictEqual(debug.promptCount, 2);
    assert.deepStrictEqual(debug.orderedPromptFiles, ['global.prompt', path.join('components', 'Button.prompt')]);
    assert.strictEqual(debug.prompts[0].sourceFile, 'global.prompt');
    assert.strictEqual(debug.prompts[1].sourceFile, path.join('components', 'Button.prompt'));
    assert.strictEqual(debug.effectiveSections.governance.tone, 'urgente e direto');
    assert.ok(debug.enhancedPrompt.includes('## Regras Efetivas'));

    fs.rmSync(tmpRootA, { recursive: true, force: true });

    const tmpRootB = createTempProject();
    writeFile(
        tmpRootB,
        'components/Broken.prompt',
        `[component: broken]
[context: malformed]

@governance
- tags: ["ok",]
`
    );
    const resolverB = new PromptResolver(tmpRootB);
    await shouldThrow(
        () => resolverB.loadPromptFiles('components/Any.file'),
        'Array inválido'
    );
    fs.rmSync(tmpRootB, { recursive: true, force: true });

    const tmpRootC = createTempProject();
    const resolverC = new PromptResolver(tmpRootC);
    await shouldThrow(
        () => resolverC.loadPromptFiles('does/not/exist/file.js'),
        'Diretório não encontrado'
    );
    fs.rmSync(tmpRootC, { recursive: true, force: true });

    console.log('tests passed');
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
