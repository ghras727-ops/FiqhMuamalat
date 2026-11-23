param (
    [Parameter(Mandatory=$true)]
    [ValidateSet("Save", "Check")]
    [string]$Mode
)

$ErrorActionPreference = "Stop"
$projectPath = "D:\FiqhMuamalat"
$baselineFile = Join-Path $projectPath ".lab_baseline.json"
$srcPath = Join-Path $projectPath "src"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "🔬 المختبر الفاحص - وضع: $Mode" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

if ($Mode -eq "Save") {
    Write-Host "⏳ جاري فحص الكود وبناء المشروع (Baseline)..." -ForegroundColor Yellow
    
    # 1. فحص البناء
    Set-Location $projectPath
    $buildOutput = cmd /c "npm run build 2>&1"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ فشل البناء! لا يمكن حفظ البصمة لنظام معطوب." -ForegroundColor Red
        Write-Host $buildOutput -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ البناء ناجح. النظام مستقر." -ForegroundColor Green

    # 2. أخذ بصمة الملفات
    $files = Get-ChildItem -Path $srcPath -Recurse -File -Include *.tsx,*.ts,*.css
    $hashes = @{}
    foreach ($file in $files) {
        $relativePath = $file.FullName.Replace($projectPath, "")
        $hash = (Get-FileHash -Path $file.FullName -Algorithm MD5).Hash
        $hashes[$relativePath] = $hash
    }

    # 3. حفظ البصمة
    $baseline = @{
        Date = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        FileCount = $files.Count
        Hashes = $hashes
    }
    
    $baseline | ConvertTo-Json -Depth 10 | Out-File -FilePath $baselineFile -Encoding UTF8
    Write-Host "💾 تم حفظ نقطة استقرار جديدة (بصمة $($files.Count) ملف) في $baselineFile" -ForegroundColor Green
    
} elseif ($Mode -eq "Check") {
    if (-not (Test-Path $baselineFile)) {
        Write-Host "❌ لم يتم العثور على نقطة استقرار سابقة. شغل السكريبت بوضع Save أولاً." -ForegroundColor Red
        exit 1
    }

    Write-Host "⏳ جاري فحص التعديلات الجديدة..." -ForegroundColor Yellow
    
    # 1. مقارنة الملفات
    $baseline = Get-Content $baselineFile -Raw | ConvertFrom-Json
    $oldHashes = $baseline.Hashes
    
    $files = Get-ChildItem -Path $srcPath -Recurse -File -Include *.tsx,*.ts,*.css
    $newHashes = @{}
    foreach ($file in $files) {
        $relativePath = $file.FullName.Replace($projectPath, "")
        $hash = (Get-FileHash -Path $file.FullName -Algorithm MD5).Hash
        $newHashes[$relativePath] = $hash
    }

    $changes = @()
    foreach ($key in $newHashes.Keys) {
        if (-not $oldHashes.ContainsKey($key)) {
            $changes += "➕ [ملف جديد] $key"
        } elseif ($oldHashes[$key] -ne $newHashes[$key]) {
            $changes += "✏️ [ملف معدل] $key"
        }
    }
    foreach ($key in $oldHashes.Keys) {
        if (-not $newHashes.ContainsKey($key)) {
            $changes += "❌ [ملف محذوف] $key"
        }
    }

    # 2. فحص البناء الجديد
    Set-Location $projectPath
    $buildOutput = cmd /c "npm run build 2>&1"
    $buildSuccess = $LASTEXITCODE -eq 0

    # 3. إصدار التقرير
    Write-Host "`n=========================================" -ForegroundColor Cyan
    Write-Host "📊 تقرير الفحص" -ForegroundColor Cyan
    Write-Host "=========================================" -ForegroundColor Cyan
    
    Write-Host "📅 تاريخ نقطة الاستقرار السابقة: $($baseline.Date)"
    
    if ($changes.Count -eq 0) {
        Write-Host "🤔 لم يتم تعديل أي ملف برمجي." -ForegroundColor Yellow
    } else {
        Write-Host "`n📝 الملفات التي تأثرت بالتعديل ($($changes.Count) ملف):" -ForegroundColor Magenta
        foreach ($c in $changes) { Write-Host "   $c" -ForegroundColor Magenta }
    }

    Write-Host "`n🛠️ فحص بناء النظام (Build Test):"
    if ($buildSuccess) {
        Write-Host "✅ البناء ناجح. الكود سليم ولا توجد أخطاء برمجية (Syntax Errors)." -ForegroundColor Green
    } else {
        Write-Host "❌ فشل البناء! هناك خطأ برمجي في التعديلات الأخيرة." -ForegroundColor Red
        Write-Host "--- تفاصيل الخطأ ---" -ForegroundColor Red
        # عرض آخر 15 سطر من الخطأ
        $buildOutput | Select-Object -Last 15 | ForEach-Object { Write-Host $_ -ForegroundColor Red }
    }
    Write-Host "=========================================" -ForegroundColor Cyan
}