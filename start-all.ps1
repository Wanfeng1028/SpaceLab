# ============================================================
# SpaceLab 一键启动脚本
# 功能：启动所有服务（前端 + 后端 Docker 集群）
# 用法：直接运行 .\start-all.ps1
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
# 使用 PowerShell 原生 [ConsoleColor] 枚举，避免 ANSI 转义码与
# [char] 静态调用，从而兼容 Constrained Language Mode（受限语言模式）。
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

function Write-ErrLine {
    param([string]$Msg)
    Write-Host "  [!] $Msg" -ForegroundColor Red
}

function Write-Info {
    param([string]$Msg)
    Write-Host "  [i] $Msg" -ForegroundColor Yellow
}

function Write-Action {
    param([string]$Msg)
    Write-Host "      > $Msg" -ForegroundColor Cyan
}

function Test-PortInUse {
    param([int]$Port)
    $active = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
    return [bool]$active
}

# ============================================================
# 环境检查
# ============================================================

Write-Header "SpaceLab 一键启动"

Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 环境检查..." -ForegroundColor Cyan

# 检查 Node.js
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-ErrLine "未找到 Node.js，请先安装 Node.js"
    Write-Info "下载地址: https://nodejs.org"
    exit 1
}
Write-Success "Node.js 版本: $((node --version).Trim())"

# 检查 npm（优先用 npm.cmd，避开 npm.ps1 在受限模式下触发 Parser 静态调用的问题）
$npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npm) { $npm = Get-Command npm -ErrorAction SilentlyContinue }
if (-not $npm) {
    Write-ErrLine "未找到 npm"
    exit 1
}
Write-Success "npm 版本: $((npm.cmd --version).Trim())"

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

Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 安装前端依赖..." -ForegroundColor Cyan
if (-not (Test-Path (Join-Path $ProjectRoot 'node_modules'))) {
    Write-Action "首次运行，正在安装依赖..."
    Push-Location $ProjectRoot
    npm.cmd install --registry https://registry.npmmirror.com
    if ($LASTEXITCODE -ne 0) {
        Write-Info "npm install 失败，尝试使用默认源..."
        npm.cmd install
    }
    Pop-Location
}
else {
    Write-Success "node_modules 已存在，跳过安装"
}
Write-Host ""

# ============================================================
# 2. 启动 Docker 后端服务
# ============================================================

if (-not $skipDocker) {
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 启动 Docker 后端服务..." -ForegroundColor Cyan
    Push-Location $BackendDir

    # 检查端口占用
    if (Test-PortInUse $DB_PORT) {
        Write-Warning "端口 $DB_PORT 已被占用，确认是否由其他 PostgreSQL 实例占用"
    }

    # 检查 docker-compose 配置
    if (-not (Test-Path $ComposeFile)) {
        Write-ErrLine "未找到 docker-compose.yml，跳过 Docker 服务"
        $skipDocker = $true
    }
    else {
        Write-Action "启动 PostgreSQL, Redis, Backend..."
        # --progress plain：禁用彩色进度条（进度条在非交互终端下会互相覆盖产生乱码）
        docker-compose -f $ComposeFile --progress plain up -d 2>&1 | ForEach-Object {
            # 清除残留的 ANSI 转义码（颜色/光标控制），避免 ?[0m 之类乱码
            $_ -replace '\x1b\[[0-9;]*[a-zA-Z]', ''
        } | Write-Host
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Docker 容器已启动"

            # 等待 PostgreSQL 就绪
            Write-Action "等待 PostgreSQL 就绪..."
            for ($i = 0; $i -lt 30; $i++) {
                if (Test-PortInUse $DB_PORT) {
                    Write-Success "PostgreSQL 已就绪 (端口 $DB_PORT)"
                    break
                }
                Start-Sleep -Seconds 1
            }

            # 等待 Redis 就绪
            Write-Action "等待 Redis 就绪..."
            for ($i = 0; $i -lt 15; $i++) {
                if (Test-PortInUse $REDIS_PORT) {
                    Write-Success "Redis 已就绪 (端口 $REDIS_PORT)"
                    break
                }
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
            Write-ErrLine "Docker 启动失败"
            Write-Info "请检查 Docker 状态后重试: docker ps"
        }
    }
    Pop-Location
}

# ============================================================
# 3. 启动前端开发服务器
# ============================================================

Write-Host ""
Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 启动前端开发服务器..." -ForegroundColor Cyan
Push-Location $ProjectRoot

# 检查端口占用
if (Test-PortInUse $ANGULAR_PORT) {
    Write-ErrLine "端口 $ANGULAR_PORT 已被占用"
    Write-Info "请关闭占用该端口的进程，或改用其他端口"
    Write-Info "查看占用: netstat -ano | findstr `":$ANGULAR_PORT`""
    Pop-Location
    exit 1
}

Write-Action "运行: npm start (ng serve on port $ANGULAR_PORT)"
Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "  前端启动中..." -ForegroundColor Yellow
Write-Host "  访问地址: http://localhost:$ANGULAR_PORT" -ForegroundColor Green
if (-not $skipDocker) {
    Write-Host "  后端 API: http://localhost:$BACKEND_PORT" -ForegroundColor Green
}
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

# 启动 ng serve（阻塞执行，Ctrl+C 停止）
npm.cmd start

Pop-Location
