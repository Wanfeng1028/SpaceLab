# Auto Code Review Script for SpaceLab
# Runs every 5 minutes: formats code with Prettier, commits if changes, and runs build check

$intervalMinutes = 5
$projectRoot = "E:\code\javascript\project\SpaceLab"

Write-Host "Starting auto code review loop for SpaceLab (every $intervalMinutes minutes)" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow

while ($true) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "`n[$timestamp] Running code review..." -ForegroundColor Green

    # Change to project directory
    Set-Location $projectRoot

    # Step 1: Format code with Prettier
    Write-Host "Formatting code with Prettier..." -ForegroundColor Cyan
    npx prettier --write . 2>&1 | Out-Null

    # Step 2: Check for changes
    $gitStatus = git status --porcelain
    if ($gitStatus) {
        Write-Host "Code formatting changes detected:" -ForegroundColor Yellow
        Write-Host $gitStatus -ForegroundColor Gray

        # Step 3: Run build check before committing
        Write-Host "Running build check before commit..." -ForegroundColor Cyan
        $buildResult = npm run build 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Build successful. Proceeding with commit." -ForegroundColor Green
            
            # Step 4: Commit formatting changes
            git add -A
            $commitMessage = "style: 代码格式化 - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
            git commit -m $commitMessage
            Write-Host "Committed formatting changes: $commitMessage" -ForegroundColor Green

            # Push changes
            git pull --rebase origin main
            git push origin main
            Write-Host "Pushed formatting changes to remote" -ForegroundColor Green
        } else {
            Write-Host "Build failed. Skipping commit." -ForegroundColor Red
            Write-Host $buildResult -ForegroundColor Red
            # No need to revert since changes are not committed
        }
    } else {
        Write-Host "No formatting changes needed" -ForegroundColor Gray
        
        # Still run build check to ensure everything is okay
        Write-Host "Running build check..." -ForegroundColor Cyan
        $buildResult = npm run build 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Build successful" -ForegroundColor Green
        } else {
            Write-Host "Build failed:" -ForegroundColor Red
            Write-Host $buildResult -ForegroundColor Red
        }
    }

    # Wait for interval
    Write-Host "Waiting $intervalMinutes minutes..." -ForegroundColor Gray
    Start-Sleep -Seconds ($intervalMinutes * 60)
}