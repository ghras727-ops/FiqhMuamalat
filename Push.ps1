param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$Message
)

$ErrorActionPreference = 'Continue'
$root = 'D:\FiqhMuamalat'
Set-Location $root

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  STEP 1: npm run build" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$buildOutput = cmd /c "npm run build 2>&1"
$exitCode = $LASTEXITCODE

$buildOutput | ForEach-Object { Write-Host $_ }

if ($exitCode -ne 0) {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Red
    Write-Host "  X BUILD FAILED - nothing was pushed" -ForegroundColor Red
    Write-Host "============================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Last 30 lines of error log:" -ForegroundColor Yellow
    $buildOutput | Select-Object -Last 30 | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    Write-Host ""
    Write-Host "Fix the error, then try again." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "OK - Build succeeded" -ForegroundColor Green
Write-Host ""

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  STEP 2: git add / commit / push" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$status = git status --short
$hasChanges = [bool]$status

if ($hasChanges) {
    cmd /c "git add ."
    if ($LASTEXITCODE -ne 0) { Write-Host "git add failed" -ForegroundColor Red; exit 1 }

    cmd /c "git commit -m `"$Message`""
    if ($LASTEXITCODE -ne 0) { Write-Host "git commit failed" -ForegroundColor Red; exit 1 }
} else {
    Write-Host "No new uncommitted changes." -ForegroundColor Yellow
}

# فحص: هل هناك commits محلية غير مدفوعة؟
$unpushed = git log origin/main..HEAD --oneline
$hasUnpushed = [bool]$unpushed

if (-not $hasChanges -and -not $hasUnpushed) {
    Write-Host "Nothing to push." -ForegroundColor Yellow
    exit 0
}

if ($hasUnpushed) {
    Write-Host "Unpushed commits:" -ForegroundColor Yellow
    $unpushed | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
}

# اسحب بـ rebase تحسبًا لأي تغيير بعيد
cmd /c "git pull origin main --rebase"
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Red
    Write-Host "  X git pull --rebase FAILED (conflict?)" -ForegroundColor Red
    Write-Host "============================================" -ForegroundColor Red
    exit 1
}

cmd /c "git push origin main"
if ($LASTEXITCODE -ne 0) { Write-Host "git push failed" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  DONE - Pushed successfully" -ForegroundColor Green
Write-Host "  Vercel will update in 30-60 seconds" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green