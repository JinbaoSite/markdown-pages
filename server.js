import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 8002);
const publicRoot = path.resolve(root, process.env.SITE_DIR || "dist");
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png" };

http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, "http://blog.local").pathname);
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const requested = path.resolve(publicRoot, relative);
  const file = path.extname(requested) ? requested : path.join(requested, "index.html");
  if (file !== publicRoot && !file.startsWith(`${publicRoot}${path.sep}`)) { res.writeHead(403); return res.end(); }
  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
}).listen(port, "127.0.0.1", () => console.log(`Blog: http://127.0.0.1:${port}`));
