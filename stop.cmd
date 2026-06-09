@echo off
chcp 65001 >nul 2>&1
title SpaceLab 一键停止

echo.
echo ========================================
echo   SpaceLab 一键停止
echo ========================================
echo.

echo [1/3] 停止前端进程 (ng serve)...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq SpaceLab 前端*" 2>nul
if %errorlevel% equ 0 (
    echo   前端进程已停止
) else (
    echo   未发现运行中的前端进程
)

echo.
echo [2/3] 检查 Docker 容器...
cd /d "%~dp0backend"
docker ps -q -f "name=spacelab" >nul 2>nul
if %errorlevel% equ 0 (
    echo   正在停止 Docker 容器...
    docker-compose down 2>nul
    echo   Docker 容器已停止
) else (
    echo   未发现运行中的 SpaceLab Docker 容器
)

cd /d "%~dp0"

echo.
echo ========================================
echo   全部服务已停止!
echo ========================================
echo.
pause
