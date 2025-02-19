import type { CommandMap } from '../types.ts';
import { WebCommand } from './web.ts';
import { RepoCommand } from './repo.ts';
import { InstallCommand } from './install.ts';
import { DocCommand } from './doc.ts';
import { GithubCommand } from './github.ts';
import { BrowserCommand } from './browser/browserCommand.ts';

export const commands: CommandMap = {
  // 网络搜索能力，需要perplexity的api key  
  web: new WebCommand(),
  // 结合仓库内容问问Gemini的建议
  repo: new RepoCommand(),
  // cursor的安装和初始化
  install: new InstallCommand(),
  // 生成文档相关能力
  doc: new DocCommand(),
  // 获取github信息相关能力，拉取本仓库指定PR/commits等
  github: new GithubCommand(),
  // 浏览器自动化
  browser: new BrowserCommand(),
};
