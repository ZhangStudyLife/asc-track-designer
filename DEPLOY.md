# Vercel 部署指南

## 关于依赖警告

在 Vercel 部署时,您可能会看到以下警告:

### 1. 已弃用的包警告

```
npm warn deprecated rimraf@3.0.2
npm warn deprecated inflight@1.0.6
npm warn deprecated glob@7.2.3
npm warn deprecated boolean@3.2.0
npm warn deprecated @humanwhocodes/object-schema@2.0.3
npm warn deprecated @humanwhocodes/config-array@0.13.0
npm warn deprecated eslint@8.57.1
```

**解决方案:**
- 这些警告来自间接依赖(其他包使用的依赖)
- 已更新到最新的直接依赖版本
- 这些警告不会影响构建和运行

### 2. 安全漏洞

```
2 vulnerabilities (1 moderate, 1 critical)
```

**解决方案:**
1. 使用官方 npm registry 运行 audit:
   ```bash
   npm config set registry https://registry.npmjs.org/
   npm audit
   ```

2. 查看具体漏洞:
   ```bash
   npm audit --production
   ```

3. 尝试自动修复(谨慎使用):
   ```bash
   npm audit fix
   ```

4. 如果需要强制修复(可能有破坏性更改):
   ```bash
   npm audit fix --force
   ```

## 部署配置

### Vercel 设置

项目已配置 `vercel.json`,包含以下优化:
- 使用 `--legacy-peer-deps` 安装依赖
- 禁用遥测以提高构建速度
- 配置输出目录为 `.next`

### 环境变量

在 Vercel 控制台设置以下环境变量:
```
NEXT_TELEMETRY_DISABLED=1
NODE_ENV=production
```

### 构建命令

Vercel 会自动检测 Next.js 项目,但您也可以手动设置:
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install --legacy-peer-deps`

## 本地构建测试

在推送到 Vercel 之前,建议本地测试:

```bash
# 安装依赖
npm install

# 构建项目
npm run build

# 启动生产服务器
npm run start:next
```

## 静态导出(可选)

如果需要纯静态部署:

1. 修改 `next.config.js`,添加:
   ```javascript
   output: 'export'
   ```

2. 构建:
   ```bash
   npm run build:export
   ```

3. 部署 `out` 目录

## 常见问题

### Q: 为什么有这么多警告?
A: 这些警告来自 Next.js、ESLint 和 Electron 的间接依赖。它们正在逐步更新到新版本。

### Q: 安全漏洞严重吗?
A: 需要具体检查。大多数情况下,开发依赖的漏洞不会影响生产环境。

### Q: 如何完全消除警告?
A: 等待依赖包更新,或者使用 `npm install --legacy-peer-deps --no-fund` 减少输出。

## 更新日志

### 2024-10-10
- 更新 `concurrently` 到 v9.1.0
- 更新 `electron-builder` 到 v25.1.8  
- 更新 `wait-on` 到 v8.0.1
- 添加 `.npmrc` 配置
- 优化 Vercel 部署配置
