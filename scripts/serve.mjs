/**
 * 本地静态服务器：为 index.html 提供带 gzip 与缓存头的静态资源。
 * 用法： node scripts/serve.mjs [端口]   （默认 3180）
 */
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat, readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PORT = Number(process.argv[2] || 3180);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.geojson': 'application/geo+json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

const COMPRESSIBLE = new Set(['.html', '.js', '.mjs', '.css', '.json', '.geojson', '.svg', '.txt', '.md']);
const gzipCache = new Map();

async function send(req, res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const info = await stat(filePath);
  const etag = `W/"${info.size}-${Number(info.mtimeMs).toString(36)}"`;
  const rel = path.relative(ROOT, filePath).split(path.sep).join('/');
  // 缓存策略：
  //  - html / js / css 一律 no-cache：带 ETag 校验，没改就 304（几乎零开销），
  //    改了立刻生效。之前给 .js 发 24 小时强缓存，导致"改了代码但浏览器还在跑旧的"
  //    ——新增的语言切换按钮就是这样消失的。
  //  - vendor/ 里的引擎与贴图不会变 → 一年 immutable
  //  - data/ 里的年代数据可能更新 → 1 小时
  const REVALIDATE = new Set(['.html', '.js', '.mjs', '.css']);
  const cacheControl = rel.startsWith('vendor/')
    ? 'public, max-age=31536000, immutable'
    : REVALIDATE.has(ext)
      ? 'no-cache'
      : rel.startsWith('data/')
        ? 'public, max-age=3600'
        : 'public, max-age=86400';
  const headers = {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': cacheControl,
    ETag: etag,
    'Last-Modified': info.mtime.toUTCString(),
  };
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, headers);
    res.end();
    return;
  }
  const accept = String(req.headers['accept-encoding'] || '');
  if (COMPRESSIBLE.has(ext) && /gzip/.test(accept) && info.size > 1024) {
    let buf = gzipCache.get(filePath);
    if (!buf || buf.mtimeMs !== info.mtimeMs) {
      buf = { mtimeMs: info.mtimeMs, body: gzipSync(await readFile(filePath), { level: 6 }) };
      gzipCache.set(filePath, buf);
    }
    headers['Content-Encoding'] = 'gzip';
    headers['Content-Length'] = buf.body.length;
    headers.Vary = 'Accept-Encoding';
    res.writeHead(200, headers);
    if (req.method === 'HEAD') { res.end(); return; }
    res.end(buf.body);
    return;
  }
  headers['Content-Length'] = info.size;
  res.writeHead(200, headers);
  if (req.method === 'HEAD') { res.end(); return; }
  createReadStream(filePath).pipe(res);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/' || rel === '') rel = '/index.html';
    const filePath = path.join(ROOT, path.normalize(rel).replace(/^([/\\])+/, ''));
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403).end('forbidden');
      return;
    }
    await send(req, res, filePath);
  } catch (err) {
    if (err && err.code === 'ENOENT') res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('404 Not Found');
    else res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }).end(`500 ${err && err.message}`);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`寰宇纪年 已启动: http://127.0.0.1:${PORT}/`);
  console.log(`静态根目录: ${ROOT}`);
});
