@echo off
chcp 65001 >nul 2>&1
title 修复ASC赛道设计器构建问题
color 0C
echo.
echo  ========================================
echo  🔧 ASC赛道设计器构建问题修复工具
echo  ========================================
echo.

echo  🗑️ 清理缓存和依赖...
echo.

:: 删除缓存文件夹
if exist .next (
    echo  📁 删除 .next 构建缓存...
    rmdir /s /q .next
    echo  ✅ .next 清理完成
)

if exist node_modules (
    echo  📁 删除 node_modules 依赖包...
    echo  ⏳ 这可能需要几分钟时间...
    rmdir /s /q node_modules
    echo  ✅ node_modules 清理完成
)

:: 删除锁定文件
if exist package-lock.json (
    echo  📁 删除 package-lock.json...
    del package-lock.json
    echo  ✅ package-lock.json 清理完成
)

if exist yarn.lock (
    echo  📁 删除 yarn.lock...
    del yarn.lock
    echo  ✅ yarn.lock 清理完成
)

:: 清理npm缓存
echo  🧹 清理npm缓存...
npm cache clean --force
echo  ✅ npm缓存清理完成

echo.
echo  📦 重新安装依赖包...
echo  ⏳ 这可能需要几分钟时间，请耐心等待...
echo.

npm install

if errorlevel 1 (
    echo.
    echo  ❌ 依赖包安装失败
    echo  💡 建议尝试：
    echo  1. 检查网络连接
    echo  2. 尝试使用淘宝镜像：npm config set registry https://registry.npmmirror.com
    echo  3. 重新运行此脚本
    pause
    exit /b 1
)

echo.
echo  ✅ 依赖包安装完成！
echo.
echo  🔨 尝试构建...
npm run build

if errorlevel 1 (
    echo.
    echo  ❌ 构建仍然失败
    echo  💡 可能的解决方案：
    echo  1. 更新Node.js到最新LTS版本
    echo  2. 检查磁盘空间是否足够
    echo  3. 以管理员身份运行此脚本
    pause
    exit /b 1
) else (
    echo.
    echo  ✅ 构建成功！现在可以创建便携版了
    echo.
)

pause
