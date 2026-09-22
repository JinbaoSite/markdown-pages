#!/usr/bin/env node
import process from 'node:process';
import { buildSite } from '../src/site-builder.js';

const args = process.argv.slice(2);
const command = args.shift();
if (!command || args.includes('--help') || args.includes('-h')) {
  console.log(`用法: markdown-blog build [选项]
  --source <目录>       Markdown 仓库目录，默认当前目录
  --output <目录>       输出目录，默认 _site
  --title <名称>        博客名称
  --author <作者>       作者名称
  --description <介绍>  首页介绍
  --base-url <路径>     Project Pages 子路径，默认 /
  --cname <域名>        生成 CNAME 文件`);
  process.exit(0);
}
if (command !== 'build') throw new Error(`未知命令: ${command}`);
const options = {};
const names = { '--source': 'source', '--output': 'output', '--title': 'title', '--author': 'author', '--description': 'description', '--base-url': 'baseUrl', '--cname': 'cname', '--logo': 'logo' };
for (let index = 0; index < args.length; index += 1) {
  const key = names[args[index]];
  if (!key) throw new Error(`未知参数: ${args[index]}`);
  const value = args[++index];
  if (!value) throw new Error(`${args[index - 1]} 缺少值`);
  options[key] = value;
}
const result = await buildSite(options);
console.log(`已生成 ${result.posts} 篇文章、${result.categories} 个分类 → ${result.output}`);
