import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { load as parseYaml } from 'js-yaml';
import { renderMarkdownWithMetadata } from './index.js';
import { siteStyles } from './site-styles.js';

const CATEGORY_META = {
  ml: ['机器学习', 'ML', '监督学习、集成学习与特征工程'],
  dl: ['深度学习', 'DL', '神经网络架构、训练方法与工程实践'],
  llm: ['LLM', 'LLM', '大语言模型、RAG 与推理优化'],
  recsys: ['推荐算法', 'RS', '召回、排序、特征交互与多目标学习'],
  agent: ['Agent', 'AI', '工具调用、工作流与智能体系统'],
  projects: ['项目', 'PX', '系统设计、数据竞赛与工程项目']
};

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

const normalizeBase = (value = '/') => {
  const base = `/${value}`.replace(/\/+/g, '/').replace(/\/$/, '');
  return base === '' ? '/' : `${base}/`;
};

const href = (base, pathname = '') => `${base}${pathname.replace(/^\/+/, '')}`;

async function walkSource(directory, root, output) {
  const result = { markdown: [], assets: [] };
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    if (entry.name === '_config.yaml' || entry.name === '_config.yml') continue;
    const absolute = path.join(directory, entry.name);
    if (absolute === output) continue;
    if (entry.isDirectory()) {
      const nested = await walkSource(absolute, root, output);
      result.markdown.push(...nested.markdown);
      result.assets.push(...nested.assets);
    } else if (entry.isFile()) {
      const relative = path.relative(root, absolute);
      if (entry.name.toLowerCase().endsWith('.md')) result.markdown.push(relative);
      else result.assets.push(relative);
    }
  }
  return result;
}

