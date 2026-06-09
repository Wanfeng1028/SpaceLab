@echo off
chcp 65001 >nul 2>&1
title SpaceLab 一键启动

echo.
echo ========================================
echo   SpaceLab 一键启动
echo ========================================
echo.

echo [1/4] 检查环境...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo   [错误] 未找到 Node.js，请先安装 Node.js
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo   Node.js: %NODE_VERSION%

where go >nul 2>nul
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('go version') do set GO_VERSION=%%i
    echo   Go: %GO_VERSION%
    set GO_AVAILABLE=1
) else (
    echo   [提示] Go 未安装，将跳过后端服务
    set GO_AVAILABLE=0
)

echo.
echo [2/4] 安装依赖...
if not exist "node_modules" (
    echo   首次运行，正在安装依赖...
    call npm install
    if errorlevel 1 (
        echo   [错误] npm install 失败
        pause
        exit /b 1
    )
) else (
    echo   依赖已存在，跳过安装
)

echo.
echo [3/4] 配置后端...
if not exist "backend\.env" (
    echo   创建后端 .env 文件...
    copy /y "backend\.env.example" "backend\.env" >nul
    echo   已使用默认配置创建 backend\.env
) else (
    echo   后端 .env 文件已存在
)

echo.
echo [4/4] 启动服务...
echo.
echo   正在启动前端开发服务器...
echo   访问地址: http://localhost:4200

start cmd /k "title SpaceLab 前端 && npx ng serve --port 4200"

echo.
echo ========================================
echo   前端已启动!
echo ========================================
echo.
echo 前端:  http://localhost:4200
echo.

if %GO_AVAILABLE%==1 (
    echo   是否启动 Go 后端服务? [Y/N]
    set /p START_BACKEND=
    if /i "%START_BACKEND%"=="Y" (
        echo.
        echo   正在启动 Go 后端服务...
        start cmd /k "title SpaceLab 后端 && cd backend && go run cmd/server/main.go"
    ) else (
        echo   已跳过后端服务
    )
) else (
    echo.
    echo   后端: 未安装 Go，跳过后端服务
)

echo.
echo 提示: 使用 stop.cmd 或 stop.ps1 停止所有服务
pause
