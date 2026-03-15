const fs = require('fs');
const path = require('path');

class PromptResolver {
    constructor(rootPath = '.') {
        this.rootPath = path.resolve(rootPath);
        this.cache = new Map();
    }

    /**
     * Lê todos os arquivos .prompt na árvore de diretórios
     */
    async loadPromptFiles(filePath) {
        const resolvedPath = path.resolve(this.rootPath, filePath);
        const dir = path.dirname(resolvedPath);
        
        // Verificar cache primeiro
        const cacheKey = dir;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const prompts = [];
        
        // Carregar prompts globais primeiro (herança)
        await this.loadGlobalPrompts(dir, prompts);
        
        // Carregar prompts locais (especificidade)
        await this.loadLocalPrompts(dir, prompts);
        
        // Cache do resultado
        this.cache.set(cacheKey, prompts);
        
        return prompts;
    }

    /**
     * Carrega prompts globais da raiz para baixo (herança)
     */
    async loadGlobalPrompts(currentDir, prompts) {
        let dir = currentDir;
        
        while (dir && dir.startsWith(this.rootPath)) {
            const globalPrompt = path.join(dir, 'global.prompt');
            if (fs.existsSync(globalPrompt)) {
                const content = await this.parsePromptFile(globalPrompt);
                prompts.unshift(...content); // Adiciona no início para manter ordem de herança
            }
            
            const parentDir = path.dirname(dir);
            if (parentDir === dir) break; // Evita loop infinito
            dir = parentDir;
        }
    }

    /**
     * Carrega prompts locais do diretório atual
     */
    async loadLocalPrompts(dir, prompts) {
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
            if (file.endsWith('.prompt') && file !== 'global.prompt') {
                const promptPath = path.join(dir, file);
                const content = await this.parsePromptFile(promptPath);
                prompts.push(...content);
            }
        }
    }

    /**
     * Parse do arquivo .prompt
     */
    async parsePromptFile(filePath) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        
        const prompts = [];
        let currentPrompt = null;
        let currentSection = null;
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            // Metadata
            if (trimmed.startsWith('[component:')) {
                if (currentPrompt) prompts.push(currentPrompt);
                currentPrompt = {
                    component: trimmed.match(/\[component: (.+)\]/)[1],
                    sections: {}
                };
                continue;
            }
            
            if (trimmed.startsWith('[context:')) {
                if (currentPrompt) {
                    currentPrompt.context = trimmed.match(/\[context: (.+)\]/)[1];
                }
                continue;
            }
            
            // Sections
            if (trimmed.startsWith('@')) {
                currentSection = trimmed.substring(1);
                if (currentPrompt && !currentPrompt.sections[currentSection]) {
                    currentPrompt.sections[currentSection] = {};
                }
                continue;
            }
            
            // Properties
            if (trimmed.includes(':') && currentPrompt && currentSection) {
                const [key, ...valueParts] = trimmed.split(':');
                const value = valueParts.join(':').trim();
                
                if (value.startsWith('[') && value.endsWith(']')) {
                    // Array
                    currentPrompt.sections[currentSection][key.trim()] = 
                        JSON.parse(value);
                } else {
                    // String
                    currentPrompt.sections[currentSection][key.trim()] = 
                        value.replace(/['"]/g, '');
                }
            }
        }
        
        if (currentPrompt) prompts.push(currentPrompt);
        return prompts;
    }

    /**
     * Gera o prompt final para a IA com base nos arquivos .prompt
     */
    async generatePrompt(filePath, userPrompt) {
        const prompts = await this.loadPromptFiles(filePath);
        
        let systemPrompt = '# Governança de IA - PromptSheet.dev\n\n';
        systemPrompt += 'Regras aplicáveis baseadas nos arquivos .prompt encontrados:\n\n';
        
        for (const prompt of prompts) {
            systemPrompt += `## Componente: ${prompt.component}\n`;
            if (prompt.context) {
                systemPrompt += `Contexto: ${prompt.context}\n`;
            }
            
            for (const [section, rules] of Object.entries(prompt.sections)) {
                systemPrompt += `### @${section}\n`;
                for (const [key, value] of Object.entries(rules)) {
                    if (Array.isArray(value)) {
                        systemPrompt += `- ${key}: ${value.join(', ')}\n`;
                    } else {
                        systemPrompt += `- ${key}: ${value}\n`;
                    }
                }
                systemPrompt += '\n';
            }
        }
        
        systemPrompt += '## Instrução do Usuário\n';
        systemPrompt += userPrompt;
        
        return systemPrompt;
    }

    /**
     * Limpa o cache
     */
    clearCache() {
        this.cache.clear();
    }
}

module.exports = PromptResolver;
