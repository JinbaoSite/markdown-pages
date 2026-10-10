import test from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from '../src/index.js';

test('renders headings and highlighted code', () => {
  const html = renderMarkdown('# Hello\n\n```js\nconst n = 1;\nconsole.log(n);\n```');
  assert.match(html, /<h1 id="hello">Hello<\/h1>/);
  assert.match(html, /class="hljs language-js"/);
  assert.match(html, /hljs-keyword/);
  assert.match(html, /class="line-numbers"[^>]*>1\n2<\/span>/);
});

test('renders inline and block math as MathJax SVG', () => {
  const html = renderMarkdown('Inline $E=mc^2$\n\n$$x^2 + y^2 = z^2$$');
  assert.match(html, /<mjx-container/);
  assert.match(html, /<svg/);
});

test('preserves unsupported legacy math without aborting rendering', () => {
  const html = renderMarkdown('$$\\require{AMScd}\\begin{CD} A @>>> B \\end{CD}$$');
  assert.match(html, /class="math-fallback math-fallback-block"/);
  assert.match(html, /\\require\{AMScd\}/);
});

test('creates a complete document and disables raw HTML by default', () => {
  const html = renderMarkdown('<script>alert(1)</script>', { fullDocument: true, title: '<Demo>' });
  assert.match(html, /^<!doctype html>/);
  assert.match(html, /<title>&lt;Demo&gt;<\/title>/);
  assert.doesNotMatch(html, /<script>/);
});

test('creates a linked table of contents for full documents', () => {
  const html = renderMarkdown('# 标题\n\n## 重复\n\n## 重复', { fullDocument: true });
  assert.match(html, /<aside class="toc"/);
  assert.match(html, /href="#标题"/);
  assert.match(html, /<h2 id="重复">重复<\/h2>/);
  assert.match(html, /<h2 id="重复-2">重复<\/h2>/);
});

test('renders inline MathJax inside table of contents headings', () => {
  const html = renderMarkdown('# 文档\n\n## 复杂度 $O(n^2)$\n\n内容', { fullDocument: true });
  const toc = html.match(/<aside class="toc"[\s\S]*?<\/aside>/)?.[0] ?? '';
  assert.match(toc, /href="#复杂度-o-n-2"/);
  assert.match(toc, /<mjx-container/);
  assert.match(toc, /<svg/);
  assert.doesNotMatch(toc, /\$O\(n\^2\)\$/);
});
