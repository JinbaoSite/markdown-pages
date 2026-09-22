import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildSite } from '../src/site-builder.js';

test('builds a complete blog from markdown folders', async () => {
  const temporary = await mkdtemp(path.join(tmpdir(), 'markdown-blog-test-'));
  const source = path.join(temporary, 'content');
  const output = path.join(temporary, '_site');
  await mkdir(path.join(source, 'llm'), { recursive: true });
  await writeFile(path.join(source, 'llm', 'attention.md'), '# Attention\n\n## Formula\n\n$E=mc^2$');
  await writeFile(path.join(source, '_config.yaml'), 'title: Config Blog\nauthor: Config Author\ncategories:\n  llm: 大语言模型\n');
  await writeFile(path.join(source, 'custom.html'), '<h1>Custom page</h1>');
  try {
    const result = await buildSite({ source, output, title: 'Test Blog', baseUrl: '/docs/', cname: 'example.com' });
    assert.deepEqual({ posts: result.posts, categories: result.categories }, { posts: 1, categories: 1 });
    const home = await readFile(path.join(output, 'index.html'), 'utf8');
    const categoryPage = await readFile(path.join(output, 'llm/index.html'), 'utf8');
    const article = await readFile(path.join(output, 'llm/attention/index.html'), 'utf8');
    const legacyArticle = await readFile(path.join(output, 'llm/attention.html'), 'utf8');
    assert.match(home, /Test Blog/);
    assert.doesNotMatch(home, /大语言模型/);
    assert.match(categoryPage, /大语言模型/);
    assert.doesNotMatch(home, /href="\/docs\/llm\/attention\/"/);
    assert.match(categoryPage, /href="\/docs\/llm\/attention\/"/);
    assert.match(home, /LEARNING BY DOING/);
    assert.doesNotMatch(home, /最近文章/);
    assert.doesNotMatch(home, /class="category-card"/);
    assert.match(home, /class="code-rain"/);
    assert.match(home, /Blog compiled successfully/);
    assert.match(article, /<aside class="article-toc">/);
    assert.match(article, /<mjx-container/);
    assert.equal(legacyArticle, article);
    assert.equal(await readFile(path.join(output, 'custom.html'), 'utf8'), '<h1>Custom page</h1>');
    assert.equal(await readFile(path.join(output, 'CNAME'), 'utf8'), 'example.com\n');
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
