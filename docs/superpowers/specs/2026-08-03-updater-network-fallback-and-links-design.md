# 更新检查兼容与 GitHub 链接设计

## 目标

修复 Windows 便携版手动检查更新时只显示“请检查网络连接”的问题，并在编辑器设置中提供仓库与作者主页入口。保持现有 PVC 交互、项目存储格式、单文件 EXE 和 GitHub Release 资产规则不变。

## 问题判断

远程仓库的 GitHub Releases API、正式版本、`ASC.<version>.exe` 资产和 SHA-256 digest 均有效。当前前端会把 Rust 后端返回的代理、TLS、限流和响应解析错误统一替换为通用网络提示，因此用户无法判断真实原因。当前 `ureq` 请求也不一定继承 Windows 系统代理设置。

## 更新网络策略

Rust updater 继续使用现有 `ureq` 作为首选通道。GitHub Release 查询失败时，调用隐藏的 Windows PowerShell 进程执行同一个固定 API 请求，并解析其 JSON 输出；资产下载失败时使用 PowerShell 下载到同一个 `.part` 文件，Rust 继续负责大小限制、SHA-256 校验、最终改名和安装。

备用通道只接受代码内固定的 GitHub 仓库和经过 Release 资产筛选得到的 HTTPS 下载地址，不接受前端传入任意 URL。PowerShell 进程隐藏运行，下载期间由 Rust 轮询临时文件大小并继续发送 `updater://progress` 事件。

前端手动检查失败时显示后端返回的实际错误摘要，例如 GitHub 限流、TLS 失败或两个通道均不可用。启动时自动检查仍保持静默，不能阻塞编辑器启动。

## 设置页链接

设置对话框增加“关于”区域，展示：

- 仓库：`ZhangStudyLife/asc-track-designer`
- 作者：`github.com/ZhangStudyLife`

桌面版通过 Tauri opener 在系统默认浏览器打开固定 HTTPS 地址；网页版使用带 `noopener noreferrer` 的新标签页链接。链接不写入设置数据，也不影响保存和取消操作。

## 验证

- 单元测试覆盖错误信息保留、固定 URL 校验和 Release 解析。
- Playwright 验证设置页显示两个链接，网页版点击目标和安全属性正确。
- Rust 测试覆盖 PowerShell 参数生成、路径转义及不可信下载地址拒绝。
- 运行 `npm run lint`、`npm run test:run`、`npm run test:e2e`、`npm run build`、`cargo test --manifest-path src-tauri/Cargo.toml --lib`、`npm run tauri:check` 和 `npm run dist:win`。
- 最终产物仍为单文件 `release/ASC.2.2.0.exe`，并通过启动冒烟测试。
