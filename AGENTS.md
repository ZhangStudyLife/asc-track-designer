# Repository Guidelines

## Project Structure & Module Organization

The Vite entry is `src/main.tsx`; `src/app/` contains the application shell and global styles. PVC behavior is grouped under `src/features/pvc/`: pure geometry, parsing, statistics, and types live in `domain/`; Zustand state, history, and storage live in `application/`; React and SVG components live in `ui/`. The optional community UI and Supabase client are under `src/features/workshop/`; database migrations and Edge Functions are under `supabase/`. Shared browser/Tauri adapters are under `src/shared/`. The Rust desktop shell, permissions, icon, and Tauri configuration are in `src-tauri/`; `src-tauri/vendor/` contains the narrow WebView2 loader patch required by the single-file GNU build. Static web assets are in `public/`, and Playwright workflows are in `tests/e2e/`.

## Build, Test, and Development Commands

- `npm install`: install frontend and Tauri CLI dependencies.
- `npm run dev`: start Vite and open the Tauri desktop app.
- `npm run dev:web`: run only the browser version on `127.0.0.1:5173`.
- `npm run build`: type-check and build static assets into `dist/`.
- `npm run dist:win`: produce `release/ASC.<version>.exe` as one portable file.
- `npm run lint`: lint TypeScript and TSX files.
- `npm run test:run`: run the Vitest suite once.
- `npm run test:e2e`: run Playwright PVC workflows.
- `npm run tauri:check`: check the Rust desktop shell without packaging.

## Coding Style & Naming Conventions

Use TypeScript, React function components, and the existing compact style. Keep domain modules free of React and Tauri imports. Use `PascalCase` for components and types, `camelCase` for functions and state, and descriptive event names such as `handleCanvasMouseDown`. Do not change geometry constants or formulas while reorganizing UI code. ESLint uses `.eslintrc.json`; TypeScript validation uses `tsc --noEmit`.

## Testing Guidelines

Vitest files use `*.test.ts` beside the module they cover. Browser tests use `*.spec.ts` under `tests/e2e/`. Any PVC interaction change must preserve add, drag, snap, selection, measurement, auto-fill, import/export, undo/redo, and keyboard behavior. Run lint, unit tests, the production build, and the smallest relevant Playwright workflow.

## Commit & Pull Request Guidelines

Use concise Conventional Commit messages such as `feat: ...`, `fix: ...`, or `refactor: ...`. Pull requests should explain user-visible behavior, list verification commands, link related issues, and include screenshots for visual changes. Never commit `dist/`, `release/`, `src-tauri/target/`, or `node_modules/`.
