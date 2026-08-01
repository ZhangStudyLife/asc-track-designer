# webview2-com-sys Patch

This directory is derived from `webview2-com-sys` 0.38.2, published under the MIT license at <https://github.com/wravery/webview2-rs>.

The generated bindings and x64 `WebView2Loader.dll` come from that release. The local `lib.rs` changes only the five loader imports: it resolves them from the loader path prepared by the ASC application instead of requiring a sibling DLL. This keeps the distributed Windows artifact to one EXE while preserving the upstream COM API surface.

When upgrading Tauri or `webview2-com`, verify that the upstream `webview2-com-sys` version and exported loader functions still match this patch.
