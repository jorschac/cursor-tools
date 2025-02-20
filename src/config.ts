export interface Config {
  /**
   * perplexity配置
   */
  perplexity: {
    model: string;
    apiKey?: string;
    maxTokens?: number;
  };
  /**
   * gemini配置，考虑替换Friday
   */
  gemini: {
    model: string;
    apiKey?: string;
    maxTokens?: number;
  };
  /**
   * 文档处理配置
   */
  doc?: {
    maxRepoSizeMB?: number; // Maximum repository size in MB for remote processing
  };
  /**
   * 令牌计数配置，默认使用o200k_base 
   */ 
  tokenCount?: {
    encoding: 'o200k_base' | 'gpt2' | 'r50k_base' | 'p50k_base' | 'p50k_edit' | 'cl100k_base'; // The tokenizer encoding to use
  };
  browser?: {
    headless?: boolean; // Default headless mode (true/false)
    defaultViewport?: string; // Default viewport size (e.g. '1280x720')
    timeout?: number; // Default navigation timeout in milliseconds
  };
  /**
   * stagehand配置
   */
  stagehand?: {
    provider: 'anthropic' | 'openai';
    verbose?: boolean;
    debugDom?: boolean;
    enableCaching?: boolean;
  };
}

export const defaultConfig: Config = {
  perplexity: {
    model: 'sonar-pro',
    maxTokens: 4000,
  },
  gemini: {
    model: 'gemini-1.5-pro-001',
    maxTokens: 10000,
  },
  doc: {
    maxRepoSizeMB: 100, // Default to 100MB
  },
  tokenCount: {
    encoding: 'o200k_base', // Default to o200k_base as it's optimized for Gemini
  },
  browser: {
    headless: true,
    defaultViewport: '1280x720',
    timeout: 120000, // 120 seconds - stagehand needs a lot of time to go back and forward to LLMs
  },
  stagehand: {
    provider: 'openai',
    verbose: false,
    debugDom: false,
    enableCaching: true,
  },
};

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import dotenv from 'dotenv';

/**
 * 加载配置文件，优先从当前目录加载，然后从home目录加载（并合并默认配置），如果都没有则使用默认配置 
 * @returns 
 */
export function loadConfig(): Config {
  // Try loading from current directory first
  try {
    const localConfigPath = join(process.cwd(), 'cursor-tools.config.json');
    const localConfig = JSON.parse(readFileSync(localConfigPath, 'utf-8'));
    return { ...defaultConfig, ...localConfig };
  } catch {
    // If local config doesn't exist, try home directory
    try {
      const homeConfigPath = join(homedir(), '.cursor-tools', 'config.json');
      const homeConfig = JSON.parse(readFileSync(homeConfigPath, 'utf-8'));
      return { ...defaultConfig, ...homeConfig };
    } catch {
      // If neither config exists, return default config
      return defaultConfig;
    }
  }
}

/**
 * 把自定义的环境变量(.cursor-tools.env)加载到process.env中  
 * @returns 
 */ 
export function loadEnv(): void {
  // Try loading from current directory first
  const localEnvPath = join(process.cwd(), '.cursor-tools.env');
  if (existsSync(localEnvPath)) {
    dotenv.config({ path: localEnvPath });
    return;
  }

  // If local env doesn't exist, try home directory
  const homeEnvPath = join(homedir(), '.cursor-tools', '.env');
  if (existsSync(homeEnvPath)) {
    dotenv.config({ path: homeEnvPath });
    return;
  }

  // If neither env file exists, continue without loading
  return;
}
