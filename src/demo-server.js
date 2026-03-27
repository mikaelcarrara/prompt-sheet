const express = require('express');
const path = require('path');
const http = require('http');
const PromptResolver = require('./prompt-resolver');

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const resolver = new PromptResolver(__dirname);

app.use(express.static('public', { index: false }));
app.use(express.json());

// API para gerar prompt com governança
app.post('/api/generate-prompt', async (req, res) => {
    try {
        const { filePath, userPrompt } = req.body;
        
        if (!userPrompt) {
            return res.status(400).json({ error: 'userPrompt é obrigatório' });
        }
        
        const enhancedPrompt = await resolver.generatePrompt(filePath || '.', userPrompt);
        
        res.json({
            success: true,
            originalPrompt: userPrompt,
            enhancedPrompt,
            filePath: filePath || '.'
        });
    } catch (error) {
        res.status(500).json({ 
            error: 'Erro ao gerar prompt', 
            details: error.message 
        });
    }
});

// API para listar arquivos .prompt encontrados
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
            error: 'Erro ao carregar prompts', 
            details: error.message 
        });
    }
});

// Servir página principal (landing page)
app.get('/', (req, res) => {
    const homePath = path.join(__dirname, '..', 'index.html');
    console.log('Servindo home page:', homePath);
    res.sendFile(homePath);
});

// Alias explícito para index.html
app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.get('/docs.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'docs.html'));
});

app.get('/docs', (req, res) => {
    res.redirect('/docs.html');
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
            console.log(`🚀 PromptSheet.dev Demo Server rodando em http://localhost:${p}`);
            console.log('📁 Diretório raiz:', __dirname);
        });
    }
    attempt();
}
startServer(port);
