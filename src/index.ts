import { commands } from './commands/index.ts';
import { writeFileSync, mkdirSync, appendFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkCursorRules } from './cursorrules.ts';

// Get the directory name of the current module
const __dirname = dirname(fileURLToPath(import.meta.url));

// Helper function to normalize argument keys
function normalizeArgKey(key: string): string {
  // Convert from kebab-case to lowercase without hyphens
  return key.toLowerCase().replace(/-/g, '');
}

// Helper function to convert camelCase to kebab-case
function toKebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

type StringOption =
  | 'model'
  | 'fromGithub'
  | 'output'
  | 'saveTo'
  | 'hint'
  | 'url'
  | 'screenshot'
  | 'viewport'
  | 'selector'
  | 'wait'
  | 'video'
  | 'evaluate';
type NumberOption = 'maxTokens' | 'timeout' | 'connectTo';
type BooleanOption = 'console' | 'html' | 'network' | 'headless' | 'text' | 'debug';

interface Options
  extends Record<StringOption, string | undefined>,
    Record<NumberOption, number | undefined>,
    Record<BooleanOption, boolean | undefined> {}

type OptionKey = StringOption | NumberOption | BooleanOption;

// Map of normalized keys to their option names in the options object
const OPTION_KEYS: Record<string, OptionKey> = {
  model: 'model',
  maxtokens: 'maxTokens',
  output: 'output',
  saveto: 'saveTo',
  fromgithub: 'fromGithub',
  hint: 'hint',
  // Browser command options
  url: 'url',
  console: 'console',
  html: 'html',
  screenshot: 'screenshot',
  network: 'network',
  timeout: 'timeout',
  viewport: 'viewport',
  headless: 'headless',
  connectto: 'connectTo',
  selector: 'selector',
  text: 'text',
  wait: 'wait',
  debug: 'debug',
  video: 'video',
  evaluate: 'evaluate',
};

// Set of option keys that are boolean flags (don't require a value)
const BOOLEAN_OPTIONS = new Set<BooleanOption>([
  'console',
  'html',
  'network',
  'headless',
  'text',
  'debug',
]);

// Set of option keys that require numeric values
const NUMERIC_OPTIONS = new Set<NumberOption>(['maxTokens', 'timeout', 'connectTo']);

