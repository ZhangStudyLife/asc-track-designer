@echo off
chcp 65001 >nul 2>&1
title ASC赛道设计器 - 打包工具
color 0B
echo.
echo  ========================================
echo  📦 ASC赛道设计器 EXE打包工具
echo  ========================================
echo.

:: 检查Node.js环境
echo  🔍 检查环境...
node --version >nul 2>&1
if errorlevel 1 (
    echo  ❌ 未检测到Node.js，请先安装Node.js
    echo  📥 下载地址: https://nodejs.org
    pause
    exit /b 1
)
echo  ✅ Node.js环境正常
echo.

:: 检查依赖包
if not exist node_modules (
    echo  📦 首次打包，正在安装依赖包...
    echo  ⏳ 这可能需要几分钟时间，请耐心等待...
    npm install
    if errorlevel 1 (
        echo  ❌ 依赖包安装失败
        pause
        exit /b 1
    )
    echo  ✅ 依赖包安装完成
    echo.
)

:: 清理旧的构建
echo  🧹 清理旧的构建文件...
if exist out rmdir /s /q out
if exist dist rmdir /s /q dist
echo  ✅ 清理完成
echo.

:: 构建Web应用
echo  🔨 正在构建Web应用...
echo  ⏳ 这可能需要1-2分钟...
call npm run build:web
if errorlevel 1 (
    echo.
    echo  ❌ Web应用构建失败
    echo  💡 请检查代码是否有错误
    pause
    exit /b 1
)
echo  ✅ Web应用构建完成
echo.

:: 打包Electron应用
echo  📦 正在打包Electron应用为EXE...
echo  ⏳ 这可能需要3-5分钟...
echo.
call npm run dist:win
if errorlevel 1 (
    echo.
    echo  ❌ EXE打包失败
    echo  💡 可能的原因：
    echo  1. 磁盘空间不足
    echo  2. 网络连接问题（下载依赖）
    echo  3. 权限不足（尝试以管理员身份运行）
    pause
    exit /b 1
)

echo.
echo  ========================================
echo  ✅ 打包完成！
echo  ========================================
echo.
echo  📁 输出位置: dist文件夹
echo.
echo  📦 生成的文件：
echo  - ASC赛道设计器 Setup.exe  (安装包)
echo  - ASC赛道设计器.exe        (可执行文件)
echo.
echo  💡 使用说明：
echo  1. 安装包可以安装到系统
echo  2. 可执行文件可以直接运行
echo  3. 可以分享给其他Windows用户
echo.
echo  📊 文件大小：约100-150MB
echo.

:: 打开输出文件夹
if exist dist (
    echo  📂 正在打开输出文件夹...
    start "" "%~dp0dist"
)

pause
