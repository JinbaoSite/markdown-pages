import MarkdownIt from 'markdown-it';
import highlightjs from 'markdown-it-highlightjs';
import mathjax3 from 'markdown-it-mathjax3';
import { defaultStyles } from './styles.js';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function slugifyHeading(text, fallback) {
  const slug = text
    .toLocaleLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
}

function renderToc(headings) {
  if (!headings.length) return '';
  const links = headings.map(({ level, text, id }) =>
    `<a class="toc-level-${level}" href="#${escapeHtml(id)}">${escapeHtml(text)}</a>`
  ).join('\n');
  return `<aside class="toc" aria-label="文章目录">
  <div class="toc-title">目录</div>
  <nav>${links}</nav>
</aside>`;
}

/** Create a configured markdown-it renderer. */
export function createRenderer(options = {}) {
  const md = new MarkdownIt({
    html: options.allowHtml ?? false,
    linkify: options.linkify ?? true,
    typographer: options.typographer ?? true,
    breaks: options.breaks ?? false
  });

  md.use(highlightjs, {
    auto: options.autoHighlight ?? true,
    code: true
  });
  md.use(mathjax3);

  // Some legacy documents request MathJax extensions that are unavailable in
  // the synchronous renderer. Keep one such formula from aborting the entire
  // static-site build and preserve its TeX as readable fallback content.
  for (const ruleName of ['math_inline', 'math_block']) {
    const mathRenderer = md.renderer.rules[ruleName];
    if (!mathRenderer) continue;
    md.renderer.rules[ruleName] = (tokens, index, rendererOptions, env, self) => {
      try {
        return mathRenderer(tokens, index, rendererOptions, env, self);
      } catch (error) {
        error?.retry?.catch?.(() => {});
        const source = escapeHtml(tokens[index].content);
        if (ruleName === 'math_inline') {
          return `<code class="math-fallback">${source}</code>`;
        }
        return `<pre class="math-fallback math-fallback-block"><code>${source}</code></pre>`;
      }
    };
  }

  md.renderer.rules.heading_open = (tokens, index, rendererOptions, env, self) => {
    const token = tokens[index];
    const inline = tokens[index + 1];
    const text = inline?.content ?? '';
    env.headings ??= [];
    env.headingIds ??= new Map();
    const base = slugifyHeading(text, `section-${env.headings.length + 1}`);
    const count = env.headingIds.get(base) ?? 0;
    env.headingIds.set(base, count + 1);
    const id = count === 0 ? base : `${base}-${count + 1}`;
    token.attrSet('id', id);
    env.headings.push({ level: Number(token.tag.slice(1)), text, id });
    return self.renderToken(tokens, index, rendererOptions);
  };

  // Add a separate, non-selectable gutter without changing the highlighted
  // source markup produced by highlight.js.
  const defaultFence = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, index, rendererOptions, env, self) => {
    const html = defaultFence(tokens, index, rendererOptions, env, self);
    const source = tokens[index].content.replace(/\n$/, '');
    const lineCount = Math.max(1, source.split('\n').length);
    const numbers = Array.from({ length: lineCount }, (_, line) => line + 1).join('\n');
    return html.replace(
      '<pre>',
      `<pre class="code-block"><span class="line-numbers" aria-hidden="true">${numbers}</span>`
    );
  };

  const defaultLinkOpen = md.renderer.rules.link_open
    ?? ((tokens, index, rendererOptions, env, self) => self.renderToken(tokens, index, rendererOptions));
  md.renderer.rules.link_open = (tokens, index, rendererOptions, env, self) => {
    const token = tokens[index];
    const link = token.attrGet('href') ?? '';
    if (/^https?:\/\//i.test(link)) {
      token.attrSet('target', '_blank');
      token.attrSet('rel', 'noopener noreferrer');
    }
    return defaultLinkOpen(tokens, index, rendererOptions, env, self);
  };

  return md;
}

/** Convert Markdown to an HTML fragment, or to a complete HTML document. */
export function renderMarkdownWithMetadata(markdown, options = {}) {
  if (typeof markdown !== 'string') {
    throw new TypeError('markdown must be a string');
  }

  const env = {};
  const content = createRenderer(options).render(markdown, env);
  return { html: content, headings: env.headings ?? [] };
}

export function renderMarkdown(markdown, options = {}) {
  const rendered = renderMarkdownWithMetadata(markdown, options);
  const content = rendered.html;
  if (!options.fullDocument) return content;

  const title = escapeHtml(options.title ?? 'Markdown Document');
  const lang = escapeHtml(options.lang ?? 'zh-CN');
  const styles = options.styles ?? defaultStyles;
  const toc = options.toc === false ? '' : renderToc(rendered.headings);
  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>${styles}</style>
</head>
<body>
<div class="page-shell">
${toc}
<main class="markdown-body">
${content}</main>
</div>
</body>
</html>
`;
}

export { defaultStyles } from './styles.js';
