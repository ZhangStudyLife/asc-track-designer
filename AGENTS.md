# Repository Guidelines

## Project Structure & Module Organization

This repository is a small Next.js 15 + React 18 application packaged with Electron. The main UI lives in `src/app/page.tsx`, with app metadata and layout in `src/app/layout.tsx` and shared styles in `src/app/globals.css`. Static assets, including the app icon and lab logo, are in `public/`. Electron startup logic is in `electron.js`. Keep root-level files limited to required app, build, and contributor files.

## Build, Test, and Development Commands

Install dependencies with:

```bash
npm install
```

Run the desktop development app:

```bash
npm run dev
```

This starts Next.js on `localhost:3000`, waits for it, then launches Electron.

Useful scripts:

- `npm run build`: creates a production Next.js build.
- `npm run start:next`: serves the built web app with Next.js.
- `npm run start`: launches Electron directly.
- `npm run dist:win`: builds a Windows x64 Electron package in `release/`.
- `npm run lint`: runs the configured Next.js ESLint check.
- `npm run clean`: removes generated build output and `node_modules`.

## Coding Style & Naming Conventions

Use TypeScript and React function components. Match the existing compact style in `src/app`: two-space indentation is not enforced, semicolons are used inconsistently, and imports generally stay minimal. Prefer clear local state names such as `isDragging`, `measurePoints`, or `handleMeasurePointClick`. Keep UI changes inside the relevant app files unless shared styling truly belongs in `globals.css`.

## Testing Guidelines

No dedicated test framework or `tests/` directory is currently present. For now, verify changes with `npm run lint` and the smallest relevant manual workflow in `npm run dev`. If tests are added later, place them near the code they cover or under a clear `tests/` directory, and document the new command in `package.json`.

## Commit & Pull Request Guidelines

Recent history uses short Chinese summaries and occasional Conventional Commit prefixes such as `feat:` and `fix:`. Prefer `feat: ...`, `fix: ...`, or a concise Chinese imperative summary. Pull requests should describe the user-visible change, list verification steps, link related issues when available, and include screenshots or exported images for visual track-designer changes.

## Security & Configuration Tips

Use `.env.example` as the template for local configuration. Do not commit real secrets, generated `release/` artifacts, `.next/`, `out/`, or `node_modules/`.
