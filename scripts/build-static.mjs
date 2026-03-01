import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const dist = path.join(root, 'dist');
const sourceHtml = path.join(root, 'index.html');
const sourceCss = path.join(root, 'src', 'style.css');

function normalizeBasePath(value) {
  if (!value || value === '/') {
    return '/';
  }

  const trimmed = value.trim().replace(/^\/+|\/+$/g, '');

  if (!trimmed) {
    return '/';
  }

  return `/${trimmed}/`;
}

const basePath = normalizeBasePath(process.env.BASE_PATH);
const cssPath = `${basePath}style.css`;
const scriptPath = `${basePath}main.js`;

fs.mkdirSync(dist, { recursive: true });

const html = fs
  .readFileSync(sourceHtml, 'utf8')
  .replace('href="/src/style.css"', `href="${cssPath}"`)
  .replace('src="/src/main.ts"', `src="${scriptPath}"`);

fs.writeFileSync(path.join(dist, 'index.html'), html);
fs.copyFileSync(sourceCss, path.join(dist, 'style.css'));
