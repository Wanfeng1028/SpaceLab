while ($true) {
    $ts = Get-Date -Format 'HH:mm:ss'
    Write-Output "[$ts] === 开始构建检查 ==="
    $result = & npm run build 2>&1
    $exitCode = $LASTEXITCODE
    if ($exitCode -eq 0) {
        Write-Output "[$ts] ✅ 构建通过，无错误"
    } else {
        Write-Output "[$ts] ❌ 构建失败！"
        $errors = $result | Select-String -Pattern 'ERROR'
        foreach ($e in $errors) {
            Write-Output "[$ts] $e"
        }
    }
    Write-Output "[$ts] 下次检查: 5分钟后"
    Start-Sleep -Seconds 300
}
