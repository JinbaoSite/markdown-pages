export const defaultStyles = `
:root { color-scheme: light dark; scroll-behavior: smooth; }
body { margin: 0; padding: 2rem; font: 16px/1.7 system-ui, sans-serif; }
.page-shell { display: grid; grid-template-columns: 220px minmax(0, 860px); gap: 2.5rem; justify-content: center; align-items: start; }
.markdown-body { min-width: 0; }
.markdown-body > :first-child { margin-top: 0; }
.markdown-body > h1:first-of-type { text-align: center; }
.toc { position: sticky; top: 2rem; max-height: calc(100vh - 4rem); overflow-y: auto; padding-right: 1rem; border-right: 1px solid #d0d7de; }
.toc-title { margin-bottom: .5rem; font-weight: 600; color: #24292f; }
.toc nav { display: flex; flex-direction: column; }
.toc a { padding: .22rem .4rem; border-radius: 4px; color: #57606a; font-size: .875rem; line-height: 1.45; text-decoration: none; }
.toc a:hover { color: #0969da; background: #ddf4ff; }
.toc-level-2 { padding-left: 1rem !important; }
.toc-level-3 { padding-left: 1.75rem !important; }
.toc-level-4, .toc-level-5, .toc-level-6 { padding-left: 2.5rem !important; }
h1, h2, h3, h4, h5, h6 { scroll-margin-top: 1rem; }
img { max-width: 100%; }
pre { overflow-x: auto; padding: 1rem; border: 1px solid #d0d7de; border-radius: 6px; background: #f6f8fa; color: #24292f; }
pre.code-block { display: flex; padding: 0; }
pre.code-block code { display: block; flex: 1; min-width: max-content; padding: 1rem; }
.line-numbers { flex: none; padding: 1rem .75rem; border-right: 1px solid #d0d7de; color: #8c959f; background: #f6f8fa; text-align: right; user-select: none; }
code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
:not(pre) > code { padding: .15em .35em; border-radius: 4px; background: color-mix(in srgb, currentColor 10%, transparent); }
blockquote { margin-left: 0; padding-left: 1rem; border-left: 4px solid #8c959f; color: #656d76; }
table { width: 100%; margin: 1rem 0; border-spacing: 0; border-collapse: separate; border: 1px solid #d0d7de; border-radius: 6px; overflow: hidden; }
th, td { padding: .55rem .8rem; border-right: 1px solid #d0d7de; border-bottom: 1px solid #d0d7de; text-align: left; }
th:last-child, td:last-child { border-right: 0; }
tr:last-child td { border-bottom: 0; }
thead th { background: #f6f8fa; font-weight: 600; }
tbody tr:nth-child(even) td { background: #f6f8fa; }
tbody td { transition: background-color .15s ease; }
tbody tr:hover td { background: #ddf4ff; }
.hljs-comment, .hljs-quote { color: #6e7781; }
.hljs-keyword, .hljs-selector-tag, .hljs-literal { color: #cf222e; }
.hljs-string, .hljs-doctag, .hljs-regexp { color: #0a3069; }
.hljs-title, .hljs-section, .hljs-function { color: #8250df; }
.hljs-number, .hljs-symbol, .hljs-variable { color: #0550ae; }
.hljs-built_in, .hljs-type, .hljs-class { color: #953800; }
.hljs-attr, .hljs-attribute { color: #0550ae; }
@media (prefers-color-scheme: dark) {
  pre, .line-numbers { border-color: #30363d; background: #0d1117; color: #c9d1d9; }
  .line-numbers { color: #6e7681; }
  table { border-color: #30363d; }
  th, td { border-color: #30363d; }
  thead th, tbody tr:nth-child(even) td { background: #161b22; }
  tbody tr:hover td { background: #1c2d41; }
  .toc { border-color: #30363d; }
  .toc-title { color: #c9d1d9; }
  .toc a { color: #8b949e; }
  .toc a:hover { color: #58a6ff; background: #1c2d41; }
  .hljs-comment, .hljs-quote { color: #8b949e; }
  .hljs-keyword, .hljs-selector-tag, .hljs-literal { color: #ff7b72; }
  .hljs-string, .hljs-doctag, .hljs-regexp { color: #a5d6ff; }
  .hljs-title, .hljs-section, .hljs-function { color: #d2a8ff; }
  .hljs-number, .hljs-symbol, .hljs-variable, .hljs-attr, .hljs-attribute { color: #79c0ff; }
  .hljs-built_in, .hljs-type, .hljs-class { color: #ffa657; }
}
@media (max-width: 900px) {
  body { padding: 1rem; }
  .page-shell { display: block; }
  .toc { display: none; }
}
mjx-container[display="true"] { overflow-x: auto; overflow-y: hidden; padding: .5rem 0; }
`;
