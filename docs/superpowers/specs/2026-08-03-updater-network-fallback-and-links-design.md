# 更新检查、关于页面与数据兼容设计

## 目标

ASC Track Designer `2.2.0` 使用“静态签名清单为主、GitHub API 为备用、PowerShell 仅作为网络兜底”的三级更新方案，并在设置中增加关于区域和存储 schema 机制。保持 PVC 交互、现有 localStorage keys、Tauri identifier `com.asc.trackdesigner` 和单文件便携 EXE 不变。

## 更新来源与网络通道

首选来源是每个正式 GitHub Release 都附带的固定资产 `latest.json`，应用通过 `https://github.com/ZhangStudyLife/asc-track-designer/releases/latest/download/latest.json` 获取。该文件是签名信封：`payload` 保存 Base64 编码的 UTF-8 JSON 原文，`signature` 保存对原始 payload 字节的 Ed25519 签名。payload 包含版本、最低兼容版本、发布时间、更新摘要、Release Notes 地址、Windows EXE 地址、大小和 SHA-256。应用先验证签名再解析 payload，避免 JSON 字段顺序影响签名。应用内只保存公钥；私钥只通过发布环境变量或 GitHub Actions Secret 提供，不写入仓库和 EXE。

静态清单不可用时，Rust updater 查询固定仓库 `ZhangStudyLife/asc-track-designer` 的最新正式 GitHub Release，并从该 Release 严格匹配 `latest.json` 和 `ASC.<version>.exe`；备用路径仍验证同一份签名信封，不能只依赖 GitHub API 返回的 digest。两个 Rust HTTPS 请求都失败时，Windows 版使用隐藏 PowerShell 进程请求相同的固定 URL，以兼容系统代理。PowerShell 不是独立更新来源，也不接受前端传入任意 URL。

资产下载同样先使用 Rust HTTP；失败后由 PowerShell 下载到既有 `.part` 路径，Rust 轮询文件大小并继续发送 `updater://progress`。无论使用哪个通道，最终都由 Rust 校验签名清单、大小、SHA-256、下载目录、GitHub Release 下载域名和 EXE 名称后才能安装。

启动自动检查延迟 20 秒且保持静默；每次启动只检查一次。手动检查立即执行并显示实际错误摘要，包括清单签名无效、GitHub 限流、TLS、代理和两个网络通道均失败。错误不能阻塞编辑器。

## 更新日志

仓库增加 `CHANGELOG.md`，采用面向用户的 `新增`、`修复`、`改进`、`安全` 和按需出现的 `数据兼容` 分类。保留顶部 `未发布` 区域，版本日期使用 `YYYY-MM-DD`。CI、测试、依赖整理和内部重构不进入用户更新日志，除非影响交付结果。

GitHub Release 正文与对应版本的 changelog 保持一致；静态清单只保存适合弹窗展示的简短摘要和完整 Release Notes 链接。更新弹窗不直接展示 Git commit 列表。

发布脚本从统一版本号、已生成 EXE、对应 changelog 段落和 Release URL 生成 payload，计算文件大小与 SHA-256，再使用环境变量 `ASC_UPDATER_PRIVATE_KEY` 签名并输出 `release/latest.json`。首次启用时生成一次 Ed25519 密钥对，公钥编译进应用，私钥写入 GitHub Actions Secret；Release 必须同时上传 EXE 和 `latest.json` 后才能发布为 latest。

## 数据与缓存兼容

新增 localStorage key `ascStorageSchemaVersion`，当前 schema 为 `1`。`2.2.0` 只在现有数据成功读取后登记 schema 版本，不改写 `currentTrackProject`、`piecesHistory`、`trackSizes`、`trackArchives`、`archive_*`、主题或 `pvcEditorSettings`。

后续 schema 变化通过顺序、幂等的 migration registry 执行。破坏性迁移前备份耐久数据，全部步骤成功后才更新 schema 版本；失败时保留原数据并停止迁移。更新 EXE 本身不执行数据迁移，新版本首次正常启动时才迁移。

用户数据与缓存分离。WebView localStorage 和项目存档属于耐久数据，更新器不得清理；`%LOCALAPPDATA%\ASC Track Designer\updates` 只存放下载缓存，可以在新版本成功启动后清理旧版本目录。

替换脚本生成随机更新 token，将旧 EXE 改名为 `.old` 后使用 `--asc-update-token <token>` 启动新版本。新版本完成 Tauri 初始化、窗口创建和存储 schema 检查后，在应用数据目录写入对应成功标记。替换脚本等待最多 60 秒：收到标记后删除 `.old` 和旧下载缓存；新进程在标记前退出则恢复旧 EXE 并重新启动；超时但新进程仍运行时保留 `.old`，不强制回滚正在运行的程序。

## 设置页关于区域

设置对话框增加紧凑的“关于”区域，显示当前版本，并提供两个固定入口：

- 项目仓库：`https://github.com/ZhangStudyLife/asc-track-designer`
- 作者主页：`https://github.com/ZhangStudyLife`

桌面版通过 Tauri opener 在系统默认浏览器打开，并在 capabilities 中仅允许固定 GitHub HTTPS 地址；网页版使用 `target="_blank"` 和 `rel="noopener noreferrer"`。链接不写入编辑器设置，也不影响保存或取消。

## 验证

- TypeScript 测试覆盖版本比较、错误保留、清单展示、跳过版本和 schema 初始化。
- Rust 测试覆盖签名信封解析、Release 备用匹配、固定 URL 限制、PowerShell 参数、大小/SHA-256/Ed25519 校验、启动 token 和替换脚本。
- Playwright 验证网页版隐藏 EXE 更新入口、关于区域版本与两个安全外链，以及 PVC 原有交互回归。
- 验证旧版 localStorage fixture 升级后所有现有 key 和值不变，只新增 `ascStorageSchemaVersion=1`。
- 运行 `npm run lint`、`npm run test:run`、`npm run test:e2e`、`npm run build`、`cargo test --manifest-path src-tauri/Cargo.toml --lib`、`npm run tauri:check` 和 `npm run dist:win`。
- 最终产物仍为单文件 `release/ASC.2.2.0.exe`，并通过启动冒烟测试。
