# Daily Box Puzzle

A lightweight daily box-pushing puzzle game built with TypeScript and the HTML canvas.

Each day maps to a deterministic puzzle from a built-in level pack, with local progress tracking, streaks, undo/redo, smooth animations, and shareable results.

Repository: `https://github.com/tanelirautio/daily-box-puzzle`

## Features

- Daily puzzle selection based on the local date
- `?date=YYYY-MM-DD` override for testing
- Keyboard controls plus undo, redo, and restart
- Optional movement animations
- Local stats, streak tracking, and share text
- Static build output for easy deployment

## Controls

- Move: Arrow keys or `WASD`
- Undo: `Z` or `Backspace`
- Redo: `Y` or `Shift+Z`
- Restart: `R`

## Development

Install dependencies:

```bash
npm install
```

Run the local dev server:

```bash
npm run dev
```

Run tests:

```bash
npm test
```

Build production files:

```bash
npm run build
```

Preview the built site locally:

```bash
npm run preview
```

## Deployment

The project builds to static files in `dist/`.

### GitHub Pages

This repository already includes a GitHub Pages workflow in `.github/workflows/deploy-pages.yml`.

To publish:

1. Push the repository to `main`.
2. In GitHub, open `Settings` -> `Pages`.
3. Set `Source` to `GitHub Actions`.
4. Wait for the workflow to finish.

The site will be published at:

`https://tanelirautio.github.io/daily-box-puzzle/`

For local verification with the same subpath setup:

PowerShell:

```powershell
$env:BASE_PATH = '/daily-box-puzzle/'
npm run build
npm run preview
```

POSIX shells:

```bash
BASE_PATH=/daily-box-puzzle/ npm run build
npm run preview
```

To reset back to root-path asset URLs in PowerShell:

```powershell
Remove-Item Env:BASE_PATH
```

### Render Static Site

Use:

- Build command: `npm install && npm run build`
- Publish directory: `dist`

If you deploy under a subpath, set `BASE_PATH` before building.

## Project Notes

- Runtime data such as stats and streaks are stored in `localStorage`.
- Invalid `?date=` values fall back to today and show a friendly in-app notice.
- The production build uses a static TypeScript emit and a small preview server so it works reliably in this environment.

## License

MIT License. See `LICENSE`.
