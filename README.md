# ASC Track Designer

ASC Track Designer is a Next.js and Electron application for designing intelligent car race tracks. The app provides a visual editor for arranging track pieces, measuring distances, snapping connections, and exporting designs.

## Requirements

- Node.js 20 or newer
- npm
- Windows is recommended for Electron packaging because the configured build target is Windows x64.

## Install

```bash
npm install
```

## Development

Run the desktop development app:

```bash
npm run dev
```

This starts the Next.js dev server on `http://localhost:3000`, waits for it to become available, and then opens the Electron shell.

Run only the production web server after building:

```bash
npm run start:next
```

Run Electron directly:

```bash
npm run start
```

## Build and Package

Create a production Next.js build:

```bash
npm run build
```

Package the Electron app:

```bash
npm run dist
```

Package the Windows x64 build:

```bash
npm run dist:win
```

Generated build output is ignored by git. Electron packages are written to `release/`.

## Project Structure

```text
.
├── electron.js          # Electron main process
├── package.json         # npm scripts, dependencies, Electron Builder config
├── public/              # static assets, including icons and logo
├── src/
│   ├── app/             # Next.js App Router UI and styles
│   └── types/           # local TypeScript declarations
├── next.config.js       # Next.js configuration
├── tailwind.config.js   # Tailwind CSS configuration
└── tsconfig.json        # TypeScript configuration
```

## Quality Checks

Run lint checks before submitting changes:

```bash
npm run lint
```

Run a production build for changes that affect app behavior, assets, or packaging:

```bash
npm run build
```

## Configuration

Use `.env.example` as the template for local environment variables. Do not commit real secrets or generated folders such as `.next/`, `out/`, `release/`, or `node_modules/`.
