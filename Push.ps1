param([Parameter(Mandatory=$true, Position=0)][string]$Message)
$ErrorActionPreference = 'Continue'
Set-Location 'D:\FiqhMuamalat'
Write-Host "STEP 1: npm run build" -ForegroundColor Cyan
$buildOutput = cmd /c "npm run build 2>&1"
if ($LASTEXITCODE -ne 0) { Write-Host "X BUILD FAILED - nothing was pushed" -ForegroundColor Red; exit 1 }
Write-Host "OK - Build succeeded" -ForegroundColor Green
Write-Host "STEP 2: git add / commit / push" -ForegroundColor Cyan
$status = git status --short
if ($status) { cmd /c "git add ."; cmd /c "git commit -m "$Message"" }
cmd /c "git pull origin main --rebase"
cmd /c "git push origin main"
Write-Host "DONE - Pushed successfully" -ForegroundColor Green
