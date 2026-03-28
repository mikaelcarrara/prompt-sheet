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
        const dir = this.getTargetDirectory(filePath);
        if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
            throw new Error(`Diretório não encontrado para filePath "${filePath}": ${dir}`);
        }
        
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
        const files = this.getGlobalPromptFilePaths(currentDir);
        for (const filePath of files) {
            const content = await this.parsePromptFile(filePath);
            prompts.push(...content);
        }
    }

    /**
     * Carrega prompts locais do diretório atual
     */
    async loadLocalPrompts(dir, prompts) {
        const files = this.getLocalPromptFilePaths(dir);
        
        for (const filePath of files) {
            const content = await this.parsePromptFile(filePath);
            prompts.push(...content);
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
        
        for (let i = 0; i < lines.length; i += 1) {
            const line = lines[i];
            const trimmed = line.trim();
            const lineNumber = i + 1;
            if (!trimmed || trimmed.startsWith('#')) {
                continue;
            }
            
            // Metadata
            if (trimmed.startsWith('[component:')) {
                const componentMatch = trimmed.match(/\[component:\s*(.+?)\s*\]/);
                if (!componentMatch) {
                    throw new Error(`Metadata [component] inválido em ${filePath}:${lineNumber}`);
                }
                if (currentPrompt) prompts.push(currentPrompt);
                currentPrompt = {
                    component: componentMatch[1],
                    sections: {}
                };
                continue;
            }
            
            if (trimmed.startsWith('[context:')) {
                if (!currentPrompt) {
                    throw new Error(`Metadata [context] sem [component] em ${filePath}:${lineNumber}`);
                }
                const contextMatch = trimmed.match(/\[context:\s*(.+?)\s*\]/);
                if (!contextMatch) {
                    throw new Error(`Metadata [context] inválido em ${filePath}:${lineNumber}`);
                }
                if (currentPrompt) {
                    currentPrompt.context = contextMatch[1];
                }
                continue;
            }
            
            // Sections
            if (trimmed.startsWith('@')) {
                if (!currentPrompt) {
                    throw new Error(`Seção sem [component] em ${filePath}:${lineNumber}`);
                }
                currentSection = trimmed.substring(1);
                if (!currentSection) {
                    throw new Error(`Nome de seção vazio em ${filePath}:${lineNumber}`);
                }
                if (currentPrompt && !currentPrompt.sections[currentSection]) {
                    currentPrompt.sections[currentSection] = {};
                }
                continue;
            }
            
            // Properties
            if (trimmed.includes(':') && currentPrompt && currentSection) {
                const [key, ...valueParts] = trimmed.split(':');
                const normalizedKey = key.trim().replace(/^-+\s*/, '');
                const value = valueParts.join(':').trim();

                if (!normalizedKey) {
                    throw new Error(`Chave vazia em ${filePath}:${lineNumber}`);
                }

                if (value.startsWith('[') && value.endsWith(']')) {
                    try {
                        currentPrompt.sections[currentSection][normalizedKey] = JSON.parse(value);
                    } catch (error) {
                        throw new Error(`Array inválido para "${normalizedKey}" em ${filePath}:${lineNumber}`);
                    }
                    continue;
                }

                if (value === 'true' || value === 'false') {
                    currentPrompt.sections[currentSection][normalizedKey] = value === 'true';
                    continue;
                }

                if (!Number.isNaN(Number(value)) && value !== '') {
                    currentPrompt.sections[currentSection][normalizedKey] = Number(value);
                    continue;
                }

                if (
                    (value.startsWith('"') && value.endsWith('"')) ||
                    (value.startsWith("'") && value.endsWith("'"))
                ) {
                    currentPrompt.sections[currentSection][normalizedKey] = value.slice(1, -1);
                    continue;
                }

                currentPrompt.sections[currentSection][normalizedKey] = value;
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
        const effectiveSections = this.mergePromptRules(prompts);
        
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

        if (Object.keys(effectiveSections).length > 0) {
            systemPrompt += '## Regras Efetivas\n';
            for (const [section, rules] of Object.entries(effectiveSections)) {
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

    async resolveDebug(filePath, userPrompt = '') {
        const dir = this.getTargetDirectory(filePath);
        if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
            throw new Error(`Diretório não encontrado para filePath "${filePath}": ${dir}`);
        }

        const orderedFiles = this.getOrderedPromptFilePaths(dir);
        const prompts = [];
        for (const file of orderedFiles) {
            const parsed = await this.parsePromptFile(file);
            prompts.push(
                ...parsed.map((item) => ({
                    ...item,
                    sourceFile: path.relative(this.rootPath, file) || path.basename(file)
                }))
            );
        }

        const effectiveSections = this.mergePromptRules(prompts);
        const enhancedPrompt = await this.generatePrompt(filePath, userPrompt);

        return {
            filePath,
            resolvedDirectory: dir,
            orderedPromptFiles: orderedFiles.map((file) => path.relative(this.rootPath, file) || path.basename(file)),
            promptCount: prompts.length,
            prompts,
            effectiveSections,
            enhancedPrompt
        };
    }

    getTargetDirectory(filePath) {
        const resolvedPath = path.resolve(this.rootPath, filePath);
        return path.dirname(resolvedPath);
    }

    getGlobalPromptFilePaths(currentDir) {
        const chain = [];
        let dir = currentDir;
        while (dir && dir.startsWith(this.rootPath)) {
            chain.push(dir);
            const parentDir = path.dirname(dir);
            if (parentDir === dir) {
                break;
            }
            dir = parentDir;
        }

        const ordered = chain.reverse();
        const files = [];
        for (const directory of ordered) {
            const globalPrompt = path.join(directory, 'global.prompt');
            if (fs.existsSync(globalPrompt) && fs.statSync(globalPrompt).isFile()) {
                files.push(globalPrompt);
            }
        }
        return files;
    }

    getLocalPromptFilePaths(dir) {
        if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
            return [];
        }

        return fs
            .readdirSync(dir)
            .sort((a, b) => a.localeCompare(b))
            .filter((file) => file.endsWith('.prompt') && file !== 'global.prompt')
            .map((file) => path.join(dir, file));
    }

    getOrderedPromptFilePaths(dir) {
        return [
            ...this.getGlobalPromptFilePaths(dir),
            ...this.getLocalPromptFilePaths(dir)
        ];
    }

    mergePromptRules(prompts) {
        const merged = {};
        for (const prompt of prompts) {
            for (const [section, rules] of Object.entries(prompt.sections)) {
                if (!merged[section]) {
                    merged[section] = {};
                }
                for (const [key, value] of Object.entries(rules)) {
                    const existing = merged[section][key];
                    merged[section][key] = this.mergeRuleValue(existing, value);
                }
            }
        }
        return merged;
    }

    mergeRuleValue(existing, incoming) {
        if (Array.isArray(existing) && Array.isArray(incoming)) {
            const merged = [...existing];
            for (const item of incoming) {
                if (!merged.includes(item)) {
                    merged.push(item);
                }
            }
            return merged;
        }
        if (Array.isArray(incoming)) {
            return [...incoming];
        }
        return incoming;
    }

    /**
     * Limpa o cache
     */
    clearCache() {
        this.cache.clear();
    }
}

module.exports = PromptResolver;
