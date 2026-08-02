# 便携版自动更新设计

## 目标与范围

ASC Track Designer `2.2.0` 增加 Windows 便携版自动更新。桌面应用启动数秒后检查一次 `ZhangStudyLife/asc-track-designer` 的最新正式 GitHub Release；发现更高版本时，在左上角显示新版本按钮。用户可以查看 Release 更新说明并选择“开始更新”“跳过此版本”或“本次不更新”。

本功能保持单文件 EXE 发布方式，不引入 MSI、NSIS 或后台常驻服务。网页版始终由部署平台更新，不显示 EXE 更新入口。本次不修改 PVC 几何、交互或现有项目 JSON 格式。

## 方案选择

采用自定义 Tauri 便携版更新器。Tauri 官方 Updater 更适合签名安装包，与当前 `tauri build --no-bundle` 和单文件交付方式不匹配；仅下载后要求用户手动覆盖又不满足自动更新体验。

更新器由三个边界组成：

- `src/features/updater/`：版本比较、更新状态、跳过版本记录和可复用 React 界面。
- `src/shared/platform/updater.ts`：浏览器与 Tauri 调用边界；网页版返回“不支持桌面更新”。
- `src-tauri/src/updater.rs`：GitHub Release 查询、资产下载、SHA-256 校验、替换脚本生成和应用退出。

## 更新发现与界面

应用启动后延迟约 3 秒检查一次，不在运行期间轮询。只接受非草稿、非预发布版本，版本号采用 `vMAJOR.MINOR.PATCH`，并与编译时 `CARGO_PKG_VERSION` 比较。

目标 Release 必须包含名称严格匹配 `ASC.<版本>.exe` 的资产。更新信息包含版本号、Release 标题、正文、发布时间、下载大小和资产地址。发现新版本后，PVC 编辑器左上角显示“发现 vX.Y.Z”按钮；点击打开更新对话框，展示 GitHub Release 正文和以下动作：

- **开始更新**：保存编辑状态，下载、校验、退出、替换并重启。
- **跳过此版本**：将版本写入 `localStorage` key `ascUpdaterSkippedVersion`，以后不再提示该版本；更高版本仍会提示。
- **本次不更新**：仅关闭当前会话中的提示，下次启动重新检查。

编辑器设置对话框增加“检查更新”命令，可立即重新检查并反馈“已是最新版”或打开新版本对话框。桌面更新控件由 updater 功能模块提供，当前挂载到 PVC 工具栏；新增其他设计模式时复用同一组件，不复制更新逻辑。网页版隐藏启动检查、左上角按钮和设置中的检查命令。

检查失败不弹出阻塞错误，也不影响编辑器启动。用户主动开始更新后的下载或安装错误必须显示明确原因并允许重试。

## 下载、安全与替换

Rust 后端直接访问 GitHub API，并限制仓库、Release 类型和资产命名。下载写入 `%LOCALAPPDATA%\ASC Track Designer\updates\vX.Y.Z\ASC.X.Y.Z.exe.part`，最大允许 150 MiB。下载完成后同时校验资产声明大小和 GitHub 提供的 `sha256:` digest；任一校验失败即删除临时文件，绝不触碰当前 EXE。校验成功后将临时文件改名为 `.exe`。

开始安装前，更新器检查当前 EXE 所在目录是否可写。可写时生成仅包含本机已校验路径的临时 `.cmd`：等待当前进程退出，将旧 EXE 重命名为 `.old`，移动新 EXE 到原路径，启动新程序，再删除备份和脚本。替换失败时恢复 `.old`，确保旧程序仍可启动。

如果当前目录无写权限，不请求管理员权限，也不破坏旧程序。界面改为提示已下载文件的位置，由用户手动替换。

## 数据兼容与保存

更新不会删除或迁移现有 WebView 数据。`tauri.conf.json` 中的 identifier 固定保持 `com.asc.trackdesigner`，现有 localStorage keys 和 JSON 格式保持不变，因此项目、历史、尺寸、主题、快捷键及编辑器颜色继续由原存储位置读取。

用户点击“开始更新”时，PVC 编辑器在调用原生安装命令前显式写入当前赛道项目并刷新历史记录。只有保存成功后才允许退出。新版本继续执行现有存储迁移逻辑；新增 updater key 与项目数据隔离。

## 状态与错误处理

更新状态限定为 `idle`、`checking`、`available`、`downloading`、`ready`、`installing` 和 `error`。下载阶段显示百分比与已下载大小；按钮在运行中禁用，防止重复任务。关闭对话框不会中断已开始的下载。

网络超时、GitHub 限流、资产缺失、摘要缺失、校验失败、磁盘写入失败和目录无权限分别返回可读错误。日志和界面不得显示 GitHub 凭据；公开仓库访问不使用用户 Token。

## 验证标准

- 单元测试覆盖版本比较、正式版过滤、资产选择、跳过版本和 Release 正文解析。
- Rust 测试覆盖大小/SHA-256 校验、临时路径和替换脚本路径转义；测试不替换真实程序。
- Playwright 验证网页版隐藏更新入口，以及模拟桌面更新状态下按钮、说明、三个动作和错误状态。
- 更新前后验证 `currentTrackProject`、`piecesHistory`、`trackSizes`、`trackArchives`、主题和 `pvcEditorSettings` 不丢失。
- 运行 `npm run lint`、`npm run test:run`、`npm run test:e2e`、`npm run build`、`npm run tauri:check` 和 `npm run dist:win`。
- 最终产物仍为单文件 `release/ASC.2.2.0.exe`，并通过启动冒烟测试。
- `package.json`、npm lockfile、Tauri 配置、Cargo 清单和 Cargo lockfile 的第一方版本统一为 `2.2.0`。

完整的真实自替换链路需要“已安装旧版发现已发布新版”这一前提。`2.2.0` 首次引入更新器时，通过本地模拟 Release 验证下载和替换准备流程；发布后，后续版本再执行真实跨版本自动更新验收。
