# Auto CI Check Script for SpaceLab
# Runs every 1 minute: checks CI status and diagnoses failures

$intervalMinutes = 1
$projectRoot = "E:\code\javascript\project\SpaceLab"

Write-Host "Starting CI check loop for SpaceLab (every $intervalMinutes minutes)" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow

while ($true) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "`n[$timestamp] Checking CI status..." -ForegroundColor Green

    # Change to project directory
    Set-Location $projectRoot

    # Check CI status if GitHub CLI is available and authenticated
    try {
        $ciRun = gh run list --limit 1 --json conclusion,status,name,createdAt 2>&1
        if ($LASTEXITCODE -eq 0) {
            $runData = $ciRun | ConvertFrom-Json
            if ($runData.Count -gt 0) {
                $latestRun = $runData[0]
                $conclusion = $latestRun.conclusion
                $status = $latestRun.status
                $name = $latestRun.name
                $createdAt = $latestRun.createdAt
                Write-Host "Latest CI run: $name ($createdAt) - status: $status" -ForegroundColor Gray

                if ($status -eq "completed") {
                    if ($conclusion -eq "success") {
                        Write-Host "CI passed ✓" -ForegroundColor Green
                    } elseif ($conclusion -eq "failure") {
                        Write-Host "CI failed! ❌" -ForegroundColor Red
                        Write-Host "Please check: https://github.com/Wanfeng1028/SpaceLab/actions" -ForegroundColor Yellow
                        
                        # Run local build check to diagnose
                        Write-Host "Running local build to diagnose..." -ForegroundColor Cyan
                        $localBuildResult = npm run build 2>&1
                        if ($LASTEXITCODE -eq 0) {
                            Write-Host "Local build succeeded. CI failure may be environment-related." -ForegroundColor Yellow
                            Write-Host "Consider running: gh run rerun $latestRun.id" -ForegroundColor Gray
                        } else {
                            Write-Host "Local build also failed. Fix the following errors:" -ForegroundColor Red
                            Write-Host $localBuildResult -ForegroundColor Red
                        }
                    } else {
                        Write-Host "CI conclusion: $conclusion" -ForegroundColor Yellow
                    }
                } elseif ($status -eq "queued" -or $status -eq "in_progress") {
                    Write-Host "CI still running..." -ForegroundColor Yellow
                } else {
                    Write-Host "CI status: $status" -ForegroundColor Yellow
                }
            } else {
                Write-Host "No CI runs found" -ForegroundColor Gray
            }
        } else {
            Write-Host "GitHub CLI not authenticated. Run 'gh auth login' to enable CI checks." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "CI check skipped (GitHub CLI not available)" -ForegroundColor Gray
    }

    # Wait for interval
    Write-Host "Waiting $intervalMinutes minutes..." -ForegroundColor Gray
    Start-Sleep -Seconds ($intervalMinutes * 60)
}