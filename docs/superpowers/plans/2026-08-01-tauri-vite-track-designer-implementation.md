# Tauri + Vite Track Designer Implementation Plan

## Objective

Migrate ASC Track Designer from Next.js + Electron to Tauri 2 + Vite + React 18/TypeScript, preserve the complete PVC editor behavior and legacy data formats, improve startup and 200-piece interaction performance, and deliver one portable Windows EXE.

Design source: `docs/superpowers/specs/2026-08-01-tauri-vite-track-designer-design.md`.

## Global Rules

- Keep geometry formulas and units byte-for-byte equivalent unless a characterization test proves the move is behavior-neutral.
- Each phase ends with a dedicated commit and a clean worktree.
- Keep the previous runnable shell until the replacement passes its phase gate.
- Do not add beacon behavior, redesign UI, or change project/archive JSON.
- Do not remove Next/Electron merely because Tauri compiles; remove them only after final regression and packaging checks.

## Phase 1: Baseline and Characterization

### Files

- Add `vitest.config.ts`.
- Add `src/features/track/*.test.ts` beside pure domain files.
- Add `tests/fixtures/pvc/*.json` for single-piece, connected, and 200-piece projects.
- Add `scripts/measure-startup.ps1` and `scripts/verify-portable.ps1` only where automation replaces a repeatable manual measurement.
- Update `package.json` with `typecheck`, `test`, and `test:run` scripts.

### Work

1. Record current `v2.0.2` portable EXE size and release working set.
2. Capture exact expected values for straight/curve endpoints, distance, nearest snapping, auto-fill, parser output, and BOM totals.
3. Capture legacy storage envelopes for all current keys, including theme.
4. Generate a deterministic 200-piece fixture without changing product code.

### Verify

- `npm run typecheck`
- `npm run lint`
- `npm run test:run`
- `npm run build`
- Existing portable Electron EXE launches and loads the fixtures.

### Commit

`test: capture PVC behavior and performance baseline`

## Phase 2: Electron Data Migration Bridge

### Files

- Add `src/shared/storage/migration.ts` with the versioned envelope type and known-key collection.
- Add a minimal IPC handler in `electron.js` for atomic migration-envelope writes.
- Add `src/types/electron.d.ts` only if the renderer bridge requires a typed global.
- Add migration tests using in-memory storage.

### Work

1. Serialize `piecesHistory`, `trackSizes`, `hiddenFixedSizes`, `trackArchives`, every `archive_*`, `currentTrackProject`, and `trackDesignerTheme`.
2. Write `%APPDATA%/asc-track-designer/migration-state-v1.json` atomically after initial load and after persisted state changes.
3. Never delete browser localStorage or overwrite a valid migration file with malformed state.
4. Keep the existing renderer behavior and storage keys unchanged.

### Verify

- Unit tests cover empty, populated, malformed, and archive-prefixed storage.
- Launch current Electron shell, edit a project, exit, and validate the migration envelope against its schema.
- `npm run lint`, `npm run test:run`, and `npm run build` pass.

### Commit

`feat: add legacy desktop data migration bridge`

## Phase 3: Replace Next Build with Vite

### Files

- Add `index.html`, `vite.config.ts`, and `src/main.tsx`.
- Replace `src/app/layout.tsx` and Next page entry with `src/app/App.tsx` while preserving page implementation.
- Move global stylesheet import to the Vite entry.
- Update Electron development URL and packaged file loading.
- Update Vercel configuration for Vite static output.
- Update package scripts and dependencies, but retain Electron during this phase.

### Work

1. Render the current editor as a normal React client application.
2. Ensure all asset paths work under Tauri's future embedded origin and Vercel's root deployment.
3. Electron development uses the Vite dev server; packaged Electron loads `dist/index.html` directly.
4. Remove the local Next standalone server from the Electron runtime only after file loading works.

### Verify

- `npm run dev:web` serves the editor.
- `npm run build` creates static `dist/` output.
- Browser smoke test covers add, drag, zoom, box selection, measurement, auto-fill, import, and export.
- Electron development and packaged shells open without a localhost production server.
- Vercel preview loads and can add/drag PVC pieces.

### Commit

`build: migrate frontend runtime from Next to Vite`

## Phase 4: Establish Feature Boundaries

### Files

- Move track domain files to `src/features/pvc/domain/`.
- Add `src/features/pvc/application/` for project, archive, and editor operations.
- Move the current designer to `src/features/pvc/ui/PvcDesigner.tsx`.
- Move canvas/minimap components to `src/features/pvc/ui/`.
- Add `src/app/AppShell.tsx` and a minimal mode contract.
- Add shared coordinate/storage/file boundaries only when consumed by both app shell and PVC.

### Work

