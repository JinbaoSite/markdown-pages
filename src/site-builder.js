import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
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

const LUCIDE_PATHS = {
  home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  folder: '<path d="M3 6h5l2 2h11v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  brain: '<path d="M9.5 4A2.5 2.5 0 0 0 7 6.5v.2A3 3 0 0 0 5 12a3 3 0 0 0 2 5.3v.2A2.5 2.5 0 0 0 9.5 20H12V4Z"/><path d="M14.5 4A2.5 2.5 0 0 1 17 6.5v.2a3 3 0 0 1 2 5.3v.3a3 3 0 0 1-2 5v.2a2.5 2.5 0 0 1-2.5 2.5H12V4Z"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/><path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>',
  bot: '<rect width="16" height="12" x="4" y="8" rx="2"/><path d="M9 12h.01M15 12h.01M9 16h6M12 2v3M8 5h8"/>',
  code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  terminal: '<polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/>'
};

function lucide(name, className = '') {
  return `<svg class="lucide ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${LUCIDE_PATHS[name] ?? LUCIDE_PATHS.code}</svg>`;
}

function categoryIcon(slug) {
  return lucide({ ml: 'brain', dl: 'brain', llm: 'code', recsys: 'database', agent: 'bot', projects: 'terminal' }[slug] ?? 'folder');
}

