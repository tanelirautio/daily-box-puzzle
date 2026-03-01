import { defineConfig } from 'vite';

function normalizeBasePath(value: string | undefined): string {
  if (!value || value === '/') {
    return '/';
  }

  const trimmed = value.trim().replace(/^\/+|\/+$/g, '');

  if (!trimmed) {
    return '/';
  }

  return `/${trimmed}/`;
}

export default defineConfig({
  base: normalizeBasePath(process.env.BASE_PATH),
});
