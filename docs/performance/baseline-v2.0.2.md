# ASC Track Designer v2.0.2 Baseline

Measured on the user's Windows machine on 2026-08-01. These values are comparison evidence, not synthetic targets.

## Build

- `npm run lint`: passed with no warnings.
- `npm run build`: passed with Next.js 15.0.7.
- First-load JavaScript reported by Next.js: 114 kB for `/`.

## Portable EXE

- Artifact: `release/ASC赛道设计器 2.0.2.exe`.
- Size: 88,104,207 bytes (84.0 MiB).
- Launcher process created: 17:04:25.
- Extracted Electron main process created: 17:04:42, about 17 seconds later.
- Renderer process created: 17:04:50, about 25 seconds after launcher creation.

The timestamps are process-creation measurements. They are a repeatable proxy for extraction and renderer readiness, not a claim about exact first-paint time.

## Idle Process Memory

After renderer startup, the measured application processes used:

| Process | Working set |
| --- | ---: |
| Portable launcher | 27,422,720 bytes |
| Electron main | 110,891,008 bytes |
| GPU process | 108,085,248 bytes |
| Network utility | 53,620,736 bytes |
| Renderer | 98,123,776 bytes |
| **Total** | **398,143,488 bytes (379.7 MiB)** |

## Required Comparison

The final Tauri release must be measured with the same method and report:

- Portable EXE size.
- Launcher-to-main-window and renderer/webview readiness timing.
- Idle working set after 30 seconds.
- Loaded 200-piece working set and drag/zoom trace.

## Vite + Electron Transition Check

Measured after replacing the Next.js standalone server with a Vite static build while retaining the Electron shell:

- Vite production build: about 0.6 seconds.
- Frontend JavaScript: 196.30 kB, 61.13 kB gzip.
- Portable EXE: 76,251,861 bytes (72.7 MiB).
- Launcher to visible editor window: 4,512 ms.
- Idle process working set: 355,639,296 bytes (339.2 MiB).

This is an intermediate rollback point. It proves that removing the embedded HTTP server fixes most startup delay, while the remaining Chromium processes justify completing the Tauri migration.
