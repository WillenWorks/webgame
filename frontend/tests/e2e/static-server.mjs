// Servidor estático mínimo para o build SPA (`nuxt generate` → .output/public).
// Fallback para 200.html em rotas desconhecidas (client-side routing).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../.output/public', import.meta.url));
const PORT = Number(process.env.PORT || 3000);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

async function send(res, filePath, status = 200) {
  const body = await readFile(filePath);
  res.writeHead(status, { 'content-type': MIME[extname(filePath)] || 'application/octet-stream' });
  res.end(body);
}

const server = createServer(async (req, res) => {
  try {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    let filePath = join(ROOT, normalize(url));
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403).end('forbidden');
      return;
    }
    try {
      const s = await stat(filePath);
      if (s.isDirectory()) filePath = join(filePath, 'index.html');
      await send(res, filePath);
      return;
    } catch {
      // não é arquivo — tenta HTML da rota, senão fallback SPA
      if (!extname(url)) {
        try {
          await send(res, join(ROOT, url, 'index.html'));
          return;
        } catch {
          await send(res, join(ROOT, '200.html'));
          return;
        }
      }
      res.writeHead(404).end('not found');
    }
  } catch (e) {
    res.writeHead(500).end(String(e));
  }
});

server.listen(PORT, () => console.log(`static-server em http://localhost:${PORT} (root: ${ROOT})`));
