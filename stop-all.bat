@echo off
chcp 65001 >nul 2>&1
cd /d "%~dp0"

REM 优先使用 PowerShell 7 (pwsh)，未安装时回退到 Windows PowerShell
where pwsh >nul 2>&1
if %errorlevel%==0 (
    pwsh -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop-all.ps1" %*
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop-all.ps1" %*
)
