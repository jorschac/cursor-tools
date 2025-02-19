export const ignorePatterns = [
  '**/*.pbxproj',
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/compile/**',
  '**/.*/**',
  '**/*.spec.*',
  '**/*.pyc',
  '**/*.env',
  '**/*.env.*',
  '**/*.lock',
  '**/*.lockb',
  '**/package-lock.*',
  '**/pnpm-lock.*',
  '**/*.tsbuildinfo',
];

export const includePatterns = ['**/*', '!.cursorrules', '!.cursor/rules/cursor-tools.mdc'];

export const outputOptions = {
  // 针对ai的结构化
  style: 'xml',
  fileSummary: true,
  // 开启代码压缩可以省令牌
  compress: false,
  // 目录结构
  directoryStructure: false,
  // 移除注释
  removeComments: false,
  // 移除空行
  removeEmptyLines: true,
  // 顶部文件数量
  topFilesLength: 20,
  // 显示行号
  showLineNumbers: false,
  // 复制到剪贴板
  copyToClipboard: false,
  // 包含空目录
  includeEmptyDirectories: true,
  // 可解析的样式
  parsableStyle: false,
} as const;