async function main() {
  const [, , command, ...args] = process.argv;

  // Handle version command
  if (command === 'version' || command === '-v' || command === '--version') {
    try {
      const packageJsonPath = join(__dirname, '../package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      console.log(`cursor-tools version ${packageJson.version}`);
      process.exit(0);
    } catch {
      console.error('Error: Could not read package version');
      process.exit(1);
    }
  }

  // Parse options from args
  const options: Options = {
    // String options
    model: undefined,
    fromGithub: undefined,
    output: undefined,
    saveTo: undefined,
    hint: undefined,
    url: undefined,
    screenshot: undefined,
    viewport: undefined,
    selector: undefined,
    wait: undefined,
    video: undefined,
    evaluate: undefined,
    // Number options
    maxTokens: undefined,
    timeout: undefined,
    connectTo: undefined,
    // Boolean options
    console: undefined,
    html: undefined,
    network: undefined,
    headless: undefined,
    text: undefined,
    debug: undefined,
  };
  const queryArgs: string[] = [];

  // 解析命令行参数，构建键值对
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      let key: string;
      let value: string | undefined;
      let isNoPrefix = false;
      /**
       * flag 格式为 --no-key 的行为:
       * --no-[key]/--[key] false -> {key: false} 禁用配置项
       * --[key] true -> {key: true} 启用配置项
       * 
       * e.g. 
       * --no-console/--console false -> 禁止捕获浏览器log
       * --console true -> 开启捕获浏览器log
       * 
       * 
       * 
       * flag 格式为 --key 的行为:
       * --[key] [val] -> {key: val} 设置该配置项的值为传进来的val
       * 
       * e.g. 
       * --output docs.md -> 文档输出路径为 docs.md 
       */
      if (arg.startsWith('--no-')) {
        // --no-key format for boolean options
        key = arg.slice(5); // Remove --no- prefix
        const normalizedKey = normalizeArgKey(key.toLowerCase());
        const optionKey = OPTION_KEYS[normalizedKey];
        if (BOOLEAN_OPTIONS.has(optionKey as BooleanOption)) {
          value = 'false'; // Implicitly set boolean flag to false
          isNoPrefix = true;
        } else {
          key = arg.slice(2); // Treat as normal key if not a boolean option
        }
      } else {
        // --key value format
        key = arg.slice(2);
      }

      // For boolean flags without --no- prefix, check next argument for explicit true/false
      const normalizedKey = normalizeArgKey(key.toLowerCase());
      const optionKey = OPTION_KEYS[normalizedKey];
      if (!isNoPrefix) {
        if (BOOLEAN_OPTIONS.has(optionKey as BooleanOption)) {
          // For boolean options, directly set value to true
          value = 'true';
        } else {
          // For non-boolean options, look for a value
          if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
            value = args[i + 1];
            i++; // Skip the next argument since we've used it as the value
          }
        }
      }

      if (!optionKey) {
        console.error(`【错误】'--${key}' 不是一个有效的flag`);
        console.error(
          '【可用flag】:',
          Array.from(new Set(Object.values(OPTION_KEYS)))
            .map((k) => `--${toKebabCase(k)}`)
            .join(', ')
        );
        process.exit(1);
      }

      if (value === undefined && !BOOLEAN_OPTIONS.has(optionKey as BooleanOption)) {
        console.error(`【错误】'--${key}' 需要一个值`);
        process.exit(1);
      }

      if (NUMERIC_OPTIONS.has(optionKey as NumberOption)) {
        const num = parseInt(value!, 10);
        if (isNaN(num)) {
          console.error(`【错误】${optionKey} 必须是一个数字`);
          process.exit(1);
        }
        options[optionKey as NumberOption] = num;
      } else if (BOOLEAN_OPTIONS.has(optionKey as BooleanOption)) {
        options[optionKey as BooleanOption] = value === 'true';
      } else if (value !== undefined) {
        options[optionKey as StringOption] = value;
      }
    } else {
      queryArgs.push(arg);
    }
  }

  const query = command === 'install' && queryArgs.length === 0 ? '.' : queryArgs.join(' ');

  if (!command) {
    console.error(
      'Usage: cursor-tools [--model <model>] [--max-tokens <number>] [--from-github <github_url>] [--output <filepath>] [--save-to <filepath>] [--hint <hint>] <command> "<query>"\n' +
        '       Note: Options can be specified in kebab-case (--max-tokens) or camelCase (--maxTokens)\n'
    );
    process.exit(1);
  }

  if (!query) {
    if (command === 'doc') {
      // no query for doc command is ok
    } else {
      console.error(`【错误】${command} 需要一个查询参数`);
      process.exit(1);
    }
  }

  const commandHandler = commands[command];
  if (!commandHandler) {
    console.error(`【错误】${command} 不是一个有效的命令`);
    console.error('【可用命令】: ' + Object.keys(commands).join(', '));
    process.exit(1);
  }

  // Check .cursorrules version unless running the install command
  if (command !== 'install') {
    const result = checkCursorRules(process.cwd());
    if (result.kind === 'success' && result.needsUpdate && result.message) {
      console.error('\x1b[33m%s\x1b[0m', `【警告】${result.message}`); // Yellow text
    } else if (result.kind === 'error') {
      console.error('\x1b[31m%s\x1b[0m', `【错误】${result.message}`); // Red text
    }
  }

  try {
    // If saveTo is specified, ensure the directory exists and clear any existing file
    if (options.saveTo) {
      const dir = dirname(options.saveTo);
      if (dir !== '.') {
        try {
          mkdirSync(dir, { recursive: true });
        } catch (err) {
          console.error(`【错误】创建目录 ${dir} 失败`, err);
          console.error('输出不会保存到文件');
          options.saveTo = undefined;
        }
      }
      // Clear the file if it exists
      if (options.saveTo) {
        // Additional check after potential undefined assignment above
        try {
          writeFileSync(options.saveTo, '');
        } catch (err) {
          console.error(`【错误】清除文件 ${options.saveTo} 失败`, err);
          console.error('输出不会保存到文件');
          options.saveTo = undefined;
        }
      }
    }

    // 生成式执行注册的命令类
    for await (const output of commandHandler.execute(query, options)) {
      process.stdout.write(output);
      if (options.saveTo) {
        try {
          appendFileSync(options.saveTo, output);
        } catch (err) {
          console.error(`【错误】写入文件 ${options.saveTo} 失败`, err);
          // Disable file writing for subsequent outputs
          options.saveTo = undefined;
        }
      }
    }
    // this should flush stderr and stdout and write a newline
    console.log('');
    console.error('');

    if (options.saveTo) {
      console.log(`输出文件已保存到: ${options.saveTo}`);
    }
  } catch (error) {
    console.error('【错误】', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('【错误】', error);
    process.exit(1);
  });
