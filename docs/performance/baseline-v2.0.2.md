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

## Final Tauri 2 Release

Measured after retiring Next.js and Electron and rebuilding the single-file Tauri release with startup preflight:

- Vite production JavaScript: 204.40 kB, 64.89 kB gzip.
- Artifact: `release/ASC.2.0.2.exe`.
- Size: 20,629,504 bytes (19.67 MiB).
- SHA256: `C9A8EA6D639F4BC948BEE37A3AC029137551ABAC76880C72C7C0422385676E99`.
- Empty-folder verification: one distributed file; window visible in 987 ms.
- The EXE has no `WebView2Loader.dll` import or sibling DLL requirement.
- Startup calls `GetAvailableCoreWebView2BrowserVersionString` before Tauri creates the window. Failure shows the official WebView2 download URL.
- Unicode native round trips passed for `中文赛道输入.json`, `中文赛道导出.json`, and `中文赛道图片.png`. The exported JSON contained three pieces and the image had a valid PNG signature.
- The Vercel production alias serves the Vite artifact. Add, drag, and three-piece JSON import passed against `https://asc-track-designer.vercel.app`.

After 30 seconds, the final build used seven processes:

| Measurement | Empty project | 200 pieces |
| --- | ---: | ---: |
| Tauri parent working set | 37.8 MiB | 38.0 MiB |
| Total private memory | 209.5 MiB | 274.1 MiB |
| Total process working set | 386.2 MiB | 427.4 MiB |

The desktop 200-piece drag and zoom trace recorded 4,028 frames with a 5.7 ms p95 interval, a 16.7 ms maximum interval, and no long task over 100 ms. Only the dragged piece changed. The original 180/220 MiB total-working-set targets remain unmet because the system WebView2 browser, renderer, GPU, and utility processes dominate the total; GPU acceleration remains enabled to preserve the measured interaction result.
