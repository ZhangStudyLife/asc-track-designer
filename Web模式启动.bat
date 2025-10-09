@echo off
chcp 65001 >nul 2>&1
title ASC赛道设计器 - Web模式
color 0A
echo.
echo  ========================================
echo  🌐 ASC赛道设计器 - Web模式启动
echo  ========================================
echo.
echo  此模式将在浏览器中运行应用
echo  不使用 Electron，适合快速测试
echo.

:: 检查 Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo  ❌ 未安装 Node.js
    pause
    exit /b 1
)

echo  ✅ Node.js 环境正常
echo.

:: 检查依赖
if not exist node_modules (
    echo  📦 正在安装依赖包...
    call npm install
    if errorlevel 1 (
        echo  ❌ 安装失败
        pause
        exit /b 1
    )
)

echo  🚀 正在启动 Next.js 开发服务器...
echo.
echo  ========================================
echo  📍 启动完成后会自动在浏览器中打开
echo  🌐 访问地址: http://localhost:3000
echo  🛑 按 Ctrl+C 停止服务器
echo  ========================================
echo.

:: 只启动 Next.js（不启动 Electron）
npx next dev

pause