const siteScript = `document.querySelector('.menu-toggle')?.addEventListener('click',e=>{const n=document.querySelector('.mobile-nav');const open=n.classList.toggle('open');e.currentTarget.setAttribute('aria-expanded',open)});
document.querySelectorAll('[data-pagination]').forEach(pagination=>{
  const list=document.getElementById(pagination.dataset.list);
  const cards=[...list.querySelectorAll('.post-card')];
  const perPage=Math.max(1,Number(pagination.dataset.perPage)||5);
  const totalPages=Math.ceil(cards.length/perPage);
  let currentPage=1;
  const range=()=>{const lo=Math.max(2,currentPage-1);const hi=Math.min(totalPages-1,currentPage+1);const values=[];if(lo>2)values.push('…');for(let page=lo;page<=hi;page++)values.push(page);if(hi<totalPages-1)values.push('…');return totalPages>1?[1,...values,totalPages]:[1]};
  const button=(label,page,className='')=>label==='…'?'<span class="page-ellipsis" aria-hidden="true">…</span>':'<button class="page-btn'+className+(page===currentPage?' active':'')+'" data-page="'+page+'"'+(page===currentPage?' aria-current="page"':'')+((className.includes('prev')&&currentPage===1)||(className.includes('next')&&currentPage===totalPages)?' disabled':'')+'>'+label+'</button>';
  const render=()=>{const start=(currentPage-1)*perPage;cards.forEach((card,index)=>card.hidden=index<start||index>=start+perPage);if(totalPages<=1){pagination.innerHTML='';return;}pagination.innerHTML=button('‹ 上一页',currentPage-1,' nav prev')+range().map(page=>button(page,page)).join('')+button('下一页 ›',currentPage+1,' nav next')+'<span class="page-info">第 '+currentPage+' / '+totalPages+' 页 · 共 '+cards.length+' 篇</span>';};
  pagination.addEventListener('click',event=>{const target=event.target.closest('[data-page]');if(!target||target.disabled)return;const page=Number(target.dataset.page);if(page<1||page>totalPages||page===currentPage)return;currentPage=page;render();list.scrollIntoView({behavior:'smooth',block:'start'});});
  render();
});
document.querySelectorAll('[data-gomoku]').forEach(game=>{
  const size=9, board=Array.from({length:size},()=>Array(size).fill(0));
  const boardElement=game.querySelector('.gomoku-board');
  const panels={1:game.querySelector('[data-ai-stats="1"]'),2:game.querySelector('[data-ai-stats="2"]')};
  const result=game.querySelector('.gomoku-result');
  const winLine=game.querySelector('.winning-line');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const directions=[[1,0],[0,1],[1,1],[1,-1]], inside=(x,y)=>x>=0&&y>=0&&x<size&&y<size;
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,reduced?0:ms));
  const findWin=()=>{for(let y=0;y<size;y++)for(let x=0;x<size;x++){const player=board[y][x];if(!player)continue;for(const [dx,dy] of directions){const line=[];for(let step=0;step<5;step++){const nx=x+dx*step,ny=y+dy*step;if(!inside(nx,ny)||board[ny][nx]!==player)break;line.push([nx,ny]);}if(line.length===5)return{player,line};}}return null;};
  const evaluate=root=>{const weight=[0,2,18,130,1800,100000];let score=0;for(let y=0;y<size;y++)for(let x=0;x<size;x++){const player=board[y][x];if(!player)continue;for(const [dx,dy] of directions){if(inside(x-dx,y-dy)&&board[y-dy][x-dx]===player)continue;let count=0,nx=x,ny=y;while(inside(nx,ny)&&board[ny][nx]===player){count++;nx+=dx;ny+=dy;}const open=(inside(x-dx,y-dy)&&board[y-dy][x-dx]===0?1:0)+(inside(nx,ny)&&board[ny][nx]===0?1:0);const value=weight[Math.min(count,5)]*(open===2?1.7:open===1?1:0.12);score+=(player===root?1:-1.08)*value;}}return score;};
  const candidates=(player,limit=10)=>{const points=[];let occupied=0;for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(board[y][x])occupied++;if(!occupied)return[[4,4]];for(let y=0;y<size;y++)for(let x=0;x<size;x++){if(board[y][x])continue;let near=false;for(let dy=-1;dy<=1&&!near;dy++)for(let dx=-1;dx<=1;dx++)if(inside(x+dx,y+dy)&&board[y+dy][x+dx]){near=true;break;}if(!near)continue;board[y][x]=player;const win=findWin();let priority=win?1e9:evaluate(player);board[y][x]=3-player;const blocks=findWin();if(blocks)priority+=8e8;board[y][x]=0;priority-=Math.abs(4-x)+Math.abs(4-y);points.push([x,y,priority]);}return points.sort((a,b)=>b[2]-a[2]||a[1]-b[1]||a[0]-b[0]).slice(0,limit).map(([x,y])=>[x,y]);};
  const minimax=(depth,alpha,beta,toMove,root,stats)=>{stats.nodes++;const win=findWin();if(win)return win.player===root?10000000+depth:-10000000-depth;if(depth===0)return evaluate(root);const moves=candidates(toMove,depth>1?8:6);if(!moves.length)return evaluate(root);const maximize=toMove===root;let best=maximize?-Infinity:Infinity;for(const [x,y] of moves){board[y][x]=toMove;const value=minimax(depth-1,alpha,beta,3-toMove,root,stats);board[y][x]=0;if(maximize){best=Math.max(best,value);alpha=Math.max(alpha,best);}else{best=Math.min(best,value);beta=Math.min(beta,best);}if(beta<=alpha){stats.prunes++;break;}}return best;};
  const updateStats=(player,data)=>{const panel=panels[player];panel.classList.add('active');panels[3-player].classList.remove('active');panel.querySelector('[data-candidates]').textContent=data.candidates;panel.querySelector('[data-nodes]').textContent=data.nodes;panel.querySelector('[data-prunes]').textContent=data.prunes;panel.querySelector('[data-score]').textContent=data.score;};
  const chooseMove=async player=>{const moves=candidates(player,12),stats={nodes:0,prunes:0},scored=[];let bestScore=-Infinity;const played=board.flat().filter(Boolean).length;for(let index=0;index<moves.length;index++){const [x,y]=moves[index];board[y][x]=player;const score=minimax(2,-Infinity,Infinity,3-player,player,stats);board[y][x]=0;bestScore=Math.max(bestScore,score);scored.push({move:[x,y],score});updateStats(player,{candidates:(index+1)+' / '+moves.length,nodes:stats.nodes,prunes:stats.prunes,score:Math.round(bestScore)});await wait(34);}scored.sort((a,b)=>b.score-a.score);const spread=played<10?Math.max(120,Math.abs(scored[0].score)*.025):Math.max(8,Math.abs(scored[0].score)*.001);const pool=scored.filter(item=>item.score>=scored[0].score-spread).slice(0,4);const choice=pool[Math.floor(Math.random()*pool.length)]||scored[0];updateStats(player,{candidates:moves.length,nodes:stats.nodes,prunes:stats.prunes,score:Math.round(choice.score)});return choice.move;};
  const place=(x,y,player,move)=>{board[y][x]=player;const stone=document.createElement('i');stone.className='gomoku-stone '+(player===1?'black':'white');stone.style.setProperty('--x',x);stone.style.setProperty('--y',y);stone.dataset.move=move;boardElement.append(stone);requestAnimationFrame(()=>stone.classList.add('placed'));};
  const showResult=win=>{const [[sx,sy],[ex,ey]]= [win.line[0],win.line[4]];const dx=ex-sx,dy=ey-sy;winLine.style.left=(sx*12.5)+'%';winLine.style.top=(sy*12.5)+'%';winLine.style.width=(Math.hypot(dx,dy)*12.5)+'%';winLine.style.setProperty('--angle',Math.atan2(dy,dx)*180/Math.PI+'deg');result.innerHTML='<b>AI-0'+win.player+' WIN</b><i>/</i><strong>AI-0'+(3-win.player)+' LOSS</strong>';game.dataset.phase='finished';panels[1].classList.remove('active');panels[2].classList.remove('active');};
  const play=async()=>{game.dataset.phase='playing';result.innerHTML='';winLine.removeAttribute('style');board.forEach(row=>row.fill(0));boardElement.querySelectorAll('.gomoku-stone').forEach(stone=>stone.remove());[1,2].forEach(player=>updateStats(player,{candidates:'—',nodes:'—',prunes:'—',score:'—'}));panels[1].classList.remove('active');panels[2].classList.remove('active');for(let move=1;move<=size*size;move++){const player=move%2?1:2;const choice=await chooseMove(player);if(!choice)break;place(choice[0],choice[1],player,move);await wait(260);const win=findWin();if(win){showResult(win);await wait(3600);game.dataset.phase='resetting';await wait(700);return play();}}result.innerHTML='<b>DRAW</b>';game.dataset.phase='finished';panels[1].classList.remove('active');panels[2].classList.remove('active');await wait(3000);game.dataset.phase='resetting';await wait(700);play();};
  const start=()=>{
    play();
  };
  start();
});`;

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