1. Move pure files first with import-only changes.
2. Extract UI sections by existing responsibility; do not rewrite handlers while moving them.
3. Keep PVC state ownership in `PvcDesigner` until the normalized store phase.
4. Keep future beacon support as a type/module boundary, not an implemented screen.

### Verify

- Characterization tests remain unchanged and pass.
- Compare exported JSON and image dimensions with baseline fixtures.
- Complete the PVC regression matrix from the design.
- `rg "features/track|src/app/page" src` has no stale imports after the final move.

### Commit

`refactor: separate PVC editor feature boundaries`

## Phase 5: Normalize State and Render Updates

### Files

- Add `src/features/pvc/application/editorStore.ts`.
- Add `src/features/pvc/application/history.ts`.
- Add focused selectors/hooks under the PVC application layer.
- Split SVG piece rendering into memoized `TrackPieceView` components.
- Keep domain geometry files unchanged.

### Work

1. Introduce Zustand with `pieceIds` and `piecesById` while preserving draw order.
2. Migrate one behavior group at a time: selection, add/delete, drag/snap, rotation, measurement/auto-fill, project operations.
3. Keep pointer positions transient and apply at most one state update per animation frame.
4. Subscribe each SVG piece only to its own record and selection status.
5. Replace runtime snapshot undo with commands; materialize legacy snapshots when persisting `piecesHistory`.
6. Cancel pending animation frames and transient resources on unmount.

### Verify

- Store/command tests cover every editing operation and undo/redo round trip.
- Existing `piecesHistory` fixtures load and remain writable in the old format.
- A 200-piece drag/zoom trace meets the design frame-time criteria or has a documented profile/fix before proceeding.
- All keyboard and multi-selection workflows pass.

### Commit

`perf: isolate PVC state and incremental rendering`

## Phase 6: Add Tauri Shell and Native Adapters

### Files

- Add `src-tauri/Cargo.toml`, `src-tauri/build.rs`, `src-tauri/tauri.conf.json`, capabilities, icons, and Rust entry files.
- Add project-local `@tauri-apps/cli` and required official plugins.
- Add `src/shared/platform/desktop.ts`, `browser.ts`, and adapter selection.
- Add Tauri migration-envelope import and WebView2 preflight.

### Work

1. Load Vite assets directly in Tauri without Node.js or an HTTP server.
2. Implement open/save project and image export through narrow adapters.
3. Keep browser fallbacks for Vercel.
4. Import the Electron migration envelope once, validate it, preserve a backup, and never overwrite newer Tauri state.
5. Check WebView2 before creating the window and show a native failure dialog when unavailable.
6. Configure least-required Tauri capabilities; no shell execution or broad filesystem access.

### Verify

- `npm run tauri:dev` launches the editor.
- Native open/save/export paths work with Unicode filenames.
- Migration test restores projects, archives, sizes, history, and theme.
- Browser/Vercel behavior remains functional without Tauri globals.
- Rust checks and frontend checks pass.

### Commit

`feat: run track designer in Tauri shell`

## Phase 7: Single-File Portable Release

### Files

- Finalize Tauri release profile, application metadata, and embedded icons.
- Add a release-copy script only if Tauri cannot directly emit the required versioned filename.
- Update README commands and platform requirements.
- Remove Electron/Next files, dependencies, scripts, and standalone preparation after validation.

### Work

1. Produce the optimized raw Tauri executable.
2. Copy/rename it to `release/ASC.<version>.exe` without external application files.
3. Verify no sidecar, `.next`, Node runtime, asset directory, or project-owned DLL is required.
4. Remove Electron, electron-builder, Next, wait-on, concurrently, and obsolete configuration.
5. Keep Vite static web build and Vercel deployment configuration.

### Verify

- `npm run lint`
- `npm run typecheck`
- `npm run test:run`
- `npm run build`
- `npm run tauri:check`
- `npm run dist:win`
- Run `scripts/verify-portable.ps1` against an otherwise empty folder.
- Launch the copied EXE, complete the full PVC regression matrix, close it, and confirm no background process remains.
- Compare startup, memory, interaction trace, and package size against Phase 1.
- Verify the web deployment separately.

### Commit

`release: migrate ASC Track Designer to Tauri`

## Final Completion Evidence

The migration is complete only when all of the following are present:

- The repository has no runtime dependency on Next.js or Electron.
- Vite builds the React/TypeScript frontend and Tauri embeds it.
- The Windows artifact is one portable EXE and runs from an empty folder.
- Existing PVC JSON, archives, storage keys, and bridge data load correctly.
- The full PVC regression matrix passes.
- Measured startup and 200-piece interaction meet the approved targets or the user has explicitly approved revised measured limits.
- Vercel serves the static web editor and core drawing behavior works there.
