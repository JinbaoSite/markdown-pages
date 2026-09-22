#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
import process from 'node:process';
import { renderMarkdown } from '../src/index.js';

function usage() {
  console.log('用法: md2html <input.md|-> [-o output.html] [--title 标题] [--allow-html]');
}

const args = process.argv.slice(2);
if (args.includes('-h') || args.includes('--help')) {
  usage();
  process.exit(0);
}

let input;
let output;
let title;
let allowHtml = false;
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '-o' || arg === '--output') output = args[++index];
  else if (arg === '--title') title = args[++index];
  else if (arg === '--allow-html') allowHtml = true;
  else if (!input) input = arg;
  else throw new Error(`未知参数: ${arg}`);
}

if (!input) {
  usage();
  process.exitCode = 1;
} else {
  const markdown = input === '-'
    ? await new Promise((resolve, reject) => {
        let value = '';
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', (chunk) => { value += chunk; });
        process.stdin.on('end', () => resolve(value));
        process.stdin.on('error', reject);
      })
    : await readFile(input, 'utf8');

  const html = renderMarkdown(markdown, {
    fullDocument: true,
    title: title ?? (input === '-' ? 'Markdown Document' : basename(input, '.md')),
    allowHtml
  });

  if (output) await writeFile(output, html, 'utf8');
  else process.stdout.write(html);
}