async function readConfig(source) {
  for (const filename of ['_config.yaml', '_config.yml']) {
    try {
      const value = parseYaml(await readFile(path.join(source, filename), 'utf8')) ?? {};
      if (typeof value !== 'object' || Array.isArray(value)) throw new Error(`${filename} 必须是 YAML 对象`);
      return value;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  return {};
}

function plainText(markdown) {
  return markdown.replace(/```[\s\S]*?```/g, '').replace(/[#>*_`$\[\]()~-]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function firstHeading(markdown, fallback) {
  return markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || fallback;
}

function categoryInfo(slug, configured = {}) {
  const [defaultName, defaultIcon, defaultDescription] = CATEGORY_META[slug]
    ?? [slug === 'posts' ? '文章' : slug, 'MD', '学习笔记与技术文章'];
  const value = configured[slug];
  const name = typeof value === 'string' ? value : value?.title ?? value?.name ?? defaultName;
  const icon = typeof value === 'object' ? value?.icon ?? defaultIcon : defaultIcon;
  const description = typeof value === 'object' ? value?.description ?? defaultDescription : defaultDescription;
  return { slug, name, icon, description };
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? String(value) : date.toISOString().slice(0, 10);
}

function layout({ config, title, description, body, active = '', extraClass = '', minimalNav = false }) {
  const base = config.baseUrl;
  const nav = minimalNav ? '' : config.categories.map(category =>
    `<a${active === category.slug ? ' class="active"' : ''} href="${href(base, `${category.slug}/`)}">${escapeHtml(category.name)}</a>`
  ).join('');
  const navigation = minimalNav ? '' : `<nav class="desktop-nav"><a${active === 'home' ? ' class="active"' : ''} href="${base}">首页</a>${nav}<a${active === 'about' ? ' class="active"' : ''} href="${href(base, 'about/')}">关于</a></nav>
<button class="menu-toggle" aria-label="打开导航" aria-expanded="false"><span></span><span></span><span></span></button>`;
  const mobileNavigation = minimalNav ? '' : `<nav class="mobile-nav"><a href="${base}">首页</a>${nav}<a href="${href(base, 'about/')}">关于</a></nav>`;
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)} · ${escapeHtml(config.title)}</title>
<meta name="description" content="${escapeHtml(description || config.description)}">
<link rel="stylesheet" href="${href(base, 'assets/blog.css')}"></head>
<body class="${extraClass}"><header class="site-header"><div class="header-inner">
<a class="brand" href="${base}"><span class="brand-icon">${escapeHtml(config.logo)}</span>${escapeHtml(config.title)}</a>
${navigation}
</div>${mobileNavigation}</header>
${body}<footer>© ${new Date().getUTCFullYear()} ${escapeHtml(config.author)}. Learning by Doing.</footer>
<script src="${href(base, 'assets/blog.js')}"></script></body></html>`;
}

function postCard(post, base) {
  return `<a class="post-card" href="${href(base, post.url)}"><div><h3>${escapeHtml(post.title)}</h3>
  <p>${escapeHtml(post.description)}</p></div><span class="post-meta">${escapeHtml(post.category.name)}${post.date ? ` · ${post.date}` : ''} →</span></a>`;
}

function tocHtml(headings) {
  if (headings.length < 2) return '';
  return `<aside class="article-toc"><strong>目录</strong><nav>${headings.map(item =>
    `<a class="toc-${item.level}" href="#${escapeHtml(item.id)}">${escapeHtml(item.text)}</a>`
  ).join('')}</nav></aside>`;
}

function rewriteMarkdownLinks(html) {
  return html.replace(/href="([^"#:?]+)\.md(#[^"]*)?"/g, 'href="$1/$2"');
}

export async function buildSite(options = {}) {
  const source = path.resolve(options.source ?? '.');
  const output = path.resolve(options.output ?? '_site');
  if (output === path.parse(output).root) throw new Error('output 不能是文件系统根目录');
  if (source === output || source.startsWith(`${output}${path.sep}`)) {
    throw new Error('source 不能位于 output 内部');
  }
  const fileConfig = await readConfig(source);
  const baseUrl = normalizeBase(options.baseUrl || fileConfig.baseUrl || fileConfig.base_url || '/');
  const files = await walkSource(source, source, output);
  const posts = [];
  for (const relative of files.markdown.sort()) {
    if (path.basename(relative).toLowerCase() === 'readme.md') continue;
    const raw = await readFile(path.join(source, relative), 'utf8');
    const parsed = matter(raw);
    if (parsed.data.draft === true) continue;
    const withoutExtension = relative.replace(/\.md$/i, '');
    const parts = withoutExtension.split(path.sep);
    const categorySlug = parts.length > 1 ? parts[0] : 'posts';
    const fallback = path.basename(withoutExtension).replace(/[-_]/g, ' ');
    posts.push({
      source: relative,
      markdown: parsed.content,
      data: parsed.data,
      title: parsed.data.title || firstHeading(parsed.content, fallback),
      description: parsed.data.description || plainText(parsed.content).slice(0, 150),
      date: formatDate(parsed.data.date),
      order: Number(parsed.data.order ?? 0),
      category: categoryInfo(parsed.data.category || categorySlug, fileConfig.categories),
      url: `${withoutExtension.split(path.sep).join('/')}/`,
      legacyUrl: `${withoutExtension.split(path.sep).join('/')}.html`
    });
  }
  const categories = [...new Map(posts.map(post => [post.category.slug, post.category])).values()];
  const config = {
    title: options.title || fileConfig.title || 'Markdown Blog',
    author: options.author || fileConfig.author || options.title || fileConfig.title || 'Author',
    description: options.description || fileConfig.description || '一个由 Markdown 与 GitHub Actions 驱动的技术博客',
    logo: options.logo || fileConfig.logo || (options.title || fileConfig.title || 'M').slice(0, 1).toUpperCase(),
    baseUrl, categories
  };

  await rm(output, { recursive: true, force: true });
  for (const relative of files.assets) {
    const target = path.join(output, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(path.join(source, relative), target);
  }
  await mkdir(path.join(output, 'assets'), { recursive: true });
  await writeFile(path.join(output, 'assets/blog.css'), siteStyles);
  await writeFile(path.join(output, 'assets/blog.js'), `document.querySelector('.menu-toggle')?.addEventListener('click',e=>{const n=document.querySelector('.mobile-nav');const open=n.classList.toggle('open');e.currentTarget.setAttribute('aria-expanded',open)});`);

  const sorted = [...posts].sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.order - a.order);
  const fallingTokens = ['const', 'ideas', '=', '[', 'learn', 'build', 'share', ']', 'async', 'await', 'run()', '{}'];
  const rain = fallingTokens.map((token, index) => `<span style="--i:${index}">${escapeHtml(token)}</span>`).join('');
  const homeBody = `<main class="animation-home"><div class="code-rain" aria-hidden="true">${rain}</div><section class="code-stage" aria-label="代码落下并运行的动画"><div class="stage-heading"><p>LEARNING BY DOING</p><h1>${escapeHtml(config.title)}</h1><span>${escapeHtml(config.description)}</span></div><div class="code-machine"><div class="machine-bar"><i></i><i></i><i></i><span>build.js</span><b>CSS ANIMATION</b></div><div class="assembled-code"><span class="code-line line-1"><em>const</em> knowledge = [];</span><span class="code-line line-2"><em>await</em> learn(knowledge);</span><span class="code-line line-3">knowledge.<strong>push</strong>(idea);</span><span class="code-line line-4"><em>return</em> publish(knowledge);</span></div><div class="run-console"><span class="run-command">$ npm run build</span><span class="run-progress"><i></i></span><span class="run-result">✓ Blog compiled successfully</span><span class="run-cursor"></span></div></div></section></main>`;
  await writeFile(path.join(output, 'index.html'), layout({ config, title: '首页', body: homeBody, active: 'home', extraClass: 'home-page', minimalNav: true }));

  for (const category of categories) {
    const categoryPosts = sorted.filter(post => post.category.slug === category.slug);
    const body = `<main class="container list-page"><p class="eyebrow">${category.icon} CATEGORY</p><h1>${escapeHtml(category.name)}</h1><p>${categoryPosts.length} 篇文章</p><div class="post-list">${categoryPosts.map(post => postCard(post, baseUrl)).join('')}</div></main>`;
    const dir = path.join(output, category.slug);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'index.html'), layout({ config, title: category.name, body, active: category.slug }));
  }

  for (const post of posts) {
    const rendered = renderMarkdownWithMetadata(post.markdown, { allowHtml: false });
    const content = rewriteMarkdownLinks(rendered.html);
    const body = `<div class="article-shell">${tocHtml(rendered.headings)}<main class="article"><div class="article-meta"><a href="${href(baseUrl, `${post.category.slug}/`)}">${post.category.icon} ${escapeHtml(post.category.name)}</a>${post.date ? `<time>${post.date}</time>` : ''}</div><article class="markdown-body">${content}</article></main></div>`;
    const document = layout({ config, title: post.title, description: post.description, body, active: post.category.slug, extraClass: 'article-page' });
    const cleanTarget = path.join(output, post.url, 'index.html');
    const legacyTarget = path.join(output, post.legacyUrl);
    await mkdir(path.dirname(cleanTarget), { recursive: true });
    await mkdir(path.dirname(legacyTarget), { recursive: true });
    await writeFile(cleanTarget, document);
    await writeFile(legacyTarget, document);
  }

  const aboutBody = `<main class="container list-page"><h1>关于</h1><p>${escapeHtml(config.description)}</p><p>所有页面均由 Markdown 自动生成，并通过 GitHub Actions 发布。</p></main>`;
  await mkdir(path.join(output, 'about'), { recursive: true });
  await writeFile(path.join(output, 'about/index.html'), layout({ config, title: '关于', body: aboutBody, active: 'about' }));
  await writeFile(path.join(output, '404.html'), layout({ config, title: '页面未找到', body: `<main class="container not-found"><h1>404</h1><p>页面不存在，<a href="${baseUrl}">返回首页</a>。</p></main>` }));
  await writeFile(path.join(output, '.nojekyll'), '');
  const cname = options.cname || fileConfig.cname;
  if (cname) await writeFile(path.join(output, 'CNAME'), `${cname}\n`);
  return { output, posts: posts.length, categories: categories.length, assets: files.assets.length };
}
