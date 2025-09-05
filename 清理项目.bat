@echo off
chcp 65001 >nul 2>&1
title ASC赛道设计器项目清理工具
color 0E
echo.
echo  ========================================
echo  🧹 ASC赛道设计器项目深度清理工具
echo  ========================================
echo.

echo  正在深度清理项目文件...
echo.

:: 清理开发依赖和缓存
if exist node_modules (
    echo  🗑️  删除node_modules文件夹（约9GB）...
    echo  ⏳ 这可能需要几分钟时间，请耐心等待...
    rmdir /s /q node_modules
    echo  ✅ node_modules删除完成
)

if exist .next (
    echo  🗑️  删除.next构建缓存...
    rmdir /s /q .next
    echo  ✅ 构建缓存删除完成
)

if exist .vscode (
    echo  🗑️  删除VS Code配置文件夹...
    rmdir /s /q .vscode
    echo  ✅ VS Code配置删除完成
)

if exist .vercel (
    echo  🗑️  删除Vercel部署缓存...
    rmdir /s /q .vercel
    echo  ✅ Vercel缓存删除完成
)

:: 清理配置文件
if exist .eslintrc.json (
    echo  🗑️  删除ESLint配置...
    del .eslintrc.json
)

if exist package-lock.json (
    echo  🗑️  删除npm锁定文件...
    del package-lock.json
)

if exist yarn.lock (
    echo  🗑️  删除yarn锁定文件...
    del yarn.lock
)

:: 清理日志和临时文件
if exist npm-debug.log del npm-debug.log
if exist yarn-error.log del yarn-error.log
if exist .DS_Store del .DS_Store

:: 清理备份文件
if exist src\app\page_backup.tsx del src\app\page_backup.tsx
if exist public\index.html del public\index.html

:: 清理编辑器临时文件
for /r %%i in (*.tmp, *.temp, *~, *.bak) do (
    if exist "%%i" del "%%i" >nul 2>&1
)

echo  ✅ 深度清理完成！
echo.
echo  📊 清理效果：
echo  - ✅ 删除了开发依赖包（约9GB → 0GB）
echo  - ✅ 删除了构建缓存和配置文件
echo  - ✅ 删除了编辑器临时文件
echo  - ✅ 删除了备份和日志文件
echo.
echo  📦 现在项目结构：
echo  ├── src/                    (源代码)
echo  ├── public/                 (资源文件)
echo  ├── package.json            (依赖配置)
echo  ├── *.config.js             (构建配置)
echo  ├── 启动ASC赛道设计器.bat    (一键启动)
echo  └── 使用说明文档            (*.md文件)
echo.
echo  💡 压缩后大小：约2-3MB（原来403MB）
echo  🎁 现在可以轻松分享给朋友了！
echo.
pause
