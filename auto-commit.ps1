# Auto Commit Script for SpaceLab
# Runs every 15 minutes: checks git status and commits if there are changes

$intervalMinutes = 15
$projectRoot = "E:\code\javascript\project\SpaceLab"

Write-Host "Starting auto commit loop for SpaceLab (every $intervalMinutes minutes)" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow

while ($true) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "`n[$timestamp] Checking for changes..." -ForegroundColor Green

    # Change to project directory
    Set-Location $projectRoot

    # Check git status
    $gitStatus = git status --porcelain
    if ($gitStatus) {
        Write-Host "Changes detected:" -ForegroundColor Yellow
        Write-Host $gitStatus -ForegroundColor Gray

        # Auto commit changes
        git add -A
        $commitMessage = "auto: 自动提交 - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        git commit -m $commitMessage
        Write-Host "Committed changes: $commitMessage" -ForegroundColor Green

        # Pull and push
        git pull --rebase origin main
        git push origin main
        Write-Host "Pushed to remote" -ForegroundColor Green
    } else {
        Write-Host "No changes detected. Skipping commit." -ForegroundColor Gray
    }

    # Wait for interval
    Write-Host "Waiting $intervalMinutes minutes..." -ForegroundColor Gray
    Start-Sleep -Seconds ($intervalMinutes * 60)
}