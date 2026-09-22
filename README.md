# Markdown Pages

将一个只包含 Markdown 的 GitHub 仓库自动构建为博客网站，并通过 GitHub Actions 发布到 GitHub Pages。

项目使用 Node.js 实现，主题参考 [dongjinbao.com](https://www.dongjinbao.com/) 的技术博客结构。内容、主题和发布流程相互分离：内容仓库只负责维护 Markdown，本项目负责生成页面和部署产物。

## 功能

- 根据一级目录自动生成博客分类
- 根据 Markdown 的第一个一级标题生成文章标题
- 自动生成首页、分类页、文章页、关于页和 404 页面
- 支持 MathJax 行内公式与块级公式，构建时生成 SVG
- GitHub 风格代码高亮与代码行号
- 自动生成文章 TOC，桌面端固定展示、移动端隐藏
- GitHub 风格表格、隔行底色与鼠标悬停效果
- 响应式顶部导航和移动端菜单
- 支持 YAML front matter、草稿和文章排序
- 支持 `_config.yaml` 统一配置站点信息与分类名称
- 非 Markdown 文件保持目录结构原样复制
- 文章同时支持 `/path/article/` 与 `/path/article.html`
- 支持 GitHub Project Pages 子路径
- 支持自定义域名和 `CNAME`
- 默认禁用 Markdown 原始 HTML，降低 XSS 风险

## 工作原理

```text
Markdown 内容仓库
       │ push
       ▼
GitHub Actions
       │ 调用 action.yml
       ▼
Markdown Pages Generator
       │ 生成静态文件
       ▼
_site → GitHub Pages
```

生成过程不修改 Markdown 源文件。所有 HTML、CSS 和 JavaScript 都写入指定的输出目录。

## 内容仓库

内容分类由一级目录决定。例如：

```text
jinbaosite.github.io/
├── _config.yaml
├── .github/
│   └── workflows/
│       └── pages.yml
├── ml/
│   └── xgboost.md
├── dl/
│   └── resnet.md
├── llm/
│   └── attention.md
├── recsys/
│   └── autoint.md
├── agent/
│   └── react.md
└── projects/
    ├── demo.md
    └── architecture.png
```

内置分类名称如下：

| 目录 | 页面名称 |
| --- | --- |
| `ml` | 机器学习 |
| `dl` | 深度学习 |
| `llm` | LLM |
| `recsys` | 推荐算法 |
| `agent` | Agent |
| `projects` | 项目 |

其他目录也可以使用，生成器会直接使用目录名作为分类名称。根目录中的 Markdown 会归入“文章”分类。`README.md`、隐藏目录和 `node_modules` 不会作为文章处理。

## 站点配置

在内容仓库根目录添加 `_config.yaml`（也兼容 `_config.yml`）：

```yaml
title: Jinbao
author: Jinbao
description: 记录机器学习、深度学习、LLM、推荐算法与 Agent
logo: J
base_url: /
cname: www.dongjinbao.com

categories:
  ml:
    title: 机器学习
    icon: ML
  dl:
    title: 深度学习
    icon: DL
  llm:
    title: LLM
    icon: LLM
  recsys:
    title: 推荐算法
    icon: RS
```

支持的站点字段：

| 字段 | 说明 |
| --- | --- |
| `title` | 博客标题 |
| `author` | 作者名称和页脚署名 |
| `description` | 首页标题及默认页面描述 |
| `logo` | 左上角 Logo 中的文本 |
| `base_url` | GitHub Project Pages 子路径 |
| `cname` | 自定义域名 |
| `categories` | 分类名称和图标映射 |

Action 或 CLI 中明确传入的参数优先于 `_config.yaml`，因此同一份内容可以在不同环境中使用不同域名或基础路径。配置文件只参与构建，不会复制到发布目录。

## 静态文件与访问地址

除 Markdown、`_config.yaml` 和内部排除目录外，其他文件会保持相对目录原样复制到输出目录，包括：

- 图片、SVG、字体和 PDF
- 自定义 HTML、CSS 和 JavaScript
- `robots.txt`、站点验证文件等

例如 `downloads/model.pdf` 构建后仍可通过 `/downloads/model.pdf` 访问，`pages/demo.html` 仍可通过 `/pages/demo.html` 访问。

对于 `recsys/autoint.md`，生成器会同时创建：

```text
_site/recsys/autoint/index.html  → /recsys/autoint/，访问 /recsys/autoint 时通常会重定向到该地址
_site/recsys/autoint.html        → /recsys/autoint.html
```

站内文章列表默认链接到不带 `.html` 的干净地址。

## Markdown 格式

最简单的文章只需要一个一级标题：

````markdown
# AutoInt：用自注意力机制自动学习特征交互

## 背景

AutoInt 使用多头自注意力学习高阶特征交互。

$$
\operatorname{Attention}(Q,K,V)
=\operatorname{softmax}(QK^T/\sqrt{d_k})V
$$

```python
from torch import nn

attention = nn.MultiheadAttention(64, 4, batch_first=True)
```
````

### Front matter

文章可以在 Markdown 内部添加可选元数据：

```markdown
---
title: 自定义文章标题
description: 用于首页、分类页和 HTML meta 标签的摘要
date: 2026-08-31
order: 10
draft: false
category: recsys
---

# 正文标题
```

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `title` | string | 覆盖从第一个 `#` 提取的标题 |
| `description` | string | 文章摘要；未设置时从正文自动截取 |
| `date` | date/string | 发布时间，用于排序和展示 |
| `order` | number | 日期相同时的辅助排序值 |
| `draft` | boolean | 设置为 `true` 时不构建该文章 |
| `category` | string | 覆盖一级目录推断出的分类 |

## 使用 GitHub Actions 发布

### 1. 发布本项目

将本项目推送到一个独立 GitHub 仓库，并创建稳定版本标签：

```bash
git tag -a v1 -m "Markdown Pages v1"
git push origin v1
```

内容仓库将通过 `owner/repository@v1` 使用它。

### 2. 添加工作流

将 [templates/pages.yml](templates/pages.yml) 复制到内容仓库的 `.github/workflows/pages.yml`，然后把：

```yaml
uses: JinbaoSite/markdown-pages@v1
```

替换为真实的 Action 仓库地址，例如：

```yaml
uses: JinbaoSite/markdown-pages@v1
```

完整工作流示例：

```yaml
name: Deploy Markdown blog to Pages

on:
  push:
    branches: [master]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v6
      - uses: JinbaoSite/markdown-pages@v1
        with:
          title: Jinbao
          author: Jinbao
          description: 记录机器学习、深度学习、LLM、推荐算法与 Agent
          cname: www.dongjinbao.com
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v4
        with:
          path: _site
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

如果内容仓库的默认分支是 `main`，需要把 `branches: [master]` 改为 `branches: [main]`。

### 3. 启用 GitHub Pages

进入内容仓库：

1. 打开 **Settings → Pages**。
2. 在 **Build and deployment** 中选择 **GitHub Actions**。
3. 推送 Markdown 或手动运行工作流。

### 用户站点与项目站点

对于 `JinbaoSite/jinbaosite.github.io` 这样的用户站点，`base-url` 保持默认值 `/`。

对于 `account/project` 项目站点，需要配置仓库子路径：

```yaml
- uses: JinbaoSite/markdown-pages@v1
  with:
    base-url: /project/
```

### 自定义域名

```yaml
with:
  cname: www.dongjinbao.com
```

生成器会创建 `_site/CNAME`。首次启用时，还需要在 **Settings → Pages → Custom domain** 中保存域名并完成 DNS 配置。

## Action 输入参数

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `source` | `.` | Markdown 内容目录，相对于内容仓库根目录 |
| `output` | `_site` | 静态网站输出目录 |
| `title` | 配置值或 `Markdown Blog` | 网站名称 |
| `author` | 配置值或 `Author` | 作者名称和页脚署名 |
| `description` | 配置值或内置介绍 | 首页标题和网站描述 |
| `base-url` | 配置值或 `/` | GitHub Pages 部署子路径 |
| `cname` | 空 | 自定义域名 |

## 本地使用

运行环境：Node.js 22 或更高版本。

```bash
npm install
node bin/markdown-blog.js build \
  --source /path/to/markdown-repository \
  --output _site \
  --title Jinbao \
  --author Jinbao \
  --description "Learning by Doing" \
  --cname www.dongjinbao.com
```

CLI 参数：

```text
--source <目录>       Markdown 内容目录，默认当前目录
--output <目录>       输出目录，默认 _site
--title <名称>        博客名称
--author <作者>       作者名称
--description <介绍>  首页介绍
--base-url <路径>     Project Pages 子路径，默认 /
--cname <域名>        生成 CNAME 文件
```

构建并预览项目自带示例：

```bash
npm run build:blog
npm start
```

默认访问地址为 `http://127.0.0.1:8002`。也可以指定端口和静态目录：

```bash
PORT=8080 SITE_DIR=dist npm start
```

## 单文件转换

项目也保留了单篇 Markdown 转 HTML 功能：

```bash
node bin/md2html.js article.md -o article.html --title "文章标题"
cat article.md | node bin/md2html.js - > article.html
```

作为 ES Module 调用：

```js
import { renderMarkdown } from './src/index.js';

const fragment = renderMarkdown('# 标题\n\n行内公式 $E=mc^2$');
const document = renderMarkdown(markdown, {
  fullDocument: true,
  title: '文章标题'
});
```

## 项目结构

```text
.
├── action.yml                 # Composite GitHub Action
├── bin/
│   ├── markdown-blog.js       # 博客生成 CLI
│   └── md2html.js             # 单文件转换 CLI
├── src/
│   ├── index.js               # Markdown 渲染器
│   ├── site-builder.js        # 静态博客生成器
│   ├── site-styles.js         # 博客主题
│   └── styles.js              # 单页 HTML 样式
├── templates/
│   └── pages.yml              # GitHub Pages 工作流模板
├── examples/content/          # 示例 Markdown 内容仓库
├── test/                      # 自动化测试
└── server.js                  # 本地静态服务器
```

## 开发与测试

```bash
npm test
npm run build:blog
```

测试覆盖 Markdown 渲染、MathJax、代码高亮、TOC、分类生成、子路径链接和 `CNAME`。

## 安全说明

- Markdown 原始 HTML 默认关闭。
- 外部链接自动添加 `target="_blank"` 和 `rel="noopener noreferrer"`。
- 内部 Markdown 链接会转换为对应的 `.html` 地址。
- 使用第三方 GitHub Action 时，生产环境建议固定到经过审核的 commit SHA。
