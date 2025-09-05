@echo off
chcp 65001 >nul 2>&1
title 创建ASC赛道设计器便携版
color 0B
echo.
echo  ========================================
echo  📦 ASC赛道设计器便携版打包工具
echo  ========================================
echo.

:: 设置变量
set "PORTABLE_DIR=ASC赛道设计器_便携版"
set "BUILD_DIR=.next"

echo  🧹 预清理缓存...
if exist .next (
    echo  📁 删除旧的构建缓存...
    rmdir /s /q .next >nul 2>&1
)

echo  🔨 正在构建生产版本...
call npm run build
if errorlevel 1 (
    echo  ❌ 构建失败
    echo.
    echo  💡 可能的解决方案：
    echo  1. 运行"修复构建问题.bat"清理缓存和重新安装依赖
    echo  2. 检查Node.js版本是否为LTS版本
    echo  3. 确保有足够的磁盘空间
    echo  4. 尝试以管理员身份运行
    echo.
    pause
    exit /b 1
)

echo  ✅ 构建完成
echo.

echo  📁 正在创建便携版目录...
if exist "%PORTABLE_DIR%" rmdir /s /q "%PORTABLE_DIR%"
mkdir "%PORTABLE_DIR%"

echo  📋 复制必要文件...
xcopy /E /I /Q "public" "%PORTABLE_DIR%\public"
xcopy /E /I /Q ".next" "%PORTABLE_DIR%\.next"
xcopy /E /I /Q "src" "%PORTABLE_DIR%\src"
copy "package.json" "%PORTABLE_DIR%\"
copy "next.config.js" "%PORTABLE_DIR%\"
copy "tsconfig.json" "%PORTABLE_DIR%\"
copy "tailwind.config.js" "%PORTABLE_DIR%\"
copy "postcss.config.js" "%PORTABLE_DIR%\"
copy "README_ASC.md" "%PORTABLE_DIR%\"

echo  🎯 创建启动脚本...
echo @echo off > "%PORTABLE_DIR%\启动设计器.bat"
echo chcp 65001 ^>nul 2^>^&1 >> "%PORTABLE_DIR%\启动设计器.bat"
echo title ASC智能车赛道设计器 >> "%PORTABLE_DIR%\启动设计器.bat"
echo echo. >> "%PORTABLE_DIR%\启动设计器.bat"
echo echo 🏁 ASC智能车赛道设计器启动中... >> "%PORTABLE_DIR%\启动设计器.bat"
echo echo 📍 请稍候，正在准备运行环境... >> "%PORTABLE_DIR%\启动设计器.bat"
echo echo. >> "%PORTABLE_DIR%\启动设计器.bat"
echo cd /d "%%~dp0" >> "%PORTABLE_DIR%\启动设计器.bat"
echo if not exist node_modules npm install >> "%PORTABLE_DIR%\启动设计器.bat"
echo start http://localhost:3000 >> "%PORTABLE_DIR%\启动设计器.bat"
echo npm start >> "%PORTABLE_DIR%\启动设计器.bat"

echo  📖 创建使用说明...
echo # ASC智能车赛道设计器 - 便携版 > "%PORTABLE_DIR%\使用说明.txt"
echo. >> "%PORTABLE_DIR%\使用说明.txt"
echo ## 快速开始 >> "%PORTABLE_DIR%\使用说明.txt"
echo 1. 双击"启动设计器.bat" >> "%PORTABLE_DIR%\使用说明.txt"
echo 2. 等待浏览器自动打开 >> "%PORTABLE_DIR%\使用说明.txt"
echo 3. 开始设计您的智能车赛道！ >> "%PORTABLE_DIR%\使用说明.txt"
echo. >> "%PORTABLE_DIR%\使用说明.txt"
echo ## 系统要求 >> "%PORTABLE_DIR%\使用说明.txt"
echo - Windows 10或更高版本 >> "%PORTABLE_DIR%\使用说明.txt"
echo - 已安装Node.js（如未安装会自动提示） >> "%PORTABLE_DIR%\使用说明.txt"
echo. >> "%PORTABLE_DIR%\使用说明.txt"
echo ## 技术支持 >> "%PORTABLE_DIR%\使用说明.txt"
echo ASC实验室 - 热爱技术 甘于奉献 >> "%PORTABLE_DIR%\使用说明.txt"

echo.
echo  ✅ 便携版创建完成！
echo  📂 位置: %PORTABLE_DIR%
echo.
echo  🎁 您现在可以：
echo  1. 将整个"%PORTABLE_DIR%"文件夹压缩发送给朋友
echo  2. 朋友解压后双击"启动设计器.bat"即可使用
echo.
pause
