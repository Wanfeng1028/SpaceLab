# ============================================================
# SpaceLab 一键启动脚本
# 功能：启动所有服务（前端 + 后端 Docker 集群）
# 用法：直接运行 .\start-all.ps1
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

function Write-Error {
    param([string]$Msg)
    Write-Host "  [!] $Msg" -ForegroundColor $RED
}

function Write-Info {
    param([string]$Msg)
    Write-Host "  [i] $Msg" -ForegroundColor $YELLOW
}

function Write-Action {
    param([string]$Msg)
    Write-Host "      > $Msg" -ForegroundColor $CYAN
}

function Test-PortInUse {
    param([int]$Port, [string]$ServiceName)
    try {
        $conn = New-Object System.Net.Sockets.TcpClient
        $result = $conn.BeginConnect("127.0.0.1", $Port, $null, $null)
        $success = $result.AsyncWaitHandle.WaitOne(300)
        $conn.EndConnect($result)
        $conn.Close()
        return $success
    }
    catch {
        return $false
    }
}

# ============================================================
# 环境检查
# ============================================================

Write-Header "SpaceLab 一键启动"

Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 环境检查..." -ForegroundColor $CYAN

# 检查 Node.js
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Error "未找到 Node.js，请先安装 Node.js"
    Write-Info "下载地址: https://nodejs.org"
    exit 1
}
Write-Success "Node.js 版本: $((node --version).Trim())"

# 检查 npm
$npm = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npm) {
    Write-Error "未找到 npm"
    exit 1
}
Write-Success "npm 版本: $((npm --version).Trim())"

# 检查 Angular CLI
$ng = Get-Command ng -ErrorAction SilentlyContinue
if (-not $ng) {
    Write-Info "Angular CLI 未全局安装，将使用本地版本"
}

# 检查 Docker
$skipDocker = $false
$docker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $docker) {
    Write-Info "未找到 Docker，将跳过 Docker 后端服务"
    Write-Info "如需后端服务，请安装 Docker Desktop: https://www.docker.com"
    $skipDocker = $true
}
else {
    $dockerRunning = docker info 2>$null
    if (-not $dockerRunning) {
        Write-Info "Docker 服务未运行，将跳过 Docker 后端服务"
        Write-Info "请启动 Docker Desktop 后重试"
        $skipDocker = $true
    }
    else {
        Write-Success "Docker 已就绪"
    }
}

Write-Host ""

# ============================================================
# 1. 安装前端依赖
# ============================================================

Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 安装前端依赖..." -ForegroundColor $CYAN
if (-not (Test-Path (Join-Path $ProjectRoot 'node_modules'))) {
    Write-Action "首次运行，正在安装依赖..."
    Set-Location $ProjectRoot
    npm install --registry https://registry.npmmirror.com
    if ($LASTEXITCODE -ne 0) {
        Write-Info "npm install 失败，尝试使用默认源..."
        Set-Location $ProjectRoot
        npm install
    }
}
else {
    Write-Success "node_modules 已存在，跳过安装"
}
Write-Host ""

# ============================================================
# 2. 启动 Docker 后端服务
# ============================================================

if (-not $skipDocker) {
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 启动 Docker 后端服务..." -ForegroundColor $CYAN
    Set-Location $BackendDir

    # 检查端口占用
    if (Test-PortInUse $DB_PORT 'PostgreSQL') {
        Write-Warning "端口 $DB_PORT 已被占用，确认是否由其他 PostgreSQL 实例占用"
    }

    # 检查 docker-compose 配置
    if (-not (Test-Path $ComposeFile)) {
        Write-Error "未找到 docker-compose.yml，跳过 Docker 服务"
        $skipDocker = $true
    }
    else {
        Write-Action "启动 PostgreSQL, Redis, Backend..."
        docker-compose -f $ComposeFile up -d 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Docker 容器已启动"

            # 等待 PostgreSQL 就绪
            Write-Action "等待 PostgreSQL 就绪..."
            for ($i = 0; $i -lt 30; $i++) {
                $conn = New-Object System.Net.Sockets.TcpClient
                $result = $conn.BeginConnect("127.0.0.1", $DB_PORT, $null, $null)
                if ($result.AsyncWaitHandle.WaitOne(500)) {
                    $conn.EndConnect($result)
                    $conn.Close()
                    Write-Success "PostgreSQL 已就绪 (端口 $DB_PORT)"
                    break
                }
                $conn.Close()
                Start-Sleep -Seconds 1
            }

            # 等待 Redis 就绪
            Write-Action "等待 Redis 就绪..."
            for ($i = 0; $i -lt 15; $i++) {
                $conn = New-Object System.Net.Sockets.TcpClient
                $result = $conn.BeginConnect("127.0.0.1", $REDIS_PORT, $null, $null)
                if ($result.AsyncWaitHandle.WaitOne(500)) {
                    $conn.EndConnect($result)
                    $conn.Close()
                    Write-Success "Redis 已就绪 (端口 $REDIS_PORT)"
                    break
                }
                $conn.Close()
                Start-Sleep -Seconds 1
            }

            # 等待后端 API 就绪
            Write-Action "等待后端 API 就绪..."
            for ($i = 0; $i -lt 30; $i++) {
                try {
                    $resp = Invoke-WebRequest -Uri "http://127.0.0.1:$BACKEND_PORT/health" -TimeoutSec 2 -ErrorAction SilentlyContinue
                    if ($resp.StatusCode -eq 200) {
                        Write-Success "后端 API 已就绪 (http://localhost:$BACKEND_PORT)"
                        break
                    }
                }
                catch { }
                Start-Sleep -Seconds 1
            }
        }
        else {
            Write-Error "Docker 启动失败"
            Write-Info "请检查 Docker 状态后重试: docker ps"
        }
    }
    Set-Location $ProjectRoot
}

# ============================================================
# 3. 启动前端开发服务器
# ============================================================

Write-Host ""
Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 启动前端开发服务器..." -ForegroundColor $CYAN
Set-Location $ProjectRoot

# 检查端口占用
if (Test-PortInUse $ANGULAR_PORT 'Angular') {
    Write-Error "端口 $ANGULAR_PORT 已被占用"
    Write-Info "请关闭占用该端口的进程，或改用其他端口"
    Write-Info "查看占用: netstat -ano | findstr `":$ANGULAR_PORT`""
    exit 1
}

Write-Action "运行: npm start (ng serve on port $ANGULAR_PORT)"
Write-Host ""
Write-Host "========================================" -ForegroundColor $YELLOW
Write-Host "  前端启动中..." -ForegroundColor $YELLOW
Write-Host "  访问地址: http://localhost:$ANGULAR_PORT" -ForegroundColor $GREEN
if (-not $skipDocker) {
    Write-Host "  后端 API: http://localhost:$BACKEND_PORT" -ForegroundColor $GREEN
}
Write-Host "========================================" -ForegroundColor $YELLOW
Write-Host ""

# 启动 ng serve（阻塞执行，Ctrl+C 停止）
npm start

Set-Location $ProjectRoot
