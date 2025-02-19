import type { Command, CommandGenerator, CommandOptions } from '../types.ts';
import type { Config } from '../config.ts';
import { loadConfig, loadEnv } from '../config.ts';
import { readFileSync } from 'node:fs';
import { pack } from 'repomix';
import { ignorePatterns, includePatterns, outputOptions } from '../repomix/repomixConfig.ts';
import { FRIDAY_URL, FRIDAY_API_KEY } from '../constants.ts';
export class RepoCommand implements Command {
  private config: Config;
  private FRIDAY_URL: string;

  constructor() {
    loadEnv();
    this.config = loadConfig();
    this.FRIDAY_URL = FRIDAY_URL;  
  }

  private concatURL(opts: {model: string}): string {
    return `${this.FRIDAY_URL}${opts.model}:StreamGenerateContent`;
  }

  private async fetchGeminiResponse(
    query: string,
    repoContext: string,
    options?: CommandOptions
  ): Promise<string> {
    const apiKey = FRIDAY_API_KEY;
    if (!apiKey) {
      throw new Error('FRIDAY_API_KEY environment variable is not set');
    }

    let cursorRules = '';
    try {
      cursorRules = readFileSync('.cursorrules', 'utf-8');
    } catch {
      // Ignore if .cursorrules doesn't exist
    }

    const url = this.concatURL({model: options?.model || this.config.gemini.model});

    const response = await fetch(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: cursorRules }, { text: repoContext }, { text: query }],
            },
          ],
          generationConfig: {
            maxOutputTokens: options?.maxTokens || this.config.gemini.maxTokens,
            temperature: 0.9,
            topP: 0.8,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Friday API错误 (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(`Friday API错误: ${JSON.stringify(data.error, null, 2)}`);
    }

    return data.candidates[0].content.parts[0].text;
  }

  async *execute(query: string, options?: CommandOptions): CommandGenerator {
    try {
      yield '正在打包仓库...\n';
      // https://github.com/yamadashy/repomix/blob/main/src/core/packager.ts
      const rootDirs = [process.cwd()];
      await pack(rootDirs, {
        output: {
          ...outputOptions,
          filePath: '.repomix-output.txt',
        },
        include: includePatterns,
        ignore: {
          useGitignore: true,
          useDefaultPatterns: true,
          customPatterns: ignorePatterns,
        },
        security: {
          enableSecurityCheck: false,
        },
        tokenCount: {
          encoding: this.config.tokenCount?.encoding || 'o200k_base',
        },
        // TODO: repomix支持.md格式的自定义指令，用于客制化需求，详见：https://repomix.com/zh-cn/guide/custom-instructions
        cwd: process.cwd(),
      });

      const repoContext = readFileSync('.repomix-output.txt', 'utf-8');

      const model = options?.model || this.config.gemini.model;
      yield `正在使用${model}生成回答...\n`;
      const response = await this.fetchGeminiResponse(query, repoContext, options);
      yield response;
    } catch (error) {
      if (error instanceof Error) {
        yield `错误: ${error.message}`;
      } else {
        yield '未知错误';
      }
    }
  }
}
