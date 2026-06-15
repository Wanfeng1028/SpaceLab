# ============================================================
# SpaceLab 一键停止脚本
# 功能：停止所有服务（前端 + 后端 Docker 集群）
# 用法：直接运行 .\stop-all.ps1
# ============================================================

#Requires -Version 7.0

# 项目根目录
$ProjectRoot = $PSScriptRoot
$BackendDir = Join-Path $ProjectRoot 'backend'
$ComposeFile = Join-Path $BackendDir 'docker-compose.yml'

# 端口定义
$ANGULAR_PORT = 4200
$BACKEND_PORT = 8080
$DB_PORT = 5432
$REDIS_PORT = 6379

# ============================================================
# 控制台编码：强制 UTF-8
# docker / docker-compose 输出为 UTF-8，Windows 控制台默认按
# GBK(936) 解码会导致乱码（如 ✓ 显示为 鉁）。统一设为 UTF-8。
# ============================================================
try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    [Console]::InputEncoding = [System.Text.Encoding]::UTF8
    $OutputEncoding = [System.Text.Encoding]::UTF8
    # 切换控制台代码页为 UTF-8(65001)，仅对当前进程生效
    $null = & cmd /c chcp 65001 2>$null
} catch { }

# ============================================================
# 辅助函数
# 使用 PowerShell 原生 [ConsoleColor] 枚举与 cmdlet，避免 ANSI 转义码、
# [char] 与 New-Object .NET 类型，从而兼容 Constrained Language Mode。
# ============================================================

function Write-Header {
    param([string]$Title)
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "  $Title" -ForegroundColor White
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Success {
    param([string]$Msg)
    Write-Host "  [+] $Msg" -ForegroundColor Green
}

function Write-Info {
    param([string]$Msg)
    Write-Host "  [i] $Msg" -ForegroundColor Yellow
}

function Write-Action {
    param([string]$Msg)
    Write-Host "      > $Msg" -ForegroundColor Cyan
}

function Write-ErrLine {
    param([string]$Msg)
    Write-Host "  [!] $Msg" -ForegroundColor Red
}

function Test-PortInUse {
    param([int]$Port)
    $active = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
    return [bool]$active
}

# ============================================================
# 1. 停止前端 ng serve
# ============================================================

Write-Header "SpaceLab 一键停止"

Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 检查前端进程..." -ForegroundColor Cyan

# 优先占用 4200 端口的 node 进程（ng serve / vite 的稳定特征）
$angularPids = @()
if (Test-PortInUse $ANGULAR_PORT) {
    $angularPids = Get-NetTCPConnection -State Listen -LocalPort $ANGULAR_PORT -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -ErrorAction SilentlyContinue
}

# 补充：按命令行匹配 ng serve / vite
if (-not $angularPids) {
    $angularPids = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -match 'ng serve|vite|spacelab' } |
        Select-Object -ExpandProperty ProcessId -ErrorAction SilentlyContinue
}

if ($angularPids) {
    $angularPids = $angularPids | Select-Object -Unique
    foreach ($procId in $angularPids) {
        Write-Action "停止前端进程 (PID: $procId)..."
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
    Write-Success "前端进程已停止"
}
else {
    Write-Info "未发现运行中的前端进程"
}

# ============================================================
# 2. 停止 Docker 后端服务
# ============================================================

Write-Host ""
Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 检查 Docker 容器..." -ForegroundColor Cyan

$docker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $docker) {
    Write-Info "未找到 Docker，跳过 Docker 服务"
}
else {
    $containers = docker ps -q -f "name=spacelab" 2>$null
    if ($containers) {
        Write-Action "正在停止 Docker 容器..."
        Push-Location $BackendDir
        # --progress plain：禁用彩色进度条（进度条在非交互终端下会互相覆盖产生乱码）
        docker-compose -f $ComposeFile --progress plain down 2>&1 | ForEach-Object {
            # 清除残留的 ANSI 转义码（颜色/光标控制），避免 ?[0m 之类乱码
            $_ -replace '\x1b\[[0-9;]*[a-zA-Z]', ''
        } | Write-Host
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Docker 容器已停止"
        }
        else {
            Write-Info "Docker 容器可能已不存在"
        }
        Pop-Location
    }
    else {
        Write-Info "未发现运行中的 SpaceLab Docker 容器"
    }
}

# ============================================================
# 3. 停止后端 Go 进程（如果非 Docker 运行）
# ============================================================

Write-Host ""
Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 检查 Go 后端进程..." -ForegroundColor Cyan
$goPids = Get-CimInstance Win32_Process -Filter "Name = 'server.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match 'backend|spacelab' } |
    Select-Object -ExpandProperty ProcessId -ErrorAction SilentlyContinue

if ($goPids) {
    foreach ($procId in $goPids) {
        Write-Action "停止 Go 后端进程 (PID: $procId)..."
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
    Write-Success "Go 后端进程已停止"
}
else {
    Write-Info "未发现运行中的 Go 后端进程"
}

# ============================================================
# 4. 端口释放确认
# ============================================================

Write-Host ""
Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 端口释放确认..." -ForegroundColor Cyan

$ports = @($ANGULAR_PORT, $BACKEND_PORT, $DB_PORT, $REDIS_PORT)
foreach ($port in $ports) {
    if (Test-PortInUse $port) {
        Write-Info "端口 $port 仍被占用（可能为其他服务）"
    }
    else {
        Write-Success "端口 $port 已释放"
    }
}

# ============================================================
# 总结
# ============================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  全部服务已停止!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
