@echo off
:loop
echo [%time%] === 开始构建检查 ===
call npm run build > build_output.txt 2>&1
if %errorlevel%==0 (
    echo [%time%] ✅ 构建通过，无错误
) else (
    echo [%time%] ❌ 构建失败！
    findstr /i "ERROR" build_output.txt
)
echo [%time%] 下次检查: 5分钟后
ping -n 301 127.0.0.1 >nul
goto loop
