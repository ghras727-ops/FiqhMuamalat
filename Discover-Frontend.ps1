# Discover-Frontend.ps1
# يجمع كل ملفات المصدر في ملف واحد منظم للقراءة المعمارية

$ErrorActionPreference = "Stop"
$root = Get-Location
$out  = Join-Path $root "DISCOVERY_FRONTEND.md"

if (Test-Path $out) { Remove-Item $out -Force }

function Write-Section($title) {
    Add-Content -Path $out -Value "`n`n## $title`n" -Encoding UTF8
}
function Dump-File($relativePath) {
    $full = Join-Path $root $relativePath
    if (-not (Test-Path $full)) {
        Add-Content -Path $out -Value "### ⚠️ MISSING: $relativePath" -Encoding UTF8
        return
    }
    Add-Content -Path $out -Value "`n### 📄 ``$relativePath``" -Encoding UTF8
    Add-Content -Path $out -Value '```tsx' -Encoding UTF8
    Get-Content $full -Raw -Encoding UTF8 | Add-Content -Path $out -Encoding UTF8
    Add-Content -Path $out -Value '```' -Encoding UTF8
}

# رأس الملف
Add-Content -Path $out -Value "# DISCOVERY — Frontend Architecture`n" -Encoding UTF8
Add-Content -Path $out -Value "**Generated:** $(Get-Date -Format 'yyyy-MM-dd HH:mm')" -Encoding UTF8
Add-Content -Path $out -Value "**Root:** $root" -Encoding UTF8

# 1) الشجرة الكاملة
Write-Section "1. Full File Tree (src + public + config)"
Add-Content -Path $out -Value '```' -Encoding UTF8
Get-ChildItem -Path $root -Recurse -File `
    -Include *.tsx,*.ts,*.css,*.html,*.json,*.ps1,*.md,*.yml,*.yaml `
    | Where-Object { $_.FullName -notmatch '\\node_modules\\|\\dist\\|\\.git\\' } `
    | ForEach-Object { $_.FullName.Replace($root, '.') } `
    | Sort-Object `
    | Add-Content -Path $out -Encoding UTF8
Add-Content -Path $out -Value '```' -Encoding UTF8

# 2) package.json + vite + tsconfig + tailwind + vercel + Push
Write-Section "2. Configuration Files"
Dump-File "package.json"
Dump-File "vite.config.ts"
Dump-File "tsconfig.json"
Dump-File "tailwind.config.js"
Dump-File "tailwind.config.ts"
Dump-File "postcss.config.js"
Dump-File "index.html"
Dump-File "vercel.json"
Dump-File "Push.ps1"

# 3) Bootstrap + Routing + Types
Write-Section "3. App Bootstrap, Auth & Types"
Dump-File "src/main.tsx"
Dump-File "src/index.css"
Dump-File "src/app/App.tsx"
Dump-File "src/app/router.tsx"
Dump-File "src/app/AuthProvider.tsx"
Dump-File "src/app/auth-context.ts"
Dump-File "src/lib/supabase.ts"
Dump-File "src/types/index.ts"

# 4) المكوّنات المشتركة
Write-Section "4. Shared Components"
Get-ChildItem -Path (Join-Path $root "src\components") -Recurse -File -Filter *.tsx -ErrorAction SilentlyContinue `
    | ForEach-Object { Dump-File $_.FullName.Replace($root, '.').TrimStart('.', '\') }

# 5) تبويبات الأستاذ
Write-Section "5. Admin Tabs (Teacher)"
Get-ChildItem -Path (Join-Path $root "src\features\admin") -Recurse -File -Filter *.tsx -ErrorAction SilentlyContinue `
    | ForEach-Object { Dump-File $_.FullName.Replace($root, '.').TrimStart('.', '\') }

# 6) واجهة الطالب
Write-Section "6. Student Features"
Get-ChildItem -Path (Join-Path $root "src\features\student") -Recurse -File -Filter *.tsx -ErrorAction SilentlyContinue `
    | ForEach-Object { Dump-File $_.FullName.Replace($root, '.').TrimStart('.', '\') }

# 7) المشترك (تقارير)
Write-Section "7. Shared Features (Reports)"
Get-ChildItem -Path (Join-Path $root "src\features\shared") -Recurse -File -Filter *.tsx -ErrorAction SilentlyContinue `
    | ForEach-Object { Dump-File $_.FullName.Replace($root, '.').TrimStart('.', '\') }

# 8) أي ملفات متبقية في src/features (احتياط)
Write-Section "8. Other Feature Files (safety net)"
Get-ChildItem -Path (Join-Path $root "src\features") -Recurse -File -Filter *.tsx -ErrorAction SilentlyContinue `
    | Where-Object {
        $_.FullName -notmatch '\\admin\\|\\student\\|\\shared\\'
      } `
    | ForEach-Object { Dump-File $_.FullName.Replace($root, '.').TrimStart('.', '\') }

# 9) سجل الأحجام — لمعرفة الملفات الضخمة
Write-Section "9. File Sizes (LOC approx)"
Add-Content -Path $out -Value "| File | Lines | Bytes |" -Encoding UTF8
Add-Content -Path $out -Value "|---|---|---|" -Encoding UTF8
Get-ChildItem -Path (Join-Path $root "src") -Recurse -File -Include *.tsx,*.ts -ErrorAction SilentlyContinue `
    | Sort-Object Length -Descending `
    | ForEach-Object {
        $lines = (Get-Content $_.FullName | Measure-Object -Line).Lines
        $rel = $_.FullName.Replace($root, '.').TrimStart('.', '\')
        Add-Content -Path $out -Value "| ``$rel`` | $lines | $($_.Length) |" -Encoding UTF8
    }

Write-Host "✅ تم إنشاء: $out" -ForegroundColor Green
Write-Host "الحجم: $([math]::Round((Get-Item $out).Length / 1KB, 1)) KB" -ForegroundColor Cyan