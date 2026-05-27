$repoPath = "E:\code\javascript\project\SpaceLab"
Set-Location $repoPath

while ($true) {
    $status = git status --porcelain
    if ($status) {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $changedFiles = ($status -split "`n").Count
        Write-Host "[$timestamp] 发现 $changedFiles 个文件有更改，正在提交..."
        git add -A
        git commit -m "auto: 自动提交 - $changedFiles 个文件更改 ($timestamp)"
        git pull --rebase origin main 2>&1 | Out-Null
        $pushResult = git push origin main 2>&1
        if ($LASTEXITCODE -eq 0) {
            $hash = git rev-parse --short HEAD
            Write-Host "[$timestamp] 已推送 commit $hash 到 origin/main"
        } else {
            Write-Host "[$timestamp] 推送失败: $pushResult"
        }
    }
    Start-Sleep -Seconds 10
}
