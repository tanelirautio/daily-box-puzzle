import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const dist = path.resolve('dist');
const args = process.argv.slice(2);
const hostFlagIndex = args.indexOf('--host');
const portFlagIndex = args.indexOf('--port');
const host = hostFlagIndex >= 0 ? args[hostFlagIndex + 1] : '127.0.0.1';
const port = portFlagIndex >= 0 ? Number(args[portFlagIndex + 1]) : 4173;

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('Build output not found. Run "npm run build" first.');
  process.exit(1);
}

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url ?? '/', `http://${host}:${port}`);
  const pathname = requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname;
  const filePath = path.join(dist, pathname);

  if (!filePath.startsWith(dist)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }

  const extension = path.extname(filePath);
  response.writeHead(200, {
    'Content-Type': contentTypes[extension] ?? 'application/octet-stream',
    'Cache-Control': 'no-cache',
  });
  fs.createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Preview available at http://${host}:${port}`);
});
