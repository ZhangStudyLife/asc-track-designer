@echo off
chcp 65001 >nul 2>&1
title ASC智能车赛道设计器
color 0A
echo.
echo  ========================================
echo  🏁 ASC智能车赛道设计器 启动程序
echo  ========================================
echo.
echo  正在检查运行环境...

:: 检查Node.js是否安装
node --version >nul 2>&1
if errorlevel 1 (
    echo  ❌ 未检测到Node.js，请先安装Node.js
    echo  📥 下载地址: https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo  ✅ Node.js环境正常
echo.

:: 进入项目目录
cd /d "%~dp0"

:: 检查依赖包
if not exist node_modules (
    echo  📦 首次运行，正在安装依赖包...
    echo  ⏳ 这可能需要几分钟时间，请耐心等待...
    echo.
    call npm install
    if errorlevel 1 (
        echo  ❌ 依赖包安装失败
        pause
        exit /b 1
    )
    echo  ✅ 依赖包安装完成
    echo.
)

echo  🚀 正在启动ASC赛道设计器...
echo.
echo  ========================================
echo  📍 启动完成后将在 Electron 窗口中打开
echo  🌐 Web访问地址: http://localhost:3000
echo  🛑 关闭窗口即可停止应用
echo  ========================================
echo.

:: 启动开发服务器（Next.js + Electron）
call npm run dev

pause
