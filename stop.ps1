# SpaceLab 一键停止脚本
# 停止前端和后端服务

$ErrorActionPreference = "Continue"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  SpaceLab 一键停止" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 颜色配置
$YELLOW = [ConsoleColor]::Yellow
$GREEN = [ConsoleColor]::Green
$CYAN = [ConsoleColor]::Cyan

# 停止前端开发服务器 (ng serve)
Write-Host "[1/3] 查找前端进程 (ng serve)..." -ForegroundColor $CYAN
$frontendPids = Get-Process | Where-Object {
    $_.ProcessName -like "*node*" -and $_.CommandLine -like "*ng serve*"
} 2>$null

if ($frontendPids) {
    foreach ($pid in $frontendPids) {
        Write-Host "  停止前端进程 (PID: $($pid.Id))..." -ForegroundColor $YELLOW
        Stop-Process -Id $pid.Id -Force 2>$null
    }
    Write-Host "  前端进程已停止" -ForegroundColor $GREEN
} else {
    Write-Host "  未发现运行中的前端进程" -ForegroundColor $GREEN
}

# 停止 Go 后端服务
Write-Host "[2/3] 查找后端进程 (server)..." -ForegroundColor $CYAN
$backendPids = Get-Process | Where-Object {
    $_.ProcessName -like "*server*" -or $_.ProcessName -like "*go*"
} | Where-Object {
    $exePath = $_.Path
    $exePath -like "*spacelab*" -or $exePath -like "*backend*"
} 2>$null

if ($backendPids) {
    foreach ($pid in $backendPids) {
        Write-Host "  停止后端进程 (PID: $($pid.Id))..." -ForegroundColor $YELLOW
        Stop-Process -Id $pid.Id -Force 2>$null
    }
    Write-Host "  后端进程已停止" -ForegroundColor $GREEN
} else {
    Write-Host "  未发现运行中的后端进程" -ForegroundColor $GREEN
}

# 停止 Docker 容器
Write-Host "[3/3] 检查 Docker 容器..." -ForegroundColor $CYAN
$dockerContainers = docker ps --filter "name=spacelab" --format "{{.ID}} {{.Names}} {{.Status}}" 2>$null

if ($dockerContainers) {
    Write-Host "  正在停止 Docker 容器..." -ForegroundColor $YELLOW
    Set-Location "backend"
    docker-compose down 2>$null
    Set-Location ".."
    Write-Host "  Docker 容器已停止" -ForegroundColor $GREEN
} else {
    Write-Host "  未发现运行中的 SpaceLab Docker 容器" -ForegroundColor $GREEN
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  全部服务已停止!" -ForegroundColor $GREEN
Write-Host "========================================`n" -ForegroundColor Cyan
