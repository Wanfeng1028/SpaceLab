# ============================================================
# SpaceLab 一键停止脚本
# 功能：停止所有服务（前端 + 后端 Docker 集群）
# 用法：直接运行 .\stop-all.ps1
# ============================================================

#Requires -Version 7.0

# 编码设置：确保所有输出均为 UTF-8 无 BOM
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# 项目根目录
$ProjectRoot = $PSScriptRoot
$BackendDir = Join-Path $ProjectRoot 'backend'
$ComposeFile = Join-Path $BackendDir 'docker-compose.yml'

# 端口定义
$ANGULAR_PORT = 4200
$BACKEND_PORT = 8080
$DB_PORT = 5432
$REDIS_PORT = 6379

# 颜色定义
$ESC = [char]27
$GREEN  = "${ESC}[32m"
$RED    = "${ESC}[31m"
$YELLOW = "${ESC}[33m"
$CYAN   = "${ESC}[36m"
$RESET  = "${ESC}[0m"
$BOLD   = "${ESC}[1m"

# ============================================================
# 辅助函数
# ============================================================

function Write-Header {
    param([string]$Title)
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor $CYAN
    Write-Host "  $Title" -ForegroundColor $BOLD
    Write-Host "============================================================" -ForegroundColor $CYAN
    Write-Host ""
}

function Write-Success {
    param([string]$Msg)
    Write-Host "  [+] $Msg" -ForegroundColor $GREEN
}

function Write-Info {
    param([string]$Msg)
    Write-Host "  [i] $Msg" -ForegroundColor $YELLOW
}

function Write-Action {
    param([string]$Msg)
    Write-Host "      > $Msg" -ForegroundColor $CYAN
}

# ============================================================
# 1. 停止前端 ng serve
# ============================================================

Write-Header "SpaceLab 一键停止"

Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 检查前端进程..." -ForegroundColor $CYAN

# 通过窗口标题查找
$angularPids = Get-Process -Name node -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowTitle -match 'spacelab|angular' } |
    Select-Object -ExpandProperty Id

if (-not $angularPids) {
    # 通过命令行参数查找
    $angularPids = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -match 'ng serve' } |
        Select-Object -ExpandProperty ProcessId
}

if ($angularPids) {
    foreach ($pid in $angularPids) {
        Write-Action "停止前端进程 (PID: $pid)..."
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
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
Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 检查 Docker 容器..." -ForegroundColor $CYAN

$docker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $docker) {
    Write-Info "未找到 Docker，跳过 Docker 服务"
}
else {
    $containers = docker ps -q -f "name=spacelab" 2>$null
    if ($containers) {
        Write-Action "正在停止 Docker 容器..."
        Set-Location $BackendDir
        docker-compose -f $ComposeFile down 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Docker 容器已停止"
        }
        else {
            Write-Info "Docker 容器可能已不存在"
        }
        Set-Location $ProjectRoot
    }
    else {
        Write-Info "未发现运行中的 SpaceLab Docker 容器"
    }
}

# ============================================================
# 3. 停止后端 Go 进程（如果非 Docker 运行）
# ============================================================

Write-Host ""
Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 检查 Go 后端进程..." -ForegroundColor $CYAN
$goPids = Get-CimInstance Win32_Process -Filter "Name = 'server.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match 'backend|spacelab' } |
    Select-Object -ExpandProperty ProcessId

if ($goPids) {
    foreach ($pid in $goPids) {
        Write-Action "停止 Go 后端进程 (PID: $pid)..."
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
    Write-Success "Go 后端进程已停止"
}

# ============================================================
# 4. 端口释放确认
# ============================================================

Write-Host ""
Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 端口释放确认..." -ForegroundColor $CYAN

function Test-PortInUse {
    param([int]$Port)
    try {
        $conn = New-Object System.Net.Sockets.TcpClient
        $result = $conn.BeginConnect("127.0.0.1", $Port, $null, $null)
        $inUse = $result.AsyncWaitHandle.WaitOne(300)
        $conn.Close()
        return $inUse
    }
    catch {
        return $false
    }
}

$ports = @($ANGULAR_PORT, $BACKEND_PORT, $DB_PORT, $REDIS_PORT)
foreach ($port in $ports) {
    $inUse = Test-PortInUse $port
    if ($inUse) {
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
Write-Host "============================================================" -ForegroundColor $CYAN
Write-Host "  全部服务已停止!" -ForegroundColor $GREEN
Write-Host "============================================================" -ForegroundColor $CYAN
Write-Host ""
