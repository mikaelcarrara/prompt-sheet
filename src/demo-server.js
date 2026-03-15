const express = require('express');
const path = require('path');
const PromptResolver = require('./prompt-resolver');

const app = express();
const port = 3000;
const resolver = new PromptResolver(__dirname);

app.use(express.static('public'));
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
    const landingPath = path.join(__dirname, '..', 'public', 'landing.html');
    console.log('Servindo landing page:', landingPath);
    res.sendFile(landingPath);
});

// Servir demo como página secundária
app.get('/demo', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`🚀 PromptSheet.dev Demo Server rodando em http://localhost:${port}`);
    console.log('📁 Diretório raiz:', __dirname);
});
