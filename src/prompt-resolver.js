const fs = require('fs');
const path = require('path');

class PromptResolver {
    constructor(rootPath = '.') {
        this.rootPath = path.resolve(rootPath);
        this.cache = new Map();
    }

    /**
     * Reads all .prompt files in the directory tree
     */
    async loadPromptFiles(filePath) {
        const dir = this.getTargetDirectory(filePath);
        if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
            throw new Error(`Directory not found for filePath "${filePath}": ${dir}`);
        }
        
        // Check cache first
        const cacheKey = dir;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const prompts = [];
        
        // Load global prompts first (inheritance)
        await this.loadGlobalPrompts(dir, prompts);
        
        // Load local prompts (specificity)
        await this.loadLocalPrompts(dir, prompts);
        
        // Cache result
        this.cache.set(cacheKey, prompts);
        
        return prompts;
    }

    /**
     * Loads global prompts from root down (inheritance)
     */
    async loadGlobalPrompts(currentDir, prompts) {
        const files = this.getGlobalPromptFilePaths(currentDir);
        for (const filePath of files) {
            const content = await this.parsePromptFile(filePath);
            prompts.push(...content);
        }
    }

    /**
     * Loads local prompts from the current directory
     */
    async loadLocalPrompts(dir, prompts) {
        const files = this.getLocalPromptFilePaths(dir);
        
        for (const filePath of files) {
            const content = await this.parsePromptFile(filePath);
            prompts.push(...content);
        }
    }

    /**
     * Parses a .prompt file
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
                    throw new Error(`Invalid [component] metadata at ${filePath}:${lineNumber}`);
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
                    throw new Error(`[context] metadata without prior [component] at ${filePath}:${lineNumber}`);
                }
                const contextMatch = trimmed.match(/\[context:\s*(.+?)\s*\]/);
                if (!contextMatch) {
                    throw new Error(`Invalid [context] metadata at ${filePath}:${lineNumber}`);
                }
                if (currentPrompt) {
                    currentPrompt.context = contextMatch[1];
                }
                continue;
            }
            
            // Sections
            if (trimmed.startsWith('@')) {
                if (!currentPrompt) {
                    throw new Error(`Section without [component] at ${filePath}:${lineNumber}`);
                }
                currentSection = trimmed.substring(1);
                if (!currentSection) {
                    throw new Error(`Empty section name at ${filePath}:${lineNumber}`);
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
                    throw new Error(`Empty key at ${filePath}:${lineNumber}`);
                }

                if (value.startsWith('[') && value.endsWith(']')) {
                    try {
                        currentPrompt.sections[currentSection][normalizedKey] = JSON.parse(value);
                    } catch (error) {
                        throw new Error(`Invalid array for "${normalizedKey}" at ${filePath}:${lineNumber}`);
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
     * Generates the final prompt for the AI based on .prompt files
     */
    async generatePrompt(filePath, userPrompt) {
        const prompts = await this.loadPromptFiles(filePath);
        const effectiveSections = this.mergePromptRules(prompts);
        
        let systemPrompt = '# AI Governance - PromptSheet.dev\n\n';
        systemPrompt += 'Applicable rules based on found .prompt files:\n\n';
        
        for (const prompt of prompts) {
            systemPrompt += `## Component: ${prompt.component}\n`;
            if (prompt.context) {
                systemPrompt += `Context: ${prompt.context}\n`;
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
            systemPrompt += '## Effective Rules\n';
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
        
        systemPrompt += '## User Instruction\n';
        systemPrompt += userPrompt;
        
        return systemPrompt;
    }

    async resolveDebug(filePath, userPrompt = '') {
        const dir = this.getTargetDirectory(filePath);
        if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
            throw new Error(`Directory not found for filePath "${filePath}": ${dir}`);
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
     * Clears the cache
     */
    clearCache() {
        this.cache.clear();
    }
}

module.exports = PromptResolver;
