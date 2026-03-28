const express = require('express');
const path = require('path');
const http = require('http');
const PromptResolver = require('./prompt-resolver');
const { estimateTokens, enforceTokenLimit } = require('./metrics');

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const projectRoot = path.join(__dirname, '..');
const resolver = new PromptResolver(projectRoot);

app.use(express.static('public', { index: false }));
app.use(express.json());

// API to generate governed prompt
app.post('/api/generate-prompt', async (req, res) => {
    try {
        const { filePath, userPrompt, maxTokens } = req.body;
        
        if (!userPrompt) {
            return res.status(400).json({ error: 'userPrompt is required' });
        }
        
        const enhancedPrompt = await resolver.generatePrompt(filePath || '.', userPrompt);
        const originalTokens = estimateTokens(enhancedPrompt);
        const limited = enforceTokenLimit(enhancedPrompt, maxTokens);
        
        res.json({
            success: true,
            originalPrompt: userPrompt,
            enhancedPrompt: limited.text,
            filePath: filePath || '.',
            tokens: {
                original: originalTokens,
                final: limited.tokens,
                truncated: !!limited.truncated
            }
        });
    } catch (error) {
        res.status(500).json({ 
            error: 'Error generating prompt', 
            details: error.message 
        });
    }
});

// API to list found .prompt files
app.get('/api/prompts/:filePath?', async (req, res) => {
    try {
        const filePath = req.params.filePath || '.';
        const prompts = await resolver.loadPromptFiles(filePath);
        
        res.json({
            success: true,
            filePath,
            prompts,
            count: prompts.length
        });
    } catch (error) {
        res.status(500).json({ 
            error: 'Error loading prompts', 
            details: error.message 
        });
    }
});

app.post('/api/resolve-debug', async (req, res) => {
    try {
        const { filePath, userPrompt } = req.body || {};
        const targetPath = filePath || '.';
        const debug = await resolver.resolveDebug(targetPath, userPrompt || '');

        res.json({
            success: true,
            ...debug
        });
    } catch (error) {
        res.status(500).json({
            error: 'Error resolving debug',
            details: error.message
        });
    }
});

// Serve landing page
app.get('/', (req, res) => {
    const homePath = path.join(__dirname, '..', 'public', 'index.html');
    console.log('Serving home page:', homePath);
    res.sendFile(homePath);
});

// Explicit alias for index.html
app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('/docs', (req, res) => {
    res.redirect('/#implementation');
});

app.get('/docs.html', (req, res) => {
    res.redirect('/#implementation');
});

function startServer(initialPort) {
    let p = initialPort;
    function attempt() {
        const server = http.createServer(app);
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                p += 1;
                attempt();
            } else {
                throw err;
            }
        });
        server.listen(p, () => {
            console.log(`🚀 PromptSheet.dev Demo Server running at http://localhost:${p}`);
            console.log('📁 Root directory:', projectRoot);
        });
    }
    attempt();
}
startServer(port);