function normalizeTags(value) {
  if (Array.isArray(value)) return value.map(String).map(tag => tag.trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map(tag => tag.trim()).filter(Boolean);
  return [];
}

function layout({ config, title, description, body, active = '', extraClass = '', minimalNav = false }) {
  const base = config.baseUrl;
  const nav = minimalNav ? '' : config.categories.map(category =>
    `<a${active === category.slug ? ' class="active"' : ''} href="${href(base, `${category.slug}/`)}">${categoryIcon(category.slug)}${escapeHtml(category.name)}</a>`
  ).join('');
  const navigation = minimalNav ? '' : `<nav class="desktop-nav"><a${active === 'home' ? ' class="active"' : ''} href="${base}">${lucide('home')}首页</a>${nav}<a${active === 'about' ? ' class="active"' : ''} href="${href(base, 'about/')}">${lucide('info')}关于</a></nav>
<button class="menu-toggle" aria-label="打开导航" aria-expanded="false"><span></span><span></span><span></span></button>`;
  const mobileNavigation = minimalNav ? '' : `<nav class="mobile-nav"><a href="${base}">${lucide('home')}首页</a>${nav}<a href="${href(base, 'about/')}">${lucide('info')}关于</a></nav>`;
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)} · ${escapeHtml(config.title)}</title>
<meta name="description" content="${escapeHtml(description || config.description)}">
<link rel="stylesheet" href="${href(base, `assets/blog.css?v=${config.assetVersion}`)}"></head>
<body class="${extraClass}"><header class="site-header"><div class="header-inner">
<a class="brand" href="${base}"><span class="brand-icon">${lucide('book')}</span>${escapeHtml(config.title)}</a>
${navigation}
</div>${mobileNavigation}</header>
${body}<footer><span>© ${new Date().getUTCFullYear()} ${escapeHtml(config.author)}. Learning by Doing.</span><span class="footer-views">本站总访问量 <b id="busuanzi_site_pv">加载中...</b> 次</span></footer>
<script src="${href(base, `assets/blog.js?v=${config.assetVersion}`)}"></script>
<script src="https://cdn.busuanzi.cc/busuanzi/3.6.9/busuanzi.min.js" defer></script></body></html>`;
}

function postCard(article, base) {
  const tags = article.tags.map(tag => `<span class="article-tag">${escapeHtml(tag)}</span>`).join('');
  return `<a class="post-card" href="${href(base, article.url)}"><div class="article-header"><span class="article-title">${escapeHtml(article.title)}</span>${article.date ? `<time class="article-date">${article.date}</time>` : ''}</div>
  <p class="article-desc">${escapeHtml(article.description)}</p><div class="article-tags">${tags}</div></a>`;
}

function normalizeArticleUrl(value, categorySlug) {
  const url = String(value || '').trim();
  if (/^(?:https?:)?\/\//i.test(url)) return url;
  const pathname = url.replace(/^\/+|\/+$/g, '') || categorySlug;
  return `${pathname}/`;
}

function listPageInfo(data, slug) {
  const category = categoryInfo(slug);
  const articles = Array.isArray(data?.['article-list']) ? data['article-list'] : [];
  return {
    title: data?.title || category.name,
    subtitle: data?.subtitle || '',
    articles: articles.map(article => ({
      title: article?.['article-title'] || '',
      url: normalizeArticleUrl(article?.['article-url'], slug),
      date: formatDate(article?.['article-date']),
      description: String(article?.['article-desc'] || ''),
      tags: normalizeTags(article?.['article-tags'])
    })).filter(article => article.title)
  };
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

function rewriteSitePaths(html, baseUrl) {
  if (baseUrl === '/') return html;
  const prefix = baseUrl.replace(/\/$/, '');
  return html.replace(/\b(src|href)="\/(?!\/)([^"]*)"/g, (match, attribute, target) => {
    if (`/${target}`.startsWith(`${prefix}/`)) return match;
    return `${attribute}="${prefix}/${target}"`;
  });
}

function addArticleViews(html) {
  return html.replace(
    /(<h1\b[^>]*>[\s\S]*?<\/h1>)/i,
    '$1<p class="article-views">总阅读量 <b id="busuanzi_page_pv">加载中...</b> 次</p>'
  );
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
  const listPages = new Map();
  for (const relative of files.markdown.sort()) {
    const basename = path.basename(relative).toLowerCase();
    if (basename === 'readme.md') continue;
    const raw = await readFile(path.join(source, relative), 'utf8');
    const parsed = matter(raw);
    if (basename === 'index.md') {
      const parts = relative.split(path.sep);
      if (parts.length > 1 && parts[0] !== 'about') {
        listPages.set(parts[0], listPageInfo(parsed.data, parts[0]));
      }
      continue;
    }
    if (parsed.data.draft === true) continue;
    const withoutExtension = relative.replace(/\.md$/i, '');
    const parts = withoutExtension.split(path.sep);
    const categorySlug = parts.length > 1 ? parts[0] : 'posts';
    const fallback = path.basename(withoutExtension).replace(/[-_]/g, ' ');
    const category = categoryInfo(parsed.data.category || categorySlug, fileConfig.categories);
    posts.push({
      source: relative,
      markdown: parsed.content,
      data: parsed.data,
      title: parsed.data.title || firstHeading(parsed.content, fallback),
      description: parsed.data.description || plainText(parsed.content).slice(0, 150),
      date: formatDate(parsed.data.date),
      order: Number(parsed.data.order ?? 0),
      category,
      url: `${withoutExtension.split(path.sep).join('/')}/`,
      legacyUrl: `${withoutExtension.split(path.sep).join('/')}.html`
    });
  }
  const categories = [...new Map(posts.map(post => [post.category.slug, post.category])).values()];
  const configuredPerPage = Number(fileConfig.posts_per_page ?? fileConfig.per_page ?? 5);
  const config = {
    title: options.title || fileConfig.title || 'Markdown Blog',
    author: options.author || fileConfig.author || options.title || fileConfig.title || 'Author',
    description: options.description || fileConfig.description || '一个由 Markdown 与 GitHub Actions 驱动的技术博客',
    logo: options.logo || fileConfig.logo || (options.title || fileConfig.title || 'M').slice(0, 1).toUpperCase(),
    baseUrl, categories,
    postsPerPage: Number.isInteger(configuredPerPage) && configuredPerPage > 0 ? configuredPerPage : 5,
    assetVersion: createHash('sha256').update(siteStyles).update(siteScript).digest('hex').slice(0, 10)
  };

  await rm(output, { recursive: true, force: true });
  for (const relative of files.assets) {
    const target = path.join(output, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(path.join(source, relative), target);
  }
  await mkdir(path.join(output, 'assets'), { recursive: true });
  await writeFile(path.join(output, 'assets/blog.css'), siteStyles);
  await writeFile(path.join(output, 'assets/blog.js'), siteScript);

  const homeBody = `<main class="gomoku-home"><section class="gomoku-only" data-gomoku data-phase="playing" aria-label="两个使用 Minimax 与 Alpha-Beta 剪枝的 AI 实时进行五子棋对局"><aside class="ai-stats ai-stats-one" data-ai-stats="1"><svg class="ai-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 4A2.5 2.5 0 0 0 7 6.5v.2A3 3 0 0 0 5 12a3 3 0 0 0 2 5.3v.2A2.5 2.5 0 0 0 9.5 20H12V4Z"/><path d="M14.5 4A2.5 2.5 0 0 1 17 6.5v.2a3 3 0 0 1 2 5.3v.3a3 3 0 0 1-2 5v.2a2.5 2.5 0 0 1-2.5 2.5H12V4Z"/><path d="M8 10h4M12 14h4"/></svg><h2>AI-01</h2><small>BLACK · MINIMAX</small><dl><div><dt>候选数量</dt><dd data-candidates>—</dd></div><div><dt>节点数</dt><dd data-nodes>—</dd></div><div><dt>剪枝次数</dt><dd data-prunes>—</dd></div><div><dt>最佳评分</dt><dd data-score>—</dd></div></dl></aside><div class="gomoku-board" role="img" aria-label="9 乘 9 AI 五子棋棋盘"><span class="winning-line" aria-hidden="true"></span><span class="gomoku-result" aria-live="polite"></span></div><aside class="ai-stats ai-stats-two" data-ai-stats="2"><svg class="ai-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="7" width="16" height="13" rx="3"/><path d="M9 11h.01M15 11h.01M9 16h6M12 2v5M9 2h6M2 12h2M20 12h2"/></svg><h2>AI-02</h2><small>WHITE · MINIMAX</small><dl><div><dt>候选数量</dt><dd data-candidates>—</dd></div><div><dt>节点数</dt><dd data-nodes>—</dd></div><div><dt>剪枝次数</dt><dd data-prunes>—</dd></div><div><dt>最佳评分</dt><dd data-score>—</dd></div></dl></aside></section></main>`;
  await writeFile(path.join(output, 'index.html'), layout({ config, title: '首页', body: homeBody, active: 'home', extraClass: 'home-page' }));

  for (const category of categories) {
    const listPage = listPages.get(category.slug) ?? { title: category.name, subtitle: '', articles: [] };
    const listId = `article-list-${category.slug}`;
    const body = `<main class="container list-page"><p class="eyebrow">${categoryIcon(category.slug)} CATEGORY</p><h1>${escapeHtml(listPage.title)}</h1>${listPage.subtitle ? `<p>${escapeHtml(listPage.subtitle)}</p>` : ''}<p>${listPage.articles.length} 篇文章</p><div class="post-list" id="${escapeHtml(listId)}">${listPage.articles.map(article => postCard(article, baseUrl)).join('')}</div><nav class="pagination" data-pagination data-list="${escapeHtml(listId)}" data-per-page="${config.postsPerPage}" aria-label="文章分页"></nav></main>`;
    const dir = path.join(output, category.slug);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'index.html'), layout({ config, title: category.name, body, active: category.slug }));
  }

  for (const post of posts) {
    const rendered = renderMarkdownWithMetadata(post.markdown, { allowHtml: false });
    const content = addArticleViews(rewriteSitePaths(rewriteMarkdownLinks(rendered.html), baseUrl));
    const body = `<div class="article-shell">${tocHtml(rendered.headings)}<main class="article"><div class="article-meta"><a href="${href(baseUrl, `${post.category.slug}/`)}">${categoryIcon(post.category.slug)}${escapeHtml(post.category.name)}</a>${post.date ? `<time>${post.date}</time>` : ''}</div><article class="markdown-body">${content}</article></main></div>`;
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
