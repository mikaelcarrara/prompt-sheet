export interface PromptSections {
  [section: string]: Record<string, string | number | boolean | string[]>;
}

export interface PromptDescriptor {
  component: string;
  context?: string;
  sections: PromptSections;
  sourceFile?: string;
}

export class PromptResolver {
  constructor(rootPath?: string);
  loadPromptFiles(filePath: string): Promise<PromptDescriptor[]>;
  generatePrompt(filePath: string, userPrompt: string): Promise<string>;
  resolveDebug(filePath: string, userPrompt?: string): Promise<{
    filePath: string;
    resolvedDirectory: string;
    orderedPromptFiles: string[];
    promptCount: number;
    prompts: PromptDescriptor[];
    effectiveSections: PromptSections;
    enhancedPrompt: string;
  }>;
  clearCache(): void;
}
