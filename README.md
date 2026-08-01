# ASC Track Designer

ASC Track Designer is a React and TypeScript editor for laying out PVC intelligent-car tracks. The desktop application uses Tauri 2 and the system WebView2 runtime; the same Vite frontend can be deployed as a static website.

## Requirements

- Node.js 20 or newer and npm
- Rustup with the repository-selected Windows GNU toolchain
- Microsoft Edge WebView2 Runtime

## Development

```bash
npm install
npm run dev
```

`npm run dev` starts Vite and opens the Tauri desktop window. Use `npm run dev:web` when only the browser frontend is needed.

## Build and Package

```bash
npm run build
npm run dist:win
```

`npm run build` creates the static Vite site in `dist/`. `npm run dist:win` builds the optimized Tauri application and writes the single portable executable to `release/ASC.2.0.2.exe`. WebView2 remains a Windows system dependency. On first launch, the EXE writes its embedded 160 KB WebView2 loader to the user's application-data directory; no sibling DLL or Node.js server is required.

## Quality Checks

```bash
npm run lint
npm run typecheck
npm run test:run
npm run test:e2e
npm run tauri:check
```

## Project Structure

```text
src/app/                    application shell and global styles
src/features/pvc/domain/    geometry, parsing, statistics, and types
src/features/pvc/application/ editor state, history, and storage
src/features/pvc/ui/        PVC editor and SVG rendering components
src/shared/                 platform adapters and legacy data migration
src-tauri/                  Rust entry point, permissions, and app metadata
public/                     web assets and product icon
tests/                      Playwright browser workflows and fixtures
```

Generated folders such as `dist/`, `release/`, `src-tauri/target/`, and `node_modules/` are ignored by git.
