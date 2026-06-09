# SpaceLab 一键启动脚本
# 启动前端开发服务器和后端服务

$ErrorActionPreference = "Continue"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  SpaceLab 一键启动" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 颜色配置
$GREEN = [ConsoleColor]::Green
$YELLOW = [ConsoleColor]::Yellow
$CYAN = [ConsoleColor]::Cyan
$RED = [ConsoleColor]::Red

Write-Host "[1/4] 检查环境..." -ForegroundColor $CYAN

# 检查 Node.js
try {
    $nodeVersion = node --version
    Write-Host "  Node.js: $nodeVersion" -ForegroundColor $GREEN
} catch {
    Write-Host "  [错误] 未找到 Node.js，请先安装 Node.js" -ForegroundColor $RED
    exit 1
}

# 检查 Angular CLI
try {
    $ngVersion = ng version --no-color | Select-String "@angular/cli" | Select-Object -First 1
    Write-Host "  Angular CLI: $ngVersion" -ForegroundColor $GREEN
} catch {
    Write-Host "  [警告] Angular CLI 未全局安装，使用本地版本" -ForegroundColor $YELLOW
}

# 检查 Go (可选 - 仅后端开发模式需要)
$goAvailable = $true
try {
    $goVersion = go version
    Write-Host "  Go: $goVersion" -ForegroundColor $GREEN
} catch {
    Write-Host "  [提示] Go 未安装，将跳过后端服务" -ForegroundColor $YELLOW
    $goAvailable = $false
}

# 检查 Docker (可选 - 用于 Docker 部署)
$dockerAvailable = $true
try {
    $dockerVersion = docker --version
    Write-Host "  Docker: $dockerVersion" -ForegroundColor $GREEN
} catch {
    Write-Host "  [提示] Docker 未安装，将跳过 Docker 服务" -ForegroundColor $YELLOW
    $dockerAvailable = $false
}

Write-Host "`n[2/4] 安装依赖..." -ForegroundColor $CYAN
if (-not (Test-Path "node_modules")) {
    Write-Host "  首次运行，正在安装依赖..." -ForegroundColor $YELLOW
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [错误] npm install 失败" -ForegroundColor $RED
        exit 1
    }
} else {
    Write-Host "  依赖已存在，跳过安装" -ForegroundColor $GREEN
}

Write-Host "`n[3/4] 配置后端..." -ForegroundColor $CYAN
# 检查 .env 文件
if (-not (Test-Path "backend\.env")) {
    Write-Host "  创建后端 .env 文件..." -ForegroundColor $YELLOW
    Copy-Item "backend\.env.example" "backend\.env"
    Write-Host "  已使用默认配置创建 backend\.env，请根据需要修改" -ForegroundColor $YELLOW
} else {
    Write-Host "  后端 .env 文件已存在" -ForegroundColor $GREEN
}

Write-Host "`n[4/4] 启动服务..." -ForegroundColor $CYAN

# 启动前端
Write-Host "`n  正在启动前端开发服务器..." -ForegroundColor $YELLOW
Write-Host "  访问地址: http://localhost:4200" -ForegroundColor $GREEN
Start-Process "http://localhost:4200"

# 启动前端开发服务器 (后台进程)
$frontendProcess = Start-Process -FilePath "npx" -ArgumentList "ng serve --port 4200" -PassThru -NoNewWindow

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  启动完成!" -ForegroundColor $GREEN
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "前端:  http://localhost:4200" -ForegroundColor $GREEN
if ($goAvailable) {
    Write-Host "后端:  按任意键启动后端服务 (或输入 'skip' 跳过)" -ForegroundColor $YELLOW
    $key = Read-Host
    if ($key -ne "skip" -and $key -ne "") {
        Write-Host "`n  正在启动 Go 后端服务..." -ForegroundColor $YELLOW
        Set-Location "backend"
        go run cmd/server/main.go
        Set-Location ".."
    } else {
        Write-Host "  已跳过后端服务启动" -ForegroundColor $YELLOW
    }
} else {
    Write-Host "`n  后端: 未安装 Go，跳过后端服务" -ForegroundColor $YELLOW
}

Write-Host "`n全部服务已停止" -ForegroundColor $YELLOW
