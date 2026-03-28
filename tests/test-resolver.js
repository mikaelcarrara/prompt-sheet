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
            `Expected error containing "${expectedText}", received: ${error.message}`
        );
    }
    assert.ok(didThrow, 'Error was expected, but the operation completed without failure');
}

async function run() {
    const tmpRootA = createTempProject();
    writeFile(
        tmpRootA,
        'global.prompt',
        `[component: global]
[context: all]

@governance
- tone: "professional and friendly"
- language: "en-US"
- restricted-terms: ["click here", "free"]

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
- tone: "urgent and direct"
- restricted-terms: ["cheap", "free", "click here"]

@logic-constraints
- max-characters: 30
- dynamic-state: "if loading, show spinner"
`
    );
    const resolverA = new PromptResolver(tmpRootA);

    const promptsFirst = await resolverA.loadPromptFiles('components/Button.jsx');
    const promptsSecond = await resolverA.loadPromptFiles('components/Button.jsx');

    assert.strictEqual(promptsFirst.length, 2);
    assert.strictEqual(promptsFirst[0].component, 'global');
    assert.strictEqual(promptsFirst[1].component, 'action-button');
    assert.strictEqual(promptsFirst[0].sections.governance.tone, 'professional and friendly');
    assert.strictEqual(promptsFirst[0].sections['code-quality']['use-typescript'], true);
    assert.strictEqual(promptsFirst[1].sections['logic-constraints']['max-characters'], 30);
    assert.strictEqual(promptsFirst, promptsSecond);

    const mergedRules = resolverA.mergePromptRules(promptsFirst);
    assert.strictEqual(mergedRules.governance.tone, 'urgent and direct');
    assert.deepStrictEqual(mergedRules.governance['restricted-terms'], ['click here', 'free', 'cheap']);
    assert.strictEqual(mergedRules['logic-constraints']['max-characters'], 30);

    const generated = await resolverA.generatePrompt('components/Button.jsx', 'Create a button');
    assert.ok(generated.includes('## Component: global'));
    assert.ok(generated.includes('- use-typescript: true'));
    assert.ok(generated.includes('- max-characters: 30'));
    assert.ok(generated.includes('## Effective Rules'));
    assert.ok(generated.includes('- tone: urgent and direct'));
    assert.ok(generated.includes('- restricted-terms: click here, free, cheap'));
    assert.ok(generated.includes('## User Instruction'));
    assert.ok(generated.includes('Create a button'));

    const debug = await resolverA.resolveDebug('components/Button.jsx', 'Create a button');
    assert.strictEqual(debug.filePath, 'components/Button.jsx');
    assert.strictEqual(debug.promptCount, 2);
    assert.deepStrictEqual(debug.orderedPromptFiles, ['global.prompt', path.join('components', 'Button.prompt')]);
    assert.strictEqual(debug.prompts[0].sourceFile, 'global.prompt');
    assert.strictEqual(debug.prompts[1].sourceFile, path.join('components', 'Button.prompt'));
    assert.strictEqual(debug.effectiveSections.governance.tone, 'urgent and direct');
    assert.ok(debug.enhancedPrompt.includes('## Effective Rules'));

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
        'Invalid array'
    );
    fs.rmSync(tmpRootB, { recursive: true, force: true });

    const tmpRootC = createTempProject();
    const resolverC = new PromptResolver(tmpRootC);
    await shouldThrow(
        () => resolverC.loadPromptFiles('does/not/exist/file.js'),
        'Directory not found'
    );
    fs.rmSync(tmpRootC, { recursive: true, force: true });

    console.log('tests passed');
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
